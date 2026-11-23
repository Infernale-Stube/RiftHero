import { prisma } from '../db/prisma';
import { getQueueName, mapQueueFilterToId } from '../riot/regions';
import { getChampionNameByIdSync } from '../riot/ddragon';
import { getMatchesLpChanges, MatchLpChange } from './lpService';
import { buildScoresFromSavedHeroScores, DeepLolScore } from './scoreService';

export interface FormattedMatchParticipant {
  puuid: string;
  riotIdGameName: string;
  riotIdTagline: string;
  championId: number;
  championName: string;
  champLevel: number;
  teamId: number;
  win: boolean;
  role: string | null;
  lane: string | null;
  teamPosition: string | null;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  totalDamageDealtToChampions: number;
  totalDamageTaken: number;
  cs: number;
  csPerMinute: number;
  visionScore: number;
  wardsPlaced: number;
  wardsKilled: number;
  controlWards: number;
  goldEarned: number;
  items: number[];
  spells: number[];
  primaryRune: number | null;
  secondaryStyle: number | null;
  killParticipation?: number;
  damageShare?: number;
  heroScore?: number | null;
  score?: DeepLolScore;
  lpChange?: MatchLpChange | null;
  largestMultiKill?: number;
  doubleKills?: number;
  tripleKills?: number;
  quadraKills?: number;
  pentaKills?: number;
  gameEndedInSurrender?: boolean;
  gameEndedInEarlySurrender?: boolean;
}

export interface TeamTotals {
  kills: number;
  deaths: number;
  assists: number;
  gold: number;
  damage: number;
}

export interface FormattedMatch {
  matchId: string;
  gameDuration: number;
  gameCreation: number;
  gameEndTimestamp?: number;
  queueId: number;
  queueName: string;
  win: boolean;
  isRemake?: boolean;
  isSurrender?: boolean;
  isNew?: boolean;
  participant: FormattedMatchParticipant;
  blueTeam: FormattedMatchParticipant[];
  redTeam: FormattedMatchParticipant[];
  blueTeamTotals: TeamTotals;
  redTeamTotals: TeamTotals;
  maxDamage: number;
  lpChange?: MatchLpChange | null;
  teams?: any[];
}

export function getPositionSortOrder(p: {
  individualPosition?: string | null;
  teamPosition?: string | null;
  lane?: string | null;
  role?: string | null;
}): number {
  const pos = (p.teamPosition || p.individualPosition || p.lane || '').toUpperCase();
  if (pos === 'TOP') return 1;
  if (pos === 'JUNGLE') return 2;
  if (pos === 'MIDDLE' || pos === 'MID') return 3;
  if (pos === 'BOTTOM' || pos === 'BOT' || pos === 'ADC') return 4;
  if (pos === 'UTILITY' || pos === 'SUPPORT') return 5;
  return 6;
}

function formatParticipant(
  p: any,
  durationMinutes: number,
  teamKills = 0,
  teamDamage = 0
): FormattedMatchParticipant {
  const cs = p.totalMinionsKilled;
  const csPerMinute = durationMinutes > 0 ? Number((cs / durationMinutes).toFixed(1)) : 0;
  const kdaCalc = p.deaths === 0 ? p.kills + p.assists : Number(((p.kills + p.assists) / p.deaths).toFixed(2));
  const killParticipation = teamKills > 0 ? Math.round(((p.kills + p.assists) / teamKills) * 100) : 0;
  const damageShare = teamDamage > 0 ? Math.round((p.totalDamageDealtToChampions / teamDamage) * 100) : 0;

  return {
    puuid: p.puuid,
    riotIdGameName: p.riotIdGameName,
    riotIdTagline: p.riotIdTagline,
    championId: p.championId,
    championName: getChampionNameByIdSync(p.championId),
    champLevel: p.champLevel || 1,
    teamId: p.teamId,
    win: p.win,
    role: p.individualPosition || null,
    lane: p.individualPosition || null,
    teamPosition: p.individualPosition || null,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    kda: kdaCalc,
    killParticipation,
    damageShare,
    totalDamageDealtToChampions: p.totalDamageDealtToChampions,
    totalDamageTaken: p.totalDamageTaken,
    cs,
    csPerMinute,
    visionScore: p.visionScore,
    wardsPlaced: p.wardsPlaced,
    wardsKilled: p.wardsKilled,
    controlWards: p.visionWardsBoughtInGame || 0,
    goldEarned: p.goldEarned,
    items: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6],
    spells: [p.summoner1Id, p.summoner2Id],
    primaryRune: p.primaryRune,
    secondaryStyle: p.secondaryStyle,
    largestMultiKill: undefined,
    doubleKills: 0,
    tripleKills: 0,
    quadraKills: 0,
    pentaKills: 0,
    gameEndedInSurrender: false,
    gameEndedInEarlySurrender: false,
  };
}

export async function getSummonerMatches(
  puuid: string,
  options: {
    queueFilter?: string;
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ matches: FormattedMatch[]; total: number }> {
  const { queueFilter, limit = 10, offset = 0 } = options;
  const queueIds = mapQueueFilterToId(queueFilter);

  const matchWhere: any = {};
  if (queueIds && queueIds.length > 0) {
    matchWhere.queueId = { in: queueIds };
  }

  // Find participants matching the target puuid
  const [total, userParticipations] = await Promise.all([
    prisma.matchParticipant.count({
      where: {
        puuid,
        match: matchWhere,
      },
    }),
    prisma.matchParticipant.findMany({
      where: {
        puuid,
        match: matchWhere,
      },
      include: {
        match: {
          include: {
            participants: true,
          },
        },
      },
      orderBy: {
        match: {
          gameCreation: 'desc',
        },
      },
      skip: offset,
      take: limit,
    }),
  ]);

  // Resolve LP Changes for target summoner's matches
  const lpMap = await getMatchesLpChanges(
    puuid,
    userParticipations.map((up) => ({
      id: up.match.id,
      queueId: up.match.queueId,
      gameCreation: up.match.gameCreation,
      win: up.win,
    }))
  );

  const matches: FormattedMatch[] = userParticipations.map((up) => {
    const m = up.match;
    const durationMinutes = m.gameDuration / 60;
    const allParticipants = m.participants || [];

    const blueTotalKills = allParticipants.filter((p) => p.teamId === 100).reduce((acc, p) => acc + p.kills, 0);
    const redTotalKills = allParticipants.filter((p) => p.teamId === 200).reduce((acc, p) => acc + p.kills, 0);
    const blueTotalDmg = allParticipants.filter((p) => p.teamId === 100).reduce((acc, p) => acc + p.totalDamageDealtToChampions, 0);
    const redTotalDmg = allParticipants.filter((p) => p.teamId === 200).reduce((acc, p) => acc + p.totalDamageDealtToChampions, 0);

    const matchScores = buildScoresFromSavedHeroScores(allParticipants);

    const formattedParticipants = allParticipants.map((p) => {
      const isBlue = p.teamId === 100;
      const formatted = formatParticipant(
        p,
        durationMinutes,
        isBlue ? blueTotalKills : redTotalKills,
        isBlue ? blueTotalDmg : redTotalDmg
      );
      formatted.score = matchScores.get(p.puuid);
      formatted.heroScore = p.heroScore ?? null;
      return formatted;
    });
    const blueTeam = formattedParticipants
      .filter((p) => p.teamId === 100)
      .sort((a, b) => getPositionSortOrder(a) - getPositionSortOrder(b));
    const redTeam = formattedParticipants
      .filter((p) => p.teamId === 200)
      .sort((a, b) => getPositionSortOrder(a) - getPositionSortOrder(b));

    const blueTeamTotals: TeamTotals = {
      kills: blueTotalKills,
      deaths: blueTeam.reduce((acc, p) => acc + p.deaths, 0),
      assists: blueTeam.reduce((acc, p) => acc + p.assists, 0),
      gold: blueTeam.reduce((acc, p) => acc + p.goldEarned, 0),
      damage: blueTotalDmg,
    };

    const redTeamTotals: TeamTotals = {
      kills: redTotalKills,
      deaths: redTeam.reduce((acc, p) => acc + p.deaths, 0),
      assists: redTeam.reduce((acc, p) => acc + p.assists, 0),
      gold: redTeam.reduce((acc, p) => acc + p.goldEarned, 0),
      damage: redTotalDmg,
    };

    const maxDamage = Math.max(
      ...formattedParticipants.map((p) => p.totalDamageDealtToChampions),
      1
    );

    const isCurrentBlue = up.teamId === 100;
    const currentFormatted = formatParticipant(
      up,
      durationMinutes,
      isCurrentBlue ? blueTotalKills : redTotalKills,
      isCurrentBlue ? blueTotalDmg : redTotalDmg
    );

    const matchLpChange = lpMap.get(m.id) || null;
    currentFormatted.lpChange = matchLpChange;
    currentFormatted.score = matchScores.get(up.puuid);

    const isRemake = m.gameDuration < 300;
    const isSurrender = false;
    const gameEndTimestamp = m.gameEndTimestamp
      ? Number(m.gameEndTimestamp)
      : Number(m.gameCreation) + m.gameDuration * 1000;

    return {
      matchId: m.id,
      gameDuration: m.gameDuration,
      gameCreation: Number(m.gameCreation),
      gameEndTimestamp,
      queueId: m.queueId,
      queueName: getQueueName(m.queueId),
      win: up.win,
      isRemake,
      isSurrender,
      isNew: false,
      participant: currentFormatted,
      blueTeam,
      redTeam,
      blueTeamTotals,
      redTeamTotals,
      maxDamage,
      lpChange: matchLpChange,
      teams: [
        {
          teamId: 100,
          bans: [
            { championId: m.blueBan1 ?? -1 },
            { championId: m.blueBan2 ?? -1 },
            { championId: m.blueBan3 ?? -1 },
            { championId: m.blueBan4 ?? -1 },
            { championId: m.blueBan5 ?? -1 },
          ],
          objectives: {
            tower: { kills: m.blueTowerKills },
            inhibitor: { kills: m.blueInhibitorKills },
            baron: { kills: m.blueBaronKills },
            dragon: { kills: m.blueDragonKills },
            riftHerald: { kills: m.blueRiftHeraldKills },
            horde: { kills: m.blueHordeKills },
          },
        },
        {
          teamId: 200,
          bans: [
            { championId: m.redBan1 ?? -1 },
            { championId: m.redBan2 ?? -1 },
            { championId: m.redBan3 ?? -1 },
            { championId: m.redBan4 ?? -1 },
            { championId: m.redBan5 ?? -1 },
          ],
          objectives: {
            tower: { kills: m.redTowerKills },
            inhibitor: { kills: m.redInhibitorKills },
            baron: { kills: m.redBaronKills },
            dragon: { kills: m.redDragonKills },
            riftHerald: { kills: m.redRiftHeraldKills },
            horde: { kills: m.redHordeKills },
          },
        },
      ],
    };
  });

  return { matches, total };
}

export interface ChampionStatSummary {
  championId: number;
  championName: string;
  games: number;
  wins: number;
  losses: number;
  winrate: number;
  kills: number;
  deaths: number;
  assists: number;
  kda: number;
  avgCs: number;
  avgCsPerMin: number;
  avgDamage: number;
  avgDamageTaken: number;
  avgGold: number;
  avgVisionScore: number;
  doubleKills: number;
  tripleKills: number;
  quadraKills: number;
  pentaKills: number;
  maxKills: number;
  maxDeaths: number;
  roles: Record<string, number>;
  primaryRole: string;
}

export async function getSummonerChampionStats(
  puuid: string,
  queueFilter?: string
): Promise<ChampionStatSummary[]> {
  const queueIds = mapQueueFilterToId(queueFilter);
  const matchWhere: any = {};
  if (queueIds && queueIds.length > 0) {
    matchWhere.queueId = { in: queueIds };
  }

  const participations = await prisma.matchParticipant.findMany({
    where: {
      puuid,
      match: matchWhere,
    },
    include: {
      match: {
        select: {
          gameDuration: true,
        },
      },
    },
  });

  const map = new Map<number, {
    championId: number;
    championName: string;
    games: number;
    wins: number;
    losses: number;
    totalKills: number;
    totalDeaths: number;
    totalAssists: number;
    totalCs: number;
    totalDuration: number;
    totalDamage: number;
    totalDamageTaken: number;
    totalGold: number;
    totalVision: number;
    maxKills: number;
    maxDeaths: number;
    doubleKills: number;
    tripleKills: number;
    quadraKills: number;
    pentaKills: number;
    roles: Record<string, number>;
  }>();

  for (const p of participations) {
    const existing = map.get(p.championId) || {
      championId: p.championId,
      championName: getChampionNameByIdSync(p.championId),
      games: 0,
      wins: 0,
      losses: 0,
      totalKills: 0,
      totalDeaths: 0,
      totalAssists: 0,
      totalCs: 0,
      totalDuration: 0,
      totalDamage: 0,
      totalDamageTaken: 0,
      totalGold: 0,
      totalVision: 0,
      maxKills: 0,
      maxDeaths: 0,
      doubleKills: 0,
      tripleKills: 0,
      quadraKills: 0,
      pentaKills: 0,
      roles: {},
    };

    existing.games += 1;
    if (p.win) existing.wins += 1;
    else existing.losses += 1;

    existing.totalKills += p.kills;
    existing.totalDeaths += p.deaths;
    existing.totalAssists += p.assists;
    existing.totalCs += p.totalMinionsKilled;
    existing.totalDuration += p.match.gameDuration;
    existing.totalDamage += p.totalDamageDealtToChampions || 0;
    existing.totalDamageTaken += p.totalDamageTaken || 0;
    existing.totalGold += p.goldEarned || 0;
    existing.totalVision += p.visionScore || 0;

    if (p.kills > existing.maxKills) existing.maxKills = p.kills;
    if (p.deaths > existing.maxDeaths) existing.maxDeaths = p.deaths;

    // Track lane / role
    const pos = p.individualPosition || 'UNKNOWN';
    if (pos && pos !== 'NONE' && pos !== 'UNKNOWN') {
      existing.roles[pos] = (existing.roles[pos] || 0) + 1;
    }

    map.set(p.championId, existing);
  }

  const summaries: ChampionStatSummary[] = [];
  for (const item of map.values()) {
    const winrate = Math.round((item.wins / item.games) * 100);
    const avgKills = Number((item.totalKills / item.games).toFixed(1));
    const avgDeaths = Number((item.totalDeaths / item.games).toFixed(1));
    const avgAssists = Number((item.totalAssists / item.games).toFixed(1));
    const kda = item.totalDeaths === 0
      ? Number((item.totalKills + item.totalAssists).toFixed(2))
      : Number(((item.totalKills + item.totalAssists) / item.totalDeaths).toFixed(2));
    const avgCs = Math.round(item.totalCs / item.games);
    const totalMinutes = item.totalDuration / 60;
    const avgCsPerMin = totalMinutes > 0 ? Number((item.totalCs / totalMinutes).toFixed(1)) : 0;
    const avgDamage = Math.round(item.totalDamage / item.games);
    const avgDamageTaken = Math.round(item.totalDamageTaken / item.games);
    const avgGold = Math.round(item.totalGold / item.games);
    const avgVisionScore = Number((item.totalVision / item.games).toFixed(1));

    // Determine primary role
    let primaryRole = 'UNKNOWN';
    let maxRoleCount = 0;
    for (const [role, count] of Object.entries(item.roles)) {
      if (count > maxRoleCount) {
        maxRoleCount = count;
        primaryRole = role;
      }
    }

    summaries.push({
      championId: item.championId,
      championName: item.championName,
      games: item.games,
      wins: item.wins,
      losses: item.losses,
      winrate,
      kills: avgKills,
      deaths: avgDeaths,
      assists: avgAssists,
      kda,
      avgCs,
      avgCsPerMin,
      avgDamage,
      avgDamageTaken,
      avgGold,
      avgVisionScore,
      doubleKills: item.doubleKills,
      tripleKills: item.tripleKills,
      quadraKills: item.quadraKills,
      pentaKills: item.pentaKills,
      maxKills: item.maxKills,
      maxDeaths: item.maxDeaths,
      roles: item.roles,
      primaryRole,
    });
  }

  summaries.sort((a, b) => b.games - a.games);
  return summaries;
}
