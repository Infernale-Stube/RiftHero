'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchChampionStats } from '@/lib/api';
import { ChampionStatSummary } from '@/types';
import ChampionStatsView from '@/components/ChampionStatsView';
import { useSummonerContext } from '../SummonerContext';

export default function SummonerChampionsPage() {
  const { region, tag, profileData, refreshTimestamp, gameQueues } = useSummonerContext();
  const [champStats, setChampStats] = useState<ChampionStatSummary[]>([]);
  const [activeQueue, setActiveQueue] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadChampionStats = useCallback(
    async (queue: string, isSilent = false) => {
      if (!region || !tag) return;
      if (!isSilent) setIsLoading(true);
      try {
        const stats = await fetchChampionStats(region, tag, queue);
        setChampStats(stats);
      } catch (err) {
        console.error('Failed to load champion stats:', err);
      } finally {
        if (!isSilent) setIsLoading(false);
      }
    },
    [region, tag]
  );

  useEffect(() => {
    if (profileData?.summoner) {
      loadChampionStats(activeQueue);
    }
  }, [profileData?.summoner?.id, activeQueue, loadChampionStats]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadChampionStats(activeQueue, true);
  }, [refreshTimestamp, activeQueue, loadChampionStats]);

  return (
    <div className="w-full">
      <ChampionStatsView
        stats={champStats}
        activeQueue={activeQueue}
        onQueueChange={(queue) => setActiveQueue(queue)}
        isLoading={isLoading}
        availableQueues={gameQueues}
      />
    </div>
  );
}
