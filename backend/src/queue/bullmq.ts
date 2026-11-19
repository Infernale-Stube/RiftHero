import { Queue, Job } from 'bullmq';
import Redis from 'ioredis';
import { config } from '../config';

export const HIGH_PRIORITY_QUEUE_NAME = 'summoner-high';
export const LOW_PRIORITY_QUEUE_NAME = 'summoner-low';

export interface SummonerJobData {
  gameName: string;
  tagLine: string;
  region: string;
  matchCount?: number;
  isSnowball?: boolean;
  timestamp?: number;
}

export function createRedisConnection(): Redis {
  return new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

const sharedRedisConnection = createRedisConnection();

export const highPriorityQueue = new Queue<SummonerJobData>(HIGH_PRIORITY_QUEUE_NAME, {
  connection: sharedRedisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 3600, // keep completed for 1 hour
      count: 1000,
    },
    removeOnFail: {
      age: 86400, // keep failed for 24 hours
      count: 500,
    },
  },
});

export const lowPriorityQueue = new Queue<SummonerJobData>(LOW_PRIORITY_QUEUE_NAME, {
  connection: sharedRedisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 1800,
      count: 2000,
    },
    removeOnFail: {
      age: 3600,
      count: 500,
    },
  },
});

export function generateJobId(region: string, gameName: string, tagLine: string): string {
  return `${region.toLowerCase()}:${gameName.toLowerCase()}:${tagLine.toLowerCase()}`;
}

export async function enqueueHighPrioritySummoner(data: SummonerJobData): Promise<Job<SummonerJobData>> {
  const jobId = generateJobId(data.region, data.gameName, data.tagLine);
  
  // Check if job already active in high queue
  const existingJob = await highPriorityQueue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (state === 'active' || state === 'waiting' || state === 'delayed') {
      return existingJob;
    }
  }

  return await highPriorityQueue.add(
    'update-summoner',
    {
      ...data,
      isSnowball: false,
      timestamp: Date.now(),
    },
    {
      jobId,
      priority: 1, // High priority
    }
  );
}

export async function enqueueLowPrioritySummoner(data: SummonerJobData): Promise<Job<SummonerJobData> | null> {
  const jobId = generateJobId(data.region, data.gameName, data.tagLine);

  // If already in high queue, do not re-enqueue in low
  const inHigh = await highPriorityQueue.getJob(jobId);
  if (inHigh) {
    const state = await inHigh.getState();
    if (state === 'active' || state === 'waiting') return null;
  }

  const existingJob = await lowPriorityQueue.getJob(jobId);
  if (existingJob) {
    const state = await existingJob.getState();
    if (state === 'active' || state === 'waiting' || state === 'delayed') {
      return existingJob;
    }
  }

  return await lowPriorityQueue.add(
    'snowball-summoner',
    {
      ...data,
      isSnowball: true,
      timestamp: Date.now(),
    },
    {
      jobId,
      priority: 10, // Low priority
    }
  );
}

export async function getSummonerJobStatus(region: string, gameName: string, tagLine: string): Promise<'active' | 'waiting' | 'completed' | 'failed' | 'not_found'> {
  const jobId = generateJobId(region, gameName, tagLine);
  
  const highJob = await highPriorityQueue.getJob(jobId);
  if (highJob) {
    const state = await highJob.getState();
    if (state === 'active') return 'active';
    if (state === 'waiting' || state === 'delayed') return 'waiting';
    if (state === 'completed') return 'completed';
    if (state === 'failed') return 'failed';
  }

  const lowJob = await lowPriorityQueue.getJob(jobId);
  if (lowJob) {
    const state = await lowJob.getState();
    if (state === 'active') return 'active';
    if (state === 'waiting' || state === 'delayed') return 'waiting';
    if (state === 'completed') return 'completed';
    if (state === 'failed') return 'failed';
  }

  return 'not_found';
}
