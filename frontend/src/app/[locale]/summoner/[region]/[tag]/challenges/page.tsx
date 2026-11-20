'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchSummonerChallenges } from '@/lib/api';
import { FormattedPlayerChallenges } from '@/types';
import ChallengesView from '@/components/ChallengesView';
import { useSummonerContext } from '../SummonerContext';

export default function SummonerChallengesPage() {
  const { region, tag, profileData, refreshTimestamp } = useSummonerContext();
  const [challengesData, setChallengesData] = useState<FormattedPlayerChallenges | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadChallenges = useCallback(
    async (isSilent = false) => {
      if (!region || !tag) return;
      if (!isSilent) setIsLoading(true);
      try {
        const data = await fetchSummonerChallenges(region, tag);
        setChallengesData(data);
      } catch (err) {
        console.error('Failed to load challenges:', err);
      } finally {
        if (!isSilent) setIsLoading(false);
      }
    },
    [region, tag]
  );

  useEffect(() => {
    if (profileData?.summoner) {
      loadChallenges();
    }
  }, [profileData?.summoner?.id, loadChallenges]);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    loadChallenges(true);
  }, [refreshTimestamp, loadChallenges]);

  return (
    <div className="w-full">
      <ChallengesView
        challengesData={challengesData}
        isLoading={isLoading}
      />
    </div>
  );
}
