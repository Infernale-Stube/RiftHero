import { prisma } from '../db/prisma';
import { getRiotClient } from '../riot/client';
import { config } from '../config';
import {
  normalizeRegion,
  getPlatformForRegion,
  getQueueName,
} from '../riot/regions';
import { getChampionNameById } from '../riot/ddragon';

const CHAMP_DEFAULT_POSITION: Record<string, string> = {
  // Top
  Aatrox: 'TOP', Camille: 'TOP', ChoGath: 'TOP', Chogath: 'TOP', Darius: 'TOP',
  DrMundo: 'TOP', Fiora: 'TOP', Gangplank: 'TOP', Garen: 'TOP', Gnar: 'TOP',
  Gragas: 'TOP', Gwen: 'TOP', Illaoi: 'TOP', Irelia: 'TOP', Jax: 'TOP',
  Jayce: 'TOP', Kayle: 'TOP', Kennen: 'TOP', Kled: 'TOP', KSante: 'TOP',
  Malphite: 'TOP', Mordekaiser: 'TOP', Nasus: 'TOP', Olaf: 'TOP', Ornn: 'TOP',
  Pantheon: 'TOP', Poppy: 'TOP', Quinn: 'TOP', Renekton: 'TOP', Riven: 'TOP',
  Rumble: 'TOP', Sett: 'TOP', Shen: 'TOP', Singed: 'TOP', Sion: 'TOP',
  TahmKench: 'TOP', Teemo: 'TOP', Trundle: 'TOP', Tryndamere: 'TOP', Urgot: 'TOP',
  Volibear: 'TOP', Warwick: 'TOP', Wukong: 'TOP', Yorick: 'TOP',

  // Jungle
  Amumu: 'JUNGLE', BelVeth: 'JUNGLE', Belveth: 'JUNGLE', Briar: 'JUNGLE',
  Diana: 'JUNGLE', Elise: 'JUNGLE', Evelynn: 'JUNGLE', Fiddlesticks: 'JUNGLE',
  Graves: 'JUNGLE', Hecarim: 'JUNGLE', Ivern: 'JUNGLE', JarvanIV: 'JUNGLE',
  Karthus: 'JUNGLE', Kayn: 'JUNGLE', KhaZix: 'JUNGLE', Khazix: 'JUNGLE',
  Kindred: 'JUNGLE', LeeSin: 'JUNGLE', Lillia: 'JUNGLE', MasterYi: 'JUNGLE',
  Nidalee: 'JUNGLE', Nocturne: 'JUNGLE', Nunu: 'JUNGLE', Rammus: 'JUNGLE',
  RekSai: 'JUNGLE', Rengar: 'JUNGLE', Sejuani: 'JUNGLE', Shaco: 'JUNGLE',
  Shyvana: 'JUNGLE', Skarner: 'JUNGLE', Taliyah: 'JUNGLE', Udyr: 'JUNGLE',
  Vi: 'JUNGLE', Viego: 'JUNGLE', XinZhao: 'JUNGLE', Zac: 'JUNGLE',

  // Mid
  Ahri: 'MID', Akali: 'MID', Akshan: 'MID', Anivia: 'MID', Annie: 'MID',
  AurelionSol: 'MID', Azir: 'MID', Cassiopeia: 'MID', Corki: 'MID', Ekko: 'MID',
  Fizz: 'MID', Galio: 'MID', Hwei: 'MID', Kassadin: 'MID', Katarina: 'MID',
  Leblanc: 'MID', LeBlanc: 'MID', Lissandra: 'MID', Lux: 'MID', Malzahar: 'MID',
  Naafiri: 'MID', Neeko: 'MID', Orianna: 'MID', Qiyana: 'MID', Ryze: 'MID',
  Sylas: 'MID', Syndra: 'MID', Talon: 'MID', TwistedFate: 'MID', Veigar: 'MID',
  Vex: 'MID', Viktor: 'MID', Vladimir: 'MID', Xerath: 'MID', Yasuo: 'MID',
  Yone: 'MID', Zed: 'MID', Ziggs: 'MID', Zoe: 'MID',

  // ADC / Bottom
  Aphelios: 'ADC', Ashe: 'ADC', Caitlyn: 'ADC', Draven: 'ADC', Ezreal: 'ADC',
  Jhin: 'ADC', Jinx: 'ADC', KaiSa: 'ADC', Kaisa: 'ADC', Kalista: 'ADC',
  KogMaw: 'ADC', Lucian: 'ADC', MissFortune: 'ADC', Nilah: 'ADC', Samira: 'ADC',
  Sivir: 'ADC', Smolder: 'ADC', Tristana: 'ADC', Twitch: 'ADC', Varus: 'ADC',
  Vayne: 'ADC', Xayah: 'ADC', Zeri: 'ADC',

  // Support
  Alistar: 'SUPPORT', Bard: 'SUPPORT', Blitzcrank: 'SUPPORT', Brand: 'SUPPORT',
  Braum: 'SUPPORT', Janna: 'SUPPORT', Karma: 'SUPPORT', Leona: 'SUPPORT',
  Lulu: 'SUPPORT', Milio: 'SUPPORT', Morgana: 'SUPPORT', Nami: 'SUPPORT',
  Nautilus: 'SUPPORT', Pyke: 'SUPPORT', Rakan: 'SUPPORT', Rell: 'SUPPORT',
  Renata: 'SUPPORT', RenataGlasc: 'SUPPORT', Senna: 'SUPPORT', Seraphine: 'SUPPORT',
  Sona: 'SUPPORT', Soraka: 'SUPPORT', Taric: 'SUPPORT', Thresh: 'SUPPORT',
  VelKoz: 'SUPPORT', Velkoz: 'SUPPORT', Yuumi: 'SUPPORT', Zilean: 'SUPPORT',
  Zyra: 'SUPPORT',
};

function resolveParticipantPosition(p: any, champName: string): string {
  const direct = (p.teamPosition || p.selectedPosition || p.lane || '').toUpperCase();
  if (direct === 'TOP') return 'TOP';
  if (direct === 'JUNGLE') return 'JUNGLE';
  if (direct === 'MIDDLE' || direct === 'MID') return 'MID';
  if (direct === 'BOTTOM' || direct === 'BOT' || direct === 'ADC') return 'ADC';
  if (direct === 'UTILITY' || direct === 'SUPPORT') return 'SUPPORT';

  if (p.spell1Id === 11 || p.spell2Id === 11) {
    return 'JUNGLE';
  }

  if (champName && CHAMP_DEFAULT_POSITION[champName]) {
    return CHAMP_DEFAULT_POSITION[champName];
  }

  return 'MID';
}

export interface LiveGameParticipant {
  puuid: string;
  riotId: string;
  summonerName: string;
  summonerLevel?: number;
  teamId: number;
  championId: number;
  championName: string;
  teamPosition?: string | null;
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
  championStats?: {
    games: number;
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
    select: { puuid: true, id: true, summonerLevel: true },
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

  // 3b. Query participant match history from DB for champion winrates
  const participantMatches = await prisma.matchParticipant.findMany({
    where: { puuid: { in: participantPuuids } },
    select: { puuid: true, championId: true, win: true },
  });

  const champStatsMap = new Map<string, { games: number; wins: number; losses: number; winrate: number }>();
  for (const m of participantMatches) {
    const key = `${m.puuid}_${m.championId}`;
    const entry = champStatsMap.get(key) || { games: 0, wins: 0, losses: 0, winrate: 0 };
    entry.games += 1;
    if (m.win) entry.wins += 1;
    else entry.losses += 1;
    entry.winrate = Math.round((entry.wins / entry.games) * 100);
    champStatsMap.set(key, entry);
  }

  // 3c. For participants missing soloRank in DB, fetch live from Riot League API
  const missingRankPuuids = participantPuuids.filter((puuid) => {
    const dbEntry = summonerMap.get(puuid);
    return !dbEntry?.ranks?.some((r: any) => r.queueType === 'RANKED_SOLO_5x5');
  });

  const liveRankMap = new Map<string, any>();
  if (missingRankPuuids.length > 0) {
    await Promise.allSettled(
      missingRankPuuids.map(async (puuid) => {
        try {
          const entries = await rApi.league.getEntriesByPUUID({
            region: platform as any,
            puuid,
          });
          const solo = entries.find((e: any) => e.queueType === 'RANKED_SOLO_5x5');
          if (solo) {
            const total = solo.wins + solo.losses;
            liveRankMap.set(puuid, {
              tier: solo.tier,
              rank: solo.rank,
              leaguePoints: solo.leaguePoints,
              wins: solo.wins,
              losses: solo.losses,
              winrate: total > 0 ? Math.round((solo.wins / total) * 100) : 0,
            });
          }
        } catch {
          // Gracefully fallback for unranked or private
        }
      })
    );
  }

  // 3d. Resolve summonerLevel for participants missing in DB
  const missingLevelPuuids = participantPuuids.filter((puuid) => {
    const dbEntry = summonerMap.get(puuid);
    return !dbEntry?.summonerLevel;
  });

  const liveLevelMap = new Map<string, number>();
  if (missingLevelPuuids.length > 0) {
    await Promise.allSettled(
      missingLevelPuuids.map(async (puuid) => {
        try {
          const sumDto = await rApi.summoner.getByPUUID({
            region: platform as any,
            puuid,
          });
          if (sumDto && typeof sumDto.summonerLevel === 'number') {
            liveLevelMap.set(puuid, sumDto.summonerLevel);
          }
        } catch {
          if (config.riotApiKey) {
            try {
              const res = await fetch(
                `https://${platform.toLowerCase()}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}`,
                { headers: { 'X-Riot-Token': config.riotApiKey } }
              );
              if (res.ok) {
                const data = (await res.json()) as any;
                if (data && typeof data.summonerLevel === 'number') {
                  liveLevelMap.set(puuid, data.summonerLevel);
                }
              }
            } catch {
              // ignore
            }
          }
        }
      })
    );
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
    } else if (liveRankMap.has(p.puuid)) {
      rankFormatted = liveRankMap.get(p.puuid);
    }

    const champStats = champStatsMap.get(`${p.puuid}_${p.championId}`) || null;
    const teamPosition = resolveParticipantPosition(p, champName);

    const primaryRune = p.perks?.perkIds?.[0] || null;
    const secondaryStyle = p.perks?.perkSubStyle || null;

    const summonerLevel =
      dbEntry?.summonerLevel ||
      liveLevelMap.get(p.puuid) ||
      (p.puuid === summoner?.puuid ? summoner?.summonerLevel : undefined);

    const formatted: LiveGameParticipant = {
      puuid: p.puuid,
      riotId: p.riotId || (p.summonerName ? `${p.summonerName}` : 'Unknown'),
      summonerName: p.summonerName || '',
      summonerLevel,
      teamId: p.teamId,
      championId: p.championId,
      championName: champName,
      teamPosition,
      spell1Id: p.spell1Id,
      spell2Id: p.spell2Id,
      profileIconId: p.profileIconId,
      primaryRune,
      secondaryStyle,
      rank: rankFormatted,
      championStats: champStats,
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
