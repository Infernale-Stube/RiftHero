export type ScoreTier = 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';

export type HeroScoreRole =
  | 'TOP'
  | 'JUNGLE'
  | 'MIDDLE'
  | 'BOTTOM'
  | 'UTILITY'
  | 'ARAM'
  | 'UNKNOWN';

export interface HeroScoreCategoryMetrics {
  score: number; // 0 - 100
  weight: number; // 0 - 1
}

export interface HeroScoreBreakdown {
  role: HeroScoreRole;
  combat: HeroScoreCategoryMetrics;
  damage: HeroScoreCategoryMetrics;
  economy: HeroScoreCategoryMetrics;
  objectives: HeroScoreCategoryMetrics;
  vision: HeroScoreCategoryMetrics;
  lane: HeroScoreCategoryMetrics;
  winBonus: number; // +4 win, -3 loss, 0 remake
  highlights: {
    kda: number;
    killParticipation: number; // 0 - 100 (%)
    damageShare: number; // 0 - 100 (%)
    csPerMin: number;
    goldPerMin: number;
    visionPerMin: number;
    goldDiffVsLane: number | null;
    csDiffVsLane: number | null;
    dmgDiffVsLane: number | null;
    objectiveTakedowns: number;
  };
}

export interface DeepLolScore {
  score: number; // 0 - 100 integer
  rank: number; // 1 - 10 in match
  isMvp: boolean; // Top score on winning team (disabled on remakes)
  isAce: boolean; // Top score on losing team (disabled on remakes)
  tierRating: ScoreTier;
  breakdown?: HeroScoreBreakdown;
}

export interface ScoreTimelinePoint {
  minute: number;
  blueScore: number;
  redScore: number;
  diff: number; // blueScore - redScore
  playerScores: Record<string, number>; // puuid -> score at minute (0-100)
}

export interface MatchObjectivesSummary {
  blueTowerKills?: number;
  blueInhibitorKills?: number;
  blueBaronKills?: number;
  blueDragonKills?: number;
  blueRiftHeraldKills?: number;
  blueHordeKills?: number;
  redTowerKills?: number;
  redInhibitorKills?: number;
  redBaronKills?: number;
  redDragonKills?: number;
  redRiftHeraldKills?: number;
  redHordeKills?: number;
}

export interface CalculateScoresContext {
  queueId?: number;
  mapId?: number;
  teams?: any[];
  matchObjectives?: MatchObjectivesSummary;
  timeline?: any;
}

interface TimelineParticipantExtras {
  towerTakedowns: number;
  inhibitorTakedowns: number;
  dragonTakedowns: number;
  baronTakedowns: number;
  riftHeraldTakedowns: number;
  hordeTakedowns: number;
  wardsPlaced: number;
  wardsKilled: number;
  goldAt15?: number;
  csAt15?: number;
}

const ROLE_WEIGHTS: Record<
  HeroScoreRole,
  { combat: number; damage: number; economy: number; objectives: number; vision: number; lane: number }
> = {
  TOP: { combat: 0.24, damage: 0.22, economy: 0.20, objectives: 0.14, vision: 0.08, lane: 0.12 },
  JUNGLE: { combat: 0.26, damage: 0.16, economy: 0.16, objectives: 0.20, vision: 0.11, lane: 0.11 },
  MIDDLE: { combat: 0.25, damage: 0.24, economy: 0.20, objectives: 0.11, vision: 0.08, lane: 0.12 },
  BOTTOM: { combat: 0.23, damage: 0.27, economy: 0.23, objectives: 0.11, vision: 0.06, lane: 0.10 },
  UTILITY: { combat: 0.31, damage: 0.08, economy: 0.10, objectives: 0.13, vision: 0.27, lane: 0.11 },
  ARAM: { combat: 0.34, damage: 0.30, economy: 0.16, objectives: 0.12, vision: 0.00, lane: 0.08 },
  UNKNOWN: { combat: 0.26, damage: 0.22, economy: 0.19, objectives: 0.13, vision: 0.10, lane: 0.10 },
};

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

export function getTierRating(scoreVal: number): ScoreTier {
  if (scoreVal >= 88) return 'S+';
  if (scoreVal >= 78) return 'S';
  if (scoreVal >= 68) return 'A';
  if (scoreVal >= 55) return 'B';
  if (scoreVal >= 42) return 'C';
  return 'D';
}

export function normalizeScoreRole(
  rawPos: string | null | undefined,
  context?: CalculateScoresContext
): HeroScoreRole {
  if (context?.mapId === 12 || context?.queueId === 450) {
    return 'ARAM';
  }
  const pos = (rawPos || '').trim().toUpperCase();
  if (pos === 'TOP') return 'TOP';
  if (pos === 'JUNGLE') return 'JUNGLE';
  if (pos === 'MIDDLE' || pos === 'MID') return 'MIDDLE';
  if (pos === 'BOTTOM' || pos === 'BOT' || pos === 'ADC') return 'BOTTOM';
  if (pos === 'UTILITY' || pos === 'SUPPORT' || pos === 'SUP') return 'UTILITY';
  return 'UNKNOWN';
}

function getParticipantTotalCs(p: any): number {
  if (typeof p.neutralMinionsKilled === 'number') {
    return (p.totalMinionsKilled || 0) + p.neutralMinionsKilled;
  }
  if (typeof p.cs === 'number') {
    return p.cs;
  }
  return p.totalMinionsKilled || 0;
}

function resolveParticipantIdMap(timeline: any, participants: any[]): Map<number, string> {
  const partIdToPuuid = new Map<number, string>();
  if (Array.isArray(timeline?.info?.participants)) {
    for (const tp of timeline.info.participants) {
      if (tp?.participantId && tp?.puuid) {
        partIdToPuuid.set(tp.participantId, tp.puuid);
      }
    }
  }
  if (partIdToPuuid.size === 0) {
    participants.forEach((p, idx) => {
      if (p?.puuid) {
        partIdToPuuid.set(idx + 1, p.puuid);
      }
    });
  }
  return partIdToPuuid;
}

function extractTimelineExtras(
  timeline: any,
  participants: any[]
): Map<string, TimelineParticipantExtras> {
  const result = new Map<string, TimelineParticipantExtras>();
  if (!timeline?.info?.frames || !Array.isArray(timeline.info.frames)) {
    return result;
  }

  const partIdToPuuid = resolveParticipantIdMap(timeline, participants);
  const byPartId = new Map<number, TimelineParticipantExtras>();
  for (let i = 1; i <= 10; i++) {
    byPartId.set(i, {
      towerTakedowns: 0,
      inhibitorTakedowns: 0,
      dragonTakedowns: 0,
      baronTakedowns: 0,
      riftHeraldTakedowns: 0,
      hordeTakedowns: 0,
      wardsPlaced: 0,
      wardsKilled: 0,
    });
  }

  const frames = timeline.info.frames;
  frames.forEach((frame: any, idx: number) => {
    if (idx === 15 && frame?.participantFrames) {
      for (const [pIdStr, pf] of Object.entries<any>(frame.participantFrames)) {
        const pId = Number(pIdStr);
        const entry = byPartId.get(pId);
        if (entry && pf) {
          entry.goldAt15 = pf.totalGold || 0;
          entry.csAt15 = (pf.minionsKilled || 0) + (pf.jungleMinionsKilled || 0);
        }
      }
    }

    if (!Array.isArray(frame?.events)) return;
    for (const ev of frame.events) {
      const involvedIds = new Set<number>();
      if (ev.killerId && ev.killerId > 0) involvedIds.add(ev.killerId);
      if (Array.isArray(ev.assistingParticipantIds)) {
        for (const aId of ev.assistingParticipantIds) {
          if (aId > 0) involvedIds.add(aId);
        }
      }

      if (ev.type === 'BUILDING_KILL') {
        if (ev.buildingType === 'TOWER_BUILDING') {
          involvedIds.forEach((id) => {
            const e = byPartId.get(id);
            if (e) e.towerTakedowns += 1;
          });
        } else if (ev.buildingType === 'INHIBITOR_BUILDING') {
          involvedIds.forEach((id) => {
            const e = byPartId.get(id);
            if (e) e.inhibitorTakedowns += 1;
          });
        }
      } else if (ev.type === 'ELITE_MONSTER_KILL') {
        involvedIds.forEach((id) => {
          const e = byPartId.get(id);
          if (!e) return;
          if (ev.monsterType === 'DRAGON') e.dragonTakedowns += 1;
          else if (ev.monsterType === 'BARON_NASHOR') e.baronTakedowns += 1;
          else if (ev.monsterType === 'RIFTHERALD') e.riftHeraldTakedowns += 1;
          else if (ev.monsterType === 'HORDE') e.hordeTakedowns += 1;
        });
      } else if (ev.type === 'WARD_PLACED' && ev.creatorId > 0) {
        const e = byPartId.get(ev.creatorId);
        if (e) e.wardsPlaced += 1;
      } else if (ev.type === 'WARD_KILL' && ev.killerId > 0) {
        const e = byPartId.get(ev.killerId);
        if (e) e.wardsKilled += 1;
      }
    }
  });

  for (const [pId, extras] of byPartId.entries()) {
    const puuid = partIdToPuuid.get(pId);
    if (puuid) result.set(puuid, extras);
  }
  return result;
}

function resolveTeamObjectiveScore(
  teamId: number,
  context?: CalculateScoresContext
): { myPower: number; enemyPower: number; hasData: boolean } {
  let blueTower = 0;
  let blueInhib = 0;
  let blueBaron = 0;
  let blueDragon = 0;
  let blueHerald = 0;
  let blueHorde = 0;

  let redTower = 0;
  let redInhib = 0;
  let redBaron = 0;
  let redDragon = 0;
  let redHerald = 0;
  let redHorde = 0;

  let hasData = false;

  if (context?.matchObjectives) {
    const o = context.matchObjectives;
    blueTower = o.blueTowerKills ?? 0;
    blueInhib = o.blueInhibitorKills ?? 0;
    blueBaron = o.blueBaronKills ?? 0;
    blueDragon = o.blueDragonKills ?? 0;
    blueHerald = o.blueRiftHeraldKills ?? 0;
    blueHorde = o.blueHordeKills ?? 0;
    redTower = o.redTowerKills ?? 0;
    redInhib = o.redInhibitorKills ?? 0;
    redBaron = o.redBaronKills ?? 0;
    redDragon = o.redDragonKills ?? 0;
    redHerald = o.redRiftHeraldKills ?? 0;
    redHorde = o.redHordeKills ?? 0;
    hasData = true;
  } else if (Array.isArray(context?.teams)) {
    const blue = context.teams.find((t: any) => t.teamId === 100)?.objectives;
    const red = context.teams.find((t: any) => t.teamId === 200)?.objectives;
    if (blue || red) {
      blueTower = blue?.tower?.kills ?? 0;
      blueInhib = blue?.inhibitor?.kills ?? 0;
      blueBaron = blue?.baron?.kills ?? 0;
      blueDragon = blue?.dragon?.kills ?? 0;
      blueHerald = blue?.riftHerald?.kills ?? 0;
      blueHorde = blue?.horde?.kills ?? 0;
      redTower = red?.tower?.kills ?? 0;
      redInhib = red?.inhibitor?.kills ?? 0;
      redBaron = red?.baron?.kills ?? 0;
      redDragon = red?.dragon?.kills ?? 0;
      redHerald = red?.riftHerald?.kills ?? 0;
      redHorde = red?.horde?.kills ?? 0;
      hasData = true;
    }
  }

  const bluePower =
    blueTower * 1.0 +
    blueInhib * 1.5 +
    blueDragon * 1.6 +
    blueBaron * 3.0 +
    blueHerald * 1.2 +
    blueHorde * 0.4;
  const redPower =
    redTower * 1.0 +
    redInhib * 1.5 +
    redDragon * 1.6 +
    redBaron * 3.0 +
    redHerald * 1.2 +
    redHorde * 0.4;

  return teamId === 100
    ? { myPower: bluePower, enemyPower: redPower, hasData }
    : { myPower: redPower, enemyPower: bluePower, hasData };
}

/**
 * Calculates the role-aware multi-criteria Hero Score (0-100) for all participants of a match.
 * MVP is strictly determined by the highest calculated score on the winning team (never hardcoded to 100).
 */
export function calculateMatchScores(
  participants: any[],
  gameDurationSeconds: number,
  context?: CalculateScoresContext
): Map<string, DeepLolScore> {
  if (!Array.isArray(participants) || participants.length === 0) {
    return new Map<string, DeepLolScore>();
  }

  const isRemake = gameDurationSeconds <= 330;
  const durationMin = Math.max(gameDurationSeconds / 60, 1);
  const timelineExtrasMap = extractTimelineExtras(context?.timeline, participants);

  const blueParticipants = participants.filter((p) => p.teamId === 100);
  const redParticipants = participants.filter((p) => p.teamId === 200);

  const sumStat = (list: any[], getter: (p: any) => number) =>
    list.reduce((acc, p) => acc + getter(p), 0);

  const blueKills = sumStat(blueParticipants, (p) => p.kills || 0);
  const redKills = sumStat(redParticipants, (p) => p.kills || 0);
  const blueDmg = sumStat(blueParticipants, (p) => p.totalDamageDealtToChampions || 0);
  const redDmg = sumStat(redParticipants, (p) => p.totalDamageDealtToChampions || 0);
  const blueGold = sumStat(blueParticipants, (p) => p.goldEarned || 0);
  const redGold = sumStat(redParticipants, (p) => p.goldEarned || 0);
  const blueDmgTaken = sumStat(blueParticipants, (p) => p.totalDamageTaken || 0);
  const redDmgTaken = sumStat(redParticipants, (p) => p.totalDamageTaken || 0);

  const roleByPuuid = new Map<string, HeroScoreRole>();
  for (const p of participants) {
    roleByPuuid.set(p.puuid, normalizeScoreRole(p.teamPosition, context));
  }

  const scoredList: Array<{
    puuid: string;
    win: boolean;
    rawScore: number;
    breakdown: HeroScoreBreakdown;
  }> = [];

  for (const p of participants) {
    const isBlue = p.teamId === 100;
    const enemyTeam = isBlue ? redParticipants : blueParticipants;
    const teamKills = isBlue ? blueKills : redKills;
    const teamDmg = isBlue ? blueDmg : redDmg;
    const teamGold = isBlue ? blueGold : redGold;
    const teamDmgTaken = isBlue ? blueDmgTaken : redDmgTaken;

    const role = roleByPuuid.get(p.puuid) || 'UNKNOWN';
    const isSupport = role === 'UTILITY';
    const isJungle = role === 'JUNGLE';
    const isAram = role === 'ARAM';
    const weights = ROLE_WEIGHTS[role];

    const kills = p.kills || 0;
    const deaths = p.deaths || 0;
    const assists = p.assists || 0;
    const totalDmg = p.totalDamageDealtToChampions || 0;
    const totalDmgTaken = p.totalDamageTaken || 0;
    const totalCs = getParticipantTotalCs(p);
    const goldEarned = p.goldEarned || 0;
    const visionScore = p.visionScore || 0;
    const wardsKilled = p.wardsKilled || 0;
    const controlWards = p.visionWardsBoughtInGame || 0;
    const champLevel = p.champLevel || 1;

    const kda = (kills + assists) / Math.max(deaths, 1);
    const kp = teamKills > 0 ? (kills + assists) / teamKills : 0;
    const dmgShare = teamDmg > 0 ? totalDmg / teamDmg : 0;
    const goldShare = teamGold > 0 ? goldEarned / teamGold : 0.2;
    const csPerMin = totalCs / durationMin;
    const gpm = goldEarned / durationMin;
    const dpm = totalDmg / durationMin;
    const vpm = visionScore / durationMin;

    // ------------------------------------------------------------------
    // 1. Combat, KDA, Kill Participation & Utility/Survivability (0-100)
    // ------------------------------------------------------------------
    const expectedKp = isSupport ? 0.58 : isJungle ? 0.56 : isAram ? 0.65 : role === 'TOP' ? 0.42 : 0.50;
    const kdaFactor = Math.tanh((kda - 2.4) / 2.6) * 23;
    const zeroDeathBonus = deaths === 0 && kills + assists >= 3 ? 4.5 : 0;
    const deathsPerMin = deaths / durationMin;
    const excessDeathPenalty = deathsPerMin > 0.21 ? Math.min(20, (deathsPerMin - 0.21) * 65) : 0;
    const kpFactor = Math.tanh((kp - expectedKp) / 0.20) * 18;

    // Survivability / Tanking / Healing / CC bonus
    const dmgTakenPerDeath = totalDmgTaken / Math.max(deaths, 1);
    const dmgTakenShare = teamDmgTaken > 0 ? totalDmgTaken / teamDmgTaken : 0.2;
    const frontlineBonus =
      deaths <= 6 && dmgTakenShare > 0.22
        ? Math.min(5, (dmgTakenPerDeath / 4500) * 2.2)
        : 0;

    const healShield =
      (p.totalHealsOnTeammates || 0) +
      (p.totalDamageShieldedOnTeammates || 0) +
      (p.challenges?.effectiveHealAndShielding || 0);
    const healShieldBonus = healShield > 0 ? Math.min(8, (healShield / (durationMin * 320)) * 4.5) : 0;

    const ccSeconds = p.timeCCingOthers || 0;
    const ccBonus = ccSeconds > 0 ? Math.min(5, (ccSeconds / durationMin) * 1.4) : 0;

    const multiKillBonus =
      (p.pentaKills ? 6 : p.quadraKills ? 4 : p.tripleKills ? 2 : 0) +
      (p.firstBloodKill || p.firstBloodAssist ? 1.5 : 0) +
      Math.min(3, (p.challenges?.soloKills || 0) * 1.0);

    const combatScore = clamp(
      50 + kdaFactor + zeroDeathBonus - excessDeathPenalty + kpFactor + frontlineBonus + healShieldBonus + ccBonus + multiKillBonus,
      0,
      100
    );

    // ------------------------------------------------------------------
    // 2. Damage & Pressure (0-100)
    // ------------------------------------------------------------------
    const expectedDmgShare =
      role === 'BOTTOM'
        ? 0.27
        : role === 'MIDDLE'
        ? 0.25
        : role === 'TOP'
        ? 0.22
        : role === 'JUNGLE'
        ? 0.18
        : isSupport
        ? 0.09
        : 0.20;
    const expectedDpm =
      role === 'BOTTOM'
        ? 760
        : role === 'MIDDLE'
        ? 710
        : role === 'TOP'
        ? 640
        : role === 'JUNGLE'
        ? 510
        : isSupport
        ? 270
        : isAram
        ? 1100
        : 620;
    const expectedDmgPerGold = isSupport ? 0.78 : 1.42;
    const dmgPerGold = goldEarned > 0 ? totalDmg / goldEarned : 0;

    const dmgShareFactor = Math.tanh((dmgShare - expectedDmgShare) / (isSupport ? 0.05 : 0.09)) * 24;
    const dpmFactor = Math.tanh((dpm - expectedDpm) / (expectedDpm * 0.45)) * 18;
    const dmgEfficiencyFactor = Math.tanh((dmgPerGold - expectedDmgPerGold) / 0.65) * 8;

    const damageScore = clamp(50 + dmgShareFactor + dpmFactor + dmgEfficiencyFactor, 0, 100);

    // ------------------------------------------------------------------
    // 3. Economy & Farming (0-100)
    // ------------------------------------------------------------------
    const expectedCs =
      role === 'BOTTOM'
        ? 7.5
        : role === 'MIDDLE'
        ? 7.2
        : role === 'TOP'
        ? 6.8
        : isJungle
        ? 5.7
        : isAram
        ? 3.5
        : 6.4;
    const expectedGpm =
      role === 'BOTTOM'
        ? 435
        : role === 'MIDDLE'
        ? 420
        : role === 'TOP'
        ? 405
        : isJungle
        ? 395
        : isSupport
        ? 315
        : isAram
        ? 540
        : 400;
    const expectedGoldShare = isSupport ? 0.135 : isJungle ? 0.205 : 0.215;

    const csFactor = isSupport ? 0 : Math.tanh((csPerMin - expectedCs) / 2.0) * 23;
    const gpmFactor = Math.tanh((gpm - expectedGpm) / (isSupport ? 65 : 95)) * (isSupport ? 26 : 18);
    const goldShareFactor = Math.tanh((goldShare - expectedGoldShare) / 0.045) * (isSupport ? 16 : 9);

    const avgEnemyLevel =
      enemyTeam.length > 0
        ? sumStat(enemyTeam, (ep) => ep.champLevel || 1) / enemyTeam.length
        : champLevel;
    const levelFactor = Math.tanh((champLevel - avgEnemyLevel) / 2.2) * (isSupport ? 8 : 5);

    const economyScore = clamp(50 + csFactor + gpmFactor + goldShareFactor + levelFactor, 0, 100);

    // ------------------------------------------------------------------
    // 4. Vision & Map Control (0-100)
    // ------------------------------------------------------------------
    const tlExtras = timelineExtrasMap.get(p.puuid);
    const effectiveWardsKilled = Math.max(wardsKilled, tlExtras?.wardsKilled || 0);
    const expectedVpm = isSupport ? 1.85 : isJungle ? 0.92 : 0.70;
    const expectedCw = (isSupport ? 3.5 : isJungle ? 2.2 : 1.5) * (durationMin / 25);

    const vpmFactor = isAram
      ? 0
      : Math.tanh((vpm - expectedVpm) / (isSupport ? 0.65 : 0.35)) * 27;
    const clearFactor = isAram
      ? 0
      : Math.tanh((effectiveWardsKilled / durationMin - (isSupport ? 0.35 : 0.18)) / 0.22) * 13;
    const cwFactor = isAram ? 0 : Math.tanh((controlWards - expectedCw) / 1.8) * 10;

    const visionScoreVal = isAram ? 50 : clamp(50 + vpmFactor + clearFactor + cwFactor, 0, 100);

    // ------------------------------------------------------------------
    // 5. Objectives & Macro (0-100)
    // ------------------------------------------------------------------
    const turretTakedowns =
      p.challenges?.turretTakedowns ?? p.turretTakedowns ?? tlExtras?.towerTakedowns ?? 0;
    const inhibTakedowns =
      p.challenges?.inhibitorTakedowns ?? p.inhibitorTakedowns ?? tlExtras?.inhibitorTakedowns ?? 0;
    const dragonTakedowns = p.challenges?.dragonTakedowns ?? tlExtras?.dragonTakedowns ?? 0;
    const baronTakedowns = p.challenges?.baronTakedowns ?? tlExtras?.baronTakedowns ?? 0;
    const heraldTakedowns =
      (p.challenges?.riftHeraldTakedowns ?? tlExtras?.riftHeraldTakedowns ?? 0) +
      (tlExtras?.hordeTakedowns ? tlExtras.hordeTakedowns * 0.4 : 0);
    const objStolen = p.objectivesStolen ?? p.challenges?.objectivesStolen ?? 0;

    const totalObjTakedowns =
      turretTakedowns +
      inhibTakedowns +
      dragonTakedowns +
      baronTakedowns +
      Math.round(heraldTakedowns);

    const hasIndividualObjStats =
      typeof p.damageDealtToObjectives === 'number' ||
      typeof p.challenges?.turretTakedowns === 'number' ||
      tlExtras !== undefined;

    const teamObj = resolveTeamObjectiveScore(p.teamId, context);
    const teamObjRatio =
      teamObj.hasData && teamObj.myPower + teamObj.enemyPower > 0
        ? teamObj.myPower / (teamObj.myPower + teamObj.enemyPower)
        : p.win
        ? 0.62
        : 0.38;
    const teamObjFactor = Math.tanh((teamObjRatio - 0.5) / 0.24) * 24;

    let objectivesScore = 50;
    if (hasIndividualObjStats) {
      const weightedTakedowns =
        turretTakedowns * 1.1 +
        inhibTakedowns * 1.4 +
        dragonTakedowns * 1.6 +
        baronTakedowns * 2.5 +
        heraldTakedowns * 1.2 +
        objStolen * 3.0;
      const expectedWeighted = isJungle ? 5.2 : isSupport ? 3.5 : 4.2;
      const takedownFactor =
        Math.tanh((weightedTakedowns - expectedWeighted * (durationMin / 28)) / 3.2) * 26;

      const objDmg = p.damageDealtToObjectives || 0;
      const turretDmg = p.damageDealtToTurrets || 0;
      const expectedObjDmgPerMin = isJungle ? 650 : role === 'BOTTOM' ? 480 : isSupport ? 140 : 380;
      const objDmgFactor =
        objDmg > 0 || turretDmg > 0
          ? Math.tanh(((objDmg + turretDmg * 0.4) / durationMin - expectedObjDmgPerMin) / (expectedObjDmgPerMin * 0.7)) * 12
          : 0;

      objectivesScore = clamp(50 + takedownFactor + objDmgFactor + teamObjFactor * 0.55, 0, 100);
    } else {
      // Pure DB fallback: blend team objective differential with player's map presence (KP + survival)
      const presenceFactor = Math.tanh((kp - expectedKp) / 0.22) * 14;
      objectivesScore = clamp(50 + teamObjFactor * 0.85 + presenceFactor, 0, 100);
    }

    // ------------------------------------------------------------------
    // 6. Lane Matchup Diff (0-100)
    // ------------------------------------------------------------------
    const directOpponent =
      role !== 'UNKNOWN' && role !== 'ARAM'
        ? enemyTeam.find((ep) => roleByPuuid.get(ep.puuid) === role)
        : undefined;

    let goldDiffVsLane: number | null = null;
    let csDiffVsLane: number | null = null;
    let dmgDiffVsLane: number | null = null;
    let laneScore = 50;

    if (directOpponent) {
      const oppGold = directOpponent.goldEarned || 0;
      const oppCs = getParticipantTotalCs(directOpponent);
      const oppDmg = directOpponent.totalDamageDealtToChampions || 0;
      const oppVpm = (directOpponent.visionScore || 0) / durationMin;
      const oppLevel = directOpponent.champLevel || 1;
      const oppKda = ((directOpponent.kills || 0) + (directOpponent.assists || 0)) / Math.max(directOpponent.deaths || 0, 1);

      goldDiffVsLane = Math.round(goldEarned - oppGold);
      csDiffVsLane = Math.round(totalCs - oppCs);
      dmgDiffVsLane = Math.round(totalDmg - oppDmg);

      const goldDiffPerMin = goldDiffVsLane / durationMin;
      const csDiffPerMin = csDiffVsLane / durationMin;
      const dmgDiffPerMin = dmgDiffVsLane / durationMin;

      const laneGoldFactor = Math.tanh(goldDiffPerMin / 75) * 18;
      const laneCsOrVisFactor = isSupport
        ? Math.tanh((vpm - oppVpm) / 0.6) * 16
        : Math.tanh(csDiffPerMin / 1.8) * 12;
      const laneDmgFactor = Math.tanh(dmgDiffPerMin / (isSupport ? 140 : 260)) * (isSupport ? 6 : 12);
      const laneLevelFactor = Math.tanh((champLevel - oppLevel) / 1.8) * 6;
      const laneKdaFactor = Math.tanh((kda - oppKda) / 2.5) * 6;

      // Early game minute-15 gold/cs diff bonus if timeline is present
      let earlyLeadBonus = 0;
      const oppTl = timelineExtrasMap.get(directOpponent.puuid);
      if (tlExtras?.goldAt15 !== undefined && oppTl?.goldAt15 !== undefined) {
        earlyLeadBonus = Math.tanh((tlExtras.goldAt15 - oppTl.goldAt15) / 1500) * 6;
      }

      laneScore = clamp(
        50 + laneGoldFactor + laneCsOrVisFactor + laneDmgFactor + laneLevelFactor + laneKdaFactor + earlyLeadBonus,
        0,
        100
      );
    } else if (enemyTeam.length > 0) {
      const avgOppGold = sumStat(enemyTeam, (ep) => ep.goldEarned || 0) / enemyTeam.length;
      const avgOppDmg = sumStat(enemyTeam, (ep) => ep.totalDamageDealtToChampions || 0) / enemyTeam.length;
      goldDiffVsLane = Math.round(goldEarned - avgOppGold);
      dmgDiffVsLane = Math.round(totalDmg - avgOppDmg);
      laneScore = clamp(
        50 + Math.tanh((goldDiffVsLane / durationMin) / 85) * 20 + Math.tanh((dmgDiffVsLane / durationMin) / 280) * 16,
        0,
        100
      );
    }

    // ------------------------------------------------------------------
    // Weighted Final Score
    // ------------------------------------------------------------------
    const weightedBase =
      combatScore * weights.combat +
      damageScore * weights.damage +
      economyScore * weights.economy +
      objectivesScore * weights.objectives +
      visionScoreVal * weights.vision +
      laneScore * weights.lane;

    const winBonus = isRemake ? 0 : p.win ? 4 : -3;
    const rawScore = isRemake
      ? clamp(Math.round(45 + (weightedBase - 50) * 0.25), 40, 60)
      : clamp(Math.round(weightedBase + winBonus), 10, 100);

    const breakdown: HeroScoreBreakdown = {
      role,
      combat: { score: Math.round(combatScore), weight: weights.combat },
      damage: { score: Math.round(damageScore), weight: weights.damage },
      economy: { score: Math.round(economyScore), weight: weights.economy },
      objectives: { score: Math.round(objectivesScore), weight: weights.objectives },
      vision: { score: Math.round(visionScoreVal), weight: weights.vision },
      lane: { score: Math.round(laneScore), weight: weights.lane },
      winBonus,
      highlights: {
        kda: Number(kda.toFixed(2)),
        killParticipation: Math.round(kp * 100),
        damageShare: Math.round(dmgShare * 100),
        csPerMin: Number(csPerMin.toFixed(1)),
        goldPerMin: Math.round(gpm),
        visionPerMin: Number(vpm.toFixed(2)),
        goldDiffVsLane,
        csDiffVsLane,
        dmgDiffVsLane,
        objectiveTakedowns: totalObjTakedowns,
      },
    };

    scoredList.push({
      puuid: p.puuid,
      win: Boolean(p.win),
      rawScore,
      breakdown,
    });
  }

  // Sort by rawScore descending
  scoredList.sort((a, b) => b.rawScore - a.rawScore);

  const mvpItem = isRemake ? undefined : scoredList.find((s) => s.win);
  const aceItem = isRemake ? undefined : scoredList.find((s) => !s.win);

  const resultMap = new Map<string, DeepLolScore>();

  scoredList.forEach((item, index) => {
    const isMvp = !isRemake && item.puuid === mvpItem?.puuid;
    const isAce = !isRemake && item.puuid === aceItem?.puuid;
    const finalScore = clamp(Math.round(item.rawScore), 10, 100);

    resultMap.set(item.puuid, {
      score: finalScore,
      rank: index + 1,
      isMvp,
      isAce,
      tierRating: getTierRating(finalScore),
      breakdown: item.breakdown,
    });
  });

  return resultMap;
}

/**
 * Builds the complete DeepLolScore ranking map from precalculated heroScores stored in the database.
 * If participants do not have saved heroScores, returns an empty map (NO live calculation/fallback).
 */
export function buildScoresFromSavedHeroScores(
  participants: Array<{ puuid: string; win: boolean; heroScore?: number | null }>
): Map<string, DeepLolScore> {
  const withScore = participants.filter(
    (p) => typeof p.heroScore === 'number' && p.heroScore > 0
  );

  if (withScore.length === 0) {
    return new Map<string, DeepLolScore>();
  }

  const scoredList = withScore.map((p) => ({
    puuid: p.puuid,
    win: p.win,
    rawScore: p.heroScore as number,
  }));

  scoredList.sort((a, b) => b.rawScore - a.rawScore);

  const mvpItem = scoredList.find((s) => s.win);
  const aceItem = scoredList.find((s) => !s.win);

  const resultMap = new Map<string, DeepLolScore>();

  scoredList.forEach((item, index) => {
    const isMvp = item.puuid === mvpItem?.puuid;
    const isAce = item.puuid === aceItem?.puuid;
    const scoreVal = Math.round(item.rawScore <= 10 ? item.rawScore * 10 : item.rawScore);

    resultMap.set(item.puuid, {
      score: scoreVal,
      rank: index + 1,
      isMvp,
      isAce,
      tierRating: getTierRating(scoreVal),
    });
  });

  return resultMap;
}

/**
 * Computes minute-by-minute score progression timeline from Riot Match Timeline V5 data.
 * Aligns seamlessly with each participant's final Hero Score at the end of the match.
 */
export function calculateScoreTimeline(
  timeline: any,
  participants: any[],
  matchScores: Map<string, DeepLolScore>
): ScoreTimelinePoint[] {
  if (!timeline?.info?.frames || !Array.isArray(timeline.info.frames) || timeline.info.frames.length < 2) {
    return [];
  }

  const partIdToPuuid = resolveParticipantIdMap(timeline, participants);
  const puuidToPartId = new Map<string, number>();
  for (const [id, puuid] of partIdToPuuid.entries()) {
    puuidToPartId.set(puuid, id);
  }

  const participantByPuuid = new Map<string, any>();
  participants.forEach((p) => {
    if (p?.puuid) participantByPuuid.set(p.puuid, p);
  });

  const frames = timeline.info.frames;
  const totalFrames = frames.length;
  const result: ScoreTimelinePoint[] = [];

  // Track cumulative events per participantId (1..10)
  const playerStats = new Map<
    number,
    {
      kills: number;
      deaths: number;
      assists: number;
      objectives: number;
      wards: number;
    }
  >();
  for (let i = 1; i <= 10; i++) {
    playerStats.set(i, { kills: 0, deaths: 0, assists: 0, objectives: 0, wards: 0 });
  }

  frames.forEach((frame: any, frameIdx: number) => {
    // Accumulate events in this frame
    if (Array.isArray(frame.events)) {
      for (const ev of frame.events) {
        if (ev.type === 'CHAMPION_KILL') {
          if (ev.killerId && playerStats.has(ev.killerId)) {
            playerStats.get(ev.killerId)!.kills += 1;
          }
          if (ev.victimId && playerStats.has(ev.victimId)) {
            playerStats.get(ev.victimId)!.deaths += 1;
          }
          if (Array.isArray(ev.assistingParticipantIds)) {
            for (const aId of ev.assistingParticipantIds) {
              if (playerStats.has(aId)) {
                playerStats.get(aId)!.assists += 1;
              }
            }
          }
        } else if (ev.type === 'BUILDING_KILL' || ev.type === 'ELITE_MONSTER_KILL') {
          const weight =
            ev.type === 'ELITE_MONSTER_KILL' && ev.monsterType === 'BARON_NASHOR'
              ? 2.0
              : ev.type === 'ELITE_MONSTER_KILL' && ev.monsterType === 'HORDE'
              ? 0.4
              : 1.0;
          if (ev.killerId && playerStats.has(ev.killerId)) {
            playerStats.get(ev.killerId)!.objectives += weight;
          }
          if (Array.isArray(ev.assistingParticipantIds)) {
            for (const aId of ev.assistingParticipantIds) {
              if (playerStats.has(aId)) {
                playerStats.get(aId)!.objectives += weight * 0.8;
              }
            }
          }
        } else if (ev.type === 'WARD_PLACED' && ev.creatorId && playerStats.has(ev.creatorId)) {
          playerStats.get(ev.creatorId)!.wards += 0.5;
        } else if (ev.type === 'WARD_KILL' && ev.killerId && playerStats.has(ev.killerId)) {
          playerStats.get(ev.killerId)!.wards += 1.0;
        }
      }
    }

    const playerScores: Record<string, number> = {};
    let blueScoreSum = 0;
    let blueCount = 0;
    let redScoreSum = 0;
    let redCount = 0;

    if (frameIdx === 0) {
      participants.forEach((p) => {
        playerScores[p.puuid] = 50;
        if (p.teamId === 100) {
          blueScoreSum += 50;
          blueCount++;
        } else {
          redScoreSum += 50;
          redCount++;
        }
      });
    } else {
      const currentMinute = frameIdx;
      const progressRatio = frameIdx / Math.max(totalFrames - 1, 1);

      let teamBlueGold = 0;
      let teamRedGold = 0;
      let teamBlueKills = 0;
      let teamRedKills = 0;
      let teamBlueDmg = 0;
      let teamRedDmg = 0;

      participants.forEach((p, idx) => {
        const pId = puuidToPartId.get(p.puuid) ?? idx + 1;
        const pf = frame.participantFrames?.[pId.toString()];
        const stats = playerStats.get(pId);
        const gold = pf?.totalGold || 0;
        const dmg = pf?.damageStats?.totalDamageDoneToChampions || 0;
        const kills = stats?.kills || 0;
        if (p.teamId === 100) {
          teamBlueGold += gold;
          teamBlueKills += kills;
          teamBlueDmg += dmg;
        } else {
          teamRedGold += gold;
          teamRedKills += kills;
          teamRedDmg += dmg;
        }
      });

      participants.forEach((p, idx) => {
        const pId = puuidToPartId.get(p.puuid) ?? idx + 1;
        const pf = frame.participantFrames?.[pId.toString()];
        const stats = playerStats.get(pId) || { kills: 0, deaths: 0, assists: 0, objectives: 0, wards: 0 };
        const isBlue = p.teamId === 100;
        const myTeamGold = isBlue ? teamBlueGold : teamRedGold;
        const myTeamKills = isBlue ? teamBlueKills : teamRedKills;
        const myTeamDmg = isBlue ? teamBlueDmg : teamRedDmg;

        const role = normalizeScoreRole(p.teamPosition);
        const isSupport = role === 'UTILITY';
        const isJungle = role === 'JUNGLE';

        let liveScore = 50.0;

        // Combat & KDA
        const kda = (stats.kills + stats.assists) / Math.max(stats.deaths, 1);
        liveScore += Math.tanh((kda - 2.2) / 2.5) * 16;
        const deathsPerMin = stats.deaths / currentMinute;
        if (deathsPerMin > 0.22) {
          liveScore -= Math.min(14, (deathsPerMin - 0.22) * 45);
        }

        // Kill Participation
        if (myTeamKills > 0) {
          const kp = (stats.kills + stats.assists) / myTeamKills;
          liveScore += Math.tanh((kp - (isSupport ? 0.58 : 0.48)) / 0.22) * 11;
        }

        // Gold Share & Direct Lane Gold Diff
        if (myTeamGold > 0 && pf?.totalGold) {
          const goldShare = pf.totalGold / myTeamGold;
          const expectedGoldShare = isSupport ? 0.135 : 0.215;
          liveScore += Math.tanh((goldShare - expectedGoldShare) / 0.05) * 12;
        }

        const directOpponent =
          role !== 'UNKNOWN' && role !== 'ARAM'
            ? participants.find((ep) => ep.teamId !== p.teamId && normalizeScoreRole(ep.teamPosition) === role)
            : undefined;
        if (directOpponent && pf?.totalGold) {
          const oppId = puuidToPartId.get(directOpponent.puuid);
          const oppPf = oppId ? frame.participantFrames?.[oppId.toString()] : undefined;
          if (oppPf?.totalGold) {
            const diffPerMin = (pf.totalGold - oppPf.totalGold) / currentMinute;
            liveScore += Math.tanh(diffPerMin / 80) * 10;
          }
        }

        // Damage Share (if available in frame damageStats)
        const frameDmg = pf?.damageStats?.totalDamageDoneToChampions || 0;
        if (myTeamDmg > 0 && frameDmg > 0) {
          const expectedDmgShare = isSupport ? 0.09 : isJungle ? 0.18 : 0.24;
          liveScore += Math.tanh((frameDmg / myTeamDmg - expectedDmgShare) / 0.1) * 9;
        }

        // CS/min (non-support)
        if (pf && !isSupport) {
          const totalCs = (pf.minionsKilled || 0) + (pf.jungleMinionsKilled || 0);
          const csPerMin = totalCs / currentMinute;
          const expectedCs = isJungle ? 5.5 : 6.8;
          liveScore += Math.tanh((csPerMin - expectedCs) / 2.2) * 8;
        }

        // Objectives & Vision events
        liveScore += Math.min(8, (stats.objectives / Math.max(currentMinute / 8, 1)) * 3.5);
        if (isSupport) {
          liveScore += Math.min(8, (stats.wards / Math.max(currentMinute / 4, 1)) * 2.5);
        }

        // Smoothly converge to the official final Hero Score at the end of the match
        const rawFinal = matchScores.get(p.puuid)?.score ?? liveScore;
        const finalScore = rawFinal <= 10 ? rawFinal * 10 : rawFinal;
        const anchorBlend = Math.pow(progressRatio, 2.2);
        const blendedScore = liveScore * (1 - anchorBlend) + finalScore * anchorBlend;

        const clamped = Math.min(100, Math.max(10, Math.round(blendedScore)));
        playerScores[p.puuid] = clamped;

        if (isBlue) {
          blueScoreSum += clamped;
          blueCount++;
        } else {
          redScoreSum += clamped;
          redCount++;
        }
      });
    }

    const avgBlue = blueCount > 0 ? Math.round(blueScoreSum / blueCount) : 50;
    const avgRed = redCount > 0 ? Math.round(redScoreSum / redCount) : 50;

    result.push({
      minute: frameIdx,
      blueScore: avgBlue,
      redScore: avgRed,
      diff: avgBlue - avgRed,
      playerScores,
    });
  });

  return result;
}
