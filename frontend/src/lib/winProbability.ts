import { LiveGameParticipant, LiveGameWinProbability } from '@/types';
import { TIER_BASE_LP, DIVISION_OFFSET_LP } from './utils';
import { isSummonersRift as checkIsSummonersRift } from './gameMetadata';

export function getPlayerMmr(p: LiveGameParticipant | null | undefined): number | null {
  if (!p || !p.rank || !p.rank.tier) return null;
  const tier = (p.rank.tier || '').toUpperCase();
  if (tier === 'UNRANKED' || !tier) return null;
  const base = TIER_BASE_LP[tier];
  if (base === undefined) return null;
  if (tier === 'MASTER' || tier === 'GRANDMASTER' || tier === 'CHALLENGER') {
    return base + (p.rank.leaguePoints || 0);
  }
  const div = (p.rank.rank || 'IV').toUpperCase();
  const divOffset = DIVISION_OFFSET_LP[div] ?? 0;
  return base + divOffset + (p.rank.leaguePoints || 0);
}

export function calculateLiveGameWinProbability(
  blueTeam: LiveGameParticipant[] = [],
  redTeam: LiveGameParticipant[] = [],
  mapId?: number,
  queueId?: number
): LiveGameWinProbability {
  const safeBlueTeam = Array.isArray(blueTeam) ? blueTeam.filter(Boolean) : [];
  const safeRedTeam = Array.isArray(redTeam) ? redTeam.filter(Boolean) : [];

  // 1. Calculate MMR per team, imputing unranked players with match average
  const allKnownMmrs = [...safeBlueTeam, ...safeRedTeam]
    .map(getPlayerMmr)
    .filter((m): m is number => m !== null);
  const matchAvgMmr =
    allKnownMmrs.length > 0
      ? Math.round(allKnownMmrs.reduce((a, b) => a + b, 0) / allKnownMmrs.length)
      : 1200; // Gold IV fallback

  const blueMmrs = safeBlueTeam.map((p) => getPlayerMmr(p) ?? matchAvgMmr);
  const blueAvgMmr =
    blueMmrs.length > 0
      ? Math.round(blueMmrs.reduce((a, b) => a + b, 0) / blueMmrs.length)
      : matchAvgMmr;

  const redMmrs = safeRedTeam.map((p) => getPlayerMmr(p) ?? matchAvgMmr);
  const redAvgMmr =
    redMmrs.length > 0
      ? Math.round(redMmrs.reduce((a, b) => a + b, 0) / redMmrs.length)
      : matchAvgMmr;

  const rankDiffLp = blueAvgMmr - redAvgMmr;
  // 100 LP (~1 division) = 2.5% swing, clamped to +/-18%
  const mmrAdvantage = Math.max(-18, Math.min(18, rankDiffLp / 40));

  // 2. Ranked Winrates
  const blueWrs = safeBlueTeam
    .filter((p) => p && p.rank && typeof p.rank.winrate === 'number' && ((p.rank.wins || 0) + (p.rank.losses || 0) > 0))
    .map((p) => p.rank!.winrate);
  const redWrs = safeRedTeam
    .filter((p) => p && p.rank && typeof p.rank.winrate === 'number' && ((p.rank.wins || 0) + (p.rank.losses || 0) > 0))
    .map((p) => p.rank!.winrate);

  const blueAvgWinrate =
    blueWrs.length > 0 ? Math.round(blueWrs.reduce((a, b) => a + b, 0) / blueWrs.length) : null;
  const redAvgWinrate =
    redWrs.length > 0 ? Math.round(redWrs.reduce((a, b) => a + b, 0) / redWrs.length) : null;

  let wrAdvantage = 0;
  if (blueAvgWinrate !== null && redAvgWinrate !== null) {
    const wrDelta = blueAvgWinrate - redAvgWinrate;
    wrAdvantage = Math.max(-8, Math.min(8, wrDelta * 0.35));
  }

  // 3. Champion Winrates
  const blueChampWrs = safeBlueTeam
    .filter((p) => p && p.championStats && typeof p.championStats.winrate === 'number' && (p.championStats.games || 0) >= 2)
    .map((p) => p.championStats!.winrate);
  const redChampWrs = safeRedTeam
    .filter((p) => p && p.championStats && typeof p.championStats.winrate === 'number' && (p.championStats.games || 0) >= 2)
    .map((p) => p.championStats!.winrate);

  const blueChampWinrate =
    blueChampWrs.length > 0 ? Math.round(blueChampWrs.reduce((a, b) => a + b, 0) / blueChampWrs.length) : null;
  const redChampWinrate =
    redChampWrs.length > 0 ? Math.round(redChampWrs.reduce((a, b) => a + b, 0) / redChampWrs.length) : null;

  let champAdvantage = 0;
  if (blueChampWinrate !== null && redChampWinrate !== null) {
    const champDelta = blueChampWinrate - redChampWinrate;
    champAdvantage = Math.max(-6, Math.min(6, champDelta * 0.25));
  }

  // 4. Champion Mastery Experience
  function getPlayerMasteryScore(p: LiveGameParticipant): number {
    if (!p.mastery) return 25; // neutral baseline (~5k-10k pts)
    const pts = Math.max(0, p.mastery.championPoints || 0);
    const lvl = Math.max(0, p.mastery.championLevel || 0);

    // Smooth log scale for points (0 to 100)
    // 0 pts -> 0, 5k -> ~33, 25k -> ~56, 50k -> ~66, 100k -> ~76, 250k -> ~90, 500k+ -> 100
    const ptsScore = pts <= 0 ? 0 : Math.min(100, Math.log10(pts / 500 + 1) * 33.3);
    const lvlScore = Math.min(100, lvl * 10);
    return Math.round(ptsScore * 0.85 + lvlScore * 0.15);
  }

  const blueMasteryScores = safeBlueTeam.map(getPlayerMasteryScore);
  const redMasteryScores = safeRedTeam.map(getPlayerMasteryScore);

  const blueAvgMasteryScore =
    blueMasteryScores.length > 0
      ? blueMasteryScores.reduce((a, b) => a + b, 0) / blueMasteryScores.length
      : 25;
  const redAvgMasteryScore =
    redMasteryScores.length > 0
      ? redMasteryScores.reduce((a, b) => a + b, 0) / redMasteryScores.length
      : 25;

  const blueKnownMasteries = safeBlueTeam.filter((p) => p.mastery != null);
  const redKnownMasteries = safeRedTeam.filter((p) => p.mastery != null);

  const blueAvgMasteryPts =
    blueKnownMasteries.length > 0
      ? Math.round(
          blueKnownMasteries.reduce((a, b) => a + (b.mastery?.championPoints || 0), 0) /
            blueKnownMasteries.length
        )
      : null;
  const redAvgMasteryPts =
    redKnownMasteries.length > 0
      ? Math.round(
          redKnownMasteries.reduce((a, b) => a + (b.mastery?.championPoints || 0), 0) /
            redKnownMasteries.length
        )
      : null;

  const blueAvgMasteryLevel =
    blueKnownMasteries.length > 0
      ? Math.round(
          (blueKnownMasteries.reduce((a, b) => a + (b.mastery?.championLevel || 0), 0) /
            blueKnownMasteries.length) *
            10
        ) / 10
      : null;
  const redAvgMasteryLevel =
    redKnownMasteries.length > 0
      ? Math.round(
          (redKnownMasteries.reduce((a, b) => a + (b.mastery?.championLevel || 0), 0) /
            redKnownMasteries.length) *
            10
        ) / 10
      : null;

  let masteryAdvantage = 0;
  if (blueAvgMasteryPts !== null || redAvgMasteryPts !== null) {
    const masteryDelta = blueAvgMasteryScore - redAvgMasteryScore;
    // Map -100..+100 to max +/-7% winrate swing
    masteryAdvantage = Math.max(-7, Math.min(7, Math.round(masteryDelta * 0.07 * 10) / 10));
  }

  // 5. Map & Side Advantage (Summoner's Rift has ~51.2% Blue bias)
  const isSummonersRift = checkIsSummonersRift(mapId, queueId);
  const sideAdvantage = isSummonersRift ? 1.2 : 0;

  // 6. Total Blue Winrate
  const rawBlue =
    50 + mmrAdvantage + wrAdvantage + champAdvantage + masteryAdvantage + sideAdvantage;
  const clampedBlue = Math.max(20, Math.min(80, rawBlue));
  const blueWinrate = Math.round(clampedBlue * 10) / 10;
  const redWinrate = Math.round((100 - blueWinrate) * 10) / 10;

  const favoredTeam: 'blue' | 'red' | 'even' =
    blueWinrate >= 51.0 ? 'blue' : redWinrate >= 51.0 ? 'red' : 'even';

  const knownCount = allKnownMmrs.length;
  const knownMasteryCount = [...safeBlueTeam, ...safeRedTeam].filter(
    (p) => p.mastery != null
  ).length;
  const confidence: 'high' | 'medium' | 'low' =
    knownCount >= 8 && knownMasteryCount >= 6
      ? 'high'
      : knownCount >= 4 || knownMasteryCount >= 6
      ? 'medium'
      : 'low';

  return {
    blueWinrate,
    redWinrate,
    favoredTeam,
    confidence,
    factors: {
      rankDiffLp,
      blueAvgMmr,
      redAvgMmr,
      blueAvgWinrate,
      redAvgWinrate,
      blueChampWinrate,
      redChampWinrate,
      sideAdvantage,
      blueAvgMasteryPts,
      redAvgMasteryPts,
      blueAvgMasteryLevel,
      redAvgMasteryLevel,
      masteryAdvantage,
      mmrAdvantage,
      wrAdvantage,
      champAdvantage,
    },
  };
}
