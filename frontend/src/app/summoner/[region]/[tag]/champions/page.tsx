'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchChampionStats } from '@/lib/api';
import { ChampionStatSummary } from '@/types';
import ChampionStatsView from '@/components/ChampionStatsView';
import { useSummonerContext } from '../SummonerContext';

export default function SummonerChampionsPage() {
  const { region, tag, profileData } = useSummonerContext();
  const [champStats, setChampStats] = useState<ChampionStatSummary[]>([]);
  const [activeQueue, setActiveQueue] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadChampionStats = useCallback(
    async (queue: string) => {
      if (!region || !tag) return;
      setIsLoading(true);
      try {
        const stats = await fetchChampionStats(region, tag, queue);
        setChampStats(stats);
      } catch (err) {
        console.error('Failed to load champion stats:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [region, tag]
  );

  useEffect(() => {
    if (profileData?.summoner) {
      loadChampionStats(activeQueue);
    }
  }, [profileData?.summoner, activeQueue, loadChampionStats]);

  return (
    <div className="w-full">
      <ChampionStatsView
        stats={champStats}
        activeQueue={activeQueue}
        onQueueChange={(queue) => setActiveQueue(queue)}
        isLoading={isLoading}
      />
    </div>
  );
}
