'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Trophy,
  Flame,
  Shield,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sparkles,
  BarChart3,
  Layers,
  Percent,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  getPositionIconUrl,
  getChampionIconUrl,
  getPreviousDDragonPatch,
  PositionKey,
} from '@/lib/ddragon';
import { fetchTierList, TierListChampionItem, TierListResponse } from '@/lib/api';

type RoleFilter = 'ALL' | PositionKey;
type SortField = 'rank' | 'name' | 'tier' | 'winrate' | 'pickrate' | 'banrate' | 'games' | 'score';

const ROLES: Array<{ key: RoleFilter; label: string; iconKey?: PositionKey }> = [
  { key: 'ALL', label: 'All Roles' },
  { key: 'TOP', label: 'Top', iconKey: 'TOP' },
  { key: 'JUNGLE', label: 'Jungle', iconKey: 'JUNGLE' },
  { key: 'MID', label: 'Mid', iconKey: 'MID' },
  { key: 'ADC', label: 'ADC', iconKey: 'ADC' },
  { key: 'SUPPORT', label: 'Support', iconKey: 'SUPPORT' },
];

const TIER_ORDER: Record<string, number> = {
  'S+': 1,
  'S': 2,
  'A': 3,
  'B': 4,
  'C': 5,
  'D': 6,
};

export default function TierListView() {
  const { t, locale } = useTranslation();
  const [activeRole, setActiveRole] = useState<RoleFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [tierData, setTierData] = useState<TierListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchTierList(activeRole === 'ALL' ? undefined : activeRole)
      .then((data) => {
        setTierData(data);
      })
      .catch((err) => {
        console.error('Failed to load tier list data:', err);
        setTierData(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [activeRole]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      // Default order: asc for rank, desc for rates/scores
      setSortOrder(field === 'rank' || field === 'name' ? 'asc' : 'desc');
    }
  };

  const rawChampions = tierData?.champions || [];

  // Filtered & sorted champions
  const champions = useMemo(() => {
    let result = [...rawChampions];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.role.toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'rank':
          comparison = a.rank - b.rank;
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'tier':
          comparison = (TIER_ORDER[a.tier] || 99) - (TIER_ORDER[b.tier] || 99);
          break;
        case 'winrate':
          comparison = a.winrateNum - b.winrateNum;
          break;
        case 'pickrate':
          comparison = a.pickrateNum - b.pickrateNum;
          break;
        case 'banrate':
          comparison = a.banrateNum - b.banrateNum;
          break;
        case 'games':
          comparison = a.games - b.games;
          break;
        case 'score':
          comparison = a.score - b.score;
          break;
        default:
          comparison = a.rank - b.rank;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [rawChampions, searchQuery, sortField, sortOrder]);

  // Stat Highlights
  const highlights = useMemo(() => {
    if (!rawChampions.length) return null;

    // Highest winrate with at least some games or overall
    const highestWinrate = [...rawChampions].sort((a, b) => b.winrateNum - a.winrateNum)[0];
    const highestPickrate = [...rawChampions].sort((a, b) => b.pickrateNum - a.pickrateNum)[0];
    const highestBanrate = [...rawChampions].sort((a, b) => b.banrateNum - a.banrateNum)[0];

    return {
      highestWinrate,
      highestPickrate,
      highestBanrate,
    };
  }, [rawChampions]);

  const patchVersion = tierData?.patch || getPreviousDDragonPatch();
  const totalMatches = tierData?.totalMatches ?? 0;

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-4 py-8 sm:px-6 lg:px-8">
      {/* Top Banner / Hero */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 uppercase tracking-wider mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Patch {patchVersion} Meta Analysis</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {t('tierList.pageTitle', { patch: patchVersion })}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-2xl">
            {t('tierList.pageSubtitle') ||
              "Top tier champion picks on Summoner's Rift ranked by winrate, pickrate, and impact."}
          </p>
        </div>

        {/* Total Analyzed Matches Counter */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 px-4 py-3 shrink-0 shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {t('tierList.totalAnalyzed')}
            </span>
            <span className="text-lg font-black text-white">
              {isLoading ? '...' : totalMatches > 0 ? totalMatches.toLocaleString() : '0'}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Highlight Cards */}
      {highlights && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Top Winrate */}
          <div className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/20 to-[#0c1017] p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="h-4 w-4" />
                {t('tierList.topWinrate')}
              </span>
              <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-xs font-black text-emerald-300">
                {highlights.highestWinrate.winrate}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-emerald-500/30 shrink-0">
                <Image
                  src={getChampionIconUrl(highlights.highestWinrate.name)}
                  alt={highlights.highestWinrate.name}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base text-white truncate">
                  {highlights.highestWinrate.name}
                </span>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Image
                    src={getPositionIconUrl(highlights.highestWinrate.role as PositionKey)}
                    alt={highlights.highestWinrate.role}
                    width={13}
                    height={13}
                    className="opacity-70"
                    unoptimized
                  />
                  <span>{highlights.highestWinrate.role}</span>
                  <span className="text-zinc-600">•</span>
                  <span>{highlights.highestWinrate.games} Matches</span>
                </span>
              </div>
            </div>
          </div>

          {/* Most Picked */}
          <div className="relative overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-br from-sky-950/20 to-[#0c1017] p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="h-4 w-4" />
                {t('tierList.mostPicked')}
              </span>
              <span className="rounded-md bg-sky-500/20 border border-sky-500/30 px-2 py-0.5 text-xs font-black text-sky-300">
                {highlights.highestPickrate.pickrate}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-sky-500/30 shrink-0">
                <Image
                  src={getChampionIconUrl(highlights.highestPickrate.name)}
                  alt={highlights.highestPickrate.name}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base text-white truncate">
                  {highlights.highestPickrate.name}
                </span>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Image
                    src={getPositionIconUrl(highlights.highestPickrate.role as PositionKey)}
                    alt={highlights.highestPickrate.role}
                    width={13}
                    height={13}
                    className="opacity-70"
                    unoptimized
                  />
                  <span>{highlights.highestPickrate.role}</span>
                  <span className="text-zinc-600">•</span>
                  <span>Winrate: {highlights.highestPickrate.winrate}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Most Banned */}
          <div className="relative overflow-hidden rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-950/20 to-[#0c1017] p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="h-4 w-4" />
                {t('tierList.mostBanned')}
              </span>
              <span className="rounded-md bg-rose-500/20 border border-rose-500/30 px-2 py-0.5 text-xs font-black text-rose-300">
                {highlights.highestBanrate.banrate}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="relative h-12 w-12 rounded-xl overflow-hidden border border-rose-500/30 shrink-0">
                <Image
                  src={getChampionIconUrl(highlights.highestBanrate.name)}
                  alt={highlights.highestBanrate.name}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-base text-white truncate">
                  {highlights.highestBanrate.name}
                </span>
                <span className="text-xs text-zinc-400 flex items-center gap-1">
                  <Image
                    src={getPositionIconUrl(highlights.highestBanrate.role as PositionKey)}
                    alt={highlights.highestBanrate.role}
                    width={13}
                    height={13}
                    className="opacity-70"
                    unoptimized
                  />
                  <span>{highlights.highestBanrate.role}</span>
                  <span className="text-zinc-600">•</span>
                  <span>{highlights.highestBanrate.games} Matches</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Control Bar: Role Tabs + Search */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6">
        {/* Role Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-1.5 shadow-md">
          {ROLES.map((r) => {
            const isActive = activeRole === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setActiveRole(r.key)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                {r.iconKey ? (
                  <Image
                    src={getPositionIconUrl(r.iconKey)}
                    alt={r.label}
                    width={16}
                    height={16}
                    className={`object-contain ${isActive ? 'opacity-100' : 'opacity-60'}`}
                    unoptimized
                  />
                ) : (
                  <Layers className="h-4 w-4 opacity-70" />
                )}
                <span>{r.key === 'ALL' ? t('tierList.allRoles') || 'All Roles' : r.label}</span>
              </button>
            );
          })}
        </div>

        {/* Champion Search Input */}
        <div className="relative min-w-[240px] md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('tierList.searchPlaceholder') || 'Search champion...'}
            className="w-full rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 pl-10 pr-4 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 shadow-md transition-all"
          />
        </div>
      </div>

      {/* Main Tier List Table */}
      <div className="overflow-x-auto rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 shadow-2xl">
        <table className="w-full text-left text-sm text-zinc-300">
          <thead className="bg-[#101724]/90 text-[11px] font-bold uppercase tracking-wider text-zinc-400 border-b border-white/[0.06]">
            <tr>
              <th
                onClick={() => handleSort('rank')}
                className="py-3.5 pl-6 pr-3 cursor-pointer hover:text-white transition-colors select-none w-16"
              >
                <div className="flex items-center gap-1">
                  <span>{t('tierList.colRank')}</span>
                  {sortField === 'rank' && (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('name')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>{t('tierList.colChampion')}</span>
                  {sortField === 'name' && (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                  )}
                </div>
              </th>
              <th className="py-3.5 px-4 select-none">
                <span>{t('tierList.colRole')}</span>
              </th>
              <th
                onClick={() => handleSort('tier')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>{t('tierList.colTier')}</span>
                  {sortField === 'tier' && (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('winrate')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>{t('tierList.colWinrate')}</span>
                  {sortField === 'winrate' && (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('pickrate')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>{t('tierList.colPickrate')}</span>
                  {sortField === 'pickrate' && (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('banrate')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>{t('tierList.colBanrate')}</span>
                  {sortField === 'banrate' && (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('games')}
                className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors select-none"
              >
                <div className="flex items-center gap-1">
                  <span>{t('tierList.colMatches')}</span>
                  {sortField === 'games' && (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                  )}
                </div>
              </th>
              <th
                onClick={() => handleSort('score')}
                className="py-3.5 pr-6 pl-4 cursor-pointer hover:text-white transition-colors select-none text-right"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>{t('tierList.colScore')}</span>
                  {sortField === 'score' && (
                    sortOrder === 'asc' ? <ArrowUp className="h-3 w-3 text-amber-400" /> : <ArrowDown className="h-3 w-3 text-amber-400" />
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {isLoading ? (
              // Loading Skeleton Rows
              [...Array(8)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 pl-6 pr-3"><div className="h-4 w-6 bg-white/5 rounded" /></td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-white/5 rounded-xl" />
                      <div className="h-4 w-28 bg-white/5 rounded" />
                    </div>
                  </td>
                  <td className="py-4 px-4"><div className="h-4 w-14 bg-white/5 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-6 w-8 bg-white/5 rounded-md" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-16 bg-white/5 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-14 bg-white/5 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-14 bg-white/5 rounded" /></td>
                  <td className="py-4 px-4"><div className="h-4 w-16 bg-white/5 rounded" /></td>
                  <td className="py-4 pr-6 pl-4 text-right"><div className="h-6 w-12 bg-white/5 rounded-md ml-auto" /></td>
                </tr>
              ))
            ) : champions.length > 0 ? (
              champions.map((champ, idx) => {
                const isOver50 = champ.winrateNum >= 50.0;
                return (
                  <tr
                    key={`${champ.name}-${champ.role}-${idx}`}
                    className="hover:bg-white/[0.03] transition-colors group"
                  >
                    {/* Rank */}
                    <td className="py-3.5 pl-6 pr-3 font-mono font-bold text-xs text-zinc-400">
                      {champ.rank}
                    </td>

                    {/* Champion Avatar & Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 rounded-xl overflow-hidden border border-white/10 group-hover:border-amber-500/40 transition-colors shrink-0 shadow-md">
                          <Image
                            src={getChampionIconUrl(champ.name)}
                            alt={champ.name}
                            width={40}
                            height={40}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </div>
                        <span className="font-extrabold text-sm text-white group-hover:text-amber-300 transition-colors">
                          {champ.name}
                        </span>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">
                      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-300 bg-black/30 rounded-lg px-2.5 py-1 border border-white/[0.04]">
                        <Image
                          src={getPositionIconUrl(champ.role as PositionKey)}
                          alt={champ.role}
                          width={14}
                          height={14}
                          className="opacity-80"
                          unoptimized
                        />
                        <span>{champ.role}</span>
                      </div>
                    </td>

                    {/* Tier Badge */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center justify-center rounded-md px-2 py-0.5 text-xs font-black uppercase shadow-sm ${
                          champ.tier === 'S+'
                            ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-black shadow-amber-500/20'
                            : champ.tier === 'S'
                            ? 'bg-gradient-to-r from-sky-400 to-blue-500 text-black shadow-sky-500/20'
                            : champ.tier === 'A'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : champ.tier === 'B'
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            : champ.tier === 'C'
                            ? 'bg-zinc-700/50 text-zinc-300 border border-zinc-600/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {champ.tier}
                      </span>
                    </td>

                    {/* Winrate with Visual Mini Bar */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col gap-1 w-24">
                        <span
                          className={`text-xs font-extrabold ${
                            isOver50 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {champ.winrate}
                        </span>
                        <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isOver50
                                ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                : 'bg-gradient-to-r from-rose-500 to-rose-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, champ.winrateNum))}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Pickrate */}
                    <td className="py-3.5 px-4 font-semibold text-xs text-sky-400">
                      {champ.pickrate}
                    </td>

                    {/* Banrate */}
                    <td className="py-3.5 px-4 font-semibold text-xs text-rose-400">
                      {champ.banrate || '—'}
                    </td>

                    {/* Matches */}
                    <td className="py-3.5 px-4 font-medium text-xs text-zinc-300">
                      {champ.games ? champ.games.toLocaleString() : '—'}
                    </td>

                    {/* Score / Rating */}
                    <td className="py-3.5 pr-6 pl-4 text-right">
                      <span className="inline-flex items-center justify-center rounded-lg bg-black/40 border border-white/[0.06] px-2.5 py-1 font-mono text-xs font-extrabold text-amber-400">
                        {champ.score ? champ.score.toFixed(1) : '—'}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              // Empty State
              <tr>
                <td colSpan={9} className="py-16 text-center text-zinc-500">
                  <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                    <Shield className="h-10 w-10 text-zinc-600 mb-3 opacity-40" />
                    <p className="text-base font-bold text-zinc-300 mb-1">
                      {searchQuery
                        ? t('tierList.noResults') || 'Keine Champions gefunden'
                        : 'Noch keine Match-Daten für diese Rolle verfügbar.'}
                    </p>
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      {searchQuery
                        ? 'Versuche einen anderen Suchbegriff oder setze den Rollenfilter zurück.'
                        : 'RiftHero aggregiert Statistiken dynamisch aus realen Ranglistenspielen. Suche nach Beschwörern oder analysiere Matches, um die Tier List zu erweitern.'}
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
