'use client';

import { useState, useEffect, useCallback } from 'react';
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
  const { region, tag, profileData } = useSummonerContext();

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

  const [lpHistory, setLpHistory] = useState<LpHistorySummary | null>(null);
  const [playedWith, setPlayedWith] = useState<PlayedWithTeammate[]>([]);

  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadMatchesAndStats = useCallback(
    async (queue: string) => {
      if (!region || !tag) return;
      setIsLoadingMatches(true);
      try {
        const [matchesRes, statsRes, lpHRes, playedRes] = await Promise.all([
          fetchSummonerMatches(region, tag, queue, 20, 0),
          fetchChampionStats(region, tag, queue),
          fetchLpHistory(region, tag, 'RANKED_SOLO_5x5'),
          fetchPlayedWith(region, tag, 5),
        ]);
        setMatches(matchesRes.matches);
        setTotalMatches(matchesRes.total);
        setChampStats(statsRes);
        setLpHistory(lpHRes);
        setPlayedWith(playedRes);
      } catch (err: any) {
        console.error('Failed to load matches/stats:', err);
      } finally {
        setIsLoadingMatches(false);
      }
    },
    [region, tag]
  );

  useEffect(() => {
    if (profileData?.summoner) {
      loadMatchesAndStats(activeQueue);
    }
  }, [profileData?.summoner, activeQueue, loadMatchesAndStats]);

  const handleLoadMore = async () => {
    if (isLoadingMore || matches.length >= totalMatches) return;
    setIsLoadingMore(true);
    try {
      const res = await fetchSummonerMatches(region, tag, activeQueue, 20, matches.length);
      setMatches((prev) => [...prev, ...res.matches]);
      setTotalMatches(res.total);
    } catch (err) {
      console.error('Failed to load more matches:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const soloRank = profileData?.ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  const flexRank = profileData?.ranks.find((r) => r.queueType === 'RANKED_FLEX_SR');

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Left Sidebar: Ranked Solo/Duo + LP Graph + Played With + Champion Stats */}
      <div className="w-full lg:w-[350px] shrink-0 flex flex-col gap-4 lg:sticky lg:top-6">
        {/* Ranked Solo/Duo Card with LP History Graph */}
        <RankCard
          title={t('summoner.soloRank')}
          rankData={soloRank}
          lpHistory={lpHistory}
        />

        {/* Ranked Flex Card (if ranked) */}
        {flexRank && (
          <RankCard
            title={t('summoner.flexRank')}
            rankData={flexRank}
          />
        )}

        {/* Played With Synergy Widget (LoLDB Signature) */}
        <PlayedWithWidget
          teammates={playedWith}
          region={region}
        />

        {/* Champion Stats */}
        <ChampionStats
          stats={champStats}
        />
      </div>

      {/* Right Main Column: Match History */}
      <div className="flex-1 w-full min-w-0">
        <MatchHistory
          matches={matches}
          region={region}
          activeQueue={activeQueue}
          onQueueChange={(queue) => setActiveQueue(queue)}
          isLoading={isLoadingMatches}
          total={totalMatches}
          hasMore={matches.length < totalMatches}
          isLoadingMore={isLoadingMore}
          onLoadMore={handleLoadMore}
        />
      </div>
    </div>
  );
}
