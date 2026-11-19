import { getRiotClient } from '../riot/client';
import { getPlatformForRegion } from '../riot/regions';

export interface FormattedChallengeItem {
  challengeId: number;
  name: string;
  description: string;
  category: string;
  level: string;
  value: number;
  percentile: number;
  achievedTime?: number;
  iconUrl: string;
  isCapstone: boolean;
  thresholds?: Record<string, number>;
  nextThreshold?: {
    tier: string;
    value: number;
  } | null;
}

export interface ChallengeCategoryProgress {
  category: string;
  name: string;
  level: string;
  current: number;
  max: number;
  percentile: number;
  progressPercent: number;
  iconUrl: string;
}

export interface FormattedPlayerChallenges {
  totalPoints: {
    level: string;
    current: number;
    max: number;
    percentile: number;
    progressPercent: number;
    crystalIconUrl: string;
  };
  categoryPoints: Record<string, ChallengeCategoryProgress>;
  challenges: FormattedChallengeItem[];
  preferences?: {
    title?: string;
    bannerAccent?: string;
    challengeIds?: number[];
  };
}

const TIER_ORDER: Record<string, number> = {
  NONE: 0,
  IRON: 1,
  BRONZE: 2,
  SILVER: 3,
  GOLD: 4,
  PLATINUM: 5,
  EMERALD: 6,
  DIAMOND: 7,
  MASTER: 8,
  GRANDMASTER: 9,
  CHALLENGER: 10,
};

const CATEGORY_NAMES: Record<string, string> = {
  EXPERTISE: 'Expertise',
  TEAMWORK: 'Teamwork',
  IMAGINATION: 'Imagination',
  VETERANCY: 'Veterancy',
  COLLECTION: 'Collection',
};

const CATEGORY_ICONS: Record<string, string> = {
  EXPERTISE: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/challenges/config/2/tokens/master.png',
  TEAMWORK: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/challenges/config/4/tokens/master.png',
  IMAGINATION: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/challenges/config/1/tokens/master.png',
  VETERANCY: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/challenges/config/3/tokens/master.png',
  COLLECTION: 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/challenges/config/5/tokens/master.png',
};

// In-memory cache of CommunityDragon challenges definitions
let cachedDefinitions: any = null;
let cachedTitles: Record<string, any> = {};
let lastFetchTime = 0;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function loadCommunityDragonDefinitions() {
  const now = Date.now();
  if (cachedDefinitions && now - lastFetchTime < CACHE_TTL_MS) {
    return cachedDefinitions;
  }

  try {
    const res = await fetch(
      'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/challenges.json'
    );
    if (!res.ok) {
      console.warn(`[Challenges] CommunityDragon fetch returned HTTP ${res.status}`);
      return cachedDefinitions || {};
    }
    const data = (await res.json()) as any;
    cachedDefinitions = data.challenges || {};
    cachedTitles = data.titles || {};
    lastFetchTime = now;
    console.log(`[Challenges] Loaded ${Object.keys(cachedDefinitions).length} challenge definitions from CommunityDragon`);
    return cachedDefinitions;
  } catch (err: any) {
    console.error('[Challenges] Failed to fetch CommunityDragon challenges:', err.message);
    return cachedDefinitions || {};
  }
}

function resolveCategory(challengeId: string | number, definitions: Record<string, any>): string {
  const idStr = String(challengeId);
  if (idStr === '1') return 'IMAGINATION';
  if (idStr === '2') return 'EXPERTISE';
  if (idStr === '3') return 'VETERANCY';
  if (idStr === '4') return 'TEAMWORK';
  if (idStr === '5') return 'COLLECTION';
  if (idStr === '0') return 'CRYSTAL';

  let current = definitions[idStr];
  let depth = 0;
  while (current && current.tags && current.tags.parent && depth < 5) {
    const parentId = String(current.tags.parent);
    if (parentId === '1') return 'IMAGINATION';
    if (parentId === '2') return 'EXPERTISE';
    if (parentId === '3') return 'VETERANCY';
    if (parentId === '4') return 'TEAMWORK';
    if (parentId === '5') return 'COLLECTION';
    if (parentId === '0') return 'CRYSTAL';

    current = definitions[parentId];
    depth++;
  }

  // Fallback heuristic based on ID ranges if parent chain is truncated
  if (idStr.startsWith('10')) return 'IMAGINATION';
  if (idStr.startsWith('20') && !idStr.startsWith('202')) return 'EXPERTISE';
  if (idStr.startsWith('30')) return 'VETERANCY';
  if (idStr.startsWith('40')) return 'TEAMWORK';
  if (idStr.startsWith('50')) return 'COLLECTION';
  if (idStr.startsWith('202')) return 'SEASONAL';

  return 'LEGACY';
}

function formatTokenIconUrl(challengeId: number, level: string, def?: any): string {
  const tierKey = (level || 'iron').toLowerCase();
  if (def?.levelToIconPath) {
    const upperLevel = (level || 'IRON').toUpperCase();
    const rawPath = def.levelToIconPath[upperLevel] || def.levelToIconPath['IRON'] || Object.values(def.levelToIconPath)[0];
    if (rawPath && typeof rawPath === 'string') {
      const cleanPath = rawPath.replace(/^\/lol-game-data\/assets\//i, '').toLowerCase();
      return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/${cleanPath}`;
    }
  }

  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/challenges/config/${challengeId}/tokens/${tierKey}.png`;
}

export async function getSummonerChallenges(
  region: string,
  puuid: string
): Promise<FormattedPlayerChallenges> {
  const definitions = await loadCommunityDragonDefinitions();
  const platform = getPlatformForRegion(region);
  const rApi = getRiotClient();

  let rawPlayerData: any = null;
  try {
    rawPlayerData = await rApi.lolChallenges.getPlayerDataByPUUID({
      region: platform as any,
      puuid,
    });
  } catch (err: any) {
    console.warn(`[Challenges] Riot API lolChallenges lookup failed for ${puuid}: ${err.message}`);
  }

  // Fallback defaults if player has no challenge data recorded yet
  const total = rawPlayerData?.totalPoints || {
    level: 'IRON',
    current: 0,
    max: 1000,
    percentile: 0.5,
  };

  const totalCurrent = total.current || 0;
  const totalMax = total.max || Math.max(totalCurrent, 1000);
  const totalProgressPercent = totalMax > 0 ? Math.min(Math.round((totalCurrent / totalMax) * 100), 100) : 0;
  const totalLevel = (total.level || 'IRON').toUpperCase();

  // Category points
  const rawCategories = rawPlayerData?.categoryPoints || {};
  const categoryPoints: Record<string, ChallengeCategoryProgress> = {};

  const standardCategories = ['EXPERTISE', 'TEAMWORK', 'IMAGINATION', 'VETERANCY', 'COLLECTION'];
  for (const cat of standardCategories) {
    const catData = rawCategories[cat] || {
      level: 'IRON',
      current: 0,
      max: 1000,
      percentile: 0.5,
    };
    const cCurr = catData.current || 0;
    const cMax = catData.max || Math.max(cCurr, 1000);
    const cPercent = cMax > 0 ? Math.min(Math.round((cCurr / cMax) * 100), 100) : 0;

    categoryPoints[cat] = {
      category: cat,
      name: CATEGORY_NAMES[cat] || cat,
      level: (catData.level || 'IRON').toUpperCase(),
      current: cCurr,
      max: cMax,
      percentile: catData.percentile || 0,
      progressPercent: cPercent,
      iconUrl: CATEGORY_ICONS[cat] || '',
    };
  }

  // Format list of challenges
  const rawList: any[] = Array.isArray(rawPlayerData?.challenges) ? rawPlayerData.challenges : [];
  const formattedChallenges: FormattedChallengeItem[] = [];

  for (const item of rawList) {
    const cid = item.challengeId;
    const def = definitions[String(cid)];

    const name = def?.name || `Challenge #${cid}`;
    // Skip internal placeholder challenges with no name or crystal category itself
    if (String(cid) === '0' || !name.trim()) continue;

    const description = def?.description || def?.descriptionShort || '';
    const category = resolveCategory(cid, definitions);
    const level = (item.level || 'NONE').toUpperCase();
    const value = item.value || 0;
    const percentile = item.percentile || 0;
    const isCapstone = def?.tags?.isCapstone === 'Y';

    // Parse thresholds to determine next milestone
    const thresholdValues: Record<string, number> = {};
    if (def?.thresholds && typeof def.thresholds === 'object') {
      for (const [tTier, tObj] of Object.entries(def.thresholds as Record<string, any>)) {
        if (tObj && typeof tObj.value === 'number') {
          thresholdValues[tTier] = tObj.value;
        }
      }
    }

    // Determine next threshold
    let nextThreshold: { tier: string; value: number } | null = null;
    const currentTierRank = TIER_ORDER[level] ?? 0;
    for (const [tTier, tVal] of Object.entries(thresholdValues)) {
      const rank = TIER_ORDER[tTier] ?? 0;
      if (rank > currentTierRank && (!nextThreshold || rank < (TIER_ORDER[nextThreshold.tier] ?? 99))) {
        nextThreshold = { tier: tTier, value: tVal };
      }
    }

    formattedChallenges.push({
      challengeId: cid,
      name,
      description,
      category,
      level,
      value,
      percentile,
      achievedTime: item.achievedTime,
      iconUrl: formatTokenIconUrl(cid, level, def),
      isCapstone,
      thresholds: thresholdValues,
      nextThreshold,
    });
  }

  // Sort: Capstones first, then highest level, then percentile (rarity), then value
  formattedChallenges.sort((a, b) => {
    if (a.isCapstone !== b.isCapstone) return a.isCapstone ? -1 : 1;
    const rankDiff = (TIER_ORDER[b.level] || 0) - (TIER_ORDER[a.level] || 0);
    if (rankDiff !== 0) return rankDiff;
    return b.value - a.value;
  });

  // Resolve preference title if present
  let resolvedTitle: string | undefined = undefined;
  if (rawPlayerData?.preferences?.title) {
    const titleObj = cachedTitles[rawPlayerData.preferences.title];
    resolvedTitle = titleObj?.name || rawPlayerData.preferences.title;
  }

  return {
    totalPoints: {
      level: totalLevel,
      current: totalCurrent,
      max: totalMax,
      percentile: total.percentile || 0,
      progressPercent: totalProgressPercent,
      crystalIconUrl: `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/challenges/config/0/tokens/${totalLevel.toLowerCase()}.png`,
    },
    categoryPoints,
    challenges: formattedChallenges,
    preferences: rawPlayerData?.preferences
      ? {
          title: resolvedTitle,
          bannerAccent: rawPlayerData.preferences.bannerAccent,
          challengeIds: rawPlayerData.preferences.challengeIds,
        }
      : undefined,
  };
}
