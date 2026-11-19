'use client';

import { useState, useRef, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown, X, History, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RecentSearchItem } from '@/types';
import { useTranslation } from '@/i18n/LanguageContext';

const REGIONS = [
  { code: 'euw', label: 'EUW' },
  { code: 'eune', label: 'EUNE' },
  { code: 'na', label: 'NA' },
  { code: 'kr', label: 'KR' },
];

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
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = input.trim();
    if (!trimmed) return;

    let gameName = '';
    let tagLine = '';

    if (trimmed.includes('#')) {
      const parts = trimmed.split('#');
      gameName = parts[0].trim();
      tagLine = parts[1].trim();
    } else {
      gameName = trimmed;
      tagLine = region.toUpperCase();
    }

    if (!gameName) {
      setError(
        locale === 'de'
          ? 'Bitte einen Spielernamen eingeben'
          : 'Please enter a summoner name'
      );
      return;
    }

    navigateToSummoner(gameName, tagLine, region);
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
                  ? 'Riot ID (z.B. Agurin#EUW)'
                  : 'Riot ID (e.g. Faker#T1)'
                : locale === 'de'
                ? 'Riot ID suchen (z.B. Agurin#EUW oder Faker#T1)...'
                : 'Search Riot ID (e.g. Faker#T1 or Agurin#EUW)...'
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
            'flex shrink-0 items-center justify-center font-bold text-white transition-all',
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
              {locale === 'de' ? 'Profil laden' : 'Search'}
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

      {/* Auto-Suggest Recent Searches Dropdown (when focused) */}
      {isFocused && recentList.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1017]/95 p-3 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between pb-2 mb-1.5 border-b border-white/[0.06] px-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-zinc-400">
              <History className="h-3.5 w-3.5 text-orange-400" />
              <span>{locale === 'de' ? 'Zuletzt gesucht' : 'Recent Searches'}</span>
            </div>
            <button
              onClick={clearRecent}
              className="text-[11px] font-semibold text-zinc-500 hover:text-rose-400 transition-colors"
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
                    className="flex h-5 w-5 items-center justify-center rounded text-zinc-500 hover:text-rose-400 transition-colors"
                    title={locale === 'de' ? 'Entfernen' : 'Remove'}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
