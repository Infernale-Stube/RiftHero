'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import {
  Sparkles,
  Trophy,
  Flame,
  Search,
  Filter,
  ArrowUpDown,
  Clock,
  Award,
} from 'lucide-react';
import { SummonerMasteriesResponse, ChampionMasteryItem } from '@/types';
import { getChampionIconUrl, getChampionSplashUrl } from '@/lib/ddragon';
import { formatTimeAgo } from '@/lib/utils';
import { useTranslation } from '@/i18n/LanguageContext';

interface MasteriesViewProps {
  masteriesData: SummonerMasteriesResponse | null;
  isLoading: boolean;
}

export default function MasteriesView({
  masteriesData,
  isLoading,
}: MasteriesViewProps) {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'points' | 'level' | 'recent' | 'name'>('points');
  const [minLevelFilter, setMinLevelFilter] = useState<number>(0);

  // Filter and sort masteries
  const filteredMasteries = useMemo(() => {
    if (!masteriesData?.masteries) return [];

    let list = [...masteriesData.masteries];

    // Filter by name
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((m) => m.championName.toLowerCase().includes(q));
    }

    // Filter by level
    if (minLevelFilter > 0) {
      list = list.filter((m) => m.championLevel >= minLevelFilter);
    }

    // Sort
    list.sort((a, b) => {
      if (sortBy === 'points') return b.championPoints - a.championPoints;
      if (sortBy === 'level') {
        if (b.championLevel !== a.championLevel) {
          return b.championLevel - a.championLevel;
        }
        return b.championPoints - a.championPoints;
      }
      if (sortBy === 'recent') return b.lastPlayTime - a.lastPlayTime;
      if (sortBy === 'name') return a.championName.localeCompare(b.championName);
      return 0;
    });

    return list;
  }, [masteriesData, searchQuery, sortBy, minLevelFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        {/* Loading Header Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl border border-white/[0.06] bg-[#0c1017]/80 animate-pulse"
            />
          ))}
        </div>
        {/* Loading Grid Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-44 rounded-2xl border border-white/[0.06] bg-[#0c1017]/80 animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!masteriesData || masteriesData.masteries.length === 0) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-12 text-center backdrop-blur-md">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] text-zinc-500 mb-4">
          <Trophy className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">
          {t('masteries.noResults')}
        </h3>
        <p className="text-xs text-zinc-400 max-w-md">
          {t('common.error')}
        </p>
      </div>
    );
  }

  const topChampion = masteriesData.masteries[0];

  return (
    <div className="flex flex-col gap-6">
      {/* Top Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Mastery Score */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1017] to-[#121824] p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {t('masteries.totalScore')}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <Trophy className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-white">
              {masteriesData.totalMasteryScore}
            </span>
            <span className="text-xs font-bold text-orange-400">Levels</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Kumulierter Gesamt-Mastery-Level aller Champions
          </p>
        </div>

        {/* Total Mastery Points */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1017] to-[#18111e] p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {t('masteries.totalPoints')}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Flame className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-amber-300">
              {(masteriesData.totalMasteryPoints / 1_000_000).toFixed(2)}M
            </span>
            <span className="text-xs font-semibold text-zinc-400">
              ({masteriesData.totalMasteryPoints.toLocaleString()})
            </span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Gesamtzahl erspielter Mastery-Punkte
          </p>
        </div>

        {/* Champions Count */}
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#0c1017] to-[#101c24] p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {t('masteries.championsPlayed')}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
              <Award className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black tracking-tight text-white">
              {masteriesData.masteryCount}
            </span>
            <span className="text-xs font-bold text-sky-400">/ 168+</span>
          </div>
          <p className="mt-1 text-[11px] text-zinc-500">
            Verschiedene Champions mit mindestens Rang 1
          </p>
        </div>
      </div>

      {/* Spotlight: Top Champion Card */}
      {topChampion && (
        <div className="relative overflow-hidden rounded-2xl border border-orange-500/30 bg-[#0c1017]/90 p-6 shadow-2xl backdrop-blur-md">
          {/* Champion Splash Backdrop */}
          <div className="absolute inset-y-0 right-0 w-full sm:w-2/3 pointer-events-none select-none overflow-hidden">
            <Image
              src={getChampionSplashUrl(topChampion.championName)}
              alt={topChampion.championName}
              fill
              className="object-cover object-[right_center] opacity-40 saturate-[1.4] contrast-125"
              priority
              unoptimized
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#0c1017] via-[#0c1017]/85 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c1017] via-transparent to-[#0c1017]/30" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {/* Avatar + Level Badge */}
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border-2 border-orange-500/50 shadow-xl">
                <Image
                  src={getChampionIconUrl(topChampion.championName)}
                  alt={topChampion.championName}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                  unoptimized
                />
                <div className="absolute bottom-0 right-0 rounded-tl-lg bg-black/90 border-t border-l border-amber-500/40 px-2 py-0.5 shadow-md">
                  <span className="text-[10px] font-black text-amber-300">
                    {topChampion.championLevel}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-orange-500/20 border border-orange-500/40 px-2 py-0.5 text-[10px] font-black uppercase text-orange-400">
                    #1 Main Champion
                  </span>
                  <span className="text-xs text-zinc-400">
                    Zuletzt gespielt: {formatTimeAgo(topChampion.lastPlayTime)}
                  </span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">
                  {topChampion.championName}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-sm">
                  <span className="font-extrabold text-amber-400">
                    {topChampion.championPoints.toLocaleString()} Punkte
                  </span>
                  {topChampion.championSeasonMilestone ? (
                    <span className="text-xs text-zinc-400">
                      Meilenstein: {topChampion.championSeasonMilestone}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-[#0c1017]/80 p-4 shadow-xl backdrop-blur-md">
        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('masteries.searchPlaceholder')}
            className="w-full rounded-xl border border-white/[0.08] bg-black/40 pl-9 pr-3 py-2 text-xs font-medium text-white placeholder-zinc-500 outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/20 transition-all"
          />
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Level Filter Pills */}
          <div className="flex items-center rounded-xl border border-white/[0.08] bg-black/40 p-1 text-[11px] font-bold">
            <button
              onClick={() => setMinLevelFilter(0)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                minLevelFilter === 0
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t('masteries.filterAll')}
            </button>
            <button
              onClick={() => setMinLevelFilter(7)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                minLevelFilter === 7
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t('masteries.filterLevel7')}
            </button>
            <button
              onClick={() => setMinLevelFilter(10)}
              className={`px-2.5 py-1 rounded-lg transition-colors ${
                minLevelFilter === 10
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {t('masteries.filterLevel10')}
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-black/40 px-3 py-1.5 text-xs font-semibold text-zinc-300">
            <ArrowUpDown className="h-3.5 w-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              <option value="points" className="bg-[#0c1017] text-white">
                {t('masteries.sortByPoints')}
              </option>
              <option value="level" className="bg-[#0c1017] text-white">
                {t('masteries.sortByLevel')}
              </option>
              <option value="recent" className="bg-[#0c1017] text-white">
                {t('masteries.sortByRecent')}
              </option>
              <option value="name" className="bg-[#0c1017] text-white">
                {t('masteries.sortByName')}
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Masteries Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {filteredMasteries.map((m) => {
          const isHighLevel = m.championLevel >= 10;
          const isMidLevel = m.championLevel >= 7 && m.championLevel < 10;

          // Points progress calculation
          const totalInLevel = m.championPointsSinceLastLevel + m.championPointsUntilNextLevel;
          const progressPercent =
            totalInLevel > 0
              ? Math.min(100, Math.round((m.championPointsSinceLastLevel / totalInLevel) * 100))
              : 100;

          return (
            <div
              key={m.championId}
              className={`group relative overflow-hidden rounded-2xl border transition-all duration-300 ${
                isHighLevel
                  ? 'border-amber-500/40 bg-[#0d1017] hover:border-amber-500/70 hover:shadow-lg hover:shadow-amber-500/10'
                  : isMidLevel
                  ? 'border-sky-500/30 bg-[#0c1017] hover:border-sky-500/60'
                  : 'border-white/[0.08] bg-[#0c1017] hover:border-white/20'
              }`}
            >
              {/* Splash Art Backdrop with Gradient */}
              <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                <Image
                  src={getChampionSplashUrl(m.championName)}
                  alt={m.championName}
                  fill
                  className="object-cover object-[center_25%] opacity-20 saturate-[1.4] contrast-125 filter group-hover:scale-105 transition-transform duration-500"
                  unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0c1017] via-[#0c1017]/90 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#0c1017] via-[#0c1017]/60 to-transparent" />
              </div>

              {/* Card Content */}
              <div className="relative z-10 flex flex-col p-4 justify-between h-full min-h-[170px]">
                {/* Header: Champion Avatar + Level + Name */}
                <div className="flex items-start gap-3">
                  {/* Champion Avatar */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-md">
                    <Image
                      src={getChampionIconUrl(m.championName)}
                      alt={m.championName}
                      width={56}
                      height={56}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                    {/* Level Badge in corner (without 'Level' prefix) */}
                    <div
                      className={`absolute bottom-0 right-0 rounded-tl-md px-1.5 py-0.5 text-[9px] font-black shadow-md border-t border-l ${
                        isHighLevel
                          ? 'bg-black/90 text-amber-400 border-amber-500/40'
                          : isMidLevel
                          ? 'bg-black/90 text-sky-400 border-sky-500/40'
                          : 'bg-black/90 text-zinc-300 border-white/20'
                      }`}
                    >
                      {m.championLevel}
                    </div>
                  </div>

                  {/* Champion Info */}
                  <div className="flex flex-col min-w-0">
                    <h4 className="text-base font-black text-white group-hover:text-orange-400 transition-colors truncate">
                      {m.championName}
                    </h4>
                    <span className="text-xs font-extrabold text-amber-400 mt-0.5">
                      {m.championPoints.toLocaleString()} pts
                    </span>
                    {m.lastPlayTime > 0 && (
                      <span className="text-[10px] text-zinc-500 mt-1 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(m.lastPlayTime)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Bar & Milestone */}
                <div className="mt-3 flex flex-col gap-1.5 pt-2 border-t border-white/[0.06]">
                  <div className="flex items-center justify-between text-[10px] font-semibold text-zinc-400">
                    <span>
                      {m.championPointsUntilNextLevel > 0
                        ? `Noch ${m.championPointsUntilNextLevel.toLocaleString()} pts`
                        : 'Level Up bereit!'}
                    </span>
                    <span className="font-bold text-zinc-300">{progressPercent}%</span>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHighLevel
                          ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                          : isMidLevel
                          ? 'bg-gradient-to-r from-sky-500 to-blue-400'
                          : 'bg-gradient-to-r from-orange-500 to-amber-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  {/* Season Milestone if present */}
                  {m.championSeasonMilestone !== undefined && m.championSeasonMilestone > 0 && (
                    <div className="flex items-center justify-between text-[9px] text-zinc-500 mt-0.5">
                      <span>Meilenstein: Stufe {m.championSeasonMilestone}</span>
                      {m.tokensEarned > 0 && (
                        <span className="text-amber-400 font-bold">
                          {m.tokensEarned} Tokens
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
