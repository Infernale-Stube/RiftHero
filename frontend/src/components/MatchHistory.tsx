'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import {
  Swords,
  Loader2,
  ChevronDown,
  Layers,
  Compass,
  Trophy,
  Check,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { FormattedMatch, GameQueue, ChampionStatSummary } from '@/types';
import MatchCard from './MatchCard';
import { useTranslation } from '@/i18n/LanguageContext';
import { fetchGameQueues } from '@/lib/api';
import { getChampionIconUrl, getPositionIconUrl, PositionKey } from '@/lib/ddragon';

interface MatchHistoryProps {
  matches: FormattedMatch[];
  region: string;
  activeQueue: string;
  onQueueChange: (queue: string) => void;
  selectedChampionId?: number;
  onChampionChange?: (championId: number | undefined) => void;
  selectedRole?: string;
  onRoleChange?: (role: string) => void;
  selectedResult?: 'win' | 'loss' | 'all';
  onResultChange?: (result: 'win' | 'loss' | 'all') => void;
  onResetFilters?: () => void;
  isLoading?: boolean;
  total?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
  availableQueues?: GameQueue[];
  champStats?: ChampionStatSummary[];
}

const POSITION_OPTIONS: { id: string; labelDe: string; labelEn: string; posKey?: PositionKey }[] = [
  { id: 'all', labelDe: 'Alle Positionen', labelEn: 'All Positions' },
  { id: 'TOP', labelDe: 'Top', labelEn: 'Top', posKey: 'TOP' },
  { id: 'JUNGLE', labelDe: 'Jungle', labelEn: 'Jungle', posKey: 'JUNGLE' },
  { id: 'MID', labelDe: 'Mid', labelEn: 'Mid', posKey: 'MID' },
  { id: 'ADC', labelDe: 'Bot / ADC', labelEn: 'Bot / ADC', posKey: 'ADC' },
  { id: 'SUPPORT', labelDe: 'Support', labelEn: 'Support', posKey: 'SUPPORT' },
];

const RESULT_OPTIONS: {
  id: 'all' | 'win' | 'loss';
  labelDe: string;
  labelEn: string;
  colorClass?: string;
}[] = [
  { id: 'all', labelDe: 'Alle Ergebnisse', labelEn: 'All Results' },
  { id: 'win', labelDe: 'Siege (Win)', labelEn: 'Victory', colorClass: 'text-emerald-400' },
  { id: 'loss', labelDe: 'Niederlagen (Loss)', labelEn: 'Defeat', colorClass: 'text-rose-400' },
];

export default function MatchHistory({
  matches,
  region,
  activeQueue,
  onQueueChange,
  selectedChampionId,
  onChampionChange,
  selectedRole = 'all',
  onRoleChange,
  selectedResult = 'all',
  onResultChange,
  onResetFilters,
  isLoading,
  total = 0,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
  availableQueues,
  champStats,
}: MatchHistoryProps) {
  const { locale } = useTranslation();

  const [internalQueues, setInternalQueues] = useState<GameQueue[]>([]);
  const [openDropdown, setOpenDropdown] = useState<'queue' | 'role' | 'champion' | 'result' | null>(null);
  const [champSearch, setChampSearch] = useState('');

  useEffect(() => {
    if (!availableQueues || availableQueues.length === 0) {
      let isMounted = true;
      fetchGameQueues().then((q) => {
        if (isMounted && q && q.length > 0) {
          setInternalQueues(q);
        }
      });
      return () => {
        isMounted = false;
      };
    }
  }, [availableQueues]);

  const activeQueuesList = availableQueues && availableQueues.length > 0 ? availableQueues : internalQueues;

  const getQueueLabel = (qId: string) => {
    if (qId === 'all') return locale === 'de' ? 'Alle Warteschlangen' : 'All Queues';
    const found = activeQueuesList.find((q) => {
      if (String(q.id) === qId) return true;
      if (q.id === 420 && (qId === 'ranked_solo' || qId === 'solo')) return true;
      if (q.id === 440 && (qId === 'ranked_flex' || qId === 'flex')) return true;
      if (q.id === 710 && (qId === 'ranked_5s' || qId === '5s')) return true;
      if (q.id === 450 && qId === 'aram') return true;
      if (q.id === 1700 && qId === 'arena') return true;
      return false;
    });
    if (found) return found.name;
    if (qId === 'solo' || qId === 'ranked_solo' || qId === '420') return 'Ranked Solo/Duo';
    if (qId === 'flex' || qId === 'ranked_flex' || qId === '440') return 'Ranked Flex';
    if (qId === 'aram' || qId === '450') return 'ARAM';
    if (qId === 'arena' || qId === '1700') return 'Arena';
    return qId;
  };

  // Build champion list for filter dropdown
  const availableChampions = useMemo(() => {
    const map = new Map<number, { championId: number; championName: string; games: number; winrate?: number }>();
    if (champStats && champStats.length > 0) {
      for (const c of champStats) {
        map.set(c.championId, {
          championId: c.championId,
          championName: c.championName,
          games: c.games,
          winrate: c.winrate,
        });
      }
    }
    for (const m of matches) {
      if (m.participant && m.participant.championId) {
        const id = m.participant.championId;
        if (!map.has(id)) {
          map.set(id, {
            championId: id,
            championName: m.participant.championName || `Champion ${id}`,
            games: 1,
          });
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => b.games - a.games);
  }, [champStats, matches]);

  const selectedChampion = useMemo(() => {
    if (!selectedChampionId) return null;
    return availableChampions.find((c) => c.championId === selectedChampionId) || null;
  }, [availableChampions, selectedChampionId]);

  const filteredChampions = useMemo(() => {
    if (!champSearch.trim()) return availableChampions;
    const q = champSearch.toLowerCase().trim();
    return availableChampions.filter((c) => c.championName.toLowerCase().includes(q));
  }, [availableChampions, champSearch]);

  const activeRoleOption = useMemo(() => {
    const current = (selectedRole || 'all').toUpperCase();
    return (
      POSITION_OPTIONS.find((p) => p.id === current) || {
        id: 'all',
        labelDe: 'Alle Positionen',
        labelEn: 'All Positions',
      }
    );
  }, [selectedRole]);

  const activeResultOption = useMemo(() => {
    return (
      RESULT_OPTIONS.find((r) => r.id === selectedResult) || {
        id: 'all',
        labelDe: 'Alle Ergebnisse',
        labelEn: 'All Results',
      }
    );
  }, [selectedResult]);

  const hasActiveFilters = Boolean(
    (activeQueue && activeQueue !== 'all') ||
      selectedChampionId ||
      (selectedRole && selectedRole.toLowerCase() !== 'all') ||
      (selectedResult && selectedResult !== 'all')
  );

  // Group matches by day like LoLDB (e.g. "Today 2W 1L", "Yesterday 3W 0L", "Nov 17 6W 1L")
  const groupedMatches = useMemo(() => {
    const groups: Array<{
      dateLabel: string;
      wins: number;
      losses: number;
      lpDelta: number;
      hasLpData: boolean;
      matches: FormattedMatch[];
    }> = [];

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const groupMap = new Map<
      string,
      {
        wins: number;
        losses: number;
        lpDelta: number;
        hasLpData: boolean;
        matches: FormattedMatch[];
      }
    >();
    const order: string[] = [];

    matches.forEach((m) => {
      const d = new Date(m.gameCreation);
      const dStr = d.toDateString();

      let label = dStr;
      if (dStr === todayStr) {
        label = locale === 'de' ? 'Heute' : 'Today';
      } else if (dStr === yesterdayStr) {
        label = locale === 'de' ? 'Gestern' : 'Yesterday';
      } else {
        label = d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: 'numeric' });
      }

      if (!groupMap.has(label)) {
        groupMap.set(label, { wins: 0, losses: 0, lpDelta: 0, hasLpData: false, matches: [] });
        order.push(label);
      }

      const grp = groupMap.get(label)!;
      grp.matches.push(m);
      if (m.isRemake || m.gameDuration <= 330) {
        // Remakes do not count towards wins or losses
      } else if (m.win) {
        grp.wins++;
      } else {
        grp.losses++;
      }

      const delta = m.participant?.lpDelta ?? m.lpChange?.delta ?? null;
      if (typeof delta === 'number') {
        grp.lpDelta += delta;
        grp.hasLpData = true;
      }
    });

    order.forEach((label) => {
      const grp = groupMap.get(label)!;
      groups.push({
        dateLabel: label,
        wins: grp.wins,
        losses: grp.losses,
        lpDelta: grp.lpDelta,
        hasLpData: grp.hasLpData,
        matches: grp.matches,
      });
    });

    return groups;
  }, [matches, locale]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Header: Today's Summary & Quick Stats */}
      {groupedMatches.length > 0 && (
        <div className="flex items-center gap-2 text-sm font-black px-1">
          <span className="text-white text-base tracking-tight">{groupedMatches[0].dateLabel}</span>
          <span className="text-emerald-400 font-bold text-xs">{groupedMatches[0].wins}W</span>
          <span className="text-rose-400 font-bold text-xs">{groupedMatches[0].losses}L</span>
          {groupedMatches[0].hasLpData && (
            <>
              <span className="text-zinc-600 font-normal">·</span>
              <span
                className={`text-xs font-black tracking-tight ${
                  groupedMatches[0].lpDelta > 0
                    ? 'text-emerald-400'
                    : groupedMatches[0].lpDelta < 0
                    ? 'text-rose-400'
                    : 'text-zinc-400'
                }`}
              >
                {groupedMatches[0].lpDelta > 0 ? `+${groupedMatches[0].lpDelta}` : groupedMatches[0].lpDelta} LP
              </span>
            </>
          )}
        </div>
      )}

      {/* Filter Toolbar with Collapsible Dropdowns */}
      <div className="relative flex items-center justify-between gap-3 flex-wrap bg-[#0c1015]/90 p-2 rounded-2xl border border-white/[0.06] backdrop-blur-md">
        {/* Invisible Click-Outside Backdrop */}
        {openDropdown && (
          <div
            className="fixed inset-0 z-30 bg-transparent"
            onClick={() => {
              setOpenDropdown(null);
              setChampSearch('');
            }}
          />
        )}

        {/* Filter Dropdown Buttons */}
        <div className="flex items-center gap-2 flex-wrap z-30">
          {/* 1. Queue Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(openDropdown === 'queue' ? null : 'queue');
              }}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                activeQueue !== 'all'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-sm shadow-amber-500/10'
                  : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Layers className={`h-3.5 w-3.5 ${activeQueue !== 'all' ? 'text-amber-400' : 'text-zinc-400'}`} />
              <span className="max-w-[130px] truncate">{getQueueLabel(activeQueue)}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${
                  openDropdown === 'queue' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openDropdown === 'queue' && (
              <div className="absolute left-0 top-full mt-2 w-56 max-h-72 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1218] p-1.5 shadow-2xl backdrop-blur-2xl z-40 scrollbar-thin scrollbar-thumb-white/10">
                <button
                  type="button"
                  onClick={() => {
                    onQueueChange('all');
                    setOpenDropdown(null);
                  }}
                  className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-lg transition-colors ${
                    activeQueue === 'all'
                      ? 'bg-amber-500/15 text-amber-300 font-bold'
                      : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                  }`}
                >
                  <span>{locale === 'de' ? 'Alle Warteschlangen' : 'All Queues'}</span>
                  {activeQueue === 'all' && <Check className="h-3.5 w-3.5 text-amber-400" />}
                </button>

                <div className="my-1 border-t border-white/[0.06]" />

                {activeQueuesList.map((q) => {
                  const isSelected =
                    activeQueue === String(q.id) ||
                    (q.id === 420 && (activeQueue === 'ranked_solo' || activeQueue === 'solo')) ||
                    (q.id === 440 && (activeQueue === 'ranked_flex' || activeQueue === 'flex')) ||
                    (q.id === 710 && (activeQueue === 'ranked_5s' || activeQueue === '5s')) ||
                    (q.id === 450 && activeQueue === 'aram') ||
                    (q.id === 1700 && activeQueue === 'arena');

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => {
                        onQueueChange(String(q.id));
                        setOpenDropdown(null);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-amber-500/15 text-amber-300 font-bold'
                          : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span className="truncate">{q.name}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-amber-400 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. Position / Role Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(openDropdown === 'role' ? null : 'role');
              }}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                selectedRole && selectedRole.toLowerCase() !== 'all'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-sm shadow-amber-500/10'
                  : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {activeRoleOption.posKey ? (
                <Image
                  src={getPositionIconUrl(activeRoleOption.posKey)}
                  alt={activeRoleOption.posKey}
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 object-contain"
                />
              ) : (
                <Compass
                  className={`h-3.5 w-3.5 ${
                    selectedRole && selectedRole.toLowerCase() !== 'all' ? 'text-amber-400' : 'text-zinc-400'
                  }`}
                />
              )}
              <span>{locale === 'de' ? activeRoleOption.labelDe : activeRoleOption.labelEn}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${
                  openDropdown === 'role' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openDropdown === 'role' && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[#0d1218] p-1.5 shadow-2xl backdrop-blur-2xl z-40">
                {POSITION_OPTIONS.map((pos) => {
                  const isSelected = (selectedRole || 'all').toUpperCase() === pos.id;
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => {
                        onRoleChange?.(pos.id);
                        setOpenDropdown(null);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-amber-500/15 text-amber-300 font-bold'
                          : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {pos.posKey ? (
                          <Image
                            src={getPositionIconUrl(pos.posKey)}
                            alt={pos.posKey}
                            width={16}
                            height={16}
                            className="h-4 w-4 object-contain opacity-80"
                          />
                        ) : (
                          <Compass className="h-4 w-4 text-zinc-500" />
                        )}
                        <span>{locale === 'de' ? pos.labelDe : pos.labelEn}</span>
                      </div>
                      {isSelected && <Check className="h-3.5 w-3.5 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Champion Dropdown (Searchable) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(openDropdown === 'champion' ? null : 'champion');
              }}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                selectedChampion
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-sm shadow-amber-500/10'
                  : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {selectedChampion ? (
                <>
                  <Image
                    src={getChampionIconUrl(selectedChampion.championName)}
                    alt={selectedChampion.championName}
                    width={18}
                    height={18}
                    className="h-4.5 w-4.5 rounded-full object-cover border border-white/20"
                  />
                  <span className="font-bold">{selectedChampion.championName}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      onChampionChange?.(undefined);
                    }}
                    className="ml-1 p-0.5 rounded-full hover:bg-amber-500/20 text-amber-300/80 hover:text-amber-200"
                    title={locale === 'de' ? 'Champion abwählen' : 'Clear champion'}
                  >
                    <X className="h-3 w-3" />
                  </span>
                </>
              ) : (
                <>
                  <Swords className="h-3.5 w-3.5 text-zinc-400" />
                  <span>{locale === 'de' ? 'Alle Champions' : 'All Champions'}</span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${
                      openDropdown === 'champion' ? 'rotate-180' : ''
                    }`}
                  />
                </>
              )}
            </button>

            {openDropdown === 'champion' && (
              <div className="absolute left-0 top-full mt-2 w-64 max-h-80 flex flex-col rounded-xl border border-white/10 bg-[#0d1218] shadow-2xl backdrop-blur-2xl z-40 overflow-hidden">
                {/* Search Input */}
                <div className="p-2 border-b border-white/[0.06] bg-[#0c1015]">
                  <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/10">
                    <Search className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
                    <input
                      type="text"
                      value={champSearch}
                      onChange={(e) => setChampSearch(e.target.value)}
                      placeholder={locale === 'de' ? 'Champion suchen...' : 'Search champion...'}
                      className="w-full bg-transparent text-xs text-white placeholder-zinc-500 focus:outline-none"
                      autoFocus
                    />
                    {champSearch && (
                      <button type="button" onClick={() => setChampSearch('')}>
                        <X className="h-3 w-3 text-zinc-400 hover:text-white" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Champion Options List */}
                <div className="p-1.5 overflow-y-auto max-h-64 scrollbar-thin scrollbar-thumb-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      onChampionChange?.(undefined);
                      setOpenDropdown(null);
                      setChampSearch('');
                    }}
                    className={`flex items-center justify-between w-full px-2.5 py-2 text-xs rounded-lg transition-colors ${
                      !selectedChampionId
                        ? 'bg-amber-500/15 text-amber-300 font-bold'
                        : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                    }`}
                  >
                    <span>{locale === 'de' ? 'Alle Champions' : 'All Champions'}</span>
                    {!selectedChampionId && <Check className="h-3.5 w-3.5 text-amber-400" />}
                  </button>

                  <div className="my-1 border-t border-white/[0.06]" />

                  {filteredChampions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-zinc-500">
                      {locale === 'de' ? 'Kein Champion gefunden' : 'No champion found'}
                    </div>
                  ) : (
                    filteredChampions.map((c) => {
                      const isSelected = selectedChampionId === c.championId;
                      return (
                        <button
                          key={c.championId}
                          type="button"
                          onClick={() => {
                            onChampionChange?.(c.championId);
                            setOpenDropdown(null);
                            setChampSearch('');
                          }}
                          className={`flex items-center justify-between w-full px-2 py-1.5 text-xs rounded-lg transition-colors ${
                            isSelected
                              ? 'bg-amber-500/15 text-amber-300 font-bold'
                              : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <Image
                              src={getChampionIconUrl(c.championName)}
                              alt={c.championName}
                              width={22}
                              height={22}
                              className="h-5.5 w-5.5 rounded-full object-cover shrink-0 border border-white/15"
                            />
                            <span className="truncate">{c.championName}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 text-[11px] text-zinc-400">
                            {c.winrate !== undefined && (
                              <span
                                className={`font-semibold ${
                                  c.winrate >= 50 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {c.winrate}%
                              </span>
                            )}
                            <span className="text-zinc-500">
                              {c.games} {locale === 'de' ? 'Spiele' : 'G'}
                            </span>
                            {isSelected && <Check className="h-3.5 w-3.5 text-amber-400" />}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 4. Result Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(openDropdown === 'result' ? null : 'result');
              }}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-semibold border transition-all ${
                selectedResult === 'win'
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 shadow-sm shadow-emerald-500/10'
                  : selectedResult === 'loss'
                  ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 shadow-sm shadow-rose-500/10'
                  : 'border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <Trophy
                className={`h-3.5 w-3.5 ${
                  selectedResult === 'win'
                    ? 'text-emerald-400'
                    : selectedResult === 'loss'
                    ? 'text-rose-400'
                    : 'text-zinc-400'
                }`}
              />
              <span>{locale === 'de' ? activeResultOption.labelDe : activeResultOption.labelEn}</span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-zinc-400 transition-transform duration-200 ${
                  openDropdown === 'result' ? 'rotate-180' : ''
                }`}
              />
            </button>

            {openDropdown === 'result' && (
              <div className="absolute left-0 top-full mt-2 w-48 rounded-xl border border-white/10 bg-[#0d1218] p-1.5 shadow-2xl backdrop-blur-2xl z-40">
                {RESULT_OPTIONS.map((res) => {
                  const isSelected = (selectedResult || 'all') === res.id;
                  return (
                    <button
                      key={res.id}
                      type="button"
                      onClick={() => {
                        onResultChange?.(res.id);
                        setOpenDropdown(null);
                      }}
                      className={`flex items-center justify-between w-full px-3 py-2 text-xs rounded-lg transition-colors ${
                        isSelected
                          ? 'bg-amber-500/15 text-amber-300 font-bold'
                          : 'text-zinc-300 hover:bg-white/[0.06] hover:text-white'
                      }`}
                    >
                      <span className={res.colorClass}>{locale === 'de' ? res.labelDe : res.labelEn}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 text-amber-400" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 5. Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setOpenDropdown(null);
                setChampSearch('');
                onResetFilters?.();
              }}
              className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 hover:border-rose-500/50 transition-all shadow-sm"
              title={locale === 'de' ? 'Alle Filter zurücksetzen' : 'Reset all filters'}
            >
              <RotateCcw className="h-3 w-3" />
              <span>{locale === 'de' ? 'Zurücksetzen' : 'Reset'}</span>
            </button>
          )}
        </div>

        {/* Total Matches Count */}
        {total > 0 && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 px-2 ml-auto">
            <span className="text-zinc-200 font-bold">{matches.length}</span>
            <span className="text-zinc-500">{locale === 'de' ? 'von' : 'of'}</span>
            <span className="text-zinc-200 font-bold">{total}</span>
            <span className="text-zinc-500">{locale === 'de' ? 'Matches' : 'Matches'}</span>
          </div>
        )}
      </div>

      {/* Match Cards List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-white/[0.06] bg-[#0d1116] animate-pulse"
            />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1116] p-12 text-center">
          <Swords className="mx-auto h-10 w-10 text-zinc-600 mb-2.5" />
          <p className="text-sm font-bold text-zinc-200">
            {hasActiveFilters
              ? locale === 'de'
                ? 'Keine Matches für diese Filterkriterien gefunden'
                : 'No matches found matching these filters'
              : locale === 'de'
              ? 'Keine Matches in dieser Kategorie gefunden'
              : 'No matches found in this category'}
          </p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {hasActiveFilters
              ? locale === 'de'
                ? 'Passe deine Filtereinstellungen an oder setze sie zurück, um wieder mehr Matches zu sehen.'
                : 'Adjust your filter settings or reset them to view more matches.'
              : locale === 'de'
              ? 'Sobald der Hintergrund-Worker neue Matches analysiert hat, erscheinen sie automatisch hier.'
              : 'As soon as the background worker analyzes new matches, they will automatically appear here.'}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/[0.06] hover:bg-white/10 text-white border border-white/10 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5 text-amber-400" />
              <span>{locale === 'de' ? 'Filter zurücksetzen' : 'Reset filters'}</span>
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* First Day's Matches (Header rendered in top bar) */}
          <div className="flex flex-col gap-2.5">
            {groupedMatches[0].matches.map((match) => (
              <MatchCard key={match.matchId} match={match} region={region} />
            ))}
          </div>

          {/* Subsequent Days */}
          {groupedMatches.slice(1).map((group) => (
            <div key={group.dateLabel} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-sm font-black px-1 mt-2">
                <span className="text-white text-base tracking-tight">{group.dateLabel}</span>
                <span className="text-emerald-400 font-bold text-xs">{group.wins}W</span>
                <span className="text-rose-400 font-bold text-xs">{group.losses}L</span>
                {group.hasLpData && (
                  <>
                    <span className="text-zinc-600 font-normal">·</span>
                    <span
                      className={`text-xs font-black tracking-tight ${
                        group.lpDelta > 0
                          ? 'text-emerald-400'
                          : group.lpDelta < 0
                          ? 'text-rose-400'
                          : 'text-zinc-400'
                      }`}
                    >
                      {group.lpDelta > 0 ? `+${group.lpDelta}` : group.lpDelta} LP
                    </span>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {group.matches.map((match) => (
                  <MatchCard key={match.matchId} match={match} region={region} />
                ))}
              </div>
            </div>
          ))}

          {/* Load More Matches Button */}
          {hasMore && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 text-xs font-bold text-zinc-200 hover:bg-white/[0.09] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:border-white/20 active:scale-98"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>{locale === 'de' ? 'Lade weitere Matches...' : 'Loading more matches...'}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 text-amber-400" />
                    <span>{locale === 'de' ? 'Mehr Matches anzeigen (+10)' : 'Show more matches (+10)'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && matches.length > 0 && (
            <div className="text-center py-4 text-xs text-zinc-500 font-medium">
              {locale === 'de'
                ? `Alle gespeicherten Matches geladen (${matches.length})`
                : `All saved matches loaded (${matches.length})`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
