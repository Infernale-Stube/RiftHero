import { Worker } from 'bullmq';
import {
  LOW_PRIORITY_QUEUE_NAME,
  createRedisConnection,
  SummonerJobData,
} from '../queue/bullmq';
import { processSummonerJob } from './processor';
import { config } from '../config';
import { setupWorkerProcess, registerGracefulShutdown } from './workerUtils';

setupWorkerProcess('LowQueueWorker');

async function main() {
  console.log('=================================================================');
  console.log('❄️ RiftHero Low-Priority Snowball Crawler Worker Starting...');
  console.log(`❄️ Snowball Crawler: ${config.enableSnowballCrawler ? 'ENABLED' : 'DISABLED'} (Depth: ${config.snowballMatchDepth})`);
  console.log(`📡 Max Concurrency: ${config.snowballMaxConcurrency}`);
  console.log('🧊 Dedicated to throttled background crawling of fellow players');
  console.log('=================================================================');

  if (!config.enableSnowballCrawler) {
    console.log('❄️ Snowball crawler is disabled via configuration. Worker idling in standby mode.');
  }

  const redis = createRedisConnection();

  const worker = new Worker<SummonerJobData>(
    LOW_PRIORITY_QUEUE_NAME,
    async (job) => {
      if (!config.enableSnowballCrawler) {
        console.log(`❄️ [LowQueue] Snowball disabled, skipping job: ${job.data.gameName}#${job.data.tagLine}`);
        return;
      }
      console.log(`❄️ [LowQueue] Snowball crawling fellow player: ${job.data.gameName}#${job.data.tagLine} (${job.data.region})`);
      await processSummonerJob(job);
    },
    {
      connection: redis,
      concurrency: Math.max(1, config.snowballMaxConcurrency || 2),
      limiter: {
        max: 3,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(`❄️ [LowQueue] Snowball completed ${job.data.gameName}#${job.data.tagLine}`);
  });

  worker.on('failed', (job, err) => {
    console.warn(`⚠️ [LowQueue] Snowball job failed for ${job?.data.gameName}#${job?.data.tagLine}:`, err.message);
  });

  console.log(`🚀 [LowQueue] Listening for background crawler jobs on [${LOW_PRIORITY_QUEUE_NAME}]`);

  registerGracefulShutdown('LowQueueWorker', async () => {
    await worker.close();
    await redis.quit();
  });
}

main().catch((err) => {
  console.error('Fatal LowQueue worker error:', err);
  process.exit(1);
});
