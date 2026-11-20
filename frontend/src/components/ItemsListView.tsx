'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Search,
  Sparkles,
  Shield,
  Swords,
  Wand2,
  Layers,
  ChevronRight,
  RotateCcw,
  X,
  Footprints,
  Package,
  Coins,
  MapPin,
  SlidersHorizontal,
  ArrowUpRight,
  GitFork,
  ArrowLeft,
  Check,
  Info,
} from 'lucide-react';
import { useTranslation } from '@/i18n/LanguageContext';
import { getMajorMinorPatch, getDDragonVersion, getItemIconUrl } from '@/lib/ddragon';
import { fetchItemsRosterApi } from '@/lib/api';
import { fetchDDragonItemsList } from '@/lib/ddragon';
import { ItemRosterItem } from '@/types';

type CategoryFilter = 'ALL' | 'ATTACK' | 'MAGIC' | 'DEFENSE' | 'MOVEMENT' | 'STARTER_CONSUMABLE';
type MapFilter = '11' | '12' | '30' | 'ALL';
type TierFilter = 'ALL' | 'legendary' | 'epic' | 'basic' | 'boots' | 'starter' | 'consumable';
type SortOption = 'gold-desc' | 'gold-asc' | 'name-asc' | 'name-desc';

interface CategoryOption {
  key: CategoryFilter;
  labelKey: string;
  fallbackLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_OPTIONS: CategoryOption[] = [
  { key: 'ALL', labelKey: 'itemsWiki.allCategories', fallbackLabel: 'Alle Kategorien', icon: Layers },
  { key: 'ATTACK', labelKey: 'itemsWiki.catAttack', fallbackLabel: 'Angriff', icon: Swords },
  { key: 'MAGIC', labelKey: 'itemsWiki.catMagic', fallbackLabel: 'Magie', icon: Wand2 },
  { key: 'DEFENSE', labelKey: 'itemsWiki.catDefense', fallbackLabel: 'Verteidigung', icon: Shield },
  { key: 'MOVEMENT', labelKey: 'itemsWiki.catMovement', fallbackLabel: 'Bewegung', icon: Footprints },
  { key: 'STARTER_CONSUMABLE', labelKey: 'itemsWiki.catStarterConsumable', fallbackLabel: 'Start & Verbrauch', icon: Package },
];

/**
 * Transforms DDragon XML-style tags into styled HTML
 */
function renderItemDescription(rawDesc: string): string {
  if (!rawDesc) return '';
  return rawDesc
    .replace(/<mainText>/gi, '<div class="space-y-2">')
    .replace(/<\/mainText>/gi, '</div>')
    .replace(/<stats>/gi, '<div class="py-2.5 my-2 border-y border-white/[0.08] text-sm text-zinc-200 font-medium space-y-1">')
    .replace(/<\/stats>/gi, '</div>')
    .replace(/<attention>/gi, '<span class="text-amber-300 font-bold">')
    .replace(/<\/attention>/gi, '</span>')
    .replace(/<passive>/gi, '<span class="inline-flex items-center gap-1 rounded bg-amber-500/15 text-amber-300 font-bold px-1.5 py-0.5 text-xs mr-1 border border-amber-500/30">PASSIV: ')
    .replace(/<\/passive>/gi, '</span>')
    .replace(/<active>/gi, '<span class="inline-flex items-center gap-1 rounded bg-cyan-500/15 text-cyan-300 font-bold px-1.5 py-0.5 text-xs mr-1 border border-cyan-500/30">AKTIV: ')
    .replace(/<\/active>/gi, '</span>')
    .replace(/<physicalDamage>/gi, '<span class="text-orange-400 font-semibold">')
    .replace(/<\/physicalDamage>/gi, '</span>')
    .replace(/<magicDamage>/gi, '<span class="text-sky-400 font-semibold">')
    .replace(/<\/magicDamage>/gi, '</span>')
    .replace(/<trueDamage>/gi, '<span class="text-zinc-100 font-semibold">')
    .replace(/<\/trueDamage>/gi, '</span>')
    .replace(/<speed>/gi, '<span class="text-lime-400 font-semibold">')
    .replace(/<\/speed>/gi, '</span>')
    .replace(/<shield>/gi, '<span class="text-yellow-400 font-semibold">')
    .replace(/<\/shield>/gi, '</span>')
    .replace(/<healing>/gi, '<span class="text-emerald-400 font-semibold">')
    .replace(/<\/healing>/gi, '</span>')
    .replace(/<rules>/gi, '<span class="text-zinc-400 text-xs italic block mt-1">')
    .replace(/<\/rules>/gi, '</span>')
    .replace(/<scaleAP>/gi, '<span class="text-cyan-400 font-medium">')
    .replace(/<\/scaleAP>/gi, '</span>')
    .replace(/<scaleAD>/gi, '<span class="text-orange-400 font-medium">')
    .replace(/<\/scaleAD>/gi, '</span>')
    .replace(/<scaleHealth>/gi, '<span class="text-emerald-400 font-medium">')
    .replace(/<\/scaleHealth>/gi, '</span>')
    .replace(/<status>/gi, '<span class="text-purple-400 font-medium">')
    .replace(/<\/status>/gi, '</span>')
    .replace(/<keywordMajor>/gi, '<span class="text-amber-200 font-bold">')
    .replace(/<\/keywordMajor>/gi, '</span>')
    .replace(/<lifeSteal>/gi, '<span class="text-rose-400 font-medium">')
    .replace(/<\/lifeSteal>/gi, '</span>')
    .replace(/&nbsp;/g, ' ');
}

/**
 * Returns tier styling: border, badge colors, and glow
 */
function getTierStyle(tier: string) {
  switch (tier) {
    case 'legendary':
      return {
        border: 'border-amber-500/50 hover:border-amber-400',
        badgeBg: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
        label: 'Legendär',
        glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.25)]',
      };
    case 'epic':
      return {
        border: 'border-purple-500/40 hover:border-purple-400',
        badgeBg: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
        label: 'Episch',
        glow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.25)]',
      };
    case 'boots':
      return {
        border: 'border-emerald-500/40 hover:border-emerald-400',
        badgeBg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
        label: 'Stiefel',
        glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.25)]',
      };
    case 'starter':
      return {
        border: 'border-blue-500/40 hover:border-blue-400',
        badgeBg: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
        label: 'Start',
        glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.25)]',
      };
    case 'consumable':
      return {
        border: 'border-teal-500/40 hover:border-teal-400',
        badgeBg: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
        label: 'Verbrauch',
        glow: 'group-hover:shadow-[0_0_20px_rgba(20,184,166,0.25)]',
      };
    case 'basic':
    default:
      return {
        border: 'border-zinc-700/60 hover:border-zinc-500',
        badgeBg: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        label: 'Basis',
        glow: 'group-hover:shadow-[0_0_15px_rgba(255,255,255,0.1)]',
      };
  }
}

export default function ItemsListView() {
  const { t, locale } = useTranslation();
  const [items, setItems] = useState<ItemRosterItem[]>([]);
  const [version, setVersion] = useState<string>(() => getDDragonVersion());
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Sorting state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('ALL');
  const [selectedMap, setSelectedMap] = useState<MapFilter>('11'); // Default: Summoner's Rift
  const [selectedTier, setSelectedTier] = useState<TierFilter>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('gold-desc');
  const [onlyPurchasable, setOnlyPurchasable] = useState(true);

  // Active item detail modal
  const [activeItem, setActiveItem] = useState<ItemRosterItem | null>(null);

  // Load items from API with DDragon fallback
  useEffect(() => {
    setIsLoading(true);
    fetchItemsRosterApi(locale)
      .then((res) => {
        if (res && res.items && res.items.length > 0) {
          setItems(res.items);
          if (res.version) setVersion(res.version);
          return;
        }
        return fetchDDragonItemsList(locale).then((fb) => {
          setItems(fb.items);
          if (fb.version) setVersion(fb.version);
        });
      })
      .catch(() => {
        return fetchDDragonItemsList(locale).then((fb) => {
          setItems(fb.items);
          if (fb.version) setVersion(fb.version);
        });
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [locale]);

  const patchString = getMajorMinorPatch(version);

  // Keyboard shortcut to close modal (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveItem(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset all filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('ALL');
    setSelectedMap('11');
    setSelectedTier('ALL');
    setSortBy('gold-desc');
    setOnlyPurchasable(true);
  };

  const isFilterActive =
    searchQuery.trim().length > 0 ||
    selectedCategory !== 'ALL' ||
    selectedMap !== '11' ||
    selectedTier !== 'ALL' ||
    sortBy !== 'gold-desc' ||
    !onlyPurchasable;

  // Filter & Sort items
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const list = items.filter((item) => {
      // 1. Purchasable filter
      if (onlyPurchasable && !item.inStore) {
        return false;
      }

      // 2. Map filter
      if (selectedMap !== 'ALL') {
        if (item.maps && item.maps[selectedMap] === false) {
          return false;
        }
      }

      // 3. Category filter
      if (selectedCategory !== 'ALL') {
        if (!item.categories || !item.categories.includes(selectedCategory)) {
          return false;
        }
      }

      // 4. Tier filter
      if (selectedTier !== 'ALL') {
        if (item.tier !== selectedTier) {
          return false;
        }
      }

      // 5. Search query
      if (q) {
        const nameMatch = item.name.toLowerCase().includes(q);
        const colloqMatch = (item.colloq || '').toLowerCase().includes(q);
        const plaintextMatch = (item.plaintext || '').toLowerCase().includes(q);
        const tagMatch = (item.tags || []).some((t) => t.toLowerCase().includes(q));
        if (!nameMatch && !colloqMatch && !plaintextMatch && !tagMatch) {
          return false;
        }
      }

      return true;
    });

    // Sort list
    list.sort((a, b) => {
      switch (sortBy) {
        case 'gold-desc':
          return b.gold.total - a.gold.total || a.name.localeCompare(b.name);
        case 'gold-asc':
          return a.gold.total - b.gold.total || a.name.localeCompare(b.name);
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        default:
          return 0;
      }
    });

    return list;
  }, [items, searchQuery, selectedCategory, selectedMap, selectedTier, sortBy, onlyPurchasable]);

  // Navigate to item inside modal
  const handleSelectComponent = useCallback(
    (componentId: string) => {
      const found = items.find((i) => i.id === componentId);
      if (found) {
        setActiveItem(found);
      }
    },
    [items]
  );

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-8 space-y-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs font-medium text-zinc-400">
        <Link href={`/${locale}`} className="hover:text-amber-400 transition-colors">
          {t('common.backToHome') || 'Startseite'}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
        <span className="text-white font-semibold">{t('nav.items') || 'Items'}</span>
      </nav>

      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 shadow-sm">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Patch {patchString} Items</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
            {t('itemsWiki.pageTitle') || 'Item Enzyklopädie & Rezepte'}
          </h1>
          <p className="mt-2 text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
            {t('itemsWiki.pageSubtitle', {
              count: items.length || 863,
              patch: patchString,
            }) || 'Vollständige Übersicht aller League of Legends Gegenstände, Werte, Goldkosten und Baupfade.'}
          </p>
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 px-4 py-3 shrink-0 shadow-lg backdrop-blur-md">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Coins className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
              {t('itemsWiki.goldCost') || 'Gegenstände'}
            </span>
            <span className="text-lg font-black text-white">
              {isLoading ? '...' : `${filteredItems.length} / ${items.length}`}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 p-4 sm:p-5 shadow-xl backdrop-blur-md space-y-4">
        {/* Top Controls: Search Input + Sorting + Map Selector + Reset Button */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          {/* Search Box */}
          <div className="group relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400 transition-colors group-focus-within:text-amber-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('itemsWiki.searchPlaceholder') || 'Item suchen (z.B. Rabadon, Klinge der Unendlichkeit, IE)...'}
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

          {/* Map Selector */}
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-zinc-400 shrink-0 hidden sm:block" />
            <select
              value={selectedMap}
              onChange={(e) => setSelectedMap(e.target.value as MapFilter)}
              className="h-10 rounded-xl border border-white/[0.08] bg-[#121721] px-3 text-xs sm:text-sm font-medium text-zinc-200 focus:outline-none focus:border-amber-400/60"
            >
              <option value="11">{t('itemsWiki.mapSR') || "Kluft der Beschwörer (5v5)"}</option>
              <option value="12">{t('itemsWiki.mapARAM') || 'ARAM (Heulende Schlucht)'}</option>
              <option value="30">{t('itemsWiki.mapArena') || 'Arena'}</option>
              <option value="ALL">{t('itemsWiki.mapAll') || 'Alle Karten & Modi'}</option>
            </select>
          </div>

          {/* Tier Selector */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-zinc-400 shrink-0 hidden sm:block" />
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value as TierFilter)}
              className="h-10 rounded-xl border border-white/[0.08] bg-[#121721] px-3 text-xs sm:text-sm font-medium text-zinc-200 focus:outline-none focus:border-amber-400/60"
            >
              <option value="ALL">{t('itemsWiki.allTiers') || 'Alle Stufen'}</option>
              <option value="legendary">{t('itemsWiki.tierLegendary') || 'Legendär & Vollständig'}</option>
              <option value="epic">{t('itemsWiki.tierEpic') || 'Episch'}</option>
              <option value="basic">{t('itemsWiki.tierBasic') || 'Basis'}</option>
              <option value="boots">{t('itemsWiki.tierBoots') || 'Stiefel'}</option>
              <option value="starter">{t('itemsWiki.tierStarter') || 'Startgegenstände'}</option>
              <option value="consumable">{t('itemsWiki.tierConsumable') || 'Verbrauchsgüter'}</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="h-10 rounded-xl border border-white/[0.08] bg-[#121721] px-3 text-xs sm:text-sm font-medium text-zinc-200 focus:outline-none focus:border-amber-400/60"
          >
            <option value="gold-desc">{t('itemsWiki.sortGoldDesc') || 'Gold: Teuerste zuerst'}</option>
            <option value="gold-asc">{t('itemsWiki.sortGoldAsc') || 'Gold: Günstigste zuerst'}</option>
            <option value="name-asc">{t('itemsWiki.sortNameAsc') || 'Name (A - Z)'}</option>
            <option value="name-desc">{t('itemsWiki.sortNameDesc') || 'Name (Z - A)'}</option>
          </select>

          {/* Reset Filters Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-all shrink-0"
              title={t('itemsWiki.resetFilters') || 'Filter zurücksetzen'}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>{t('itemsWiki.resetFilters') || 'Zurücksetzen'}</span>
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-2 border-t border-white/[0.06]">
          {CATEGORY_OPTIONS.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                  isSelected
                    ? 'border border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-md shadow-amber-500/10'
                    : 'border border-white/[0.06] bg-white/[0.02] text-zinc-400 hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isSelected ? 'text-amber-400' : 'text-zinc-500'}`} />
                <span>{t(cat.labelKey) || cat.fallbackLabel}</span>
              </button>
            );
          })}

          {/* Only Purchasable Toggle */}
          <label className="ml-auto flex items-center gap-2 cursor-pointer select-none text-xs text-zinc-400 hover:text-white transition-colors py-1">
            <input
              type="checkbox"
              checked={onlyPurchasable}
              onChange={(e) => setOnlyPurchasable(e.target.checked)}
              className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0 focus:ring-offset-0"
            />
            <span>{t('itemsWiki.onlyPurchasable') || 'Nur Shop-Items'}</span>
          </label>
        </div>
      </div>

      {/* Items Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
          {[...Array(24)].map((_, i) => (
            <div
              key={i}
              className="relative aspect-[4/5] w-full rounded-2xl border border-white/[0.06] bg-zinc-900/40 p-4 animate-pulse flex flex-col justify-end"
            >
              <div className="h-5 w-24 bg-white/10 rounded mb-2" />
              <div className="h-3 w-16 bg-white/5 rounded" />
            </div>
          ))}
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 sm:gap-4">
          {filteredItems.map((item) => {
            const style = getTierStyle(item.tier);
            const iconUrl = getItemIconUrl(item.id, version);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveItem(item)}
                className={`group relative flex flex-col text-left rounded-2xl overflow-hidden border bg-gradient-to-br from-[#0e131d] via-[#090d14] to-[#0a0e16] p-3 sm:p-3.5 transition-all duration-200 hover:scale-[1.03] active:scale-[0.98] ${style.border} ${style.glow}`}
              >
                {/* Top Row: Icon + Price */}
                <div className="flex items-start justify-between gap-2 mb-2.5">
                  <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 rounded-xl overflow-hidden border border-white/10 bg-black/50 shadow-md">
                    <Image
                      src={iconUrl}
                      alt={item.name}
                      fill
                      sizes="56px"
                      className="object-cover group-hover:scale-105 transition-transform"
                      unoptimized
                    />
                  </div>

                  {/* Gold Price Badge */}
                  <div className="flex flex-col items-end">
                    <div className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 border border-amber-500/25 px-2 py-0.5 text-xs font-black text-amber-300">
                      <Coins className="h-3 w-3 text-amber-400" />
                      <span>{item.gold.total}</span>
                    </div>

                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded mt-1 border ${style.badgeBg}`}>
                      {style.label}
                    </span>
                  </div>
                </div>

                {/* Item Name */}
                <h3 className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                  {item.name}
                </h3>

                {/* Plaintext / Short summary */}
                <p className="mt-1 text-[11px] text-zinc-400 line-clamp-2 leading-relaxed h-8">
                  {item.plaintext || (item.formattedStats?.[0] ? `${item.formattedStats[0].name}: ${item.formattedStats[0].value}` : 'Keine Beschreibung')}
                </p>

                {/* Key Stats Pills */}
                {item.formattedStats && item.formattedStats.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {item.formattedStats.slice(0, 2).map((st, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-zinc-300"
                        style={{ color: st.color }}
                      >
                        {st.value} {st.name}
                      </span>
                    ))}
                    {item.formattedStats.length > 2 && (
                      <span className="text-[10px] text-zinc-500 px-1 py-0.5">
                        +{item.formattedStats.length - 2}
                      </span>
                    )}
                  </div>
                )}

                {/* Bottom Indicators: Build from / into counts */}
                <div className="mt-auto pt-2.5 flex items-center justify-between text-[10px] text-zinc-500 border-t border-white/[0.04]">
                  {item.from && item.from.length > 0 ? (
                    <span className="flex items-center gap-1">
                      <GitFork className="h-2.5 w-2.5 text-zinc-400" />
                      <span>{item.from.length} Vorstufen</span>
                    </span>
                  ) : (
                    <span>Basis</span>
                  )}

                  {item.into && item.into.length > 0 && (
                    <span className="flex items-center gap-1 text-amber-400/80">
                      <span>{item.into.length} Ausbauten</span>
                      <ArrowUpRight className="h-2.5 w-2.5" />
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 py-16 px-4 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/80 border border-white/10 text-zinc-500 mb-4">
            <Search className="h-8 w-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {t('itemsWiki.noItemsFound') || 'Keine Items gefunden'}
          </h3>
          <p className="text-sm text-zinc-400 max-w-md mb-6">
            {t('itemsWiki.noItemsDesc') || 'Passe deine Suchbegriffe oder Filter an, um passende Gegenstände zu finden.'}
          </p>
          <button
            type="button"
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{t('itemsWiki.resetFilters') || 'Filter zurücksetzen'}</span>
          </button>
        </div>
      )}

      {/* Item Detail Modal */}
      {activeItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border border-white/15 bg-gradient-to-b from-[#111723] via-[#0b0e14] to-[#080b0f] p-5 sm:p-7 shadow-2xl space-y-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="relative h-16 w-16 sm:h-20 sm:w-20 rounded-2xl overflow-hidden border-2 border-amber-500/50 bg-black/60 shadow-xl shrink-0">
                  <Image
                    src={getItemIconUrl(activeItem.id, version)}
                    alt={activeItem.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                    unoptimized
                  />
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getTierStyle(activeItem.tier).badgeBg}`}>
                      {getTierStyle(activeItem.tier).label}
                    </span>
                    {activeItem.requiredChampion && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                        {t('itemsWiki.exclusiveChampion') || 'Exklusiv'}: {activeItem.requiredChampion}
                      </span>
                    )}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black text-white">{activeItem.name}</h2>
                  {activeItem.plaintext && (
                    <p className="text-xs sm:text-sm text-zinc-400 mt-0.5 italic">{activeItem.plaintext}</p>
                  )}
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setActiveItem(null)}
                className="h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
                title={t('itemsWiki.close') || 'Schließen'}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Price Overview Card */}
            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl border border-white/[0.08] bg-white/[0.02]">
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  {t('itemsWiki.totalCost') || 'Gesamtkosten'}
                </span>
                <span className="text-lg font-black text-amber-300 flex items-center gap-1 mt-0.5">
                  <Coins className="h-4 w-4 text-amber-400" />
                  {activeItem.gold.total}
                </span>
              </div>
              <div className="flex flex-col border-x border-white/[0.06] px-3">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  {t('itemsWiki.recipeCost') || 'Rezeptkosten'}
                </span>
                <span className="text-lg font-black text-zinc-200 mt-0.5">
                  {activeItem.gold.base}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  {t('itemsWiki.sellValue') || 'Verkaufswert'}
                </span>
                <span className="text-lg font-black text-emerald-400 mt-0.5">
                  {activeItem.gold.sell}
                </span>
              </div>
            </div>

            {/* Formatted Stats Grid */}
            {activeItem.formattedStats && activeItem.formattedStats.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5 text-amber-400" />
                  <span>{t('itemsWiki.statsTitle') || 'Attribute & Werte'}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {activeItem.formattedStats.map((st, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06]"
                    >
                      <span className="text-xs text-zinc-300">{st.name}</span>
                      <span className="text-sm font-black" style={{ color: st.color || '#f59e0b' }}>
                        {st.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Formatted Description & Passives */}
            {activeItem.description && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  {t('itemsWiki.effectsTitle') || 'Passiv- & Aktiv-Effekte'}
                </h4>
                <div
                  className="p-4 rounded-2xl border border-white/[0.08] bg-black/40 text-xs sm:text-sm text-zinc-300 leading-relaxed space-y-2"
                  dangerouslySetInnerHTML={{
                    __html: renderItemDescription(activeItem.description),
                  }}
                />
              </div>
            )}

            {/* Recipe / Build Path ("Baut aus") */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <GitFork className="h-3.5 w-3.5 text-amber-400" />
                <span>{t('itemsWiki.buildsFrom') || 'Rezept / Vorstufen'}</span>
              </h4>

              {activeItem.fromItems && activeItem.fromItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {activeItem.fromItems.map((comp) => (
                    <button
                      key={comp.id}
                      type="button"
                      onClick={() => handleSelectComponent(comp.id)}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-amber-400/50 hover:bg-white/[0.06] transition-all text-left group"
                    >
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                        <Image
                          src={comp.icon}
                          alt={comp.name}
                          fill
                          sizes="40px"
                          className="object-cover group-hover:scale-105 transition-transform"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                          {comp.name}
                        </div>
                        <div className="text-[11px] font-semibold text-amber-400">
                          {comp.totalGold} G
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic bg-white/[0.01] p-3 rounded-xl border border-white/[0.04]">
                  {t('itemsWiki.noRecipe') || 'Basis-Gegenstand (keine Vorstufen erforderlich)'}
                </p>
              )}
            </div>

            {/* Builds into ("Baut zu") */}
            <div className="space-y-2.5">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <ArrowUpRight className="h-3.5 w-3.5 text-amber-400" />
                <span>{t('itemsWiki.buildsInto') || 'Ausbauten / Baut zu'}</span>
              </h4>

              {activeItem.intoItems && activeItem.intoItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {activeItem.intoItems.map((upgrade) => (
                    <button
                      key={upgrade.id}
                      type="button"
                      onClick={() => handleSelectComponent(upgrade.id)}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:border-amber-400/50 hover:bg-white/[0.06] transition-all text-left group"
                    >
                      <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-black/40">
                        <Image
                          src={upgrade.icon}
                          alt={upgrade.name}
                          fill
                          sizes="40px"
                          className="object-cover group-hover:scale-105 transition-transform"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate group-hover:text-amber-300 transition-colors">
                          {upgrade.name}
                        </div>
                        <div className="text-[11px] font-semibold text-amber-400">
                          {upgrade.totalGold} G
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic bg-white/[0.01] p-3 rounded-xl border border-white/[0.04]">
                  {t('itemsWiki.noUpgrades') || 'Vollständiger Gegenstand (keine weiteren Ausbauten)'}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
