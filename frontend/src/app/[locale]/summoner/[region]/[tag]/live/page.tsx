'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
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
  const { t, locale } = useTranslation();
  const router = useRouter();

  const gameName = profileData?.summoner?.gameName || '';
  const tagLine = profileData?.summoner?.tagLine || '';

  // Track if we ever saw an active live match during this session
  const wasInGameRef = useRef<boolean>(Boolean(liveData?.inGame));
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const isRedirectingRef = useRef<boolean>(false);

  useEffect(() => {
    if (liveData?.inGame) {
      wasInGameRef.current = true;
    }
  }, [liveData?.inGame]);

  const handleMatchEnded = useCallback(async () => {
    if (isRedirectingRef.current) return;
    isRedirectingRef.current = true;
    setIsRedirecting(true);

    try {
      // Trigger automatic backend profile crawl for the newly finished match & updated LP
      await triggerSummonerRefresh(region, tag);
    } catch (err) {
      console.error('Auto-refresh after live game error:', err);
    }

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('rifthero_auto_refresh_after_live', 'true');
      } catch {}
    }

    // Refresh profile in context and navigate back to the overview page
    await reloadProfile();
    router.push(`/${locale}/summoner/${region}/${encodeURIComponent(tag)}`);
  }, [region, tag, reloadProfile, router, locale]);

  // Poll every 3 minutes (180,000 ms) while on this page
  useEffect(() => {
    if (!region || !tag) return;

    const interval = setInterval(async () => {
      try {
        const updated = await reloadLiveGame();
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
    const updated = await reloadLiveGame();
    if (wasInGameRef.current && (!updated || updated.inGame === false)) {
      await handleMatchEnded();
    }
  };

  return (
    <div className="w-full relative">
      {isRedirecting && (
        <div className="mb-4 flex items-center justify-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-300 backdrop-blur-md animate-pulse">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          <span className="text-sm font-bold">
            {t('live.matchEndedRedirect')}
          </span>
        </div>
      )}

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
