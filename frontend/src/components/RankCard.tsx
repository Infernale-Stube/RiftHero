'use client';

import React, { useState } from 'react';
import { SummonerRank, LpHistorySummary } from '@/types';
import RankBadge, { TIER_COLORS } from './RankBadge';
import LpHistoryChart from './LpHistoryChart';
import { useTranslation } from '@/i18n/LanguageContext';

export type RankMode = 'solo' | 'flex' | '5s';

interface RankCardProps {
  // Multi-mode toggle support
  soloRank?: SummonerRank;
  flexRank?: SummonerRank;
  ranked5s?: SummonerRank;
  lpHistory?: LpHistorySummary | null;
  // Legacy single-mode props
  title?: string;
  rankData?: SummonerRank;
}

export default function RankCard({
  soloRank,
  flexRank,
  ranked5s,
  lpHistory,
  title,
  rankData,
}: RankCardProps) {
  const { t } = useTranslation();
  const [activeMode, setActiveMode] = useState<RankMode>('solo');

  const isMultiMode = soloRank !== undefined || flexRank !== undefined || ranked5s !== undefined;

  const modes: { id: RankMode; label: string }[] = [
    { id: 'solo', label: t('summoner.soloRank') || 'Solo/Duo' },
    { id: 'flex', label: t('summoner.flexRank') || 'Flex' },
    { id: '5s', label: t('summoner.ranked5sRank') || '5s' },
  ];

  const currentRank = isMultiMode
    ? activeMode === 'solo'
      ? soloRank
      : activeMode === 'flex'
      ? flexRank
      : ranked5s
    : rankData;

  const currentTier = currentRank?.tier?.toUpperCase() || 'UNRANKED';
  const theme = TIER_COLORS[currentTier] || TIER_COLORS.UNRANKED;

  return (
    <div className="flex flex-col rounded-xl border border-white/[0.06] bg-[#0d1116] p-4 shadow-xl">
      {/* If Multi-Mode: Show Segmented Toggle between Ranked Solo, Flex, and 5s as Pills */}
      {isMultiMode ? (
        <div className="flex items-center gap-1.5 sm:gap-2 mb-3.5">
          {modes.map((mode) => {
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setActiveMode(mode.id)}
                className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-xl transition-all text-center cursor-pointer select-none active:scale-95 ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35 shadow-[0_0_12px_rgba(245,158,11,0.18)]'
                    : 'bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200 border border-white/[0.06]'
                }`}
              >
                {mode.label}
              </button>
            );
          })}
        </div>
      ) : (
        /* Legacy Card Header */
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.04] mb-3">
          <span className="text-[11px] font-black uppercase tracking-wider text-zinc-400">
            {title}
          </span>
        </div>
      )}

      {/* Main Rank Details */}
      {!currentRank ? (
        <div className="flex items-center gap-3.5 py-1">
          <RankBadge tier="UNRANKED" size="md" />
          <div>
            <div className="text-sm font-black text-zinc-400">{t('summoner.unranked')}</div>
            <div className="text-[11px] text-zinc-500">{t('summoner.noGamesRecorded')}</div>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3.5">
          <RankBadge tier={currentRank.tier} size="lg" showGlow />

          <div className="flex flex-col min-w-0">
            <div className="flex items-baseline gap-1.5">
              <span className={`text-base font-black tracking-tight ${theme.text}`}>
                {currentRank.tier} {currentRank.rank}
              </span>
              <span className="text-zinc-500 font-bold">-</span>
              <span className="text-xs font-black text-amber-400">
                {currentRank.leaguePoints} LP
              </span>
            </div>

            <div className="mt-0.5 flex items-center gap-1.5 text-xs">
              <span className="font-bold text-emerald-400">{currentRank.wins}W</span>
              <span className="font-bold text-rose-400">{currentRank.losses}L</span>
              <span className={`font-bold ${
                currentRank.winrate > 50
                  ? 'text-emerald-400'
                  : currentRank.winrate < 50
                  ? 'text-rose-400'
                  : 'text-zinc-400'
              }`}>
                ({currentRank.winrate}%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* LP History Graph - Only shown for Solo mode when recorded history (>= 2 points) exists */}
      {(!isMultiMode || activeMode === 'solo') &&
        lpHistory &&
        lpHistory.points &&
        lpHistory.points.length >= 2 && (
          <LpHistoryChart lpHistory={lpHistory} />
        )}
    </div>
  );
}
