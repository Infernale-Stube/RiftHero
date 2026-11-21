'use client';

import { useMemo } from 'react';
import { Swords, Loader2, ChevronDown } from 'lucide-react';
import { FormattedMatch } from '@/types';
import MatchCard from './MatchCard';
import { useTranslation } from '@/i18n/LanguageContext';

interface MatchHistoryProps {
  matches: FormattedMatch[];
  region: string;
  activeQueue: string;
  onQueueChange: (queue: string) => void;
  isLoading?: boolean;
  total?: number;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

const QUEUE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'ranked_solo', label: 'Solo/Duo' },
  { id: 'ranked_flex', label: 'Flex' },
  { id: 'ranked_5s', label: '5s' },
  { id: 'aram', label: 'ARAM' },
  { id: 'arena', label: 'Arena' },
];

export default function MatchHistory({
  matches,
  region,
  activeQueue,
  onQueueChange,
  isLoading,
  total = 0,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: MatchHistoryProps) {
  const { t, locale } = useTranslation();

  const queueTabs = [
    { id: 'all', label: locale === 'de' ? 'Alle' : 'All' },
    { id: 'ranked_solo', label: 'Solo/Duo' },
    { id: 'ranked_flex', label: 'Flex' },
    { id: 'ranked_5s', label: '5s' },
    { id: 'aram', label: 'ARAM' },
    { id: 'arena', label: 'Arena' },
  ];

  // Group matches by day like LoLDB (e.g. "Today 2W 1L", "Yesterday 3W 0L", "Nov 17 6W 1L")
  const groupedMatches = useMemo(() => {
    const groups: Array<{
      dateLabel: string;
      wins: number;
      losses: number;
      matches: FormattedMatch[];
    }> = [];

    const now = new Date();
    const todayStr = now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayStr = yesterday.toDateString();

    const groupMap = new Map<string, { wins: number; losses: number; matches: FormattedMatch[] }>();
    const order: string[] = [];

    matches.forEach((m) => {
      const d = new Date(m.gameCreation);
      const dStr = d.toDateString();

      let label = dStr;
      if (dStr === todayStr) {
        label = locale === 'de' ? 'Heute' : 'Today';
      } else if (dStr === yesterdayStr) {
        label = locale === 'de' ? 'Gestern' : 'Yesterday';
      } else {
        label = d.toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', { month: 'short', day: 'numeric' });
      }

      if (!groupMap.has(label)) {
        groupMap.set(label, { wins: 0, losses: 0, matches: [] });
        order.push(label);
      }

      const grp = groupMap.get(label)!;
      grp.matches.push(m);
      if (m.isRemake || m.gameDuration < 300) {
        // Remakes do not count towards wins or losses
      } else if (m.win) {
        grp.wins++;
      } else {
        grp.losses++;
      }
    });

    order.forEach((label) => {
      const grp = groupMap.get(label)!;
      groups.push({
        dateLabel: label,
        wins: grp.wins,
        losses: grp.losses,
        matches: grp.matches,
      });
    });

    return groups;
  }, [matches, locale]);

  return (
    <div className="flex flex-col gap-4">
      {/* Top Filter & Header Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {groupedMatches.length > 0 ? (
          <div className="flex items-center gap-2 text-sm font-black px-1">
            <span className="text-white text-base tracking-tight">{groupedMatches[0].dateLabel}</span>
            <span className="text-emerald-400 font-bold text-xs">{groupedMatches[0].wins}W</span>
            <span className="text-rose-400 font-bold text-xs">{groupedMatches[0].losses}L</span>
          </div>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg bg-black/40 p-1 border border-white/[0.04]">
            {queueTabs.map((tab) => {
              const isActive = activeQueue === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onQueueChange(tab.id)}
                  className={`relative rounded-[7px] px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                    isActive
                      ? 'bg-white/[0.07] text-white after:absolute after:inset-x-[30%] after:bottom-0.5 after:h-0.5 after:rounded-full after:bg-orange-400'
                      : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {total > 0 && (
            <span className="text-xs text-zinc-500 font-medium hidden sm:inline">
              {matches.length} {locale === 'de' ? 'von' : 'of'} {total}
            </span>
          )}
        </div>
      </div>

      {/* Match Cards List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 rounded-2xl border border-white/[0.06] bg-[#0d1116] animate-pulse"
            />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#0d1116] p-12 text-center">
          <Swords className="mx-auto h-10 w-10 text-zinc-600 mb-2.5" />
          <p className="text-sm font-bold text-zinc-200">
            {locale === 'de' ? 'Keine Matches in dieser Kategorie gefunden' : 'No matches found in this category'}
          </p>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            {locale === 'de'
              ? 'Sobald der Hintergrund-Worker neue Matches analysiert hat, erscheinen sie automatisch hier.'
              : 'As soon as the background worker analyzes new matches, they will automatically appear here.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {/* First Day's Matches (Header rendered in top bar) */}
          <div className="flex flex-col gap-2.5">
            {groupedMatches[0].matches.map((match) => (
              <MatchCard key={match.matchId} match={match} region={region} />
            ))}
          </div>

          {/* Subsequent Days */}
          {groupedMatches.slice(1).map((group) => (
            <div key={group.dateLabel} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2 text-sm font-black px-1 mt-2">
                <span className="text-white text-base tracking-tight">{group.dateLabel}</span>
                <span className="text-emerald-400 font-bold text-xs">{group.wins}W</span>
                <span className="text-rose-400 font-bold text-xs">{group.losses}L</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {group.matches.map((match) => (
                  <MatchCard key={match.matchId} match={match} region={region} />
                ))}
              </div>
            </div>
          ))}

          {/* Load More Matches Button */}
          {hasMore && (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 text-xs font-bold text-zinc-200 hover:bg-white/[0.09] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:border-white/20 active:scale-98"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>{locale === 'de' ? 'Lade weitere Matches...' : 'Loading more matches...'}</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 text-amber-400" />
                    <span>{locale === 'de' ? 'Mehr Matches anzeigen (+10)' : 'Show more matches (+10)'}</span>
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && matches.length > 0 && (
            <div className="text-center py-4 text-xs text-zinc-500 font-medium">
              {locale === 'de'
                ? `Alle gespeicherten Matches geladen (${matches.length})`
                : `All saved matches loaded (${matches.length})`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
