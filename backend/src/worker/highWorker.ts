import { Worker } from 'bullmq';
import {
  HIGH_PRIORITY_QUEUE_NAME,
  createRedisConnection,
  SummonerJobData,
} from '../queue/bullmq';
import { processSummonerJob } from './processor';
import { config } from '../config';
import { setupWorkerProcess, registerGracefulShutdown } from './workerUtils';

setupWorkerProcess('HighQueueWorker');

async function main() {
  console.log('=================================================================');
  console.log('⚡ RiftHero High-Priority Summoner Worker Starting...');
  console.log(`📡 Rate Limits: ${config.rateLimit10s} req/10s | ${config.rateLimit10m} req/10m`);
  console.log('🔥 Dedicated to interactive user lookups and live profile refreshes');
  console.log('=================================================================');

  const redis = createRedisConnection();

  const worker = new Worker<SummonerJobData>(
    HIGH_PRIORITY_QUEUE_NAME,
    async (job) => {
      console.log(`🔥 [HighQueue] Processing user lookup: ${job.data.gameName}#${job.data.tagLine} (${job.data.region})`);
      await processSummonerJob(job);
    },
    {
      connection: redis,
      concurrency: 5,
    }
  );

  worker.on('completed', (job) => {
    console.log(`✅ [HighQueue] Completed ${job.data.gameName}#${job.data.tagLine}`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ [HighQueue] Job failed for ${job?.data.gameName}#${job?.data.tagLine}:`, err.message);
  });

  console.log(`🚀 [HighQueue] Listening for interactive requests on [${HIGH_PRIORITY_QUEUE_NAME}]`);

  registerGracefulShutdown('HighQueueWorker', async () => {
    await worker.close();
    await redis.quit();
  });
}

main().catch((err) => {
  console.error('Fatal HighQueue worker error:', err);
  process.exit(1);
});
