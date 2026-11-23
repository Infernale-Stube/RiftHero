import { prisma } from '../db/prisma';
import { getChampionNameByIdSync } from '../riot/ddragon';

export const TIER_BASE_LP: Record<string, number> = {
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  EMERALD: 2000,
  DIAMOND: 2400,
  MASTER: 2800,
  GRANDMASTER: 2800,
  CHALLENGER: 2800,
};

export const DIVISION_OFFSET_LP: Record<string, number> = {
  IV: 0,
  III: 100,
  II: 200,
  I: 300,
};

export function calculateTotalLp(tier: string, rank: string, leaguePoints: number): number {
  const t = (tier || 'UNRANKED').toUpperCase();
  const r = (rank || 'IV').toUpperCase();
  const base = TIER_BASE_LP[t] ?? 0;
  if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(t)) {
    return base + (leaguePoints || 0);
  }
  const divOffset = DIVISION_OFFSET_LP[r] ?? 0;
  return base + divOffset + (leaguePoints || 0);
}

export function computePeakRank(
  currentTier?: string | null,
  currentRank?: string | null,
  currentLp?: number | null,
  existingPeakTier?: string | null,
  existingPeakRank?: string | null,
  existingPeakLp?: number | null
): { peakTier: string | null; peakRank: string | null; peakLp: number | null } {
  if (!currentTier || currentTier.toUpperCase() === 'UNRANKED') {
    return {
      peakTier: existingPeakTier || null,
      peakRank: existingPeakRank || null,
      peakLp: existingPeakLp ?? null,
    };
  }

  const curTotal = calculateTotalLp(currentTier, currentRank || 'I', currentLp || 0);

  if (!existingPeakTier || existingPeakTier.toUpperCase() === 'UNRANKED') {
    return {
      peakTier: currentTier,
      peakRank: currentRank || 'I',
      peakLp: currentLp || 0,
    };
  }

  const existingTotal = calculateTotalLp(existingPeakTier, existingPeakRank || 'I', existingPeakLp || 0);

  if (curTotal >= existingTotal) {
    return {
      peakTier: currentTier,
      peakRank: currentRank || 'I',
      peakLp: currentLp || 0,
    };
  }

  return {
    peakTier: existingPeakTier ?? null,
    peakRank: existingPeakRank ?? null,
    peakLp: existingPeakLp ?? null,
  };
}

export function getTierAndRankFromTotalLp(totalLp: number): { tier: string; rank: string; lp: number } {
  if (totalLp >= 2800) {
    return { tier: 'MASTER', rank: 'I', lp: totalLp - 2800 };
  }
  const tiers = ['DIAMOND', 'EMERALD', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'IRON'];
  for (const t of tiers) {
    const base = TIER_BASE_LP[t];
    if (totalLp >= base) {
      const withinTier = totalLp - base;
      const divIdx = Math.min(3, Math.floor(withinTier / 100));
      const divNames = ['IV', 'III', 'II', 'I'];
      const rank = divNames[divIdx];
      const lp = withinTier - divIdx * 100;
      return { tier: t, rank, lp };
    }
  }
  return { tier: 'IRON', rank: 'IV', lp: totalLp };
}

export interface LpPoint {
  date: string;
  timestamp: number;
  tier: string;
  rank: string;
  leaguePoints: number;
  totalLp: number;
  delta: number;
  win?: boolean;
}

export interface LpHistorySummary {
  queueType: string;
  currentTier: string;
  currentRank: string;
  currentLp: number;
  netDeltaLp: number;
  peakTier: string;
  peakRank: string;
  peakLp: number;
  longestWinStreak: number;
  points: LpPoint[];
}

export const VALID_RANKED_QUEUE_IDS = [420, 440, 4, 42, 470] as const;

/**
 * Synchronize LP gains/losses and post-game rank onto MatchParticipant records.
 * Rules:
 * 1. LP delta is ONLY recorded within the 3 ranked queues (Solo/Duo 420, Flex 440, 5s 4/42/470).
 *    Matches from other game modes (ARAM, Normals, Arena, etc.) played in between have nothing to do
 *    with LP and are completely ignored (they do not count towards untracked matches).
 * 2. On first crawl (cold start / no previous tracked match in this queue), the latest match in this
 *    queue is saved as the baseline (lpDelta: null, postGameTotalLp: currentTotalLp).
 * 3. On subsequent syncs, lpDelta is ONLY recorded if EXACTLY ONE new match was downloaded/played in this queue.
 *    If multiple matches were downloaded at once in this queue, no delta may be assigned because we cannot know
 *    the individual game gains/losses, avoiding bundling multiple games' deltas into one game.
 *    Only the chronologically latest match in this queue updates postGameTotalLp as the new baseline (with lpDelta: null).
 * 4. Older untracked historical matches remain null (no synthetic data fabricated).
 */
export async function syncParticipantLpForQueue(
  puuid: string,
  queueId: number, // 420 (Solo), 440 (Flex), or 4/42/470 (Ranked 5s/3s)
  newTier: string | null | undefined,
  newRank: string | null | undefined,
  newLp: number | null | undefined
): Promise<void> {
  // STRICT: Only the 3 ranked queues track LP! Other game modes have nothing to do with LP!
  if (!VALID_RANKED_QUEUE_IDS.includes(queueId as any)) {
    return;
  }

  if (!newTier || newTier.toUpperCase() === 'UNRANKED') {
    return;
  }

  const newTotalLp = calculateTotalLp(newTier, newRank || 'IV', newLp ?? 0);

  // Fetch all matches for this summoner STRICTLY in this specific queue, ordered chronologically (oldest to newest)
  // Non-ranked game modes (ARAM, Normals, Arena, etc.) or matches from other queues are completely excluded!
  const participants = await prisma.matchParticipant.findMany({
    where: {
      puuid,
      match: {
        queueId,
      },
    },
    include: {
      match: {
        select: {
          id: true,
          gameCreation: true,
          gameDuration: true,
        },
      },
    },
    orderBy: {
      match: {
        gameCreation: 'asc',
      },
    },
  });

  if (participants.length === 0) {
    return;
  }

  // Find participants that already have postGameTotalLp tracked (within this queue)
  const tracked = participants.filter((p) => p.postGameTotalLp !== null);

  if (tracked.length === 0) {
    // Cold start: No previous LP was tracked for this specific ranked queue.
    // Record the player's MOST RECENT match in this queue as the official starting baseline!
    // lpDelta is strictly NULL because there was no prior match in this queue to compute a delta from.
    const latestParticipant = participants[participants.length - 1];

    await prisma.matchParticipant.update({
      where: {
        matchId_puuid: {
          matchId: latestParticipant.matchId,
          puuid,
        },
      },
      data: {
        lpDelta: null,
        postGameLp: newLp ?? 0,
        postGameTier: newTier,
        postGameRank: newRank || 'IV',
        postGameTotalLp: newTotalLp,
      },
    });

    return;
  }

  // Subsequent sync: We already have tracked matches in this queue!
  // Find the chronologically latest tracked match in this queue
  const lastTracked = tracked[tracked.length - 1];
  const baselineTotalLp = lastTracked.postGameTotalLp!;

  // Find all untracked matches in this queue played AFTER the last tracked match in this queue
  const untracked = participants.filter(
    (p) =>
      p.postGameTotalLp === null &&
      Number(p.match.gameCreation) > Number(lastTracked.match.gameCreation)
  );

  if (untracked.length === 0) {
    // If no new matches were played in this queue, but LP changed (e.g. decay or adjustment), update the latest tracked
    if (baselineTotalLp !== newTotalLp) {
      await prisma.matchParticipant.update({
        where: {
          matchId_puuid: {
            matchId: lastTracked.matchId,
            puuid,
          },
        },
        data: {
          postGameLp: newLp ?? 0,
          postGameTier: newTier,
          postGameRank: newRank || 'IV',
          postGameTotalLp: newTotalLp,
        },
      });
    }
    return;
  }

  if (untracked.length === 1) {
    // Exactly ONE match was played in this queue since the last tracked state!
    // The entire LP delta was caused by this specific match (even if the user played ARAM/Normals in between!).
    const singleMatch = untracked[0];
    const delta = newTotalLp - baselineTotalLp;

    await prisma.matchParticipant.update({
      where: {
        matchId_puuid: {
          matchId: singleMatch.matchId,
          puuid,
        },
      },
      data: {
        lpDelta: delta,
        postGameLp: newLp ?? 0,
        postGameTier: newTier,
        postGameRank: newRank || 'IV',
        postGameTotalLp: newTotalLp,
      },
    });
    return;
  }

  // If untracked.length > 1 (multiple matches in THIS queue downloaded at once):
  // We CANNOT know individual game deltas. Bundling multi-game delta into a match would be wrong!
  // Therefore, lpDelta stays null for all of them.
  // We only set postGameTotalLp on the chronologically latest match in this queue to establish the new baseline.
  const latestMatch = untracked[untracked.length - 1];
  await prisma.matchParticipant.update({
    where: {
      matchId_puuid: {
        matchId: latestMatch.matchId,
        puuid,
      },
    },
    data: {
      lpDelta: null,
      postGameLp: newLp ?? 0,
      postGameTier: newTier,
      postGameRank: newRank || 'IV',
      postGameTotalLp: newTotalLp,
    },
  });
}

/**
 * Record a persistent LP snapshot (kept for backward compatibility, no longer primary store)
 */
export async function recordLpSnapshot(
  summonerId: string,
  queueType: string,
  tier: string,
  rank: string,
  leaguePoints: number,
  wins: number,
  losses: number
): Promise<void> {
  // Peak rank update directly on summoner
  try {
    const summoner = await prisma.summoner.findUnique({
      where: { id: summonerId },
      select: {
        soloPeakTier: true,
        soloPeakRank: true,
        soloPeakLp: true,
        flexPeakTier: true,
        flexPeakRank: true,
        flexPeakLp: true,
        ranked5sPeakTier: true,
        ranked5sPeakRank: true,
        ranked5sPeakLp: true,
      },
    });

    if (summoner) {
      if (queueType === 'RANKED_SOLO_5x5') {
        const peak = computePeakRank(tier, rank, leaguePoints, summoner.soloPeakTier, summoner.soloPeakRank, summoner.soloPeakLp);
        if (peak.peakTier !== summoner.soloPeakTier || peak.peakRank !== summoner.soloPeakRank || peak.peakLp !== summoner.soloPeakLp) {
          await prisma.summoner.update({
            where: { id: summonerId },
            data: {
              soloPeakTier: peak.peakTier,
              soloPeakRank: peak.peakRank,
              soloPeakLp: peak.peakLp,
            },
          });
        }
      } else if (queueType === 'RANKED_FLEX_SR') {
        const peak = computePeakRank(tier, rank, leaguePoints, summoner.flexPeakTier, summoner.flexPeakRank, summoner.flexPeakLp);
        if (peak.peakTier !== summoner.flexPeakTier || peak.peakRank !== summoner.flexPeakRank || peak.peakLp !== summoner.flexPeakLp) {
          await prisma.summoner.update({
            where: { id: summonerId },
            data: {
              flexPeakTier: peak.peakTier,
              flexPeakRank: peak.peakRank,
              flexPeakLp: peak.peakLp,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('[recordLpSnapshot] Failed to update peak rank:', err);
  }
}

/**
 * Fetch LP history for a player based strictly on verified MatchParticipant records.
 * If fewer than 2 tracked matches exist, returns null so no fabricated graph is displayed.
 */
export async function getSummonerLpHistory(
  summonerId: string,
  puuid: string,
  queueType = 'RANKED_SOLO_5x5'
): Promise<LpHistorySummary | null> {
  const summoner = await prisma.summoner.findUnique({
    where: { id: summonerId },
  });

  if (!summoner) return null;

  const normQueue = queueType.toUpperCase();
  const isSolo = normQueue === 'RANKED_SOLO_5X5' || normQueue === 'SOLO' || normQueue === 'RANKED_SOLO';
  const isFlex = normQueue === 'RANKED_FLEX_SR' || normQueue === 'FLEX' || normQueue === 'RANKED_FLEX';
  const is5s = normQueue === 'RANKED_PREMADE_5X5' || normQueue === 'RANKED_5S' || normQueue === '5S' || normQueue === 'RANKED5S';

  // Strictly only the 3 ranked queues have an LP history!
  if (!isSolo && !isFlex && !is5s) return null;

  const tier = isSolo ? summoner.soloTier : isFlex ? summoner.flexTier : summoner.ranked5sTier;
  const rank = isSolo ? summoner.soloRank : isFlex ? summoner.flexRank : summoner.ranked5sRank;
  const lp = isSolo ? summoner.soloLp : isFlex ? summoner.flexLp : summoner.ranked5sLp;

  if (!tier) return null;

  const currentTotalLp = calculateTotalLp(tier, rank || 'I', lp);
  const qId = isSolo ? 420 : isFlex ? 440 : 4;

  // Query match participants that have verified post-game LP tracked
  const participants = await prisma.matchParticipant.findMany({
    where: {
      puuid: summoner.puuid,
      postGameTotalLp: { not: null },
      match: {
        queueId: qId,
      },
    },
    include: {
      match: {
        select: {
          id: true,
          gameCreation: true,
        },
      },
    },
    orderBy: {
      match: {
        gameCreation: 'asc',
      },
    },
    take: 100,
  });

  // Without at least 2 real tracked games over time, do not show a curve
  if (participants.length < 2) {
    return null;
  }

  // Map only genuine recorded match points
  const points: LpPoint[] = participants.map((p) => ({
    date: new Date(Number(p.match.gameCreation)).toISOString().slice(0, 10),
    timestamp: Number(p.match.gameCreation),
    tier: p.postGameTier || tier,
    rank: p.postGameRank || rank || 'IV',
    leaguePoints: p.postGameLp ?? 0,
    totalLp: p.postGameTotalLp ?? currentTotalLp,
    delta: p.lpDelta || 0,
    win: p.win,
  }));

  // Calculate Peak and Longest Win Streak from genuine points
  let peakTotalLp = currentTotalLp;
  let maxWinStreak = 0;
  let currentStreak = 0;

  points.forEach((pt) => {
    if (pt.totalLp > peakTotalLp) {
      peakTotalLp = pt.totalLp;
    }
    if (pt.win) {
      currentStreak++;
      if (currentStreak > maxWinStreak) {
        maxWinStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  });

  const peakInfo = getTierAndRankFromTotalLp(peakTotalLp);
  const storedPeakTier = isSolo ? summoner.soloPeakTier : isFlex ? summoner.flexPeakTier : summoner.ranked5sPeakTier;
  const storedPeakRank = isSolo ? summoner.soloPeakRank : isFlex ? summoner.flexPeakRank : summoner.ranked5sPeakRank;
  const storedPeakLp = isSolo ? summoner.soloPeakLp : isFlex ? summoner.flexPeakLp : summoner.ranked5sPeakLp;

  const startLp = points[0]?.totalLp ?? currentTotalLp;
  const netDeltaLp = currentTotalLp - startLp;

  return {
    queueType,
    currentTier: tier,
    currentRank: rank || 'I',
    currentLp: lp,
    netDeltaLp,
    peakTier: storedPeakTier || peakInfo.tier,
    peakRank: storedPeakRank || peakInfo.rank,
    peakLp: storedPeakLp ?? peakInfo.lp,
    longestWinStreak: Math.max(maxWinStreak, 1),
    points,
  };
}

export interface PlayedWithTeammate {
  puuid: string;
  gameName: string;
  tagLine: string;
  profileIconId?: number;
  championName?: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
}

/**
 * Calculate the players most frequently played with in recent matches (LoLDB "Played With" widget)
 */
export async function getPlayedWithStats(puuid: string, limit = 5): Promise<PlayedWithTeammate[]> {
  // Find all matches the target player participated in
  const userMatches = await prisma.matchParticipant.findMany({
    where: { puuid },
    select: {
      matchId: true,
      teamId: true,
      win: true,
    },
    take: 50,
    orderBy: {
      match: { gameCreation: 'desc' },
    },
  });

  if (userMatches.length === 0) return [];

  const matchIds = userMatches.map((m) => m.matchId);
  const matchTeamMap = new Map<string, { teamId: number; win: boolean }>();
  userMatches.forEach((m) => {
    matchTeamMap.set(m.matchId, { teamId: m.teamId, win: m.win });
  });

  // Query teammates in those matches (same teamId, different puuid)
  const teammates = await prisma.matchParticipant.findMany({
    where: {
      matchId: { in: matchIds },
      puuid: { not: puuid },
    },
    select: {
      puuid: true,
      riotIdGameName: true,
      riotIdTagline: true,
      championId: true,
      profileIcon: true,
      teamId: true,
      win: true,
      matchId: true,
    },
  });

  // Aggregate stats per teammate
  const teammateStats = new Map<
    string,
    {
      puuid: string;
      gameName: string;
      tagLine: string;
      profileIconId?: number;
      championCounts: Record<string, number>;
      games: number;
      wins: number;
      losses: number;
    }
  >();

  for (const t of teammates) {
    const userMatchInfo = matchTeamMap.get(t.matchId);
    if (!userMatchInfo || userMatchInfo.teamId !== t.teamId) {
      continue; // Not on the same team
    }

    const key = t.puuid;
    if (!teammateStats.has(key)) {
      teammateStats.set(key, {
        puuid: t.puuid,
        gameName: t.riotIdGameName,
        tagLine: t.riotIdTagline,
        profileIconId: t.profileIcon || 29,
        championCounts: {},
        games: 0,
        wins: 0,
        losses: 0,
      });
    }

    const stat = teammateStats.get(key)!;
    stat.games++;
    if (t.win) {
      stat.wins++;
    } else {
      stat.losses++;
    }

    const champName = getChampionNameByIdSync(t.championId);
    stat.championCounts[champName] = (stat.championCounts[champName] || 0) + 1;
  }

  // Format and sort by games played (minimum 2 games to be meaningful)
  const sorted = Array.from(teammateStats.values())
    .filter((t) => t.games >= 2)
    .sort((a, b) => b.games - a.games)
    .slice(0, limit)
    .map((t) => {
      // Find most played champion with this teammate
      let topChamp = '';
      let topChampCount = 0;
      for (const [c, count] of Object.entries(t.championCounts)) {
        if (count > topChampCount) {
          topChamp = c;
          topChampCount = count;
        }
      }

      return {
        puuid: t.puuid,
        gameName: t.gameName,
        tagLine: t.tagLine,
        profileIconId: t.profileIconId,
        championName: topChamp || undefined,
        games: t.games,
        wins: t.wins,
        losses: t.losses,
        winrate: Math.round((t.wins / t.games) * 100),
      };
    });

  return sorted;
}

export interface MatchLpChange {
  delta: number;
  tier?: string;
  rank?: string;
  leaguePoints?: number;
}

/**
 * Resolve genuine LP changes for matches by reading lpDelta directly from MatchParticipant.
 * Absolutely no synthetic or randomized values (+21 / -19) are ever generated!
 */
export async function getMatchesLpChanges(
  puuid: string,
  matches: Array<{ id: string; queueId: number; gameCreation: bigint | number; win: boolean }>
): Promise<Map<string, MatchLpChange>> {
  const map = new Map<string, MatchLpChange>();

  // Only ranked matches receive LP (strictly within the 3 ranked queues)
  const rankedMatchIds = matches
    .filter((m) => VALID_RANKED_QUEUE_IDS.includes(m.queueId as any))
    .map((m) => m.id);

  if (rankedMatchIds.length === 0) return map;

  const participants = await prisma.matchParticipant.findMany({
    where: {
      puuid,
      matchId: { in: rankedMatchIds },
      lpDelta: { not: null },
    },
    select: {
      matchId: true,
      lpDelta: true,
      postGameTier: true,
      postGameRank: true,
      postGameLp: true,
    },
  });

  for (const p of participants) {
    if (p.lpDelta !== null) {
      map.set(p.matchId, {
        delta: p.lpDelta,
        tier: p.postGameTier || '',
        rank: p.postGameRank || '',
        leaguePoints: p.postGameLp ?? 0,
      });
    }
  }

  return map;
}
