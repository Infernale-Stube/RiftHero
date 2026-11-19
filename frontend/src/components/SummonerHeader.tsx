'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Loader2, Swords, Radio, ChevronRight, Home } from 'lucide-react';
import { SummonerData, SummonerRank } from '@/types';
import { getProfileIconUrl } from '@/lib/ddragon';
import { formatTimeAgo } from '@/lib/utils';
import RankCard from './RankCard';

interface SummonerHeaderProps {
  summoner: SummonerData;
  ranks: SummonerRank[];
  isUpdating: boolean;
  activeTab: 'matches' | 'live';
  onTabChange: (tab: 'matches' | 'live') => void;
  isLive?: boolean;
}

export default function SummonerHeader({
  summoner,
  ranks,
  isUpdating,
  activeTab,
  onTabChange,
  isLive = false,
}: SummonerHeaderProps) {
  const soloRank = ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  const flexRank = ranks.find((r) => r.queueType === 'RANKED_FLEX_SR');

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb Navigation (inspired by loldb.info) */}
      <nav aria-label="breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-400">
        <Link href="/" className="flex items-center gap-1 hover:text-white transition-colors">
          <Home className="h-3.5 w-3.5" />
          <span>Startseite</span>
        </Link>
        <ChevronRight className="h-3 w-3 text-slate-600" />
        <span className="uppercase text-slate-400">{summoner.region}</span>
        <ChevronRight className="h-3 w-3 text-slate-600" />
        <span className="font-bold text-amber-400">
          {summoner.gameName}#{summoner.tagLine}
        </span>
      </nav>

      {/* Main Profile Header Card */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/60 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left: Avatar + Summoner Name */}
          <div className="flex items-center gap-5">
            {/* Avatar Container */}
            <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-white/10 shadow-xl">
              <Image
                src={getProfileIconUrl(summoner.profileIconId)}
                alt={summoner.gameName}
                width={96}
                height={96}
                className="h-full w-full object-cover"
                unoptimized
              />
              {/* Level Badge */}
              <div className="absolute bottom-0 inset-x-0 bg-black/90 py-0.5 text-center text-[10px] font-black tracking-wider text-amber-300 border-t border-white/10">
                {summoner.summonerLevel}
              </div>
            </div>

            {/* Summoner Name & Tag */}
            <div className="flex flex-col">
              <div className="flex items-baseline gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                  {summoner.gameName}
                  <span className="text-zinc-500 font-bold ml-1">#{summoner.tagLine}</span>
                </h1>
                <span className="rounded-md border border-white/10 bg-white/[0.05] px-2 py-0.5 text-xs font-bold uppercase text-zinc-300">
                  {summoner.region}
                </span>
              </div>

              {/* Status & Last Updated */}
              <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
                {summoner.lastFetchedAt && (
                  <span>Aktualisiert {formatTimeAgo(summoner.lastFetchedAt)}</span>
                )}

                {isUpdating && (
                  <div className="flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-sky-300 font-semibold animate-pulse">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Hintergrund-Aktualisierung läuft...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Rank Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[480px]">
            <RankCard title="Ranked Solo/Duo" rankData={soloRank} />
            <RankCard title="Ranked Flex" rankData={flexRank} />
          </div>
        </div>

        {/* Section Navigation Tabs (Match History & Live Game) */}
        <div className="mt-6 pt-4 border-t border-white/[0.08] flex items-center gap-2">
          <button
            onClick={() => onTabChange('matches')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'matches'
                ? 'bg-gradient-to-r from-blue-600 to-hextech-blue text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Swords className="h-4 w-4" />
            <span>Match-Historie</span>
          </button>

          <button
            onClick={() => onTabChange('live')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'live'
                ? 'bg-gradient-to-r from-rose-600 to-orange-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            <Radio className="h-4 w-4 text-rose-400" />
            <span>Live-Spiel</span>
            {isLive && (
              <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
