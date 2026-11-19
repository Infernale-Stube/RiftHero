import Image from 'next/image';
import { Award } from 'lucide-react';
import { ChampionStatSummary } from '@/types';
import { getChampionIconUrl } from '@/lib/ddragon';
import { getKdaColor, getWinrateColor } from '@/lib/utils';

interface ChampionStatsProps {
  stats: ChampionStatSummary[];
}

export default function ChampionStats({ stats }: ChampionStatsProps) {
  if (!stats || stats.length === 0) {
    return (
      <div className="rounded-xl border border-rift-700/60 bg-rift-900/60 p-5 text-center">
        <Award className="mx-auto h-6 w-6 text-slate-600 mb-1.5" />
        <p className="text-xs text-slate-400">Keine Champion-Statistiken für diesen Filter verfügbar.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-rift-700/80 bg-rift-900/80 p-4 shadow-md">
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-rift-700/60">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Meistgespielte Champions
        </h3>
        <span className="text-[11px] text-slate-500 font-medium">{stats.length} Champions</span>
      </div>

      <div className="flex flex-col divide-y divide-rift-700/40">
        {stats.slice(0, 7).map((c) => (
          <div key={c.championId} className="flex items-center justify-between py-2.5 group">
            {/* Champion Icon + Name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-rift-600 group-hover:border-hextech-lightGold transition-colors">
                <Image
                  src={getChampionIconUrl(c.championName)}
                  alt={c.championName}
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-bold text-slate-200 group-hover:text-white transition-colors">
                  {c.championName}
                </span>
                <span className="text-[10px] text-slate-400">
                  CS {c.avgCs} ({c.avgCsPerMin}/m)
                </span>
              </div>
            </div>

            {/* KDA & Winrate */}
            <div className="flex items-center gap-4 shrink-0 text-right">
              <div className="flex flex-col">
                <span className={`text-xs ${getKdaColor(c.kda)}`}>
                  {c.kda}:1 KDA
                </span>
                <span className="text-[10px] text-slate-400">
                  {c.kills} / {c.deaths} / {c.assists}
                </span>
              </div>

              <div className="flex flex-col min-w-[54px] items-end">
                <span className={`text-xs ${getWinrateColor(c.winrate)}`}>
                  {c.winrate}%
                </span>
                <span className="text-[10px] text-slate-400">
                  {c.games} {c.games === 1 ? 'Spiel' : 'Spiele'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
