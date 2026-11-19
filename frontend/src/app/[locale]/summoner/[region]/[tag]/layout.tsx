'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { fetchSummonerProfile, fetchLiveGame } from '@/lib/api';
import { SummonerProfileResponse, LiveGameResponse } from '@/types';
import SummonerHeader from '@/components/SummonerHeader';
import AutoRefreshWatcher from '@/components/AutoRefreshWatcher';
import { SummonerContext } from './SummonerContext';
import { useTranslation } from '@/i18n/LanguageContext';

export default function SummonerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const params = useParams();
  const region = (params?.region as string) || 'euw';
  const tag = (params?.tag as string) || '';

  const [profileData, setProfileData] = useState<SummonerProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [liveData, setLiveData] = useState<LiveGameResponse | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!region || !tag) return;
    try {
      const data = await fetchSummonerProfile(region, tag);
      setProfileData(data);
    } catch (err: any) {
      setError(err.message || 'Fehler beim Laden des Profils');
    } finally {
      setIsLoadingProfile(false);
    }
  }, [region, tag]);

  const loadLiveGame = useCallback(async () => {
    if (!region || !tag) return;
    setIsLoadingLive(true);
    try {
      const res = await fetchLiveGame(region, tag);
      setLiveData(res);
    } catch (err) {
      console.error('Failed to load live game:', err);
    } finally {
      setIsLoadingLive(false);
    }
  }, [region, tag]);

  useEffect(() => {
    loadProfile();
    loadLiveGame();
  }, [loadProfile, loadLiveGame]);

  const handleRefreshCompleted = () => {
    loadProfile();
  };

  if (isLoadingProfile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-400 mb-4" />
        <h2 className="text-lg font-bold text-zinc-200">{t('summoner.loadingProfile')}</h2>
        <p className="text-xs text-zinc-500 mt-1">{t('summoner.loadingSubtitle')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-8 shadow-xl">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-400 mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">{t('summoner.profileNotFound')}</h2>
          <p className="text-sm text-zinc-300">{error}</p>
        </div>
      </div>
    );
  }

  if (!profileData?.summoner) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
        <div className="rounded-2xl border border-white/[0.08] bg-[#0d1116] p-8 max-w-md shadow-2xl backdrop-blur-md">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-orange-400 mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            {t('summoner.newPlayerTitle')}
          </h2>
          <p className="text-sm text-zinc-400 mb-4">
            {t('summoner.newPlayerDesc')}
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-orange-300">
            <span className="h-2 w-2 rounded-full bg-orange-400 animate-ping" />
            <span>{t('summoner.highPrioritySync')}</span>
          </div>
        </div>

        <AutoRefreshWatcher
          region={region}
          tag={tag}
          isUpdating={true}
          onRefreshCompleted={handleRefreshCompleted}
        />
      </div>
    );
  }

  return (
    <SummonerContext.Provider
      value={{
        region,
        tag,
        profileData,
        isLoadingProfile,
        error,
        liveData,
        isLoadingLive,
        reloadProfile: loadProfile,
        reloadLiveGame: loadLiveGame,
      }}
    >
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
        <AutoRefreshWatcher
          region={region}
          tag={tag}
          isUpdating={Boolean(profileData.isUpdating)}
          onRefreshCompleted={handleRefreshCompleted}
        />

        <div className="mb-6">
          <SummonerHeader
            summoner={profileData.summoner}
            ranks={profileData.ranks}
            isUpdating={Boolean(profileData.isUpdating)}
            isLive={liveData?.inGame || false}
            liveData={liveData}
            isLoadingLive={isLoadingLive}
            onRefreshLive={loadLiveGame}
          />
        </div>

        {children}
      </div>
    </SummonerContext.Provider>
  );
}
