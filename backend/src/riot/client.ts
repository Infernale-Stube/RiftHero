import { RiotAPI } from '@fightmegg/riot-api';
import { RiotRateLimiter } from '@fightmegg/riot-rate-limiter';
import { config } from '../config';

let riotApiInstance: RiotAPI | null = null;

function hasValidLimit(s: any): boolean {
  if (typeof s !== 'string' || !s.trim()) return false;
  return s.split(',').every((p) => {
    const parts = p.split(':');
    return parts.length >= 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1])) && Number(parts[1]) > 0;
  });
}

function padToLength(limitsStr: any, countsStr: any, targetLen: number, defLim: string, defCount: string) {
  let limits = (typeof limitsStr === 'string' ? limitsStr : '').split(',').filter((p) => p.includes(':'));
  let counts = (typeof countsStr === 'string' ? countsStr : '').split(',').filter((p) => p.includes(':'));
  if (limits.length === 0) limits = [defLim];
  if (counts.length === 0) counts = [defCount];
  while (limits.length < targetLen) limits.push(limits[limits.length - 1] || defLim);
  while (counts.length < targetLen) counts.push(counts[counts.length - 1] || defCount);
  return { limits: limits.join(','), counts: counts.join(',') };
}

function sanitizeRateLimitsForLimiters(
  rateLimits: any,
  appLimitersCount = 2,
  methodLimitersCount = 1
) {
  const app = padToLength(
    hasValidLimit(rateLimits?.appLimits) ? rateLimits.appLimits : '20:1,100:120',
    hasValidLimit(rateLimits?.appCounts) ? rateLimits.appCounts : '1:1,1:120',
    appLimitersCount || 2,
    '20:1',
    '1:1'
  );
  const method = padToLength(
    hasValidLimit(rateLimits?.methodLimits) ? rateLimits.methodLimits : '1000:60',
    hasValidLimit(rateLimits?.methodCounts) ? rateLimits.methodCounts : '1:60',
    methodLimitersCount || 1,
    '1000:60',
    '1:60'
  );
  return {
    ...rateLimits,
    appLimits: app.limits,
    appCounts: app.counts,
    methodLimits: method.limits,
    methodCounts: method.counts,
    retryAfter: rateLimits?.retryAfter,
    limitType: rateLimits?.limitType,
  };
}

let prototypePatched = false;
function patchRiotRateLimiterClass() {
  if (prototypePatched || !RiotRateLimiter?.prototype) return;
  prototypePatched = true;

  const proto = RiotRateLimiter.prototype as any;

  // 1. Setup rate limiters: ensure safe default limits so method rateLimiter is always created
  const originalSetup = proto.setupRateLimiters;
  if (originalSetup) {
    proto.setupRateLimiters = function (region: string, method: string, rateLimits: any) {
      try {
        const safe = sanitizeRateLimitsForLimiters(rateLimits, 2, 1);
        return originalSetup.call(this, region, method, safe);
      } catch (err: any) {
        console.warn('⚠️ [RateLimiter] setupRateLimiters error caught:', err?.message || err);
      }
    };
  }

  // 2. Update rate limiters: prevents "invalid rate limits" crash on 429 when methodLimits is empty
  const originalUpdate = proto.updateRateLimiters;
  if (originalUpdate) {
    proto.updateRateLimiters = function (region: string, method: string, rateLimits: any) {
      try {
        const appCount = this.rateLimiters?.[region]?.limiters?.length || 2;
        const methodCount = this.rateLimiters?.[region]?.[method]?.limiters?.length || 1;
        const safe = sanitizeRateLimitsForLimiters(rateLimits, appCount, methodCount);
        return originalUpdate.call(this, region, method, safe);
      } catch (err: any) {
        console.warn('⚠️ [RateLimiter] updateRateLimiters error caught (prevented crash):', err?.message || err);
      }
    };
  }

  // 3. Sync rate limiters: prevents crash on sync after requests
  const originalSync = proto.syncRateLimiters;
  if (originalSync) {
    proto.syncRateLimiters = async function (region: string, method: string, rateLimits: any) {
      try {
        const appCount = this.rateLimiters?.[region]?.limiters?.length || 2;
        const methodCount = this.rateLimiters?.[region]?.[method]?.limiters?.length || 1;
        const safe = sanitizeRateLimitsForLimiters(rateLimits, appCount, methodCount);
        return await originalSync.call(this, region, method, safe);
      } catch (err: any) {
        console.warn('⚠️ [RateLimiter] syncRateLimiters error caught:', err?.message || err);
      }
    };
  }

  // 4. Execute request: ensure rate limiter objects exist before execution and prevent timer crash
  const originalExecuteRequest = proto.executeRequest;
  if (originalExecuteRequest) {
    proto.executeRequest = function (args: any, jobOptions: any) {
      const { region, method } = args;
      if (!this.rateLimiters) {
        this.rateLimiters = {};
      }
      if (!this.rateLimiters[region] || !this.rateLimiters[region][method]) {
        this.setupRateLimiters(region, method, {
          appLimits: '20:1,100:120',
          appCounts: '1:1,1:120',
          methodLimits: '1000:60',
          methodCounts: '1:60',
        });
      }
      return originalExecuteRequest.call(this, args, jobOptions);
    };
  }
}

// Apply prototype patch on module load
patchRiotRateLimiterClass();

export function getRiotClient(): RiotAPI {
  if (riotApiInstance) return riotApiInstance;

  if (!config.riotApiKey) {
    console.warn('⚠️ [Riot API] WARNING: RIOT_API_KEY is empty or invalid in config!');
  }

  riotApiInstance = new RiotAPI(config.riotApiKey, {
    debug: config.env === 'development',
  });

  return riotApiInstance;
}
