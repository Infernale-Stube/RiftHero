'use client';

import React, { useState, useId } from 'react';
import { Coins, TrendingUp } from 'lucide-react';

export interface GoldTimelinePoint {
  minute: number;
  blueGold: number;
  redGold: number;
  diff: number; // positive = blue lead, negative = red lead
}

interface GoldAdvantageChartProps {
  timeline: GoldTimelinePoint[];
  blueWon?: boolean;
}

export default function GoldAdvantageChart({
  timeline,
  blueWon = true,
}: GoldAdvantageChartProps) {
  const [hoveredPoint, setHoveredPoint] = useState<GoldTimelinePoint | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const chartId = useId();

  if (!timeline || timeline.length < 2) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-black/50 p-6 text-center text-xs text-slate-500">
        Keine Timeline-Daten für dieses Match verfügbar.
      </div>
    );
  }

  // Dimensions
  const svgWidth = 900;
  const svgHeight = 220;
  const padLeft = 55;
  const padRight = 25;
  const padTop = 25;
  const padBottom = 30;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;
  const zeroY = padTop + chartH / 2;

  const maxMinute = Math.max(...timeline.map((p) => p.minute), 1);
  const rawMaxDiff = Math.max(...timeline.map((p) => Math.abs(p.diff)), 1000);
  // Round up maxDiff to nearest 1000 with 15% headroom
  const maxDiff = Math.max(Math.ceil((rawMaxDiff * 1.15) / 1000) * 1000, 2000);

  // Coordinate functions
  const getX = (min: number) => padLeft + (min / maxMinute) * chartW;
  const getY = (diff: number) => zeroY - (diff / maxDiff) * (chartH / 2);

  // Find max blue & red leads
  let maxBlueLead = 0;
  let maxBlueMin = 0;
  let maxRedLead = 0;
  let maxRedMin = 0;

  timeline.forEach((pt) => {
    if (pt.diff > maxBlueLead) {
      maxBlueLead = pt.diff;
      maxBlueMin = pt.minute;
    }
    if (pt.diff < maxRedLead) {
      maxRedLead = pt.diff;
      maxRedMin = pt.minute;
    }
  });

  const finalPoint = timeline[timeline.length - 1];

  // Build SVG path strings
  // 1. Line path across all points
  const linePoints = timeline.map((pt) => `${getX(pt.minute).toFixed(1)},${getY(pt.diff).toFixed(1)}`);
  const linePathD = `M ${linePoints.join(' L ')}`;

  // 2. Area paths clamped to zeroY
  // Blue area: above zeroY (diff > 0 -> y < zeroY)
  const blueAreaPoints = timeline.map((pt) => {
    const x = getX(pt.minute).toFixed(1);
    const y = getY(Math.max(0, pt.diff)).toFixed(1);
    return `${x},${y}`;
  });
  const blueAreaD = `M ${getX(0)},${zeroY} L ${blueAreaPoints.join(' L ')} L ${getX(maxMinute)},${zeroY} Z`;

  // Red area: below zeroY (diff < 0 -> y > zeroY)
  const redAreaPoints = timeline.map((pt) => {
    const x = getX(pt.minute).toFixed(1);
    const y = getY(Math.min(0, pt.diff)).toFixed(1);
    return `${x},${y}`;
  });
  const redAreaD = `M ${getX(0)},${zeroY} L ${redAreaPoints.join(' L ')} L ${getX(maxMinute)},${zeroY} Z`;

  // Grid steps (e.g. +maxDiff, +maxDiff/2, 0, -maxDiff/2, -maxDiff)
  const gridSteps = [
    { value: maxDiff, label: `+${(maxDiff / 1000).toFixed(0)}k`, color: 'text-blue-400' },
    { value: Math.round(maxDiff / 2), label: `+${(maxDiff / 2000).toFixed(1)}k`, color: 'text-blue-400/70' },
    { value: 0, label: '0k', color: 'text-slate-400' },
    { value: -Math.round(maxDiff / 2), label: `-${(maxDiff / 2000).toFixed(1)}k`, color: 'text-rose-400/70' },
    { value: -maxDiff, label: `-${(maxDiff / 1000).toFixed(0)}k`, color: 'text-rose-400' },
  ];

  // Time ticks on X-axis (every 5 minutes)
  const timeTicks: number[] = [];
  for (let m = 0; m <= maxMinute; m += 5) {
    timeTicks.push(m);
  }
  if (!timeTicks.includes(maxMinute) && maxMinute - timeTicks[timeTicks.length - 1] >= 2) {
    timeTicks.push(maxMinute);
  }

  // Mouse move handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - (padLeft / svgWidth) * rect.width) / ((chartW / svgWidth) * rect.width)));
    const targetMin = Math.round(ratio * maxMinute);

    // Find closest timeline point
    let closest = timeline[0];
    let minDistance = Math.abs(timeline[0].minute - targetMin);

    for (let i = 1; i < timeline.length; i++) {
      const dist = Math.abs(timeline[i].minute - targetMin);
      if (dist < minDistance) {
        minDistance = dist;
        closest = timeline[i];
      }
    }

    setHoveredPoint(closest);
    setHoverX(getX(closest.minute));
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
    setHoverX(null);
  };

  const activePoint = hoveredPoint || finalPoint;
  const isBlueLead = activePoint.diff >= 0;

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-black/50 p-6 shadow-xl backdrop-blur-md">
      {/* Chart Top Header & Quick Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Coins className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
              <span>Gold-Vorteil Graph (Timeline)</span>
              <span className="text-[10px] rounded bg-white/[0.08] px-2 py-0.5 font-bold uppercase text-slate-300">
                Minutenverlauf
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Netto-Golddifferenz zwischen Blauem und Rotem Team im Spielverlauf
            </p>
          </div>
        </div>

        {/* Lead Stats Badges */}
        <div className="flex items-center gap-3 text-xs">
          {maxBlueLead > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-blue-950/40 border border-blue-500/30 px-2.5 py-1 text-blue-300">
              <span className="text-[10px] uppercase font-bold text-slate-400">Max Blau:</span>
              <span className="font-black text-blue-400">+{(maxBlueLead / 1000).toFixed(1)}k</span>
              <span className="text-[10px] text-slate-400">({maxBlueMin}m)</span>
            </div>
          )}
          {Math.abs(maxRedLead) > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 px-2.5 py-1 text-rose-300">
              <span className="text-[10px] uppercase font-bold text-slate-400">Max Rot:</span>
              <span className="font-black text-rose-400">+{(Math.abs(maxRedLead) / 1000).toFixed(1)}k</span>
              <span className="text-[10px] text-slate-400">({maxRedMin}m)</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating Interactive Metric Card */}
      <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">Minute {activePoint.minute}:00</span>
          <span className="text-slate-500">•</span>
          <span
            className={`font-black ${
              isBlueLead ? 'text-blue-400' : 'text-rose-400'
            }`}
          >
            {isBlueLead ? '+' : ''}
            {(activePoint.diff / 1000).toFixed(2)}k Gold{' '}
            {activePoint.diff === 0 ? '(Gleichstand)' : isBlueLead ? '(Blau führt)' : '(Rot führt)'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] font-semibold">
          <span className="text-blue-300">
            Blau:{' '}
            <strong className="text-white">
              {(activePoint.blueGold / 1000).toFixed(1)}k
            </strong>
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-rose-300">
            Rot:{' '}
            <strong className="text-white">
              {(activePoint.redGold / 1000).toFixed(1)}k
            </strong>
          </span>
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div className="relative w-full overflow-hidden rounded-xl bg-black/60 border border-white/[0.04]">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto block select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Blue Shaded Area Gradient */}
            <linearGradient id={`${chartId}-blueGrad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>

            {/* Red Shaded Area Gradient */}
            <linearGradient id={`${chartId}-redGrad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.0" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.5" />
            </linearGradient>

            {/* Line Gradient */}
            <linearGradient id={`${chartId}-lineGrad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#e2e8f0" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid Lines & Y-Axis Labels */}
          {gridSteps.map((step, idx) => {
            const y = getY(step.value);
            const isZero = step.value === 0;

            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke={isZero ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.06)'}
                  strokeWidth={isZero ? 1.5 : 1}
                  strokeDasharray={isZero ? undefined : '4 4'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  className="fill-slate-500 text-[10px] font-mono font-bold select-none"
                >
                  {step.label}
                </text>
              </g>
            );
          })}

          {/* X-Axis Time Ticks */}
          {timeTicks.map((tick, idx) => {
            const x = getX(tick);
            return (
              <g key={idx}>
                <line
                  x1={x}
                  y1={svgHeight - padBottom}
                  x2={x}
                  y2={svgHeight - padBottom + 4}
                  stroke="rgba(255, 255, 255, 0.2)"
                  strokeWidth={1}
                />
                <text
                  x={x}
                  y={svgHeight - padBottom + 16}
                  textAnchor="middle"
                  className="fill-slate-400 text-[10px] font-mono font-medium select-none"
                >
                  {tick}m
                </text>
              </g>
            );
          })}

          {/* Blue Advantage Filled Area */}
          <path d={blueAreaD} fill={`url(#${chartId}-blueGrad)`} />

          {/* Red Advantage Filled Area */}
          <path d={redAreaD} fill={`url(#${chartId}-redGrad)`} />

          {/* Differential Trend Curve Line */}
          <path
            d={linePathD}
            fill="none"
            stroke={`url(#${chartId}-lineGrad)`}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points (subtle circles) */}
          {timeline.map((pt, idx) => {
            const x = getX(pt.minute);
            const y = getY(pt.diff);
            const isBlue = pt.diff >= 0;
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="2.5"
                fill={isBlue ? '#38bdf8' : '#f43f5e'}
                stroke="#0f172a"
                strokeWidth="1"
              />
            );
          })}

          {/* Active Hover Crosshair & Indicator Point */}
          {hoverX !== null && hoveredPoint && (
            <g>
              {/* Vertical Crosshair Line */}
              <line
                x1={hoverX}
                y1={padTop}
                x2={hoverX}
                y2={svgHeight - padBottom}
                stroke="#fbbf24"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Glowing Indicator Circle */}
              <circle
                cx={hoverX}
                cy={getY(hoveredPoint.diff)}
                r="6"
                fill={hoveredPoint.diff >= 0 ? '#38bdf8' : '#f43f5e'}
                stroke="#ffffff"
                strokeWidth="2.5"
              />
            </g>
          )}
        </svg>
      </div>

      {/* Chart Legend */}
      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 px-1">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-sm shadow-blue-400/50" />
            <span>Blauer Vorteil (über der Mittellinie)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50" />
            <span>Roter Vorteil (unter der Mittellinie)</span>
          </div>
        </div>
        <span className="text-slate-500 text-[10px]">
          Bewege die Maus über die Grafik für Details
        </span>
      </div>
    </div>
  );
}
