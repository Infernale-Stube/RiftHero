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
  Zap,
  Target,
  Flame,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { fetchMatchDetails } from '@/lib/api';
import { MatchDetailResponse, MatchParticipant, TeamMatchDetail } from '@/types';
import {
  getChampionIconUrl,
  getItemIconUrl,
  getSpellIconUrl,
  getRuneIconUrl,
  getStyleIconUrl,
} from '@/lib/ddragon';
import { formatDuration, formatTimeAgo, getKdaColor } from '@/lib/utils';

export default function MatchDetailPage() {
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
        <h2 className="text-lg font-bold text-slate-200">Match-Details werden analysiert...</h2>
        <p className="text-xs text-slate-500 mt-1">Timeline & Objektiv-Statistiken laden</p>
      </div>
    );
  }

  if (!matchData) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-rose-500/40 bg-rose-950/20 p-8 shadow-xl">
          <AlertCircle className="mx-auto h-12 w-12 text-rose-400 mb-3" />
          <h2 className="text-xl font-bold text-white mb-2">Match nicht gefunden</h2>
          <p className="text-sm text-slate-300 mb-6">
            Das Spiel {matchId} konnte weder in der Datenbank noch über die Riot API abgerufen werden.
          </p>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 rounded-lg bg-white/[0.08] px-4 py-2 text-xs font-bold text-white hover:bg-white/[0.12] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Zurück</span>
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
  } = matchData;

  const durationMinutes = gameDuration / 60;
  const blueParticipants = participants.filter((p) => p.teamId === 100);
  const redParticipants = participants.filter((p) => p.teamId === 200);

  const totalKills = blueTeam.totalKills + redTeam.totalKills;
  const blueKillPct = totalKills > 0 ? Math.round((blueTeam.totalKills / totalKills) * 100) : 50;

  const renderObjectiveBadge = (
    label: string,
    blueCount: number,
    redCount: number,
    icon: string
  ) => (
    <div className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
      <span className="text-xs font-bold text-blue-400 min-w-[24px]">{blueCount}</span>
      <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <span className="text-xs font-bold text-rose-400 min-w-[24px] text-right">{redCount}</span>
    </div>
  );

  const renderTeamTable = (team: MatchParticipant[], teamDetail: TeamMatchDetail, isBlue: boolean) => (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-black/50 overflow-hidden shadow-2xl">
      {/* Team Header */}
      <div
        className={`flex items-center justify-between p-4 border-b ${
          isBlue
            ? 'bg-gradient-to-r from-blue-950/60 to-black/60 border-blue-900/40 text-blue-300'
            : 'bg-gradient-to-r from-rose-950/60 to-black/60 border-rose-900/40 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-black uppercase tracking-wider">
            {isBlue ? 'Blaues Team' : 'Rotes Team'}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-xs font-black uppercase tracking-wide ${
              teamDetail.win
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
            }`}
          >
            {teamDetail.win ? 'Sieg' : 'Niederlage'}
          </span>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-200 font-bold">
          <span className="flex items-center gap-1.5">
            <Swords className="h-4 w-4 text-slate-400" />
            {teamDetail.totalKills} Kills
          </span>
          <span className="flex items-center gap-1.5">
            <Coins className="h-4 w-4 text-amber-400" />
            {(teamDetail.totalGold / 1000).toFixed(1)}k Gold
          </span>
        </div>
      </div>

      {/* Players Table */}
      <div className="divide-y divide-white/[0.04]">
        {team.map((p, pIndex) => {
          const isHighlighted =
            activeHighlightPuuid === p.puuid ||
            activeHighlightPuuid === `participant${pIndex + (isBlue ? 1 : 6)}` ||
            activeHighlightPuuid === `participant${p.puuid}`;

          const targetTag = p.riotIdTagline || region.toUpperCase();
          const formattedTag = `${p.riotIdGameName}-${targetTag}`;
          const damagePct = teamDetail.totalDamage > 0
            ? Math.round((p.totalDamageDealtToChampions / teamDetail.totalDamage) * 100)
            : 0;
          const damageBarWidth = Math.min(
            100,
            Math.max(4, Math.round((p.totalDamageDealtToChampions / maxDamage) * 100))
          );

          const runeKeystone = getRuneIconUrl(p.primaryRune);
          const runeStyle = getStyleIconUrl(p.secondaryStyle);

          return (
            <div
              key={p.puuid}
              id={`participant${pIndex + (isBlue ? 1 : 6)}`}
              className={`flex flex-col lg:flex-row lg:items-center justify-between p-3.5 gap-3 transition-all ${
                isHighlighted
                  ? 'bg-amber-500/10 border-l-4 border-amber-400 shadow-inner'
                  : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* 1. Champion + Spells + Runes + Name */}
              <div className="flex items-center gap-3 min-w-[210px]">
                {/* Champ Icon */}
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

                {/* Spells & Runes */}
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

                {/* Player Name & Role */}
                <div className="flex flex-col min-w-0">
                  <Link
                    href={`/summoner/${region}/${encodeURIComponent(formattedTag)}`}
                    className={`truncate text-sm font-bold hover:text-white transition-colors ${
                      isHighlighted ? 'text-amber-400' : 'text-slate-200'
                    }`}
                  >
                    {p.riotIdGameName}
                  </Link>
                  <span className="text-[10px] text-slate-500 truncate">
                    #{targetTag}
                  </span>
                </div>
              </div>

              {/* 2. KDA */}
              <div className="flex flex-col min-w-[95px] text-left lg:text-center">
                <div className="text-sm font-black text-slate-100">
                  <span>{p.kills}</span>
                  <span className="text-slate-500 font-normal"> / </span>
                  <span className="text-rose-400">{p.deaths}</span>
                  <span className="text-slate-500 font-normal"> / </span>
                  <span>{p.assists}</span>
                </div>
                <span className={`text-[11px] ${getKdaColor(p.kda)}`}>
                  {p.kda}:1 KDA
                </span>
              </div>

              {/* 3. Damage Dealt (with visual bar) */}
              <div className="flex flex-col min-w-[130px]">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-200 font-bold">
                    {p.totalDamageDealtToChampions.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">{damagePct}%</span>
                </div>
                <div className="mt-1 h-2 w-full rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isBlue ? 'bg-blue-400' : 'bg-rose-400'}`}
                    style={{ width: `${damageBarWidth}%` }}
                  />
                </div>
              </div>

              {/* 4. Damage Taken & CS */}
              <div className="flex items-center gap-4 text-xs text-slate-400 min-w-[120px]">
                <div className="flex flex-col">
                  <span className="text-slate-200 font-bold">{p.cs} CS</span>
                  <span className="text-[10px] text-slate-500">{p.csPerMinute}/m</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-200 font-bold">{p.visionScore} VS</span>
                  <span className="text-[10px] text-slate-500">
                    {p.controlWards} CW
                  </span>
                </div>
              </div>

              {/* 5. Items Build (0-6) */}
              <div className="flex items-center gap-1 shrink-0">
                {p.items.slice(0, 6).map((itemId, idx) => (
                  <div
                    key={idx}
                    className="h-7 w-7 rounded-lg border border-white/[0.08] bg-black/60 overflow-hidden flex items-center justify-center"
                  >
                    {itemId > 0 ? (
                      <Image
                        src={getItemIconUrl(itemId)}
                        alt={`Item ${itemId}`}
                        width={28}
                        height={28}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : null}
                  </div>
                ))}
                {/* Trinket */}
                <div className="h-7 w-7 rounded-lg border border-white/[0.08] bg-black/60 overflow-hidden flex items-center justify-center ml-1">
                  {p.items[6] > 0 ? (
                    <Image
                      src={getItemIconUrl(p.items[6])}
                      alt="Trinket"
                      width={28}
                      height={28}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex flex-col gap-8">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Zurück</span>
          </button>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">
                Match-Analyse
              </h1>
              <span className="rounded bg-white/[0.08] px-2 py-0.5 text-xs font-bold uppercase text-amber-300">
                {queueName}
              </span>
            </div>
            <span className="text-xs text-slate-400 mt-0.5">
              Dauer: {formatDuration(gameDuration)} • Gespielt {formatTimeAgo(gameCreation)} • Patch {gameVersion.slice(0, 5)}
            </span>
          </div>
        </div>

        {/* Region & Match ID */}
        <div className="text-right text-xs text-slate-500 font-mono">
          ID: {matchData.matchId} ({cluster})
        </div>
      </div>

      {/* Team Scorecard & Kill Comparison Banner */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/60 p-6 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-4">
          {/* Blue Outcome */}
          <div className="flex items-center gap-3">
            <span className="text-2xl sm:text-3xl font-black text-blue-400">
              {blueTeam.totalKills}
            </span>
            <div className="flex flex-col">
              <span className="text-sm font-black uppercase text-blue-300">Blaues Team</span>
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
              <span className="text-sm font-black uppercase text-rose-300">Rotes Team</span>
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

      {/* Objectives Dashboard (League of Graphs style) */}
      <div className="rounded-2xl border border-white/[0.08] bg-black/50 p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-white">
            Team-Objektive (Drakes, Barons, Türme)
          </h2>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {renderObjectiveBadge(
            'Drakes',
            blueTeam.objectives.dragon.kills,
            redTeam.objectives.dragon.kills,
            '🐉'
          )}
          {renderObjectiveBadge(
            'Barons',
            blueTeam.objectives.baron.kills,
            redTeam.objectives.baron.kills,
            '👾'
          )}
          {renderObjectiveBadge(
            'Türme',
            blueTeam.objectives.tower.kills,
            redTeam.objectives.tower.kills,
            '🏰'
          )}
          {renderObjectiveBadge(
            'Inhibitoren',
            blueTeam.objectives.inhibitor.kills,
            redTeam.objectives.inhibitor.kills,
            '💎'
          )}
          {renderObjectiveBadge(
            'Heralds',
            blueTeam.objectives.riftHerald.kills,
            redTeam.objectives.riftHerald.kills,
            '👁️'
          )}
          {renderObjectiveBadge(
            'Voidgrubs',
            blueTeam.objectives.horde.kills,
            redTeam.objectives.horde.kills,
            '🐛'
          )}
        </div>

        {/* Dragon Elements Breakdown if recorded */}
        {(blueTeam.dragonTypes && blueTeam.dragonTypes.length > 0 || redTeam.dragonTypes && redTeam.dragonTypes.length > 0) && (
          <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-400">Blau Drakes:</span>
              <div className="flex gap-1">
                {blueTeam.dragonTypes?.map((d, i) => (
                  <span key={i} className="rounded bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-300">
                    {d.replace('_DRAGON', '')}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-bold text-rose-400">Rot Drakes:</span>
              <div className="flex gap-1">
                {redTeam.dragonTypes?.map((d, i) => (
                  <span key={i} className="rounded bg-rose-900/40 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    {d.replace('_DRAGON', '')}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Gold Advantage Timeline Graph (if available) */}
      {goldAdvantageTimeline && goldAdvantageTimeline.length > 1 && (
        <div className="rounded-2xl border border-white/[0.08] bg-black/50 p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Gold-Vorteil im Spielverlauf (Timeline)
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-medium">Minute für Minute</span>
          </div>

          <div className="h-28 w-full flex items-end gap-1.5 pt-6 pb-2 px-2 bg-black/40 rounded-xl border border-white/[0.04]">
            {goldAdvantageTimeline.map((pt) => {
              const maxLead = Math.max(
                ...goldAdvantageTimeline.map((p) => Math.abs(p.diff)),
                1000
              );
              const heightPct = Math.min(100, Math.max(8, Math.round((Math.abs(pt.diff) / maxLead) * 100)));
              const isBlueLead = pt.diff >= 0;

              return (
                <div
                  key={pt.minute}
                  className="flex-1 flex flex-col justify-end items-center group relative h-full"
                >
                  {/* Tooltip */}
                  <div className="absolute -top-9 hidden group-hover:flex flex-col items-center bg-black/90 border border-white/20 rounded px-2 py-1 text-[10px] font-bold text-white whitespace-nowrap z-20">
                    <span>Min {pt.minute}: {isBlueLead ? '+' : ''}{(pt.diff / 1000).toFixed(1)}k Gold</span>
                  </div>

                  <div
                    className={`w-full rounded-t transition-all ${
                      isBlueLead ? 'bg-blue-400 group-hover:bg-blue-300' : 'bg-rose-500 group-hover:bg-rose-400'
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span className="text-[8px] text-slate-500 mt-1 select-none">
                    {pt.minute % 5 === 0 ? `${pt.minute}m` : ''}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Team Tables */}
      <div className="flex flex-col gap-6">
        {renderTeamTable(blueParticipants, blueTeam, true)}
        {renderTeamTable(redParticipants, redTeam, false)}
      </div>
    </div>
  );
}
