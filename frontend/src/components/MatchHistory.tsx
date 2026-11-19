'use client';

import { Swords, Loader2, ChevronDown } from 'lucide-react';
import { FormattedMatch } from '@/types';
import MatchCard from './MatchCard';

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
  { id: 'all', label: 'Alle Spiele' },
  { id: 'ranked_solo', label: 'Ranked Solo/Duo' },
  { id: 'ranked_flex', label: 'Ranked Flex' },
  { id: 'aram', label: 'ARAM' },
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
  return (
    <div className="flex flex-col gap-4">
      {/* Queue Filter Tabs & Total Count Header */}
      <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {QUEUE_TABS.map((tab) => {
            const isActive = activeQueue === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onQueueChange(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-600 to-hextech-blue text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {total > 0 && (
          <span className="text-xs text-slate-500 font-medium whitespace-nowrap pl-2">
            {matches.length} von {total} Matches
          </span>
        )}
      </div>

      {/* Match Cards List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-white/[0.06] bg-black/40 animate-pulse"
            />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-black/40 p-12 text-center">
          <Swords className="mx-auto h-10 w-10 text-slate-600 mb-2.5" />
          <p className="text-sm font-bold text-slate-200">
            Keine Matches in dieser Kategorie gefunden
          </p>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Sobald der Hintergrund-Worker neue Matches analysiert hat, erscheinen sie automatisch hier.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((match) => (
            <MatchCard key={match.matchId} match={match} region={region} />
          ))}

          {/* Load More Matches Button */}
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={isLoadingMore}
                className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-6 py-3 text-xs font-bold text-slate-200 hover:bg-white/[0.09] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:border-white/20 active:scale-98"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-hextech-blue" />
                    <span>Lade weitere Matches...</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-4 w-4 text-hextech-blue" />
                    <span>Mehr Spiele anzeigen (+20)</span>
                  </>
                )}
              </button>
            </div>
          )}

          {!hasMore && matches.length > 0 && (
            <div className="text-center py-4 text-xs text-slate-500 font-medium">
              Alle gespeicherten Matches geladen ({matches.length})
            </div>
          )}
        </div>
      )}
    </div>
  );
}
