'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useSummonerContext } from '../SummonerContext';
import { useTranslation } from '@/i18n/LanguageContext';
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
  const { locale } = useTranslation();
  const router = useRouter();

  const gameName = profileData?.summoner?.gameName || '';
  const tagLine = profileData?.summoner?.tagLine || '';

  // Track if we ever saw an active live match during this session
  const wasInGameRef = useRef<boolean>(Boolean(liveData?.inGame));
  const isRedirectingRef = useRef<boolean>(false);

  useEffect(() => {
    if (liveData?.inGame) {
      wasInGameRef.current = true;
    }
  }, [liveData?.inGame]);

  const handleMatchEnded = useCallback(async () => {
    if (isRedirectingRef.current) return;
    isRedirectingRef.current = true;

    try {
      // Trigger background profile crawl silently
      await triggerSummonerRefresh(region, tag);
    } catch (err) {
      console.error('Auto-refresh after live game error:', err);
    }

    // Refresh profile in context silently in the background
    reloadProfile(true);

    // Smoothly replace route without page reload or history clutter
    router.replace(`/${locale}/summoner/${region}/${tag}`);
  }, [region, tag, reloadProfile, router, locale]);

  // Poll every 3 minutes (180,000 ms) while on this page silently
  useEffect(() => {
    if (!region || !tag) return;

    const interval = setInterval(async () => {
      try {
        const updated = await reloadLiveGame(true);
        // If the player was in-game and now is no longer in-game: match ended!
        if (wasInGameRef.current && (!updated || updated.inGame === false)) {
          await handleMatchEnded();
        }
      } catch (err) {
        console.error('Error during 3-min live poll:', err);
      }
    }, 3 * 60 * 1000); // 3 minutes

    return () => clearInterval(interval);
  }, [region, tag, reloadLiveGame, handleMatchEnded]);

  const handleRefresh = async () => {
    const updated = await reloadLiveGame(false);
    if (wasInGameRef.current && (!updated || updated.inGame === false)) {
      await handleMatchEnded();
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
