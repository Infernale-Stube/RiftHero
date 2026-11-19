import { prisma } from '../db/prisma';
import { normalizeRegion, getPlatformForRegion } from '../riot/regions';
import { enqueueHighPrioritySummoner, getSummonerJobStatus } from '../queue/bullmq';
import { config } from '../config';

export interface SummonerProfileResponse {
  summoner: {
    id: string;
    puuid: string;
    gameName: string;
    tagLine: string;
    region: string;
    platform: string;
    profileIconId: number;
    summonerLevel: number;
    lastFetchedAt: string | null;
  } | null;
  ranks: Array<{
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    winrate: number;
  }>;
  isStale: boolean;
  isUpdating: boolean;
  status: 'cached' | 'fetching' | 'not_found';
}

export async function getSummonerProfile(
  rawRegion: string,
  gameName: string,
  tagLine: string
): Promise<SummonerProfileResponse> {
  const region = normalizeRegion(rawRegion);
  const platform = getPlatformForRegion(region);

  // 1. Look up in PostgreSQL
  const summoner = await prisma.summoner.findFirst({
    where: {
      region,
      gameName: { equals: gameName, mode: 'insensitive' },
      tagLine: { equals: tagLine, mode: 'insensitive' },
    },
    include: {
      ranks: true,
    },
  });

  const now = Date.now();
  const staleThreshold = config.profileStaleMinutes * 60 * 1000;
  
  let isStale = false;
  if (!summoner || !summoner.lastFetchedAt) {
    isStale = true;
  } else {
    isStale = now - summoner.lastFetchedAt.getTime() > staleThreshold;
  }

  // 2. Check BullMQ job status
  const jobStatus = await getSummonerJobStatus(region, gameName, tagLine);
  const isUpdating = jobStatus === 'active' || jobStatus === 'waiting';

  // 3. Silent Auto-Refresh: If stale and not currently queued, auto-trigger high-priority job!
  if (isStale && !isUpdating) {
    try {
      await enqueueHighPrioritySummoner({
        gameName: summoner?.gameName || gameName,
        tagLine: summoner?.tagLine || tagLine,
        region,
        matchCount: config.initialMatchCount,
      });
    } catch (err) {
      console.error('[SummonerService] Failed to enqueue high priority refresh:', err);
    }
  }

  // 4. Format ranks with winrate
  const formattedRanks = (summoner?.ranks || []).map((r) => {
    const total = r.wins + r.losses;
    const winrate = total > 0 ? Math.round((r.wins / total) * 100) : 0;
    return {
      queueType: r.queueType,
      tier: r.tier,
      rank: r.rank,
      leaguePoints: r.leaguePoints,
      wins: r.wins,
      losses: r.losses,
      winrate,
    };
  });

  if (!summoner) {
    return {
      summoner: null,
      ranks: [],
      isStale: true,
      isUpdating: true, // background fetch triggered
      status: 'fetching',
    };
  }

  return {
    summoner: {
      id: summoner.id,
      puuid: summoner.puuid,
      gameName: summoner.gameName,
      tagLine: summoner.tagLine,
      region: summoner.region,
      platform: summoner.platform,
      profileIconId: summoner.profileIconId,
      summonerLevel: Number(summoner.summonerLevel),
      lastFetchedAt: summoner.lastFetchedAt?.toISOString() || null,
    },
    ranks: formattedRanks,
    isStale,
    isUpdating: isUpdating || isStale,
    status: 'cached',
  };
}

export async function getRecentSummoners(limit = 10) {
  const summoners = await prisma.summoner.findMany({
    where: {
      lastFetchedAt: { not: null },
    },
    orderBy: {
      lastFetchedAt: 'desc',
    },
    take: limit,
    include: {
      ranks: true,
    },
  });

  return summoners.map((s) => {
    const soloRank = s.ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5');
    return {
      id: s.id,
      gameName: s.gameName,
      tagLine: s.tagLine,
      region: s.region,
      profileIconId: s.profileIconId,
      summonerLevel: Number(s.summonerLevel),
      lastFetchedAt: s.lastFetchedAt?.toISOString(),
      soloRank: soloRank
        ? {
            tier: soloRank.tier,
            rank: soloRank.rank,
            leaguePoints: soloRank.leaguePoints,
          }
        : null,
    };
  });
}

export async function searchSummoners(query: string, region?: string, limit = 6) {
  if (!query || query.trim().length === 0) return [];

  const parts = query.trim().split('#');
  const nameQuery = parts[0];
  const tagQuery = parts[1];

  const whereClause: any = {
    gameName: { contains: nameQuery, mode: 'insensitive' },
  };

  if (tagQuery) {
    whereClause.tagLine = { contains: tagQuery, mode: 'insensitive' };
  }

  if (region) {
    whereClause.region = normalizeRegion(region);
  }

  const matches = await prisma.summoner.findMany({
    where: whereClause,
    take: limit,
    orderBy: {
      lastFetchedAt: 'desc',
    },
    include: {
      ranks: true,
    },
  });

  return matches.map((m) => ({
    gameName: m.gameName,
    tagLine: m.tagLine,
    region: m.region,
    profileIconId: m.profileIconId,
    summonerLevel: Number(m.summonerLevel),
    tier: m.ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5')?.tier || 'UNRANKED',
  }));
}
