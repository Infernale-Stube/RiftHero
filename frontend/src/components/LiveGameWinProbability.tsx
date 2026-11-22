'use client';

import { useState } from 'react';
import {
  Sparkles,
  TrendingUp,
  Trophy,
  Percent,
  Swords,
  Shield,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { LiveGameWinProbability as WinProbType, LiveGameParticipant } from '@/types';
import { useTranslation } from '@/i18n/LanguageContext';

interface LiveGameWinProbabilityProps {
  winProbability: WinProbType;
  blueTeam?: LiveGameParticipant[];
  redTeam?: LiveGameParticipant[];
}

export default function LiveGameWinProbability({
  winProbability,
}: LiveGameWinProbabilityProps) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  if (!winProbability) return null;

  const blueWinrate =
    typeof winProbability.blueWinrate === 'number' ? winProbability.blueWinrate : 50;
  const redWinrate =
    typeof winProbability.redWinrate === 'number' ? winProbability.redWinrate : 50;
  const favoredTeam =
    winProbability.favoredTeam || (blueWinrate >= 51 ? 'blue' : redWinrate >= 51 ? 'red' : 'even');
  const confidence = winProbability.confidence || 'medium';

  const factors = winProbability.factors || {
    rankDiffLp: 0,
    blueAvgMmr: 1200,
    redAvgMmr: 1200,
    blueAvgWinrate: null,
    redAvgWinrate: null,
    blueChampWinrate: null,
    redChampWinrate: null,
    sideAdvantage: 0,
  };

  const {
    rankDiffLp = 0,
    blueAvgMmr = 1200,
    redAvgMmr = 1200,
    blueAvgWinrate = null,
    redAvgWinrate = null,
    blueChampWinrate = null,
    redChampWinrate = null,
    sideAdvantage = 0,
  } = factors;

  // Determine leaders for each factor
  const rankLeader =
    rankDiffLp > 30 ? 'blue' : rankDiffLp < -30 ? 'red' : 'even';

  const winrateDiff =
    blueAvgWinrate !== null && redAvgWinrate !== null
      ? blueAvgWinrate - redAvgWinrate
      : 0;
  const winrateLeader =
    winrateDiff > 1.5 ? 'blue' : winrateDiff < -1.5 ? 'red' : 'even';

  const champDiff =
    blueChampWinrate !== null && redChampWinrate !== null
      ? blueChampWinrate - redChampWinrate
      : 0;
  const champLeader =
    champDiff > 2 ? 'blue' : champDiff < -2 ? 'red' : 'even';

  const confidenceBadge = {
    high: {
      text: t('live.confidenceHigh'),
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      dot: 'bg-emerald-400',
    },
    medium: {
      text: t('live.confidenceMedium'),
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      dot: 'bg-amber-400',
    },
    low: {
      text: t('live.confidenceLow'),
      color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
      dot: 'bg-zinc-400',
    },
  }[confidence] || {
    text: t('live.confidenceMedium'),
    color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-400',
  };

  const diffPercent = Math.abs(Math.round((blueWinrate - redWinrate) * 10) / 10);

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#0c1017]/95 border border-white/[0.07] shadow-2xl backdrop-blur-md">
      {/* Subtle Ambient Background Gradients */}
      <div className="absolute top-0 left-0 -ml-16 -mt-16 h-48 w-48 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />
      <div className="absolute top-0 right-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-rose-600/10 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="relative z-10 p-4 sm:p-5">
        {/* Top Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          {/* Title & Description */}
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-sm">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100">
                  {t('live.winProbability')}
                </h3>
                {/* Confidence Pill */}
                <div
                  className={`hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold ${confidenceBadge.color}`}
                  title={confidenceBadge.text}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${confidenceBadge.dot}`} />
                  <span>{confidenceBadge.text}</span>
                </div>
              </div>
              <p className="text-[11px] text-zinc-400 hidden sm:block">
                {t('live.winProbabilitySubtitle')}
              </p>
            </div>
          </div>

          {/* Favored Team Badge & Details Toggle */}
          <div className="flex items-center gap-2">
            {favoredTeam === 'blue' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-cyan-300 text-xs font-bold shadow-[0_0_12px_rgba(34,211,238,0.15)]">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  {t('live.blueFavored')}{' '}
                  <span className="font-mono text-[11px] opacity-90">(+{diffPercent}%)</span>
                </span>
              </div>
            ) : favoredTeam === 'red' ? (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold shadow-[0_0_12px_rgba(244,63,94,0.15)]">
                <TrendingUp className="h-3.5 w-3.5" />
                <span>
                  {t('live.redFavored')}{' '}
                  <span className="font-mono text-[11px] opacity-90">(+{diffPercent}%)</span>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold">
                <span>{t('live.evenMatch')}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowDetails((prev) => !prev)}
              className="flex items-center gap-1 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] px-2.5 py-1 text-xs font-medium text-zinc-300 transition-colors"
              title={t('live.toggleFactors')}
            >
              <span>{showDetails ? t('live.less') : t('live.factors')}</span>
              {showDetails ? (
                <ChevronUp className="h-3.5 w-3.5 text-zinc-400" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
              )}
            </button>
          </div>
        </div>

        {/* Win Probability Bar & Numbers */}
        <div className="py-4">
          {/* Numbers row */}
          <div className="flex items-end justify-between mb-2.5">
            {/* Blue Side */}
            <div className="flex flex-col text-left">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_6px_rgba(34,211,238,0.8)]" />
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-cyan-400">
                  {t('live.blueTeam')}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_14px_rgba(6,182,212,0.4)]">
                  {blueWinrate.toFixed(1)}
                </span>
                <span className="text-sm sm:text-base font-bold text-cyan-400">%</span>
              </div>
            </div>

            {/* Center VS pill */}
            <div className="flex flex-col items-center justify-center pb-1">
              <div className="rounded-full bg-black/60 border border-white/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                VS
              </div>
            </div>

            {/* Red Side */}
            <div className="flex flex-col text-right">
              <div className="flex items-center justify-end gap-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-rose-400">
                  {t('live.redTeam')}
                </span>
                <span className="h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_6px_rgba(244,63,94,0.8)]" />
              </div>
              <div className="flex items-baseline justify-end gap-1 mt-0.5">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-tight text-white drop-shadow-[0_0_14px_rgba(244,63,94,0.4)]">
                  {redWinrate.toFixed(1)}
                </span>
                <span className="text-sm sm:text-base font-bold text-rose-400">%</span>
              </div>
            </div>
          </div>

          {/* Visual Dual Progress Bar */}
          <div className="relative h-4 sm:h-5 w-full bg-black/70 rounded-full overflow-hidden p-0.5 border border-white/10 shadow-inner flex items-center">
            {/* Blue Team Segment */}
            <div
              style={{ width: `${blueWinrate}%` }}
              className="h-full rounded-l-full bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 transition-all duration-700 shadow-[0_0_14px_rgba(6,182,212,0.6)] relative overflow-hidden flex items-center justify-start pl-2"
            >
              <div className="absolute inset-0 bg-white/10 opacity-30 animate-pulse pointer-events-none" />
              {blueWinrate >= 25 && (
                <span className="text-[10px] font-black text-white/90 drop-shadow select-none">
                  {blueWinrate.toFixed(0)}%
                </span>
              )}
            </div>

            {/* Red Team Segment */}
            <div
              style={{ width: `${redWinrate}%` }}
              className="h-full rounded-r-full bg-gradient-to-l from-rose-700 via-rose-500 to-red-400 transition-all duration-700 shadow-[0_0_14px_rgba(244,63,94,0.6)] relative overflow-hidden flex items-center justify-end pr-2"
            >
              <div className="absolute inset-0 bg-white/10 opacity-30 animate-pulse pointer-events-none" />
              {redWinrate >= 25 && (
                <span className="text-[10px] font-black text-white/90 drop-shadow select-none">
                  {redWinrate.toFixed(0)}%
                </span>
              )}
            </div>

            {/* Center Reference Line (50%) */}
            <div
              className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-white/60 z-20 shadow-[0_0_4px_rgba(255,255,255,0.8)] pointer-events-none"
              title={t('live.balanceMarker')}
            />
          </div>
        </div>

        {/* Breakdown Factors (Always visible or toggleable) */}
        {showDetails && (
          <div className="mt-2 pt-3 border-t border-white/[0.06] animate-fadeIn">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Factor 1: Rank & MMR */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Trophy className="h-3.5 w-3.5 text-amber-400" />
                    <span>{t('live.rankFactor')}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      rankLeader === 'blue'
                        ? 'bg-blue-500/20 text-cyan-300'
                        : rankLeader === 'red'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-zinc-500/20 text-zinc-400'
                    }`}
                  >
                    {rankLeader === 'blue'
                      ? t('live.blueLead')
                      : rankLeader === 'red'
                      ? t('live.redLead')
                      : t('live.balanced')}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-200">
                  {rankDiffLp !== 0 ? (
                    <>
                      {rankDiffLp > 0 ? '+' : ''}
                      {t('live.lpDiff', { count: rankDiffLp })}
                    </>
                  ) : (
                    t('live.equalRankLevel')
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {t('live.mmrComparison', { blue: blueAvgMmr, red: redAvgMmr })}
                </div>
              </div>

              {/* Factor 2: Ranked Winrate */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Percent className="h-3.5 w-3.5 text-emerald-400" />
                    <span>{t('live.winrateFactor')}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      winrateLeader === 'blue'
                        ? 'bg-blue-500/20 text-cyan-300'
                        : winrateLeader === 'red'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-zinc-500/20 text-zinc-400'
                    }`}
                  >
                    {winrateLeader === 'blue'
                      ? t('live.blueLead')
                      : winrateLeader === 'red'
                      ? t('live.redLead')
                      : t('live.balanced')}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-200">
                  {blueAvgWinrate !== null && redAvgWinrate !== null ? (
                    <span>
                      {blueAvgWinrate}% vs {redAvgWinrate}%
                    </span>
                  ) : (
                    t('live.noData')
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {t('live.avgSeasonWinrates')}
                </div>
              </div>

              {/* Factor 3: Champion Experience */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Swords className="h-3.5 w-3.5 text-purple-400" />
                    <span>{t('live.champFactor')}</span>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      champLeader === 'blue'
                        ? 'bg-blue-500/20 text-cyan-300'
                        : champLeader === 'red'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-zinc-500/20 text-zinc-400'
                    }`}
                  >
                    {champLeader === 'blue'
                      ? t('live.blueLead')
                      : champLeader === 'red'
                      ? t('live.redLead')
                      : t('live.balanced')}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-200">
                  {blueChampWinrate !== null && redChampWinrate !== null ? (
                    <span>
                      {blueChampWinrate}% vs {redChampWinrate}%
                    </span>
                  ) : blueChampWinrate !== null ? (
                    <span>{t('live.bluePrefix')}: {blueChampWinrate}%</span>
                  ) : redChampWinrate !== null ? (
                    <span>{t('live.redPrefix')}: {redChampWinrate}%</span>
                  ) : (
                    t('live.firstMatches')
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {t('live.champExpSubtitle')}
                </div>
              </div>

              {/* Factor 4: Map & Side Bias */}
              <div className="rounded-xl bg-white/[0.03] border border-white/[0.05] p-3 flex flex-col justify-between">
                <div className="flex items-center justify-between text-zinc-400 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <Shield className="h-3.5 w-3.5 text-sky-400" />
                    <span>{t('live.mapFactor')}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-cyan-300">
                    {sideAdvantage > 0 ? t('live.sideAdvantageBlue') : t('live.sideAdvantageNeutral')}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-200">
                  {sideAdvantage > 0 ? t('live.sideAdvantageBlueDesc') : t('live.sideAdvantageSymmetric')}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  {t('live.mapBiasSubtitle')}
                </div>
              </div>
            </div>

            {/* Explanatory Note */}
            <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-zinc-400 bg-white/[0.02] p-2 rounded-lg border border-white/[0.03]">
              <Info className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>
                {t('live.winProbDisclaimer')}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
