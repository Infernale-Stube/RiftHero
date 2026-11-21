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
  getChampionLoadingUrl,
  getPositionIconUrl,
  getDDragonVersion,
  PositionKey,
} from '@/lib/ddragon';
import { fetchChampionsRosterApi, ChampionRosterItem } from '@/lib/api';
import championPositionsRaw from '@/lib/championPositions.json';

type LaneFilter = 'ALL' | 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
type ClassFilter = 'ALL' | 'Fighter' | 'Mage' | 'Assassin' | 'Marksman' | 'Tank' | 'Support';

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

export default function ChampionsListView() {
  const { t, locale } = useTranslation();
  const [champions, setChampions] = useState<ChampionRosterItem[]>([]);
  const [version, setVersion] = useState<string>(() => getDDragonVersion());
  const [isLoading, setIsLoading] = useState(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLane, setSelectedLane] = useState<LaneFilter>('ALL');
  const [selectedClass, setSelectedClass] = useState<ClassFilter>('ALL');

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
  };

  const isFilterActive =
    searchQuery.trim().length > 0 ||
    selectedLane !== 'ALL' ||
    selectedClass !== 'ALL';

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
        const matchesTag = champ.tags?.some((t) => t.toLowerCase().includes(q));
        const matchesRole = posMeta?.role?.toLowerCase().includes(q);
        if (!matchesName && !matchesTitle && !matchesTag && !matchesRole) {
          return false;
        }
      }

      return true;
    });

    // Always alphabetical A-Z
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [champions, selectedLane, selectedClass, searchQuery]);

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: t('nav.champions') || 'Champions' },
        ]}
      />

      {/* Filter Bar (LoLDB Style Sticky-like Container) */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
        {/* Top Controls: Search Input + Reset Button */}
        <div className="flex items-center gap-3">
          {/* Search Box */}
          <div className="group relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 transition-colors group-focus-within:text-amber-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('championWiki.searchPlaceholder')}
              className="h-10 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] pl-10 pr-9 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400/60 focus:ring-1 focus:ring-amber-400/60 transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                title="Suche leeren"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Reset Filters Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-zinc-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all cursor-pointer shadow-sm"
              title={t('championWiki.resetFilters')}
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
                <Icon className={`h-3 w-3 ${isActive ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span>{t(cls.labelKey) || cls.fallbackLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Summary & Quick Active Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-3 text-xs text-zinc-400">
          <div className="flex items-center gap-1.5">
            <span>
              {t('championWiki.showingCount', {
                filtered: filteredChampions.length,
                total: champions.length,
              })}
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
                    className="hover:text-white"
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
                    className="hover:text-white"
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
                    className="hover:text-white"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Champions Grid (LoLDB Style Loading Art Portrait Cards) */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5">
          {[...Array(18)].map((_, i) => (
            <div
              key={i}
              className="relative aspect-[3/4] w-full rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4 animate-pulse flex flex-col justify-end"
            >
              <div className="h-5 w-24 bg-white/10 rounded mb-2" />
              <div className="h-3 w-16 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : filteredChampions.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-4 sm:gap-5">
          {filteredChampions.map((champ) => {
            const slug = champ.id.toLowerCase();
            const meta = championPositionsMap[champ.id];
            const primaryPos = meta?.recommendedPositions?.[0] || meta?.role || 'Top';

            // Map position to PositionKey for icon
            const posKey: PositionKey = (() => {
              const up = primaryPos.toUpperCase();
              if (up === 'TOP') return 'TOP';
              if (up === 'JUNGLE') return 'JUNGLE';
              if (up === 'MIDDLE' || up === 'MID') return 'MID';
              if (up === 'BOTTOM' || up === 'BOT' || up === 'ADC') return 'ADC';
              if (up === 'SUPPORT') return 'SUPPORT';
              return 'TOP';
            })();

            return (
              <Link
                key={champ.id}
                href={`/${locale}/champions/${slug}`}
                className="group relative block rounded-2xl overflow-hidden border border-white/[0.08] bg-gradient-to-br from-zinc-900/90 via-[#0a0d14] to-zinc-900/90 transition-all duration-300 hover:scale-[1.03] hover:border-amber-500/50 hover:shadow-[0_0_25px_rgba(245,158,11,0.22)] active:scale-98"
              >
                {/* Loading Art Image (Portrait Card matching LoLDB) */}
                <div className="relative aspect-[3/4] w-full overflow-hidden bg-zinc-950">
                  <Image
                    src={getChampionLoadingUrl(champ.id)}
                    alt={champ.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, (max-width: 1280px) 20vw, 16vw"
                    className="object-cover object-top brightness-90 contrast-[1.05] group-hover:brightness-105 group-hover:scale-105 transition-all duration-500"
                    unoptimized
                  />

                  {/* Subtle Top & Bottom Gradient Overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-95" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-transparent opacity-50" />

                  {/* Top Badges: Role Icon & Difficulty */}
                  <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                    {/* Primary Role Tag */}
                    <div className="flex items-center gap-1 rounded-md bg-black/70 backdrop-blur-md px-2 py-0.5 border border-white/10 shadow-sm">
                      <Image
                        src={getPositionIconUrl(posKey)}
                        alt={primaryPos}
                        width={12}
                        height={12}
                        className="h-3 w-3 object-contain opacity-90"
                        unoptimized
                      />
                      <span className="text-[10px] font-bold text-zinc-300 uppercase tracking-tight">
                        {primaryPos}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Content Area */}
                  <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-3.5 flex flex-col justify-end">
                    {/* Champion Name */}
                    <h3 className="text-sm sm:text-base font-black tracking-tight text-white group-hover:text-amber-400 transition-colors drop-shadow-md truncate">
                      {champ.name}
                    </h3>
                    {/* Champion Title */}
                    <p className="text-[11px] text-zinc-400 font-medium capitalize truncate drop-shadow">
                      {champ.title}
                    </p>

                    {/* Role & Class Tags */}
                    <div className="flex flex-wrap items-center gap-1 mt-2">
                      {champ.tags?.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center rounded-md bg-white/[0.08] group-hover:bg-white/[0.14] border border-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-300 transition-colors backdrop-blur-sm"
                        >
                          {tag}
                        </span>
                      ))}
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
            {t('championWiki.noChampions')}
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
            <span>{t('championWiki.resetFilters')}</span>
          </button>
        </div>
      )}
    </div>
  );
}
