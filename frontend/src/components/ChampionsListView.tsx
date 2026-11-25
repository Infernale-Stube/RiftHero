'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  Shield,
  Swords,
  Wand2,
  Crosshair,
  HeartHandshake,
  Skull,
  Layers,
  RotateCcw,
  X,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
  getChampionIconUrl,
  getPositionIconUrl,
  getDDragonVersion,
  normalizeChampionNameForDDragon,
  PositionKey,
} from '@/lib/ddragon';
import { fetchChampionsRosterApi, ChampionRosterItem } from '@/lib/api';
import championPositionsRaw from '@/lib/championPositions.json';

type LaneFilter = 'ALL' | 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
type ClassFilter = 'ALL' | 'Fighter' | 'Mage' | 'Assassin' | 'Marksman' | 'Tank' | 'Support';
type SortOption = 'name-asc' | 'name-desc';

interface ChampionPosInfo {
  id: string;
  name: string;
  title: string;
  role: string;
  class: string;
  difficulty: number;
  recommendedPositions: string[];
}

const championPositionsMap = championPositionsRaw as Record<string, ChampionPosInfo>;

interface LaneOption {
  key: LaneFilter;
  labelKey: string;
  fallbackLabel: string;
  posKey?: PositionKey;
}

const LANE_OPTIONS: LaneOption[] = [
  { key: 'ALL', labelKey: 'championWiki.allLanes', fallbackLabel: 'Alle Rollen' },
  { key: 'TOP', labelKey: 'championWiki.laneTop', fallbackLabel: 'Top', posKey: 'TOP' },
  { key: 'JUNGLE', labelKey: 'championWiki.laneJungle', fallbackLabel: 'Jungle', posKey: 'JUNGLE' },
  { key: 'MID', labelKey: 'championWiki.laneMid', fallbackLabel: 'Mid', posKey: 'MID' },
  { key: 'ADC', labelKey: 'championWiki.laneAdc', fallbackLabel: 'Bot / ADC', posKey: 'ADC' },
  { key: 'SUPPORT', labelKey: 'championWiki.laneSupport', fallbackLabel: 'Support', posKey: 'SUPPORT' },
];

interface ClassOption {
  key: ClassFilter;
  labelKey: string;
  fallbackLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CLASS_OPTIONS: ClassOption[] = [
  { key: 'ALL', labelKey: 'championWiki.allClasses', fallbackLabel: 'Alle Klassen', icon: Layers },
  { key: 'Fighter', labelKey: 'championWiki.filterFighter', fallbackLabel: 'Kämpfer', icon: Swords },
  { key: 'Mage', labelKey: 'championWiki.filterMage', fallbackLabel: 'Magier', icon: Wand2 },
  { key: 'Assassin', labelKey: 'championWiki.filterAssassin', fallbackLabel: 'Assassinen', icon: Skull },
  { key: 'Marksman', labelKey: 'championWiki.filterMarksman', fallbackLabel: 'Schützen', icon: Crosshair },
  { key: 'Tank', labelKey: 'championWiki.filterTank', fallbackLabel: 'Tanks', icon: Shield },
  { key: 'Support', labelKey: 'championWiki.filterSupport', fallbackLabel: 'Unterstützer', icon: HeartHandshake },
];

/**
 * Maps champion class name to CommunityDragon role icon (matching loldb.info)
 */
function getClassIconUrl(className: string): string {
  const norm = className.toLowerCase();
  const base = 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champion-details/global/default';
  if (norm.includes('fighter') || norm.includes('kämpfer')) return `${base}/role-icon-fighter.png`;
  if (norm.includes('tank')) return `${base}/role-icon-tank.png`;
  if (norm.includes('mage') || norm.includes('magier')) return `${base}/role-icon-mage.png`;
  if (norm.includes('assassin') || norm.includes('assassinen')) return `${base}/role-icon-assassin.png`;
  if (norm.includes('support') || norm.includes('unterstützer')) return `${base}/role-icon-support.png`;
  if (norm.includes('marksman') || norm.includes('schütze') || norm.includes('carry')) return `${base}/role-icon-marksman.png`;
  return `${base}/role-icon-fighter.png`;
}

interface HoveredChampionState {
  champ: ChampionRosterItem;
  x: number;
  y: number;
}

export default function ChampionsListView() {
  const { t, locale } = useTranslation();
  const [champions, setChampions] = useState<ChampionRosterItem[]>([]);
  const [version, setVersion] = useState<string>(() => getDDragonVersion());
  const [isLoading, setIsLoading] = useState(true);

  // Hover state (analog to /items)
  const [hoveredChampion, setHoveredChampion] = useState<HoveredChampionState | null>(null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLane, setSelectedLane] = useState<LaneFilter>('ALL');
  const [selectedClass, setSelectedClass] = useState<ClassFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('name-asc');

  useEffect(() => {
    setIsLoading(true);
    fetchChampionsRosterApi(locale)
      .then((res) => {
        if (res && res.champions) {
          setChampions(res.champions);
          if (res.version) setVersion(res.version);
        }
      })
      .catch((err) => {
        console.error('Failed to load champions roster:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [locale]);

  // Clear hover on scroll
  useEffect(() => {
    const handleScroll = () => setHoveredChampion(null);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedLane('ALL');
    setSelectedClass('ALL');
    setSortBy('name-asc');
  };

  const isFilterActive =
    searchQuery.trim().length > 0 ||
    selectedLane !== 'ALL' ||
    selectedClass !== 'ALL' ||
    sortBy !== 'name-asc';

  // Filter & Sort champions
  const filteredChampions = useMemo(() => {
    const list = champions.filter((champ) => {
      if (!champ) return false;
      const champId = champ.id || '';
      const normId = normalizeChampionNameForDDragon(champ.id || champ.name);
      const posMeta = championPositionsMap[normId] || (champId ? championPositionsMap[champId] : null);

      // Lane filter
      if (selectedLane !== 'ALL') {
        const recPositions = posMeta?.recommendedPositions || [];
        const primaryRole = posMeta?.role || '';
        const laneMatch = recPositions.some((p) => {
          const up = (p || '').toUpperCase();
          if (selectedLane === 'TOP') return up === 'TOP';
          if (selectedLane === 'JUNGLE') return up === 'JUNGLE';
          if (selectedLane === 'MID') return up === 'MIDDLE' || up === 'MID';
          if (selectedLane === 'ADC') return up === 'BOTTOM' || up === 'ADC' || up === 'BOT';
          if (selectedLane === 'SUPPORT') return up === 'SUPPORT';
          return false;
        });

        const primaryMatch = (() => {
          const up = (primaryRole || '').toUpperCase();
          if (selectedLane === 'TOP') return up === 'TOP';
          if (selectedLane === 'JUNGLE') return up === 'JUNGLE';
          if (selectedLane === 'MID') return up === 'MIDDLE' || up === 'MID';
          if (selectedLane === 'ADC') return up === 'BOTTOM' || up === 'ADC' || up === 'BOT';
          if (selectedLane === 'SUPPORT') return up === 'SUPPORT';
          return false;
        })();

        if (!laneMatch && !primaryMatch) return false;
      }

      // Class filter
      if (selectedClass !== 'ALL') {
        const hasTag = champ.tags?.includes(selectedClass);
        const matchesClass = (posMeta?.class || '').toLowerCase() === selectedClass.toLowerCase();
        if (!hasTag && !matchesClass) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (champ.name || '').toLowerCase().includes(q);
        const matchesTitle = (champ.title || '').toLowerCase().includes(q);
        const matchesTag = champ.tags?.some((tg) => (tg || '').toLowerCase().includes(q));
        const matchesRole = (posMeta?.role || '').toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesTag && !matchesRole) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      if (sortBy === 'name-desc') {
        return nameB.localeCompare(nameA);
      }
      return nameA.localeCompare(nameB);
    });

    return list;
  }, [champions, selectedLane, selectedClass, searchQuery, sortBy]);

  // Helper metadata for hovered champion
  const hoveredNormId = hoveredChampion
    ? normalizeChampionNameForDDragon(hoveredChampion.champ.id || hoveredChampion.champ.name)
    : '';
  const hoveredMeta = hoveredNormId
    ? championPositionsMap[hoveredNormId] || championPositionsMap[hoveredChampion?.champ.id || '']
    : null;
  const hoveredPrimaryPos = hoveredMeta?.recommendedPositions?.[0] || hoveredMeta?.role || 'Top';
  const hoveredPrimaryClass = hoveredMeta?.class || hoveredChampion?.champ.tags?.[0] || 'Fighter';
  const hoveredPosKey: PositionKey = (() => {
    const up = hoveredPrimaryPos.toUpperCase();
    if (up === 'TOP') return 'TOP';
    if (up === 'JUNGLE') return 'JUNGLE';
    if (up === 'MIDDLE' || up === 'MID') return 'MID';
    if (up === 'BOTTOM' || up === 'BOT' || up === 'ADC') return 'ADC';
    if (up === 'SUPPORT') return 'SUPPORT';
    return 'TOP';
  })();

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs items={[{ label: t('nav.champions') || 'Champions' }]} />

      {/* Filter Bar (LoLDB Style Sticky-like Glassmorphic Container) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
        {/* Top Controls: Search Input + Sort Dropdown + Reset Button */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search Box */}
          <div className="group relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 transition-colors group-focus-within:text-amber-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('championWiki.searchPlaceholder') || 'Champion suchen (z.B. Ahri, Aatrox, Yasuo)...'}
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-9 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/60 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title="Suche leeren"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-10 rounded-xl border border-white/[0.08] bg-[#121721] px-3 text-xs sm:text-sm font-medium text-zinc-200 focus:outline-none focus:border-amber-400/60 transition-colors cursor-pointer"
          >
            <option value="name-asc">{t('championWiki.sortByNameAsc') || 'Name (A - Z)'}</option>
            <option value="name-desc">{t('championWiki.sortByNameDesc') || 'Name (Z - A)'}</option>
          </select>

          {/* Reset Filters Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer shadow-sm"
              title={t('championWiki.resetFilters') || 'Filter zurücksetzen'}
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Lane / Role Filters (with League position icons) */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {LANE_OPTIONS.map((lane) => {
            const isActive = selectedLane === lane.key;
            const iconUrl = lane.posKey ? getPositionIconUrl(lane.posKey) : null;
            return (
              <button
                key={lane.key}
                type="button"
                onClick={() => setSelectedLane(lane.key)}
                className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-white bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05]'
                }`}
              >
                {iconUrl ? (
                  <Image
                    src={iconUrl}
                    alt={lane.key}
                    width={14}
                    height={14}
                    className={`h-3.5 w-3.5 object-contain transition-opacity ${
                      isActive ? 'opacity-100 brightness-110' : 'opacity-70'
                    }`}
                    unoptimized
                  />
                ) : (
                  <Layers className={`h-3.5 w-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                )}
                <span>{t(lane.labelKey) || lane.fallbackLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Class Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-white/[0.06] pt-3">
          {CLASS_OPTIONS.map((cls) => {
            const Icon = cls.icon;
            const isActive = selectedClass === cls.key;
            const classIcon = cls.key !== 'ALL' ? getClassIconUrl(cls.key) : null;

            return (
              <button
                key={cls.key}
                type="button"
                onClick={() => setSelectedClass(cls.key)}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 bg-transparent hover:bg-white/[0.03]'
                }`}
              >
                {classIcon ? (
                  <Image
                    src={classIcon}
                    alt={cls.key}
                    width={12}
                    height={12}
                    className={`h-3 w-3 object-contain ${isActive ? 'opacity-100 brightness-110' : 'opacity-70'}`}
                    unoptimized
                  />
                ) : (
                  <Icon className={`h-3 w-3 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                )}
                <span>{t(cls.labelKey) || cls.fallbackLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Summary & Quick Active Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span>
              {t('championWiki.showingCount', {
                filtered: filteredChampions.length,
                total: champions.length,
              }) || `Zeige ${filteredChampions.length} von ${champions.length} Champions`}
            </span>
          </div>

          {/* Active Filter Badges */}
          {isFilterActive && (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedLane !== 'ALL' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  {selectedLane}
                  <button
                    type="button"
                    onClick={() => setSelectedLane('ALL')}
                    className="hover:text-white cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {selectedClass !== 'ALL' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  {selectedClass}
                  <button
                    type="button"
                    onClick={() => setSelectedClass('ALL')}
                    className="hover:text-white cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}

              {searchQuery && (
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                  "{searchQuery}"
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="hover:text-white cursor-pointer ml-0.5"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Champions Roster Section (Analog to /items Grid & Tiles) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/50 p-4 sm:p-6 backdrop-blur-sm shadow-xl space-y-4">
        {/* Section Header (analog to /items tier section header) */}
        <div className="flex items-center gap-3">
          <h2 className="text-[11px] sm:text-xs font-black tracking-[0.15em] text-zinc-300 uppercase">
            {selectedLane !== 'ALL'
              ? `${selectedLane} Champions`
              : selectedClass !== 'ALL'
              ? `${selectedClass} Champions`
              : 'Champion Roster'}
          </h2>
          <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-bold text-zinc-500">
            {filteredChampions.length}
          </span>
          <div className="h-px flex-1 bg-white/[0.08]" />
        </div>

        {/* Champion Tiles Grid (analog to items) */}
        {isLoading ? (
          /* Loading Skeleton */
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 p-1 animate-pulse w-[72px] sm:w-[84px]">
                <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl border border-white/[0.06] bg-zinc-900/50" />
                <div className="h-3 w-12 bg-white/10 rounded" />
              </div>
            ))}
          </div>
        ) : filteredChampions.length > 0 ? (
          <div className="flex flex-wrap gap-2 sm:gap-2.5">
            {filteredChampions.map((champ) => {
              const champId = champ.id || '';
              const normId = normalizeChampionNameForDDragon(champ.id || champ.name);
              const slug = normId.toLowerCase();
              const meta = championPositionsMap[normId] || (champId ? championPositionsMap[champId] : null);
              const primaryPos = meta?.recommendedPositions?.[0] || meta?.role || 'Top';

              // Map position to PositionKey
              const posKey: PositionKey = (() => {
                const up = (primaryPos || '').toUpperCase();
                if (up === 'TOP') return 'TOP';
                if (up === 'JUNGLE') return 'JUNGLE';
                if (up === 'MIDDLE' || up === 'MID') return 'MID';
                if (up === 'BOTTOM' || up === 'BOT' || up === 'ADC') return 'ADC';
                if (up === 'SUPPORT') return 'SUPPORT';
                return 'TOP';
              })();

              return (
                <div
                  key={champ.id}
                  className="relative"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredChampion({
                      champ,
                      x: rect.right + 12,
                      y: rect.top,
                    });
                  }}
                  onMouseLeave={() => setHoveredChampion(null)}
                >
                  <Link
                    href={`/${locale}/champions/${slug}`}
                    className="group relative flex flex-col items-center gap-1.5 p-1 rounded-xl transition-all duration-150 cursor-pointer hover:scale-105 w-[72px] sm:w-[84px]"
                  >
                    {/* Champion Avatar Icon Tile (analog to item tile) */}
                    <div className="relative h-14 w-14 sm:h-16 sm:w-16 overflow-hidden rounded-xl border border-white/[0.1] bg-black/60 group-hover:border-amber-400/60 group-hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] transition-all">
                      <Image
                        src={getChampionIconUrl(normId || champ.id, version)}
                        alt={champ.name}
                        fill
                        sizes="64px"
                        className="object-cover group-hover:scale-105 transition-transform duration-200"
                        unoptimized
                      />

                      {/* Subtle Lane Position Icon in bottom-right corner */}
                      {posKey && (
                        <div className="absolute bottom-0.5 right-0.5 rounded bg-black/85 p-0.5 border border-white/10 shadow-sm pointer-events-none">
                          <Image
                            src={getPositionIconUrl(posKey)}
                            alt={primaryPos}
                            width={10}
                            height={10}
                            className="h-2.5 w-2.5 object-contain opacity-85"
                            unoptimized
                          />
                        </div>
                      )}
                    </div>

                    {/* Champion Name (analog to gold text below item) */}
                    <span className="text-[11px] sm:text-xs font-semibold text-zinc-300 tracking-tight group-hover:text-amber-300 transition-colors truncate w-full text-center">
                      {champ.name}
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500 rounded-2xl border border-white/[0.06] bg-[#0c1017]/50">
            <Shield className="h-12 w-12 text-zinc-600 mb-3 opacity-40" />
            <p className="text-lg font-bold text-zinc-300 mb-1">
              {t('championWiki.noChampions') || 'Keine Champions gefunden'}
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mb-4">
              {searchQuery
                ? `Keine Treffer für "${searchQuery}". Überprüfe deine Rechtschreibung oder setze den Filter zurück.`
                : 'Aktuell sind keine Champions für diese Filterauswahl verfügbar.'}
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500/20 border border-amber-500/40 px-4 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/30 transition-all cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('championWiki.resetFilters') || 'Filter zurücksetzen'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Floating Hover Tooltip (analog to hoveredItem on /items) */}
      {hoveredChampion && (
        <div
          className="fixed z-50 pointer-events-none hidden lg:block w-72 rounded-xl border border-white/15 bg-[#00060d]/95 p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in duration-100"
          style={{
            left: Math.min(hoveredChampion.x, typeof window !== 'undefined' ? window.innerWidth - 320 : 0),
            top: Math.min(hoveredChampion.y, typeof window !== 'undefined' ? window.innerHeight - 240 : 0),
          }}
        >
          <div className="flex items-start gap-3 mb-2.5">
            {/* Champion Icon in Tooltip */}
            <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-white/20 shrink-0 bg-black/70">
              <Image
                src={getChampionIconUrl(hoveredChampion.champ.id, version)}
                alt={hoveredChampion.champ.name}
                fill
                sizes="48px"
                className="object-cover"
                unoptimized
              />
            </div>
            {/* Champion Info in Tooltip */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#f0e6d3] leading-tight truncate">
                {hoveredChampion.champ.name}
              </p>
              <p className="text-[11px] text-zinc-400 truncate mt-0.5">
                {hoveredChampion.champ.title}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                {/* Position Badge */}
                <div className="flex items-center gap-1 bg-white/[0.08] border border-white/[0.08] rounded px-1.5 py-0.5">
                  <Image
                    src={getPositionIconUrl(hoveredPosKey)}
                    alt={hoveredPrimaryPos}
                    width={10}
                    height={10}
                    className="w-2.5 h-2.5 opacity-80 object-contain"
                    unoptimized
                  />
                  <span className="text-[10px] text-zinc-300 font-semibold">{hoveredPrimaryPos}</span>
                </div>

                {/* Class Badge */}
                {hoveredPrimaryClass && (
                  <div className="flex items-center gap-1 bg-white/[0.08] border border-white/[0.08] rounded px-1.5 py-0.5">
                    <Image
                      src={getClassIconUrl(hoveredPrimaryClass)}
                      alt={hoveredPrimaryClass}
                      width={10}
                      height={10}
                      className="w-2.5 h-2.5 opacity-80 object-contain"
                      unoptimized
                    />
                    <span className="text-[10px] text-zinc-300 font-semibold">{hoveredPrimaryClass}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags & Action Hint */}
          <div className="border-t border-white/[0.08] pt-2 mt-2 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-1">
              {hoveredChampion.champ.tags?.map((tag) => (
                <span key={tag} className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-zinc-400">
                  {tag}
                </span>
              ))}
            </div>
            <span className="text-[10px] font-semibold text-amber-400/90">
              {t('championWiki.clickForDetails') || t('common.details')} →
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
