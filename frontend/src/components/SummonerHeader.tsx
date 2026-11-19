'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Loader2, RefreshCw, Radio, ChevronRight, Globe, ChevronLeft } from 'lucide-react';
import { SummonerData, SummonerRank } from '@/types';
import { getProfileIconUrl } from '@/lib/ddragon';
import { getRankEmblemUrl } from './RankBadge';
import { formatTimeAgo } from '@/lib/utils';

interface SummonerHeaderProps {
  summoner: SummonerData;
  ranks: SummonerRank[];
  isUpdating: boolean;
  activeTab: 'matches' | 'live';
  onTabChange: (tab: 'matches' | 'live') => void;
  isLive?: boolean;
  onRefresh?: () => void;
}

export default function SummonerHeader({
  summoner,
  ranks,
  isUpdating,
  activeTab,
  onTabChange,
  isLive = false,
  onRefresh,
}: SummonerHeaderProps) {
  const soloRank = ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  const flexRank = ranks.find((r) => r.queueType === 'RANKED_FLEX_SR');

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
          href="/"
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Homepage</span>
        </Link>
        <span className="text-zinc-600">/</span>
        <span className="text-zinc-400">Rank Tracker</span>
        <span className="text-zinc-600">/</span>
        <span className="font-bold text-orange-400">
          {summoner.gameName}#{summoner.tagLine}
        </span>
      </nav>

      {/* Main Profile Header Card with Watermark */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0d1116] p-6 shadow-2xl backdrop-blur-md">
        {/* Large Faint Watermark Text */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none select-none text-7xl sm:text-8xl lg:text-9xl font-black uppercase tracking-wider text-white/[0.02] whitespace-nowrap overflow-hidden">
          {summoner.gameName}
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left Block: Avatar + Name + Pills + Ranks */}
          <div className="flex items-start gap-5">
            {/* Circular Avatar */}
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-full border-2 border-white/10 shadow-xl">
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
                    <span className="font-semibold">Unranked</span>
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

          {/* Right Block: Update Button & Status */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isUpdating}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.07] px-4 py-2 text-xs font-bold text-zinc-200 hover:bg-white/[0.12] hover:text-white transition-all disabled:opacity-50 shadow-md active:scale-98"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isUpdating ? 'animate-spin text-orange-400' : 'text-zinc-400'}`} />
              <span>{isUpdating ? 'Aktualisiere...' : 'Update'}</span>
            </button>

            {summoner.lastFetchedAt && (
              <span className="text-[11px] text-zinc-500">
                Gecached · {formatTimeAgo(summoner.lastFetchedAt)}
              </span>
            )}
          </div>
        </div>

        {/* Bottom Tab Bar with LoLDB Orange Underline */}
        <div className="mt-6 flex items-center gap-6 border-t border-white/[0.06] pt-3 text-xs font-bold">
          <button
            type="button"
            onClick={() => onTabChange('matches')}
            className={`relative pb-2 transition-colors ${
              activeTab === 'matches'
                ? 'text-white after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-orange-500'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Match History
          </button>

          {isLive && (
            <button
              type="button"
              onClick={() => onTabChange('live')}
              className={`relative flex items-center gap-1.5 pb-2 transition-colors ${
                activeTab === 'live'
                  ? 'text-emerald-400 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:rounded-full after:bg-emerald-500'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Radio className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
              <span>Live Game</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
