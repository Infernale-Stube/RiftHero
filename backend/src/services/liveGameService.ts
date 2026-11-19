import { prisma } from '../db/prisma';
import { getRiotClient } from '../riot/client';
import { config } from '../config';
import {
  normalizeRegion,
  getPlatformForRegion,
  getClusterForRegion,
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

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

export async function getLiveGame(
  rawRegion: string,
  gameName: string,
  tagLine: string
): Promise<LiveGameResponse> {
  const region = normalizeRegion(rawRegion);
  const platform = getPlatformForRegion(region);
  const cleanTag = tagLine ? tagLine.replace(/^#/, '').trim() : '';

  // 1. Obtain summoner PUUID from DB (with flexible tag matching)
  let summoner = await prisma.summoner.findFirst({
    where: {
      region,
      gameName: { equals: gameName, mode: 'insensitive' },
      ...(cleanTag ? { tagLine: { equals: cleanTag, mode: 'insensitive' } } : {}),
    },
    select: { puuid: true, id: true, summonerLevel: true, gameName: true, tagLine: true },
  });

  if (!summoner) {
    summoner = await prisma.summoner.findFirst({
      where: {
        gameName: { equals: gameName, mode: 'insensitive' },
        ...(cleanTag ? { tagLine: { equals: cleanTag, mode: 'insensitive' } } : {}),
      },
      select: { puuid: true, id: true, summonerLevel: true, gameName: true, tagLine: true },
    });
  }

  const rApi = getRiotClient();

  // If summoner not yet in DB, fetch account directly to get puuid
  let puuid = summoner?.puuid;
  if (!puuid) {
    const cluster = getClusterForRegion(region);
    // Direct REST fetch for Account-v1 first if API key configured
    if (config.riotApiKey) {
      try {
        const res = await fetch(
          `https://${cluster}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(cleanTag || region.toUpperCase())}`,
          { headers: { 'X-Riot-Token': config.riotApiKey } }
        );
        if (res.ok) {
          const data = (await res.json()) as any;
          puuid = data?.puuid;
        }
      } catch (err: any) {
        console.warn('[LiveGame] Direct Account-v1 lookup failed:', err?.message);
      }
    }

    if (!puuid) {
      try {
        const acc = await rApi.account.getByRiotId({
          region: cluster as any,
          gameName,
          tagLine: cleanTag || region.toUpperCase(),
        });
        puuid = acc?.puuid;
      } catch (rErr: any) {
        console.warn('[LiveGame] rApi Account lookup failed:', rErr?.message);
      }
    }
  }

  if (!puuid) {
    return {
      inGame: false,
      message: `Spieler "${gameName}#${cleanTag || region.toUpperCase()}" konnte bei Riot nicht gefunden werden.`,
    };
  }

  // 2. Query Spectator-v5 (Direct REST fetch prioritized for reliability, then TFT fallback, then rApi fallback)
  let currentGame: any = null;

  if (config.riotApiKey) {
    // 2a. Direct fetch to League of Legends Spectator-v5
    try {
      const specUrl = `https://${platform.toLowerCase()}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`;
      const specRes = await fetch(specUrl, {
        headers: { 'X-Riot-Token': config.riotApiKey },
      });

      if (specRes.ok) {
        currentGame = await specRes.json();
      } else if (specRes.status === 401 || specRes.status === 403) {
        console.error(`[LiveGame] Riot API Key rejected (HTTP ${specRes.status})`);
        return {
          inGame: false,
          message: `Riot API Key ungültig oder abgelaufen (HTTP ${specRes.status}). Bitte erneuere deinen RIOT_API_KEY in der Konfiguration.`,
        };
      } else if (specRes.status === 429) {
        console.warn('[LiveGame] Riot API Rate Limited (HTTP 429)');
        return {
          inGame: false,
          message: 'Riot API Rate-Limit erreicht (429). Bitte warte einen kurzen Moment.',
        };
      } else if (specRes.status !== 404) {
        console.warn(`[LiveGame] Spectator endpoint returned HTTP ${specRes.status}`);
      }
    } catch (specErr: any) {
      console.error('[LiveGame] Direct Spectator-v5 fetch failed:', specErr?.message);
    }

    // 2b. If not found in LoL, check TFT Spectator-v5 fallback
    if (!currentGame) {
      try {
        const tftUrl = `https://${platform.toLowerCase()}.api.riotgames.com/lol/spectator/tft/v5/active-games/by-puuid/${encodeURIComponent(puuid)}`;
        const tftRes = await fetch(tftUrl, {
          headers: { 'X-Riot-Token': config.riotApiKey },
        });

        if (tftRes.ok) {
          currentGame = await tftRes.json();
        }
      } catch (tftErr: any) {
        // ignore TFT fallback errors
      }
    }
  }

  // 2c. Fallback to @fightmegg/riot-api client if direct fetch didn't return a game
  if (!currentGame) {
    try {
      currentGame = await rApi.spectator.getBySummonerId({
        region: platform as any,
        summonerId: puuid,
      });
    } catch (err: any) {
      const status = err?.status || err?.statusCode || err?.response?.status;
      if (status === 401 || status === 403) {
        return {
          inGame: false,
          message: `Riot API Key ungültig oder abgelaufen (HTTP ${status}). Bitte erneuere deinen RIOT_API_KEY.`,
        };
      }
      if (status === 429) {
        return {
          inGame: false,
          message: 'Riot API Rate-Limit erreicht (429). Bitte warte einen kurzen Moment.',
        };
      }
    }
  }

  if (!currentGame || !Array.isArray(currentGame.participants) || currentGame.participants.length === 0) {
    return {
      inGame: false,
      message: 'Spieler befindet sich aktuell in keinem aktiven Spiel (oder das Spiel befindet sich noch in der Championauswahl / im Ladebildschirm - Riot Spectator benötigt ca. 1-2 Min. nach Spielstart).',
    };
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

  // 3c. For participants missing soloRank in DB, fetch live from Riot League API (with timeout protection)
  const missingRankPuuids = participantPuuids.filter((pId) => {
    const dbEntry = summonerMap.get(pId);
    return !dbEntry?.ranks?.some((r: any) => r.queueType === 'RANKED_SOLO_5x5');
  });

  const liveRankMap = new Map<string, any>();
  if (missingRankPuuids.length > 0) {
    await Promise.allSettled(
      missingRankPuuids.slice(0, 10).map(async (pId) => {
        try {
          const entries = await withTimeout(
            rApi.league.getEntriesByPUUID({
              region: platform as any,
              puuid: pId,
            }),
            2000
          );
          const solo = entries?.find((e: any) => e.queueType === 'RANKED_SOLO_5x5');
          if (solo) {
            const total = solo.wins + solo.losses;
            liveRankMap.set(pId, {
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

  // 3d. Resolve summonerLevel for participants missing in DB (with timeout protection)
  const missingLevelPuuids = participantPuuids.filter((pId) => {
    const dbEntry = summonerMap.get(pId);
    return !dbEntry?.summonerLevel;
  });

  const liveLevelMap = new Map<string, number>();
  if (missingLevelPuuids.length > 0) {
    await Promise.allSettled(
      missingLevelPuuids.slice(0, 10).map(async (pId) => {
        try {
          const sumDto = await withTimeout(
            rApi.summoner.getByPUUID({
              region: platform as any,
              puuid: pId,
            }),
            2000
          );
          if (sumDto && typeof sumDto.summonerLevel === 'number') {
            liveLevelMap.set(pId, sumDto.summonerLevel);
          }
        } catch {
          if (config.riotApiKey) {
            try {
              const res = await withTimeout(
                fetch(
                  `https://${platform.toLowerCase()}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(pId)}`,
                  { headers: { 'X-Riot-Token': config.riotApiKey } }
                ),
                2000
              );
              if (res.ok) {
                const data = (await res.json()) as any;
                if (data && typeof data.summonerLevel === 'number') {
                  liveLevelMap.set(pId, data.summonerLevel);
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

    // Support both perks and runes structures
    const primaryRune = p.runes?.perkIds?.[0] || p.perks?.perkIds?.[0] || null;
    const secondaryStyle = p.runes?.perkSubStyle || p.perks?.perkSubStyle || null;

    const summonerLevel =
      dbEntry?.summonerLevel ||
      liveLevelMap.get(p.puuid) ||
      (p.puuid === summoner?.puuid ? summoner?.summonerLevel : undefined);

    const resolvedRiotId =
      p.riotId ||
      (dbEntry ? `${dbEntry.gameName}#${dbEntry.tagLine}` : '') ||
      (p.puuid === puuid ? `${summoner?.gameName || gameName}#${summoner?.tagLine || cleanTag || region.toUpperCase()}` : '') ||
      p.summonerName ||
      champName ||
      'Unknown';

    const formatted: LiveGameParticipant = {
      puuid: p.puuid,
      riotId: resolvedRiotId,
      summonerName: p.summonerName || (resolvedRiotId.includes('#') ? resolvedRiotId.split('#')[0] : resolvedRiotId),
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

  // 4. Resolve bans (support both currentGame.bans and currentGame.bannedChampions)
  const rawBans = Array.isArray(currentGame.bans)
    ? currentGame.bans
    : Array.isArray(currentGame.bannedChampions)
    ? currentGame.bannedChampions
    : [];

  const bans: BannedChampion[] = [];
  for (const b of rawBans) {
    if (b.championId > 0) {
      const champName = await getChampionNameById(b.championId);
      bans.push({
        championId: b.championId,
        championName: champName,
        teamId: b.teamId,
        pickTurn: b.pickTurn || 0,
      });
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
