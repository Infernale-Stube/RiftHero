'use client';

import { Swords } from 'lucide-react';
import { FormattedMatch } from '@/types';
import MatchCard from './MatchCard';

interface MatchHistoryProps {
  matches: FormattedMatch[];
  region: string;
  activeQueue: string;
  onQueueChange: (queue: string) => void;
  isLoading?: boolean;
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
}: MatchHistoryProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* Queue Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-rift-700/60">
        {QUEUE_TABS.map((tab) => {
          const isActive = activeQueue === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onQueueChange(tab.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-gradient-to-r from-blue-600 to-hextech-blue text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-rift-800/60'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Match Cards List */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-xl border border-rift-700/60 bg-rift-900/40 animate-pulse"
            />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-xl border border-rift-700/60 bg-rift-900/50 p-10 text-center">
          <Swords className="mx-auto h-8 w-8 text-slate-600 mb-2" />
          <p className="text-sm font-semibold text-slate-300">
            Keine Matches in dieser Kategorie gefunden
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Sobald der Hintergrund-Crawler neue Matches analysiert hat, erscheinen sie automatisch hier.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {matches.map((match) => (
            <MatchCard key={match.matchId} match={match} region={region} />
          ))}
        </div>
      )}
    </div>
  );
}
