'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Coins,
  Trophy,
  Award,
  Ban,
} from 'lucide-react';
import { FormattedMatch, MatchParticipant, DeepLolScore } from '@/types';
import {
  getChampionIconUrl,
  getChampionIconByIdUrl,
  getItemIconUrl,
  getSpellIconUrl,
  getRuneIconUrl,
  getStyleIconUrl,
  getPositionIconUrl,
  getObjectiveIconUrl,
  getParticipantPosition,
  getParticipantPositionOrder,
  assignTeamPositions,
  calculateKda,
  POSITION_KEYS_ORDER,
} from '@/lib/ddragon';
import { formatDuration, formatTimeAgo, getKdaColor } from '@/lib/utils';
import { useTranslation } from '@/i18n/LanguageContext';

interface MatchCardProps {
  match: FormattedMatch;
  region: string;
  isNew?: boolean;
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

function formatScore(score?: DeepLolScore | number): number {
  if (score === undefined || score === null) return 0;
  const val = typeof score === 'number' ? score : score.score;
  if (!val || val <= 0) return 0;
  const scaled = val <= 10 ? val * 10 : val;
  return Math.round(Math.min(100, Math.max(0, scaled)));
}

function ItemSlot({
  itemId,
  size = 24,
  isTrinket = false,
}: {
  itemId?: number;
  size?: 24 | 32;
  isTrinket?: boolean;
}) {
  const [hasError, setHasError] = useState(false);
  const isValid = Boolean(itemId && itemId > 0 && !hasError);

  const containerClasses =
    size === 32
      ? `h-8 w-8 min-w-[32px] min-h-[32px] rounded-md ${
          isTrinket ? 'border border-amber-500/25' : 'border border-white/[0.08]'
        } bg-black/60 overflow-hidden flex items-center justify-center shrink-0 shadow-sm`
      : `h-6 w-6 min-w-[24px] min-h-[24px] rounded ${
          isTrinket ? 'border border-amber-500/25' : 'border border-white/[0.08]'
        } bg-black/60 overflow-hidden flex items-center justify-center shrink-0 shadow-sm`;

  return (
    <div className={containerClasses}>
      {isValid ? (
        <Image
          src={getItemIconUrl(itemId!)}
          alt=""
          width={size}
          height={size}
          className="h-full w-full object-cover"
          unoptimized
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="w-1 h-1 rounded-full bg-white/[0.06]" />
      )}
    </div>
  );
}

function BanSlot({ champId }: { champId?: number | null }) {
  const [hasError, setHasError] = useState(false);
  const isValid = Boolean(champId && champId > 0 && !hasError);

  return (
    <div
      className="relative w-5 h-5 min-w-[20px] max-w-[20px] min-h-[20px] max-h-[20px] rounded overflow-hidden border border-white/10 bg-black/60 shrink-0 shadow-sm flex items-center justify-center"
      title={isValid ? `Gebannter Champion ID ${champId}` : 'Kein Ban'}
    >
      {isValid ? (
        <>
          <Image
            src={getChampionIconByIdUrl(champId!)}
            alt=""
            width={20}
            height={20}
            className="h-full w-full object-cover grayscale opacity-60"
            unoptimized
            onError={() => setHasError(true)}
          />
          <div className="absolute inset-0 bg-red-500/25 pointer-events-none" />
          <div className="absolute inset-x-0 top-1/2 h-[1.5px] bg-red-500 -rotate-45 pointer-events-none" />
        </>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-white/[0.03]">
          <Ban className="h-2.5 w-2.5 text-zinc-600/70" />
        </div>
      )}
    </div>
  );
}

export default function MatchCard({ match, region, isNew }: MatchCardProps) {
  const { t, locale } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [damageMode, setDamageMode] = useState<'dealt' | 'taken'>('dealt');

  const isNewMatch = isNew ?? match.isNew;
  const [isDismissed, setIsDismissed] = useState(false);

  // Auto-dismiss the "New" badge after 30 seconds if left un-interacted
  useEffect(() => {
    if (isNewMatch && !isDismissed) {
      const timer = setTimeout(() => {
        setIsDismissed(true);
      }, 30000);
      return () => clearTimeout(timer);
    }
  }, [isNewMatch, isDismissed]);

  const showNewBadge = Boolean(isNewMatch && !isDismissed);

  const {
    win,
    queueName,
    gameDuration,
    gameCreation,
    gameEndTimestamp,
    participant,
    blueTeam,
    redTeam,
    blueTeamTotals,
    redTeamTotals,
  } = match;

  const gameEndTime = gameEndTimestamp || (gameCreation + gameDuration * 1000);

  const durationMinutes = Math.max(gameDuration / 60, 1);
  const isRemake = Boolean(match.isRemake || gameDuration < 300 || participant.gameEndedInEarlySurrender);
  const isSurrender = Boolean(match.isSurrender || participant.gameEndedInSurrender || participant.gameEndedInEarlySurrender);

  // Check if ranked queue (Ranked Solo/Duo = 420, Ranked Flex = 440, Ranked 5s = 710)
  const isRankedMatch =
    match.queueId === 420 ||
    match.queueId === 440 ||
    match.queueId === 710 ||
    Boolean(
      match.queueName &&
        (match.queueName.toLowerCase().includes('ranked') ||
          match.queueName.toLowerCase().includes('solo') ||
          match.queueName.toLowerCase().includes('flex'))
    );

  const effectiveLpDelta =
    participant.lpDelta ?? match.lpChange?.delta ?? null;

  const runeKeystoneUrl = getRuneIconUrl(participant.primaryRune);
  const runeStyleUrl = getStyleIconUrl(participant.secondaryStyle);

  // Position of current player
  const playerPos = getParticipantPosition(participant);

  // Sort teams by standard position order: TOP -> JUNGLE -> MID -> ADC -> SUPPORT
  const sortedBlueTeamSlots = assignTeamPositions(blueTeam);
  const sortedRedTeamSlots = assignTeamPositions(redTeam);
  const sortedBlueTeam = sortedBlueTeamSlots.map((s) => s.participant).filter(Boolean) as MatchParticipant[];
  const sortedRedTeam = sortedRedTeamSlots.map((s) => s.participant).filter(Boolean) as MatchParticipant[];

  // Compute game-wide stats
  const allParticipants = [...blueTeam, ...redTeam];
  const maxGameDamage = Math.max(...allParticipants.map((p) => p.totalDamageDealtToChampions), 1);
  const maxGameDamageTaken = Math.max(...allParticipants.map((p) => p.totalDamageTaken), 1);
  const maxGameGold = Math.max(...allParticipants.map((p) => p.goldEarned), 1);
  const maxGameCs = Math.max(...allParticipants.map((p) => p.cs), 1);


  const hasAnyScore = allParticipants.some(
    (p) => (typeof p.heroScore === 'number' && p.heroScore > 0) || (typeof p.score?.score === 'number' && p.score.score > 0)
  );

  // Sort all 10 players by score descending to assign overall rank (1st to 10th) if score exists
  const allPlayersRanked = hasAnyScore
    ? [...allParticipants].sort((a, b) => {
        const scoreB = b.heroScore ?? b.score?.score ?? 0;
        const scoreA = a.heroScore ?? a.score?.score ?? 0;
        return scoreB - scoreA;
      })
    : [];

  const getRankInfo = (p: MatchParticipant) => {
    const pScore = p.heroScore ?? p.score?.score;
    if (!hasAnyScore || typeof pScore !== 'number' || pScore <= 0) {
      return null;
    }
    if (p.score?.isMvp) return { label: 'MVP', isMvp: true, isAce: false };
    if (p.score?.isAce) return { label: 'ACE', isMvp: false, isAce: true };
    const index = allPlayersRanked.findIndex((item) => item.puuid === p.puuid);
    const rank = index + 1;
    const suffix = rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`;
    return { label: suffix, isMvp: false, isAce: false };
  };

  const blueTeamData = (match.teams || []).find((t: any) => t.teamId === 100);
  const redTeamData = (match.teams || []).find((t: any) => t.teamId === 200);

  // Render Detailed Team Table when expanded (analog screenshot)
  const renderTeamTable = (
    team: MatchParticipant[],
    isBlue: boolean,
    teamWon: boolean,
    totals?: { kills: number; deaths: number; assists: number; gold: number; damage: number },
    teamRawData?: any
  ) => {
    const sortedSlots = assignTeamPositions(team);

    const rawBans = (teamRawData?.bans || []).map((b: any) => b.championId ?? -1);
    const bans: number[] = Array.from({ length: 5 }, (_, idx) => rawBans[idx] ?? -1);
    const obj = teamRawData?.objectives || {};

    const sideTowers = obj.tower?.kills ?? 0;
    const sideInhibitors = obj.inhibitor?.kills ?? 0;
    const sideBarons = obj.baron?.kills ?? 0;
    const sideDragons = obj.dragon?.kills ?? 0;
    const sideHerald = obj.riftHerald?.kills ?? obj.horde?.kills ?? 0;
    const teamSide = isBlue ? 'blue' : 'red';

    return (
      <div
        className={`flex flex-col rounded-xl border overflow-hidden ${
          isRemake
            ? 'border-slate-800 bg-[#12151c]/90'
            : teamWon
            ? 'border-emerald-500/25 bg-[#07190f]/90'
            : 'border-rose-500/25 bg-[#17060a]/90'
        }`}
      >
        {/* Team Header Row */}
        <div
          className={`flex items-center justify-between px-3.5 py-2.5 text-xs border-b ${
            isRemake
              ? 'border-slate-700/30 bg-slate-800/30 text-slate-300'
              : teamWon
              ? 'border-emerald-500/20 bg-emerald-950/40 text-emerald-300'
              : 'border-rose-500/20 bg-rose-950/40 text-rose-300'
          }`}
        >
          {/* Left: Outcome, Side, Objective counters, Bans */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span
                className={`font-black uppercase tracking-wider text-xs ${
                  isRemake
                    ? 'text-slate-400'
                    : teamWon
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}
              >
                {isRemake ? 'REMAKE' : teamWon ? t('matches.victory') : t('matches.defeat')}
              </span>
              <span className="text-xs text-zinc-400 font-semibold">
                {isBlue ? t('matches.blueSide') : t('matches.redSide')}
              </span>
            </div>

            {/* Objective icons + counts */}
            <div className="flex items-center gap-2.5 text-[11px] text-zinc-300 font-bold ml-1">
              <span className="flex items-center gap-1" title={t('matches.towers')}>
                <Image
                  src={getObjectiveIconUrl('tower', teamSide)}
                  alt={t('matches.towers')}
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 object-contain shrink-0"
                  unoptimized
                />
                <span>{sideTowers}</span>
              </span>
              <span className="flex items-center gap-1" title={t('matches.inhibitors')}>
                <Image
                  src={getObjectiveIconUrl('inhibitor', teamSide)}
                  alt={t('matches.inhibitors')}
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 object-contain shrink-0"
                  unoptimized
                />
                <span>{sideInhibitors}</span>
              </span>
              <span className="flex items-center gap-1" title={t('matches.dragons')}>
                <Image
                  src={getObjectiveIconUrl('dragon', teamSide)}
                  alt={t('matches.dragons')}
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 object-contain shrink-0"
                  unoptimized
                />
                <span>{sideDragons}</span>
              </span>
              <span className="flex items-center gap-1" title={t('matches.barons')}>
                <Image
                  src={getObjectiveIconUrl('baron', teamSide)}
                  alt={t('matches.barons')}
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 object-contain shrink-0"
                  unoptimized
                />
                <span>{sideBarons}</span>
              </span>
              <span className="flex items-center gap-1" title={t('matches.herald')}>
                <Image
                  src={getObjectiveIconUrl('herald', teamSide)}
                  alt={t('matches.herald')}
                  width={14}
                  height={14}
                  className="h-3.5 w-3.5 object-contain shrink-0"
                  unoptimized
                />
                <span>{sideHerald}</span>
              </span>
            </div>

            {/* Bans (Always 5 slots per team, with empty slot placeholders) */}
            <div className="flex items-center gap-1.5 ml-2 shrink-0">
              <span className="text-[11px] text-zinc-500 font-bold">{t('matches.bans')}</span>
              <div className="flex items-center gap-1 shrink-0">
                {[0, 1, 2, 3, 4].map((slotIdx) => (
                  <BanSlot key={slotIdx} champId={bans[slotIdx]} />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Table Column Labels with Interactive Damage/Taken Toggle */}
          <div className="hidden lg:flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider text-zinc-500">
            <span className="w-[185px] text-center">{t('matches.build')}</span>
            <span className="w-16 text-center">KDA</span>
            <span className="w-12 text-center">KP</span>
            <span className="w-14 text-center">CS</span>
            {/* Interactive Toggle Button for Damage Dealt vs Damage Taken */}
            <button
              type="button"
              onClick={() => setDamageMode((prev) => (prev === 'dealt' ? 'taken' : 'dealt'))}
              className="w-28 flex items-center justify-between px-1.5 py-0.5 rounded hover:bg-white/[0.05] transition-colors cursor-pointer group"
              title={
                damageMode === 'dealt'
                  ? t('matches.switchToTaken')
                  : t('matches.switchToDamage')
              }
            >
              <span
                className="text-[10px] font-black uppercase tracking-wider transition-colors text-zinc-400 group-hover:text-zinc-200"
              >
                {damageMode === 'dealt' ? t('matches.damage') : t('matches.taken')}
              </span>
              <div className="flex items-center gap-1 text-zinc-500 group-hover:text-zinc-300">
                <ChevronLeft className="h-3 w-3" />
                <ChevronRight className="h-3 w-3" />
              </div>
            </button>
            <span className="w-14 text-center">{t('matches.vision')}</span>
            <span className="w-16 text-right pr-1">{t('matches.gold')}</span>
            <span className="w-16 text-center text-[10px] font-bold tracking-tight" title={t('matches.heroScore')}>{t('matches.heroScore')}</span>
          </div>
        </div>

        {/* Players List */}
        <div className="divide-y divide-white/[0.04]">
          {sortedSlots.map(({ role: pRole, participant: p }) => {
            if (!p) return null;
            const isTarget = p.puuid === participant.puuid;
            const targetTag = p.riotIdTagline || region.toUpperCase();
            const formattedTag = `${p.riotIdGameName}-${targetTag}`;
            const rankInfo = getRankInfo(p);
            const pKeystone = getRuneIconUrl(p.primaryRune);
            const pStyle = getStyleIconUrl(p.secondaryStyle);
            const pScore = formatScore(p.heroScore ?? p.score);

            return (
              <div
                key={p.puuid}
                className={`flex flex-col lg:flex-row lg:items-center justify-between px-3.5 py-2.5 gap-2 text-xs transition-colors ${
                  isTarget ? 'bg-white/[0.06] border-l-2 border-l-white/60' : 'hover:bg-white/[0.02]'
                }`}
              >
                {/* Left: Rank Badge + Champion Avatar + Spells/Runes + Role Icon + Name */}
                <div className="flex items-center gap-2.5 min-w-[240px]">
                  {/* Rank Badge: MVP (gold), ACE (teal), or 2nd..10th */}
                  {rankInfo && (
                    <div className="w-10 sm:w-11 h-6 rounded-md flex items-center justify-center shrink-0">
                      {rankInfo.isMvp ? (
                        <span className="w-full h-full rounded-md bg-amber-400 text-black border border-amber-300 font-black text-xs flex items-center justify-center shadow-sm">
                          MVP
                        </span>
                      ) : rankInfo.isAce ? (
                        <span className="w-full h-full rounded-md bg-teal-500/20 border border-teal-500/50 text-teal-300 font-black text-xs flex items-center justify-center">
                          ACE
                        </span>
                      ) : (
                        <span className="w-full h-full rounded-md bg-white/[0.04] border border-white/[0.08] text-zinc-400 text-[10px] font-bold flex items-center justify-center">
                          {rankInfo.label}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Champion Avatar with Uncropped Level Badge */}
                  <div className="relative h-8 w-8 shrink-0">
                    <div className="h-full w-full rounded-full overflow-hidden border border-white/10 shadow-sm">
                      <Image
                        src={getChampionIconUrl(p.championName)}
                        alt={p.championName}
                        width={32}
                        height={32}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    </div>
                    {/* Level badge floating on top at bottom-right - Not clipped by overflow-hidden! */}
                    <div
                      className="absolute -bottom-1 -right-1 h-4 w-4 rounded-full bg-black/95 border border-white/30 text-[8px] font-black text-white flex items-center justify-center shadow-md z-10"
                      title={`Level ${p.champLevel}`}
                    >
                      {p.champLevel}
                    </div>
                  </div>

                  {/* Spells & Runes (2x2 grid) */}
                  <div className="flex items-center gap-0.5 shrink-0">
                    <div className="flex flex-col gap-0.5">
                      <div className="h-3.5 w-3.5 rounded overflow-hidden border border-white/10">
                        <Image
                          src={getSpellIconUrl(p.spells[0])}
                          alt="S1"
                          width={14}
                          height={14}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="h-3.5 w-3.5 rounded overflow-hidden border border-white/10">
                        <Image
                          src={getSpellIconUrl(p.spells[1])}
                          alt="S2"
                          width={14}
                          height={14}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <div className="h-3.5 w-3.5 rounded overflow-hidden flex items-center justify-center bg-black/60 border border-white/10">
                        {pKeystone ? (
                          <Image
                            src={pKeystone}
                            alt="Rune"
                            width={12}
                            height={12}
                            className="object-contain"
                            unoptimized
                          />
                        ) : null}
                      </div>
                      <div className="h-3.5 w-3.5 rounded overflow-hidden flex items-center justify-center bg-black/60 border border-white/10">
                        {pStyle ? (
                          <Image
                            src={pStyle}
                            alt="Style"
                            width={11}
                            height={11}
                            className="object-contain"
                            unoptimized
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {/* Role Icon */}
                  {pRole ? (
                    <div className="flex items-center justify-center shrink-0 w-4 h-4" title={pRole}>
                      <Image
                        src={getPositionIconUrl(pRole)}
                        alt={pRole}
                        width={14}
                        height={14}
                        className="h-3.5 w-3.5 object-contain opacity-75 filter brightness-110"
                        unoptimized
                      />
                    </div>
                  ) : null}

                  {/* Player Game Name & Champion Name & LP */}
                  <div className="flex flex-col justify-center min-w-[100px] max-w-[145px] shrink-0">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Link
                        href={`/${locale}/summoner/${region}/${encodeURIComponent(formattedTag)}`}
                        className={`truncate text-xs hover:text-white transition-colors ${
                          isTarget ? 'text-white font-black' : 'text-zinc-200 font-bold'
                        }`}
                        title={`${p.riotIdGameName}#${p.riotIdTagline}`}
                      >
                        {p.riotIdGameName}
                      </Link>
                      {p.lpDelta !== null && p.lpDelta !== undefined ? (
                        <span
                          className={`text-[10px] font-black tracking-tight shrink-0 ${
                            p.lpDelta > 0
                              ? 'text-emerald-400'
                              : p.lpDelta < 0
                              ? 'text-rose-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {p.lpDelta > 0 ? `+${p.lpDelta}` : p.lpDelta} LP
                        </span>
                      ) : p.lpChange?.delta ? (
                        <span
                          className={`text-[10px] font-black tracking-tight shrink-0 ${
                            p.lpChange.delta > 0
                              ? 'text-emerald-400'
                              : p.lpChange.delta < 0
                              ? 'text-rose-400'
                              : 'text-zinc-400'
                          }`}
                        >
                          {p.lpChange.delta > 0 ? `+${p.lpChange.delta}` : p.lpChange.delta} LP
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[10px] text-zinc-500 font-medium truncate">
                      {p.championName}
                      {(p.postGameTier || p.lpChange?.tier) && (
                        <span className="text-zinc-400 font-normal">
                          {' · '}
                          {p.postGameTier || p.lpChange?.tier}{' '}
                          {p.postGameRank || p.lpChange?.rank || ''}
                          {(p.postGameLp !== null && p.postGameLp !== undefined) || p.lpChange?.leaguePoints !== undefined
                            ? ` (${p.postGameLp ?? p.lpChange?.leaguePoints} LP)`
                            : ''}
                        </span>
                      )}
                    </span>
                  </div>
                </div>

                {/* Right: Columns for Build, KDA, KP, CS, Damage/Taken, Vision, Gold, Score */}
                <div className="flex items-center justify-between lg:justify-end gap-2 text-xs flex-1">
                  {/* BUILD: 6 items + Trinket */}
                  <div className="w-[185px] flex items-center gap-1 shrink-0 justify-center">
                    {[0, 1, 2, 3, 4, 5].map((idx) => (
                      <ItemSlot key={idx} itemId={p.items[idx]} size={24} />
                    ))}
                    <div className="ml-1">
                      <ItemSlot itemId={p.items[6]} size={24} isTrinket />
                    </div>
                  </div>

                  {/* KDA */}
                  <div className="w-16 text-center flex flex-col items-center justify-center shrink-0">
                    <div className="flex items-center gap-0.5 font-bold text-white text-xs">
                      <span>{p.kills}</span>
                      <span className="text-zinc-600">/</span>
                      <span className="text-rose-400 font-bold">{p.deaths}</span>
                      <span className="text-zinc-600">/</span>
                      <span>{p.assists}</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {calculateKda(p.kills, p.deaths, p.assists)}:1 KDA
                    </span>
                  </div>

                  {/* KP */}
                  <div className="w-12 text-center text-xs font-bold text-zinc-200 shrink-0">
                    {p.killParticipation ?? 0}%
                  </div>

                  {/* CS */}
                  <div className="w-14 text-center flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-zinc-200">{p.cs}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">{p.csPerMinute}/m</span>
                  </div>

                  {/* DAMAGE / TAKEN COLUMN */}
                  <div className="w-28 flex flex-col justify-center shrink-0">
                    <div className="flex items-center justify-between text-xs font-bold">
                      {damageMode === 'dealt' ? (
                        <>
                          <span className="text-zinc-200">
                            {(p.totalDamageDealtToChampions / 1000).toFixed(1)}K
                          </span>
                          <span className="text-[10px] text-zinc-500 font-medium">
                            {Math.round(p.totalDamageDealtToChampions / durationMinutes)}/m
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-sky-300 font-bold">
                            {(p.totalDamageTaken / 1000).toFixed(1)}K
                          </span>
                          <span className="text-[10px] text-sky-400/80 font-medium">
                            {Math.round(p.totalDamageTaken / durationMinutes)}/m
                          </span>
                        </>
                      )}
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden mt-1">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          damageMode === 'dealt' ? 'bg-orange-500' : 'bg-sky-400'
                        }`}
                        style={{
                          width: `${
                            damageMode === 'dealt'
                              ? Math.min(
                                  100,
                                  Math.max(3, Math.round((p.totalDamageDealtToChampions / maxGameDamage) * 100))
                                )
                              : Math.min(
                                  100,
                                  Math.max(3, Math.round((p.totalDamageTaken / maxGameDamageTaken) * 100))
                                )
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* VISION */}
                  <div className="w-14 text-center flex flex-col items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-zinc-200">{p.visionScore}</span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {p.wardsPlaced}/{p.wardsKilled}
                    </span>
                  </div>

                  {/* GOLD */}
                  <div className="w-16 text-right flex items-center justify-end gap-1 shrink-0">
                    <span className="text-xs font-bold text-amber-300">
                      {(p.goldEarned / 1000).toFixed(1)}K
                    </span>
                    <Coins className="h-2.5 w-2.5 text-amber-400" />
                  </div>

                  {/* HERO SCORE (0-100 rounded integer) */}
                  <div className="w-16 text-center shrink-0">
                    <span
                      className={`text-xs font-black ${
                        rankInfo?.isMvp
                          ? 'text-amber-400 text-sm'
                          : rankInfo?.isAce
                          ? 'text-emerald-400 text-sm'
                          : 'text-zinc-200'
                      }`}
                    >
                      {pScore > 0 ? pScore : '—'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Saturated, rich outcome colors (Victory = emerald green, Defeat = crimson red, not pale!)
  const outcomeText = isRemake ? 'REMAKE' : win ? t('matches.victory') : t('matches.defeat');
  const cardBgClass = isRemake
    ? 'bg-[#12151c]/95 border-slate-700/40 hover:border-slate-600/50'
    : win
    ? 'bg-gradient-to-r from-[#0c2417] via-[#091b11] to-[#07140d] border-emerald-500/40 hover:border-emerald-400/60 shadow-[0_4px_24px_rgba(16,185,129,0.08)]'
    : 'bg-gradient-to-r from-[#2c0d14] via-[#20090e] to-[#150508] border-rose-500/40 hover:border-rose-400/60 shadow-[0_4px_24px_rgba(244,63,94,0.08)]';

  const accentBarClass = isRemake
    ? 'bg-slate-400'
    : win
    ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.85)]'
    : 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.85)]';

  const outcomeTextClass = isRemake
    ? 'text-slate-300 font-black'
    : win
    ? 'text-emerald-400 font-black'
    : 'text-rose-400 font-black';

  return (
    <div
      className={`group relative flex flex-col rounded-2xl border transition-all overflow-hidden shadow-lg ${cardBgClass}`}
    >
      {/* Main LoLDB Match Row (~30% taller container with larger icons and texts) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between p-4 sm:p-5 gap-4 min-h-[110px]">
        {/* Left Side: Vertical accent pill + Champion Avatar + Spells/Runes side-by-side + Outcome Info */}
        <div className="flex items-center gap-3.5 shrink-0">
          {/* Vertical Accent Pill */}
          <div
            className={`w-1.5 self-stretch min-h-[68px] rounded-full my-0.5 shrink-0 ${accentBarClass}`}
          />

          {/* Champion Avatar with Uncropped Level Badge */}
          <div className="relative h-16 w-16 shrink-0">
            <div className="h-full w-full rounded-full overflow-hidden border border-white/10 shadow-md">
              <Image
                src={getChampionIconUrl(participant.championName)}
                alt={participant.championName}
                width={64}
                height={64}
                className="h-full w-full object-cover"
                unoptimized
              />
            </div>
            {/* Level Badge at bottom-right - Not cropped by overflow-hidden! */}
            <div
              className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-black/95 border border-white/30 text-[10px] font-black text-white flex items-center justify-center shadow-lg z-10"
              title={`Level ${participant.champLevel}`}
            >
              {participant.champLevel}
            </div>
          </div>

          {/* Summoner Spells & Runes (Side-by-Side 2x2 grid) */}
          <div className="flex items-center gap-1 shrink-0">
            {/* Spells Column */}
            <div className="flex flex-col gap-1 shrink-0">
              <div className="h-5 w-5 rounded overflow-hidden border border-white/10 shrink-0 shadow-sm">
                <Image
                  src={getSpellIconUrl(participant.spells[0])}
                  alt="S1"
                  width={20}
                  height={20}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
              <div className="h-5 w-5 rounded overflow-hidden border border-white/10 shrink-0 shadow-sm">
                <Image
                  src={getSpellIconUrl(participant.spells[1])}
                  alt="S2"
                  width={20}
                  height={20}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              </div>
            </div>

            {/* Runes Column */}
            <div className="flex flex-col gap-1 shrink-0">
              <div
                className="h-5 w-5 rounded overflow-hidden flex items-center justify-center bg-black/60 border border-white/10 shrink-0 shadow-sm"
                title="Keystone Rune"
              >
                {runeKeystoneUrl ? (
                  <Image
                    src={runeKeystoneUrl}
                    alt="Keystone"
                    width={18}
                    height={18}
                    className="object-contain"
                    unoptimized
                  />
                ) : null}
              </div>
              <div
                className="h-5 w-5 rounded overflow-hidden flex items-center justify-center bg-black/60 border border-white/10 shrink-0 shadow-sm"
                title="Secondary Style"
              >
                {runeStyleUrl ? (
                  <Image
                    src={runeStyleUrl}
                    alt="Style"
                    width={16}
                    height={16}
                    className="object-contain"
                    unoptimized
                  />
                ) : null}
              </div>
            </div>
          </div>

          {/* Outcome & Queue & Duration & Surrender / LP */}
          <div className="flex flex-col justify-center min-w-[100px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-sm font-black uppercase tracking-wider ${outcomeTextClass}`}>
                {outcomeText}
              </span>
              {effectiveLpDelta !== null && (
                <span
                  className={`text-sm font-black tracking-tight ${
                    effectiveLpDelta > 0
                      ? 'text-emerald-400'
                      : effectiveLpDelta < 0
                      ? 'text-rose-400'
                      : 'text-zinc-400'
                  }`}
                >
                  {effectiveLpDelta > 0 ? `+${effectiveLpDelta}` : effectiveLpDelta} LP
                </span>
              )}
              {showNewBadge && (
                <span className="inline-flex items-center rounded bg-[#432114] border border-[#783818] px-1.5 py-0.5 text-[10px] font-bold text-[#f9b771] shadow-sm tracking-wide leading-none select-none transition-opacity duration-300">
                  {t('matches.badgeNew')}
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-zinc-200 truncate mt-0.5">
              {queueName}
            </span>
            <span className="text-xs text-zinc-400 mt-0.5 font-medium">
              {formatDuration(gameDuration)} · {formatTimeAgo(gameEndTime, locale)}
            </span>
            {isSurrender && !isRemake && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="rounded bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-400 uppercase tracking-wide">
                  {t('matches.surrender')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Center: Items on top, KDA below items, Stats below KDA */}
        <div className="flex flex-col items-center justify-center gap-2 shrink-0">
          {/* Row 1: Items (6 items + Trinket, 32px larger icons) */}
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3, 4, 5].map((idx) => (
              <ItemSlot key={idx} itemId={participant.items[idx]} size={32} />
            ))}
            <div className="ml-2">
              <ItemSlot itemId={participant.items[6]} size={32} isTrinket />
            </div>
          </div>

          {/* Row 2: KDA */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-base font-black text-white">
              <span>{participant.kills}</span>
              <span className="text-zinc-600">/</span>
              <span className="text-rose-400 font-bold">{participant.deaths}</span>
              <span className="text-zinc-600">/</span>
              <span>{participant.assists}</span>
            </div>
            <span className="text-xs font-bold text-zinc-400 ml-1">
              {calculateKda(participant.kills, participant.deaths, participant.assists)} KDA
            </span>
          </div>

          {/* Row 3: CS, KP, DMG, Gold */}
          <div className="flex items-center gap-2.5 text-xs text-zinc-400 font-medium">
            <span>
              <span className="text-zinc-200 font-bold">{participant.cs} CS</span>{' '}
              <span className="text-zinc-500">({participant.csPerMinute}/m)</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span>
              <span className="text-zinc-500">KP</span>{' '}
              <span className="text-zinc-200 font-bold">{participant.killParticipation ?? 0}%</span>
            </span>
            <span className="text-zinc-600">•</span>
            <span>
              <span className="text-zinc-200 font-bold">
                {participant.totalDamageDealtToChampions.toLocaleString()}
              </span>{' '}
              DMG
            </span>
            <span className="text-zinc-600">•</span>
            <div className="flex items-center gap-1 text-amber-300 font-bold">
              <span>{participant.goldEarned.toLocaleString()}</span>
              <Coins className="h-3 w-3 text-amber-400" />
            </div>
          </div>
        </div>

        {/* Score Block (Prominent & Clean, multi-kill/most dmg badges removed) */}
        {((participant.heroScore && participant.heroScore > 0) || (participant.score && participant.score.score > 0)) && (
          <div className="flex flex-col items-center justify-center shrink-0 min-w-[85px]">
            {participant.score?.isMvp ? (
              <span className="flex items-center gap-1.5 rounded-lg bg-amber-400 text-black border border-amber-300 px-3 py-1.5 text-sm font-black shadow-md tracking-tight">
                <Trophy className="h-4 w-4 text-black fill-black" />
                <span>MVP {formatScore(participant.heroScore ?? participant.score)}</span>
              </span>
            ) : participant.score?.isAce ? (
              <span className="flex items-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-sm font-black text-emerald-300 shadow-md tracking-tight">
                <Award className="h-4 w-4 text-emerald-400" />
                <span>ACE {formatScore(participant.heroScore ?? participant.score)}</span>
              </span>
            ) : (
              <span className="rounded-lg bg-white/[0.08] border border-white/15 px-3 py-1.5 text-sm font-black text-zinc-100 shadow-sm tracking-tight whitespace-nowrap">
                Hero Score {formatScore(participant.heroScore ?? participant.score)}
              </span>
            )}
          </div>
        )}

        {/* Right Side: 5 Matchups with centered Role Icon Separator + Expand Button */}
        <div className="flex items-center gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-white/[0.06]">
          <div className="flex flex-col gap-1.5 text-xs">
            {POSITION_KEYS_ORDER.map((posKey, i) => {
              const blueP = sortedBlueTeamSlots[i]?.participant;
              const redP = sortedRedTeamSlots[i]?.participant;
              const pos = posKey;
              const isBlueCurrent = blueP?.puuid === participant.puuid;
              const isRedCurrent = redP?.puuid === participant.puuid;
              const blueFormatted = blueP
                ? `${blueP.riotIdGameName}-${blueP.riotIdTagline || region.toUpperCase()}`
                : '';
              const redFormatted = redP
                ? `${redP.riotIdGameName}-${redP.riotIdTagline || region.toUpperCase()}`
                : '';

              return (
                <div key={posKey} className="flex items-center gap-2.5">
                  {/* Blue Player */}
                  <div className="flex items-center gap-1.5 w-[95px] sm:w-[110px] min-w-0">
                    {blueP && (
                      <>
                        <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full border border-white/10">
                          <Image
                            src={getChampionIconUrl(blueP.championName)}
                            alt={blueP.championName}
                            width={16}
                            height={16}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </div>
                        <Link
                          href={`/${locale}/summoner/${region}/${encodeURIComponent(blueFormatted)}`}
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
                    className="flex items-center justify-center shrink-0 w-4"
                    title={pos}
                  >
                    <Image
                      src={getPositionIconUrl(pos)}
                      alt={pos}
                      width={14}
                      height={14}
                      className="h-4 w-4 object-contain opacity-70 hover:opacity-100 transition-opacity"
                      unoptimized
                    />
                  </div>

                  {/* Red Player */}
                  <div className="flex items-center gap-1.5 w-[95px] sm:w-[110px] min-w-0">
                    {redP && (
                      <>
                        <div className="relative h-4 w-4 shrink-0 overflow-hidden rounded-full border border-white/10">
                          <Image
                            src={getChampionIconUrl(redP.championName)}
                            alt={redP.championName}
                            width={16}
                            height={16}
                            className="h-full w-full object-cover"
                            unoptimized
                          />
                        </div>
                        <Link
                          href={`/${locale}/summoner/${region}/${encodeURIComponent(redFormatted)}`}
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

          {/* Right Actions Column: Match Details Icon (top) + Expand Arrow Button (bottom) */}
          <div className="flex flex-col items-center justify-between self-stretch shrink-0 py-0.5 border-l border-white/[0.06] pl-2.5 ml-1 min-h-[92px]">
            {/* Match Details Icon Link (in top right corner above the expand arrow) */}
            <Link
              href={`/${locale}/match/${region}/${match.matchId}#participant${participant.puuid}`}
              className="group/detail flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 hover:border-amber-500/50 hover:scale-105 transition-all shadow-sm active:scale-95"
              title={t('matches.matchDetails')}
              aria-label={t('matches.matchDetails')}
            >
              <svg
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-amber-400 group-hover/detail:text-amber-300 transition-colors"
              >
                <path
                  d="M2.5 3V17H18"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <rect x="5" y="11" width="2" height="6" rx="0.5" fill="currentColor" />
                <rect x="8.5" y="6" width="2" height="11" rx="0.5" fill="currentColor" />
                <rect x="12" y="8.5" width="2" height="8.5" rx="0.5" fill="currentColor" />
                <rect x="15.5" y="4" width="2" height="13" rx="0.5" fill="currentColor" />
              </svg>
            </Link>

            {/* Expand Details Arrow Button */}
            <button
              type="button"
              onClick={() => {
                if (showNewBadge) setIsDismissed(true);
                setIsExpanded(!isExpanded);
              }}
              className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
              aria-label={t('matches.toggleDetails')}
            >
              {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Inline Full-Width Scorecard (Stacked analog screenshot) */}
      {isExpanded && (
        <div className="p-4 sm:p-5 pt-0 border-t border-white/[0.06] flex flex-col gap-4 animate-in fade-in slide-in-from-top-2 duration-200 overflow-x-auto pb-5">
          {/* Blue Side Table */}
          {renderTeamTable(
            blueTeam,
            true,
            blueTeam.some((p) => p.win),
            blueTeamTotals,
            blueTeamData
          )}

          {/* Red Side Table */}
          {renderTeamTable(
            redTeam,
            false,
            redTeam.some((p) => p.win),
            redTeamTotals,
            redTeamData
          )}
        </div>
      )}
    </div>
  );
}
