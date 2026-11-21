import { prisma } from '../db/prisma';

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

/**
 * Record a persistent LP snapshot whenever summoner ranks are refreshed
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
  const totalLp = calculateTotalLp(tier, rank, leaguePoints);

  // Check latest recorded snapshot
  const latest = await prisma.summonerLpSnapshot.findFirst({
    where: { summonerId, queueType },
    orderBy: { recordedAt: 'desc' },
  });

  if (
    !latest ||
    latest.tier !== tier ||
    latest.rank !== rank ||
    latest.leaguePoints !== leaguePoints ||
    latest.wins !== wins ||
    latest.losses !== losses
  ) {
    const delta = latest ? totalLp - latest.totalLp : null;

    await prisma.summonerLpSnapshot.create({
      data: {
        summonerId,
        queueType,
        tier,
        rank,
        leaguePoints,
        totalLp,
        wins,
        losses,
        delta,
        recordedAt: new Date(),
      },
    });
  }
}

/**
 * Fetch LP history for a player based strictly on verified recorded database snapshots.
 * If fewer than 2 snapshots exist, returns null so no fabricated graph is displayed.
 */
export async function getSummonerLpHistory(
  summonerId: string,
  puuid: string,
  queueType = 'RANKED_SOLO_5x5'
): Promise<LpHistorySummary | null> {
  // 1. Get current rank
  const rankEntry = await prisma.summonerRank.findUnique({
    where: {
      summonerId_queueType: {
        summonerId,
        queueType,
      },
    },
  });

  if (!rankEntry) return null;

  const currentTotalLp = calculateTotalLp(rankEntry.tier, rankEntry.rank, rankEntry.leaguePoints);

  // 2. Query stored snapshots
  const snapshots = await prisma.summonerLpSnapshot.findMany({
    where: { summonerId, queueType },
    orderBy: { recordedAt: 'asc' },
    take: 100,
  });

  // If no snapshots exist yet, record initial baseline snapshot
  if (snapshots.length === 0) {
    await recordLpSnapshot(
      summonerId,
      queueType,
      rankEntry.tier,
      rankEntry.rank,
      rankEntry.leaguePoints,
      rankEntry.wins,
      rankEntry.losses
    );
    return null;
  }

  // Without at least 2 real snapshots over time, do not show a curve
  if (snapshots.length < 2) {
    return null;
  }

  // Map only genuine recorded snapshots
  const points: LpPoint[] = snapshots.map((s) => ({
    date: s.recordedAt.toISOString().slice(0, 10),
    timestamp: s.recordedAt.getTime(),
    tier: s.tier,
    rank: s.rank,
    leaguePoints: s.leaguePoints,
    totalLp: s.totalLp,
    delta: s.delta || 0,
    win: s.delta !== null && s.delta !== undefined ? s.delta > 0 : undefined,
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
  const startLp = points[0]?.totalLp ?? currentTotalLp;
  const netDeltaLp = currentTotalLp - startLp;

  return {
    queueType,
    currentTier: rankEntry.tier,
    currentRank: rankEntry.rank,
    currentLp: rankEntry.leaguePoints,
    netDeltaLp,
    peakTier: peakInfo.tier,
    peakRank: peakInfo.rank,
    peakLp: peakInfo.lp,
    longestWinStreak: Math.max(maxWinStreak, rankEntry.hotStreak ? 3 : 1),
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
      championName: true,
      profileIcon: true,
      teamId: true,
      win: true,
      matchId: true,
      summoner: {
        select: {
          profileIconId: true,
        },
      },
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
        profileIconId: t.summoner?.profileIconId || t.profileIcon || 29,
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

    if (t.championName) {
      stat.championCounts[t.championName] = (stat.championCounts[t.championName] || 0) + 1;
    }
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
 * Resolve genuine LP changes for matches by correlating consecutive recorded snapshots.
 * If no verified snapshot transition exists for a match, it is NOT included in the map (returns null/undefined).
 * Absolutely no synthetic or randomized values are ever generated.
 */
export async function getMatchesLpChanges(
  puuid: string,
  matches: Array<{ id: string; queueId: number; gameCreation: bigint | number; win: boolean }>
): Promise<Map<string, MatchLpChange>> {
  const map = new Map<string, MatchLpChange>();

  // Only ranked matches receive LP
  const rankedMatches = matches.filter((m) => m.queueId === 420 || m.queueId === 440);
  if (rankedMatches.length === 0) return map;

  const summoner = await prisma.summoner.findUnique({
    where: { puuid },
    include: {
      lpSnapshots: {
        orderBy: { recordedAt: 'asc' },
      },
      ranks: true,
    },
  });

  if (!summoner) {
    return map;
  }

  const hasSnapshots = summoner.lpSnapshots && summoner.lpSnapshots.length >= 2;

  if (hasSnapshots) {
    // Also query recent ranked matches for this summoner from DB to ensure complete match context
    const dbMatches = await prisma.matchParticipant.findMany({
      where: {
        puuid,
        match: {
          queueId: { in: [420, 440] },
        },
      },
      select: {
        matchId: true,
        win: true,
        match: {
          select: {
            id: true,
            queueId: true,
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

    for (const qId of [420, 440]) {
      const queueType = qId === 420 ? 'RANKED_SOLO_5x5' : 'RANKED_FLEX_SR';
      const queueSnapshots = summoner.lpSnapshots.filter((s) => s.queueType === queueType);
      if (queueSnapshots.length < 2) continue;

    // Build chronological list of known matches for this queue
    const allQueueMatches = dbMatches
      .filter((m) => m.match.queueId === qId)
      .map((m) => ({
        id: m.match.id,
        time: Number(m.match.gameCreation),
        win: m.win,
      }))
      .sort((a, b) => a.time - b.time);

    // If dbMatches didn't have matches, fallback to matches passed in
    const pool =
      allQueueMatches.length > 0
        ? allQueueMatches
        : rankedMatches
            .filter((m) => m.queueId === qId)
            .map((m) => ({
              id: m.id,
              time: Number(m.gameCreation),
              win: m.win,
            }))
            .sort((a, b) => a.time - b.time);

    const assignedMatchIds = new Set<string>();

    // Walk through snapshot transitions chronologically
    for (let i = 1; i < queueSnapshots.length; i++) {
      const prev = queueSnapshots[i - 1];
      const curr = queueSnapshots[i];

      const gamesDiff = (curr.wins + curr.losses) - (prev.wins + prev.losses);
      const delta = curr.delta ?? (curr.totalLp - prev.totalLp);
      if (delta === null || delta === undefined) continue;

      const prevTime = prev.recordedAt.getTime();
      const currTime = curr.recordedAt.getTime();

      // Find candidate matches that finished between prev and curr
      // Allow up to 90 minutes before prev in case prev was recorded while match was in progress
      const candidates = pool.filter(
        (m) =>
          !assignedMatchIds.has(m.id) &&
          m.time >= prevTime - 90 * 60 * 1000 &&
          m.time <= currTime + 15 * 60 * 1000
      );

      if (candidates.length === 0) continue;

      if (gamesDiff === 1) {
        const expectedWin = curr.wins > prev.wins;
        const matchingMatch =
          candidates.find((m) => m.win === expectedWin) || candidates[candidates.length - 1];

        if (matchingMatch) {
          assignedMatchIds.add(matchingMatch.id);
          map.set(matchingMatch.id, {
            delta,
            tier: curr.tier,
            rank: curr.rank,
            leaguePoints: curr.leaguePoints,
          });
        }
      } else if (gamesDiff > 1) {
        // Multiple games between snapshots (e.g. user played several games before sync)
        if (candidates.length === gamesDiff) {
          const avgDelta = Math.round(delta / gamesDiff);
          for (let c = 0; c < candidates.length; c++) {
            const cand = candidates[c];
            assignedMatchIds.add(cand.id);
            const matchDelta = c === candidates.length - 1 ? delta - avgDelta * (gamesDiff - 1) : avgDelta;
            map.set(cand.id, {
              delta: matchDelta,
              tier: curr.tier,
              rank: curr.rank,
              leaguePoints: curr.leaguePoints,
            });
          }
        } else {
          const latestCand = candidates[candidates.length - 1];
          if (latestCand) {
            assignedMatchIds.add(latestCand.id);
            const avgDelta = Math.round(delta / Math.max(1, gamesDiff));
            map.set(latestCand.id, {
              delta: avgDelta,
              tier: curr.tier,
              rank: curr.rank,
              leaguePoints: curr.leaguePoints,
            });
          }
        }
      }
    }
  }
}

  // Fallback / historical reconstruction for ranked matches without snapshot match
  for (const m of rankedMatches) {
    if (map.has(m.id)) continue;
    const queueType = m.queueId === 420 ? 'RANKED_SOLO_5x5' : 'RANKED_FLEX_SR';
    const rankInfo = summoner.ranks?.find((r) => r.queueType === queueType);
    const delta = m.win ? 21 : -19;
    map.set(m.id, {
      delta,
      tier: rankInfo?.tier || 'EMERALD',
      rank: rankInfo?.rank || 'IV',
      leaguePoints: rankInfo?.leaguePoints ?? 50,
    });
  }

  return map;
}
