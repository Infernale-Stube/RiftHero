'use client';

import { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Radio, RefreshCw, Ban, Copy, Check } from 'lucide-react';
import { LiveGameResponse, LiveGameParticipant } from '@/types';
import {
  getChampionIconUrl,
  getChampionSplashUrl,
  getSpellIconUrl,
  getRuneIconUrl,
  getStyleIconUrl,
  getPositionIconUrl,
  assignLiveGameTeamPositions,
  POSITION_KEYS_ORDER,
} from '@/lib/ddragon';
import { getRankEmblemUrl, TIER_COLORS } from './RankBadge';
import { getWinrateColor, calculateTeamAverageRank } from '@/lib/utils';
import { useTranslation } from '@/i18n/LanguageContext';
import LiveGameWinProbability from './LiveGameWinProbability';
import { calculateLiveGameWinProbability } from '@/lib/winProbability';

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
  const [copiedId, setCopiedId] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const game = liveData?.inGame ? liveData.game : undefined;
  const gameStartTime = game?.gameStartTime;

  useEffect(() => {
    if (!gameStartTime || gameStartTime <= 0) {
      setElapsedSeconds(0);
      return;
    }

    const initial = Math.max(0, Math.floor((Date.now() - gameStartTime) / 1000));
    setElapsedSeconds(initial);

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [gameStartTime]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const startTimeFormatted = useMemo(() => {
    if (!gameStartTime || gameStartTime <= 0) return null;
    try {
      const date = new Date(gameStartTime);
      return date.toLocaleTimeString(locale === 'de' ? 'de-DE' : 'en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return null;
    }
  }, [gameStartTime, locale]);

  const getPlatformPrefix = (reg: string) => {
    const r = (reg || '').toLowerCase();
    const platMap: Record<string, string> = {
      euw: 'EUW1',
      eune: 'EUN1',
      na: 'NA1',
      kr: 'KR',
      br: 'BR1',
      lan: 'LA1',
      las: 'LA2',
      oce: 'OC1',
      tr: 'TR1',
      ru: 'RU',
      jp: 'JP1',
      sg: 'SG2',
      ph: 'PH2',
      tw: 'TW2',
      vn: 'VN2',
      th: 'TH2',
      me: 'ME1',
    };
    return platMap[r] || `${r.toUpperCase()}1`;
  };

  const fullMatchId = game?.gameId ? `${getPlatformPrefix(region)}_${game.gameId}` : '';

  const winProbability = useMemo(() => {
    if (!game || !Array.isArray(game.blueTeam) || !Array.isArray(game.redTeam)) return null;
    if (game.winProbability && typeof game.winProbability.blueWinrate === 'number') {
      return game.winProbability;
    }
    try {
      return calculateLiveGameWinProbability(game.blueTeam, game.redTeam, game.mapId, game.queueId);
    } catch (err) {
      console.error('Failed to calculate win probability:', err);
      return null;
    }
  }, [game]);

  if (isLoading) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl bg-black/40 p-12 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-amber-500 mb-3" />
        <h3 className="text-sm font-bold text-slate-200">{t('live.analyzing')}</h3>
        <p className="text-xs text-slate-500 mt-1">{t('live.spectatorCheck')}</p>
      </div>
    );
  }

  if (!liveData || !liveData.inGame || !liveData.game || !game) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl bg-black/40 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] text-slate-500 mb-4">
          <Radio className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">
          {t('live.notInGame')}
        </h3>
        <p className="text-xs text-slate-400 max-w-md mb-6">
          {locale === 'de' && liveData?.message
            ? liveData.message
            : t('live.notInGameDesc', { name: `${gameName}#${tagLine}` })}
        </p>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-5 py-2.5 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all shadow-md active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>{t('live.checkAgain')}</span>
        </button>
      </div>
    );
  }

  const blueAvg = calculateTeamAverageRank(game.blueTeam);
  const redAvg = calculateTeamAverageRank(game.redTeam);

  const renderTeamHeader = (isBlue: boolean) => {
    const teamAvg = isBlue ? blueAvg : redAvg;

    // Bans belonging to this team
    const teamBans = (game.bans || []).filter(
      (b) => b.teamId === (isBlue ? 100 : 200)
    );

    return (
      <div className="rounded-2xl bg-[#0c1017]/90 overflow-hidden shadow-xl backdrop-blur-md">
        {/* Team Header with Integrated Champion Bans & Average Rank */}
        <div
          className={`flex items-center justify-between px-4 sm:px-5 py-3 flex-wrap gap-2 ${
            isBlue
              ? 'bg-gradient-to-r from-blue-950/80 via-blue-900/40 to-transparent text-blue-300'
              : 'bg-gradient-to-r from-rose-950/80 via-rose-900/40 to-transparent text-rose-300'
          }`}
        >
          {/* Team Label & Average Rank Badge */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
            <span className="font-black uppercase tracking-wider text-xs sm:text-sm">
              {isBlue ? t('live.blueTeam') : t('live.redTeam')}
            </span>

            {/* Average Rank */}
            {teamAvg ? (
              <div
                className="flex items-center gap-2 text-zinc-300"
                title={`${t('live.avgRank')}: ${teamAvg.formatted}`}
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
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] font-medium text-zinc-500">
                <span>{t('live.avgRank')}: {t('summoner.unranked')}</span>
              </div>
            )}
          </div>

          {/* Integrated Champion Bans in Header (Always 5 Slots) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mr-1 hidden sm:inline">
              {t('live.bans')}
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
                  className="group relative h-7 w-7 sm:h-8 sm:w-8 rounded-lg overflow-hidden bg-black/60 shadow-sm shrink-0 flex items-center justify-center"
                  title={isValid ? `${t('live.ban')}: ${b.championName}` : t('live.noBan')}
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
                      <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-rose-950 flex items-center justify-center">
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
      </div>
    );
  };

  const renderPlayerCard = (p: LiveGameParticipant | null, isBlue: boolean) => {
    if (!p) {
      return (
        <div className="flex items-center justify-center rounded-xl bg-black/20 p-6 text-xs text-zinc-500">
          {t('live.noPlayer')}
        </div>
      );
    }

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
        className={`relative overflow-hidden rounded-xl transition-all ${
          isTarget
            ? 'bg-[#16120e] shadow-[0_0_20px_rgba(245,158,11,0.2)]'
            : isBlue
            ? 'bg-[#0a111e]/90'
            : 'bg-[#170a11]/90'
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
          {/* Left Section: Champ Icon, Spells/Runes, Name + Tag, Champion Name */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Champion Icon with Account Level Badge */}
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl shadow-md">
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
                  className="absolute bottom-0 right-0 rounded-tl-md bg-black/90 px-1 py-0.2 text-[8px] font-black text-amber-300 shadow-sm"
                  title={`${t('live.accountLevel')}: ${p.summonerLevel}`}
                >
                  {p.summonerLevel}
                </div>
              )}
            </div>

            {/* Spells & Runes (2x2 Grid) */}
            <div className="flex flex-col gap-1 shrink-0">
              <div className="flex gap-1">
                <div className="h-5 w-5 rounded overflow-hidden shadow-sm">
                  <Image
                    src={getSpellIconUrl(p.spell1Id)}
                    alt="Spell 1"
                    width={20}
                    height={20}
                    unoptimized
                  />
                </div>
                <div className="h-5 w-5 rounded overflow-hidden shadow-sm">
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
                <div className="h-5 w-5 rounded overflow-hidden bg-black/60 flex items-center justify-center">
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
                <div className="h-5 w-5 rounded overflow-hidden bg-black/60 flex items-center justify-center">
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

            {/* Player Name with Tag + Champion Name */}
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
                  <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase text-amber-400 shrink-0">
                    {t('live.you')}
                  </span>
                )}
              </div>

              {/* Line 2: Champion Name & Plain Text Mastery Values */}
              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-xs">
                <span className="text-xs text-zinc-300 font-semibold truncate">
                  {p.championName}
                </span>

                {p.mastery && (
                  p.mastery.championPoints > 0 ? (
                    <span
                      className="text-[11px] font-medium text-zinc-400"
                      title={`${t('live.masteryLevel', { level: p.mastery.championLevel })} · ${p.mastery.championPoints.toLocaleString()} ${t('masteries.totalPoints')}`}
                    >
                      <span className="text-zinc-600 font-normal">·</span>{' '}
                      <span className="font-bold text-amber-400/90">M{p.mastery.championLevel}</span>{' '}
                      <span className="font-mono text-zinc-400">
                        ({p.mastery.championPoints >= 1000000
                          ? `${(p.mastery.championPoints / 1000000).toFixed(1)}M`
                          : p.mastery.championPoints >= 1000
                          ? `${Math.round(p.mastery.championPoints / 1000)}k`
                          : p.mastery.championPoints})
                      </span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-zinc-500 font-medium">
                      <span className="text-zinc-600 font-normal">·</span> {t('live.firstTime')}
                    </span>
                  )
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
  };

  const sortedBlueSlots = assignLiveGameTeamPositions(game.blueTeam);
  const sortedRedSlots = assignLiveGameTeamPositions(game.redTeam);

  return (
    <div className="flex flex-col gap-3">
      {/* Live Game Status & Match ID Bar */}
      <div className="flex items-center justify-between px-1 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
          </span>
          <span className="font-bold text-slate-200">{game.queueName || t('live.liveGame')}</span>
          {startTimeFormatted && (
            <span className="text-zinc-400 font-medium">
              • {t('live.started')} {startTimeFormatted}
              {elapsedSeconds > 0 && (
                <span className="text-amber-400 font-mono ml-1.5 font-bold">
                  ({formatTimer(elapsedSeconds)})
                </span>
              )}
            </span>
          )}
          <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-semibold text-zinc-400 bg-white/[0.04] px-2 py-0.5 rounded-full border border-white/[0.06]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{t('live.autoCheckInterval')}</span>
          </span>
        </div>

        {fullMatchId ? (
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-zinc-400">
            <span className="text-zinc-500 font-sans">{t('live.matchId')}</span>
            <span className="text-zinc-300 font-semibold select-all">
              {fullMatchId}
            </span>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(fullMatchId);
                  setCopiedId(true);
                  setTimeout(() => setCopiedId(false), 2000);
                }
              }}
              className="p-1 hover:text-amber-400 text-zinc-400 transition-colors"
              title={t('live.copyMatchId')}
              aria-label={t('live.copyMatchId')}
            >
              {copiedId ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        ) : null}
      </div>

      {/* Team Win Probability Prediction */}
      {winProbability && (
        <LiveGameWinProbability
          winProbability={winProbability}
          blueTeam={game.blueTeam}
          redTeam={game.redTeam}
        />
      )}

      {/* Team Headers */}
      <div className="flex flex-col lg:flex-row gap-3 w-full">
        <div className="flex-1 min-w-0">
          {renderTeamHeader(true)}
        </div>
        <div className="hidden lg:block w-10 shrink-0" />
        <div className="flex-1 min-w-0">
          {renderTeamHeader(false)}
        </div>
      </div>

      {/* 5 Lane Matchups with Role Icon in the Center */}
      <div className="flex flex-col gap-3 w-full">
        {POSITION_KEYS_ORDER.map((posKey, i) => {
          const blueSlot = sortedBlueSlots[i];
          const redSlot = sortedRedSlots[i];
          const role = blueSlot?.role || redSlot?.role || posKey;

          return (
            <div key={posKey} className="flex flex-col lg:flex-row lg:items-center gap-3 w-full">
              {/* Blue Player */}
              <div className="flex-1 min-w-0">
                {renderPlayerCard(blueSlot?.participant || null, true)}
              </div>

              {/* Center Role Icon Divider (Desktop) */}
              <div className="hidden lg:flex flex-col items-center justify-center shrink-0 w-10 my-auto">
                <div
                  className="flex h-10 w-10 items-center justify-center"
                  title={role}
                >
                  <Image
                    src={getPositionIconUrl(role)}
                    alt={role}
                    width={24}
                    height={24}
                    className="h-6 w-6 object-contain filter brightness-110 drop-shadow"
                    unoptimized
                  />
                </div>
              </div>

              {/* Mobile Role Divider */}
              <div className="flex lg:hidden items-center justify-center gap-2 py-1">
                <div className="h-[1px] flex-1 bg-white/10" />
                <div className="flex items-center gap-1.5 px-2 py-0.5 text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  <Image
                    src={getPositionIconUrl(role)}
                    alt={role}
                    width={14}
                    height={14}
                    className="h-3.5 w-3.5 object-contain"
                    unoptimized
                  />
                  <span>{role}</span>
                </div>
                <div className="h-[1px] flex-1 bg-white/10" />
              </div>

              {/* Red Player */}
              <div className="flex-1 min-w-0">
                {renderPlayerCard(redSlot?.participant || null, false)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
