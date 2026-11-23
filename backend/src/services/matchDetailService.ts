import { prisma } from '../db/prisma';
import { getRiotClient } from '../riot/client';
import { getQueueName, getClusterForPlatform, getClusterForRegion } from '../riot/regions';
import { getChampionNameById } from '../riot/ddragon';
import { getMatchesLpChanges, MatchLpChange } from './lpService';
import { getPositionSortOrder } from './matchService';
import { calculateMatchScores, calculateScoreTimeline, DeepLolScore, ScoreTimelinePoint } from './scoreService';

// In-memory volatile cache for live match timelines (TTL: 5 minutes)
// Keeps database size at 0 KB while preventing duplicate Riot API requests during active viewing
const timelineMemoryCache = new Map<string, { data: any; expiresAt: number }>();

function getCachedTimeline(matchId: string): any | null {
  const entry = timelineMemoryCache.get(matchId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    timelineMemoryCache.delete(matchId);
    return null;
  }
  return entry.data;
}

function setCachedTimeline(matchId: string, data: any, ttlMs = 5 * 60 * 1000): void {
  // Prune if cache grows too large
  if (timelineMemoryCache.size > 200) {
    const oldestKey = timelineMemoryCache.keys().next().value;
    if (oldestKey) timelineMemoryCache.delete(oldestKey);
  }
  timelineMemoryCache.set(matchId, { data, expiresAt: Date.now() + ttlMs });
}

export interface ObjectiveDetail {
  first: boolean;
  kills: number;
}

export interface TeamMatchDetail {
  teamId: number;
  win: boolean;
  totalKills: number;
  totalDeaths: number;
  totalAssists: number;
  totalGold: number;
  totalDamage: number;
  bans: Array<{ championId: number; championName: string; pickTurn: number }>;
  objectives: {
    baron: ObjectiveDetail;
    dragon: ObjectiveDetail;
    riftHerald: ObjectiveDetail;
    horde: ObjectiveDetail; // voidgrubs
    tower: ObjectiveDetail;
    inhibitor: ObjectiveDetail;
  };
  dragonTypes?: string[];
}

export interface MatchDetailResponse {
  matchId: string;
  cluster: string;
  gameDuration: number;
  gameCreation: number;
  gameEndTimestamp?: number;
  gameMode: string;
  gameVersion: string;
  queueId: number;
  queueName: string;
  blueTeam: TeamMatchDetail;
  redTeam: TeamMatchDetail;
  participants: any[];
  maxDamage: number;
  maxDamageTaken: number;
  goldAdvantageTimeline: Array<{
    minute: number;
    blueGold: number;
    redGold: number;
    diff: number; // positive = blue lead, negative = red lead
  }>;
  scoreTimeline?: ScoreTimelinePoint[];
  lpChange?: MatchLpChange | null;
}

export async function getMatchDetails(
  rawRegion: string,
  matchIdParam: string
): Promise<MatchDetailResponse | null> {
  // Normalize match ID (e.g. 8005107004 -> EUW1_8005107004, or EUW_8005107004 -> EUW1_8005107004)
  let matchId = matchIdParam.trim().toUpperCase();
  if (!matchId.includes('_')) {
    const regUpper = rawRegion.toUpperCase();
    const prefix = regUpper === 'KR' ? 'KR' : regUpper.startsWith('EUN') ? 'EUN1' : regUpper.startsWith('NA') ? 'NA1' : 'EUW1';
    matchId = `${prefix}_${matchId}`;
  } else {
    const [pfx, ...rest] = matchId.split('_');
    const numPart = rest.join('_');
    if (pfx === 'EUW') matchId = `EUW1_${numPart}`;
    else if (pfx === 'EUN' || pfx === 'EUNE') matchId = `EUN1_${numPart}`;
    else if (pfx === 'NA') matchId = `NA1_${numPart}`;
  }

  // 1. Check if match is already in PostgreSQL
  let match = await prisma.match.findUnique({
    where: { id: matchId },
    include: {
      participants: true,
    },
  });

  const cluster = getClusterForRegion(rawRegion);
  const rApi = getRiotClient();

  // If not in database, fetch from Riot Match-v5 immediately!
  if (!match) {
    try {
      const matchData = await rApi.matchV5.getMatchById({
        cluster: cluster as any,
        matchId,
      });

      if (!matchData || !matchData.info) return null;
      const { info, metadata } = matchData;

      const blueTeamInfo = info.teams?.find((t: any) => t.teamId === 100);
      const redTeamInfo = info.teams?.find((t: any) => t.teamId === 200);

      const blueBans = blueTeamInfo?.bans || [];
      const redBans = redTeamInfo?.bans || [];

      const blueObj = (blueTeamInfo?.objectives || {}) as any;
      const redObj = (redTeamInfo?.objectives || {}) as any;

      match = await prisma.match.create({
        data: {
          id: matchId,
          gameCreation: BigInt(info.gameCreation),
          gameDuration: info.gameDuration,
          gameEndTimestamp: info.gameEndTimestamp ? BigInt(info.gameEndTimestamp) : null,
          gameMode: info.gameMode,
          gameType: info.gameType,
          gameVersion: info.gameVersion,
          mapId: info.mapId,
          queueId: info.queueId,
          endOfGameResult: info.endOfGameResult || null,

          // Blue Bans
          blueBan1: blueBans[0]?.championId > 0 ? blueBans[0].championId : null,
          blueBan2: blueBans[1]?.championId > 0 ? blueBans[1].championId : null,
          blueBan3: blueBans[2]?.championId > 0 ? blueBans[2].championId : null,
          blueBan4: blueBans[3]?.championId > 0 ? blueBans[3].championId : null,
          blueBan5: blueBans[4]?.championId > 0 ? blueBans[4].championId : null,

          // Red Bans
          redBan1: redBans[0]?.championId > 0 ? redBans[0].championId : null,
          redBan2: redBans[1]?.championId > 0 ? redBans[1].championId : null,
          redBan3: redBans[2]?.championId > 0 ? redBans[2].championId : null,
          redBan4: redBans[3]?.championId > 0 ? redBans[3].championId : null,
          redBan5: redBans[4]?.championId > 0 ? redBans[4].championId : null,

          // Blue Objectives
          blueTowerKills: blueObj.tower?.kills ?? 0,
          blueInhibitorKills: blueObj.inhibitor?.kills ?? 0,
          blueBaronKills: blueObj.baron?.kills ?? 0,
          blueDragonKills: blueObj.dragon?.kills ?? 0,
          blueRiftHeraldKills: blueObj.riftHerald?.kills ?? 0,
          blueHordeKills: blueObj.horde?.kills ?? 0,
          blueFirstTower: blueObj.tower?.first ?? false,
          blueFirstInhibitor: blueObj.inhibitor?.first ?? false,
          blueFirstBaron: blueObj.baron?.first ?? false,
          blueFirstDragon: blueObj.dragon?.first ?? false,
          blueFirstHorde: blueObj.horde?.first ?? false,
          blueFirstRiftHerald: blueObj.riftHerald?.first ?? false,

          // Red Objectives
          redTowerKills: redObj.tower?.kills ?? 0,
          redInhibitorKills: redObj.inhibitor?.kills ?? 0,
          redBaronKills: redObj.baron?.kills ?? 0,
          redDragonKills: redObj.dragon?.kills ?? 0,
          redRiftHeraldKills: redObj.riftHerald?.kills ?? 0,
          redHordeKills: redObj.horde?.kills ?? 0,
          redFirstTower: redObj.tower?.first ?? false,
          redFirstInhibitor: redObj.inhibitor?.first ?? false,
          redFirstBaron: redObj.baron?.first ?? false,
          redFirstDragon: redObj.dragon?.first ?? false,
          redFirstHorde: redObj.horde?.first ?? false,
          redFirstRiftHerald: redObj.riftHerald?.first ?? false,

          participants: {
            create: info.participants.map((p) => {
              const kdaValue = p.deaths === 0
                ? p.kills + p.assists
                : Number(((p.kills + p.assists) / p.deaths).toFixed(2));
              return {
                puuid: p.puuid,
                riotIdGameName: p.riotIdName || (p as any).riotIdGameName || p.summonerName || 'Unknown',
                riotIdTagline: p.riotIdTagline || '',
                championId: p.championId,
                championName: p.championName,
                champLevel: p.champLevel || 1,
                teamId: p.teamId,
                win: p.win,
                role: p.role || null,
                lane: p.lane || null,
                teamPosition: p.teamPosition || null,
                kills: p.kills,
                deaths: p.deaths,
                assists: p.assists,
                kda: kdaValue,
                totalDamageDealtToChampions: p.totalDamageDealtToChampions,
                physicalDamageDealtToChampions: p.physicalDamageDealtToChampions || 0,
                magicDamageDealtToChampions: p.magicDamageDealtToChampions || 0,
                trueDamageDealtToChampions: p.trueDamageDealtToChampions || 0,
                totalDamageTaken: p.totalDamageTaken,
                totalHeal: p.totalHeal || 0,
                totalMinionsKilled: p.totalMinionsKilled,
                neutralMinionsKilled: p.neutralMinionsKilled,
                visionScore: p.visionScore,
                visionWardsBoughtInGame: p.visionWardsBoughtInGame,
                wardsPlaced: p.wardsPlaced,
                wardsKilled: p.wardsKilled,
                goldEarned: p.goldEarned,
                goldSpent: p.goldSpent,
                item0: p.item0,
                item1: p.item1,
                item2: p.item2,
                item3: p.item3,
                item4: p.item4,
                item5: p.item5,
                item6: p.item6,
                summoner1Id: p.summoner1Id,
                summoner2Id: p.summoner2Id,
                primaryRune: p.perks?.styles?.[0]?.selections?.[0]?.perk || null,
                primaryStyle: p.perks?.styles?.[0]?.style || null,
                secondaryStyle: p.perks?.styles?.[1]?.style || null,
                perksJson: p.perks as any || null,
              };
            }),
          },
        },
        include: {
          participants: true,
        },
      });
    } catch (err: any) {
      console.error(`[MatchDetails] Failed to fetch match ${matchId}:`, err.message);
      return null;
    }
  }

  if (!match) {
    return null;
  }

  // 2. Fetch Timeline LIVE on-the-fly from Riot API (NEVER persisted to PostgreSQL!)
  let timeline = getCachedTimeline(matchId);
  if (!timeline) {
    try {
      timeline = await rApi.matchV5.getMatchTimelineById({
        cluster: cluster as any,
        matchId,
      });
      if (timeline) {
        setCachedTimeline(matchId, timeline);
      }
    } catch (err: any) {
      // Timeline might not be available for very old matches
      console.warn(`[MatchDetails] Live timeline fetch failed for ${matchId}:`, err?.message || err);
    }
  }

  // 3. Process Teams and Objectives
  const participants = match.participants || [];
  const durationMinutes = match.gameDuration / 60;

  const blueTotalKills = participants.filter((p) => p.teamId === 100).reduce((acc, p) => acc + p.kills, 0);
  const redTotalKills = participants.filter((p) => p.teamId === 200).reduce((acc, p) => acc + p.kills, 0);
  const blueTotalDamage = participants.filter((p) => p.teamId === 100).reduce((acc, p) => acc + p.totalDamageDealtToChampions, 0);
  const redTotalDamage = participants.filter((p) => p.teamId === 200).reduce((acc, p) => acc + p.totalDamageDealtToChampions, 0);

  // Resolve genuine match-to-match LP changes for participants if ranked
  const lpChangeMap = new Map<string, MatchLpChange>();
  if (match.queueId === 420 || match.queueId === 440) {
    await Promise.all(
      participants.map(async (p) => {
        try {
          const map = await getMatchesLpChanges(p.puuid, [
            {
              id: match.id,
              queueId: match.queueId,
              gameCreation: match.gameCreation,
              win: p.win,
            },
          ]);
          const change = map.get(match.id);
          if (change) {
            lpChangeMap.set(p.puuid, change);
          }
        } catch {
          // Ignore lookup errors
        }
      })
    );
  }

  const matchScores = calculateMatchScores(participants, match.gameDuration);

  const formattedParticipants = await Promise.all(
    participants.map(async (p) => {
      const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
      const csPerMinute = durationMinutes > 0 ? Number((cs / durationMinutes).toFixed(1)) : 0;
      const kda = p.deaths === 0 ? p.kills + p.assists : Number(((p.kills + p.assists) / p.deaths).toFixed(2));
      const teamKills = p.teamId === 100 ? blueTotalKills : redTotalKills;
      const teamDmg = p.teamId === 100 ? blueTotalDamage : redTotalDamage;
      const killParticipation = teamKills > 0 ? Math.round(((p.kills + p.assists) / teamKills) * 100) : 0;
      const damageShare = teamDmg > 0 ? Math.round((p.totalDamageDealtToChampions / teamDmg) * 100) : 0;

      const lpChange: MatchLpChange | null = lpChangeMap.get(p.puuid) || null;
      const score = matchScores.get(p.puuid);

      return {
        id: p.id,
        puuid: p.puuid,
        riotIdGameName: p.riotIdGameName,
        riotIdTagline: p.riotIdTagline,
        championId: p.championId,
        championName: p.championName,
        champLevel: p.champLevel,
        teamId: p.teamId,
        win: p.win,
        role: p.role,
        lane: p.lane,
        teamPosition: p.teamPosition,
        kills: p.kills,
        deaths: p.deaths,
        assists: p.assists,
        kda,
        killParticipation,
        damageShare,
        totalDamageDealtToChampions: p.totalDamageDealtToChampions,
        physicalDamageDealtToChampions: p.physicalDamageDealtToChampions || 0,
        magicDamageDealtToChampions: p.magicDamageDealtToChampions || 0,
        trueDamageDealtToChampions: p.trueDamageDealtToChampions || 0,
        totalDamageTaken: p.totalDamageTaken,
        totalHeal: p.totalHeal || 0,
        cs,
        csPerMinute,
        visionScore: p.visionScore,
        wardsPlaced: p.wardsPlaced,
        wardsKilled: p.wardsKilled,
        controlWards: p.visionWardsBoughtInGame || 0,
        goldEarned: p.goldEarned,
        goldSpent: p.goldSpent,
        items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
        spells: [p.summoner1Id, p.summoner2Id],
        primaryRune: p.primaryRune,
        primaryStyle: p.primaryStyle,
        secondaryStyle: p.secondaryStyle,
        lpChange,
        score,
      };
    })
  );

  const blueParticipants = formattedParticipants
    .filter((p) => p.teamId === 100)
    .sort((a, b) => getPositionSortOrder(a) - getPositionSortOrder(b));
  const redParticipants = formattedParticipants
    .filter((p) => p.teamId === 200)
    .sort((a, b) => getPositionSortOrder(a) - getPositionSortOrder(b));

  const formatBans = async (rawBans: Array<number | null>) => {
    const bans = [];
    for (let i = 0; i < rawBans.length; i++) {
      const cid = rawBans[i];
      if (cid && cid > 0) {
        const champName = await getChampionNameById(cid);
        bans.push({
          championId: cid,
          championName: champName,
          pickTurn: i + 1,
        });
      }
    }
    return bans;
  };

  const blueBans = await formatBans([match.blueBan1, match.blueBan2, match.blueBan3, match.blueBan4, match.blueBan5]);
  const redBans = await formatBans([match.redBan1, match.redBan2, match.redBan3, match.redBan4, match.redBan5]);

  // Extract dragon types if timeline is available
  const blueDragonTypes: string[] = [];
  const redDragonTypes: string[] = [];

  if (timeline?.info?.frames) {
    for (const frame of timeline.info.frames) {
      if (Array.isArray(frame.events)) {
        for (const ev of frame.events) {
          if (ev.type === 'ELITE_MONSTER_KILL' && ev.monsterType === 'DRAGON') {
            const subType = ev.monsterSubType || 'NORMAL_DRAGON';
            if (ev.killerTeamId === 100) {
              blueDragonTypes.push(subType);
            } else if (ev.killerTeamId === 200) {
              redDragonTypes.push(subType);
            }
          }
        }
      }
    }
  }

  const blueTeam: TeamMatchDetail = {
    teamId: 100,
    win: blueParticipants.some((p) => p.win),
    totalKills: blueParticipants.reduce((acc, p) => acc + p.kills, 0),
    totalDeaths: blueParticipants.reduce((acc, p) => acc + p.deaths, 0),
    totalAssists: blueParticipants.reduce((acc, p) => acc + p.assists, 0),
    totalGold: blueParticipants.reduce((acc, p) => acc + p.goldEarned, 0),
    totalDamage: blueParticipants.reduce((acc, p) => acc + p.totalDamageDealtToChampions, 0),
    bans: blueBans,
    objectives: {
      baron: { first: match.blueFirstBaron, kills: match.blueBaronKills },
      dragon: { first: match.blueFirstDragon, kills: match.blueDragonKills || blueDragonTypes.length },
      riftHerald: { first: match.blueFirstRiftHerald, kills: match.blueRiftHeraldKills },
      horde: { first: match.blueFirstHorde, kills: match.blueHordeKills },
      tower: { first: match.blueFirstTower, kills: match.blueTowerKills },
      inhibitor: { first: match.blueFirstInhibitor, kills: match.blueInhibitorKills },
    },
    dragonTypes: blueDragonTypes,
  };

  const redTeam: TeamMatchDetail = {
    teamId: 200,
    win: redParticipants.some((p) => p.win),
    totalKills: redParticipants.reduce((acc, p) => acc + p.kills, 0),
    totalDeaths: redParticipants.reduce((acc, p) => acc + p.deaths, 0),
    totalAssists: redParticipants.reduce((acc, p) => acc + p.assists, 0),
    totalGold: redParticipants.reduce((acc, p) => acc + p.goldEarned, 0),
    totalDamage: redParticipants.reduce((acc, p) => acc + p.totalDamageDealtToChampions, 0),
    bans: redBans,
    objectives: {
      baron: { first: match.redFirstBaron, kills: match.redBaronKills },
      dragon: { first: match.redFirstDragon, kills: match.redDragonKills || redDragonTypes.length },
      riftHerald: { first: match.redFirstRiftHerald, kills: match.redRiftHeraldKills },
      horde: { first: match.redFirstHorde, kills: match.redHordeKills },
      tower: { first: match.redFirstTower, kills: match.redTowerKills },
      inhibitor: { first: match.redFirstInhibitor, kills: match.redInhibitorKills },
    },
    dragonTypes: redDragonTypes,
  };

  // 4. Compute minute-by-minute gold advantage timeline
  const goldAdvantageTimeline: Array<{ minute: number; blueGold: number; redGold: number; diff: number }> = [];

  if (timeline?.info?.frames && Array.isArray(timeline.info.frames)) {
    timeline.info.frames.forEach((frame: any, idx: number) => {
      let blueFrameGold = 0;
      let redFrameGold = 0;

      if (frame.participantFrames) {
        Object.values(frame.participantFrames).forEach((pf: any) => {
          const partId = pf.participantId;
          // participants 1-5 = blue team, 6-10 = red team
          if (partId >= 1 && partId <= 5) {
            blueFrameGold += (pf.totalGold || 0);
          } else {
            redFrameGold += (pf.totalGold || 0);
          }
        });
      }

      goldAdvantageTimeline.push({
        minute: idx,
        blueGold: blueFrameGold,
        redGold: redFrameGold,
        diff: blueFrameGold - redFrameGold,
      });
    });
  }

  const maxDamage = Math.max(...formattedParticipants.map((p) => p.totalDamageDealtToChampions), 1);
  const maxDamageTaken = Math.max(...formattedParticipants.map((p) => p.totalDamageTaken), 1);

  // Compute minute-by-minute score progression timeline (DeepLoL style)
  const scoreTimeline = calculateScoreTimeline(timeline, participants, matchScores);

  // Default overall match LP change from first participant with LP or first participant
  const matchOverallLpChange = formattedParticipants.find((p) => p.lpChange)?.lpChange || null;

  return {
    matchId: match.id,
    cluster,
    gameDuration: match.gameDuration,
    gameCreation: Number(match.gameCreation),
    gameEndTimestamp: match.gameEndTimestamp
      ? Number(match.gameEndTimestamp)
      : Number(match.gameCreation) + match.gameDuration * 1000,
    gameMode: match.gameMode,
    gameVersion: match.gameVersion,
    queueId: match.queueId,
    queueName: getQueueName(match.queueId),
    blueTeam,
    redTeam,
    participants: formattedParticipants,
    maxDamage,
    maxDamageTaken,
    goldAdvantageTimeline,
    scoreTimeline,
    lpChange: matchOverallLpChange,
  };
}
