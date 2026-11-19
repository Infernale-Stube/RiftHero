'use client';

import Image from 'next/image';
import { Award } from 'lucide-react';
import { ChampionStatSummary } from '@/types';
import { getChampionIconUrl } from '@/lib/ddragon';
import { getKdaColor, getWinrateColor } from '@/lib/utils';
import { useTranslation } from '@/i18n/LanguageContext';

interface ChampionStatsProps {
  stats: ChampionStatSummary[];
}

export default function ChampionStats({ stats }: ChampionStatsProps) {
  const { t } = useTranslation();

  if (!stats || stats.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-[#0d1116] p-5 text-center shadow-xl">
        <Award className="mx-auto h-6 w-6 text-zinc-600 mb-1.5" />
        <p className="text-xs text-zinc-400">{t('champions.noChampions')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.06] bg-[#0d1116] p-4 shadow-xl">
      <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-white/[0.06]">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
          {t('champions.mostPlayedTitle')}
        </h3>
        <span className="text-[10px] text-zinc-500 font-semibold">
          {t('champions.champCount', { count: stats.length })}
        </span>
      </div>

      <div className="flex flex-col divide-y divide-white/[0.04]">
        {stats.slice(0, 6).map((c) => (
          <div key={c.championId} className="flex items-center justify-between py-2 group">
            {/* Champion Icon + Name */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10 group-hover:border-white/30 transition-colors">
                <Image
                  src={getChampionIconUrl(c.championName)}
                  alt={c.championName}
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="truncate text-xs font-bold text-zinc-200 group-hover:text-white transition-colors">
                  {c.championName}
                </span>
                <span className="text-[10px] text-zinc-500">
                  CS {c.avgCs} ({c.avgCsPerMin}/m)
                </span>
              </div>
            </div>

            {/* KDA & Winrate */}
            <div className="flex items-center gap-3 shrink-0 text-right">
              <div className="flex flex-col">
                <span className={`text-xs ${getKdaColor(c.kda)}`}>
                  {c.kda}:1 KDA
                </span>
                <span className="text-[9px] text-zinc-500">
                  {c.kills} / {c.deaths} / {c.assists}
                </span>
              </div>

              <div className="flex flex-col min-w-[48px] items-end">
                <span className={`text-xs ${getWinrateColor(c.winrate)}`}>
                  {c.winrate}%
                </span>
                <span className="text-[9px] text-zinc-500 font-semibold">
                  {t('champions.gamesLabel', { count: c.games })}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
