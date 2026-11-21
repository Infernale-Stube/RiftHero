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
  getPositionIconUrl,
  assignTeamPositions,
} from '@/lib/ddragon';
import { getRankEmblemUrl, TIER_COLORS } from './RankBadge';
import { getWinrateColor, calculateTeamAverageRank } from '@/lib/utils';
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
  const { t, locale } = useTranslation();

  if (isLoading) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 p-12 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500 mb-3" />
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
          {liveData?.message || t('live.notInGameDesc', { name: `${gameName}#${tagLine}` })}
        </p>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-5 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all shadow-md active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{t('live.checkAgain')}</span>
        </button>
      </div>
    );
  }

  const { game } = liveData;

  const blueAvg = calculateTeamAverageRank(game.blueTeam);
  const redAvg = calculateTeamAverageRank(game.redTeam);

  const renderRoster = (team: LiveGameParticipant[], isBlue: boolean) => {
    const sortedSlots = assignTeamPositions(team);
    const teamAvg = isBlue ? blueAvg : redAvg;

    // Bans belonging to this team
    const teamBans = (game.bans || []).filter(
      (b) => b.teamId === (isBlue ? 100 : 200)
    );

    return (
      <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 overflow-hidden shadow-xl backdrop-blur-md">
        {/* Team Header with Integrated Champion Bans & Average Rank */}
        <div
          className={`flex items-center justify-between px-4 sm:px-5 py-3 border-b flex-wrap gap-2 ${
            isBlue
              ? 'bg-gradient-to-r from-blue-950/80 via-blue-900/40 to-transparent border-blue-500/20 text-blue-300'
              : 'bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-transparent border-rose-500/20 text-rose-300'
          }`}
        >
          {/* Team Label & Icon & Average Rank Badge */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs sm:text-sm">
              {isBlue ? (
                <Shield className="h-4 w-4 text-blue-400 shrink-0" />
              ) : (
                <Swords className="h-4 w-4 text-rose-400 shrink-0" />
              )}
              <span>{isBlue ? t('live.blueTeam') : t('live.redTeam')}</span>
            </div>

            {/* Average Rank & Winrate Badge */}
            {teamAvg ? (
              <div
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1 border shadow-sm backdrop-blur-sm ${
                  isBlue
                    ? 'bg-blue-950/80 border-blue-500/40 text-blue-200'
                    : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
                }`}
                title={`Team Average: ${teamAvg.formatted} · Winrate: ${teamAvg.avgWinrate ?? '—'}% (${teamAvg.count}/${teamAvg.totalPlayers} ${t('live.rankedWinrate')})`}
              >
                {/* Rank Section */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    {t('live.avgRank')}:
                  </span>
                  <div className="relative h-4 w-4 shrink-0">
                    <Image
                      src={getRankEmblemUrl(teamAvg.tier)}
                      alt={teamAvg.tier}
                      width={18}
                      height={18}
                      className="h-full w-full object-contain filter drop-shadow"
                      unoptimized
                    />
                  </div>
                  <span className={`text-xs font-black uppercase tracking-wide ${TIER_COLORS[teamAvg.tier]?.text || 'text-white'}`}>
                    {teamAvg.tier} {teamAvg.division || ''}
                  </span>
                  {teamAvg.lp !== undefined && (
                    <span className="text-[10px] font-semibold text-zinc-400">
                      {teamAvg.lp} LP
                    </span>
                  )}
                </div>

                {/* Average Win Rate Section */}
                {teamAvg.avgWinrate !== null && teamAvg.avgWinrate !== undefined && (
                  <>
                    <span className="text-white/20 font-bold">•</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                        {t('live.avgWinrate')}:
                      </span>
                      <span className={`text-xs font-black ${getWinrateColor(teamAvg.avgWinrate)}`}>
                        {teamAvg.avgWinrate}%
                      </span>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-1.5 rounded-lg px-2 py-0.5 bg-zinc-900/60 border border-zinc-800 text-[10px] font-medium text-zinc-500">
                <span>{t('live.avgRank')}: {t('summoner.unranked')}</span>
              </div>
            )}
          </div>

          {/* Integrated Champion Bans in Header (Always 5 Slots) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Bans:
            </span>
            {[0, 1, 2, 3, 4].map((slotIdx) => {
              const b = teamBans[slotIdx];
              const isValid = Boolean(
                b &&
                b.championId > 0 &&
                b.championName &&
                b.championName.toLowerCase() !== 'none'
              );

              return (
                <div
                  key={b?.pickTurn ?? slotIdx}
                  className="group relative h-7 w-7 sm:h-8 sm:w-8 rounded-lg overflow-hidden border border-white/10 bg-black/60 shadow-sm shrink-0 flex items-center justify-center"
                  title={isValid ? `Ban: ${b.championName}` : 'Kein Ban'}
                >
                  {isValid ? (
                    <>
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
                    </>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full bg-white/[0.02]">
                      <Ban className="h-3 w-3 text-zinc-600/60" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Players List */}
        <div className="flex flex-col gap-2 p-3">
          {sortedSlots.map(({ role: pRole, participant: p }) => {
            if (!p) return null;
            const pRiotId = p.riotId || p.summonerName || 'Player';
            const isTarget = pRiotId.toLowerCase().includes(gameName.toLowerCase());
            const targetTag = region.toUpperCase();
            const cleanName = pRiotId.includes('#') ? pRiotId.split('#')[0] : pRiotId;
            const cleanTag = pRiotId.includes('#') ? pRiotId.split('#')[1] : targetTag;
            const formattedTag = `${cleanName}-${cleanTag}`;

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
                    {/* Champion Icon with Account Level Badge */}
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
                      {p.summonerLevel != null && p.summonerLevel > 0 && (
                        <div
                          className="absolute bottom-0 right-0 rounded-tl-md bg-black/90 px-1 py-0.2 text-[8px] font-black text-amber-300 border-t border-l border-white/20 shadow-sm"
                          title={`Account Level: ${p.summonerLevel}`}
                        >
                          {p.summonerLevel}
                        </div>
                      )}
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
                          href={`/${locale}/summoner/${region}/${encodeURIComponent(formattedTag)}`}
                          className={`truncate text-sm font-bold hover:text-amber-400 transition-colors ${
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

                      {/* Line 2: Champion Name & Role */}
                      <div className="flex items-center gap-1.5 text-xs text-zinc-300 mt-0.5">
                        <span className="font-semibold text-zinc-200 truncate">
                          {p.championName}
                        </span>
                        {pRole && (
                          <div
                            className="flex items-center gap-1 rounded bg-white/[0.06] border border-white/10 px-1.5 py-0.5 text-[10px] text-zinc-300 shrink-0"
                            title={pRole}
                          >
                            <Image
                              src={getPositionIconUrl(pRole)}
                              alt={pRole}
                              width={11}
                              height={11}
                              className="object-contain"
                              unoptimized
                            />
                            <span className="font-bold text-[9px] text-zinc-400 uppercase tracking-tight">
                              {pRole}
                            </span>
                          </div>
                        )}
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
      {/* Live Game Match Header Banner (Yellow Layout) */}
      <div className="flex items-center justify-between rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-[#0c1017]/90 to-[#0c1017]/90 px-5 py-3.5 shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
          </span>
          <div className="flex items-center gap-2">
            <span className="font-black text-amber-400 uppercase tracking-wider text-sm">
              Live Game
            </span>
            <span className="text-zinc-600">•</span>
            <span className="text-xs font-bold text-zinc-200">
              {game.queueName || 'League of Legends'}
            </span>
            {game.gameMode && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="text-xs text-zinc-400 font-medium">
                  {game.gameMode}
                </span>
              </>
            )}
          </div>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{t('live.checkAgain')}</span>
        </button>
      </div>

      {/* Team Rosters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRoster(game.blueTeam, true)}
        {renderRoster(game.redTeam, false)}
      </div>
    </div>
  );
}
