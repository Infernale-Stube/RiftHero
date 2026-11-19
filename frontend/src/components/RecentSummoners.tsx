'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Sparkles, Clock } from 'lucide-react';
import { RecentSummoner } from '@/types';
import { getProfileIconUrl } from '@/lib/ddragon';
import { formatTimeAgo } from '@/lib/utils';
import RankBadge from './RankBadge';
import { useTranslation } from '@/i18n/LanguageContext';

interface RecentSummonersProps {
  summoners: RecentSummoner[];
}

export default function RecentSummoners({ summoners }: RecentSummonersProps) {
  const { locale } = useTranslation();

  if (!summoners || summoners.length === 0) {
    return (
      <div className="rounded-xl border border-rift-700/60 bg-rift-900/40 p-8 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-slate-600 mb-2" />
        <p className="text-sm text-slate-400">
          {locale === 'de'
            ? 'Noch keine Profile in der Datenbank. Suche oben nach einem Spieler, um den ersten Crawl zu starten!'
            : 'No profiles in database yet. Search for a player above to start indexing!'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="h-4 w-4 text-orange-400" />
        <h2 className="text-base font-bold text-white uppercase tracking-wider">
          {locale === 'de' ? 'Zuletzt aktualisierte Profile' : 'Recently Updated Profiles'}
        </h2>
        <span className="ml-auto text-xs text-zinc-500 font-medium">
          {locale === 'de' ? 'Live aus PostgreSQL' : 'Live from PostgreSQL'}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {summoners.map((s) => {
          const formattedTag = `${s.gameName}-${s.tagLine}`;
          return (
            <Link
              key={s.id}
              href={`/summoner/${s.region}/${encodeURIComponent(formattedTag)}`}
              className="group flex items-center justify-between rounded-2xl border border-white/[0.08] bg-[#0c1017]/80 p-3.5 transition-all hover:border-orange-500/40 hover:bg-[#121722] hover:shadow-xl hover:shadow-orange-500/5 shadow-md"
            >
              <div className="flex items-center gap-3">
                {/* Profile Icon */}
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/10 group-hover:border-orange-500/60 transition-colors">
                  <Image
                    src={getProfileIconUrl(s.profileIconId)}
                    alt={s.gameName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                  <div className="absolute bottom-0 right-0 rounded-tl bg-black/80 px-1 text-[9px] font-black text-orange-400">
                    {s.summonerLevel}
                  </div>
                </div>

                {/* Summoner Name & Region */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate font-bold text-slate-100 group-hover:text-white transition-colors">
                      {s.gameName}
                    </span>
                    <span className="text-xs text-zinc-500 shrink-0">#{s.tagLine}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="rounded bg-orange-500/15 border border-orange-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase text-orange-400">
                      {s.region}
                    </span>
                    {s.lastFetchedAt && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400">
                        <Clock className="h-3 w-3 text-zinc-500" />
                        {formatTimeAgo(s.lastFetchedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Rank Info */}
              <div className="shrink-0 text-right pl-2">
                {s.soloRank ? (
                  <div className="flex flex-col items-end">
                    <div className="flex items-center gap-1">
                      <RankBadge tier={s.soloRank.tier} size="sm" />
                      <span className="text-xs font-bold text-sky-400 uppercase">
                        {s.soloRank.tier} {s.soloRank.rank}
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-400">{s.soloRank.leaguePoints} LP</span>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-500 font-medium">Unranked</span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
