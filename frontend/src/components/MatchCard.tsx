'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Eye, Shield, Swords, Coins, ExternalLink } from 'lucide-react';
import { FormattedMatch, MatchParticipant } from '@/types';
import {
  getChampionIconUrl,
  getItemIconUrl,
  getSpellIconUrl,
  getRuneIconUrl,
  getStyleIconUrl,
} from '@/lib/ddragon';
import { formatDuration, formatTimeAgo, getKdaColor } from '@/lib/utils';
import ParticipantList from './ParticipantList';

interface MatchCardProps {
  match: FormattedMatch;
  region: string;
}

export default function MatchCard({ match, region }: MatchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const {
    win,
    queueName,
    gameDuration,
    gameCreation,
    participant,
    blueTeam,
    redTeam,
    blueTeamTotals,
    redTeamTotals,
    maxDamage = 1,
  } = match;

  const runeKeystoneUrl = getRuneIconUrl(participant.primaryRune);
  const runeStyleUrl = getStyleIconUrl(participant.secondaryStyle);

  const durationMinutes = gameDuration / 60;

  const renderTeamTable = (
    team: MatchParticipant[],
    isBlue: boolean,
    teamWon: boolean,
    totals?: { kills: number; deaths: number; assists: number; gold: number; damage: number }
  ) => {
    return (
      <div className="flex flex-col rounded-xl border border-white/[0.06] bg-black/40 overflow-hidden">
        {/* Team Header */}
        <div
          className={`flex items-center justify-between px-3 py-2 text-xs font-bold ${
            isBlue
              ? 'bg-blue-950/40 text-blue-300 border-b border-blue-900/30'
              : 'bg-rose-950/40 text-rose-300 border-b border-rose-900/30'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="uppercase tracking-wider">
              {isBlue ? 'Blaues Team' : 'Rotes Team'}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                teamWon ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {teamWon ? 'Sieg' : 'Niederlage'}
            </span>
          </div>

          {totals && (
            <div className="flex items-center gap-4 text-[11px] text-slate-300 font-semibold">
              <span className="flex items-center gap-1">
                <Swords className="h-3 w-3 text-slate-400" />
                {totals.kills} Kills
              </span>
              <span className="flex items-center gap-1">
                <Coins className="h-3 w-3 text-amber-400" />
                {(totals.gold / 1000).toFixed(1)}k Gold
              </span>
            </div>
          )}
        </div>

        {/* Players List Table */}
        <div className="divide-y divide-white/[0.04]">
          {team.map((p) => {
            const isTarget = p.puuid === participant.puuid;
            const targetTag = p.riotIdTagline || region.toUpperCase();
            const formattedTag = `${p.riotIdGameName}-${targetTag}`;
            const damagePct = totals && totals.damage > 0
              ? Math.round((p.totalDamageDealtToChampions / totals.damage) * 100)
              : 0;
            const damageBarWidth = Math.min(
              100,
              Math.max(4, Math.round((p.totalDamageDealtToChampions / maxDamage) * 100))
            );

            return (
              <div
                key={p.puuid}
                className={`flex flex-col lg:flex-row lg:items-center justify-between px-3 py-2 text-xs gap-2 transition-colors ${
                  isTarget ? 'bg-white/[0.07] font-semibold' : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* 1. Champion + Spells + Runes + Name */}
                <div className="flex items-center gap-2.5 min-w-[190px]">
                  {/* Champ Icon */}
                  <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    <Image
                      src={getChampionIconUrl(p.championName)}
                      alt={p.championName}
                      width={32}
                      height={32}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                    <div className="absolute bottom-0 right-0 rounded-tl bg-black/90 px-1 text-[8px] font-bold text-amber-300">
                      {p.champLevel}
                    </div>
                  </div>

                  {/* Spells & Keystone */}
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <div className="flex gap-0.5">
                      <div className="h-3.5 w-3.5 rounded overflow-hidden">
                        <Image
                          src={getSpellIconUrl(p.spells[0])}
                          alt="S1"
                          width={14}
                          height={14}
                          unoptimized
                        />
                      </div>
                      <div className="h-3.5 w-3.5 rounded overflow-hidden">
                        <Image
                          src={getSpellIconUrl(p.spells[1])}
                          alt="S2"
                          width={14}
                          height={14}
                          unoptimized
                        />
                      </div>
                    </div>
                    <div className="h-3.5 w-3.5 rounded overflow-hidden flex items-center justify-center">
                      {getRuneIconUrl(p.primaryRune) ? (
                        <Image
                          src={getRuneIconUrl(p.primaryRune)}
                          alt="Rune"
                          width={14}
                          height={14}
                          unoptimized
                        />
                      ) : (
                        <div className="h-full w-full bg-slate-800 rounded-full" />
                      )}
                    </div>
                  </div>

                  {/* Player Name */}
                  <Link
                    href={`/summoner/${region}/${encodeURIComponent(formattedTag)}`}
                    className={`truncate text-xs hover:text-white transition-colors ${
                      isTarget ? 'text-amber-400 font-bold' : 'text-slate-300'
                    }`}
                    title={`${p.riotIdGameName}#${targetTag}`}
                  >
                    {p.riotIdGameName}
                    <span className="text-[10px] text-slate-500 ml-1">#{targetTag}</span>
                  </Link>
                </div>

                {/* 2. KDA */}
                <div className="flex flex-col min-w-[90px] text-left lg:text-center">
                  <div className="text-xs">
                    <span className="text-slate-100">{p.kills}</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-rose-400">{p.deaths}</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-100">{p.assists}</span>
                  </div>
                  <span className={`text-[10px] ${getKdaColor(p.kda)}`}>
                    {p.kda}:1 KDA
                  </span>
                </div>

                {/* 3. Damage Dealt (with visual comparison bar) */}
                <div className="flex flex-col min-w-[120px]">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-200 font-bold">
                      {p.totalDamageDealtToChampions.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-400">{damagePct}%</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        isBlue ? 'bg-blue-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${damageBarWidth}%` }}
                    />
                  </div>
                </div>

                {/* 4. Wards & CS */}
                <div className="flex items-center gap-3 text-[11px] text-slate-400 min-w-[110px]">
                  <div className="flex flex-col">
                    <span className="text-slate-200">{p.cs} CS</span>
                    <span className="text-[10px] text-slate-500">{p.csPerMinute}/m</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-200">{p.visionScore} VS</span>
                    <span className="text-[10px] text-slate-500">
                      {p.controlWards} CW / {p.wardsPlaced} W
                    </span>
                  </div>
                </div>

                {/* 5. Items Build (0-6) */}
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
                  <div className="h-6 w-6 rounded border border-white/[0.08] bg-black/60 overflow-hidden flex items-center justify-center ml-0.5">
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
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      className={`relative flex flex-col rounded-xl border transition-all ${
        win
          ? 'border-blue-500/30 bg-[#0a1120] hover:border-blue-500/50'
          : 'border-rose-500/30 bg-[#160b11] hover:border-rose-500/50'
      }`}
    >
      {/* Colored Left Accent Bar */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${
          win ? 'bg-blue-500' : 'bg-rose-500'
        }`}
      />

      {/* Main Collapsed Summary Bar (Clickable to Toggle Details) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex flex-col xl:flex-row xl:items-center justify-between p-4 cursor-pointer select-none gap-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 flex-1 min-w-0">
          {/* 1. Queue & Outcome Info */}
          <div className="flex flex-col justify-center min-w-[100px]">
            <span className="text-xs font-bold text-slate-300 truncate">
              {queueName}
            </span>
            <span className="text-[11px] text-slate-500">
              {formatTimeAgo(gameCreation)}
            </span>
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={`text-xs font-black uppercase tracking-wider ${
                  win ? 'text-blue-400' : 'text-rose-400'
                }`}
              >
                {win ? 'Sieg' : 'Niederlage'}
              </span>
              <span className="text-[11px] text-slate-400">
                {formatDuration(gameDuration)}
              </span>
            </div>
          </div>

          {/* 2. Champion, Spells, Runes */}
          <div className="flex items-center gap-3">
            {/* Champion Icon + Level */}
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 shadow-md">
              <Image
                src={getChampionIconUrl(participant.championName)}
                alt={participant.championName}
                width={56}
                height={56}
                className="h-full w-full object-cover"
                unoptimized
              />
              <div className="absolute bottom-0 right-0 rounded-tl bg-black/90 px-1 text-[10px] font-bold text-amber-300">
                {participant.champLevel}
              </div>
            </div>

            {/* Spells & Runes (2x2 grid) */}
            <div className="flex gap-1">
              {/* Spells */}
              <div className="flex flex-col gap-1">
                <div className="h-6 w-6 overflow-hidden rounded border border-white/10 bg-black/60">
                  <Image
                    src={getSpellIconUrl(participant.spells[0])}
                    alt="Spell 1"
                    width={24}
                    height={24}
                    unoptimized
                  />
                </div>
                <div className="h-6 w-6 overflow-hidden rounded border border-white/10 bg-black/60">
                  <Image
                    src={getSpellIconUrl(participant.spells[1])}
                    alt="Spell 2"
                    width={24}
                    height={24}
                    unoptimized
                  />
                </div>
              </div>

              {/* Runes */}
              <div className="flex flex-col gap-1">
                <div className="h-6 w-6 overflow-hidden rounded border border-white/10 bg-black/60 flex items-center justify-center p-0.5">
                  {runeKeystoneUrl ? (
                    <Image
                      src={runeKeystoneUrl}
                      alt="Keystone"
                      width={20}
                      height={20}
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-800 rounded-full" />
                  )}
                </div>
                <div className="h-6 w-6 overflow-hidden rounded border border-white/10 bg-black/60 flex items-center justify-center p-0.5">
                  {runeStyleUrl ? (
                    <Image
                      src={runeStyleUrl}
                      alt="Secondary Rune"
                      width={18}
                      height={18}
                      unoptimized
                    />
                  ) : (
                    <div className="h-full w-full bg-slate-800 rounded-full" />
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 3. KDA & Farm */}
          <div className="flex flex-col justify-center min-w-[120px]">
            <div className="flex items-center gap-1 text-sm font-black text-slate-100">
              <span>{participant.kills}</span>
              <span className="text-slate-500 font-normal">/</span>
              <span className="text-rose-400">{participant.deaths}</span>
              <span className="text-slate-500 font-normal">/</span>
              <span>{participant.assists}</span>
            </div>

            <div className="mt-0.5 flex items-center gap-2 text-xs">
              <span className={getKdaColor(participant.kda)}>
                {participant.kda}:1 KDA
              </span>
              <span className="text-slate-400">
                {participant.cs} CS ({participant.csPerMinute}/m)
              </span>
            </div>
          </div>

          {/* 4. Items (6 Inventory + 1 Trinket) */}
          <div className="flex items-center gap-1">
            <div className="grid grid-cols-3 gap-1">
              {participant.items.slice(0, 6).map((itemId, idx) => (
                <div
                  key={idx}
                  className="h-7 w-7 rounded border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center"
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
            </div>

            {/* Trinket */}
            <div className="h-7 w-7 rounded border border-white/10 bg-black/60 overflow-hidden flex items-center justify-center ml-1">
              {participant.items[6] > 0 ? (
                <Image
                  src={getItemIconUrl(participant.items[6])}
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

        {/* 5. 10 Participants List & Toggle Button */}
        <div className="flex items-center justify-between xl:justify-end gap-4 shrink-0">
          <div className="hidden sm:block xl:pl-4 xl:border-l xl:border-white/[0.08]">
            <ParticipantList
              region={region}
              currentPuuid={participant.puuid}
              blueTeam={blueTeam}
              redTeam={redTeam}
            />
          </div>

          {/* Expand Details Button */}
          <button
            type="button"
            className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/10 bg-white/[0.04] text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors shrink-0"
            title={isExpanded ? 'Details schließen' : 'Details anzeigen'}
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Details Scorecard */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-white/[0.06] flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-xs text-slate-400 pt-3 flex-wrap gap-2">
            <span className="font-semibold uppercase tracking-wider text-slate-300">
              Detaillierte Spielübersicht
            </span>
            <Link
              href={`/match/${region}/${match.matchId}#participant${participant.puuid}`}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/20 hover:text-white transition-colors"
            >
              <span>Vollständige Match-Seite (Drakes & Grafiken)</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          {/* Side-by-Side Team Scorecards */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {/* Blue Team Scorecard */}
            {renderTeamTable(
              blueTeam,
              true,
              blueTeam.some((p) => p.win),
              blueTeamTotals
            )}

            {/* Red Team Scorecard */}
            {renderTeamTable(
              redTeam,
              false,
              redTeam.some((p) => p.win),
              redTeamTotals
            )}
          </div>
        </div>
      )}
    </div>
  );
}
