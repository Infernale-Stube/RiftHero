import dotenv from 'dotenv';
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  appEnv: process.env.APP_ENV || 'prod',
  port: parseInt(process.env.PORT || '4000', 10),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://rifthero:rifthero_secret_2026@localhost:5432/rifthero?schema=public',
  
  // Redis / BullMQ
  redisUrl: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  redisHost: process.env.REDIS_HOST || '127.0.0.1',
  redisPort: parseInt(process.env.REDIS_PORT || '6379', 10),

  // Riot API Production Key & Limits
  riotApiKey: process.env.RIOT_API_KEY || '',
  rateLimit10s: parseInt(process.env.RATE_LIMIT_10S || '1000', 10),
  rateLimit10m: parseInt(process.env.RATE_LIMIT_10M || '60000', 10),

  // Match Ingestion & Snowball
  initialMatchCount: parseInt(process.env.INITIAL_MATCH_COUNT || '50', 10),
  enableSnowballCrawler: process.env.ENABLE_SNOWBALL_CRAWLER !== 'false',
  snowballMatchDepth: parseInt(process.env.SNOWBALL_MATCH_DEPTH || '20', 10),
  snowballMaxConcurrency: parseInt(process.env.SNOWBALL_MAX_CONCURRENCY || '3', 10),

  // Profile Stale Check (minutes)
  profileStaleMinutes: parseInt(process.env.PROFILE_STALE_MINUTES || '2', 10),
};
