'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Radio, Globe } from 'lucide-react';
import { SummonerData, SummonerRank, LiveGameResponse } from '@/types';
import { getProfileIconUrl, getChampionSplashUrl } from '@/lib/ddragon';
import RankBadge, { TIER_COLORS } from './RankBadge';
import { formatTimeAgo } from '@/lib/utils';
import { useTranslation } from '@/i18n/LanguageContext';

interface SummonerHeaderProps {
  summoner: SummonerData;
  ranks: SummonerRank[];
  isUpdating?: boolean;
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
  const ranked5s = ranks.find(
    (r) =>
      r.queueType === 'RANKED_PREMADE_5x5' ||
      r.queueType === 'RANKED_TEAM_5x5' ||
      r.queueType === 'RANKED_5s' ||
      r.queueType === 'RANKED_5X5'
  );
  const formattedTag = `${summoner.gameName}-${summoner.tagLine}`;
  const basePath = `/${locale}/summoner/${summoner.region}/${encodeURIComponent(formattedTag)}`;

  const rankCards = [
    {
      id: 'solo',
      title: 'Ranked Solo/Duo',
      rank: soloRank,
    },
    {
      id: 'flex',
      title: 'Ranked Flex',
      rank: flexRank,
    },
    {
      id: 'ranked5s',
      title: 'Ranked 5s',
      rank: ranked5s,
    },
  ];

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
      case 'br':
        return 'Brazil';
      case 'lan':
        return 'Latin America North';
      case 'las':
        return 'Latin America South';
      case 'oce':
        return 'Oceania';
      case 'tr':
        return 'Turkey';
      case 'ru':
        return 'Russia';
      case 'jp':
        return 'Japan';
      case 'sg':
        return 'Singapore';
      case 'ph':
        return 'Philippines';
      case 'tw':
        return 'Taiwan';
      case 'vn':
        return 'Vietnam';
      case 'th':
        return 'Thailand';
      case 'me':
        return 'Middle East';
      default:
        return reg.toUpperCase();
    }
  };

  return (
    <div className="flex flex-col gap-4">
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
          {/* Left Block: Avatar + Name + Pills */}
          <div className="flex items-center gap-5">
            {/* Circular Avatar with Yellow/Amber Accent Border */}
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-full border-2 sm:border-[2.5px] border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
              <Image
                src={getProfileIconUrl(summoner.profileIconId)}
                alt={summoner.gameName}
                width={96}
                height={96}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>

            {/* Info Block */}
            <div className="flex flex-col justify-center">
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
            </div>
          </div>

          {/* Right Block: Subtle Live Game Pill or Cached Time */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            {liveData?.inGame && liveData.game ? (
              <Link
                href={`${basePath}/live`}
                className="flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-zinc-200 hover:border-amber-400/60 hover:bg-amber-500/20 transition-all backdrop-blur-sm shadow-[0_0_16px_rgba(245,158,11,0.18)]"
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
                </span>
                <span className="font-black text-amber-400 uppercase tracking-wider text-[11px]">
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
            ) : summoner.lastFetchedAt ? (
              <div className="flex items-center gap-1.5 text-[11px] font-medium">
                {isUpdating ? (
                  <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    <span>{t('summoner.bgSync')}</span>
                  </span>
                ) : (
                  <span className="text-zinc-500">
                    {t('summoner.cachedAgo', { time: formatTimeAgo(summoner.lastFetchedAt) })}
                  </span>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Ranks Showcase Row: Background-free & Clean */}
        <div className="relative z-10 mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {rankCards.map((rc) => {
            const hasRank = !!rc.rank;
            const theme = hasRank
              ? TIER_COLORS[rc.rank!.tier.toUpperCase()] || TIER_COLORS.UNRANKED
              : TIER_COLORS.UNRANKED;

            return (
              <div
                key={rc.id}
                className="group relative flex items-center gap-4 py-2 transition-all duration-200"
              >
                <RankBadge
                  tier={rc.rank?.tier || 'UNRANKED'}
                  size="lg"
                  showGlow={hasRank}
                  className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 transition-transform duration-200 group-hover:scale-105"
                />
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    {rc.title}
                  </span>
                  {hasRank ? (
                    <>
                      <div className="flex items-baseline gap-1.5 leading-tight mt-1 truncate">
                        <span className={`text-base sm:text-lg font-black uppercase tracking-tight ${theme.text} truncate`}>
                          {rc.rank!.tier} {rc.rank!.rank}
                        </span>
                        <span className="text-zinc-500 font-bold text-xs">·</span>
                        <span className="text-sm font-black text-amber-400 shrink-0">
                          {rc.rank!.leaguePoints} LP
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2 text-xs text-zinc-400 font-medium">
                        <span className="font-bold text-emerald-400">{rc.rank!.wins}W</span>
                        <span className="font-bold text-rose-400">{rc.rank!.losses}L</span>
                        <span className="text-zinc-500">•</span>
                        <span className={`font-bold ${
                          rc.rank!.winrate > 50
                            ? 'text-emerald-400'
                            : rc.rank!.winrate < 50
                            ? 'text-rose-400'
                            : 'text-zinc-400'
                        }`}>
                          {rc.rank!.winrate}% WR
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-base font-bold text-zinc-400 mt-1">
                        {t('summoner.unranked')}
                      </span>
                      <span className="text-xs text-zinc-500 mt-0.5">
                        {t('summoner.noGamesRecorded')}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Tab Bar with Subpage Links */}
        <div className="mt-6 flex items-center gap-6 border-t border-white/[0.06] pt-3 text-xs font-bold">
          <Link
            href={basePath}
            onClick={() => onTabChange?.('matches')}
            className={`relative pb-2 transition-colors ${
              currentTab === 'matches'
                ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-amber-400'
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
                ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-amber-400'
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
                ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-amber-400'
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
                ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-amber-400'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            {t('summoner.tabChallenges')}
          </Link>

          {/* Live Game Tab: Only shown when in an active live game */}
          {(isLive || currentTab === 'live') && (
            <Link
              href={`${basePath}/live`}
              onClick={() => onTabChange?.('live')}
              className={`relative flex items-center gap-1.5 pb-2 transition-colors ${
                currentTab === 'live'
                  ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-amber-400'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <span className="relative flex h-2 w-2 mr-0.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
              </span>
              <span>{t('summoner.tabLive')}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
