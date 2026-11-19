import { prisma } from '../db/prisma';
import { getRiotClient } from '../riot/client';
import { getQueueName, getClusterForPlatform, getClusterForRegion } from '../riot/regions';
import { getChampionNameById } from '../riot/ddragon';
import { getMatchesLpChanges, MatchLpChange } from './lpService';

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
  lpChange?: MatchLpChange | null;
}

export async function getMatchDetails(
  rawRegion: string,
  matchIdParam: string
): Promise<MatchDetailResponse | null> {
  // Normalize match ID (e.g. 8005107004 -> EUW1_8005107004 if needed)
  let matchId = matchIdParam.trim();
  if (!matchId.includes('_')) {
    const prefix = rawRegion.toUpperCase().startsWith('EUW') ? 'EUW1' : `${rawRegion.toUpperCase()}1`;
    matchId = `${prefix}_${matchId}`;
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

      match = await prisma.match.create({
        data: {
          id: matchId,
          cluster,
          dataVersion: metadata.dataVersion || '2',
          gameCreation: BigInt(info.gameCreation),
          gameDuration: info.gameDuration,
          gameEndTimestamp: info.gameEndTimestamp ? BigInt(info.gameEndTimestamp) : null,
          gameId: BigInt(info.gameId),
          gameMode: info.gameMode,
          gameType: info.gameType,
          gameVersion: info.gameVersion,
          mapId: info.mapId,
          queueId: info.queueId,
          tournamentCode: info.tournamentCode || null,
          endOfGameResult: info.endOfGameResult || null,
          teamsJson: info.teams as any || null,
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
                challengesJson: p.challenges as any || null,
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

  // 2. Fetch Timeline if not cached in DB
  let timeline = (match as any).timelineJson;
  if (!timeline) {
    try {
      timeline = await rApi.matchV5.getMatchTimelineById({
        cluster: cluster as any,
        matchId,
      });
      // Save timeline to DB
      await prisma.match.update({
        where: { id: matchId },
        data: { timelineJson: timeline as any },
      });
    } catch {
      // Timeline might not be available for very old matches
    }
  }

  // 3. Process Teams and Objectives
  const rawTeams = (match as any).teamsJson as any[] || [];
  const blueTeamRaw = rawTeams.find((t) => t.teamId === 100) || {};
  const redTeamRaw = rawTeams.find((t) => t.teamId === 200) || {};

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
      };
    })
  );

  const blueParticipants = formattedParticipants.filter((p) => p.teamId === 100);
  const redParticipants = formattedParticipants.filter((p) => p.teamId === 200);

  const formatBans = async (rawBans: any[] = []) => {
    const bans = [];
    for (const b of rawBans) {
      if (b.championId > 0) {
        const champName = await getChampionNameById(b.championId);
        bans.push({
          championId: b.championId,
          championName: champName,
          pickTurn: b.pickTurn,
        });
      }
    }
    return bans;
  };

  const blueBans = await formatBans(blueTeamRaw.bans);
  const redBans = await formatBans(redTeamRaw.bans);

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

  const blueObjectives = blueTeamRaw.objectives || {};
  const redObjectives = redTeamRaw.objectives || {};

  const blueTeam: TeamMatchDetail = {
    teamId: 100,
    win: blueTeamRaw.win || blueParticipants.some((p) => p.win),
    totalKills: blueParticipants.reduce((acc, p) => acc + p.kills, 0),
    totalDeaths: blueParticipants.reduce((acc, p) => acc + p.deaths, 0),
    totalAssists: blueParticipants.reduce((acc, p) => acc + p.assists, 0),
    totalGold: blueParticipants.reduce((acc, p) => acc + p.goldEarned, 0),
    totalDamage: blueParticipants.reduce((acc, p) => acc + p.totalDamageDealtToChampions, 0),
    bans: blueBans,
    objectives: {
      baron: blueObjectives.baron || { first: false, kills: 0 },
      dragon: blueObjectives.dragon || { first: false, kills: blueDragonTypes.length },
      riftHerald: blueObjectives.riftHerald || { first: false, kills: 0 },
      horde: blueObjectives.horde || { first: false, kills: 0 },
      tower: blueObjectives.tower || { first: false, kills: 0 },
      inhibitor: blueObjectives.inhibitor || { first: false, kills: 0 },
    },
    dragonTypes: blueDragonTypes,
  };

  const redTeam: TeamMatchDetail = {
    teamId: 200,
    win: redTeamRaw.win || redParticipants.some((p) => p.win),
    totalKills: redParticipants.reduce((acc, p) => acc + p.kills, 0),
    totalDeaths: redParticipants.reduce((acc, p) => acc + p.deaths, 0),
    totalAssists: redParticipants.reduce((acc, p) => acc + p.assists, 0),
    totalGold: redParticipants.reduce((acc, p) => acc + p.goldEarned, 0),
    totalDamage: redParticipants.reduce((acc, p) => acc + p.totalDamageDealtToChampions, 0),
    bans: redBans,
    objectives: {
      baron: redObjectives.baron || { first: false, kills: 0 },
      dragon: redObjectives.dragon || { first: false, kills: redDragonTypes.length },
      riftHerald: redObjectives.riftHerald || { first: false, kills: 0 },
      horde: redObjectives.horde || { first: false, kills: 0 },
      tower: redObjectives.tower || { first: false, kills: 0 },
      inhibitor: redObjectives.inhibitor || { first: false, kills: 0 },
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

  // Default overall match LP change from first participant with LP or first participant
  const matchOverallLpChange = formattedParticipants.find((p) => p.lpChange)?.lpChange || null;

  return {
    matchId: match.id,
    cluster: match.cluster,
    gameDuration: match.gameDuration,
    gameCreation: Number(match.gameCreation),
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
    lpChange: matchOverallLpChange,
  };
}
