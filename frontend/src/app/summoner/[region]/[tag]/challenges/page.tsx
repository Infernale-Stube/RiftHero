'use client';

import { useState, useEffect, useCallback } from 'react';
import { fetchSummonerChallenges } from '@/lib/api';
import { FormattedPlayerChallenges } from '@/types';
import ChallengesView from '@/components/ChallengesView';
import { useSummonerContext } from '../SummonerContext';

export default function SummonerChallengesPage() {
  const { region, tag, profileData } = useSummonerContext();
  const [challengesData, setChallengesData] = useState<FormattedPlayerChallenges | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadChallenges = useCallback(async () => {
    if (!region || !tag) return;
    setIsLoading(true);
    try {
      const data = await fetchSummonerChallenges(region, tag);
      setChallengesData(data);
    } catch (err) {
      console.error('Failed to load challenges:', err);
    } finally {
      setIsLoading(false);
    }
  }, [region, tag]);

  useEffect(() => {
    if (profileData?.summoner) {
      loadChallenges();
    }
  }, [profileData?.summoner, loadChallenges]);

  return (
    <div className="w-full">
      <ChallengesView
        challengesData={challengesData}
        isLoading={isLoading}
      />
    </div>
  );
}
