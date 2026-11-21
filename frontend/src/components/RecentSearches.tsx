'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { History, X } from 'lucide-react';
import { RecentSearchItem } from '@/types';
import { useTranslation } from '@/i18n/LanguageContext';
import { getProfileIconUrl } from '@/lib/ddragon';

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
    <div className="w-full text-left">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-400 uppercase tracking-wider">
          <History className="h-3.5 w-3.5 text-amber-400" />
          <span>{locale === 'de' ? 'Zuletzt gesucht' : 'Recent Searches'}</span>
        </div>
        <button
          onClick={clearHistory}
          className="text-xs font-semibold text-zinc-500 hover:text-rose-400 transition-colors"
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
              href={`/${locale}/summoner/${item.region}/${encodeURIComponent(formattedTag)}`}
              className="group flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#0c1017]/80 px-3 py-1.5 text-sm transition-all hover:border-amber-500/50 hover:bg-[#131924] shadow-sm"
            >
              {item.profileIconId && (
                <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-white/10 group-hover:border-amber-400/50 transition-colors bg-zinc-950">
                  <Image
                    src={getProfileIconUrl(item.profileIconId)}
                    alt={item.gameName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {item.summonerLevel != null && (
                    <div className="absolute bottom-0 right-0 rounded-tl bg-black/85 px-1 py-0.2 text-[7px] font-black text-amber-300 border-t border-l border-white/20">
                      {item.summonerLevel}
                    </div>
                  )}
                </div>
              )}
              <span className="rounded bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-400 shrink-0">
                {item.region}
              </span>
              <span className="font-bold text-zinc-200 group-hover:text-white transition-colors truncate">
                {item.gameName}
              </span>
              <span className="text-xs text-zinc-500 shrink-0">#{item.tagLine}</span>
              {item.summonerLevel != null && !item.profileIconId && (
                <span className="text-[10px] font-semibold text-zinc-400 bg-white/[0.05] px-1.5 py-0.5 rounded">
                  Lvl {item.summonerLevel}
                </span>
              )}
              <button
                onClick={(e) => removeSearch(e, item)}
                className="ml-1 text-zinc-500 hover:text-rose-400 transition-colors"
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
