'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronLeft,
  Swords,
  Coins,
  Shield,
  Eye,
  Award,
  Trophy,
  Zap,
  Target,
  Flame,
  Loader2,
  AlertCircle,
  ExternalLink,
  Ban,
  Activity,
  Crosshair,
} from 'lucide-react';
import { fetchMatchDetails } from '@/lib/api';
import { MatchDetailResponse, MatchParticipant, TeamMatchDetail } from '@/types';
import {
  getChampionIconUrl,
  getItemIconUrl,
  getSpellIconUrl,
  getRuneIconUrl,
  getStyleIconUrl,
  getObjectiveIconUrl,
  getDragonSubtypeIconUrl,
  getDragonSubtypeName,
  getPositionIconUrl,
  getParticipantPosition,
  getParticipantPositionOrder,
  assignTeamPositions,
  calculateKda,
} from '@/lib/ddragon';
import { formatDuration, formatTimeAgo, getKdaColor } from '@/lib/utils';
import GoldAdvantageChart from '@/components/GoldAdvantageChart';
import ScoreTimelineChart from '@/components/ScoreTimelineChart';
import Breadcrumbs from '@/components/Breadcrumbs';
import { useTranslation } from '@/i18n/LanguageContext';

export default function MatchDetailPage() {
  const { t, locale } = useTranslation();
  const params = useParams();
  const router = useRouter();
  const region = (params?.region as string) || 'euw';
  const matchId = (params?.matchId as string) || '';

  const [matchData, setMatchData] = useState<MatchDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeHighlightPuuid, setActiveHighlightPuuid] = useState<string | null>(null);

  useEffect(() => {
    // Read URL hash e.g. #participant7 or #participant{puuid}
    if (typeof window !== 'undefined' && window.location.hash) {
      const hash = window.location.hash.replace('#', '');
      setActiveHighlightPuuid(hash);
    }
  }, []);

  useEffect(() => {
    async function loadData() {
      if (!matchId) return;
      setIsLoading(true);
      try {
        const data = await fetchMatchDetails(region, matchId);
        setMatchData(data);
      } catch (err) {
        console.error('Error loading match details:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [region, matchId]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-hextech-blue mb-4" />
        <h2 className="text-lg font-bold text-slate-200">{t('matchDetail.analyzing')}</h2>
        <p className="text-xs text-slate-500 mt-1">{t('matchDetail.timelineLoading')}</p>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-8 shadow-xl">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-400 mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">{t('matchDetail.notFoundTitle')}</h2>
          <p className="text-sm text-slate-300 mb-6">
            {t('matchDetail.notFoundDesc', { id: matchId })}
          </p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg bg-white/[0.08] px-4 py-2 text-xs font-bold text-white hover:bg-white/[0.12] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t('matchDetail.back')}</span>
          </button>
        </div>
      </div>
    );
  }

  const {
    cluster,
    gameDuration,
    gameCreation,
    queueName,
    gameVersion,
    blueTeam,
    redTeam,
    participants,
    maxDamage,
    goldAdvantageTimeline,
    scoreTimeline,
  } = matchData;

  const durationMinutes = gameDuration / 60;
  const blueParticipants = participants.filter((p) => p.teamId === 100);
  const redParticipants = participants.filter((p) => p.teamId === 200);

  const totalKills = blueTeam.totalKills + redTeam.totalKills;
  const blueKillPct = totalKills > 0 ? Math.round((blueTeam.totalKills / totalKills) * 100) : 50;

  // Render Official Ingame Objective Card
  const renderObjectiveCard = (
    title: string,
    objectiveKey: 'dragon' | 'baron' | 'voidgrub' | 'tower' | 'inhibitor' | 'herald',
    blueKills: number,
    redKills: number,
    blueFirst = false,
    redFirst = false
  ) => {
    const blueIcon = getObjectiveIconUrl(objectiveKey, 'blue');
    const redIcon = getObjectiveIconUrl(objectiveKey, 'red');

    return (
      <div className="flex flex-col rounded-xl border border-white/[0.06] bg-black/40 p-3.5 shadow-md">
        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/[0.04]">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
            {title}
          </span>
          <div className="flex items-center gap-1.5">
            {blueFirst && (
              <span className="rounded bg-blue-500/20 border border-blue-500/40 px-1.5 py-0.5 text-[9px] font-black text-blue-300 uppercase">
                {t('matchDetail.firstBlue')}
              </span>
            )}
            {redFirst && (
              <span className="rounded bg-rose-500/20 border border-rose-500/40 px-1.5 py-0.5 text-[9px] font-black text-rose-300 uppercase">
                {t('matchDetail.firstRed')}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between">
          {/* Blue Side */}
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-blue-500/30 bg-blue-950/40 p-1 flex items-center justify-center">
              <Image
                src={blueIcon}
                alt={title}
                width={26}
                height={26}
                className="object-contain"
                unoptimized
              />
            </div>
            <span className="text-base font-black text-blue-400">{blueKills}</span>
          </div>

          <span className="text-[11px] font-bold text-slate-600 uppercase">VS</span>

          {/* Red Side */}
          <div className="flex items-center gap-2">
            <span className="text-base font-black text-rose-400">{redKills}</span>
            <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-rose-500/30 bg-rose-950/40 p-1 flex items-center justify-center">
              <Image
                src={redIcon}
                alt={title}
                width={26}
                height={26}
                className="object-contain"
                unoptimized
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Side-by-Side Team Card
  const renderTeamCard = (
    team: MatchParticipant[],
    teamDetail: TeamMatchDetail,
    isBlue: boolean
  ) => {
    return (
      <div
        className={`flex flex-col rounded-2xl border overflow-hidden shadow-2xl backdrop-blur-md ${
          isBlue
            ? 'border-blue-900/40 bg-gradient-to-b from-blue-950/20 via-black/60 to-black/80'
            : 'border-rose-900/40 bg-gradient-to-b from-rose-950/20 via-black/60 to-black/80'
        }`}
      >
        {/* Team Card Header */}
        <div
          className={`flex items-center justify-between p-4 border-b ${
            isBlue
              ? 'bg-blue-950/60 border-blue-900/40 text-blue-300'
              : 'bg-rose-950/60 border-rose-900/40 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <span className="text-base font-black uppercase tracking-wider">
              {isBlue ? t('matchDetail.blueTeam') : t('matchDetail.redTeam')}
            </span>
            <span
              className={`rounded-md px-2.5 py-0.5 text-xs font-black uppercase tracking-wide border ${
                teamDetail.win
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              }`}
            >
              {teamDetail.win ? t('matchDetail.win') : t('matchDetail.loss')}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-200">
            <span className="flex items-center gap-1.5">
              <Swords className="h-4 w-4 text-slate-400" />
              <span>{teamDetail.totalKills} {t('matchDetail.kills')}</span>
            </span>
            <span className="flex items-center gap-1.5 text-amber-400">
              <Coins className="h-4 w-4" />
              <span>{(teamDetail.totalGold / 1000).toFixed(1)}k</span>
            </span>
          </div>
        </div>

        {/* Players List Table */}
        <div className="divide-y divide-white/[0.04] flex flex-col flex-1">
          {assignTeamPositions(team)
            .map(({ role: pos, participant: p }, pIndex) => {
            if (!p) return null;
            const isHighlighted =
              activeHighlightPuuid === p.puuid ||
              activeHighlightPuuid === `participant${pIndex + (isBlue ? 1 : 6)}` ||
              activeHighlightPuuid === `participant${p.puuid}`;

            const targetTag = p.riotIdTagline || region.toUpperCase();
            const formattedTag = `${p.riotIdGameName}-${targetTag}`;
            const damagePct = p.damageShare ?? (teamDetail.totalDamage > 0
              ? Math.round((p.totalDamageDealtToChampions / teamDetail.totalDamage) * 100)
              : 0);
            const damageBarWidth = Math.min(
              100,
              Math.max(4, Math.round((p.totalDamageDealtToChampions / maxDamage) * 100))
            );
            const kpPct = p.killParticipation ?? (teamDetail.totalKills > 0
              ? Math.round(((p.kills + p.assists) / teamDetail.totalKills) * 100)
              : 0);

            const runeKeystone = getRuneIconUrl(p.primaryRune);
            const runeStyle = getStyleIconUrl(p.secondaryStyle);

            return (
              <div
                key={p.puuid}
                id={`participant${pIndex + (isBlue ? 1 : 6)}`}
                className={`p-3.5 transition-all flex flex-col gap-2.5 ${
                  isHighlighted
                    ? 'bg-amber-500/10 border-l-4 border-amber-400 shadow-inner'
                    : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Row 1: Champion + Spells + Runes + Name + KDA */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Champion Avatar & Level */}
                    <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-md">
                      <Image
                        src={getChampionIconUrl(p.championName)}
                        alt={p.championName}
                        width={44}
                        height={44}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                      <div className="absolute bottom-0 right-0 rounded-tl bg-black/90 px-1 text-[9px] font-bold text-amber-300">
                        {p.champLevel}
                      </div>
                    </div>

                    {/* Summoner Spells & Runes */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <div className="flex gap-0.5">
                        <div className="h-4 w-4 rounded overflow-hidden">
                          <Image
                            src={getSpellIconUrl(p.spells[0])}
                            alt="S1"
                            width={16}
                            height={16}
                            unoptimized
                          />
                        </div>
                        <div className="h-4 w-4 rounded overflow-hidden">
                          <Image
                            src={getSpellIconUrl(p.spells[1])}
                            alt="S2"
                            width={16}
                            height={16}
                            unoptimized
                          />
                        </div>
                      </div>
                      <div className="flex gap-0.5">
                        <div className="h-4 w-4 rounded overflow-hidden flex items-center justify-center">
                          {runeKeystone ? (
                            <Image
                              src={runeKeystone}
                              alt="Rune"
                              width={16}
                              height={16}
                              unoptimized
                            />
                          ) : (
                            <div className="h-full w-full bg-slate-800 rounded-full" />
                          )}
                        </div>
                        <div className="h-4 w-4 rounded overflow-hidden flex items-center justify-center">
                          {runeStyle ? (
                            <Image
                              src={runeStyle}
                              alt="Sub"
                              width={14}
                              height={14}
                              unoptimized
                            />
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {/* Player Name, Tag, Role & LP */}
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5 truncate">
                        <Link
                          href={`/${locale}/summoner/${region}/${encodeURIComponent(formattedTag)}`}
                          className={`truncate text-sm font-bold hover:text-white transition-colors ${
                            isHighlighted ? 'text-amber-400' : 'text-slate-200'
                          }`}
                        >
                          {p.riotIdGameName}
                        </Link>
                        {pos && (
                          <span className="flex items-center gap-1 rounded bg-white/[0.08] border border-white/10 px-1.5 py-0.5 text-[9px] font-black text-amber-300 shrink-0">
                            <Image
                              src={getPositionIconUrl(pos)}
                              alt={pos}
                              width={11}
                              height={11}
                              className="object-contain"
                              unoptimized
                            />
                            <span>{pos}</span>
                          </span>
                        )}
                        {p.lpChange && (
                          <span
                            className={`rounded px-1.5 py-0.2 text-[10px] font-black tracking-tight shrink-0 ${
                              p.lpChange.delta > 0
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {p.lpChange.delta > 0 ? `+${p.lpChange.delta}` : p.lpChange.delta} LP
                          </span>
                        )}
                        {((p.heroScore && p.heroScore > 0) || (p.score && p.score.score > 0)) && (
                          <span
                            className={`flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-black shrink-0 ${
                              p.score?.isMvp
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                                : p.score?.isAce
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                                : 'bg-white/[0.08] text-zinc-300 border border-white/10'
                            }`}
                          >
                            {p.score?.isMvp && <Trophy className="h-3 w-3 text-amber-400" />}
                            {p.score?.isAce && <Award className="h-3 w-3 text-purple-400" />}
                            <span>
                              {p.score?.isMvp ? 'MVP' : p.score?.isAce ? 'ACE' : 'Score'}{' '}
                              {Math.round((p.heroScore ?? p.score!.score) <= 10 ? (p.heroScore ?? p.score!.score) * 10 : (p.heroScore ?? p.score!.score))}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 truncate">
                        <span>#{targetTag}</span>
                        {p.lpChange?.tier && (
                          <span className="text-zinc-400 font-medium">
                            {p.lpChange.tier} {p.lpChange.rank} · {p.lpChange.leaguePoints} LP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* KDA & Kill Participation */}
                  <div className="flex flex-col items-end shrink-0">
                    <div className="text-sm font-black text-slate-100 whitespace-nowrap">
                      <span>{p.kills}</span>
                      <span className="text-slate-500 font-normal"> / </span>
                      <span className="text-rose-400">{p.deaths}</span>
                      <span className="text-slate-500 font-normal"> / </span>
                      <span>{p.assists}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                      <span className={`font-bold ${getKdaColor(Number(calculateKda(p.kills, p.deaths, p.assists)))}`}>
                        {calculateKda(p.kills, p.deaths, p.assists)}:1 KDA
                      </span>
                      <span className="text-slate-500">•</span>
                      <span className="text-amber-300 font-semibold">{kpPct}% KP</span>
                    </div>
                  </div>
                </div>

                {/* Row 2: Damage Bar, Stats & Item Build */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/[0.03]">
                  {/* Damage Dealt with visual bar */}
                  <div className="flex flex-col min-w-[120px] max-w-[160px] flex-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-300 font-bold">
                        {p.totalDamageDealtToChampions.toLocaleString()} Dmg
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">{damagePct}%</span>
                    </div>
                    <div className="mt-0.5 h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${isBlue ? 'bg-blue-400' : 'bg-rose-400'}`}
                        style={{ width: `${damageBarWidth}%` }}
                      />
                    </div>
                  </div>

                  {/* CS, Vision & Gold */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 shrink-0">
                    <div className="flex flex-col items-center">
                      <span className="text-slate-200 font-bold">{p.cs} CS</span>
                      <span className="text-[9px] text-slate-500">{p.csPerMinute}/m</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-slate-200 font-bold">{p.visionScore} VS</span>
                      <span className="text-[9px] text-slate-500">{p.controlWards} CW</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-amber-400 font-bold">
                        {(p.goldEarned / 1000).toFixed(1)}k
                      </span>
                      <span className="text-[9px] text-slate-500">Gold</span>
                    </div>
                  </div>

                  {/* 6 Items + Trinket */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    {p.items.slice(0, 6).map((itemId, idx) => (
                      <div
                        key={idx}
                        className="h-6 w-6 rounded border border-white/[0.08] bg-black/60 overflow-hidden flex items-center justify-center"
                      >
                        {itemId > 0 ? (
                          <Image
                            src={getItemIconUrl(itemId)}
                            alt={`Item ${itemId}`}
                            width={24}
                            height={24}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        ) : null}
                      </div>
                    ))}
                    {/* Trinket */}
                    <div className="h-6 w-6 rounded border border-amber-500/20 bg-black/60 overflow-hidden flex items-center justify-center ml-1">
                      {p.items[6] > 0 ? (
                        <Image
                          src={getItemIconUrl(p.items[6])}
                          alt="Trinket"
                          width={24}
                          height={24}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Team Bans Footer */}
        {teamDetail.bans && (
          <div className="p-3 border-t border-white/[0.06] bg-black/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
              <Ban className="h-3.5 w-3.5 text-rose-400" />
              <span>{t('matchDetail.bans')}</span>
            </div>
            <div className="flex items-center gap-1">
              {[0, 1, 2, 3, 4].map((slotIdx) => {
                const ban = teamDetail.bans?.[slotIdx];
                const isValid = Boolean(
                  ban &&
                  ban.championId > 0 &&
                  ban.championName &&
                  ban.championName.toLowerCase() !== 'none'
                );

                return (
                  <div
                    key={slotIdx}
                    className="relative h-6 w-6 overflow-hidden rounded border border-white/10 bg-black/80 flex items-center justify-center shrink-0"
                    title={isValid ? `Gebannt: ${ban.championName}` : 'Kein Ban'}
                  >
                    {isValid ? (
                      <>
                        <Image
                          src={getChampionIconUrl(ban.championName)}
                          alt={ban.championName}
                          width={24}
                          height={24}
                          className="h-full w-full object-cover grayscale opacity-70"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-rose-950/40" />
                        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-rose-500/80 -rotate-45 pointer-events-none" />
                      </>
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-white/[0.02]">
                        <Ban className="h-2.5 w-2.5 text-zinc-600/70" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-8">
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        items={[
          { label: 'Match' },
          { label: matchId },
        ]}
      />

      {/* 1. Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{t('matchDetail.back')}</span>
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                {t('matchDetail.title')}
              </h1>
              <span className="rounded bg-white/[0.08] px-2 py-0.5 text-xs font-bold uppercase text-amber-300">
                {queueName}
              </span>
              {matchData.lpChange && (
                <div className="flex items-center gap-1.5 ml-1">
                  <span
                    className={`rounded-lg px-2 py-0.5 text-xs font-black tracking-tight ${
                      matchData.lpChange.delta > 0
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    }`}
                  >
                    {matchData.lpChange.delta > 0 ? `+${matchData.lpChange.delta}` : matchData.lpChange.delta} LP
                  </span>
                  {matchData.lpChange.tier && (
                    <span className="text-xs text-zinc-400 font-semibold">
                      {matchData.lpChange.tier} {matchData.lpChange.rank} · {matchData.lpChange.leaguePoints} LP
                    </span>
                  )}
                </div>
              )}
            </div>
            <span className="text-xs text-slate-400 mt-0.5">
              {t('matchDetail.duration', { dur: formatDuration(gameDuration) })} • {t('matchDetail.playedAgo', { time: formatTimeAgo(gameCreation, locale) })} • {t('matchDetail.patch', { patch: gameVersion.slice(0, 5) })}
            </span>
          </div>
        </div>

        {/* Region & Match ID */}
        <div className="text-right text-xs text-slate-500 font-mono">
          ID: {matchData.matchId} ({cluster})
        </div>
      </div>

      {/* 2. Team Scorecard & Kill Comparison Banner */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/60 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          {/* Blue Outcome */}
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl font-black text-blue-400">
              {blueTeam.totalKills}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase text-blue-300">{t('matchDetail.blueTeam')}</span>
              <span className="text-xs font-bold text-amber-400">
                {(blueTeam.totalGold / 1000).toFixed(1)}k Gold
              </span>
            </div>
          </div>

          {/* Center VS */}
          <div className="flex flex-col items-center">
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">VS</span>
            <span className="text-xs font-bold text-slate-400 mt-1">{formatDuration(gameDuration)}</span>
          </div>

          {/* Red Outcome */}
          <div className="flex items-center gap-3 text-right">
            <div className="flex flex-col items-end">
              <span className="text-sm font-black uppercase text-rose-300">{t('matchDetail.redTeam')}</span>
              <span className="text-xs font-bold text-amber-400">
                {(redTeam.totalGold / 1000).toFixed(1)}k Gold
              </span>
            </div>
            <span className="text-2xl sm:text-3xl font-black text-rose-400">
              {redTeam.totalKills}
            </span>
          </div>
        </div>

        {/* Kill Percentage Bar */}
        <div className="h-2 w-full rounded-full bg-white/[0.08] overflow-hidden flex">
          <div className="bg-blue-500 h-full transition-all" style={{ width: `${blueKillPct}%` }} />
          <div className="bg-rose-500 h-full transition-all" style={{ width: `${100 - blueKillPct}%` }} />
        </div>
      </div>

      {/* 3. SPIELERÜBERSICHT DIREKT NACH OBEN & NEBENEINANDER (Blue Left, Red Right) */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="h-4 w-4 text-hextech-blue" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              {t('matchDetail.playerOverview')}
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {t('matchDetail.playerOverviewSubtitle')}
          </span>
        </div>

        {/* 2-Column Grid: Side-by-Side on Desktop */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {renderTeamCard(blueParticipants, blueTeam, true)}
          {renderTeamCard(redParticipants, redTeam, false)}
        </div>
      </div>

      {/* 4. TEAM-OBJEKTIVE (Mit echten Ingame-Icons für Drakes, Baron, Voidgrubs, Türme, Inhibitor, Herald) */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/50 p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-black uppercase tracking-wider text-white">
              {t('matchDetail.teamObjectives')}
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-medium">
            {t('matchDetail.teamObjectivesSubtitle')}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
          {renderObjectiveCard(
            t('matchDetail.drakes'),
            'dragon',
            blueTeam.objectives.dragon.kills,
            redTeam.objectives.dragon.kills,
            blueTeam.objectives.dragon.first,
            redTeam.objectives.dragon.first
          )}
          {renderObjectiveCard(
            t('matchDetail.baronNashor'),
            'baron',
            blueTeam.objectives.baron.kills,
            redTeam.objectives.baron.kills,
            blueTeam.objectives.baron.first,
            redTeam.objectives.baron.first
          )}
          {renderObjectiveCard(
            t('matchDetail.voidgrubs'),
            'voidgrub',
            blueTeam.objectives.horde.kills,
            redTeam.objectives.horde.kills,
            blueTeam.objectives.horde.first,
            redTeam.objectives.horde.first
          )}
          {renderObjectiveCard(
            t('matchDetail.towers'),
            'tower',
            blueTeam.objectives.tower.kills,
            redTeam.objectives.tower.kills,
            blueTeam.objectives.tower.first,
            redTeam.objectives.tower.first
          )}
          {renderObjectiveCard(
            t('matchDetail.inhibitors'),
            'inhibitor',
            blueTeam.objectives.inhibitor.kills,
            redTeam.objectives.inhibitor.kills,
            blueTeam.objectives.inhibitor.first,
            redTeam.objectives.inhibitor.first
          )}
          {renderObjectiveCard(
            t('matchDetail.riftHerald'),
            'herald',
            blueTeam.objectives.riftHerald.kills,
            redTeam.objectives.riftHerald.kills,
            blueTeam.objectives.riftHerald.first,
            redTeam.objectives.riftHerald.first
          )}
        </div>

        {/* Dragon Elements Breakdown with Official Elemental Icons */}
        {((blueTeam.dragonTypes && blueTeam.dragonTypes.length > 0) ||
          (redTeam.dragonTypes && redTeam.dragonTypes.length > 0)) && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            {/* Blue Drakes */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-blue-400">{t('matchDetail.blueDrakes')}</span>
              {blueTeam.dragonTypes && blueTeam.dragonTypes.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {blueTeam.dragonTypes.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 rounded-md bg-blue-950/60 border border-blue-500/30 px-2 py-0.5"
                    >
                      <Image
                        src={getDragonSubtypeIconUrl(d, 'blue')}
                        alt={d}
                        width={16}
                        height={16}
                        unoptimized
                      />
                      <span className="text-[10px] font-bold text-blue-300">
                        {getDragonSubtypeName(d)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500">{t('matchDetail.noDrakes')}</span>
              )}
            </div>

            {/* Red Drakes */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-rose-400">{t('matchDetail.redDrakes')}</span>
              {redTeam.dragonTypes && redTeam.dragonTypes.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {redTeam.dragonTypes.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 rounded-md bg-rose-950/60 border border-rose-500/30 px-2 py-0.5"
                    >
                      <Image
                        src={getDragonSubtypeIconUrl(d, 'red')}
                        alt={d}
                        width={16}
                        height={16}
                        unoptimized
                      />
                      <span className="text-[10px] font-bold text-rose-300">
                        {getDragonSubtypeName(d)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-slate-500">{t('matchDetail.noDrakes')}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 5. MATCH PERFORMANCE SCORE GRAPH */}
      {scoreTimeline && scoreTimeline.length > 1 && (
        <ScoreTimelineChart
          scoreTimeline={scoreTimeline}
          participants={participants}
          blueWon={blueTeam.win}
        />
      )}

      {/* 6. GOLD-VORTEIL GRAPH (Interaktives Timeline-Diagramm) */}
      <GoldAdvantageChart
        timeline={goldAdvantageTimeline}
        blueWon={blueTeam.win}
      />
    </div>
  );
}
