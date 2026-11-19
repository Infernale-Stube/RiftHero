'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ChevronDown } from 'lucide-react';
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
      // If user typed without #, default tagLine to upper region code (e.g. EUW)
      gameName = trimmed;
      tagLine = region.toUpperCase();
    }

    if (!gameName) {
      setError(locale === 'de' ? 'Bitte einen Spielernamen eingeben' : 'Please enter a summoner name');
      return;
    }

    // Save to LocalStorage for recent searches
    try {
      const raw = localStorage.getItem('rifthero_recent_searches');
      const list: RecentSearchItem[] = raw ? JSON.parse(raw) : [];
      const updated = [
        {
          gameName,
          tagLine,
          region,
          timestamp: Date.now(),
        },
        ...list.filter(
          (item) =>
            !(
              item.gameName.toLowerCase() === gameName.toLowerCase() &&
              item.tagLine.toLowerCase() === tagLine.toLowerCase() &&
              item.region.toLowerCase() === region.toLowerCase()
            )
        ),
      ].slice(0, 8);
      localStorage.setItem('rifthero_recent_searches', JSON.stringify(updated));
    } catch {
      // LocalStorage unavailable
    }

    // Clean URL format: /summoner/[region]/[gameName]-[tagLine]
    const formattedTag = `${gameName}-${tagLine}`;
    router.push(`/summoner/${region}/${encodeURIComponent(formattedTag)}`);
  };

  return (
    <div className={cn('relative w-full', className)}>
      <form
        onSubmit={handleSubmit}
        className={cn(
          'flex items-center rounded-xl border border-rift-700 bg-rift-900/95 transition-all focus-within:border-hextech-blue focus-within:ring-2 focus-within:ring-hextech-blue/20 shadow-lg',
          compact ? 'h-10 px-2' : 'h-14 sm:h-16 px-3 sm:px-4'
        )}
      >
        {/* Region Selector */}
        <div className="relative flex items-center pr-2 border-r border-rift-700">
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="cursor-pointer appearance-none bg-transparent pr-5 text-sm font-bold uppercase tracking-wider text-hextech-lightGold outline-none"
          >
            {REGIONS.map((r) => (
              <option key={r.code} value={r.code} className="bg-rift-900 text-slate-200">
                {r.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-1 h-3.5 w-3.5 text-slate-400" />
        </div>

        {/* Search Input */}
        <div className="flex-1 px-3">
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              if (error) setError(null);
            }}
            placeholder={
              compact
                ? (locale === 'de' ? 'Riot ID (z.B. Agurin#EUW)' : 'Riot ID (e.g. Faker#T1)')
                : (locale === 'de' ? 'Riot ID suchen (z.B. Agurin#EUW oder Faker#T1)...' : 'Search Riot ID (e.g. Faker#T1 or Agurin#EUW)...')
            }
            className={cn(
              'w-full bg-transparent text-white placeholder-slate-500 outline-none font-medium',
              compact ? 'text-sm' : 'text-base sm:text-lg'
            )}
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={cn(
            'flex items-center justify-center rounded-lg bg-gradient-to-r from-blue-600 to-hextech-blue font-semibold text-white shadow-md shadow-blue-900/40 transition-transform active:scale-95 hover:brightness-110',
            compact ? 'h-7 w-7 sm:h-8 sm:w-8' : 'h-10 px-4 sm:px-5'
          )}
        >
          <Search className={cn('text-white', compact ? 'h-4 w-4' : 'h-5 w-5')} />
          {!compact && (
            <span className="ml-2 hidden sm:inline text-sm font-bold">
              {locale === 'de' ? 'Profil laden' : 'Search Profile'}
            </span>
          )}
        </button>
      </form>

      {error && (
        <span className="absolute -bottom-6 left-2 text-xs font-medium text-rose-400">
          {error}
        </span>
      )}
    </div>
  );
}
