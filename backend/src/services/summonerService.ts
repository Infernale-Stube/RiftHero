import { prisma } from '../db/prisma';
import { normalizeRegion, getPlatformForRegion } from '../riot/regions';
import { enqueueHighPrioritySummoner, getSummonerJobStatus } from '../queue/bullmq';
import { config } from '../config';
import { getRiotClient } from '../riot/client';
import { getChampionNameById } from '../riot/ddragon';

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
    backgroundUrl?: string | null;
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
  let isUpdating = jobStatus === 'active' || jobStatus === 'waiting';

  // 3. Silent Auto-Refresh: If stale and not currently queued, auto-trigger high-priority job!
  if (isStale && !isUpdating) {
    try {
      await enqueueHighPrioritySummoner({
        gameName: summoner?.gameName || gameName,
        tagLine: summoner?.tagLine || tagLine,
        region,
        matchCount: config.initialMatchCount,
      });
      isUpdating = true;
    } catch (err) {
      console.error('[SummonerService] Failed to enqueue high priority refresh:', err);
    }
  }

  // 4. Format ranks directly from Summoner table
  const formattedRanks: Array<{
    queueType: string;
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    winrate: number;
    peakTier?: string | null;
    peakRank?: string | null;
    peakLp?: number | null;
  }> = [];

  if (summoner?.soloTier) {
    const total = summoner.soloWins + summoner.soloLosses;
    formattedRanks.push({
      queueType: 'RANKED_SOLO_5x5',
      tier: summoner.soloTier,
      rank: summoner.soloRank || 'I',
      leaguePoints: summoner.soloLp,
      wins: summoner.soloWins,
      losses: summoner.soloLosses,
      winrate: total > 0 ? Math.round((summoner.soloWins / total) * 100) : 0,
      peakTier: summoner.soloPeakTier || summoner.soloTier,
      peakRank: summoner.soloPeakRank || summoner.soloRank || 'I',
      peakLp: summoner.soloPeakLp ?? summoner.soloLp,
    });
  }

  if (summoner?.flexTier) {
    const total = summoner.flexWins + summoner.flexLosses;
    formattedRanks.push({
      queueType: 'RANKED_FLEX_SR',
      tier: summoner.flexTier,
      rank: summoner.flexRank || 'I',
      leaguePoints: summoner.flexLp,
      wins: summoner.flexWins,
      losses: summoner.flexLosses,
      winrate: total > 0 ? Math.round((summoner.flexWins / total) * 100) : 0,
      peakTier: summoner.flexPeakTier || summoner.flexTier,
      peakRank: summoner.flexPeakRank || summoner.flexRank || 'I',
      peakLp: summoner.flexPeakLp ?? summoner.flexLp,
    });
  }

  if (summoner?.ranked5sTier) {
    const total = summoner.ranked5sWins + summoner.ranked5sLosses;
    formattedRanks.push({
      queueType: 'RANKED_PREMADE_5x5',
      tier: summoner.ranked5sTier,
      rank: summoner.ranked5sRank || 'I',
      leaguePoints: summoner.ranked5sLp,
      wins: summoner.ranked5sWins,
      losses: summoner.ranked5sLosses,
      winrate: total > 0 ? Math.round((summoner.ranked5sWins / total) * 100) : 0,
      peakTier: summoner.ranked5sPeakTier || summoner.ranked5sTier,
      peakRank: summoner.ranked5sPeakRank || summoner.ranked5sRank || 'I',
      peakLp: summoner.ranked5sPeakLp ?? summoner.ranked5sLp,
    });
  }

  if (!summoner) {
    return {
      summoner: null,
      ranks: [],
      isStale: true,
      isUpdating: true, // background fetch triggered
      status: 'fetching',
    };
  }

  // 5. Resolve player's top champion for profile background splash art
  let backgroundUrl: string | null = null;
  try {
    const topChamp = await prisma.matchParticipant.groupBy({
      by: ['championId'],
      where: { puuid: summoner.puuid },
      _count: { matchId: true },
      orderBy: {
        _count: {
          matchId: 'desc',
        },
      },
      take: 1,
    });

    if (topChamp.length > 0 && topChamp[0].championId) {
      const champName = await getChampionNameById(topChamp[0].championId);
      backgroundUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champName}_0.jpg`;
    }
  } catch (err) {
    // fallback
  }

  // If topChamp wasn't found from matches, query top champion mastery from Riot API
  if (!backgroundUrl) {
    try {
      const rApi = getRiotClient();
      let masteries: any[] | null = null;
      try {
        masteries = await (rApi as any).request(
          platform,
          'CHAMPION_MASTERY.GET_TOP_CHAMPIONS',
          { encryptedPUUID: summoner.puuid, summonerId: summoner.puuid },
          { id: `${platform}.championMastery.getTopChampions.${summoner.puuid}` }
        );
      } catch {
        if (config.riotApiKey) {
          const res = await fetch(
            `https://${platform.toLowerCase()}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${summoner.puuid}/top?count=1`,
            { headers: { 'X-Riot-Token': config.riotApiKey } }
          );
          if (res.ok) masteries = (await res.json()) as any[];
        }
      }

      if (masteries && masteries.length > 0) {
        const champName = await getChampionNameById(masteries[0].championId);
        if (champName) {
          backgroundUrl = `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champName}_0.jpg`;
        }
      }
    } catch {
      // ignore
    }
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
      backgroundUrl,
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
  });

  return summoners.map((s) => ({
    id: s.id,
    gameName: s.gameName,
    tagLine: s.tagLine,
    region: s.region,
    profileIconId: s.profileIconId,
    summonerLevel: Number(s.summonerLevel),
    lastFetchedAt: s.lastFetchedAt?.toISOString(),
    soloRank: s.soloTier
      ? {
          tier: s.soloTier,
          rank: s.soloRank || 'I',
          leaguePoints: s.soloLp,
        }
      : null,
  }));
}

export async function searchSummoners(query: string, region?: string, limit = 6) {
  if (!query || query.trim().length === 0) return [];

  const raw = query.trim();
  let nameQuery = raw;
  let tagQuery: string | undefined = undefined;

  if (raw.includes('#')) {
    const parts = raw.split('#');
    nameQuery = parts[0]?.trim() || '';
    tagQuery = parts[1]?.trim() || undefined;
  } else if (raw.includes('-') && !raw.includes(' ')) {
    const parts = raw.split('-');
    nameQuery = parts[0]?.trim() || '';
    tagQuery = parts[1]?.trim() || undefined;
  }

  const whereClause: any = {};

  if (nameQuery) {
    whereClause.gameName = { contains: nameQuery, mode: 'insensitive' };
  }

  if (tagQuery) {
    whereClause.tagLine = { contains: tagQuery, mode: 'insensitive' };
  }

  if (!nameQuery && !tagQuery) return [];

  if (region && region.toLowerCase() !== 'all') {
    try {
      whereClause.region = normalizeRegion(region);
    } catch {
      // ignore invalid region
    }
  }

  const matches = await prisma.summoner.findMany({
    where: whereClause,
    take: limit,
    orderBy: {
      lastFetchedAt: 'desc',
    },
  });

  return matches.map((m) => ({
    gameName: m.gameName,
    tagLine: m.tagLine,
    region: m.region,
    profileIconId: m.profileIconId,
    summonerLevel: Number(m.summonerLevel),
    tier: m.soloTier || 'UNRANKED',
    rank: m.soloRank || '',
    leaguePoints: m.soloLp ?? 0,
  }));
}
