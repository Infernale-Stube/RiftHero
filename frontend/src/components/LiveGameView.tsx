'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Radio, RefreshCw, Shield, Swords, Ban } from 'lucide-react';
import { LiveGameResponse, LiveGameParticipant } from '@/types';
import {
  getChampionIconUrl,
  getSpellIconUrl,
  getRuneIconUrl,
  getStyleIconUrl,
} from '@/lib/ddragon';
import RankBadge from './RankBadge';
import { getWinrateColor } from '@/lib/utils';

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
  // Live Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!liveData?.inGame || !liveData.game) return;

    const startTime = liveData.game.gameStartTime;
    const initialElapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
    setElapsedSeconds(initialElapsed);

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [liveData]);

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 p-12 text-center">
        <RefreshCw className="h-8 w-8 animate-spin text-hextech-blue mb-3" />
        <h3 className="text-sm font-bold text-slate-200">Spectator-Status wird abgefragt...</h3>
        <p className="text-xs text-slate-500 mt-1">Riot Games Spectator v5 Überprüfung</p>
      </div>
    );
  }

  if (!liveData || !liveData.inGame || !liveData.game) {
    return (
      <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-black/40 p-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/[0.04] border border-white/[0.08] text-slate-500 mb-4">
          <Radio className="h-7 w-7" />
        </div>
        <h3 className="text-base font-bold text-white mb-1.5">
          Kein aktives Live-Spiel
        </h3>
        <p className="text-xs text-slate-400 max-w-md mb-6">
          <span className="text-amber-400 font-bold">{gameName}#{tagLine}</span> befindet sich aktuell in keinem laufenden League-of-Legends-Match.
        </p>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 rounded-xl border border-hextech-blue/40 bg-hextech-blue/10 px-5 py-2.5 text-xs font-bold text-hextech-blue hover:bg-hextech-blue/20 transition-all shadow-md active:scale-95"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Status erneut prüfen</span>
        </button>
      </div>
    );
  }

  const { game } = liveData;

  const renderRoster = (team: LiveGameParticipant[], isBlue: boolean) => (
    <div className="flex flex-col rounded-xl border border-white/[0.08] bg-black/50 overflow-hidden shadow-lg">
      <div
        className={`flex items-center justify-between px-4 py-3 border-b ${
          isBlue
            ? 'bg-blue-950/40 border-blue-900/40 text-blue-300'
            : 'bg-rose-950/40 border-rose-900/40 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-2 font-black uppercase tracking-wider text-xs">
          <span>{isBlue ? 'Blaues Team' : 'Rotes Team'}</span>
        </div>
      </div>

      <div className="divide-y divide-white/[0.04]">
        {team.map((p) => {
          const isTarget = p.riotId.toLowerCase().includes(gameName.toLowerCase());
          const targetTag = region.toUpperCase();
          const cleanName = p.riotId.includes('#') ? p.riotId.split('#')[0] : p.riotId;
          const cleanTag = p.riotId.includes('#') ? p.riotId.split('#')[1] : targetTag;
          const formattedTag = `${cleanName}-${cleanTag}`;

          const runeKeystone = getRuneIconUrl(p.primaryRune);
          const runeStyle = getStyleIconUrl(p.secondaryStyle);

          return (
            <div
              key={p.puuid || p.championId}
              className={`flex items-center justify-between p-3 transition-colors ${
                isTarget ? 'bg-white/[0.08]' : 'hover:bg-white/[0.02]'
              }`}
            >
              {/* Champion & Spells */}
              <div className="flex items-center gap-3 min-w-[200px]">
                {/* Champ Icon */}
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-sm">
                  <Image
                    src={getChampionIconUrl(p.championName)}
                    alt={p.championName}
                    width={44}
                    height={44}
                    className="h-full w-full object-cover"
                    unoptimized
                  />
                </div>

                {/* Spells & Runes */}
                <div className="flex flex-col gap-1 shrink-0">
                  <div className="flex gap-1">
                    <div className="h-5 w-5 rounded overflow-hidden border border-white/10">
                      <Image
                        src={getSpellIconUrl(p.spell1Id)}
                        alt="S1"
                        width={20}
                        height={20}
                        unoptimized
                      />
                    </div>
                    <div className="h-5 w-5 rounded overflow-hidden border border-white/10">
                      <Image
                        src={getSpellIconUrl(p.spell2Id)}
                        alt="S2"
                        width={20}
                        height={20}
                        unoptimized
                      />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <div className="h-5 w-5 rounded overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center">
                      {runeKeystone ? (
                        <Image
                          src={runeKeystone}
                          alt="Keystone"
                          width={16}
                          height={16}
                          unoptimized
                        />
                      ) : (
                        <div className="h-3 w-3 bg-slate-800 rounded-full" />
                      )}
                    </div>
                    <div className="h-5 w-5 rounded overflow-hidden border border-white/10 bg-black/60 flex items-center justify-center">
                      {runeStyle ? (
                        <Image
                          src={runeStyle}
                          alt="SubStyle"
                          width={14}
                          height={14}
                          unoptimized
                        />
                      ) : (
                        <div className="h-3 w-3 bg-slate-800 rounded-full" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Player Name */}
                <div className="flex flex-col min-w-0">
                  <Link
                    href={`/summoner/${region}/${encodeURIComponent(formattedTag)}`}
                    className={`truncate text-sm font-bold hover:text-white transition-colors ${
                      isTarget ? 'text-amber-400' : 'text-slate-200'
                    }`}
                  >
                    {cleanName}
                  </Link>
                  <span className="text-[10px] text-slate-500 truncate">
                    #{cleanTag}
                  </span>
                </div>
              </div>

              {/* Rank Info */}
              <div className="flex items-center gap-3 shrink-0 text-right">
                {p.rank ? (
                  <div className="flex items-center gap-2">
                    <RankBadge tier={p.rank.tier} size="sm" />
                    <div className="flex flex-col text-right">
                      <span className="text-xs font-bold text-slate-200">
                        {p.rank.tier} {p.rank.rank}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {p.rank.leaguePoints} LP • <span className={getWinrateColor(p.rank.winrate)}>{p.rank.winrate}%</span>
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-500 font-medium">Unranked</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Live Game Top Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-2xl border border-rose-500/30 bg-gradient-to-r from-rose-950/40 via-black/60 to-black/60 p-5 shadow-xl">
        <div className="flex items-center gap-3.5 mb-3 sm:mb-0">
          <div className="flex h-3 w-3 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-rose-400">
                Live Spiel Aktiv
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs font-bold text-white">{game.queueName}</span>
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Spielmodus: {game.gameMode}
            </div>
          </div>
        </div>

        {/* Live Timer Counter & Refresh */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2 font-mono text-base font-black text-amber-300">
            <span>{formatTimer(elapsedSeconds)}</span>
          </div>
          <button
            onClick={onRefresh}
            className="flex items-center justify-center h-10 w-10 rounded-xl border border-white/10 bg-white/[0.04] text-slate-300 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Live-Daten aktualisieren"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bans Bar if available */}
      {game.bans && game.bans.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between rounded-xl border border-white/[0.06] bg-black/40 p-3.5 gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Ban className="h-3.5 w-3.5 text-rose-400" />
            <span>Bans:</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Blue Bans */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-blue-400 uppercase">Blau:</span>
              <div className="flex gap-1">
                {game.bans.filter((b) => b.teamId === 100).map((b) => (
                  <div key={b.pickTurn} className="h-6 w-6 rounded border border-white/10 overflow-hidden" title={b.championName}>
                    <Image
                      src={getChampionIconUrl(b.championName)}
                      alt={b.championName}
                      width={24}
                      height={24}
                      className="h-full w-full object-cover grayscale opacity-75"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Red Bans */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-rose-400 uppercase">Rot:</span>
              <div className="flex gap-1">
                {game.bans.filter((b) => b.teamId === 200).map((b) => (
                  <div key={b.pickTurn} className="h-6 w-6 rounded border border-white/10 overflow-hidden" title={b.championName}>
                    <Image
                      src={getChampionIconUrl(b.championName)}
                      alt={b.championName}
                      width={24}
                      height={24}
                      className="h-full w-full object-cover grayscale opacity-75"
                      unoptimized
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Team Rosters Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderRoster(game.blueTeam, true)}
        {renderRoster(game.redTeam, false)}
      </div>
    </div>
  );
}
