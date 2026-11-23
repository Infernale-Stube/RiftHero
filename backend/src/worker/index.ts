import { Worker } from 'bullmq';
import {
  HIGH_PRIORITY_QUEUE_NAME,
  LOW_PRIORITY_QUEUE_NAME,
  createRedisConnection,
  SummonerJobData,
} from '../queue/bullmq';
import { processSummonerJob } from './processor';
import { config } from '../config';
import { initChampionItemWorker, stopChampionItemWorker } from './championItemWorker';
import { initMetaWorker, stopMetaWorker } from './metaWorker';
import { setupWorkerProcess, registerGracefulShutdown } from './workerUtils';

setupWorkerProcess('AllInOneWorker');

async function main() {
  console.log('=================================================================');
  console.log('⚡ RiftHero Riot API All-in-One Worker Starting...');
  console.log(`📡 Rate Limits Configured: ${config.rateLimit10s} req/10s | ${config.rateLimit10m} req/10m`);
  console.log(`❄️ Snowball Crawler: ${config.enableSnowballCrawler ? 'ENABLED' : 'DISABLED'} (Depth: ${config.snowballMatchDepth})`);
  console.log('=================================================================');

  const redisHigh = createRedisConnection();
  const redisLow = createRedisConnection();

  // 1. High Priority Worker (Direct user requests: Fast burst processing)
  const highWorker = new Worker<SummonerJobData>(
    HIGH_PRIORITY_QUEUE_NAME,
    async (job) => {
      console.log(`🔥 [HighQueue] Processing user lookup: ${job.data.gameName}#${job.data.tagLine} (${job.data.region})`);
      await processSummonerJob(job);
    },
    {
      connection: redisHigh,
      concurrency: 5,
    }
  );

  highWorker.on('completed', (job) => {
    console.log(`✅ [HighQueue] Completed ${job.data.gameName}#${job.data.tagLine}`);
  });

  highWorker.on('failed', (job, err) => {
    console.error(`❌ [HighQueue] Job failed for ${job?.data.gameName}#${job?.data.tagLine}:`, err.message);
  });

  // 2. Low Priority Worker (Snowball crawler: throttled concurrency so it never blocks high priority)
  const lowWorker = new Worker<SummonerJobData>(
    LOW_PRIORITY_QUEUE_NAME,
    async (job) => {
      console.log(`❄️ [LowQueue] Snowball crawling fellow player: ${job.data.gameName}#${job.data.tagLine} (${job.data.region})`);
      await processSummonerJob(job);
    },
    {
      connection: redisLow,
      concurrency: config.snowballMaxConcurrency,
      limiter: {
        max: 5,
        duration: 1000,
      },
    }
  );

  lowWorker.on('completed', (job) => {
    console.log(`❄️ [LowQueue] Snowball completed ${job.data.gameName}#${job.data.tagLine}`);
  });

  lowWorker.on('failed', (job, err) => {
    console.warn(`⚠️ [LowQueue] Snowball job failed for ${job?.data.gameName}#${job?.data.tagLine}:`, err.message);
  });

  console.log('🚀 [Worker] Workers listening to queues [summoner-high, summoner-low]');

  // Initialize Champion & Items Worker
  initChampionItemWorker();

  // Initialize Meta & Tier List Worker
  initMetaWorker();

  // Graceful shutdown
  registerGracefulShutdown('AllInOneWorker', async () => {
    stopChampionItemWorker();
    stopMetaWorker();
    await highWorker.close();
    await lowWorker.close();
    await redisHigh.quit();
    await redisLow.quit();
  });
}

main().catch((err) => {
  console.error('Fatal worker error:', err);
  process.exit(1);
});
