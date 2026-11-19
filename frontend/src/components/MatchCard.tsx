'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, ChevronUp, Coins, ExternalLink, Zap, Trophy, Award, Swords } from 'lucide-react';
import { FormattedMatch, MatchParticipant } from '@/types';
import {
  getChampionIconUrl,
  getItemIconUrl,
  getSpellIconUrl,
  getRuneIconUrl,
  getStyleIconUrl,
  getPositionIconUrl,
  getParticipantPosition,
  getParticipantPositionOrder,
} from '@/lib/ddragon';
import { formatDuration, formatTimeAgo, getKdaColor } from '@/lib/utils';
import { useTranslation } from '@/i18n/LanguageContext';

interface MatchCardProps {
  match: FormattedMatch;
  region: string;
}

function getMultiKillText(p: MatchParticipant): string | null {
  if (p.pentaKills && p.pentaKills > 0) return 'Penta Kill';
  if (p.quadraKills && p.quadraKills > 0) return 'Quadra Kill';
  if (p.tripleKills && p.tripleKills > 0) return 'Triple Kill';
  if (p.doubleKills && p.doubleKills > 0) return 'Double Kill';
  if (p.largestMultiKill) {
    if (p.largestMultiKill >= 5) return 'Penta Kill';
    if (p.largestMultiKill === 4) return 'Quadra Kill';
    if (p.largestMultiKill === 3) return 'Triple Kill';
    if (p.largestMultiKill === 2) return 'Double Kill';
  }
  return null;
}

export default function MatchCard({ match, region }: MatchCardProps) {
  const { locale } = useTranslation();
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

  const durationMinutes = gameDuration / 60;
  const runeKeystoneUrl = getRuneIconUrl(participant.primaryRune);
  const runeStyleUrl = getStyleIconUrl(participant.secondaryStyle);

  // Position of current player
  const playerPos = getParticipantPosition(participant);

  // Sort teams by standard position order: TOP -> JUNGLE -> MID -> ADC -> SUPPORT
  const sortedBlueTeam = [...blueTeam].sort(
    (a, b) => getParticipantPositionOrder(a) - getParticipantPositionOrder(b)
  );
  const sortedRedTeam = [...redTeam].sort(
    (a, b) => getParticipantPositionOrder(a) - getParticipantPositionOrder(b)
  );

  // Compute LoLDB signature badges
  const allParticipants = [...blueTeam, ...redTeam];
  const maxGameDamage = Math.max(...allParticipants.map((p) => p.totalDamageDealtToChampions), 1);
  const maxGameGold = Math.max(...allParticipants.map((p) => p.goldEarned), 1);
  const maxGameCs = Math.max(...allParticipants.map((p) => p.cs), 1);

  const isMostDmg = participant.totalDamageDealtToChampions === maxGameDamage;
  const isMostGold = participant.goldEarned === maxGameGold;
  const isMostCs = participant.cs === maxGameCs;
  const multiKill = getMultiKillText(participant);

  // Render Detailed Team Table when expanded
  const renderTeamTable = (
    team: MatchParticipant[],
    isBlue: boolean,
    teamWon: boolean,
    totals?: { kills: number; deaths: number; assists: number; gold: number; damage: number }
  ) => {
    const sortedTeam = [...team].sort(
      (a, b) => getParticipantPositionOrder(a) - getParticipantPositionOrder(b)
    );

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
              {isBlue ? (locale === 'de' ? 'Blaues Team' : 'Blue Team') : (locale === 'de' ? 'Rotes Team' : 'Red Team')}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-black uppercase ${
                teamWon ? 'bg-blue-500/20 text-blue-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {teamWon ? (locale === 'de' ? 'Sieg' : 'Victory') : (locale === 'de' ? 'Niederlage' : 'Defeat')}
            </span>
          </div>

          {totals && (
            <div className="flex items-center gap-4 text-[11px] text-zinc-300 font-semibold">
              <span>{totals.kills} Kills</span>
              <span className="text-amber-400 font-bold">
                {(totals.gold / 1000).toFixed(1)}k Gold
              </span>
            </div>
          )}
        </div>

        {/* Players List */}
        <div className="divide-y divide-white/[0.04]">
          {sortedTeam.map((p) => {
            const isTarget = p.puuid === participant.puuid;
            const targetTag = p.riotIdTagline || region.toUpperCase();
            const formattedTag = `${p.riotIdGameName}-${targetTag}`;
            const pos = getParticipantPosition(p);
            const damageBarWidth = Math.min(
              100,
              Math.max(4, Math.round((p.totalDamageDealtToChampions / maxDamage) * 100))
            );

            return (
              <div
                key={p.puuid}
                className={`flex flex-col sm:flex-row sm:items-center justify-between px-3 py-2 text-xs gap-2 transition-colors ${
                  isTarget ? 'bg-white/[0.07] font-semibold' : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Position + Champ + Spells + Name */}
                <div className="flex items-center gap-2 min-w-[210px]">
                  {/* Position Badge */}
                  {pos ? (
                    <div
                      className="flex items-center gap-1 rounded bg-white/[0.06] border border-white/[0.08] px-1.5 py-0.5 text-[9px] font-black text-zinc-300 shrink-0 min-w-[50px] justify-center"
                      title={pos}
                    >
                      <Image
                        src={getPositionIconUrl(pos)}
                        alt={pos}
                        width={11}
                        height={11}
                        className="object-contain"
                        unoptimized
                      />
                      <span>{pos}</span>
                    </div>
                  ) : (
                    <div className="w-[50px] shrink-0" />
                  )}

                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-lg border border-white/10">
                    <Image
                      src={getChampionIconUrl(p.championName)}
                      alt={p.championName}
                      width={28}
                      height={28}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                    <div className="absolute bottom-0 right-0 rounded-tl bg-black/90 px-0.5 text-[7px] font-bold text-amber-300">
                      {p.champLevel}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 min-w-0">
                    <Link
                      href={`/summoner/${region}/${encodeURIComponent(formattedTag)}`}
                      className={`truncate text-xs hover:text-white transition-colors ${
                        isTarget ? 'text-orange-400 font-black' : 'text-zinc-300'
                      }`}
                    >
                      {p.riotIdGameName}
                    </Link>
                    {p.lpChange && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-black shrink-0 ${
                          p.lpChange.delta > 0
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {p.lpChange.delta > 0 ? `+${p.lpChange.delta}` : p.lpChange.delta} LP
                      </span>
                    )}
                    {p.score && (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[9px] font-black shrink-0 flex items-center gap-0.5 ${
                          p.score.isMvp
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : p.score.isAce
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-white/[0.06] text-zinc-400 border border-white/[0.08]'
                        }`}
                      >
                        {p.score.isMvp ? 'MVP' : p.score.isAce ? 'ACE' : 'Score'} {p.score.score.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                {/* KDA */}
                <div className="flex items-center gap-1.5 text-zinc-300 min-w-[90px]">
                  <span>{p.kills}</span>
                  <span className="text-zinc-600">/</span>
                  <span className="text-rose-400">{p.deaths}</span>
                  <span className="text-zinc-600">/</span>
                  <span>{p.assists}</span>
                  <span className={`text-[10px] ml-1 font-bold ${getKdaColor(p.kda)}`}>
                    ({p.kda})
                  </span>
                </div>

                {/* Damage Bar */}
                <div className="flex flex-col min-w-[100px]">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-300">
                      {(p.totalDamageDealtToChampions / 1000).toFixed(1)}k
                    </span>
                    <span className="text-zinc-500">{p.cs} CS</span>
                  </div>
                  <div className="mt-0.5 h-1 w-full rounded-full bg-white/[0.08] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${isBlue ? 'bg-blue-400' : 'bg-rose-400'}`}
                      style={{ width: `${damageBarWidth}%` }}
                    />
                  </div>
                </div>

                {/* Items */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {p.items.slice(0, 6).map((itemId, idx) => (
                    <div
                      key={idx}
                      className="h-5 w-5 rounded border border-white/[0.08] bg-black/60 overflow-hidden flex items-center justify-center"
                    >
                      {itemId > 0 ? (
                        <Image
                          src={getItemIconUrl(itemId)}
                          alt={`Item ${itemId}`}
                          width={20}
                          height={20}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      ) : null}
                    </div>
                  ))}
                  <div className="h-5 w-5 rounded border border-amber-500/20 bg-black/60 overflow-hidden flex items-center justify-center ml-0.5">
                    {p.items[6] > 0 ? (
                      <Image
                        src={getItemIconUrl(p.items[6])}
                        alt="Trinket"
                        width={20}
                        height={20}
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
      className={`group relative flex flex-col rounded-2xl border transition-all overflow-hidden shadow-lg ${
        win
          ? 'bg-[#0e1716]/95 border-emerald-500/20 hover:border-emerald-500/40'
          : 'bg-[#181014]/95 border-rose-500/20 hover:border-rose-500/40'
      }`}
    >
      {/* Main LoLDB Match Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-3.5 gap-4">
        {/* Left Side: Vertical accent pill + Champion Avatar & Spells + Outcome Info */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Vertical Accent Pill */}
          <div
            className={`w-1 self-stretch min-h-[52px] rounded-full my-0.5 shrink-0 ${
              win ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />

          {/* Champion Avatar with Keystone at bottom-left, Level at bottom-right, Spells underneath */}
          <div className="flex flex-col items-center shrink-0">
            <div className="relative h-12 w-12 rounded-full overflow-hidden border border-white/10 shadow-md">
              <Image
                src={getChampionIconUrl(participant.championName)}
                alt={participant.championName}
                width={48}
                height={48}
                className="h-full w-full object-cover"
                unoptimized
              />
              {/* Keystone Rune at bottom-left */}
              {runeKeystoneUrl && (
                <div
                  className="absolute bottom-0 left-0 h-4 w-4 rounded-full bg-black/90 border border-white/20 flex items-center justify-center overflow-hidden"
                  title="Keystone Rune"
                >
                  <Image
                    src={runeKeystoneUrl}
                    alt="Keystone"
                    width={13}
                    height={13}
                    className="object-contain"
                    unoptimized
                  />
                </div>
              )}
              {/* Level Badge at bottom-right */}
              <div
                className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-black/95 border border-white/20 text-[9px] font-black text-white flex items-center justify-center"
                title={`Level ${participant.champLevel}`}
              >
                {participant.champLevel}
              </div>
            </div>

            {/* Summoner Spells below Avatar */}
            <div className="flex items-center gap-1 mt-1">
              <div className="h-4 w-4 rounded overflow-hidden border border-white/10 shrink-0">
                <Image
                  src={getSpellIconUrl(participant.spells[0])}
                  alt="Spell 1"
                  width={16}
                  height={16}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="h-4 w-4 rounded overflow-hidden border border-white/10 shrink-0">
                <Image
                  src={getSpellIconUrl(participant.spells[1])}
                  alt="Spell 2"
                  width={16}
                  height={16}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
            </div>
          </div>

          {/* Outcome & Queue & Duration */}
          <div className="flex flex-col justify-center min-w-[95px]">
            <span
              className={`text-xs font-black uppercase tracking-wider ${
                win ? 'text-emerald-400' : 'text-rose-500'
              }`}
            >
              {win ? 'VICTORY' : 'DEFEAT'}
            </span>
            <span className="text-[11px] font-bold text-zinc-200 truncate mt-0.5">
              {queueName}
            </span>
            <span className="text-[10px] text-zinc-500 mt-0.5 font-medium">
              {formatDuration(gameDuration)} · {formatTimeAgo(gameCreation)}
            </span>
            {match.lpChange && (
              <span
                className={`mt-1 inline-flex self-start rounded px-1.5 py-0.5 text-[10px] font-black tracking-tight ${
                  match.lpChange.delta > 0
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                }`}
              >
                {match.lpChange.delta > 0 ? `+${match.lpChange.delta}` : match.lpChange.delta} LP
              </span>
            )}
          </div>
        </div>

        {/* Center: Items on top, KDA below items, Stats below KDA */}
        <div className="flex flex-col items-center justify-center gap-1.5 shrink-0">
          {/* Row 1: Items (6 items + Trinket) */}
          <div className="flex items-center gap-1">
            {participant.items.slice(0, 6).map((itemId, idx) => (
              <div
                key={idx}
                className="h-6 w-6 rounded-md border border-white/[0.08] bg-black/60 overflow-hidden flex items-center justify-center shrink-0"
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
            <div className="h-6 w-6 rounded-md border border-amber-500/20 bg-black/60 overflow-hidden flex items-center justify-center ml-1.5 shrink-0">
              {participant.items[6] > 0 ? (
                <Image
                  src={getItemIconUrl(participant.items[6])}
                  alt="Trinket"
                  width={24}
                  height={24}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              ) : null}
            </div>
          </div>

          {/* Row 2: KDA */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs font-black text-white">
              <span>{participant.kills}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-rose-500 font-extrabold">{participant.deaths}</span>
              <span className="text-zinc-600">/</span>
              <span>{participant.assists}</span>
            </div>
            <span className="text-[11px] font-bold text-zinc-400 ml-1">
              {(Math.round(participant.kda * 100) / 100).toFixed(2)} KDA
            </span>
          </div>

          {/* Row 3: CS, KP, DMG, Gold */}
          <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-medium">
            <span>
              <span className="text-zinc-300 font-bold">{participant.cs} CS</span> <span className="text-zinc-500">({participant.csPerMinute}/m)</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span>
              <span className="text-zinc-500">KP</span> <span className="text-zinc-300 font-bold">{participant.killParticipation ?? 0}%</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span>
              <span className="text-zinc-300 font-bold">{participant.totalDamageDealtToChampions.toLocaleString()}</span> DMG
            </span>
            <span className="text-zinc-600">•</span>
            <div className="flex items-center gap-1 text-amber-400 font-bold">
              <span>{participant.goldEarned.toLocaleString()}</span>
              <Coins className="h-2.5 w-2.5 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Badges Block: Multi-kill, DeepLoL Score, Most Dmg/Gold */}
        <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 min-w-[95px]">
          {multiKill && (
            <div className="flex items-center gap-1.5 rounded-full bg-amber-400/10 border border-amber-400/25 px-2.5 py-0.5 shadow-sm">
              <div className="h-3.5 w-3.5 rounded-full bg-amber-400 flex items-center justify-center shrink-0">
                <Swords className="h-2 w-2 text-black fill-black" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                {multiKill}
              </span>
            </div>
          )}

          {participant.score && (
            <div className="flex items-center gap-1">
              {participant.score.isMvp ? (
                <span className="flex items-center gap-1 rounded bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[9px] font-black text-amber-300 shadow-sm">
                  <Trophy className="h-2.5 w-2.5 text-amber-400" />
                  <span>MVP {participant.score.score.toFixed(1)}</span>
                </span>
              ) : participant.score.isAce ? (
                <span className="flex items-center gap-1 rounded bg-purple-500/20 border border-purple-500/40 px-2 py-0.5 text-[9px] font-black text-purple-300 shadow-sm">
                  <Award className="h-2.5 w-2.5 text-purple-400" />
                  <span>ACE {participant.score.score.toFixed(1)}</span>
                </span>
              ) : (
                <span className="rounded bg-white/[0.06] border border-white/10 px-2 py-0.5 text-[9px] font-bold text-zinc-400">
                  Score {participant.score.score.toFixed(1)}
                </span>
              )}
            </div>
          )}

          {(isMostDmg || isMostGold) && (
            <div className="flex items-center gap-1">
              {isMostDmg && (
                <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-300">
                  Most Dmg
                </span>
              )}
              {isMostGold && (
                <span className="rounded bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-300">
                  Most Gold
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Side: 5 Matchups with Role Icon Separator + Expand Button */}
        <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/[0.06]">
          <div className="flex flex-col gap-1 text-[10px]">
            {[0, 1, 2, 3, 4].map((i) => {
              const blueP = sortedBlueTeam[i];
              const redP = sortedRedTeam[i];
              const pos =
                (blueP ? getParticipantPosition(blueP) : null) ||
                (redP ? getParticipantPosition(redP) : null);
              const isBlueCurrent = blueP?.puuid === participant.puuid;
              const isRedCurrent = redP?.puuid === participant.puuid;
              const blueFormatted = blueP
                ? `${blueP.riotIdGameName}-${blueP.riotIdTagline || region.toUpperCase()}`
                : '';
              const redFormatted = redP
                ? `${redP.riotIdGameName}-${redP.riotIdTagline || region.toUpperCase()}`
                : '';

              return (
                <div key={i} className="flex items-center gap-2">
                  {/* Blue Player */}
                  <div className="flex items-center gap-1.5 w-[85px] sm:w-[95px] min-w-0">
                    {blueP && (
                      <>
                        <div className="relative h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full border border-white/10">
                          <Image
                            src={getChampionIconUrl(blueP.championName)}
                            alt={blueP.championName}
                            width={14}
                            height={14}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </div>
                        <Link
                          href={`/summoner/${region}/${encodeURIComponent(blueFormatted)}`}
                          className={`truncate hover:text-white transition-colors ${
                            isBlueCurrent
                              ? 'font-black text-white'
                              : 'text-zinc-400 font-medium'
                          }`}
                          title={`${blueP.riotIdGameName}#${blueP.riotIdTagline}`}
                        >
                          {blueP.riotIdGameName}
                        </Link>
                      </>
                    )}
                  </div>

                  {/* Role Icon Divider */}
                  <div
                    className="flex items-center justify-center shrink-0 w-3.5"
                    title={pos || 'Role'}
                  >
                    {pos ? (
                      <Image
                        src={getPositionIconUrl(pos)}
                        alt={pos}
                        width={12}
                        height={12}
                        className="h-3.5 w-3.5 object-contain opacity-70 hover:opacity-100 transition-opacity"
                        unoptimized
                      />
                    ) : (
                      <span className="text-[8px] text-zinc-600">•</span>
                    )}
                  </div>

                  {/* Red Player */}
                  <div className="flex items-center gap-1.5 w-[85px] sm:w-[95px] min-w-0">
                    {redP && (
                      <>
                        <div className="relative h-3.5 w-3.5 shrink-0 overflow-hidden rounded-full border border-white/10">
                          <Image
                            src={getChampionIconUrl(redP.championName)}
                            alt={redP.championName}
                            width={14}
                            height={14}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </div>
                        <Link
                          href={`/summoner/${region}/${encodeURIComponent(redFormatted)}`}
                          className={`truncate hover:text-white transition-colors ${
                            isRedCurrent
                              ? 'font-black text-white'
                              : 'text-zinc-400 font-medium'
                          }`}
                          title={`${redP.riotIdGameName}#${redP.riotIdTagline}`}
                        >
                          {redP.riotIdGameName}
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expand Details Arrow Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex h-8 w-8 items-center justify-center text-zinc-500 hover:text-zinc-200 transition-colors ml-1 shrink-0"
            aria-label="Toggle Match Details"
          >
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Inline Scorecard (Side-by-Side) */}
      {isExpanded && (
        <div className="p-4 pt-0 border-t border-white/[0.06] flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between text-xs text-zinc-400 pt-3 flex-wrap gap-2">
            <span className="font-semibold uppercase tracking-wider text-zinc-300">
              {locale === 'de' ? 'Detaillierte Spielübersicht' : 'Detailed Match Overview'}
            </span>
            <Link
              href={`/match/${region}/${match.matchId}#participant${participant.puuid}`}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-bold text-amber-300 hover:bg-amber-500/20 hover:text-white transition-colors"
            >
              <span>{locale === 'de' ? 'Vollständige Match-Seite (Drakes, Timeline & Grafiken)' : 'Full Match Page (Drakes, Timeline & Graphs)'}</span>
              <ExternalLink className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {renderTeamTable(
              blueTeam,
              true,
              blueTeam.some((p) => p.win),
              blueTeamTotals
            )}
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
