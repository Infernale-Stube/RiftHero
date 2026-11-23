import { RiotAPI } from '@fightmegg/riot-api';
import { config } from '../config';

let riotApiInstance: RiotAPI | null = null;

function patchRateLimiter(rateLimiter: any) {
  if (!rateLimiter || rateLimiter.__patched) return;
  rateLimiter.__patched = true;

  // 1. Fortify setupRateLimiters: ensure safe default limits so method rateLimiter is always created
  const originalSetup = rateLimiter.setupRateLimiters?.bind(rateLimiter);
  if (originalSetup) {
    rateLimiter.setupRateLimiters = function (region: string, method: string, rateLimits: any) {
      const safeRateLimits = {
        appLimits: rateLimits?.appLimits || '20:1,100:120',
        appCounts: rateLimits?.appCounts || '1:1,1:120',
        methodLimits: rateLimits?.methodLimits || '1000:60',
        methodCounts: rateLimits?.methodCounts || '1:60',
        retryAfter: rateLimits?.retryAfter,
        limitType: rateLimits?.limitType,
      };
      return originalSetup(region, method, safeRateLimits);
    };
  }

  // 2. Fortify executeRequest: ensure rateLimiter objects exist before execution and prevent timer crash
  const originalExecuteRequest = rateLimiter.executeRequest?.bind(rateLimiter);
  if (originalExecuteRequest) {
    rateLimiter.executeRequest = function (args: any, jobOptions: any) {
      const { region, method } = args;
      if (!rateLimiter.rateLimiters) {
        rateLimiter.rateLimiters = {};
      }
      if (!rateLimiter.rateLimiters[region] || !rateLimiter.rateLimiters[region][method]) {
        rateLimiter.setupRateLimiters(region, method, {
          appLimits: '20:1,100:120',
          appCounts: '1:1,1:120',
          methodLimits: '1000:60',
          methodCounts: '1:60',
        });
      }
      return originalExecuteRequest(args, jobOptions);
    };
  }
}

export function getRiotClient(): RiotAPI {
  if (riotApiInstance) return riotApiInstance;

  if (!config.riotApiKey) {
    console.warn('⚠️ [Riot API] WARNING: RIOT_API_KEY is empty or invalid in config!');
  }

  riotApiInstance = new RiotAPI(config.riotApiKey, {
    debug: config.env === 'development',
  });

  patchRateLimiter((riotApiInstance as any).riotRateLimiter);

  return riotApiInstance;
}
