'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  Shield,
  Swords,
  Wand2,
  Crosshair,
  HeartHandshake,
  Skull,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import {
  fetchDDragonChampionsList,
  DDragonChampionSummary,
  getChampionIconUrl,
  getMajorMinorPatch,
  getDDragonVersion,
} from '@/lib/ddragon';

type RoleTag = 'ALL' | 'Fighter' | 'Mage' | 'Assassin' | 'Marksman' | 'Tank' | 'Support';

interface RoleFilterOption {
  key: RoleTag;
  labelKey: string;
  fallbackLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ROLE_FILTERS: RoleFilterOption[] = [
  { key: 'ALL', labelKey: 'championWiki.filterAll', fallbackLabel: 'Alle', icon: Layers },
  { key: 'Fighter', labelKey: 'championWiki.filterFighter', fallbackLabel: 'Kämpfer', icon: Swords },
  { key: 'Mage', labelKey: 'championWiki.filterMage', fallbackLabel: 'Magier', icon: Wand2 },
  { key: 'Assassin', labelKey: 'championWiki.filterAssassin', fallbackLabel: 'Assassinen', icon: Skull },
  { key: 'Marksman', labelKey: 'championWiki.filterMarksman', fallbackLabel: 'Schützen', icon: Crosshair },
  { key: 'Tank', labelKey: 'championWiki.filterTank', fallbackLabel: 'Tanks', icon: Shield },
  { key: 'Support', labelKey: 'championWiki.filterSupport', fallbackLabel: 'Unterstützer', icon: HeartHandshake },
];

export default function ChampionsListView() {
  const { t, locale } = useTranslation();
  const [champions, setChampions] = useState<DDragonChampionSummary[]>([]);
  const [version, setVersion] = useState<string>(() => getDDragonVersion());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleTag>('ALL');

  useEffect(() => {
    setIsLoading(true);
    fetchDDragonChampionsList(locale)
      .then((res) => {
        setChampions(res.champions);
        if (res.version) setVersion(res.version);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [locale]);

  const patchString = getMajorMinorPatch(version);

  // Filtered champions
  const filteredChampions = useMemo(() => {
    return champions.filter((champ) => {
      // Role filter
      if (selectedRole !== 'ALL') {
        if (!champ.tags || !champ.tags.includes(selectedRole)) {
          return false;
        }
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = champ.name.toLowerCase().includes(q);
        const matchesTitle = champ.title.toLowerCase().includes(q);
        const matchesTag = champ.tags?.some((t) => t.toLowerCase().includes(q));
        if (!matchesName && !matchesTitle && !matchesTag) {
          return false;
        }
      }

      return true;
    });
  }, [champions, selectedRole, searchQuery]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Patch {patchString} Champions</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            {t('championWiki.pageTitle')}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            {t('championWiki.pageSubtitle', {
              count: champions.length || 173,
              patch: patchString,
            })}
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 px-4 py-3 shrink-0 shadow-lg">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Shield className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {t('championWiki.role')}
            </span>
            <span className="text-lg font-black text-white">
              {isLoading ? '...' : `${filteredChampions.length} / ${champions.length}`}
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 mb-8">
        {/* Role Filters */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-1.5 shadow-md">
          {ROLE_FILTERS.map((r) => {
            const Icon = r.icon;
            const isActive = selectedRole === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setSelectedRole(r.key)}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-zinc-400 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-amber-400' : 'text-zinc-400'}`} />
                <span>{t(r.labelKey) || r.fallbackLabel}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[260px] lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('championWiki.searchPlaceholder')}
            className="w-full rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 pl-10 pr-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/50 shadow-md transition-all"
          />
        </div>
      </div>

      {/* Champions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="flex flex-col rounded-2xl border border-white/[0.06] bg-black/30 p-3.5 animate-pulse"
            >
              <div className="aspect-square w-full rounded-xl bg-white/5 mb-3" />
              <div className="h-4 w-20 bg-white/5 rounded mb-1.5" />
              <div className="h-3 w-14 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : filteredChampions.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredChampions.map((champ) => {
            const slug = champ.id.toLowerCase();
            return (
              <Link
                key={champ.id}
                href={`/${locale}/champions/${slug}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 hover:bg-[#121824] hover:border-amber-500/40 p-3 transition-all duration-200 shadow-xl hover:scale-[1.02] active:scale-98"
              >
                {/* Champion Avatar */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-white/10 group-hover:border-amber-500/40 transition-colors shadow-md mb-2.5">
                  <Image
                    src={getChampionIconUrl(champ.id, version)}
                    alt={champ.name}
                    width={120}
                    height={120}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    unoptimized
                  />
                  {/* Difficulty level indicator */}
                  <div className="absolute bottom-1.5 right-1.5 flex items-center gap-0.5 rounded-md bg-black/80 px-1.5 py-0.5 border border-white/10 backdrop-blur-sm">
                    <span className="text-[9px] font-bold text-zinc-400 uppercase">
                      Lvl {champ.info?.difficulty ?? 5}
                    </span>
                  </div>
                </div>

                {/* Champion Details */}
                <div className="flex flex-col min-w-0">
                  <span className="font-extrabold text-sm text-white group-hover:text-amber-300 truncate transition-colors">
                    {champ.name}
                  </span>
                  <span className="text-[11px] text-zinc-400 truncate capitalize font-medium">
                    {champ.title}
                  </span>

                  {/* Role Tags */}
                  <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/[0.05]">
                    {champ.tags?.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-black/40 border border-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold text-zinc-400 uppercase tracking-tight"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center text-zinc-500">
          <Shield className="h-12 w-12 text-zinc-600 mb-3 opacity-40" />
          <p className="text-lg font-bold text-zinc-300 mb-1">
            {t('championWiki.noChampions')}
          </p>
          <p className="text-xs text-zinc-500 max-w-sm">
            {searchQuery
              ? `Keine Treffer für "${searchQuery}". Überprüfe deine Rechtschreibung oder setze den Rollenfilter zurück.`
              : 'Aktuell sind keine Champions für diese Auswahl verfügbar.'}
          </p>
        </div>
      )}
    </div>
  );
}
