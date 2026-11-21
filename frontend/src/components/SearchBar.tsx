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
  Swords,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecentSearchItem, SummonerSearchResult } from '@/types';
import { useTranslation } from '@/i18n/LanguageContext';
import { getChampionIconUrl, getItemIconUrl, getProfileIconUrl } from '@/lib/ddragon';
import championPositionsRaw from '@/lib/championPositions.json';
import { fetchItemsRosterApi, searchSummonersApi } from '@/lib/api';
import { fetchDDragonItemsList } from '@/lib/ddragon';

const PLATFORM_TO_REGION: Record<string, { plat: string; reg: string }> = {
  EUW: { plat: 'EUW1', reg: 'euw' },
  EUW1: { plat: 'EUW1', reg: 'euw' },
  EUN: { plat: 'EUN1', reg: 'eune' },
  EUN1: { plat: 'EUN1', reg: 'eune' },
  EUNE: { plat: 'EUN1', reg: 'eune' },
  EUNE1: { plat: 'EUN1', reg: 'eune' },
  NA: { plat: 'NA1', reg: 'na' },
  NA1: { plat: 'NA1', reg: 'na' },
  KR: { plat: 'KR', reg: 'kr' },
  BR: { plat: 'BR1', reg: 'br' },
  BR1: { plat: 'BR1', reg: 'br' },
  LAN: { plat: 'LA1', reg: 'lan' },
  LA1: { plat: 'LA1', reg: 'lan' },
  LAS: { plat: 'LA2', reg: 'las' },
  LA2: { plat: 'LA2', reg: 'las' },
  OCE: { plat: 'OC1', reg: 'oce' },
  OC1: { plat: 'OC1', reg: 'oce' },
  TR: { plat: 'TR1', reg: 'tr' },
  TR1: { plat: 'TR1', reg: 'tr' },
  RU: { plat: 'RU', reg: 'ru' },
  JP: { plat: 'JP1', reg: 'jp' },
  JP1: { plat: 'JP1', reg: 'jp' },
  SG: { plat: 'SG2', reg: 'sg' },
  SG2: { plat: 'SG2', reg: 'sg' },
  PH: { plat: 'PH2', reg: 'ph' },
  PH2: { plat: 'PH2', reg: 'ph' },
  TW: { plat: 'TW2', reg: 'tw' },
  TW2: { plat: 'TW2', reg: 'tw' },
  VN: { plat: 'VN2', reg: 'vn' },
  VN2: { plat: 'VN2', reg: 'vn' },
  TH: { plat: 'TH2', reg: 'th' },
  TH2: { plat: 'TH2', reg: 'th' },
  ME: { plat: 'ME1', reg: 'me' },
  ME1: { plat: 'ME1', reg: 'me' },
};

const REGION_TO_PLATFORM: Record<string, string> = {
  euw: 'EUW1',
  eune: 'EUN1',
  na: 'NA1',
  kr: 'KR',
  br: 'BR1',
  lan: 'LA1',
  las: 'LA2',
  oce: 'OC1',
  tr: 'TR1',
  ru: 'RU',
  jp: 'JP1',
  sg: 'SG2',
  ph: 'PH2',
  tw: 'TW2',
  vn: 'VN2',
  th: 'TH2',
  me: 'ME1',
};

export function parseMatchIdQuery(query: string, defaultRegion: string): { isMatchId: boolean; region: string; matchId: string } | null {
  const clean = query.trim();
  if (!clean) return null;

  // Format 1: PLATFORM_NUMBER (e.g. EUW1_7182938194, euw1_7182938194, EUW_7182938194, NA1_12345678, KR_12345678)
  const platformMatch = clean.match(/^([a-zA-Z]{2,5}[0-9]?)_([0-9]{6,14})$/);
  if (platformMatch) {
    let plat = platformMatch[1].toUpperCase();
    const num = platformMatch[2];
    let reg = defaultRegion.toLowerCase();

    const mapped = PLATFORM_TO_REGION[plat];
    if (mapped) {
      plat = mapped.plat;
      reg = mapped.reg;
    }

    return {
      isMatchId: true,
      region: reg,
      matchId: `${plat}_${num}`,
    };
  }

  // Format 2: Pure numeric ID with 8 to 14 digits (e.g. 7182938194 or #7182938194)
  const pureNumber = clean.startsWith('#') ? clean.slice(1).trim() : clean;
  if (/^[0-9]{8,14}$/.test(pureNumber)) {
    const reg = defaultRegion.toLowerCase();
    const plat = REGION_TO_PLATFORM[reg] || 'EUW1';

    return {
      isMatchId: true,
      region: reg,
      matchId: `${plat}_${pureNumber}`,
    };
  }

  return null;
}

const REGIONS = [
  { code: 'euw', label: 'EUW' },
  { code: 'eune', label: 'EUNE' },
  { code: 'na', label: 'NA' },
  { code: 'kr', label: 'KR' },
  { code: 'br', label: 'BR' },
  { code: 'lan', label: 'LAN' },
  { code: 'las', label: 'LAS' },
  { code: 'oce', label: 'OCE' },
  { code: 'tr', label: 'TR' },
  { code: 'ru', label: 'RU' },
  { code: 'jp', label: 'JP' },
  { code: 'sg', label: 'SG' },
  { code: 'ph', label: 'PH' },
  { code: 'tw', label: 'TW' },
  { code: 'vn', label: 'VN' },
  { code: 'th', label: 'TH' },
  { code: 'me', label: 'ME' },
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
  const [matchingSummoners, setMatchingSummoners] = useState<SummonerSearchResult[]>([]);
  const [isSearchingSummoners, setIsSearchingSummoners] = useState(false);
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

  // Search existing profiles from database
  useEffect(() => {
    const trimmed = input.trim();
    if (!trimmed || trimmed.length < 1) {
      setMatchingSummoners([]);
      setIsSearchingSummoners(false);
      return;
    }

    let isCurrent = true;
    setIsSearchingSummoners(true);

    const timer = setTimeout(async () => {
      try {
        const results = await searchSummonersApi(trimmed);
        if (isCurrent) {
          // Prioritize profiles matching the currently selected region
          results.sort((a, b) => {
            const aMatch = a.region.toLowerCase() === region.toLowerCase();
            const bMatch = b.region.toLowerCase() === region.toLowerCase();
            if (aMatch && !bMatch) return -1;
            if (!aMatch && bMatch) return 1;
            return 0;
          });
          setMatchingSummoners(results);
        }
      } catch {
        if (isCurrent) setMatchingSummoners([]);
      } finally {
        if (isCurrent) setIsSearchingSummoners(false);
      }
    }, 180);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [input, region]);

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

  // Match ID detection
  const detectedMatch = useMemo(() => {
    return parseMatchIdQuery(input, region);
  }, [input, region]);

  const navigateToMatch = (reg: string, matchId: string) => {
    setIsFocused(false);
    router.push(`/${locale}/match/${reg}/${encodeURIComponent(matchId)}`);
  };

  const navigateToSummoner = (
    gameName: string,
    tagLine: string,
    reg: string,
    profileIconId?: number,
    summonerLevel?: number
  ) => {
    // Save to LocalStorage
    try {
      const raw = localStorage.getItem('rifthero_recent_searches');
      const list: RecentSearchItem[] = raw ? JSON.parse(raw) : [];
      const updated = [
        {
          gameName,
          tagLine,
          region: reg,
          profileIconId,
          summonerLevel,
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

    // 0. Match ID Check
    if (detectedMatch) {
      navigateToMatch(detectedMatch.region, detectedMatch.matchId);
      return;
    }

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
    <div ref={containerRef} className={cn('relative w-full text-left', className)}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          'group flex items-center transition-all duration-200',
          'border border-white/[0.08] bg-[#0c1017]/90 backdrop-blur-xl shadow-2xl',
          'focus-within:border-amber-500/70 focus-within:ring-2 focus-within:ring-amber-500/20 focus-within:shadow-[0_0_30px_rgba(245,158,11,0.18)]',
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
            className="cursor-pointer appearance-none bg-transparent pr-5 text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 hover:text-amber-300 outline-none transition-colors"
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
          <ChevronDown className="pointer-events-none absolute right-0.5 h-3.5 w-3.5 text-zinc-400 group-focus-within:text-amber-400 transition-colors" />
        </div>

        {/* Search Icon & Input */}
        <div className="flex flex-1 items-center gap-2 px-1 sm:px-2 min-w-0">
          <Search
            className={cn(
              'shrink-0 text-zinc-500 group-focus-within:text-amber-400 transition-colors',
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
                  ? 'Spieler, Champion, Item oder Match-ID...'
                  : 'Search summoner, champion, item or match ID...'
                : locale === 'de'
                ? 'Spieler (z.B. Agurin#EUW), Champion, Item oder Match-ID...'
                : 'Search summoner (e.g. Faker#T1), champion, item or match ID...'
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
            'bg-gradient-to-r from-amber-500 via-yellow-500 to-amber-600',
            'shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:brightness-110 active:scale-95',
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
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017]/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 max-h-[420px] overflow-y-auto text-left">
          {/* CASE A: User entered a search query -> Show matching Summoners (DB), Champions, Items & Summoner Action */}
          {trimmedQuery.length > 0 ? (
            <div className="flex flex-col gap-2">
              {/* 0. MATCH ID DETECTED */}
              {detectedMatch && (
                <div className="pb-1.5 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    <Swords className="h-3.5 w-3.5" />
                    <span>{locale === 'de' ? 'Match-ID erkannt' : 'Match ID Detected'}</span>
                  </div>
                  <div
                    onClick={() => navigateToMatch(detectedMatch.region, detectedMatch.matchId)}
                    className="group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 transition-all shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400">
                        <Swords className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white group-hover:text-amber-400 transition-colors font-mono tracking-tight">
                            {detectedMatch.matchId}
                          </span>
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-400 border border-amber-500/30">
                            {detectedMatch.region.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400">
                          {locale === 'de' ? 'Zu den Match-Details springen' : 'View full match details'}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-amber-400 transform group-hover:translate-x-1 transition-transform shrink-0" />
                  </div>
                </div>
              )}

              {/* 1. MATCHING SUMMONERS FROM DATABASE */}
              {matchingSummoners.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    <User className="h-3.5 w-3.5" />
                    <span>{locale === 'de' ? 'Spieler-Profile' : 'Summoner Profiles'}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    {matchingSummoners.map((summoner) => (
                      <div
                        key={`${summoner.region}-${summoner.gameName}-${summoner.tagLine}`}
                        onClick={() =>
                          navigateToSummoner(
                            summoner.gameName,
                            summoner.tagLine,
                            summoner.region,
                            summoner.profileIconId,
                            summoner.summonerLevel
                          )
                        }
                        className="group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 hover:bg-white/[0.06] transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Player Profile Picture from DB + Level Badge */}
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/10 group-hover:border-amber-400/60 transition-colors bg-zinc-950 shadow-sm">
                            <Image
                              src={getProfileIconUrl(summoner.profileIconId)}
                              alt={summoner.gameName}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            <div className="absolute bottom-0 right-0 rounded-tl bg-black/85 px-1 py-0.2 text-[8px] font-black text-amber-300 border-t border-l border-white/20">
                              {summoner.summonerLevel}
                            </div>
                          </div>

                          {/* Name, Tag, Level & Region */}
                          <div className="flex flex-col min-w-0 items-start text-left">
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                                {summoner.gameName}
                              </span>
                              <span className="text-xs text-zinc-400 font-medium shrink-0">
                                #{summoner.tagLine}
                              </span>
                              <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-400 shrink-0">
                                {summoner.region.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-zinc-400 text-left">
                              <span className="text-zinc-400">
                                Level {summoner.summonerLevel}
                              </span>
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-amber-400 transition-all transform group-hover:translate-x-0.5 shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 2. MATCHING CHAMPIONS */}
              {matchingChamps.length > 0 && (
                <div className={matchingSummoners.length > 0 ? 'border-t border-white/[0.04] pt-2' : ''}>
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

              {/* 3. MATCHING ITEMS */}
              {matchingItems.length > 0 && (
                <div className={(matchingSummoners.length > 0 || matchingChamps.length > 0) ? 'border-t border-white/[0.04] pt-2' : ''}>
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

              {/* 4. SUMMONER SEARCH OPTION */}
              <div className={(matchingSummoners.length > 0 || matchingChamps.length > 0 || matchingItems.length > 0) ? 'border-t border-white/[0.06] pt-2' : ''}>
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 group-hover:border-amber-500 transition-colors">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                          {input.trim()}
                        </span>
                        <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-400 shrink-0">
                          {region.toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-400 truncate">
                        {locale === 'de' ? 'Spieler-Profil aufrufen / neu crawlen' : 'Search summoner profile'}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-amber-400 transition-all transform group-hover:translate-x-0.5 shrink-0" />
                </div>
              </div>
            </div>
          ) : (
            /* CASE B: Query is empty -> Show Recent Searches if present */
            recentList.length > 0 && (
              <div>
                <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-white/[0.06] px-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    <History className="h-3.5 w-3.5 text-amber-400" />
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
                        navigateToSummoner(
                          item.gameName,
                          item.tagLine,
                          item.region,
                          item.profileIconId,
                          item.summonerLevel
                        )
                      }
                      className="group flex cursor-pointer items-center justify-between rounded-xl px-2.5 py-1.5 hover:bg-white/[0.06] transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.profileIconId ? (
                          <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-xl border border-white/10 group-hover:border-amber-400/60 transition-colors bg-zinc-950 shadow-sm">
                            <Image
                              src={getProfileIconUrl(item.profileIconId)}
                              alt={item.gameName}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                            {item.summonerLevel != null && (
                              <div className="absolute bottom-0 right-0 rounded-tl bg-black/85 px-1 py-0.2 text-[8px] font-black text-amber-300 border-t border-l border-white/20">
                                {item.summonerLevel}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                            <User className="h-4 w-4" />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0 items-start text-left">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                              {item.gameName}
                            </span>
                            <span className="text-xs text-zinc-400 shrink-0">#{item.tagLine}</span>
                            <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.2 text-[9px] font-black uppercase text-amber-400 shrink-0">
                              {item.region.toUpperCase()}
                            </span>
                          </div>
                          {item.summonerLevel != null && (
                            <span className="text-[11px] text-zinc-400 text-left">
                              Level {item.summonerLevel}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <ArrowRight className="h-3.5 w-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 group-hover:text-amber-400 transition-all transform group-hover:translate-x-0.5" />
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
