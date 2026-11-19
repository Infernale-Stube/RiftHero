'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio, Globe, ChevronLeft, RotateCw } from 'lucide-react';
import { SummonerData, SummonerRank, LiveGameResponse } from '@/types';
import { getProfileIconUrl, getChampionSplashUrl } from '@/lib/ddragon';
import { getRankEmblemUrl } from './RankBadge';
import { formatTimeAgo } from '@/lib/utils';
import { useTranslation } from '@/i18n/LanguageContext';
import { triggerSummonerRefresh } from '@/lib/api';

interface SummonerHeaderProps {
  summoner: SummonerData;
  ranks: SummonerRank[];
  isUpdating?: boolean;
  onManualRefresh?: () => void;
  activeTab?: 'matches' | 'champions' | 'masteries' | 'challenges' | 'live';
  onTabChange?: (tab: 'matches' | 'champions' | 'masteries' | 'challenges' | 'live') => void;
  isLive?: boolean;
  liveData?: LiveGameResponse | null;
  isLoadingLive?: boolean;
  onRefreshLive?: () => void;
}

export default function SummonerHeader({
  summoner,
  ranks,
  isUpdating = false,
  onManualRefresh,
  activeTab: controlledTab,
  onTabChange,
  isLive = false,
  liveData,
  isLoadingLive = false,
  onRefreshLive,
}: SummonerHeaderProps) {
  const { t, locale } = useTranslation();
  const pathname = usePathname();
  const cleanPath = (pathname || '').replace(/\/$/, '');

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const handleManualRefresh = async () => {
    if (isRefreshing || isUpdating) return;
    setIsRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await triggerSummonerRefresh(summoner.region, formattedTag);
      if (res.status === 'cooldown' && res.message) {
        setRefreshMsg(res.message);
        setTimeout(() => setRefreshMsg(null), 3500);
      }
      onManualRefresh?.();
    } catch (err: any) {
      setRefreshMsg(err?.message || 'Fehler beim Starten');
      setTimeout(() => setRefreshMsg(null), 3500);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Live Timer for active match
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!liveData?.inGame || !liveData.game) return;

    const startTime = liveData.game.gameStartTime;
    const initialElapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    setElapsedSeconds(initialElapsed);

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [liveData]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Resolve active tab from URL path or prop
  const currentTab =
    controlledTab ||
    (cleanPath.endsWith('/champions')
      ? 'champions'
      : cleanPath.endsWith('/masteries')
      ? 'masteries'
      : cleanPath.endsWith('/challenges')
      ? 'challenges'
      : cleanPath.endsWith('/live')
      ? 'live'
      : 'matches');

  const soloRank = ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  const flexRank = ranks.find((r) => r.queueType === 'RANKED_FLEX_SR');
  const formattedTag = `${summoner.gameName}-${summoner.tagLine}`;
  const basePath = `/${locale}/summoner/${summoner.region}/${encodeURIComponent(formattedTag)}`;

  const getRegionName = (reg: string) => {
    switch (reg.toLowerCase()) {
      case 'euw':
        return 'Europe West';
      case 'eune':
        return 'Europe Nordic & East';
      case 'na':
        return 'North America';
      case 'kr':
        return 'Korea';
      default:
        return reg.toUpperCase();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Breadcrumb Navigation (LoLDB Style) */}
      <nav aria-label="breadcrumb" className="flex items-center gap-2 text-xs text-zinc-400">
        <Link
          href={`/${locale}`}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Homepage</span>
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="font-bold text-orange-400">
          {summoner.gameName}#{summoner.tagLine}
        </span>
      </nav>

      {/* Main Profile Header Card with Splash Background */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d1116] p-6 shadow-2xl backdrop-blur-md">
        {/* Profile Background Image (Most Played / Top Mastery Champion Splash Art) */}
        <div className="absolute inset-y-0 right-0 w-full sm:w-4/5 md:w-3/4 lg:w-2/3 pointer-events-none select-none overflow-hidden">
          <Image
            src={summoner.backgroundUrl || getChampionSplashUrl('Briar')}
            alt={summoner.gameName}
            fill
            className="object-cover object-[right_center] opacity-80 saturate-[1.4] contrast-110"
            priority
            unoptimized
          />
          {/* Smooth gradient fade into #0d1116 */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0d1116] via-[#0d1116]/80 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d1116] via-transparent to-[#0d1116]/30" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left Block: Avatar + Name + Pills + Ranks */}
          <div className="flex items-start gap-5">
            {/* Circular Avatar with Account Level Badge */}
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-full border-2 border-white/10 shadow-xl">
              <Image
                src={getProfileIconUrl(summoner.profileIconId)}
                alt={summoner.gameName}
                width={96}
                height={96}
                className="h-full w-full object-cover"
                unoptimized
              />
              <div className="absolute bottom-0 inset-x-0 bg-black/85 py-0.5 text-center text-[10px] font-black text-amber-300 border-t border-white/10">
                {summoner.summonerLevel}
              </div>
            </div>

            {/* Info Block */}
            <div className="flex flex-col">
              {/* Name & Tag */}
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-baseline">
                <span>{summoner.gameName}</span>
                <span className="text-zinc-500 font-bold ml-1">#{summoner.tagLine}</span>
              </h1>

              {/* Pills Row (Level + Region) */}
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="rounded-full bg-white/[0.07] border border-white/[0.08] px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
                  Level {summoner.summonerLevel.toString()}
                </span>
                <span className="flex items-center gap-1 rounded-full bg-white/[0.07] border border-white/[0.08] px-2.5 py-0.5 text-xs font-semibold text-zinc-300">
                  <Globe className="h-3 w-3 text-zinc-400" />
                  <span>{getRegionName(summoner.region)}</span>
                </span>
              </div>

              {/* Mini Rank Rows below pills */}
              <div className="mt-3 flex flex-col gap-1.5 text-xs">
                {soloRank ? (
                  <div className="flex items-center gap-2">
                    <div className="relative h-4 w-4 shrink-0">
                      <Image
                        src={getRankEmblemUrl(soloRank.tier)}
                        alt={soloRank.tier}
                        width={16}
                        height={16}
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="text-zinc-400 font-medium">Solo/Duo</span>
                    <span className="font-bold text-sky-400 uppercase">
                      {soloRank.tier} {soloRank.rank} · {soloRank.leaguePoints} LP
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-zinc-500">
                    <span className="text-zinc-500 font-medium">Solo/Duo</span>
                    <span className="font-semibold">{t('summoner.unranked')}</span>
                  </div>
                )}

                {flexRank && (
                  <div className="flex items-center gap-2">
                    <div className="relative h-4 w-4 shrink-0">
                      <Image
                        src={getRankEmblemUrl(flexRank.tier)}
                        alt={flexRank.tier}
                        width={16}
                        height={16}
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                    <span className="text-zinc-400 font-medium">Flex</span>
                    <span className="font-bold text-zinc-300 uppercase">
                      {flexRank.tier} {flexRank.rank} · {flexRank.leaguePoints} LP
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Block: Subtle Live Game Pill or Cached Time */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            {liveData?.inGame && liveData.game ? (
              <Link
                href={`${basePath}/live`}
                className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/25 px-3 py-1 text-xs text-zinc-300 hover:border-rose-500/50 hover:bg-rose-950/40 transition-all backdrop-blur-sm"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500" />
                </span>
                <span className="font-black text-rose-400 uppercase tracking-wider text-[11px]">
                  Live
                </span>
                <span className="text-zinc-600">•</span>
                <span className="font-semibold text-zinc-200 text-xs">
                  {liveData.game.queueName}
                </span>
                <span className="text-zinc-600">•</span>
                <span className="font-mono font-bold text-amber-300 text-xs">
                  {formatTimer(elapsedSeconds)}
                </span>
              </Link>
            ) : (
              <div className="flex flex-col items-start md:items-end gap-1.5">
                <div className="flex items-center gap-2.5">
                  {summoner.lastFetchedAt && (
                    <span className="text-[11px] text-zinc-400 font-medium hidden sm:inline">
                      {t('summoner.cachedAgo', { time: formatTimeAgo(summoner.lastFetchedAt) })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing || isUpdating}
                    className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition-all border shadow-sm ${
                      isRefreshing || isUpdating
                        ? 'bg-orange-500/10 border-orange-500/30 text-orange-400 cursor-not-allowed'
                        : 'bg-white/[0.06] hover:bg-white/[0.12] border-white/10 text-zinc-200 hover:text-white hover:border-white/20'
                    }`}
                    title={isRefreshing || isUpdating ? t('summoner.updating') : t('summoner.updateProfile')}
                  >
                    <RotateCw
                      className={`h-3 w-3 ${isRefreshing || isUpdating ? 'animate-spin text-orange-400' : 'text-zinc-400'}`}
                    />
                    <span>{isRefreshing || isUpdating ? t('summoner.updating') : t('summoner.updateProfile')}</span>
                  </button>
                </div>
                {refreshMsg && (
                  <span className="text-[10px] font-semibold text-amber-400">
                    {refreshMsg}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Tab Bar with Subpage Links */}
        <div className="mt-6 flex items-center gap-6 border-t border-white/[0.06] pt-3 text-xs font-bold">
          <Link
            href={basePath}
            onClick={() => onTabChange?.('matches')}
            className={`relative pb-2 transition-colors ${
              currentTab === 'matches'
                ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-orange-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('summoner.tabMatches')}
          </Link>

          <Link
            href={`${basePath}/champions`}
            onClick={() => onTabChange?.('champions')}
            className={`relative pb-2 transition-colors ${
              currentTab === 'champions'
                ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-orange-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('summoner.tabChampions')}
          </Link>

          <Link
            href={`${basePath}/masteries`}
            onClick={() => onTabChange?.('masteries')}
            className={`relative pb-2 transition-colors ${
              currentTab === 'masteries'
                ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-orange-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('summoner.tabMasteries')}
          </Link>

          <Link
            href={`${basePath}/challenges`}
            onClick={() => onTabChange?.('challenges')}
            className={`relative pb-2 transition-colors ${
              currentTab === 'challenges'
                ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-orange-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('summoner.tabChallenges')}
          </Link>

          <Link
            href={`${basePath}/live`}
            onClick={() => onTabChange?.('live')}
            className={`relative flex items-center gap-1.5 pb-2 transition-colors ${
              currentTab === 'live'
                ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-orange-500'
                : isLive
                ? 'text-emerald-400 hover:text-emerald-300'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {isLive ? (
              <span className="relative flex h-2 w-2 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            ) : (
              <Radio className="h-3.5 w-3.5 text-zinc-500" />
            )}
            <span>{t('summoner.tabLive')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
