import { SummonerRank } from '@/types';
import RankBadge, { TIER_COLORS } from './RankBadge';
import { getWinrateColor } from '@/lib/utils';

interface RankCardProps {
  title: string;
  rankData?: SummonerRank;
}

export default function RankCard({ title, rankData }: RankCardProps) {
  if (!rankData) {
    return (
      <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-black/40 p-4">
        <RankBadge tier="UNRANKED" size="lg" />
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {title}
          </span>
          <div className="text-base font-black text-slate-400 mt-0.5">Unranked</div>
          <div className="text-xs text-slate-500">Keine Spiele erfasst</div>
        </div>
      </div>
    );
  }

  const { tier, rank, leaguePoints, wins, losses, winrate } = rankData;
  const total = wins + losses;
  const theme = TIER_COLORS[tier.toUpperCase()] || TIER_COLORS.UNRANKED;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-black/40 p-4 shadow-md transition-all hover:border-white/20">
      <RankBadge tier={tier} size="lg" showGlow />

      <div className="flex-1 min-w-0">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        <div className="flex items-baseline gap-2 mt-0.5">
          <span className={`text-lg font-black tracking-tight ${theme.text}`}>
            {tier} {rank}
          </span>
          <span className="text-xs font-bold text-amber-300">
            {leaguePoints} LP
          </span>
        </div>

        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
          <span>{total} Spiele</span>
          <span>•</span>
          <span className="text-slate-300">
            {wins}S {losses}N
          </span>
          <span>•</span>
          <span className={getWinrateColor(winrate)}>{winrate}% WR</span>
        </div>
      </div>
    </div>
  );
}
