'use client';

import React, { useState, useId } from 'react';
import Image from 'next/image';
import { Sparkles, Trophy, Award, Users, TrendingUp, ChevronRight } from 'lucide-react';
import { ScoreTimelinePoint, MatchParticipant } from '@/types';
import { getChampionIconUrl, getPositionIconUrl, getParticipantPosition } from '@/lib/ddragon';
import { useTranslation } from '@/i18n/LanguageContext';

interface ScoreTimelineChartProps {
  scoreTimeline?: ScoreTimelinePoint[];
  participants: MatchParticipant[];
  blueWon?: boolean;
}

// Distinct vibrant line colors for players
const PLAYER_COLORS = [
  '#38bdf8', // Blue 1 (Sky)
  '#60a5fa', // Blue 2 (Blue)
  '#818cf8', // Blue 3 (Indigo)
  '#34d399', // Blue 4 (Emerald)
  '#2dd4bf', // Blue 5 (Teal)
  '#f43f5e', // Red 1 (Rose)
  '#fb7185', // Red 2 (Pink)
  '#f97316', // Red 3 (Orange)
  '#eab308', // Red 4 (Amber)
  '#a855f7', // Red 5 (Purple)
];

export default function ScoreTimelineChart({
  scoreTimeline,
  participants,
  blueWon = true,
}: ScoreTimelineChartProps) {
  const { t, locale } = useTranslation();
  const [viewMode, setViewMode] = useState<'team' | 'players'>('team');
  const [hoveredPoint, setHoveredPoint] = useState<ScoreTimelinePoint | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const chartId = useId();

  // Find MVP & ACE
  const mvpParticipant = participants.find((p) => p.score?.isMvp);
  const aceParticipant = participants.find((p) => p.score?.isAce);

  // Active players state for "players" view (default to MVP and ACE, or first 2)
  const defaultSelectedPuuids = new Set<string>();
  if (mvpParticipant) defaultSelectedPuuids.add(mvpParticipant.puuid);
  if (aceParticipant) defaultSelectedPuuids.add(aceParticipant.puuid);
  if (defaultSelectedPuuids.size === 0 && participants.length > 0) {
    defaultSelectedPuuids.add(participants[0].puuid);
    if (participants[1]) defaultSelectedPuuids.add(participants[1].puuid);
  }

  const [selectedPuuids, setSelectedPuuids] = useState<Set<string>>(defaultSelectedPuuids);

  if (!scoreTimeline || scoreTimeline.length < 2) {
    return null;
  }

  // Dimensions
  const svgWidth = 900;
  const svgHeight = 260;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 35;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const maxMinute = Math.max(...scoreTimeline.map((p) => p.minute), 1);
  const finalPoint = scoreTimeline[scoreTimeline.length - 1];

  // Min and max score bounds (0 to 100 system, plotted between 20 and 100)
  const toScore100 = (val?: number | null): number => {
    if (val === undefined || val === null || isNaN(val)) return 50;
    return Math.round(val <= 10 ? val * 10 : val);
  };

  const minScore = 20;
  const maxScore = 100;
  const scoreRange = maxScore - minScore;

  const getX = (min: number) => padLeft + (min / maxMinute) * chartW;
  const getY = (scoreVal: number) =>
    padTop + chartH - ((Math.min(100, Math.max(minScore, toScore100(scoreVal))) - minScore) / scoreRange) * chartH;

  // Toggle player selection
  const togglePlayer = (puuid: string) => {
    setSelectedPuuids((prev) => {
      const next = new Set(prev);
      if (next.has(puuid)) {
        if (next.size > 1) next.delete(puuid);
      } else {
        next.add(puuid);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedPuuids(new Set(participants.map((p) => p.puuid)));
  };

  const selectMvpAce = () => {
    const s = new Set<string>();
    if (mvpParticipant) s.add(mvpParticipant.puuid);
    if (aceParticipant) s.add(aceParticipant.puuid);
    setSelectedPuuids(s);
  };

  // Mouse hover interaction
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, (clientX - (padLeft / svgWidth) * rect.width) / ((chartW / svgWidth) * rect.width)));
    const targetMin = Math.round(ratio * maxMinute);

    let closest = scoreTimeline[0];
    let minDistance = Math.abs(scoreTimeline[0].minute - targetMin);

    for (let i = 1; i < scoreTimeline.length; i++) {
      const dist = Math.abs(scoreTimeline[i].minute - targetMin);
      if (dist < minDistance) {
        minDistance = dist;
        closest = scoreTimeline[i];
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

  // Grid steps (scores 100, 80, 60, 40, 20)
  const gridScores = [100, 80, 60, 40, 20];

  // Time ticks (every 5 minutes)
  const timeTicks: number[] = [];
  for (let m = 0; m <= maxMinute; m += 5) {
    timeTicks.push(m);
  }
  if (!timeTicks.includes(maxMinute) && maxMinute - timeTicks[timeTicks.length - 1] >= 2) {
    timeTicks.push(maxMinute);
  }

  // Paths for Team View
  const blueLinePoints = scoreTimeline.map((pt) => `${getX(pt.minute).toFixed(1)},${getY(pt.blueScore).toFixed(1)}`);
  const blueLineD = `M ${blueLinePoints.join(' L ')}`;

  const redLinePoints = scoreTimeline.map((pt) => `${getX(pt.minute).toFixed(1)},${getY(pt.redScore).toFixed(1)}`);
  const redLineD = `M ${redLinePoints.join(' L ')}`;

  const blueAreaD = `M ${getX(0)},${getY(minScore)} L ${blueLinePoints.join(' L ')} L ${getX(maxMinute)},${getY(minScore)} Z`;
  const redAreaD = `M ${getX(0)},${getY(minScore)} L ${redLinePoints.join(' L ')} L ${getX(maxMinute)},${getY(minScore)} Z`;

  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-black/50 p-6 shadow-2xl backdrop-blur-md">
      {/* Chart Top Header & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 via-orange-500/20 to-purple-500/20 border border-amber-500/30">
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black tracking-tight text-white">
                {locale === 'de' ? 'Hero Score Verlauf' : 'Hero Score Progression'}
              </h3>
              <span className="rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black text-amber-300">
                HERO SCORE
              </span>
            </div>
            <p className="text-xs text-zinc-400">
              {locale === 'de'
                ? 'Minütliche Hero Score-Berechnung über das gesamte Spiel hinweg basierend auf Combat, Farming, KDA & Objectives'
                : 'Hero Score tracked across the entire game based on combat, farming, KDA & objectives'}
            </p>
          </div>
        </div>

        {/* View Mode Toggle: Team Momentum vs Players */}
        <div className="flex items-center rounded-xl bg-white/[0.04] p-1 border border-white/[0.06] shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('team')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'team'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{locale === 'de' ? 'Team Hero Score' : 'Team Hero Score'}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('players')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'players'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>{locale === 'de' ? 'Spieler Hero Scores' : 'Player Hero Scores'}</span>
          </button>
        </div>
      </div>

      {/* Quick Metrics Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap bg-white/[0.02] rounded-xl p-3 mb-4 border border-white/[0.04] text-xs">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-400 shadow-sm" />
            <span className="text-zinc-400">{locale === 'de' ? 'Blaues Team' : 'Blue Team'}:</span>
            <span className="font-black text-blue-400">{toScore100(activePoint.blueScore)}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-sm" />
            <span className="text-zinc-400">{locale === 'de' ? 'Rotes Team' : 'Red Team'}:</span>
            <span className="font-black text-rose-400">{toScore100(activePoint.redScore)}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-zinc-500 font-medium">{locale === 'de' ? 'Vorteil' : 'Advantage'}:</span>
            {(() => {
              const diff100 = toScore100(activePoint.blueScore) - toScore100(activePoint.redScore);
              return (
                <span
                  className={`font-black ${
                    diff100 > 0
                      ? 'text-blue-400'
                      : diff100 < 0
                      ? 'text-rose-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {diff100 > 0 ? `+${diff100} Blau` : diff100 < 0 ? `+${Math.abs(diff100)} Rot` : 'Ausgeglichen'}
                </span>
              );
            })()}
          </div>
        </div>

        {/* MVP / ACE Highlights */}
        <div className="flex items-center gap-3">
          {mvpParticipant && (
            <div className="flex items-center gap-1.5 rounded-md bg-amber-500/10 border border-amber-500/30 px-2 py-0.5">
              <Trophy className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] font-black text-amber-300">MVP</span>
              <span className="text-[11px] font-bold text-white">{mvpParticipant.riotIdGameName}</span>
              <span className="text-[10px] font-black text-amber-400">({toScore100(mvpParticipant.score?.score)})</span>
            </div>
          )}
          {aceParticipant && (
            <div className="flex items-center gap-1.5 rounded-md bg-purple-500/10 border border-purple-500/30 px-2 py-0.5">
              <Award className="h-3.5 w-3.5 text-purple-400" />
              <span className="text-[10px] font-black text-purple-300">ACE</span>
              <span className="text-[11px] font-bold text-white">{aceParticipant.riotIdGameName}</span>
              <span className="text-[10px] font-black text-purple-400">({toScore100(aceParticipant.score?.score)})</span>
            </div>
          )}
        </div>
      </div>

      {/* Player Selector Bar (Shown in Player View) */}
      {viewMode === 'players' && (
        <div className="mb-4 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span>{locale === 'de' ? 'Klicke auf Spieler, um Kurven ein-/auszublenden:' : 'Click players to toggle curves on the graph:'}</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={selectMvpAce}
                className="text-[10px] font-bold text-amber-400 hover:underline"
              >
                MVP & ACE
              </button>
              <span className="text-zinc-600">•</span>
              <button
                type="button"
                onClick={selectAll}
                className="text-[10px] font-bold text-sky-400 hover:underline"
              >
                {locale === 'de' ? 'Alle anzeigen' : 'Select All'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {participants.map((p, idx) => {
              const isSelected = selectedPuuids.has(p.puuid);
              const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
              const pos = getParticipantPosition(p);

              return (
                <button
                  key={p.puuid}
                  type="button"
                  onClick={() => togglePlayer(p.puuid)}
                  className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-all ${
                    isSelected
                      ? 'border-white/30 bg-white/[0.08] text-white shadow'
                      : 'border-white/[0.05] bg-black/40 text-zinc-500 opacity-60 hover:opacity-90'
                  }`}
                  style={{
                    borderLeftColor: isSelected ? color : undefined,
                    borderLeftWidth: isSelected ? '3px' : undefined,
                  }}
                >
                  <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full border border-white/10">
                    <Image
                      src={getChampionIconUrl(p.championName)}
                      alt={p.championName}
                      width={16}
                      height={16}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                  <span className="font-bold truncate max-w-[80px]">{p.riotIdGameName}</span>
                  {p.score && (
                    <span
                      className={`text-[10px] font-black rounded px-1 py-0.2 ${
                        p.score.isMvp
                          ? 'bg-amber-500/20 text-amber-300'
                          : p.score.isAce
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'text-zinc-400'
                      }`}
                    >
                      {toScore100(p.score.score)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Main SVG Graph */}
      <div className="relative w-full overflow-hidden select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={`blue-score-grad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id={`red-score-grad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines for Scores (100, 80, 60, 40, 20) */}
          {gridScores.map((scoreVal) => {
            const y = getY(scoreVal);
            const isMid = scoreVal === 60;

            return (
              <g key={scoreVal}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke={isMid ? 'rgba(255, 255, 255, 0.16)' : 'rgba(255, 255, 255, 0.05)'}
                  strokeDasharray={isMid ? undefined : '3 3'}
                  strokeWidth={isMid ? '1.5' : '1'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fill={isMid ? 'rgba(255, 255, 255, 0.85)' : 'rgba(161, 161, 170, 0.7)'}
                  fontSize="10"
                  fontWeight={isMid ? 'bold' : 'normal'}
                >
                  {scoreVal}
                </text>
              </g>
            );
          })}

          {/* Vertical Grid Lines & X-Axis Time Labels */}
          {timeTicks.map((min) => {
            const x = getX(min);

            return (
              <g key={min}>
                <line
                  x1={x}
                  y1={padTop}
                  x2={x}
                  y2={padTop + chartH}
                  stroke="rgba(255, 255, 255, 0.04)"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={padTop + chartH + 18}
                  textAnchor="middle"
                  fill="rgba(161, 161, 170, 0.6)"
                  fontSize="10"
                  fontWeight="bold"
                >
                  {min}m
                </text>
              </g>
            );
          })}

          {/* Team Flow Mode */}
          {viewMode === 'team' && (
            <>
              {/* Blue Area & Line */}
              <path d={blueAreaD} fill={`url(#blue-score-grad-${chartId})`} />
              <path d={blueLineD} fill="none" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

              {/* Red Area & Line */}
              <path d={redAreaD} fill={`url(#red-score-grad-${chartId})`} />
              <path d={redLineD} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </>
          )}

          {/* Player Curves Mode */}
          {viewMode === 'players' && (
            <>
              {participants.map((p, idx) => {
                if (!selectedPuuids.has(p.puuid)) return null;
                const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];

                const points = scoreTimeline.map((pt) => {
                  const scoreVal = pt.playerScores[p.puuid] ?? 5.5;
                  return `${getX(pt.minute).toFixed(1)},${getY(scoreVal).toFixed(1)}`;
                });
                const d = `M ${points.join(' L ')}`;

                return (
                  <path
                    key={p.puuid}
                    d={d}
                    fill="none"
                    stroke={color}
                    strokeWidth={p.score?.isMvp || p.score?.isAce ? '3' : '2'}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.9"
                  />
                );
              })}
            </>
          )}

          {/* Crosshair on Hover */}
          {hoverX !== null && (
            <g>
              <line
                x1={hoverX}
                y1={padTop}
                x2={hoverX}
                y2={padTop + chartH}
                stroke="rgba(251, 191, 36, 0.7)"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              {/* Indicator Dot on Blue / Red or Selected Players */}
              {viewMode === 'team' && hoveredPoint && (
                <>
                  <circle
                    cx={hoverX}
                    cy={getY(hoveredPoint.blueScore)}
                    r="4"
                    fill="#38bdf8"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={hoverX}
                    cy={getY(hoveredPoint.redScore)}
                    r="4"
                    fill="#f43f5e"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </g>
          )}
        </svg>

        {/* Hover Tooltip Box */}
        {hoverX !== null && hoveredPoint && (
          <div
            className="pointer-events-none absolute z-20 rounded-xl border border-white/20 bg-black/90 p-3 shadow-2xl backdrop-blur-md transition-all text-xs"
            style={{
              left: `${Math.min(svgWidth - 200, Math.max(10, hoverX - 80))}px`,
              top: '10px',
            }}
          >
            <div className="font-bold text-amber-300 border-b border-white/10 pb-1 mb-1.5 flex items-center justify-between gap-3">
              <span>{locale === 'de' ? `Minute ${hoveredPoint.minute}` : `Minute ${hoveredPoint.minute}:00`}</span>
              <span className="text-[10px] text-zinc-400">
                {toScore100(hoveredPoint.blueScore) > toScore100(hoveredPoint.redScore)
                  ? '+ Blau'
                  : toScore100(hoveredPoint.blueScore) < toScore100(hoveredPoint.redScore)
                  ? '+ Rot'
                  : '='}
              </span>
            </div>

            {viewMode === 'team' ? (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-4 text-blue-300">
                  <span className="font-semibold">{locale === 'de' ? 'Blaues Team' : 'Blue Team'}:</span>
                  <span className="font-black">{toScore100(hoveredPoint.blueScore)}</span>
                </div>
                <div className="flex items-center justify-between gap-4 text-rose-300">
                  <span className="font-semibold">{locale === 'de' ? 'Rotes Team' : 'Red Team'}:</span>
                  <span className="font-black">{toScore100(hoveredPoint.redScore)}</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1 max-h-[140px] overflow-y-auto pr-1">
                {participants
                  .filter((p) => selectedPuuids.has(p.puuid))
                  .map((p, idx) => {
                    const sc = hoveredPoint.playerScores[p.puuid] ?? 50;
                    const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];

                    return (
                      <div key={p.puuid} className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                          <span className="text-zinc-300 truncate max-w-[85px]">{p.riotIdGameName}</span>
                        </div>
                        <span className="font-black text-white">{toScore100(sc)}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
