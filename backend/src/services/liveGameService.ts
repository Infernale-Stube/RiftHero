import { prisma } from '../db/prisma';
import { getRiotClient } from '../riot/client';
import {
  normalizeRegion,
  getPlatformForRegion,
  getQueueName,
} from '../riot/regions';
import { getChampionNameById } from '../riot/ddragon';

export interface LiveGameParticipant {
  puuid: string;
  riotId: string;
  summonerName: string;
  teamId: number;
  championId: number;
  championName: string;
  spell1Id: number;
  spell2Id: number;
  profileIconId: number;
  primaryRune: number | null;
  secondaryStyle: number | null;
  rank?: {
    tier: string;
    rank: string;
    leaguePoints: number;
    wins: number;
    losses: number;
    winrate: number;
  } | null;
}

export interface BannedChampion {
  championId: number;
  championName: string;
  teamId: number;
  pickTurn: number;
}

export interface LiveGameData {
  gameId: number;
  gameStartTime: number;
  gameLength: number;
  mapId: number;
  queueId: number;
  queueName: string;
  gameMode: string;
  blueTeam: LiveGameParticipant[];
  redTeam: LiveGameParticipant[];
  bans: BannedChampion[];
}

export interface LiveGameResponse {
  inGame: boolean;
  game?: LiveGameData;
  message?: string;
}

export async function getLiveGame(
  rawRegion: string,
  gameName: string,
  tagLine: string
): Promise<LiveGameResponse> {
  const region = normalizeRegion(rawRegion);
  const platform = getPlatformForRegion(region);

  // 1. Obtain summoner PUUID from DB
  let summoner = await prisma.summoner.findFirst({
    where: {
      region,
      gameName: { equals: gameName, mode: 'insensitive' },
      tagLine: { equals: tagLine, mode: 'insensitive' },
    },
    select: { puuid: true, id: true },
  });

  const rApi = getRiotClient();

  // If summoner not yet in DB, fetch account directly to get puuid
  let puuid = summoner?.puuid;
  if (!puuid) {
    try {
      const cluster = platform.toLowerCase().startsWith('eu') ? 'europe' : 'americas';
      const acc = await rApi.account.getByRiotId({
        region: cluster as any,
        gameName,
        tagLine,
      });
      puuid = acc.puuid;
    } catch {
      return { inGame: false, message: 'Spieler konnte nicht gefunden werden' };
    }
  }

  // 2. Query Spectator-v5 via rApi
  let currentGame: any;
  try {
    // In Spectator v5, summonerId parameter accepts encryptedPUUID
    currentGame = await rApi.spectator.getBySummonerId({
      region: platform as any,
      summonerId: puuid,
    });
  } catch (err: any) {
    // 404 means player is not currently in a live match
    if (err.status === 404 || err.statusCode === 404 || (err.message && err.message.includes('404'))) {
      return { inGame: false, message: 'Spieler befindet sich aktuell in keinem aktiven Spiel.' };
    }
    return { inGame: false, message: 'Kein aktives Spiel gefunden oder Spectator-Service nicht verfügbar.' };
  }

  if (!currentGame || !currentGame.participants) {
    return { inGame: false, message: 'Spieler befindet sich aktuell in keinem aktiven Spiel.' };
  }

  // 3. Resolve all participant champion names & cached ranks from PostgreSQL
  const participantPuuids = (currentGame.participants as any[])
    .map((p) => p.puuid)
    .filter(Boolean);

  const dbSummoners = await prisma.summoner.findMany({
    where: { puuid: { in: participantPuuids } },
    include: { ranks: true },
  });

  const summonerMap = new Map<string, any>();
  for (const s of dbSummoners) {
    summonerMap.set(s.puuid, s);
  }

  const blueTeam: LiveGameParticipant[] = [];
  const redTeam: LiveGameParticipant[] = [];

  for (const p of currentGame.participants) {
    const champName = await getChampionNameById(p.championId);
    const dbEntry = summonerMap.get(p.puuid);
    const soloRank = dbEntry?.ranks?.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');

    let rankFormatted = null;
    if (soloRank) {
      const total = soloRank.wins + soloRank.losses;
      const winrate = total > 0 ? Math.round((soloRank.wins / total) * 100) : 0;
      rankFormatted = {
        tier: soloRank.tier,
        rank: soloRank.rank,
        leaguePoints: soloRank.leaguePoints,
        wins: soloRank.wins,
        losses: soloRank.losses,
        winrate,
      };
    }

    const primaryRune = p.perks?.perkIds?.[0] || null;
    const secondaryStyle = p.perks?.perkSubStyle || null;

    const formatted: LiveGameParticipant = {
      puuid: p.puuid,
      riotId: p.riotId || (p.summonerName ? `${p.summonerName}` : 'Unknown'),
      summonerName: p.summonerName || '',
      teamId: p.teamId,
      championId: p.championId,
      championName: champName,
      spell1Id: p.spell1Id,
      spell2Id: p.spell2Id,
      profileIconId: p.profileIconId,
      primaryRune,
      secondaryStyle,
      rank: rankFormatted,
    };

    if (p.teamId === 100) {
      blueTeam.push(formatted);
    } else {
      redTeam.push(formatted);
    }
  }

  // 4. Resolve bans
  const bans: BannedChampion[] = [];
  if (Array.isArray(currentGame.bannedChampions)) {
    for (const b of currentGame.bannedChampions) {
      if (b.championId > 0) {
        const champName = await getChampionNameById(b.championId);
        bans.push({
          championId: b.championId,
          championName: champName,
          teamId: b.teamId,
          pickTurn: b.pickTurn,
        });
      }
    }
  }

  return {
    inGame: true,
    game: {
      gameId: currentGame.gameId,
      gameStartTime: currentGame.gameStartTime || Date.now(),
      gameLength: currentGame.gameLength || 0,
      mapId: currentGame.mapId,
      queueId: currentGame.gameQueueConfigId,
      queueName: getQueueName(currentGame.gameQueueConfigId),
      gameMode: currentGame.gameMode,
      blueTeam,
      redTeam,
      bans,
    },
  };
}
