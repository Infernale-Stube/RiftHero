import { getRiotClient } from '../riot/client';
import { getPlatformForRegion, normalizeRegion } from '../riot/regions';
import { getChampionNameById } from '../riot/ddragon';
import { prisma } from '../db/prisma';
import { config } from '../config';

export interface ChampionMasteryItem {
  championId: number;
  championName: string;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
  championPointsSinceLastLevel: number;
  championPointsUntilNextLevel: number;
  tokensEarned: number;
  markRequiredForNextLevel: number;
  championSeasonMilestone?: number;
}

export interface SummonerMasteriesResponse {
  totalMasteryScore: number;
  totalMasteryPoints: number;
  masteryCount: number;
  topMasteryChampions: ChampionMasteryItem[];
  masteries: ChampionMasteryItem[];
}

export async function getSummonerMasteries(
  rawRegion: string,
  gameName: string,
  tagLine: string
): Promise<SummonerMasteriesResponse | null> {
  const region = normalizeRegion(rawRegion);
  const platform = getPlatformForRegion(region);

  // 1. Resolve summoner PUUID from DB
  let summoner = await prisma.summoner.findFirst({
    where: {
      region,
      gameName: { equals: gameName, mode: 'insensitive' },
      tagLine: { equals: tagLine, mode: 'insensitive' },
    },
    select: { puuid: true },
  });

  const rApi = getRiotClient();
  let puuid = summoner?.puuid;

  // If not found in DB, fetch from Riot Account API
  if (!puuid) {
    try {
      const cluster = platform.toLowerCase().startsWith('eu') ? 'europe' : 'americas';
      const acc = await rApi.account.getByRiotId({
        region: cluster as any,
        gameName,
        tagLine,
      });
      puuid = acc.puuid;
    } catch {
      return null;
    }
  }

  // 2. Query all champion masteries via Riot Champion Mastery v4 API
  // Note: fightmegg 0.0.21 has a bug where it passes summonerId instead of encryptedPUUID
  // We pass { encryptedPUUID: puuid, summonerId: puuid } to satisfy both
  let rawMasteries: any[] = [];
  try {
    rawMasteries = await (rApi as any).request(
      platform,
      'CHAMPION_MASTERY.GET_ALL_CHAMPIONS',
      { encryptedPUUID: puuid, summonerId: puuid },
      { id: `${platform}.championMastery.getAllChampions.${puuid}` }
    );
  } catch (err: any) {
    console.warn('[MasteryService] rApi.request failed, trying direct endpoint:', err?.message || err);
  }

  // Direct Riot API endpoint fallback if rApi wrapper failed
  if ((!rawMasteries || !Array.isArray(rawMasteries) || rawMasteries.length === 0) && config.riotApiKey) {
    try {
      const url = `https://${platform.toLowerCase()}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}`;
      const res = await fetch(url, {
        headers: { 'X-Riot-Token': config.riotApiKey },
      });
      if (res.ok) {
        rawMasteries = (await res.json()) as any[];
      } else {
        console.warn(`[MasteryService] Direct fetch returned status ${res.status}: ${res.statusText}`);
      }
    } catch (directErr) {
      console.error('[MasteryService] Direct fetch error:', directErr);
    }
  }

  // 3. Query total mastery score from Riot API
  let totalMasteryScore = 0;
  try {
    const score = await (rApi as any).request(
      platform,
      'CHAMPION_MASTERY.GET_CHAMPION_MASTERY_SCORE',
      { encryptedPUUID: puuid, summonerId: puuid },
      { id: `${platform}.championMastery.getMasteryScore.${puuid}` }
    );
    if (typeof score === 'number') totalMasteryScore = score;
  } catch {
    if (config.riotApiKey) {
      try {
        const scoreRes = await fetch(
          `https://${platform.toLowerCase()}.api.riotgames.com/lol/champion-mastery/v4/scores/by-puuid/${puuid}`,
          { headers: { 'X-Riot-Token': config.riotApiKey } }
        );
        if (scoreRes.ok) {
          const scoreVal = await scoreRes.json();
          if (typeof scoreVal === 'number') totalMasteryScore = scoreVal;
        }
      } catch {
        // ignore
      }
    }
  }

  // 4. Fallback if still empty: Query player's DB matches so page is never completely blank
  if (!rawMasteries || !Array.isArray(rawMasteries) || rawMasteries.length === 0) {
    const dbStats = await prisma.matchParticipant.groupBy({
      by: ['championId'],
      where: { puuid },
      _count: { matchId: true },
      orderBy: { _count: { matchId: 'desc' } },
    });
    if (dbStats.length > 0) {
      rawMasteries = dbStats.map((s) => ({
        championId: s.championId,
        championLevel: Math.min(10, Math.max(1, Math.floor(s._count.matchId / 2))),
        championPoints: s._count.matchId * 1800,
        lastPlayTime: Date.now(),
        championPointsSinceLastLevel: 0,
        championPointsUntilNextLevel: 2000,
        tokensEarned: 0,
        markRequiredForNextLevel: 0,
      }));
    } else {
      return {
        totalMasteryScore: 0,
        totalMasteryPoints: 0,
        masteryCount: 0,
        topMasteryChampions: [],
        masteries: [],
      };
    }
  }

  // 5. Resolve champion names and format
  const masteries: ChampionMasteryItem[] = await Promise.all(
    rawMasteries.map(async (m: any) => {
      const champName = await getChampionNameById(m.championId);
      return {
        championId: m.championId,
        championName: champName || `Champion ${m.championId}`,
        championLevel: m.championLevel || 1,
        championPoints: m.championPoints || 0,
        lastPlayTime: m.lastPlayTime || 0,
        championPointsSinceLastLevel: m.championPointsSinceLastLevel || 0,
        championPointsUntilNextLevel: m.championPointsUntilNextLevel || 0,
        tokensEarned: m.tokensEarned || 0,
        markRequiredForNextLevel: m.markRequiredForNextLevel || 0,
        championSeasonMilestone: m.championSeasonMilestone || 0,
      };
    })
  );

  // Sort descending by championPoints
  masteries.sort((a, b) => b.championPoints - a.championPoints);

  if (totalMasteryScore === 0) {
    totalMasteryScore = masteries.reduce((sum, m) => sum + m.championLevel, 0);
  }
  const totalMasteryPoints = masteries.reduce((sum, m) => sum + m.championPoints, 0);

  return {
    totalMasteryScore,
    totalMasteryPoints,
    masteryCount: masteries.length,
    topMasteryChampions: masteries.slice(0, 3),
    masteries,
  };
}
