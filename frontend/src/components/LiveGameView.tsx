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
  // Live Timer
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

  const renderRoster = (team: LiveGameParticipant[], isBlue: boolean) => (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-[#0c1017]/90 overflow-hidden shadow-xl backdrop-blur-md">
      {/* Team Header */}
      <div
        className={`flex items-center justify-between px-5 py-3.5 border-b ${
          isBlue
            ? 'bg-gradient-to-r from-blue-950/80 via-blue-900/40 to-transparent border-blue-500/20 text-blue-300'
            : 'bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-transparent border-rose-500/20 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs">
          {isBlue ? (
            <Shield className="h-4 w-4 text-blue-400" />
          ) : (
            <Swords className="h-4 w-4 text-rose-400" />
          )}
          <span>{isBlue ? t('live.blueTeam') : t('live.redTeam')}</span>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.07] border border-white/[0.08] text-zinc-400">
          {team.length} Players
        </span>
      </div>

      {/* Players List */}
      <div className="flex flex-col gap-2 p-3">
        {team.map((p) => {
          const isTarget = p.riotId.toLowerCase().includes(gameName.toLowerCase());
          const targetTag = region.toUpperCase();
          const cleanName = p.riotId.includes('#') ? p.riotId.split('#')[0] : p.riotId;
          const cleanTag = p.riotId.includes('#') ? p.riotId.split('#')[1] : targetTag;
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
                {/* Left Section: Champ Icon, Spells/Runes, Name */}
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

                  {/* Player Name & Champion Name */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Link
                        href={`/summoner/${region}/${encodeURIComponent(formattedTag)}`}
                        className={`truncate text-sm font-bold hover:text-orange-400 transition-colors ${
                          isTarget ? 'text-amber-400' : 'text-slate-100'
                        }`}
                      >
                        {cleanName}
                      </Link>
                      {isTarget && (
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-400 border border-amber-500/40">
                          {t('live.you')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <span className="font-semibold text-zinc-200">{p.championName}</span>
                      <span className="text-[10px] text-zinc-500">#{cleanTag}</span>
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

  return (
    <div className="flex flex-col gap-6">
      {/* Live Game Top Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-black/60 to-black/60 p-5 shadow-xl">
        <div className="flex items-center gap-3.5 mb-3 sm:mb-0">
          <div className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                {t('live.gameActive')}
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-white">{game.queueName}</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              {t('live.gameMode', { mode: game.gameMode })}
            </div>
          </div>
        </div>

        {/* Live Timer Counter & Refresh */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-base font-black text-amber-300">
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            title={t('live.refreshTitle')}
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tournament-Grade Champion Bans Draft Showcase */}
      {game.bans && game.bans.length > 0 && (
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c1017]/80 p-4 sm:p-5 shadow-xl backdrop-blur-md">
          {/* Header */}
          <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Ban className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-white">
                  {t('live.draftBans')}
                </h4>
                <p className="text-[10px] text-zinc-400">
                  {game.bans.length} Champions banned in draft phase
                </p>
              </div>
            </div>
          </div>

          {/* Bans Grid: Blue Bans vs Red Bans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Blue Team Bans */}
            <div className="flex flex-col gap-2 rounded-xl border border-blue-500/20 bg-blue-950/20 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-blue-400 uppercase">
                <div className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-blue-400" />
                  <span>{t('live.blueBans')}</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-semibold">
                  {game.bans.filter((b) => b.teamId === 100).length}/5 BANS
                </span>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                {game.bans
                  .filter((b) => b.teamId === 100)
                  .map((b) => (
                    <div
                      key={b.pickTurn}
                      className="group relative flex flex-col items-center gap-1"
                    >
                      {/* Banned Champion Avatar with Red Slash */}
                      <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-xl overflow-hidden border border-rose-500/40 bg-black/60 shadow-md">
                        <Image
                          src={getChampionIconUrl(b.championName)}
                          alt={b.championName}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover grayscale brightness-75 contrast-125"
                          unoptimized
                        />
                        {/* Red Ban Slash Line */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-[140%] h-[2px] bg-rose-500 rotate-45 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                        </div>
                        {/* Red Ban Icon in corner */}
                        <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-rose-950 border border-rose-500 flex items-center justify-center">
                          <Ban className="h-2.5 w-2.5 text-rose-400" />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-300 truncate max-w-[50px] text-center">
                        {b.championName}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Red Team Bans */}
            <div className="flex flex-col gap-2 rounded-xl border border-rose-500/20 bg-rose-950/20 p-3">
              <div className="flex items-center justify-between text-xs font-bold text-rose-400 uppercase">
                <div className="flex items-center gap-1.5">
                  <Swords className="h-3.5 w-3.5 text-rose-400" />
                  <span>{t('live.redBans')}</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-semibold">
                  {game.bans.filter((b) => b.teamId === 200).length}/5 BANS
                </span>
              </div>

              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                {game.bans
                  .filter((b) => b.teamId === 200)
                  .map((b) => (
                    <div
                      key={b.pickTurn}
                      className="group relative flex flex-col items-center gap-1"
                    >
                      {/* Banned Champion Avatar with Red Slash */}
                      <div className="relative h-11 w-11 sm:h-12 sm:w-12 rounded-xl overflow-hidden border border-rose-500/40 bg-black/60 shadow-md">
                        <Image
                          src={getChampionIconUrl(b.championName)}
                          alt={b.championName}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover grayscale brightness-75 contrast-125"
                          unoptimized
                        />
                        {/* Red Ban Slash Line */}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-[140%] h-[2px] bg-rose-500 rotate-45 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
                        </div>
                        {/* Red Ban Icon in corner */}
                        <div className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full bg-rose-950 border border-rose-500 flex items-center justify-center">
                          <Ban className="h-2.5 w-2.5 text-rose-400" />
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-300 truncate max-w-[50px] text-center">
                        {b.championName}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Rosters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRoster(game.blueTeam, true)}
        {renderRoster(game.redTeam, false)}
      </div>
    </div>
  );
}
