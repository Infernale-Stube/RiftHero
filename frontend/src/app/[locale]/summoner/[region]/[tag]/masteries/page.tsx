'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchSummonerMasteries } from '@/lib/api';
import { SummonerMasteriesResponse } from '@/types';
import MasteriesView from '@/components/MasteriesView';
import { useSummonerContext } from '../SummonerContext';

export default function SummonerMasteriesPage() {
  const { region, tag, profileData } = useSummonerContext();
  const [masteriesData, setMasteriesData] = useState<SummonerMasteriesResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadMasteries = useCallback(async () => {
    if (!region || !tag) return;
    setIsLoading(true);
    try {
      const data = await fetchSummonerMasteries(region, tag);
      setMasteriesData(data);
    } catch (err) {
      console.error('Failed to load champion masteries:', err);
    } finally {
      setIsLoading(false);
    }
  }, [region, tag]);

  useEffect(() => {
    if (profileData?.summoner) {
      loadMasteries();
    }
  }, [profileData?.summoner, loadMasteries]);

  return (
    <div className="w-full">
      <MasteriesView
        masteriesData={masteriesData}
        isLoading={isLoading}
      />
    </div>
  );
}
