'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { History, X } from 'lucide-react';
import { RecentSearchItem } from '@/types';
import { useTranslation } from '@/i18n/LanguageContext';

export default function RecentSearches() {
  const { locale } = useTranslation();
  const [searches, setSearches] = useState<RecentSearchItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem('rifthero_recent_searches');
      if (raw) {
        setSearches(JSON.parse(raw));
      }
    } catch {
      // LocalStorage unavailable
    }
  }, []);

  const clearHistory = () => {
    try {
      localStorage.removeItem('rifthero_recent_searches');
      setSearches([]);
    } catch {
      // ignore
    }
  };

  const removeSearch = (e: React.MouseEvent, item: RecentSearchItem) => {
    e.preventDefault();
    e.stopPropagation();
    const updated = searches.filter(
      (s) =>
        !(
          s.gameName === item.gameName &&
          s.tagLine === item.tagLine &&
          s.region === item.region
        )
    );
    setSearches(updated);
    try {
      localStorage.setItem('rifthero_recent_searches', JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  if (!mounted || searches.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <History className="h-3.5 w-3.5 text-hextech-blue" />
          <span>{locale === 'de' ? 'Zuletzt gesucht' : 'Recent Searches'}</span>
        </div>
        <button
          onClick={clearHistory}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {locale === 'de' ? 'Verlauf leeren' : 'Clear history'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {searches.map((item) => {
          const formattedTag = `${item.gameName}-${item.tagLine}`;
          return (
            <Link
              key={`${item.region}-${item.gameName}-${item.tagLine}`}
              href={`/summoner/${item.region}/${encodeURIComponent(formattedTag)}`}
              className="group flex items-center gap-2 rounded-lg border border-rift-700/80 bg-rift-900/60 px-3 py-1.5 text-sm transition-all hover:border-hextech-blue/50 hover:bg-rift-850"
            >
              <span className="rounded bg-rift-800 px-1.5 py-0.5 text-[10px] font-bold uppercase text-hextech-lightGold">
                {item.region}
              </span>
              <span className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                {item.gameName}
              </span>
              <span className="text-xs text-slate-500">#{item.tagLine}</span>
              <button
                onClick={(e) => removeSearch(e, item)}
                className="ml-1 text-slate-600 hover:text-rose-400 transition-colors"
                title={locale === 'de' ? 'Aus Verlauf entfernen' : 'Remove from history'}
              >
                <X className="h-3 w-3" />
              </button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
