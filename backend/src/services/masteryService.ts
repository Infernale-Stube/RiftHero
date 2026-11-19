import { getRiotClient } from '../riot/client';
import { getPlatformForRegion, normalizeRegion } from '../riot/regions';
import { getChampionNameById } from '../riot/ddragon';
import { prisma } from '../db/prisma';

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

  // 2. Query all champion masteries via Riot API
  let rawMasteries: any[] = [];
  try {
    rawMasteries = await rApi.championMastery.getAllChampions({
      region: platform as any,
      summonerId: puuid,
    });
  } catch (err) {
    console.error('[MasteryService] Failed to fetch champion masteries:', err);
    return null;
  }

  if (!Array.isArray(rawMasteries)) {
    return null;
  }

  // 3. Resolve champion names and format
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

  const totalMasteryScore = masteries.reduce((sum, m) => sum + m.championLevel, 0);
  const totalMasteryPoints = masteries.reduce((sum, m) => sum + m.championPoints, 0);

  return {
    totalMasteryScore,
    totalMasteryPoints,
    masteryCount: masteries.length,
    topMasteryChampions: masteries.slice(0, 3),
    masteries,
  };
}
