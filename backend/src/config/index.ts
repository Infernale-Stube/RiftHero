import dotenv from 'dotenv';
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (value === undefined || value.trim() === '') {
    throw new Error(`[Config] Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function requireInt(key: string): number {
  const raw = requireEnv(key);
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`[Config] Invalid integer for environment variable ${key}: "${raw}"`);
  }
  return parsed;
}

function requireBool(key: string): boolean {
  const raw = requireEnv(key).toLowerCase();
  if (raw === 'true' || raw === '1') return true;
  if (raw === 'false' || raw === '0') return false;
  throw new Error(`[Config] Invalid boolean for environment variable ${key}: "${raw}"`);
}

function parseCorsOrigin(key: string): boolean | string[] {
  const raw = requireEnv(key);
  if (raw === 'true' || raw === '*') return true;
  if (raw === 'false') return false;
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) {
    throw new Error(`[Config] Invalid CORS_ORIGIN value: "${raw}"`);
  }
  return list;
}

export const config = {
  get env(): string {
    return requireEnv('NODE_ENV');
  },
  get port(): number {
    return requireInt('PORT');
  },
  get logLevel(): string {
    return requireEnv('LOG_LEVEL');
  },
  get corsOrigin(): boolean | string[] {
    return parseCorsOrigin('CORS_ORIGIN');
  },
  get databaseUrl(): string {
    return requireEnv('DATABASE_URL');
  },

  // Redis / BullMQ
  get redisUrl(): string {
    return requireEnv('REDIS_URL');
  },
  get redisHost(): string {
    return requireEnv('REDIS_HOST');
  },
  get redisPort(): number {
    return requireInt('REDIS_PORT');
  },

  // Riot API Production Key & Limits
  get riotApiKey(): string {
    return requireEnv('RIOT_API_KEY');
  },
  get rateLimit10s(): number {
    return requireInt('RATE_LIMIT_10S');
  },
  get rateLimit10m(): number {
    return requireInt('RATE_LIMIT_10M');
  },

  // Match Ingestion & Snowball
  get initialMatchCount(): number {
    return requireInt('INITIAL_MATCH_COUNT');
  },
  get enableSnowballCrawler(): boolean {
    return requireBool('ENABLE_SNOWBALL_CRAWLER');
  },
  get snowballMatchDepth(): number {
    return requireInt('SNOWBALL_MATCH_DEPTH');
  },
  get snowballMaxConcurrency(): number {
    return requireInt('SNOWBALL_MAX_CONCURRENCY');
  },
  get fetchAllSeasonMatches(): boolean {
    return requireBool('FETCH_ALL_SEASON_MATCHES');
  },
  get seasonStartEpoch(): number {
    return requireInt('SEASON_START_EPOCH');
  },
  get maxSeasonMatches(): number {
    return requireInt('MAX_SEASON_MATCHES');
  },

  // Profile Stale Check (minutes)
  get profileStaleMinutes(): number {
    return requireInt('PROFILE_STALE_MINUTES');
  },

  // Worker Schedules & Scraper Settings
  get championSyncIntervalMinutes(): number {
    return requireInt('CHAMPION_SYNC_INTERVAL_MINUTES');
  },
  get metaWorkerIntervalHours(): number {
    return requireInt('META_WORKER_INTERVAL_HOURS');
  },
  get counterpickIntervalMinutes(): number {
    return requireInt('COUNTERPICK_INTERVAL_MINUTES');
  },
  get counterpickConcurrency(): number {
    return requireInt('COUNTERPICK_CONCURRENCY');
  },
  get counterpickFetchTimeoutMs(): number {
    return requireInt('COUNTERPICK_FETCH_TIMEOUT_MS');
  },

  // Maintenance & PostgreSQL Backup Settings
  get backupDir(): string {
    return requireEnv('BACKUP_DIR');
  },
  get backupRetentionDays(): number {
    return requireInt('BACKUP_RETENTION_DAYS');
  },
  get postgresHost(): string {
    return requireEnv('POSTGRES_HOST');
  },
  get postgresPort(): number {
    return requireInt('POSTGRES_PORT');
  },
  get postgresUser(): string {
    return requireEnv('POSTGRES_USER');
  },
  get postgresPassword(): string {
    return requireEnv('POSTGRES_PASSWORD');
  },
  get postgresDb(): string {
    return requireEnv('POSTGRES_DB');
  },
};
