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
  goldEarned: number;
  items: number[];
  spells: number[];
  primaryRune: number | null;
  secondaryStyle: number | null;
}

export interface FormattedMatch {
  matchId: string;
  gameDuration: number;
  gameCreation: number;
  queueId: number;
  queueName: string;
  win: boolean;
  participant: FormattedMatchParticipant;
  blueTeam: Array<{
    puuid: string;
    riotIdGameName: string;
    riotIdTagline: string;
    championId: number;
    championName: string;
  }>;
  redTeam: Array<{
    puuid: string;
    riotIdGameName: string;
    riotIdTagline: string;
    championId: number;
    championName: string;
  }>;
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
            participants: {
              select: {
                puuid: true,
                riotIdGameName: true,
                riotIdTagline: true,
                championId: true,
                championName: true,
                teamId: true,
              },
            },
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
    const cs = up.totalMinionsKilled + up.neutralMinionsKilled;
    const csPerMinute = durationMinutes > 0 ? Number((cs / durationMinutes).toFixed(1)) : 0;
    const kdaCalc = up.deaths === 0 ? up.kills + up.assists : Number(((up.kills + up.assists) / up.deaths).toFixed(2));

    const allParticipants = m.participants || [];
    const blueTeam = allParticipants
      .filter((p) => p.teamId === 100)
      .map((p) => ({
        puuid: p.puuid,
        riotIdGameName: p.riotIdGameName,
        riotIdTagline: p.riotIdTagline,
        championId: p.championId,
        championName: p.championName,
      }));

    const redTeam = allParticipants
      .filter((p) => p.teamId === 200)
      .map((p) => ({
        puuid: p.puuid,
        riotIdGameName: p.riotIdGameName,
        riotIdTagline: p.riotIdTagline,
        championId: p.championId,
        championName: p.championName,
      }));

    return {
      matchId: m.id,
      gameDuration: m.gameDuration,
      gameCreation: Number(m.gameCreation),
      queueId: m.queueId,
      queueName: getQueueName(m.queueId),
      win: up.win,
      participant: {
        puuid: up.puuid,
        riotIdGameName: up.riotIdGameName,
        riotIdTagline: up.riotIdTagline,
        championId: up.championId,
        championName: up.championName,
        champLevel: up.champLevel,
        teamId: up.teamId,
        win: up.win,
        role: up.role,
        lane: up.lane,
        kills: up.kills,
        deaths: up.deaths,
        assists: up.assists,
        kda: kdaCalc,
        totalDamageDealtToChampions: up.totalDamageDealtToChampions,
        totalDamageTaken: up.totalDamageTaken,
        cs,
        csPerMinute,
        visionScore: up.visionScore,
        goldEarned: up.goldEarned,
        items: [up.item0, up.item1, up.item2, up.item3, up.item4, up.item5, up.item6],
        spells: [up.summoner1Id, up.summoner2Id],
        primaryRune: up.primaryRune,
        secondaryStyle: up.secondaryStyle,
      },
      blueTeam,
      redTeam,
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
