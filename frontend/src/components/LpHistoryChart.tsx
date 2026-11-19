'use client';

import React, { useState, useId } from 'react';
import Image from 'next/image';
import { TrendingUp, ArrowUpRight, ArrowDownRight, Award, Zap } from 'lucide-react';
import { LpHistorySummary, LpPoint } from '@/types';
import { getRankEmblemUrl } from './RankBadge';

interface LpHistoryChartProps {
  lpHistory: LpHistorySummary;
}

export default function LpHistoryChart({ lpHistory }: LpHistoryChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<LpPoint | null>(null);
  const chartId = useId();

  const {
    points,
    netDeltaLp,
    peakTier,
    peakRank,
    peakLp,
    longestWinStreak,
  } = lpHistory;

  if (!points || points.length === 0) {
    return null;
  }

  // Dimensions
  const svgWidth = 300;
  const svgHeight = 90;
  const padLeft = 12;
  const padRight = 12;
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

  const isNetPositive = netDeltaLp >= 0;

  return (
    <div className="flex flex-col pt-3 border-t border-white/[0.06]">
      {/* Top Label & Net Delta */}
      <div className="flex items-center justify-between text-[11px] mb-2 px-1">
        <span className="font-bold text-zinc-400 uppercase tracking-wider text-[10px]">
          Last {points.length} Games
        </span>
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

      {/* SVG Wave Chart */}
      <div className="relative w-full overflow-hidden rounded-lg bg-black/40 border border-white/[0.03]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block select-none cursor-pointer"
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id={`${chartId}-lpGrad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Area Fill */}
          <path d={areaD} fill={`url(#${chartId}-lpGrad)`} />

          {/* Line */}
          <path
            d={linePathD}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points */}
          {points.map((pt, i) => {
            const cx = getX(i);
            const cy = getY(pt.totalLp);
            const isHovered = hoveredPoint === pt;

            return (
              <circle
                key={i}
                cx={cx}
                cy={cy}
                r={isHovered ? 4.5 : 2}
                fill={isHovered ? '#ffffff' : '#38bdf8'}
                stroke="#0b0e11"
                strokeWidth={isHovered ? 2 : 1}
                className="transition-all"
                onMouseEnter={() => setHoveredPoint(pt)}
              />
            );
          })}
        </svg>

        {/* Hover Tooltip Overlay */}
        {hoveredPoint && (
          <div className="absolute top-1 left-2 rounded bg-black/90 border border-white/20 px-2 py-1 text-[10px] text-white shadow-lg pointer-events-none z-10 flex items-center gap-1.5">
            <span className="font-bold text-sky-400">
              {hoveredPoint.tier} {hoveredPoint.rank}
            </span>
            <span className="text-zinc-300">{hoveredPoint.leaguePoints} LP</span>
            {hoveredPoint.delta !== 0 && (
              <span
                className={`font-semibold ${
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
        <div className="flex items-center gap-1">
          <span className="font-semibold text-zinc-500 uppercase tracking-wide">Peak:</span>
          <span className="font-bold text-zinc-200">
            {peakTier} {peakRank} · {peakLp} LP
          </span>
        </div>

        {longestWinStreak > 1 && (
          <div className="flex items-center gap-1">
            <span className="font-semibold text-zinc-500 uppercase tracking-wide">Longest:</span>
            <span className="font-bold text-emerald-400">{longestWinStreak}W</span>
          </div>
        )}
      </div>
    </div>
  );
}
