'use client';

import { useState, useRef, useEffect, useMemo, FormEvent } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Search,
  ChevronDown,
  X,
  History,
  ArrowRight,
  Sparkles,
  Package,
  Coins,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecentSearchItem } from '@/types';
import { useTranslation } from '@/i18n/LanguageContext';
import { getChampionIconUrl, getItemIconUrl } from '@/lib/ddragon';
import championPositionsRaw from '@/lib/championPositions.json';
import { fetchItemsRosterApi } from '@/lib/api';
import { fetchDDragonItemsList } from '@/lib/ddragon';

const REGIONS = [
  { code: 'euw', label: 'EUW' },
  { code: 'eune', label: 'EUNE' },
  { code: 'na', label: 'NA' },
  { code: 'kr', label: 'KR' },
];

interface ItemSearchItem {
  id: string;
  name: string;
  gold: number;
  colloq?: string;
}

// Module-level cache across re-renders
const cachedItemsMap: Record<string, ItemSearchItem[]> = {};

interface SearchBarProps {
  compact?: boolean;
  defaultRegion?: string;
  className?: string;
}

export default function SearchBar({
  compact = false,
  defaultRegion = 'euw',
  className,
}: SearchBarProps) {
  const router = useRouter();
  const { locale } = useTranslation();
  const [region, setRegion] = useState(defaultRegion);
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [recentList, setRecentList] = useState<RecentSearchItem[]>([]);
  const [itemsList, setItemsList] = useState<ItemSearchItem[]>(() => cachedItemsMap[locale] || []);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load items for instant client-side autocomplete
  useEffect(() => {
    if (cachedItemsMap[locale] && cachedItemsMap[locale].length > 0) {
      setItemsList(cachedItemsMap[locale]);
      return;
    }

    fetchItemsRosterApi(locale)
      .then((res) => {
        if (res && res.items && res.items.length > 0) {
          const mapped: ItemSearchItem[] = res.items.map((it) => ({
            id: String(it.id),
            name: it.name,
            gold: it.gold?.total ?? 0,
            colloq: it.colloq || '',
          }));
          cachedItemsMap[locale] = mapped;
          setItemsList(mapped);
          return;
        }
        return fetchDDragonItemsList(locale).then((fb) => {
          const mapped: ItemSearchItem[] = fb.items.map((it) => ({
            id: String(it.id),
            name: it.name,
            gold: it.gold?.total ?? 0,
            colloq: it.colloq || '',
          }));
          cachedItemsMap[locale] = mapped;
          setItemsList(mapped);
        });
      })
      .catch(() => {
        fetchDDragonItemsList(locale).then((fb) => {
          const mapped: ItemSearchItem[] = fb.items.map((it) => ({
            id: String(it.id),
            name: it.name,
            gold: it.gold?.total ?? 0,
            colloq: it.colloq || '',
          }));
          cachedItemsMap[locale] = mapped;
          setItemsList(mapped);
        });
      });
  }, [locale]);

  // Load recent searches from localStorage
  const loadRecentSearches = () => {
    try {
      const raw = localStorage.getItem('rifthero_recent_searches');
      if (raw) {
        setRecentList(JSON.parse(raw));
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    loadRecentSearches();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const trimmedQuery = input.trim().toLowerCase();

  // Champions matching
  const matchingChamps = useMemo(() => {
    if (!trimmedQuery) return [];
    const list = Object.values(championPositionsRaw as Record<string, any>);
    return list
      .filter((c) => c.name.toLowerCase().includes(trimmedQuery) || c.id.toLowerCase().includes(trimmedQuery))
      .slice(0, 4);
  }, [trimmedQuery]);

  // Items matching
  const matchingItems = useMemo(() => {
    if (!trimmedQuery || !itemsList || itemsList.length === 0) return [];
    return itemsList
      .filter((it) => {
        const nameMatch = it.name.toLowerCase().includes(trimmedQuery);
        const colloqMatch = it.colloq ? it.colloq.toLowerCase().includes(trimmedQuery) : false;
        return nameMatch || colloqMatch;
      })
      .slice(0, 4);
  }, [trimmedQuery, itemsList]);

  const navigateToSummoner = (gameName: string, tagLine: string, reg: string) => {
    // Save to LocalStorage
    try {
      const raw = localStorage.getItem('rifthero_recent_searches');
      const list: RecentSearchItem[] = raw ? JSON.parse(raw) : [];
      const updated = [
        {
          gameName,
          tagLine,
          region: reg,
          timestamp: Date.now(),
        },
        ...list.filter(
          (item) =>
            !(
              item.gameName.toLowerCase() === gameName.toLowerCase() &&
              item.tagLine.toLowerCase() === tagLine.toLowerCase() &&
              item.region.toLowerCase() === reg.toLowerCase()
            )
        ),
      ].slice(0, 8);
      localStorage.setItem('rifthero_recent_searches', JSON.stringify(updated));
      setRecentList(updated);
    } catch {
      // Ignore
    }

    setIsFocused(false);
    const formattedTag = `${gameName}-${tagLine}`;
    router.push(`/${locale}/summoner/${reg}/${encodeURIComponent(formattedTag)}`);
  };

  const navigateToChampion = (champId: string) => {
    setIsFocused(false);
    router.push(`/${locale}/champions/${champId.toLowerCase()}`);
  };

  const navigateToItem = (item: { id: string; name: string }) => {
    setIsFocused(false);
    router.push(`/${locale}/items?item=${encodeURIComponent(item.id)}&search=${encodeURIComponent(item.name)}`);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = input.trim();
    if (!trimmed) return;

    // 1. Explicit Riot ID format with '#'
    if (trimmed.includes('#')) {
      const parts = trimmed.split('#');
      const gameName = parts[0].trim();
      const tagLine = parts[1].trim() || region.toUpperCase();
      navigateToSummoner(gameName, tagLine, region);
      return;
    }

    const lower = trimmed.toLowerCase();

    // 2. Exact or leading match for Champion (e.g. "Ahri", "Jinx")
    const champMatch = (Object.values(championPositionsRaw as Record<string, any>)).find(
      (c) => c.name.toLowerCase() === lower || c.id.toLowerCase() === lower
    );
    if (champMatch) {
      navigateToChampion(champMatch.id);
      return;
    }

    // 3. Exact match for Item
    if (itemsList && itemsList.length > 0) {
      const itemMatch = itemsList.find(
        (it) => it.name.toLowerCase() === lower || it.id === trimmed
      );
      if (itemMatch) {
        navigateToItem(itemMatch);
        return;
      }
    }

    // 4. Default: Summoner Search
    navigateToSummoner(trimmed, region.toUpperCase(), region);
  };

  const clearRecent = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      localStorage.removeItem('rifthero_recent_searches');
      setRecentList([]);
    } catch {
      // Ignore
    }
  };

  const removeSingleRecent = (
    e: React.MouseEvent,
    target: RecentSearchItem
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = recentList.filter(
      (item) =>
        !(
          item.gameName.toLowerCase() === target.gameName.toLowerCase() &&
          item.tagLine.toLowerCase() === target.tagLine.toLowerCase() &&
          item.region.toLowerCase() === target.region.toLowerCase()
        )
    );
    setRecentList(updated);
    try {
      localStorage.setItem('rifthero_recent_searches', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          'group flex items-center transition-all duration-200',
          'border border-white/[0.08] bg-[#0c1017]/90 backdrop-blur-xl shadow-2xl',
          'focus-within:border-orange-500/70 focus-within:ring-2 focus-within:ring-orange-500/20 focus-within:shadow-[0_0_30px_rgba(249,115,22,0.18)]',
          compact
            ? 'h-10 rounded-xl px-2.5'
            : 'h-14 sm:h-16 rounded-2xl px-3 sm:px-4'
        )}
      >
        {/* Region Selector */}
        <div
          className={cn(
            'relative flex items-center border-r border-white/[0.08] pr-2.5 mr-1.5 shrink-0',
            compact ? 'h-6' : 'h-8 sm:h-9'
          )}
        >
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="cursor-pointer appearance-none bg-transparent pr-5 text-xs sm:text-sm font-black uppercase tracking-wider text-orange-400 hover:text-orange-300 outline-none transition-colors"
          >
            {REGIONS.map((r) => (
              <option
                key={r.code}
                value={r.code}
                className="bg-[#0c1017] text-zinc-200 font-bold"
              >
                {r.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-0.5 h-3.5 w-3.5 text-zinc-400 group-focus-within:text-orange-400 transition-colors" />
        </div>

        {/* Search Icon & Input */}
        <div className="flex flex-1 items-center gap-2 px-1 sm:px-2 min-w-0">
          <Search
            className={cn(
              'shrink-0 text-zinc-500 group-focus-within:text-orange-400 transition-colors',
              compact ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-5 sm:w-5'
            )}
          />
          <input
            type="text"
            value={input}
            onFocus={() => {
              setIsFocused(true);
              loadRecentSearches();
            }}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder={
              compact
                ? locale === 'de'
                  ? 'Spieler, Champion oder Item suchen...'
                  : 'Search summoner, champion or item...'
                : locale === 'de'
                ? 'Spieler (z.B. Agurin#EUW), Champion oder Item suchen...'
                : 'Search summoner (e.g. Faker#T1), champion or item...'
            }
            className={cn(
              'w-full bg-transparent text-white placeholder-zinc-500 outline-none font-medium truncate',
              compact ? 'text-xs sm:text-sm' : 'text-sm sm:text-base'
            )}
          />

          {/* Clear Button */}
          {input.length > 0 && (
            <button
              type="button"
              onClick={() => setInput('')}
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.08] text-zinc-400 hover:text-white hover:bg-white/[0.15] transition-colors"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={cn(
            'flex shrink-0 items-center justify-center font-bold text-white transition-all cursor-pointer',
            'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600',
            'shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:brightness-110 active:scale-95',
            compact
              ? 'h-7 w-7 rounded-lg'
              : 'h-10 sm:h-11 px-4 sm:px-5 rounded-xl text-xs sm:text-sm'
          )}
        >
          <Search className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4 sm:h-4 sm:w-4')} />
          {!compact && (
            <span className="ml-2 hidden sm:inline font-black tracking-wide">
              {locale === 'de' ? 'Suchen' : 'Search'}
            </span>
          )}
        </button>
      </form>

      {/* Error Message */}
      {error && (
        <span className="absolute -bottom-6 left-3 text-xs font-semibold text-rose-400">
          {error}
        </span>
      )}

      {/* Auto-Suggest Dropdown (when focused) */}
      {isFocused && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017]/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 max-h-[420px] overflow-y-auto">
          {/* CASE A: User entered a search query -> Show matching Champions, Items & Summoner Action */}
          {trimmedQuery.length > 0 ? (
            <div className="flex flex-col gap-2">
              {/* 1. MATCHING CHAMPIONS */}
              {matchingChamps.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{locale === 'de' ? 'Champions' : 'Champions'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {matchingChamps.map((champ) => (
                      <div
                        key={champ.id}
                        onClick={() => navigateToChampion(champ.id)}
                        className="group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10 group-hover:border-amber-400/50 transition-colors bg-zinc-950">
                            <Image
                              src={getChampionIconUrl(champ.id)}
                              alt={champ.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                              {champ.name}
                            </span>
                            <span className="text-[11px] text-zinc-400 truncate capitalize">
                              {champ.class || 'Champion'} {champ.role ? `· ${champ.role}` : ''}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-amber-400 transition-all transform group-hover:translate-x-0.5 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. MATCHING ITEMS */}
              {matchingItems.length > 0 && (
                <div className={matchingChamps.length > 0 ? 'border-t border-white/[0.04] pt-2' : ''}>
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                    <Package className="h-3.5 w-3.5" />
                    <span>{locale === 'de' ? 'Items' : 'Items'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {matchingItems.map((it) => (
                      <div
                        key={it.id}
                        onClick={() => navigateToItem(it)}
                        className="group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10 group-hover:border-cyan-400/50 transition-colors bg-black/50">
                            <Image
                              src={getItemIconUrl(it.id)}
                              alt={it.name}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-white group-hover:text-cyan-400 transition-colors truncate">
                              {it.name}
                            </span>
                            <span className="text-[11px] text-zinc-400 flex items-center gap-1 truncate">
                              <Coins className="h-3 w-3 text-amber-400 shrink-0" />
                              <span>{it.gold > 0 ? `${it.gold.toLocaleString('de-DE')} Gold` : (locale === 'de' ? 'Kostenlos' : 'Free')}</span>
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-cyan-400 transition-all transform group-hover:translate-x-0.5 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. SUMMONER SEARCH OPTION */}
              <div className={(matchingChamps.length > 0 || matchingItems.length > 0) ? 'border-t border-white/[0.06] pt-2' : ''}>
                <div
                  onClick={() => {
                    let g = input.trim();
                    let t = region.toUpperCase();
                    if (g.includes('#')) {
                      const p = g.split('#');
                      g = p[0].trim();
                      t = p[1].trim() || region.toUpperCase();
                    }
                    navigateToSummoner(g, t, region);
                  }}
                  className="group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 hover:bg-white/[0.06] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 group-hover:border-orange-500 transition-colors">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors truncate">
                          {input.trim()}
                        </span>
                        <span className="rounded bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.2 text-[9px] font-black uppercase text-orange-400 shrink-0">
                          {region.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 truncate">
                        {locale === 'de' ? 'Spieler-Profil aufrufen' : 'Search summoner profile'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-orange-400 transition-all transform group-hover:translate-x-0.5 shrink-0" />
                </div>
              </div>
            </div>
          ) : (
            /* CASE B: Query is empty -> Show Recent Searches if present */
            recentList.length > 0 && (
              <div>
                <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-white/[0.06] px-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <History className="h-3.5 w-3.5 text-orange-400" />
                    <span>{locale === 'de' ? 'Zuletzt gesucht' : 'Recent Searches'}</span>
                  </div>
                  <button
                    onClick={clearRecent}
                    className="text-[11px] font-semibold text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                  >
                    {locale === 'de' ? 'Alle löschen' : 'Clear all'}
                  </button>
                </div>

                <div className="flex flex-col gap-1 max-h-60 overflow-y-auto">
                  {recentList.map((item) => (
                    <div
                      key={`${item.region}-${item.gameName}-${item.tagLine}`}
                      onClick={() =>
                        navigateToSummoner(item.gameName, item.tagLine, item.region)
                      }
                      className="group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="rounded bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.5 text-[10px] font-black uppercase text-orange-400">
                          {item.region}
                        </span>
                        <div className="flex items-center gap-1 truncate">
                          <span className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors">
                            {item.gameName}
                          </span>
                          <span className="text-xs text-zinc-400">#{item.tagLine}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-orange-400 transition-all transform group-hover:translate-x-0.5" />
                        <button
                          onClick={(e) => removeSingleRecent(e, item)}
                          className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title={locale === 'de' ? 'Entfernen' : 'Remove'}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
