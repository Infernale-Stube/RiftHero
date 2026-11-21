import { LiveGameParticipant, LiveGameWinProbability } from '@/types';
import { TIER_BASE_LP, DIVISION_OFFSET_LP } from './utils';

export function getPlayerMmr(p: LiveGameParticipant): number | null {
  if (!p.rank || !p.rank.tier) return null;
  const tier = p.rank.tier.toUpperCase();
  if (tier === 'UNRANKED') return null;
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
  blueTeam: LiveGameParticipant[],
  redTeam: LiveGameParticipant[],
  mapId?: number,
  queueId?: number
): LiveGameWinProbability {
  // 1. Calculate MMR per team, imputing unranked players with match average
  const allKnownMmrs = [...blueTeam, ...redTeam]
    .map(getPlayerMmr)
    .filter((m): m is number => m !== null);
  const matchAvgMmr =
    allKnownMmrs.length > 0
      ? Math.round(allKnownMmrs.reduce((a, b) => a + b, 0) / allKnownMmrs.length)
      : 1200; // Gold IV fallback

  const blueMmrs = blueTeam.map((p) => getPlayerMmr(p) ?? matchAvgMmr);
  const blueAvgMmr =
    blueMmrs.length > 0
      ? Math.round(blueMmrs.reduce((a, b) => a + b, 0) / blueMmrs.length)
      : matchAvgMmr;

  const redMmrs = redTeam.map((p) => getPlayerMmr(p) ?? matchAvgMmr);
  const redAvgMmr =
    redMmrs.length > 0
      ? Math.round(redMmrs.reduce((a, b) => a + b, 0) / redMmrs.length)
      : matchAvgMmr;

  const rankDiffLp = blueAvgMmr - redAvgMmr;
  // 100 LP (~1 division) = 2.5% swing, clamped to +/-18%
  const mmrAdvantage = Math.max(-18, Math.min(18, rankDiffLp / 40));

  // 2. Ranked Winrates
  const blueWrs = blueTeam
    .filter((p) => p.rank && typeof p.rank.winrate === 'number' && ((p.rank.wins || 0) + (p.rank.losses || 0) > 0))
    .map((p) => p.rank!.winrate);
  const redWrs = redTeam
    .filter((p) => p.rank && typeof p.rank.winrate === 'number' && ((p.rank.wins || 0) + (p.rank.losses || 0) > 0))
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
  const blueChampWrs = blueTeam
    .filter((p) => p.championStats && typeof p.championStats.winrate === 'number' && (p.championStats.games || 0) >= 2)
    .map((p) => p.championStats!.winrate);
  const redChampWrs = redTeam
    .filter((p) => p.championStats && typeof p.championStats.winrate === 'number' && (p.championStats.games || 0) >= 2)
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

  // 4. Map & Side Advantage (Summoner's Rift has ~51.2% Blue bias)
  const isSummonersRift = mapId === 11 || [420, 440, 400, 430].includes(queueId || 0);
  const sideAdvantage = isSummonersRift ? 1.2 : 0;

  // 5. Total Blue Winrate
  const rawBlue = 50 + mmrAdvantage + wrAdvantage + champAdvantage + sideAdvantage;
  const clampedBlue = Math.max(20, Math.min(80, rawBlue));
  const blueWinrate = Math.round(clampedBlue * 10) / 10;
  const redWinrate = Math.round((100 - blueWinrate) * 10) / 10;

  const favoredTeam: 'blue' | 'red' | 'even' =
    blueWinrate >= 51.0 ? 'blue' : redWinrate >= 51.0 ? 'red' : 'even';

  const knownCount = allKnownMmrs.length;
  const confidence: 'high' | 'medium' | 'low' =
    knownCount >= 8 ? 'high' : knownCount >= 4 ? 'medium' : 'low';

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
    },
  };
}
