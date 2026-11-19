import Image from 'next/image';
import { Loader2, RefreshCw } from 'lucide-react';
import { SummonerData, SummonerRank } from '@/types';
import { getProfileIconUrl } from '@/lib/ddragon';
import { formatTimeAgo } from '@/lib/utils';
import RankCard from './RankCard';

interface SummonerHeaderProps {
  summoner: SummonerData;
  ranks: SummonerRank[];
  isUpdating: boolean;
}

export default function SummonerHeader({
  summoner,
  ranks,
  isUpdating,
}: SummonerHeaderProps) {
  const soloRank = ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5');
  const flexRank = ranks.find((r) => r.queueType === 'RANKED_FLEX_SR');

  return (
    <div className="rounded-2xl border border-rift-700/80 bg-gradient-to-b from-rift-900 to-rift-950 p-6 shadow-xl">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        {/* Left: Avatar + Summoner Name */}
        <div className="flex items-center gap-5">
          {/* Avatar Container */}
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 shrink-0 overflow-hidden rounded-2xl border-2 border-hextech-gold/70 shadow-lg shadow-hextech-gold/10">
            <Image
              src={getProfileIconUrl(summoner.profileIconId)}
              alt={summoner.gameName}
              width={96}
              height={96}
              className="h-full w-full object-cover"
              unoptimized
            />
            {/* Level Badge */}
            <div className="absolute bottom-0 inset-x-0 bg-rift-950/90 py-0.5 text-center text-[11px] font-black tracking-wider text-hextech-lightGold border-t border-hextech-gold/40">
              {summoner.summonerLevel}
            </div>
          </div>

          {/* Summoner Name & Tag */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                {summoner.gameName}
              </h1>
              <span className="text-lg font-bold text-slate-400">
                #{summoner.tagLine}
              </span>
              <span className="rounded-md border border-hextech-blue/40 bg-hextech-blue/10 px-2 py-0.5 text-xs font-bold uppercase text-hextech-blue">
                {summoner.region}
              </span>
            </div>

            {/* Last updated indicator & silent refresh status */}
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
              {summoner.lastFetchedAt && (
                <span>Aktualisiert {formatTimeAgo(summoner.lastFetchedAt)}</span>
              )}

              {isUpdating && (
                <div className="flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-0.5 text-sky-300 font-semibold animate-pulse">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Wird im Hintergrund aktualisiert...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Ranks (Solo/Duo & Flex) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full lg:w-auto lg:min-w-[480px]">
          <RankCard title="Ranked Solo/Duo" rankData={soloRank} />
          <RankCard title="Ranked Flex" rankData={flexRank} />
        </div>
      </div>
    </div>
  );
}
