'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import {
  X,
  Trophy,
  Award,
  Swords,
  BarChart3,
  Coins,
  Target,
  Eye,
  GitCompare,
  Loader2,
  Shield,
} from 'lucide-react';
import { MatchParticipant, HeroScoreBreakdown } from '@/types';
import { getChampionIconUrl, getPositionIconUrl, getParticipantPosition } from '@/lib/ddragon';
import { fetchMatchDetails } from '@/lib/api';
import { useTranslation } from '@/i18n/LanguageContext';
import { getTierBadgeClasses, getBarColorClass } from './HeroScoreAnalysis';

interface HeroScoreModalProps {
  participant: MatchParticipant | null;
  region?: string;
  matchId?: string;
  gameDuration?: number;
  onClose: () => void;
}

function formatDiff(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toLocaleString()}`;
}

export default function HeroScoreModal({
  participant,
  region,
  matchId,
  gameDuration,
  onClose,
}: HeroScoreModalProps) {
  const { t } = useTranslation();
  const [loadedParticipant, setLoadedParticipant] = useState<MatchParticipant | null>(null);
  const [loadedDuration, setLoadedDuration] = useState<number | undefined>(gameDuration);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  // Close on Escape
  useEffect(() => {
    if (!participant) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [participant, onClose]);

  // Lazy-fetch full match details if breakdown is missing (e.g. opened from MatchCard)
  useEffect(() => {
    let cancelled = false;
    setLoadedParticipant(null);
    setLoadedDuration(gameDuration);

    if (!participant || participant.score?.breakdown || !region || !matchId) {
      setIsLoadingDetails(false);
      return;
    }

    setIsLoadingDetails(true);
    fetchMatchDetails(region, matchId)
      .then((details) => {
        if (cancelled || !details) return;
        const found = details.participants.find((p) => p.puuid === participant.puuid);
        if (found) {
          setLoadedParticipant(found);
          setLoadedDuration(details.gameDuration);
        }
      })
      .catch(() => {
        // Keep basic participant data if fetch fails
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [participant, region, matchId, gameDuration]);

  if (!participant) return null;

  const active = loadedParticipant || participant;
  const breakdown: HeroScoreBreakdown | undefined = active.score?.breakdown;
  const rawScore = active.score?.score ?? active.heroScore ?? 0;
  const displayScore = Math.round(rawScore <= 10 ? rawScore * 10 : rawScore);
  const tier = active.score?.tierRating || 'B';
  const pos = getParticipantPosition(active);
  const durationMin = Math.max((loadedDuration || 1800) / 60, 1);

  const weightedSum = breakdown
    ? breakdown.combat.score * breakdown.combat.weight +
      breakdown.damage.score * breakdown.damage.weight +
      breakdown.economy.score * breakdown.economy.weight +
      breakdown.objectives.score * breakdown.objectives.weight +
      breakdown.vision.score * breakdown.vision.weight +
      breakdown.lane.score * breakdown.lane.weight
    : null;

  const criteriaRows = breakdown
    ? [
        {
          key: 'combat',
          label: t('matchDetail.criteriaCombat'),
          icon: Swords,
          score: breakdown.combat.score,
          weight: breakdown.combat.weight,
          contribution: breakdown.combat.score * breakdown.combat.weight,
          subMetrics: [
            `${active.kills}/${active.deaths}/${active.assists} (${breakdown.highlights.kda} KDA)`,
            `${breakdown.highlights.killParticipation}% KP`,
          ],
        },
        {
          key: 'damage',
          label: t('matchDetail.criteriaDamage'),
          icon: BarChart3,
          score: breakdown.damage.score,
          weight: breakdown.damage.weight,
          contribution: breakdown.damage.score * breakdown.damage.weight,
          subMetrics: [
            `${active.totalDamageDealtToChampions.toLocaleString()} Dmg`,
            `${breakdown.highlights.damageShare}% Team · ${Math.round(active.totalDamageDealtToChampions / durationMin)} DPM`,
          ],
        },
        {
          key: 'economy',
          label: t('matchDetail.criteriaEconomy'),
          icon: Coins,
          score: breakdown.economy.score,
          weight: breakdown.economy.weight,
          contribution: breakdown.economy.score * breakdown.economy.weight,
          subMetrics: [
            `${active.cs} CS (${breakdown.highlights.csPerMin}/m)`,
            `${active.goldEarned.toLocaleString()} Gold (${breakdown.highlights.goldPerMin}/m)`,
          ],
        },
        {
          key: 'objectives',
          label: t('matchDetail.criteriaObjectives'),
          icon: Target,
          score: breakdown.objectives.score,
          weight: breakdown.objectives.weight,
          contribution: breakdown.objectives.score * breakdown.objectives.weight,
          subMetrics: [
            `${breakdown.highlights.objectiveTakedowns} ${t('matchDetail.objTakedowns')}`,
          ],
        },
        {
          key: 'vision',
          label: t('matchDetail.criteriaVision'),
          icon: Eye,
          score: breakdown.vision.score,
          weight: breakdown.vision.weight,
          contribution: breakdown.vision.score * breakdown.vision.weight,
          subMetrics: [
            `${active.visionScore} VS (${breakdown.highlights.visionPerMin}/m)`,
            `${active.wardsPlaced}W / ${active.wardsKilled}K · ${active.controlWards} CW`,
          ],
        },
        {
          key: 'lane',
          label: t('matchDetail.criteriaLane'),
          icon: GitCompare,
          score: breakdown.lane.score,
          weight: breakdown.lane.weight,
          contribution: breakdown.lane.score * breakdown.lane.weight,
          subMetrics: [
            `${t('matchDetail.laneDiffGold')}: ${formatDiff(breakdown.highlights.goldDiffVsLane)}`,
            `${t('matchDetail.laneDiffCs')}: ${formatDiff(breakdown.highlights.csDiffVsLane)} · ${t('matchDetail.laneDiffDmg')}: ${formatDiff(breakdown.highlights.dmgDiffVsLane)}`,
          ],
        },
      ]
    : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={t('matchDetail.scoreModalTitle')}
    >
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/15 bg-[#0c1017] p-5 sm:p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Modal Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/15 shadow-md">
              <Image
                src={getChampionIconUrl(active.championName)}
                alt={active.championName}
                width={56}
                height={56}
                className="h-full w-full object-cover"
                unoptimized
              />
              <div className="absolute bottom-0 right-0 rounded-tl bg-black/90 px-1.5 py-0.2 text-[10px] font-bold text-amber-300">
                {active.champLevel}
              </div>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black text-white truncate">
                  {active.riotIdGameName}
                </h3>
                {active.score?.isMvp && (
                  <span className="flex items-center gap-1 rounded bg-amber-400 text-black px-2 py-0.5 text-[10px] font-black">
                    <Trophy className="h-3 w-3" />
                    MVP
                  </span>
                )}
                {active.score?.isAce && (
                  <span className="flex items-center gap-1 rounded bg-teal-500/20 border border-teal-500/40 text-teal-300 px-2 py-0.5 text-[10px] font-black">
                    <Award className="h-3 w-3" />
                    ACE
                  </span>
                )}
                {pos && (
                  <span className="flex items-center gap-1 rounded bg-white/[0.08] border border-white/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
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
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-400 mt-0.5 flex-wrap">
                <span>{active.championName}</span>
                <span>•</span>
                <span className={active.win ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                  {active.win ? t('matchDetail.win') : t('matchDetail.loss')}
                </span>
                {active.score?.rank && (
                  <>
                    <span>•</span>
                    <span className="text-zinc-300 font-semibold">
                      #{active.score.rank} / 10
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5">
              <span
                className={`rounded-md border px-2 py-0.5 text-sm font-black ${getTierBadgeClasses(
                  tier
                )}`}
              >
                {tier}
              </span>
              <div className="flex flex-col items-end">
                <span className="text-2xl font-black text-white leading-none">
                  {displayScore}
                </span>
                <span className="text-[9px] font-bold uppercase text-zinc-500">
                  Hero Score
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={t('matchDetail.close')}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-1.5 text-zinc-400 hover:bg-white/[0.1] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="mt-5">
          {isLoadingDetails ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-xs text-zinc-400">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
              <span>{t('matchDetail.loadingDetails')}</span>
            </div>
          ) : breakdown ? (
            <>
              <div className="flex items-center justify-between text-xs text-zinc-400 mb-3">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-300">
                  <Shield className="h-3.5 w-3.5 text-amber-400" />
                  <span>{t('matchDetail.scoreModalTitle')}</span>
                </div>
                <span className="text-[11px] text-zinc-500">
                  {t('matchDetail.weightedPoints')}
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {criteriaRows.map((row) => {
                  const Icon = row.icon;
                  const weightPct = Math.round(row.weight * 100);
                  const isInactive = weightPct === 0;

                  return (
                    <div
                      key={row.key}
                      className={`rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 ${
                        isInactive ? 'opacity-45' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-4 w-4 text-amber-400 shrink-0" />
                          <span className="font-bold text-white">{row.label}</span>
                          <span className="rounded bg-white/[0.07] px-1.5 py-0.2 text-[10px] font-bold text-zinc-300">
                            {weightPct}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2.5 shrink-0">
                          <span className="text-[11px] font-medium text-zinc-400">
                            +{row.contribution.toFixed(1)} Pkt
                          </span>
                          <span className="w-8 text-right text-sm font-black text-white">
                            {isInactive ? '—' : row.score}
                          </span>
                        </div>
                      </div>

                      <div className="h-2 w-full rounded-full bg-white/[0.07] overflow-hidden mb-1.5">
                        <div
                          className={`h-full rounded-full ${getBarColorClass(row.score)}`}
                          style={{
                            width: `${isInactive ? 0 : Math.max(4, row.score)}%`,
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-400 flex-wrap">
                        <span>{row.subMetrics[0]}</span>
                        {row.subMetrics[1] && <span>{row.subMetrics[1]}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Formula Summary */}
              {weightedSum !== null && (
                <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-amber-200">
                    {t('matchDetail.scoreFormula')}
                  </span>
                  <div className="flex items-center gap-1.5 font-mono text-xs flex-wrap">
                    <span className="text-zinc-300">
                      {t('matchDetail.baseSum')}: <strong>{weightedSum.toFixed(1)}</strong>
                    </span>
                    <span className="text-zinc-500">+</span>
                    <span
                      className={
                        breakdown.winBonus > 0
                          ? 'text-emerald-400 font-bold'
                          : breakdown.winBonus < 0
                          ? 'text-rose-400 font-bold'
                          : 'text-zinc-400 font-bold'
                      }
                    >
                      {breakdown.winBonus > 0
                        ? `+${breakdown.winBonus}`
                        : breakdown.winBonus}{' '}
                      (
                      {breakdown.winBonus > 0
                        ? t('matchDetail.winBonus')
                        : breakdown.winBonus < 0
                        ? t('matchDetail.lossPenalty')
                        : t('matchDetail.remakeNeutral')}
                      )
                    </span>
                    <span className="text-zinc-500">=</span>
                    <span className="rounded bg-white/10 px-2 py-0.5 font-black text-white">
                      {displayScore} ({tier})
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-zinc-500">KDA</div>
                <div className="text-sm font-black text-white">
                  {active.kills}/{active.deaths}/{active.assists}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-zinc-500">{t('matchDetail.criteriaDamage')}</div>
                <div className="text-sm font-black text-white">
                  {active.totalDamageDealtToChampions.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-zinc-500">{t('matchDetail.damageTakenLabel')}</div>
                <div className="text-sm font-black text-white">
                  {active.totalDamageTaken.toLocaleString()}
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-zinc-500">CS & Gold</div>
                <div className="text-sm font-black text-white">
                  {active.cs} CS · {(active.goldEarned / 1000).toFixed(1)}k
                </div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="text-zinc-500">{t('matchDetail.criteriaVision')}</div>
                <div className="text-sm font-black text-white">
                  {active.visionScore} VS ({active.wardsPlaced}/{active.wardsKilled})
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
