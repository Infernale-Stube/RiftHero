'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  fetchSummonerMatches,
  fetchChampionStats,
  fetchLpHistory,
  fetchPlayedWith,
} from '@/lib/api';
import {
  FormattedMatch,
  ChampionStatSummary,
  LpHistorySummary,
  PlayedWithTeammate,
} from '@/types';
import ChampionStats from '@/components/ChampionStats';
import MatchHistory from '@/components/MatchHistory';
import RankCard from '@/components/RankCard';
import PlayedWithWidget from '@/components/PlayedWithWidget';
import { useSummonerContext } from './SummonerContext';
import { useTranslation } from '@/i18n/LanguageContext';

export default function SummonerMatchesPage() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { region, tag, profileData, refreshTimestamp, gameQueues } = useSummonerContext();

  // Legacy tab redirects
  useEffect(() => {
    const rawTab = searchParams.get('tab');
    if (rawTab === 'champions') {
      router.replace(`/summoner/${region}/${tag}/champions`);
    } else if (rawTab === 'challenges') {
      router.replace(`/summoner/${region}/${tag}/challenges`);
    } else if (rawTab === 'live') {
      router.replace(`/summoner/${region}/${tag}/live`);
    }
  }, [searchParams, router, region, tag]);

  const [matches, setMatches] = useState<FormattedMatch[]>([]);
  const [totalMatches, setTotalMatches] = useState<number>(0);
  const [champStats, setChampStats] = useState<ChampionStatSummary[]>([]);
  const [activeQueue, setActiveQueue] = useState<string>('all');
  const [selectedChampionId, setSelectedChampionId] = useState<number | undefined>(undefined);
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedResult, setSelectedResult] = useState<'win' | 'loss' | 'all'>('all');

  const [lpHistory, setLpHistory] = useState<LpHistorySummary | null>(null);
  const [playedWith, setPlayedWith] = useState<PlayedWithTeammate[]>([]);

  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Track if matches are currently loaded in state to avoid skeleton flash during silent updates
  const hasMatchesRef = useRef<boolean>(false);

  // Track newly loaded matches for the current session (shown once, then gone)
  const sessionNewIdsRef = useRef<Set<string>>(new Set());
  const storageKey = region && tag ? `rifthero_seen_matches_${region.toLowerCase()}_${tag.toLowerCase()}` : '';

  const loadMatchesAndStats = useCallback(
    async (
      queue: string,
      champId?: number,
      role?: string,
      result?: 'win' | 'loss' | 'all',
      isSilent = false
    ) => {
      if (!region || !tag) return;
      const shouldShowSkeleton = !isSilent && !hasMatchesRef.current;
      if (shouldShowSkeleton) setIsLoadingMatches(true);
      try {
        const [matchesRes, statsRes, lpHRes, playedRes] = await Promise.all([
          fetchSummonerMatches(region, tag, queue, 10, 0, {
            queue,
            championId: champId,
            role,
            result,
          }),
          fetchChampionStats(region, tag, queue),
          fetchLpHistory(region, tag, 'RANKED_SOLO_5x5'),
          fetchPlayedWith(region, tag, 5),
        ]);

        const fetchedMatches = matchesRes.matches || [];
        hasMatchesRef.current = fetchedMatches.length > 0;

        // Check seen matches in localStorage
        let storedSeenSet: Set<string> | null = null;
        if (typeof window !== 'undefined' && storageKey) {
          try {
            const raw = localStorage.getItem(storageKey);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (Array.isArray(parsed)) storedSeenSet = new Set(parsed);
            }
          } catch {}
        }

        if (storedSeenSet === null) {
          // Cold start / first time user views this summoner: mark all existing matches as seen
          // so existing history doesn't flash false "New" badges
          const initialSeen = new Set(fetchedMatches.map((m) => m.matchId));
          if (typeof window !== 'undefined' && storageKey) {
            try {
              localStorage.setItem(storageKey, JSON.stringify(Array.from(initialSeen)));
            } catch {}
          }
        } else {
          // Returning user or live background refresh:
          // A match is only marked "New" if the user has NOT seen it before!
          for (const m of fetchedMatches) {
            if (!storedSeenSet.has(m.matchId)) {
              sessionNewIdsRef.current.add(m.matchId);
            }
          }

          // Persist all known matches as seen so next visit/reload won't show "New" again
          const updatedSeen = new Set(Array.from(storedSeenSet));
          for (const m of fetchedMatches) {
            updatedSeen.add(m.matchId);
          }
          if (typeof window !== 'undefined' && storageKey) {
            try {
              localStorage.setItem(storageKey, JSON.stringify(Array.from(updatedSeen).slice(-300)));
            } catch {}
          }
        }

        const enrichedMatches = fetchedMatches.map((m) => ({
          ...m,
          isNew: sessionNewIdsRef.current.has(m.matchId),
        }));

        setMatches(enrichedMatches);
        setTotalMatches(matchesRes.total);
        setChampStats(statsRes);
        setLpHistory(lpHRes);
        setPlayedWith(playedRes);
      } catch (err: any) {
        console.error('Failed to load matches/stats:', err);
      } finally {
        if (!isSilent) setIsLoadingMatches(false);
      }
    },
    [region, tag, storageKey]
  );

  // Initial load when profile becomes available
  useEffect(() => {
    if (profileData?.summoner) {
      loadMatchesAndStats(activeQueue, selectedChampionId, selectedRole, selectedResult);
    }
  }, [profileData?.summoner?.id]);

  // Check if returning from a finished live game redirect to refresh matches immediately
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const flag = sessionStorage.getItem('rifthero_auto_refresh_after_live');
        if (flag === 'true') {
          sessionStorage.removeItem('rifthero_auto_refresh_after_live');
          loadMatchesAndStats(activeQueue, selectedChampionId, selectedRole, selectedResult, true);
        }
      } catch {}
    }
  }, [activeQueue, selectedChampionId, selectedRole, selectedResult, loadMatchesAndStats]);

  // Silent in-place refresh when background sync finishes (zero layout jump or flash!)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadMatchesAndStats(activeQueue, selectedChampionId, selectedRole, selectedResult, true);
  }, [refreshTimestamp]);

  const handleLoadMore = async () => {
    if (isLoadingMore || matches.length >= totalMatches) return;
    setIsLoadingMore(true);
    try {
      const res = await fetchSummonerMatches(region, tag, activeQueue, 10, matches.length, {
        queue: activeQueue,
        championId: selectedChampionId,
        role: selectedRole,
        result: selectedResult,
      });
      const moreMatches = res.matches || [];
      if (typeof window !== 'undefined' && storageKey) {
        try {
          const raw = localStorage.getItem(storageKey);
          const currentSeen = raw ? new Set(JSON.parse(raw)) : new Set<string>();
          for (const m of moreMatches) {
            currentSeen.add(m.matchId);
          }
          localStorage.setItem(storageKey, JSON.stringify(Array.from(currentSeen).slice(-300)));
        } catch {}
      }
      setMatches((prev) => [...prev, ...moreMatches.map((m) => ({ ...m, isNew: false }))]);
      setTotalMatches(res.total);
    } catch (err) {
      console.error('Failed to load more matches:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const soloRank = profileData?.ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  const flexRank = profileData?.ranks.find((r) => r.queueType === 'RANKED_FLEX_SR');
  const ranked5s = profileData?.ranks.find(
    (r) =>
      r.queueType === 'RANKED_PREMADE_5x5' ||
      r.queueType === 'RANKED_TEAM_5x5' ||
      r.queueType === 'RANKED_5s' ||
      r.queueType === 'RANKED_5X5'
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left Sidebar: Ranked Modes Toggle Card + Most Played Champions + Party Members */}
      <div className="w-full lg:w-[350px] shrink-0 flex flex-col gap-4 lg:sticky lg:top-6">
        {/* 1. Ranked Card with Toggle between Solo/Duo and Flex */}
        <RankCard
          soloRank={soloRank}
          flexRank={flexRank}
          ranked5s={ranked5s}
          lpHistory={lpHistory}
        />

        {/* 2. Most Played Champions */}
        <ChampionStats
          stats={champStats}
        />

        {/* 3. Party Member (Played With Synergy) */}
        <PlayedWithWidget
          teammates={playedWith}
          region={region}
        />
      </div>

      {/* Right Main Column: Match History */}
      <div className="flex-1 w-full min-w-0">
        <MatchHistory
          matches={matches}
          region={region}
          activeQueue={activeQueue}
          onQueueChange={(queue) => {
            setActiveQueue(queue);
            loadMatchesAndStats(queue, selectedChampionId, selectedRole, selectedResult);
          }}
          selectedChampionId={selectedChampionId}
          onChampionChange={(champId) => {
            setSelectedChampionId(champId);
            loadMatchesAndStats(activeQueue, champId, selectedRole, selectedResult);
          }}
          selectedRole={selectedRole}
          onRoleChange={(role) => {
            setSelectedRole(role);
            loadMatchesAndStats(activeQueue, selectedChampionId, role, selectedResult);
          }}
          selectedResult={selectedResult}
          onResultChange={(res) => {
            setSelectedResult(res);
            loadMatchesAndStats(activeQueue, selectedChampionId, selectedRole, res);
          }}
          onResetFilters={() => {
            setActiveQueue('all');
            setSelectedChampionId(undefined);
            setSelectedRole('all');
            setSelectedResult('all');
            loadMatchesAndStats('all', undefined, 'all', 'all');
          }}
          isLoading={isLoadingMatches}
          total={totalMatches}
          hasMore={matches.length < totalMatches}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
          availableQueues={gameQueues}
          champStats={champStats}
        />
      </div>
    </div>
  );
}
