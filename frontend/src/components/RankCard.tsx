'use client';

import { SummonerRank, LpHistorySummary } from '@/types';
import RankBadge, { TIER_COLORS } from './RankBadge';
import { getWinrateColor } from '@/lib/utils';
import LpHistoryChart from './LpHistoryChart';

interface RankCardProps {
  title: string;
  rankData?: SummonerRank;
  lpHistory?: LpHistorySummary | null;
}

export default function RankCard({ title, rankData, lpHistory }: RankCardProps) {
  if (!rankData) {
    return (
      <div className="flex flex-col rounded-xl border border-white/[0.06] bg-[#0d1116] p-4 shadow-xl">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
          {title}
        </span>
        <div className="flex items-center gap-3">
          <RankBadge tier="UNRANKED" size="md" />
          <div>
            <div className="text-sm font-black text-zinc-400">Unranked</div>
            <div className="text-[11px] text-zinc-500">Keine Spiele erfasst</div>
          </div>
        </div>
      </div>
    );
  }

  const { tier, rank, leaguePoints, wins, losses, winrate } = rankData;
  const theme = TIER_COLORS[tier.toUpperCase()] || TIER_COLORS.UNRANKED;

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.06] bg-[#0d1116] p-4 shadow-xl">
      {/* Card Header (LoLDB Style) */}
      <div className="flex items-center justify-between pb-2 border-b border-white/[0.04] mb-3">
        <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
          {title}
        </span>
      </div>

      {/* Main Rank Details */}
      <div className="flex items-center gap-3.5">
        <RankBadge tier={tier} size="lg" showGlow />

        <div className="flex flex-col min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span className={`text-base font-black tracking-tight ${theme.text}`}>
              {tier} {rank}
            </span>
            <span className="text-zinc-500 font-bold">-</span>
            <span className="text-xs font-black text-sky-400">
              {leaguePoints} LP
            </span>
          </div>

          <div className="mt-0.5 flex items-center gap-1.5 text-xs">
            <span className="font-bold text-emerald-400">{wins}W</span>
            <span className="font-bold text-rose-400">{losses}L</span>
            <span className="text-zinc-400 font-semibold">({winrate}%)</span>
          </div>
        </div>
      </div>

      {/* LP History Graph (LoLDB signature) */}
      {lpHistory && <LpHistoryChart lpHistory={lpHistory} />}
    </div>
  );
}
