'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Radio, RefreshCw, Shield, Swords, Ban } from 'lucide-react';
import { LiveGameResponse, LiveGameParticipant } from '@/types';
import {
  getChampionIconUrl,
  getChampionSplashUrl,
  getSpellIconUrl,
  getRuneIconUrl,
  getStyleIconUrl,
  getParticipantPosition,
  getParticipantPositionOrder,
  getPositionIconUrl,
} from '@/lib/ddragon';
import { getRankEmblemUrl } from './RankBadge';
import { getWinrateColor } from '@/lib/utils';
import { useTranslation } from '@/i18n/LanguageContext';

interface LiveGameViewProps {
  region: string;
  gameName: string;
  tagLine: string;
  liveData: LiveGameResponse | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function LiveGameView({
  region,
  gameName,
  tagLine,
  liveData,
  isLoading,
  onRefresh,
}: LiveGameViewProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 p-12 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-orange-500 mb-3" />
        <h3 className="text-sm font-bold text-slate-200">{t('live.analyzing')}</h3>
        <p className="text-xs text-slate-500 mt-1">{t('live.spectatorCheck')}</p>
      </div>
    );
  }

  if (!liveData || !liveData.inGame || !liveData.game) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] text-slate-500 mb-4">
          <Radio className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">
          {t('live.notInGame')}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mb-6">
          {t('live.notInGameDesc', { name: `${gameName}#${tagLine}` })}
        </p>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-5 py-2.5 text-xs font-bold text-orange-400 hover:bg-orange-500/20 transition-all shadow-md active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{t('live.checkAgain')}</span>
        </button>
      </div>
    );
  }

  const { game } = liveData;

  const renderRoster = (team: LiveGameParticipant[], isBlue: boolean) => {
    // Sort team by position: TOP (1) -> JUNGLE (2) -> MID (3) -> ADC (4) -> SUPPORT (5)
    const sortedTeam = [...team].sort((a, b) => {
      const orderA = getParticipantPositionOrder(a);
      const orderB = getParticipantPositionOrder(b);
      return orderA - orderB;
    });

    // Bans belonging to this team
    const teamBans = (game.bans || []).filter(
      (b) => b.teamId === (isBlue ? 100 : 200)
    );

    return (
      <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 overflow-hidden shadow-xl backdrop-blur-md">
        {/* Team Header with Integrated Champion Bans */}
        <div
          className={`flex items-center justify-between px-4 sm:px-5 py-3 border-b ${
            isBlue
              ? 'bg-gradient-to-r from-blue-950/80 via-blue-900/40 to-transparent border-blue-500/20 text-blue-300'
              : 'bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-transparent border-rose-500/20 text-rose-300'
          }`}
        >
          {/* Team Label & Icon */}
          <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs sm:text-sm">
            {isBlue ? (
              <Shield className="h-4 w-4 text-blue-400 shrink-0" />
            ) : (
              <Swords className="h-4 w-4 text-rose-400 shrink-0" />
            )}
            <span>{isBlue ? t('live.blueTeam') : t('live.redTeam')}</span>
          </div>

          {/* Integrated Champion Bans in Header */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Bans:
            </span>
            {teamBans.length > 0 ? (
              teamBans.map((b) => (
                <div
                  key={b.pickTurn}
                  className="group relative h-7 w-7 sm:h-8 sm:w-8 rounded-lg overflow-hidden border border-rose-500/40 bg-black/60 shadow-sm shrink-0"
                  title={`Ban: ${b.championName}`}
                >
                  <Image
                    src={getChampionIconUrl(b.championName)}
                    alt={b.championName}
                    width={32}
                    height={32}
                    className="h-full w-full object-cover grayscale brightness-75 contrast-125"
                    unoptimized
                  />
                  {/* Diagonal Red Ban Line */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[140%] h-[2px] bg-rose-500 rotate-45 shadow-[0_0_4px_rgba(244,63,94,0.9)]" />
                  </div>
                  {/* Ban Icon */}
                  <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-rose-950 border border-rose-500 flex items-center justify-center">
                    <Ban className="h-2 w-2 text-rose-400" />
                  </div>
                </div>
              ))
            ) : (
              <span className="text-[10px] font-semibold text-zinc-500">None</span>
            )}
          </div>
        </div>

        {/* Players List */}
        <div className="flex flex-col gap-2 p-3">
          {sortedTeam.map((p) => {
            const isTarget = p.riotId.toLowerCase().includes(gameName.toLowerCase());
            const targetTag = region.toUpperCase();
            const cleanName = p.riotId.includes('#') ? p.riotId.split('#')[0] : p.riotId;
            const cleanTag = p.riotId.includes('#') ? p.riotId.split('#')[1] : targetTag;
            const formattedTag = `${cleanName}-${cleanTag}`;
            const pos = getParticipantPosition(p);

            const runeKeystone = getRuneIconUrl(p.primaryRune);
            const runeStyle = getStyleIconUrl(p.secondaryStyle);

            return (
              <div
                key={p.puuid || `${p.championId}_${p.teamId}`}
                className={`relative overflow-hidden rounded-xl border transition-all ${
                  isTarget
                    ? 'border-amber-500/60 ring-1 ring-amber-500/30 bg-[#16120e]'
                    : isBlue
                    ? 'border-blue-500/15 bg-[#0a111e]/90 hover:border-blue-500/30'
                    : 'border-rose-500/15 bg-[#170a11]/90 hover:border-rose-500/30'
                }`}
              >
                {/* Champion Splash Art Backdrop */}
                <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
                  <Image
                    src={getChampionSplashUrl(p.championName)}
                    alt={p.championName}
                    fill
                    className="object-cover object-[right_center] opacity-30 saturate-[1.45] contrast-125 filter"
                    unoptimized
                  />
                  {/* Horizontal Gradient Overlay */}
                  <div
                    className={`absolute inset-0 ${
                      isBlue
                        ? 'bg-gradient-to-r from-[#0a111e] via-[#0a111e]/80 to-transparent'
                        : 'bg-gradient-to-r from-[#170a11] via-[#170a11]/80 to-transparent'
                    }`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/20" />
                </div>

                {/* Card Content */}
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between p-3 gap-3">
                  {/* Left Section: Champ Icon, Spells/Runes, Name + Tag, Champion + Position */}
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Champion Icon */}
                    <div
                      className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 shadow-md ${
                        isBlue ? 'border-blue-500/40' : 'border-rose-500/40'
                      }`}
                    >
                      <Image
                        src={getChampionIconUrl(p.championName)}
                        alt={p.championName}
                        width={48}
                        height={48}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    </div>

                    {/* Spells & Runes (2x2 Grid) */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <div className="flex gap-1">
                        <div className="h-5 w-5 rounded overflow-hidden border border-white/10 shadow-sm">
                          <Image
                            src={getSpellIconUrl(p.spell1Id)}
                            alt="Spell 1"
                            width={20}
                            height={20}
                            unoptimized
                          />
                        </div>
                        <div className="h-5 w-5 rounded overflow-hidden border border-white/10 shadow-sm">
                          <Image
                            src={getSpellIconUrl(p.spell2Id)}
                            alt="Spell 2"
                            width={20}
                            height={20}
                            unoptimized
                          />
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <div className="h-5 w-5 rounded overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center">
                          {runeKeystone ? (
                            <Image
                              src={runeKeystone}
                              alt="Keystone"
                              width={16}
                              height={16}
                              unoptimized
                            />
                          ) : (
                            <div className="h-2.5 w-2.5 bg-zinc-700 rounded-full" />
                          )}
                        </div>
                        <div className="h-5 w-5 rounded overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center">
                          {runeStyle ? (
                            <Image
                              src={runeStyle}
                              alt="SubStyle"
                              width={14}
                              height={14}
                              unoptimized
                            />
                          ) : (
                            <div className="h-2.5 w-2.5 bg-zinc-700 rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Player Name with Tag + Champion Name with Position */}
                    <div className="flex flex-col min-w-0">
                      {/* Line 1: Summoner Name + Tagline + DU badge */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Link
                          href={`/summoner/${region}/${encodeURIComponent(formattedTag)}`}
                          className={`truncate text-sm font-bold hover:text-orange-400 transition-colors ${
                            isTarget ? 'text-amber-400' : 'text-slate-100'
                          }`}
                        >
                          {cleanName}
                        </Link>
                        <span className="text-xs text-zinc-400 font-medium shrink-0">
                          #{cleanTag}
                        </span>
                        {isTarget && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-400 border border-amber-500/40 shrink-0">
                            {t('live.you')}
                          </span>
                        )}
                      </div>

                      {/* Line 2: Position Badge + Champion Name */}
                      <div className="flex items-center gap-1.5 text-xs text-zinc-300 mt-0.5">
                        {pos && (
                          <div className="flex items-center gap-1 rounded bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 text-[10px] font-black uppercase text-zinc-300 shrink-0">
                            <Image
                              src={getPositionIconUrl(pos)}
                              alt={pos}
                              width={12}
                              height={12}
                              className="h-3 w-3 object-contain opacity-75"
                              unoptimized
                            />
                            <span>{pos}</span>
                          </div>
                        )}
                        <span className="font-semibold text-zinc-200 truncate">
                          {p.championName}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Champion Winrate & Ranked Winrate */}
                  <div className="flex items-center justify-between sm:justify-end gap-5 sm:gap-6 shrink-0 border-t sm:border-t-0 border-white/[0.04] pt-2 sm:pt-0">
                    {/* Champion Winrate */}
                    <div className="flex flex-col items-start sm:items-end min-w-[75px]">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('live.championWinrate')}
                      </span>
                      {p.championStats && p.championStats.games > 0 ? (
                        <div className="flex flex-col items-start sm:items-end">
                          <span
                            className={`text-xs sm:text-sm font-black ${getWinrateColor(
                              p.championStats.winrate
                            )}`}
                          >
                            {p.championStats.winrate}%
                          </span>
                          <span className="text-[10px] text-zinc-400 font-medium">
                            {p.championStats.games}G ({p.championStats.wins}W {p.championStats.losses}L)
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-zinc-500 font-semibold mt-0.5">
                          {t('live.noData')}
                        </span>
                      )}
                    </div>

                    {/* Ranked Winrate & Rank */}
                    <div className="flex items-center gap-2.5 min-w-[130px] sm:min-w-[145px] justify-end">
                      {p.rank ? (
                        <>
                          <div className="relative h-8 w-8 shrink-0">
                            <Image
                              src={getRankEmblemUrl(p.rank.tier)}
                              alt={p.rank.tier}
                              width={32}
                              height={32}
                              className="object-contain"
                              unoptimized
                            />
                          </div>
                          <div className="flex flex-col text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="text-xs font-bold text-slate-100 uppercase">
                                {p.rank.tier} {p.rank.rank}
                              </span>
                              <span
                                className={`text-xs font-black ${getWinrateColor(p.rank.winrate)}`}
                              >
                                {p.rank.winrate}%
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-400">
                              {p.rank.leaguePoints} LP · {p.rank.wins + p.rank.losses}G ({p.rank.wins}W {p.rank.losses}L)
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                            {t('live.rankedWinrate')}
                          </span>
                          <span className="text-xs font-semibold text-zinc-500 mt-0.5">
                            {t('summoner.unranked')}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Team Rosters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRoster(game.blueTeam, true)}
        {renderRoster(game.redTeam, false)}
      </div>
    </div>
  );
}
