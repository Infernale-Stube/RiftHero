'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, Trophy, Swords, Zap, Shield, Coins } from 'lucide-react';
import { ChampionStatSummary } from '@/types';
import { useTranslation } from '@/i18n/LanguageContext';
import { getChampionIconUrl } from '@/lib/ddragon';

interface ChampionStatsViewProps {
  stats: ChampionStatSummary[];
  activeQueue: string;
  onQueueChange: (queue: string) => void;
  isLoading?: boolean;
}

type SortField = 'games' | 'winrate' | 'kda' | 'cs' | 'damage' | 'gold';
type SortOrder = 'desc' | 'asc';

export default function ChampionStatsView({
  stats,
  activeQueue,
  onQueueChange,
  isLoading = false,
}: ChampionStatsViewProps) {
  const { t, locale } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('games');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const queueOptions = [
    { id: 'all', label: locale === 'de' ? 'Alle Queues' : 'All Queues' },
    { id: '420', label: 'Ranked Solo/Duo' },
    { id: '440', label: 'Ranked Flex' },
    { id: '710', label: 'Ranked 5s' },
    { id: '450', label: 'ARAM' },
    { id: '400', label: 'Normal Draft' },
    { id: '1700', label: 'Arena' },
  ];

  // Filter & Sort
  const filteredAndSortedStats = useMemo(() => {
    let result = [...stats];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((s) => s.championName.toLowerCase().includes(q));
    }

    // Sort
    result.sort((a, b) => {
      let valA = 0;
      let valB = 0;

      switch (sortField) {
        case 'games':
          valA = a.games;
          valB = b.games;
          break;
        case 'winrate':
          valA = a.winrate;
          valB = b.winrate;
          break;
        case 'kda':
          valA = a.kda;
          valB = b.kda;
          break;
        case 'cs':
          valA = a.avgCsPerMin;
          valB = b.avgCsPerMin;
          break;
        case 'damage':
          valA = a.avgDamage || 0;
          valB = b.avgDamage || 0;
          break;
        case 'gold':
          valA = a.avgGold || 0;
          valB = b.avgGold || 0;
          break;
      }

      if (sortOrder === 'desc') {
        return valB - valA;
      }
      return valA - valB;
    });

    return result;
  }, [stats, searchQuery, sortField, sortOrder]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Aggregated totals
  const totalGames = stats.reduce((acc, s) => acc + s.games, 0);
  const totalWins = stats.reduce((acc, s) => acc + s.wins, 0);
  const totalLosses = stats.reduce((acc, s) => acc + s.losses, 0);
  const overallWinrate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const mostPlayed = stats.length > 0 ? stats[0] : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Champions Played */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1116] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>{t('champions.championsPlayed')}</span>
            <Trophy className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{stats.length}</div>
          <div className="text-[11px] text-zinc-500 mt-1">{t('champions.championsPlayedSubtitle')}</div>
        </div>

        {/* Total Games & W/L */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1116] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>{t('champions.totalGames')}</span>
            <Swords className="h-4 w-4 text-sky-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{totalGames}</div>
          <div className="text-[11px] text-zinc-400 mt-1">
            <span className="text-emerald-400 font-semibold">{totalWins}W</span>{' '}
            <span className="text-rose-400 font-semibold">{totalLosses}L</span>
          </div>
        </div>

        {/* Overall Winrate */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1116] p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between text-zinc-400 text-xs">
            <span>{t('champions.overallWinrate')}</span>
            <Zap className="h-4 w-4 text-emerald-400" />
          </div>
          <div className={`mt-2 text-2xl font-black ${overallWinrate >= 55 ? 'text-emerald-400' : overallWinrate >= 50 ? 'text-amber-400' : 'text-zinc-200'}`}>
            {overallWinrate}%
          </div>
          {/* Winrate progress mini bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-rose-500/30">
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${overallWinrate}%` }}
            />
          </div>
        </div>

        {/* Most Played Champion */}
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1116] p-4 flex items-center gap-3">
          {mostPlayed ? (
            <>
              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10">
                <Image
                  src={getChampionIconUrl(mostPlayed.championName)}
                  alt={mostPlayed.championName}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 font-semibold">
                  {t('champions.mostPlayed')}
                </div>
                <div className="text-sm font-black text-white truncate">
                  {mostPlayed.championName}
                </div>
                <div className="text-xs text-zinc-400">
                  {mostPlayed.games} {locale === 'de' ? 'Spiele' : 'Games'} · <span className="text-emerald-400 font-bold">{mostPlayed.winrate}%</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-zinc-500">{locale === 'de' ? 'Keine Daten verfügbar' : 'No data available'}</div>
          )}
        </div>
      </div>

      {/* Toolbar: Queues & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0d1116] p-3">
        {/* Queue filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {queueOptions.map((q) => (
            <button
              key={q.id}
              onClick={() => onQueueChange(q.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                activeQueue === q.id
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200 border border-transparent'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            placeholder={t('champions.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-white/[0.08] bg-[#060809] py-1.5 pl-9 pr-3 text-xs text-white placeholder-zinc-500 focus:border-amber-500/50 focus:outline-none"
          />
        </div>
      </div>

      {/* Champions Table */}
      <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#0d1116] shadow-xl">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02] text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <th className="py-3 pl-4 pr-2 w-10 text-center">#</th>
              <th className="py-3 px-3">{t('champions.colChampion')}</th>
              <th
                onClick={() => handleSort('games')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
              >
                {t('champions.colPlayed')} {sortField === 'games' && (sortOrder === 'desc' ? '▼' : '▲')}
              </th>
              <th
                onClick={() => handleSort('winrate')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
              >
                {t('champions.colWinrate')} {sortField === 'winrate' && (sortOrder === 'desc' ? '▼' : '▲')}
              </th>
              <th
                onClick={() => handleSort('kda')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
              >
                {t('champions.colKda')} {sortField === 'kda' && (sortOrder === 'desc' ? '▼' : '▲')}
              </th>
              <th
                onClick={() => handleSort('cs')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
              >
                {t('champions.colCs')} {sortField === 'cs' && (sortOrder === 'desc' ? '▼' : '▲')}
              </th>
              <th
                onClick={() => handleSort('damage')}
                className="py-3 px-3 cursor-pointer hover:text-white transition-colors"
              >
                {t('champions.colDamage')} {sortField === 'damage' && (sortOrder === 'desc' ? '▼' : '▲')}
              </th>
              <th
                onClick={() => handleSort('gold')}
                className="py-3 pr-4 pl-3 cursor-pointer hover:text-white transition-colors"
              >
                {t('champions.colGold')} {sortField === 'gold' && (sortOrder === 'desc' ? '▼' : '▲')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  <div className="flex items-center justify-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
                    <span>{t('champions.loading')}</span>
                  </div>
                </td>
              </tr>
            ) : filteredAndSortedStats.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-zinc-500">
                  {t('champions.noChampions')}
                </td>
              </tr>
            ) : (
              filteredAndSortedStats.map((champ, index) => {
                const kdaColor =
                  champ.kda >= 4.0
                    ? 'text-emerald-400'
                    : champ.kda >= 3.0
                    ? 'text-sky-400'
                    : champ.kda >= 2.0
                    ? 'text-amber-400'
                    : 'text-zinc-400';

                return (
                  <tr
                    key={champ.championId}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    {/* Index */}
                    <td className="py-3 pl-4 pr-2 text-center text-xs font-bold text-zinc-500">
                      {index + 1}
                    </td>

                    {/* Champion Avatar & Name */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-[#060809]">
                          <Image
                            src={getChampionIconUrl(champ.championName)}
                            alt={champ.championName}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {champ.championName}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Games & W/L */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{champ.games} Spiele</div>
                      <div className="text-[11px] text-zinc-500">
                        <span className="text-emerald-400 font-semibold">{champ.wins}W</span>{' '}
                        <span className="text-rose-400 font-semibold">{champ.losses}L</span>
                      </div>
                    </td>

                    {/* Winrate Bar & Percent */}
                    <td className="py-3 px-3 min-w-[120px]">
                      <div className="flex items-center justify-between mb-1">
                        <span
                          className={`font-black ${
                            champ.winrate >= 60
                              ? 'text-emerald-400'
                              : champ.winrate >= 50
                              ? 'text-white'
                              : 'text-rose-400'
                          }`}
                        >
                          {champ.winrate}%
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-rose-500/30">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${champ.winrate}%` }}
                        />
                      </div>
                    </td>

                    {/* KDA */}
                    <td className="py-3 px-3">
                      <div className={`font-black text-sm ${kdaColor}`}>
                        {champ.kda.toFixed(2)}:1
                      </div>
                      <div className="text-[11px] text-zinc-400">
                        {champ.kills} / <span className="text-rose-400 font-semibold">{champ.deaths}</span> / {champ.assists}
                      </div>
                    </td>

                    {/* CS */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-white">{champ.avgCs} CS</div>
                      <div className="text-[11px] text-zinc-400">
                        {champ.avgCsPerMin} / Min
                      </div>
                    </td>

                    {/* Damage */}
                    <td className="py-3 px-3">
                      <div className="font-bold text-amber-400">
                        {(champ.avgDamage || 0).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Erhalten: {(champ.avgDamageTaken || 0).toLocaleString()}
                      </div>
                    </td>

                    {/* Gold */}
                    <td className="py-3 pr-4 pl-3">
                      <div className="font-bold text-amber-300">
                        {((champ.avgGold || 0) / 1000).toFixed(1)}k
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        Vision: {champ.avgVisionScore || 0}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
