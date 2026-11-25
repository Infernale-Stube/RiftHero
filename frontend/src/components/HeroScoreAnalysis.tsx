'use client';

import React, { useState, useMemo } from 'react';
import Image from 'next/image';
import { Trophy, Award, BarChart3, Shield, Swords, Coins, Eye, Target, GitCompare } from 'lucide-react';
import { MatchParticipant, ScoreTier, HeroScoreBreakdown } from '@/types';
import { getChampionIconUrl, getPositionIconUrl, getParticipantPosition } from '@/lib/ddragon';
import { useTranslation } from '@/i18n/LanguageContext';

interface HeroScoreAnalysisProps {
  participants: MatchParticipant[];
}

export function getTierBadgeClasses(tier?: ScoreTier | string): string {
  switch (tier) {
    case 'S+':
      return 'bg-amber-400/20 text-amber-300 border-amber-400/50';
    case 'S':
      return 'bg-orange-500/20 text-orange-300 border-orange-400/40';
    case 'A':
      return 'bg-sky-500/20 text-sky-300 border-sky-400/40';
    case 'B':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'C':
      return 'bg-zinc-500/20 text-zinc-300 border-zinc-500/40';
    default:
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
  }
}

export function getBarColorClass(score: number): string {
  if (score >= 82) return 'bg-gradient-to-r from-amber-400 to-orange-400';
  if (score >= 68) return 'bg-gradient-to-r from-sky-400 to-cyan-400';
  if (score >= 52) return 'bg-gradient-to-r from-emerald-400 to-teal-400';
  if (score >= 38) return 'bg-zinc-400';
  return 'bg-rose-400';
}

function formatDiff(val: number | null | undefined, suffix = ''): string {
  if (val === null || val === undefined) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toLocaleString()}${suffix}`;
}

export default function HeroScoreAnalysis({ participants }: HeroScoreAnalysisProps) {
  const { t } = useTranslation();

  const rankedParticipants = useMemo(() => {
    return [...participants]
      .filter((p) => (p.score?.score ?? p.heroScore ?? 0) > 0)
      .sort((a, b) => {
        const sB = b.score?.score ?? b.heroScore ?? 0;
        const sA = a.score?.score ?? a.heroScore ?? 0;
        return sB - sA;
      });
  }, [participants]);

  const defaultPuuid =
    rankedParticipants.find((p) => p.score?.isMvp)?.puuid ||
    rankedParticipants[0]?.puuid ||
    '';

  const [selectedPuuid, setSelectedPuuid] = useState<string>(defaultPuuid);

  if (rankedParticipants.length === 0) {
    return null;
  }

  const selectedPlayer =
    rankedParticipants.find((p) => p.puuid === selectedPuuid) || rankedParticipants[0];
  const breakdown: HeroScoreBreakdown | undefined = selectedPlayer?.score?.breakdown;
  const finalScore = Math.round(selectedPlayer?.score?.score ?? selectedPlayer?.heroScore ?? 0);
  const tier = selectedPlayer?.score?.tierRating || 'B';

  const blueScored = rankedParticipants.filter((p) => p.teamId === 100);
  const redScored = rankedParticipants.filter((p) => p.teamId === 200);
  const avgBlue =
    blueScored.length > 0
      ? Math.round(
          blueScored.reduce((acc, p) => acc + (p.score?.score ?? p.heroScore ?? 0), 0) /
            blueScored.length
        )
      : 0;
  const avgRed =
    redScored.length > 0
      ? Math.round(
          redScored.reduce((acc, p) => acc + (p.score?.score ?? p.heroScore ?? 0), 0) /
            redScored.length
        )
      : 0;

  const criteriaRows = breakdown
    ? [
        {
          key: 'combat',
          label: t('matchDetail.criteriaCombat'),
          icon: Swords,
          score: breakdown.combat.score,
          weight: breakdown.combat.weight,
          detail: `${breakdown.highlights.kda} KDA · ${breakdown.highlights.killParticipation}% KP`,
        },
        {
          key: 'damage',
          label: t('matchDetail.criteriaDamage'),
          icon: BarChart3,
          score: breakdown.damage.score,
          weight: breakdown.damage.weight,
          detail: `${breakdown.highlights.damageShare}% Team Dmg`,
        },
        {
          key: 'economy',
          label: t('matchDetail.criteriaEconomy'),
          icon: Coins,
          score: breakdown.economy.score,
          weight: breakdown.economy.weight,
          detail: `${breakdown.highlights.csPerMin} CS/m · ${breakdown.highlights.goldPerMin} G/m`,
        },
        {
          key: 'objectives',
          label: t('matchDetail.criteriaObjectives'),
          icon: Target,
          score: breakdown.objectives.score,
          weight: breakdown.objectives.weight,
          detail: `${breakdown.highlights.objectiveTakedowns} ${t('matchDetail.objTakedowns')}`,
        },
        {
          key: 'vision',
          label: t('matchDetail.criteriaVision'),
          icon: Eye,
          score: breakdown.vision.score,
          weight: breakdown.vision.weight,
          detail: `${breakdown.highlights.visionPerMin} VS/m`,
        },
        {
          key: 'lane',
          label: t('matchDetail.criteriaLane'),
          icon: GitCompare,
          score: breakdown.lane.score,
          weight: breakdown.lane.weight,
          detail: `${t('matchDetail.laneDiffGold')}: ${formatDiff(breakdown.highlights.goldDiffVsLane)}`,
        },
      ]
    : [];

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-black/50 p-6 shadow-2xl backdrop-blur-md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400">
            <Shield className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-base font-black tracking-tight text-white">
              {t('matchDetail.heroScoreTitle')}
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              {t('matchDetail.heroScoreSubtitle')}
            </p>
          </div>
        </div>

        {/* Team Averages */}
        <div className="flex items-center gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 rounded-lg bg-blue-950/40 border border-blue-500/30 px-3 py-1.5">
            <span className="text-[10px] font-bold uppercase text-blue-300">{t('matchDetail.blueTeam')}</span>
            <span className="font-black text-blue-400">{avgBlue}</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg bg-rose-950/40 border border-rose-500/30 px-3 py-1.5">
            <span className="text-[10px] font-bold uppercase text-rose-300">{t('matchDetail.redTeam')}</span>
            <span className="font-black text-rose-400">{avgRed}</span>
          </div>
        </div>
      </div>

      {/* 2-Column Layout: Leaderboard Left, Selected Breakdown Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Ranked 1st-10th Leaderboard */}
        <div className="lg:col-span-5 flex flex-col gap-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
            {t('matchDetail.scoreRanking')}
          </div>
          {rankedParticipants.map((p, idx) => {
            const pScore = Math.round(p.score?.score ?? p.heroScore ?? 0);
            const pTier = p.score?.tierRating || 'B';
            const isSelected = p.puuid === selectedPlayer.puuid;
            const isBlue = p.teamId === 100;
            const pos = getParticipantPosition(p);

            return (
              <button
                key={p.puuid}
                type="button"
                onClick={() => setSelectedPuuid(p.puuid)}
                className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left transition-all ${
                  isSelected
                    ? 'border-amber-400/50 bg-amber-500/10 shadow-md'
                    : 'border-white/[0.05] bg-white/[0.02] hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-6 text-center text-xs font-black text-zinc-400 shrink-0">
                    #{p.score?.rank ?? idx + 1}
                  </span>
                  <div
                    className={`relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border ${
                      isBlue ? 'border-blue-500/40' : 'border-rose-500/40'
                    }`}
                  >
                    <Image
                      src={getChampionIconUrl(p.championName)}
                      alt={p.championName}
                      width={28}
                      height={28}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="truncate text-xs font-bold text-white">
                        {p.riotIdGameName}
                      </span>
                      {pos && (
                        <Image
                          src={getPositionIconUrl(pos)}
                          alt={pos}
                          width={11}
                          height={11}
                          className="object-contain opacity-80 shrink-0"
                          unoptimized
                        />
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400">
                      {p.kills}/{p.deaths}/{p.assists} · {p.championName}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {p.score?.isMvp && (
                    <span className="flex items-center gap-0.5 rounded bg-amber-400 text-black px-1.5 py-0.5 text-[9px] font-black">
                      <Trophy className="h-2.5 w-2.5" />
                      MVP
                    </span>
                  )}
                  {p.score?.isAce && (
                    <span className="flex items-center gap-0.5 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 px-1.5 py-0.5 text-[9px] font-black">
                      <Award className="h-2.5 w-2.5" />
                      ACE
                    </span>
                  )}
                  <span
                    className={`rounded border px-1.5 py-0.5 text-[10px] font-black ${getTierBadgeClasses(
                      pTier
                    )}`}
                  >
                    {pTier}
                  </span>
                  <span className="w-7 text-right text-sm font-black text-white">
                    {pScore}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Player Detailed Breakdown */}
        <div className="lg:col-span-7 flex flex-col justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
          <div>
            {/* Selected Player Header */}
            <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-white/15">
                  <Image
                    src={getChampionIconUrl(selectedPlayer.championName)}
                    alt={selectedPlayer.championName}
                    width={48}
                    height={48}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-black text-white truncate">
                      {selectedPlayer.riotIdGameName}
                    </span>
                    {selectedPlayer.score?.isMvp && (
                      <span className="flex items-center gap-1 rounded bg-amber-400 text-black px-2 py-0.5 text-[10px] font-black">
                        <Trophy className="h-3 w-3" />
                        MVP
                      </span>
                    )}
                    {selectedPlayer.score?.isAce && (
                      <span className="flex items-center gap-1 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 px-2 py-0.5 text-[10px] font-black">
                        <Award className="h-3 w-3" />
                        ACE
                      </span>
                    )}
                    {breakdown && (
                      <span className="rounded bg-white/[0.08] px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        {breakdown.role}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-0.5">
                    {selectedPlayer.championName} · {selectedPlayer.kills}/{selectedPlayer.deaths}/{selectedPlayer.assists} ·{' '}
                    {selectedPlayer.win ? t('matchDetail.win') : t('matchDetail.loss')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`rounded-lg border px-2.5 py-1 text-sm font-black ${getTierBadgeClasses(
                    tier
                  )}`}
                >
                  {tier}
                </span>
                <div className="flex flex-col items-end">
                  <span className="text-2xl font-black text-white leading-none">{finalScore}</span>
                  <span className="text-[10px] font-bold uppercase text-zinc-500">Hero Score</span>
                </div>
              </div>
            </div>

            {/* 6 Criteria Progress Bars */}
            {breakdown ? (
              <div className="flex flex-col gap-3">
                {criteriaRows.map((row) => {
                  const Icon = row.icon;
                  const weightPct = Math.round(row.weight * 100);
                  const isInactive = weightPct === 0;

                  return (
                    <div key={row.key} className={`flex flex-col gap-1 ${isInactive ? 'opacity-45' : ''}`}>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Icon className="h-3.5 w-3.5 text-zinc-400" />
                          <span className="font-bold text-zinc-200">{row.label}</span>
                          <span className="rounded bg-white/[0.06] px-1.5 py-0.2 text-[10px] font-semibold text-zinc-400">
                            {weightPct}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-zinc-400">{row.detail}</span>
                          <span className="w-7 text-right font-black text-white">
                            {isInactive ? '—' : row.score}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-white/[0.06] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${getBarColorClass(
                            row.score
                          )}`}
                          style={{ width: `${isInactive ? 0 : Math.max(4, row.score)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          {/* Bottom Highlights & Outcome Modifier */}
          {breakdown && (
            <div className="mt-5 pt-4 border-t border-white/[0.06] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="rounded-lg bg-black/40 border border-white/[0.05] px-2.5 py-2">
                <div className="text-[10px] text-zinc-500">{t('matchDetail.laneDiffGold')}</div>
                <div
                  className={`font-black ${
                    (breakdown.highlights.goldDiffVsLane ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatDiff(breakdown.highlights.goldDiffVsLane)}
                </div>
              </div>
              <div className="rounded-lg bg-black/40 border border-white/[0.05] px-2.5 py-2">
                <div className="text-[10px] text-zinc-500">{t('matchDetail.laneDiffCs')}</div>
                <div
                  className={`font-black ${
                    (breakdown.highlights.csDiffVsLane ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatDiff(breakdown.highlights.csDiffVsLane)}
                </div>
              </div>
              <div className="rounded-lg bg-black/40 border border-white/[0.05] px-2.5 py-2">
                <div className="text-[10px] text-zinc-500">{t('matchDetail.laneDiffDmg')}</div>
                <div
                  className={`font-black ${
                    (breakdown.highlights.dmgDiffVsLane ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {formatDiff(breakdown.highlights.dmgDiffVsLane)}
                </div>
              </div>
              <div className="rounded-lg bg-black/40 border border-white/[0.05] px-2.5 py-2">
                <div className="text-[10px] text-zinc-500">
                  {breakdown.winBonus > 0
                    ? t('matchDetail.winBonus')
                    : breakdown.winBonus < 0
                    ? t('matchDetail.lossPenalty')
                    : t('matchDetail.remakeNeutral')}
                </div>
                <div
                  className={`font-black ${
                    breakdown.winBonus > 0
                      ? 'text-emerald-400'
                      : breakdown.winBonus < 0
                      ? 'text-rose-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {breakdown.winBonus > 0 ? `+${breakdown.winBonus}` : breakdown.winBonus}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
