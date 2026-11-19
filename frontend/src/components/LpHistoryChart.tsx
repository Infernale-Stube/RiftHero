'use client';

import React, { useState, useId } from 'react';
import Image from 'next/image';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { LpHistorySummary, LpPoint } from '@/types';
import { getRankEmblemUrl } from './RankBadge';
import { useTranslation } from '@/i18n/LanguageContext';

interface LpHistoryChartProps {
  lpHistory: LpHistorySummary;
}

// Official Rank Colors for dynamic stroke & gradient fill
export const RANK_THEMES: Record<
  string,
  { stroke: string; stopColor: string; text: string; bg: string }
> = {
  CHALLENGER: { stroke: '#fbbf24', stopColor: '#fbbf24', text: 'text-amber-300', bg: 'bg-amber-500/10' },
  GRANDMASTER: { stroke: '#f43f5e', stopColor: '#f43f5e', text: 'text-rose-400', bg: 'bg-rose-500/10' },
  MASTER: { stroke: '#a855f7', stopColor: '#a855f7', text: 'text-purple-400', bg: 'bg-purple-500/10' },
  DIAMOND: { stroke: '#38bdf8', stopColor: '#38bdf8', text: 'text-sky-400', bg: 'bg-sky-500/10' },
  EMERALD: { stroke: '#10b981', stopColor: '#10b981', text: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  PLATINUM: { stroke: '#2dd4bf', stopColor: '#2dd4bf', text: 'text-teal-300', bg: 'bg-teal-500/10' },
  GOLD: { stroke: '#eab308', stopColor: '#eab308', text: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  SILVER: { stroke: '#94a3b8', stopColor: '#94a3b8', text: 'text-slate-300', bg: 'bg-slate-500/10' },
  BRONZE: { stroke: '#d97706', stopColor: '#d97706', text: 'text-amber-600', bg: 'bg-amber-600/10' },
  IRON: { stroke: '#71717a', stopColor: '#71717a', text: 'text-zinc-400', bg: 'bg-zinc-500/10' },
  UNRANKED: { stroke: '#64748b', stopColor: '#64748b', text: 'text-slate-400', bg: 'bg-slate-500/10' },
};

export default function LpHistoryChart({ lpHistory }: LpHistoryChartProps) {
  const { t } = useTranslation();
  const [hoveredPoint, setHoveredPoint] = useState<LpPoint | null>(null);
  const chartId = useId();

  const {
    points,
    currentTier,
    currentRank,
    currentLp,
    netDeltaLp,
    peakTier,
    peakRank,
    peakLp,
    longestWinStreak,
  } = lpHistory;

  if (!points || points.length < 2) {
    return null;
  }

  // Active theme based on player's current rank tier
  const activeTheme =
    RANK_THEMES[currentTier?.toUpperCase()] || RANK_THEMES.PLATINUM;

  // Chart Dimensions
  const svgWidth = 310;
  const svgHeight = 100;
  const padLeft = 28; // space for tier emblems on left Y-axis
  const padRight = 10;
  const padTop = 15;
  const padBottom = 15;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const minLp = Math.min(...points.map((p) => p.totalLp));
  const maxLp = Math.max(...points.map((p) => p.totalLp));
  const lpRange = Math.max(maxLp - minLp, 60);

  const getX = (index: number) => {
    if (points.length <= 1) return padLeft + chartW / 2;
    return padLeft + (index / (points.length - 1)) * chartW;
  };

  const getY = (totalLp: number) => {
    if (lpRange === 0) return padTop + chartH / 2;
    return padTop + chartH - ((totalLp - minLp) / lpRange) * chartH;
  };

  const lineCoords = points.map((p, i) => `${getX(i).toFixed(1)},${getY(p.totalLp).toFixed(1)}`);
  const linePathD = `M ${lineCoords.join(' L ')}`;
  const areaD = `M ${getX(0)},${padTop + chartH} L ${lineCoords.join(' L ')} L ${getX(points.length - 1)},${padTop + chartH} Z`;

  // Unique Tiers present in the history points to show on left Y-axis
  const uniqueTiers = Array.from(new Set(points.map((p) => p.tier?.toUpperCase()))).filter(Boolean);
  if (uniqueTiers.length === 0 && currentTier) {
    uniqueTiers.push(currentTier.toUpperCase());
  }

  // Find approximate Y position for each tier emblem
  const tierYPositions = uniqueTiers.map((tier) => {
    const tierPoints = points.filter((p) => p.tier?.toUpperCase() === tier);
    const avgTotalLp =
      tierPoints.length > 0
        ? tierPoints.reduce((acc, p) => acc + p.totalLp, 0) / tierPoints.length
        : (minLp + maxLp) / 2;
    return {
      tier,
      y: getY(avgTotalLp),
    };
  });

  const isNetPositive = netDeltaLp >= 0;

  return (
    <div className="flex flex-col pt-3 border-t border-white/[0.06]">
      {/* Top Header: Games count + Net Delta with rank badge */}
      <div className="flex items-center justify-between text-[11px] mb-2 px-1">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
            {t('summoner.lastGames', { count: points.length })}
          </span>
          <span className={`text-[10px] font-bold ${activeTheme.text}`}>
            • {currentTier} {currentRank}
          </span>
        </div>

        <div
          className={`flex items-center gap-0.5 font-bold text-xs ${
            isNetPositive ? 'text-emerald-400' : 'text-rose-400'
          }`}
        >
          {isNetPositive ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          <span>
            {isNetPositive ? '+' : ''}
            {netDeltaLp} LP
          </span>
        </div>
      </div>

      {/* SVG Wave Chart with Rank Emblems on Left & Rank Colored Stroke/Gradient */}
      <div className="relative w-full overflow-hidden rounded-lg bg-black/40 border border-white/[0.03]">
        {/* Tier Emblems on the Left Y-Axis */}
        <div className="absolute left-1 top-0 bottom-0 flex flex-col justify-around py-1 pointer-events-none z-10">
          {tierYPositions.map((item, idx) => (
            <div
              key={idx}
              className="relative h-4 w-4 shrink-0 opacity-80"
              title={item.tier}
            >
              <Image
                src={getRankEmblemUrl(item.tier)}
                alt={item.tier}
                width={16}
                height={16}
                className="object-contain"
                unoptimized
              />
            </div>
          ))}
        </div>

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block select-none cursor-pointer"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            {/* Dynamic Rank Color Area Gradient */}
            <linearGradient id={`${chartId}-rankGrad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeTheme.stopColor} stopOpacity="0.45" />
              <stop offset="100%" stopColor={activeTheme.stopColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Reference Lines */}
          <line
            x1={padLeft}
            y1={padTop}
            x2={svgWidth - padRight}
            y2={padTop}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1={padLeft}
            y1={padTop + chartH / 2}
            x2={svgWidth - padRight}
            y2={padTop + chartH / 2}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <line
            x1={padLeft}
            y1={padTop + chartH}
            x2={svgWidth - padRight}
            y2={padTop + chartH}
            stroke="rgba(255, 255, 255, 0.05)"
            strokeWidth="1"
          />

          {/* Rank Colored Area Fill */}
          <path d={areaD} fill={`url(#${chartId}-rankGrad)`} />

          {/* Rank Colored Curve Line */}
          <path
            d={linePathD}
            fill="none"
            stroke={activeTheme.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Interactive Data Points */}
          {points.map((pt, i) => {
            const cx = getX(i);
            const cy = getY(pt.totalLp);
            const isHovered = hoveredPoint === pt;
            const ptTheme = RANK_THEMES[pt.tier?.toUpperCase()] || activeTheme;

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={isHovered ? 5 : 2.5}
                fill={isHovered ? '#ffffff' : ptTheme.stroke}
                stroke="#0b0e11"
                strokeWidth={isHovered ? 2 : 1}
                className="transition-all"
                onMouseEnter={() => setHoveredPoint(pt)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip with Official Rank Emblem */}
        {hoveredPoint && (
          <div className="absolute top-1 left-7 rounded-lg bg-black/95 border border-white/20 px-2.5 py-1 text-[10px] text-white shadow-xl pointer-events-none z-20 flex items-center gap-2">
            <div className="relative h-4 w-4 shrink-0">
              <Image
                src={getRankEmblemUrl(hoveredPoint.tier)}
                alt={hoveredPoint.tier}
                width={16}
                height={16}
                className="object-contain"
                unoptimized
              />
            </div>
            <span className="font-bold text-white">
              {hoveredPoint.tier} {hoveredPoint.rank} · {hoveredPoint.leaguePoints} LP
            </span>
            {hoveredPoint.delta !== 0 && (
              <span
                className={`font-black ${
                  hoveredPoint.delta > 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                ({hoveredPoint.delta > 0 ? '+' : ''}
                {hoveredPoint.delta})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom Peak & Streak Stats */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-white/[0.04] text-[10px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <div className="relative h-3.5 w-3.5 shrink-0 opacity-80">
            <Image
              src={getRankEmblemUrl(peakTier)}
              alt={peakTier}
              width={14}
              height={14}
              className="object-contain"
              unoptimized
            />
          </div>
          <span className="font-semibold text-zinc-500 uppercase tracking-wide">{t('summoner.peakRank')}:</span>
          <span className="font-bold text-zinc-200">
            {peakTier} {peakRank} · {peakLp} LP
          </span>
        </div>

        {longestWinStreak > 1 && (
          <div className="flex items-center gap-1">
            <span className="font-semibold text-zinc-500 uppercase tracking-wide">{t('summoner.winStreak')}:</span>
            <span className="font-bold text-emerald-400">{longestWinStreak}W {t('summoner.longestStreak')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
