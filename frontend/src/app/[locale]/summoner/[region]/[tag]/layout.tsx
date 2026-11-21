'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { fetchSummonerProfile, fetchLiveGame } from '@/lib/api';
import { SummonerProfileResponse, LiveGameResponse } from '@/types';
import SummonerHeader from '@/components/SummonerHeader';
import AutoRefreshWatcher from '@/components/AutoRefreshWatcher';
import Breadcrumbs from '@/components/Breadcrumbs';
import { SummonerContext } from './SummonerContext';
import { useTranslation } from '@/i18n/LanguageContext';

export default function SummonerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { t, locale } = useTranslation();
  const params = useParams();
  const pathname = usePathname();
  const region = (params?.region as string) || 'euw';
  const tag = (params?.tag as string) || '';

  const [profileData, setProfileData] = useState<SummonerProfileResponse | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [liveData, setLiveData] = useState<LiveGameResponse | null>(null);
  const [isLoadingLive, setIsLoadingLive] = useState(false);
  const [refreshTimestamp, setRefreshTimestamp] = useState(Date.now());

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

  // Persist visited profile with avatar & level to recent searches
  useEffect(() => {
    if (!profileData?.summoner) return;
    try {
      const raw = localStorage.getItem('rifthero_recent_searches');
      const list = raw ? JSON.parse(raw) : [];
      const updated = [
        {
          gameName: profileData.summoner.gameName,
          tagLine: profileData.summoner.tagLine,
          region: profileData.summoner.region,
          profileIconId: profileData.summoner.profileIconId,
          summonerLevel: Number(profileData.summoner.summonerLevel),
          timestamp: Date.now(),
        },
        ...list.filter(
          (item: any) =>
            !(
              item.gameName.toLowerCase() === profileData.summoner!.gameName.toLowerCase() &&
              item.tagLine.toLowerCase() === profileData.summoner!.tagLine.toLowerCase() &&
              item.region.toLowerCase() === profileData.summoner!.region.toLowerCase()
            )
        ),
      ].slice(0, 8);
      localStorage.setItem('rifthero_recent_searches', JSON.stringify(updated));
    } catch {}
  }, [profileData?.summoner]);

  const handleRefreshCompleted = () => {
    loadProfile();
    setRefreshTimestamp(Date.now());
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
        refreshTimestamp,
      }}
    >
      <div className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 space-y-4">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={(() => {
            const summonerName = profileData
              ? `${profileData.summoner.gameName}#${profileData.summoner.tagLine}`
              : decodeURIComponent(tag).replace('-', '#');
            const basePath = `/${locale}/summoner/${region}/${encodeURIComponent(tag)}`;
            const serverItem = { label: region.toUpperCase() };

            if (pathname.includes('/live')) {
              return [
                serverItem,
                { label: summonerName, href: basePath },
                { label: t('summoner.tabLive') || 'Live Game' },
              ];
            }
            if (pathname.includes('/champions')) {
              return [
                serverItem,
                { label: summonerName, href: basePath },
                { label: t('summoner.tabChampions') || 'Champions' },
              ];
            }
            if (pathname.includes('/masteries')) {
              return [
                serverItem,
                { label: summonerName, href: basePath },
                { label: t('summoner.tabMasteries') || 'Meisterschaften' },
              ];
            }
            if (pathname.includes('/challenges')) {
              return [
                serverItem,
                { label: summonerName, href: basePath },
                { label: t('summoner.tabChallenges') || 'Herausforderungen' },
              ];
            }
            return [serverItem, { label: summonerName }];
          })()}
        />

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
