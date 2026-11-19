'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PlayedWithTeammate } from '@/types';
import { getProfileIconUrl, getChampionIconUrl } from '@/lib/ddragon';
import { useTranslation } from '@/i18n/LanguageContext';

interface PlayedWithWidgetProps {
  teammates: PlayedWithTeammate[];
  region: string;
}

export default function PlayedWithWidget({ teammates, region }: PlayedWithWidgetProps) {
  const { t } = useTranslation();

  if (!teammates || teammates.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.06] bg-[#0d1116] p-4 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-zinc-400 pb-2.5 border-b border-white/[0.06]">
        <span>{t('summoner.playedWithTitle')}</span>
        <div className="flex items-center gap-6">
          <span>{t('summoner.playedWithGames')}</span>
          <span className="w-9 text-right">{t('summoner.playedWithWinrate')}</span>
        </div>
      </div>

      {/* Teammates List - strictly name, avatar, games count and winrate without champion info */}
      <div className="divide-y divide-white/[0.04]">
        {teammates.map((item) => {
          const formattedTag = `${item.gameName}-${item.tagLine || region.toUpperCase()}`;
          const isGoodWinrate = item.winrate >= 50;

          // Resolve avatar: actual profile icon if available, else standard fallback
          const avatarUrl =
            item.profileIconId && item.profileIconId > 0 && item.profileIconId !== 29
              ? getProfileIconUrl(item.profileIconId)
              : item.championName
              ? getChampionIconUrl(item.championName)
              : getProfileIconUrl(item.profileIconId || 29);

          return (
            <div
              key={item.puuid || item.gameName}
              className="flex items-center justify-between py-2.5 text-xs hover:bg-white/[0.02] transition-colors -mx-1 px-1 rounded-lg"
            >
              {/* Player Avatar & Name */}
              <Link
                href={`/summoner/${region}/${encodeURIComponent(formattedTag)}`}
                className="flex items-center gap-2.5 min-w-0 group"
              >
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full border border-white/10 group-hover:border-white/30 transition-colors shadow-sm">
                  <Image
                    src={avatarUrl}
                    alt={item.gameName}
                    width={28}
                    height={28}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="truncate font-bold text-zinc-300 group-hover:text-white transition-colors">
                    {item.gameName}
                  </span>
                </div>
              </Link>

              {/* Games & Winrate */}
              <div className="flex items-center gap-6 shrink-0">
                <span className="text-zinc-400 font-semibold">{item.games}</span>
                <span
                  className={`w-9 text-right font-bold ${
                    isGoodWinrate ? 'text-emerald-400' : 'text-zinc-400'
                  }`}
                >
                  {item.winrate}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
