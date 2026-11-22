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
  Trophy,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import Breadcrumbs from '@/components/Breadcrumbs';
import {
  getChampionLoadingUrl,
  getPositionIconUrl,
  getDDragonVersion,
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

export default function ChampionsListView() {
  const { t, locale } = useTranslation();
  const [champions, setChampions] = useState<ChampionRosterItem[]>([]);
  const [version, setVersion] = useState<string>(() => getDDragonVersion());
  const [isLoading, setIsLoading] = useState(true);

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
      const posMeta = championPositionsMap[champ.id];

      // Lane filter
      if (selectedLane !== 'ALL') {
        const recPositions = posMeta?.recommendedPositions || [];
        const primaryRole = posMeta?.role || '';
        const laneMatch = recPositions.some((p) => {
          const up = p.toUpperCase();
          if (selectedLane === 'TOP') return up === 'TOP';
          if (selectedLane === 'JUNGLE') return up === 'JUNGLE';
          if (selectedLane === 'MID') return up === 'MIDDLE' || up === 'MID';
          if (selectedLane === 'ADC') return up === 'BOTTOM' || up === 'ADC' || up === 'BOT';
          if (selectedLane === 'SUPPORT') return up === 'SUPPORT';
          return false;
        });

        const primaryMatch = (() => {
          const up = primaryRole.toUpperCase();
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
        const matchesClass = posMeta?.class?.toLowerCase() === selectedClass.toLowerCase();
        if (!hasTag && !matchesClass) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = champ.name.toLowerCase().includes(q);
        const matchesTitle = champ.title.toLowerCase().includes(q);
        const matchesTag = champ.tags?.some((tg) => tg.toLowerCase().includes(q));
        const matchesRole = posMeta?.role?.toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesTag && !matchesRole) {
          return false;
        }
      }

      return true;
    });

    // Sorting
    list.sort((a, b) => {
      if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [champions, selectedLane, selectedClass, searchQuery, sortBy]);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs items={[{ label: t('nav.champions') || 'Champions' }]} />

      {/* Page Header (LoLDB Style) */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Trophy className="h-4 w-4" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {t('championWiki.pageTitle') || 'Alle Champions'}
          </h1>
        </div>
        <p className="text-xs sm:text-sm text-zinc-400">
          {t('championWiki.pageSubtitle', {
            count: champions.length || 170,
          }) || `Vollständiges Roster aller ${champions.length || 170} League of Legends Champions.`}
        </p>
      </div>

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
            <option value="name-asc">Name (A - Z)</option>
            <option value="name-desc">Name (Z - A)</option>
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

      {/* Champions Grid (LoLDB 5-Column Responsive Grid with High-Quality Cards) */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="relative h-64 sm:h-72 w-full rounded-xl border border-white/[0.06] bg-gradient-to-br from-zinc-900/60 to-zinc-800/40 p-4 animate-pulse flex flex-col justify-end"
            >
              <div className="h-5 w-28 bg-white/10 rounded mb-2" />
              <div className="h-3 w-20 bg-white/5 rounded mb-3" />
              <div className="flex gap-2">
                <div className="h-4 w-12 bg-white/5 rounded" />
                <div className="h-4 w-12 bg-white/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredChampions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 sm:gap-6">
          {filteredChampions.map((champ) => {
            const slug = champ.id.toLowerCase();
            const meta = championPositionsMap[champ.id];
            const primaryPos = meta?.recommendedPositions?.[0] || meta?.role || 'Top';
            const primaryClass = meta?.class || champ.tags?.[0] || 'Fighter';

            // Map position to PositionKey
            const posKey: PositionKey = (() => {
              const up = primaryPos.toUpperCase();
              if (up === 'TOP') return 'TOP';
              if (up === 'JUNGLE') return 'JUNGLE';
              if (up === 'MIDDLE' || up === 'MID') return 'MID';
              if (up === 'BOTTOM' || up === 'BOT' || up === 'ADC') return 'ADC';
              if (up === 'SUPPORT') return 'SUPPORT';
              return 'TOP';
            })();

            // Lane filter key for click filter
            const laneFilterKey: LaneFilter = (() => {
              if (posKey === 'TOP') return 'TOP';
              if (posKey === 'JUNGLE') return 'JUNGLE';
              if (posKey === 'MID') return 'MID';
              if (posKey === 'ADC') return 'ADC';
              if (posKey === 'SUPPORT') return 'SUPPORT';
              return 'TOP';
            })();

            return (
              <Link
                key={champ.id}
                href={`/${locale}/champions/${slug}`}
                className="group relative block rounded-xl overflow-hidden border border-white/[0.08] bg-gradient-to-br from-zinc-900/80 via-[#0a0d14] to-zinc-900/80 transition-all duration-300 hover:scale-[1.02] hover:border-amber-400/50 hover:shadow-2xl hover:shadow-black/70 active:scale-[0.99]"
              >
                {/* LoLDB Style Loading Art Portrait Container */}
                <div className="relative h-64 sm:h-72 w-full overflow-hidden bg-zinc-950">
                  <Image
                    src={getChampionLoadingUrl(champ.id)}
                    alt={champ.name}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, (max-width: 1280px) 25vw, 20vw"
                    className="object-cover object-top brightness-90 contrast-[1.05] group-hover:brightness-105 group-hover:scale-105 transition-all duration-500"
                    unoptimized
                  />

                  {/* Gradient Overlays (LoLDB Style) */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-transparent opacity-85 group-hover:opacity-70 transition-opacity" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent opacity-40" />

                  {/* Bottom Content Area (LoLDB Typography & Badges) */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex flex-col justify-end">
                    {/* Champion Name */}
                    <h3 className="text-base sm:text-lg font-bold text-white drop-shadow-md truncate group-hover:text-amber-400 transition-colors">
                      {champ.name}
                    </h3>

                    {/* Champion Title */}
                    <p className="text-xs text-zinc-400 font-medium truncate capitalize mt-0.5 drop-shadow">
                      {champ.title}
                    </p>

                    {/* Position & Class Badges (LoLDB Style) */}
                    <div className="flex items-center gap-1.5 mt-2.5">
                      {/* Primary Role Pill */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setSelectedLane(laneFilterKey);
                        }}
                        className="flex items-center gap-1 bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.08] rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                        title={`Filtere nach ${primaryPos}`}
                      >
                        <Image
                          src={getPositionIconUrl(posKey)}
                          alt={primaryPos}
                          width={10}
                          height={10}
                          className="w-2.5 h-2.5 opacity-80 object-contain"
                          unoptimized
                        />
                        <span className="text-zinc-300 text-[10px] font-semibold leading-none">
                          {primaryPos}
                        </span>
                      </button>

                      {/* Class Pill */}
                      {primaryClass && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const matchedClass = CLASS_OPTIONS.find(
                              (c) => c.key.toLowerCase() === primaryClass.toLowerCase()
                            );
                            if (matchedClass) {
                              setSelectedClass(matchedClass.key);
                            }
                          }}
                          className="flex items-center gap-1 bg-white/[0.08] hover:bg-white/[0.16] border border-white/[0.08] rounded px-1.5 py-0.5 transition-colors cursor-pointer"
                          title={`Filtere nach ${primaryClass}`}
                        >
                          <Image
                            src={getClassIconUrl(primaryClass)}
                            alt={primaryClass}
                            width={10}
                            height={10}
                            className="w-2.5 h-2.5 opacity-80 object-contain"
                            unoptimized
                          />
                          <span className="text-zinc-300 text-[10px] font-semibold leading-none">
                            {primaryClass}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
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
  );
}
