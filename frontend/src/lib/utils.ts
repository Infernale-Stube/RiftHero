import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
}

export function formatTimeAgo(timestamp: number | string): string {
  const time = typeof timestamp === 'string' ? new Date(timestamp).getTime() : timestamp;
  const now = Date.now();
  const diffSec = Math.floor((now - time) / 1000);

  if (diffSec < 60) return 'vor wenigen Sekunden';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `vor ${diffHours} Std.`;
  const diffDays = Math.floor(diffHours / 24);
  return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`;
}

export function getKdaColor(kda: number): string {
  if (kda >= 5.0) return 'text-orange-400 font-bold';
  if (kda >= 4.0) return 'text-sky-400 font-semibold';
  if (kda >= 3.0) return 'text-emerald-400 font-medium';
  if (kda >= 2.0) return 'text-slate-200';
  return 'text-slate-400';
}

export function getWinrateColor(winrate: number): string {
  if (winrate > 50) return 'text-emerald-400 font-bold';
  if (winrate < 50) return 'text-rose-400 font-bold';
  return 'text-zinc-400 font-bold';
}

export const TIER_BASE_LP: Record<string, number> = {
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  EMERALD: 2000,
  DIAMOND: 2400,
  MASTER: 2800,
  GRANDMASTER: 3200,
  CHALLENGER: 3600,
};

export const DIVISION_OFFSET_LP: Record<string, number> = {
  IV: 0,
  III: 100,
  II: 200,
  I: 300,
};

export interface TeamAverageRank {
  tier: string;
  division?: string;
  lp?: number;
  formatted: string;
  count: number;
  totalPlayers: number;
  avgWinrate?: number | null;
  avgChampWinrate?: number | null;
}

export function calculateTeamAverageWinrate(
  participants: Array<{
    rank?: {
      winrate?: number;
      wins?: number;
      losses?: number;
    } | null;
  }>
): number | null {
  const players = participants.filter(
    (p) => p.rank && typeof p.rank.winrate === 'number' && ((p.rank.wins || 0) + (p.rank.losses || 0) > 0)
  );
  if (players.length === 0) return null;
  return Math.round(players.reduce((sum, p) => sum + (p.rank?.winrate || 0), 0) / players.length);
}

export function calculateTeamAverageRank(
  participants: Array<{
    rank?: {
      tier: string;
      rank?: string;
      leaguePoints?: number;
      winrate?: number;
      wins?: number;
      losses?: number;
    } | null;
    championStats?: {
      winrate?: number;
      games?: number;
    } | null;
  }>
): TeamAverageRank | null {
  const pointsList: number[] = [];
  const winrateList: number[] = [];
  const champWinrateList: number[] = [];

  for (const p of participants) {
    if (p.rank && typeof p.rank.winrate === 'number' && ((p.rank.wins || 0) + (p.rank.losses || 0) > 0)) {
      winrateList.push(p.rank.winrate);
    }
    if (p.championStats && typeof p.championStats.winrate === 'number' && (p.championStats.games || 0) > 0) {
      champWinrateList.push(p.championStats.winrate);
    }

    if (!p.rank || !p.rank.tier) continue;
    const tier = p.rank.tier.toUpperCase();
    if (tier === 'UNRANKED') continue;

    const base = TIER_BASE_LP[tier];
    if (base === undefined) continue;

    if (tier === 'MASTER' || tier === 'GRANDMASTER' || tier === 'CHALLENGER') {
      pointsList.push(base + (p.rank.leaguePoints || 0));
    } else {
      const div = (p.rank.rank || 'IV').toUpperCase();
      const divOffset = DIVISION_OFFSET_LP[div] ?? 0;
      pointsList.push(base + divOffset + (p.rank.leaguePoints || 0));
    }
  }

  const avgWinrate = winrateList.length > 0
    ? Math.round(winrateList.reduce((a, b) => a + b, 0) / winrateList.length)
    : null;

  const avgChampWinrate = champWinrateList.length > 0
    ? Math.round(champWinrateList.reduce((a, b) => a + b, 0) / champWinrateList.length)
    : null;

  if (pointsList.length === 0) {
    return null;
  }

  const avgPoints = Math.round(pointsList.reduce((a, b) => a + b, 0) / pointsList.length);

  if (avgPoints >= 3600) {
    const lp = avgPoints - 3600;
    return {
      tier: 'CHALLENGER',
      lp,
      formatted: `Challenger (${lp} LP)`,
      count: pointsList.length,
      totalPlayers: participants.length,
      avgWinrate,
      avgChampWinrate,
    };
  }
  if (avgPoints >= 3200) {
    const lp = avgPoints - 3200;
    return {
      tier: 'GRANDMASTER',
      lp,
      formatted: `Grandmaster (${lp} LP)`,
      count: pointsList.length,
      totalPlayers: participants.length,
      avgWinrate,
      avgChampWinrate,
    };
  }
  if (avgPoints >= 2800) {
    const lp = avgPoints - 2800;
    return {
      tier: 'MASTER',
      lp,
      formatted: `Master (${lp} LP)`,
      count: pointsList.length,
      totalPlayers: participants.length,
      avgWinrate,
      avgChampWinrate,
    };
  }

  const standardTiers = [
    { tier: 'DIAMOND', base: 2400 },
    { tier: 'EMERALD', base: 2000 },
    { tier: 'PLATINUM', base: 1600 },
    { tier: 'GOLD', base: 1200 },
    { tier: 'SILVER', base: 800 },
    { tier: 'BRONZE', base: 400 },
    { tier: 'IRON', base: 0 },
  ];

  for (const st of standardTiers) {
    if (avgPoints >= st.base) {
      const remainder = avgPoints - st.base;
      const divIndex = Math.min(3, Math.floor(remainder / 100));
      const divisions = ['IV', 'III', 'II', 'I'];
      const division = divisions[divIndex];
      const lp = remainder % 100;
      const formattedTier = st.tier.charAt(0) + st.tier.slice(1).toLowerCase();
      return {
        tier: st.tier,
        division,
        lp,
        formatted: `${formattedTier} ${division} (${lp} LP)`,
        count: pointsList.length,
        totalPlayers: participants.length,
        avgWinrate,
        avgChampWinrate,
      };
    }
  }

  return {
    tier: 'IRON',
    division: 'IV',
    lp: 0,
    formatted: 'Iron IV (0 LP)',
    count: pointsList.length,
    totalPlayers: participants.length,
    avgWinrate,
    avgChampWinrate,
  };
}
