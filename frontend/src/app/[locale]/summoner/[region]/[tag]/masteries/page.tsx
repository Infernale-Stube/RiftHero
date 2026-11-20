'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchSummonerMasteries } from '@/lib/api';
import { SummonerMasteriesResponse } from '@/types';
import MasteriesView from '@/components/MasteriesView';
import { useSummonerContext } from '../SummonerContext';

export default function SummonerMasteriesPage() {
  const { region, tag, profileData, refreshTimestamp } = useSummonerContext();
  const [masteriesData, setMasteriesData] = useState<SummonerMasteriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadMasteries = useCallback(
    async (isSilent = false) => {
      if (!region || !tag) return;
      if (!isSilent) setIsLoading(true);
      try {
        const data = await fetchSummonerMasteries(region, tag);
        setMasteriesData(data);
      } catch (err) {
        console.error('Failed to load champion masteries:', err);
      } finally {
        if (!isSilent) setIsLoading(false);
      }
    },
    [region, tag]
  );

  useEffect(() => {
    if (profileData?.summoner) {
      loadMasteries();
    }
  }, [profileData?.summoner?.id, loadMasteries]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadMasteries(true);
  }, [refreshTimestamp, loadMasteries]);

  return (
    <div className="w-full">
      <MasteriesView
        masteriesData={masteriesData}
        isLoading={isLoading}
      />
    </div>
  );
}
