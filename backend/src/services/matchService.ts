import { prisma } from '../db/prisma';
import { getQueueName, mapQueueFilterToId } from '../riot/regions';

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
  queueId: number;
  queueName: string;
  win: boolean;
  participant: FormattedMatchParticipant;
  blueTeam: FormattedMatchParticipant[];
  redTeam: FormattedMatchParticipant[];
  blueTeamTotals: TeamTotals;
  redTeamTotals: TeamTotals;
  maxDamage: number;
}

function formatParticipant(p: any, durationMinutes: number): FormattedMatchParticipant {
  const cs = p.totalMinionsKilled + p.neutralMinionsKilled;
  const csPerMinute = durationMinutes > 0 ? Number((cs / durationMinutes).toFixed(1)) : 0;
  const kdaCalc = p.deaths === 0 ? p.kills + p.assists : Number(((p.kills + p.assists) / p.deaths).toFixed(2));

  return {
    puuid: p.puuid,
    riotIdGameName: p.riotIdGameName,
    riotIdTagline: p.riotIdTagline,
    championId: p.championId,
    championName: p.championName,
    champLevel: p.champLevel || 1,
    teamId: p.teamId,
    win: p.win,
    role: p.role,
    lane: p.lane,
    kills: p.kills,
    deaths: p.deaths,
    assists: p.assists,
    kda: kdaCalc,
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
  const { queueFilter, limit = 20, offset = 0 } = options;
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

  const matches: FormattedMatch[] = userParticipations.map((up) => {
    const m = up.match;
    const durationMinutes = m.gameDuration / 60;
    const allParticipants = m.participants || [];

    const formattedParticipants = allParticipants.map((p) => formatParticipant(p, durationMinutes));
    const blueTeam = formattedParticipants.filter((p) => p.teamId === 100);
    const redTeam = formattedParticipants.filter((p) => p.teamId === 200);

    const blueTeamTotals: TeamTotals = {
      kills: blueTeam.reduce((acc, p) => acc + p.kills, 0),
      deaths: blueTeam.reduce((acc, p) => acc + p.deaths, 0),
      assists: blueTeam.reduce((acc, p) => acc + p.assists, 0),
      gold: blueTeam.reduce((acc, p) => acc + p.goldEarned, 0),
      damage: blueTeam.reduce((acc, p) => acc + p.totalDamageDealtToChampions, 0),
    };

    const redTeamTotals: TeamTotals = {
      kills: redTeam.reduce((acc, p) => acc + p.kills, 0),
      deaths: redTeam.reduce((acc, p) => acc + p.deaths, 0),
      assists: redTeam.reduce((acc, p) => acc + p.assists, 0),
      gold: redTeam.reduce((acc, p) => acc + p.goldEarned, 0),
      damage: redTeam.reduce((acc, p) => acc + p.totalDamageDealtToChampions, 0),
    };

    const maxDamage = Math.max(
      ...formattedParticipants.map((p) => p.totalDamageDealtToChampions),
      1
    );

    const currentFormatted = formatParticipant(up, durationMinutes);

    return {
      matchId: m.id,
      gameDuration: m.gameDuration,
      gameCreation: Number(m.gameCreation),
      queueId: m.queueId,
      queueName: getQueueName(m.queueId),
      win: up.win,
      participant: currentFormatted,
      blueTeam,
      redTeam,
      blueTeamTotals,
      redTeamTotals,
      maxDamage,
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
  }>();

  for (const p of participations) {
    const existing = map.get(p.championId) || {
      championId: p.championId,
      championName: p.championName,
      games: 0,
      wins: 0,
      losses: 0,
      totalKills: 0,
      totalDeaths: 0,
      totalAssists: 0,
      totalCs: 0,
      totalDuration: 0,
    };

    existing.games += 1;
    if (p.win) existing.wins += 1;
    else existing.losses += 1;

    existing.totalKills += p.kills;
    existing.totalDeaths += p.deaths;
    existing.totalAssists += p.assists;
    existing.totalCs += (p.totalMinionsKilled + p.neutralMinionsKilled);
    existing.totalDuration += p.match.gameDuration;

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
    });
  }

  summaries.sort((a, b) => b.games - a.games);
  return summaries;
}
