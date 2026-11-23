'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useSummonerContext } from '../SummonerContext';
import { triggerSummonerRefresh } from '@/lib/api';
import LiveGameView from '@/components/LiveGameView';

export default function SummonerLivePage() {
  const {
    region,
    tag,
    profileData,
    liveData,
    isLoadingLive,
    reloadLiveGame,
    reloadProfile,
  } = useSummonerContext();

  const gameName = profileData?.summoner?.gameName || '';
  const tagLine = profileData?.summoner?.tagLine || '';

  // Track if we ever saw an active live match during this session
  const wasInGameRef = useRef<boolean>(Boolean(liveData?.inGame));

  useEffect(() => {
    if (liveData?.inGame) {
      wasInGameRef.current = true;
    }
  }, [liveData?.inGame]);

  const handleMatchFinished = useCallback(async () => {
    try {
      // Trigger background profile crawl silently so the new match is ingested
      await triggerSummonerRefresh(region, tag);
    } catch (err) {
      console.error('Auto-refresh after live game error:', err);
    }

    // Refresh profile in context silently in the background
    reloadProfile(true);
  }, [region, tag, reloadProfile]);

  // Poll every 3 minutes (180,000 ms) while on this page silently
  useEffect(() => {
    if (!region || !tag) return;

    const interval = setInterval(async () => {
      try {
        const updated = await reloadLiveGame(true);
        // If the match was active and now ended, silently trigger profile refresh
        if (wasInGameRef.current && (!updated || updated.inGame === false)) {
          wasInGameRef.current = false;
          await handleMatchFinished();
        }
      } catch (err) {
        console.error('Error during 3-min live poll:', err);
      }
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(interval);
  }, [region, tag, reloadLiveGame, handleMatchFinished]);

  const handleRefresh = async () => {
    const updated = await reloadLiveGame(false);
    if (wasInGameRef.current && (!updated || updated.inGame === false)) {
      wasInGameRef.current = false;
      await handleMatchFinished();
    }
  };

  return (
    <div className="w-full relative">
      <LiveGameView
        region={region}
        gameName={gameName}
        tagLine={tagLine}
        liveData={liveData}
        isLoading={isLoadingLive}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
