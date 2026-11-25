import { prisma } from '../db/prisma';
import { getRiotClient } from '../riot/client';
import { config } from '../config';
import {
  normalizeRegion,
  getPlatformForRegion,
  getClusterForRegion,
  getQueueName,
} from '../riot/regions';
import {
  isSummonersRift as checkIsSummonersRift,
} from './gameMetadataService';
import { getChampionNameById } from '../riot/ddragon';
import championPositionsRaw from '../riot/championPositions.json';
import {
  findTeammateCoOccurrences,
  detectTeamPremades,
  detectMatchPremades,
  PremadeGroupInfo,
} from './premadeService';
import { CounterMatchupStats, ensureCounterPickTableExists } from './counterPickService';

export interface LiveGameParticipantMastery {
  championLevel: number;
  championPoints: number;
  tokensEarned?: number;
  championSeasonMilestone?: number;
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
  mastery?: LiveGameParticipantMastery | null;
  premadeGroup?: PremadeGroupInfo | null;
}

export interface BannedChampion {
  championId: number;
  championName: string;
  teamId: number;
  pickTurn: number;
}

export interface LiveGameWinProbability {
  blueWinrate: number;
  redWinrate: number;
  favoredTeam: 'blue' | 'red' | 'even';
  confidence: 'high' | 'medium' | 'low';
  factors: {
    rankDiffLp: number;
    blueAvgMmr: number;
    redAvgMmr: number;
    blueAvgWinrate: number | null;
    redAvgWinrate: number | null;
    blueChampWinrate: number | null;
    redChampWinrate: number | null;
    sideAdvantage: number;
    blueAvgMasteryPts?: number | null;
    redAvgMasteryPts?: number | null;
    blueAvgMasteryLevel?: number | null;
    redAvgMasteryLevel?: number | null;
    masteryAdvantage?: number;
    mmrAdvantage?: number;
    wrAdvantage?: number;
    champAdvantage?: number;
    matchupAdvantage?: number;
    blueAvgMatchupWinrate?: number | null;
    redAvgMatchupWinrate?: number | null;
    matchupCount?: number;
    matchupTier?: string | null;
  };
}

export type LiveLaneRole = 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';

export interface LiveGameLaneMatchup {
  role: LiveLaneRole;
  lolalyticsRole: string;
  blueChampionId: number;
  blueChampionName: string;
  redChampionId: number;
  redChampionName: string;
  blueWinrate: number | null;
  redWinrate: number | null;
  games: number | null;
  favoredSide: 'blue' | 'red' | 'even' | null;
  tier: string;
  requestedTier: string;
  patch: string | null;
}

export interface LiveGameData {
  gameId: number;
  gameStartTime: number;
  gameLength: number;
  mapId: number;
  queueId: number;
  queueName: string;
  blueTeam: LiveGameParticipant[];
  redTeam: LiveGameParticipant[];
  bans: BannedChampion[];
  avgMatchTier?: string;
  laneMatchups?: LiveGameLaneMatchup[];
  winProbability?: LiveGameWinProbability;
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
    return !dbEntry?.soloTier;
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

  // 3e. Fetch champion mastery for each participant on their picked champion
  const masteryMap = new Map<string, LiveGameParticipantMastery>();
  await Promise.allSettled(
    (currentGame.participants as any[]).map(async (p) => {
      const pId = p.puuid;
      const cId = Number(p.championId);
      if (!pId || !cId) return;

      const cacheKey = `${pId}_${cId}`;

      // 1. Direct REST fetch to Riot Champion Mastery v4 API if key configured
      if (config.riotApiKey) {
        try {
          const mUrl = `https://${platform.toLowerCase()}.api.riotgames.com/lol/champion-mastery/v4/champion-masteries/by-puuid/${encodeURIComponent(pId)}/by-champion/${cId}`;
          const mRes = await withTimeout(
            fetch(mUrl, { headers: { 'X-Riot-Token': config.riotApiKey } }),
            2000
          );
          if (mRes.ok) {
            const mData = (await mRes.json()) as any;
            if (mData && typeof mData.championLevel === 'number') {
              masteryMap.set(cacheKey, {
                championLevel: Number(mData.championLevel),
                championPoints: Number(mData.championPoints || 0),
                tokensEarned: Number(mData.tokensEarned || 0),
                championSeasonMilestone: Number(mData.championSeasonMilestone || 0),
              });
              return;
            }
          } else if (mRes.status === 404) {
            // First time playing this champion / 0 mastery points
            masteryMap.set(cacheKey, {
              championLevel: 0,
              championPoints: 0,
            });
            return;
          }
        } catch {
          // Timeout or fetch error, proceed to fallback
        }
      }

      // 2. Fallback via rApi request
      try {
        const mData: any = await withTimeout(
          (rApi as any).request(
            platform,
            'CHAMPION_MASTERY.GET_CHAMPION',
            { encryptedPUUID: pId, summonerId: pId, championId: cId },
            { id: `${platform}.championMastery.getChampion.${pId}.${cId}` }
          ),
          2000
        );
        if (mData && typeof mData.championLevel === 'number') {
          masteryMap.set(cacheKey, {
            championLevel: Number(mData.championLevel),
            championPoints: Number(mData.championPoints || 0),
            tokensEarned: Number(mData.tokensEarned || 0),
            championSeasonMilestone: Number(mData.championSeasonMilestone || 0),
          });
          return;
        }
      } catch (err: any) {
        const status = err?.status || err?.statusCode || err?.response?.status;
        if (status === 404) {
          masteryMap.set(cacheKey, {
            championLevel: 0,
            championPoints: 0,
          });
          return;
        }
      }

      // 3. Fallback from DB match history if available
      const dbChampMatches = participantMatches.filter(
        (m) => m.puuid === pId && m.championId === cId
      );
      if (dbChampMatches.length > 0) {
        masteryMap.set(cacheKey, {
          championLevel: Math.min(10, Math.max(1, Math.floor(dbChampMatches.length / 2))),
          championPoints: dbChampMatches.length * 1500,
        });
      }
    })
  );

  const blueTeam: LiveGameParticipant[] = [];
  const redTeam: LiveGameParticipant[] = [];

  for (const p of currentGame.participants) {
    const champName = await getChampionNameById(p.championId);
    const dbEntry = summonerMap.get(p.puuid);

    let rankFormatted = null;
    if (dbEntry?.soloTier) {
      const wins = dbEntry.soloWins || 0;
      const losses = dbEntry.soloLosses || 0;
      const total = wins + losses;
      rankFormatted = {
        tier: dbEntry.soloTier,
        rank: dbEntry.soloRank || 'I',
        leaguePoints: dbEntry.soloLp || 0,
        wins,
        losses,
        winrate: total > 0 ? Math.round((wins / total) * 100) : 0,
      };
    } else if (liveRankMap.has(p.puuid)) {
      rankFormatted = liveRankMap.get(p.puuid);
    }

    const champStats = champStatsMap.get(`${p.puuid}_${p.championId}`) || null;
    const masteryData = masteryMap.get(`${p.puuid}_${p.championId}`) || null;

    // Support both perks and runes structures
    const primaryRune = p.runes?.perkIds?.[0] || p.perks?.perkIds?.[0] || null;
    const secondaryStyle = p.runes?.perkSubStyle || p.perks?.perkSubStyle || null;

    const rawSummonerLevel =
      dbEntry?.summonerLevel ??
      liveLevelMap.get(p.puuid) ??
      (p.puuid === puuid ? summoner?.summonerLevel : undefined);
    const summonerLevel =
      rawSummonerLevel != null ? Number(rawSummonerLevel) : undefined;

    const resolvedRiotId =
      p.riotId ||
      (dbEntry ? `${dbEntry.gameName}#${dbEntry.tagLine}` : '') ||
      (p.puuid === puuid ? `${summoner?.gameName || gameName}#${summoner?.tagLine || cleanTag || region.toUpperCase()}` : '') ||
      p.summonerName ||
      champName ||
      'Unknown';

    const formatted: LiveGameParticipant = {
      puuid: String(p.puuid || ''),
      riotId: resolvedRiotId,
      summonerName: p.summonerName || (resolvedRiotId.includes('#') ? resolvedRiotId.split('#')[0] : resolvedRiotId),
      summonerLevel,
      teamId: Number(p.teamId),
      championId: Number(p.championId),
      championName: champName,
      teamPosition: null,
      spell1Id: Number(p.spell1Id),
      spell2Id: Number(p.spell2Id),
      profileIconId: Number(p.profileIconId),
      primaryRune: primaryRune != null ? Number(primaryRune) : null,
      secondaryStyle: secondaryStyle != null ? Number(secondaryStyle) : null,
      rank: rankFormatted,
      championStats: champStats,
      mastery: masteryData,
    };

    if (p.teamId === 100) {
      blueTeam.push(formatted);
    } else {
      redTeam.push(formatted);
    }
  }

  // 3d. Detect Premades / Groups (Duo, Trio, 4-Stack, 5-Stack) for each team
  try {
    const allLivePuuids = [...blueTeam, ...redTeam].map((p) => p.puuid).filter(Boolean);
    const coOccurrenceMap = await findTeammateCoOccurrences(allLivePuuids);
    const { bluePremades, redPremades } = detectMatchPremades(
      blueTeam,
      redTeam,
      coOccurrenceMap
    );

    for (const p of blueTeam) {
      p.premadeGroup = bluePremades.get(p.puuid) || null;
    }
    for (const p of redTeam) {
      p.premadeGroup = redPremades.get(p.puuid) || null;
    }
  } catch (err: any) {
    console.warn('[LiveGame] Failed to detect premades:', err?.message || err);
  }

  // 4. Resolve bans (support both currentGame.bans and currentGame.bannedChampions)
  const rawBans = Array.isArray(currentGame.bans)
    ? currentGame.bans
    : Array.isArray(currentGame.bannedChampions)
    ? currentGame.bannedChampions
    : [];

  const bans: BannedChampion[] = [];
  for (const b of rawBans) {
    const champId = Number(b.championId);
    if (champId > 0) {
      const champName = await getChampionNameById(champId);
      bans.push({
        championId: champId,
        championName: champName,
        teamId: Number(b.teamId),
        pickTurn: Number(b.pickTurn || 0),
      });
    }
  }

  const mapId = Number(currentGame.mapId || 0);
  const queueId = Number(currentGame.gameQueueConfigId || 0);
  const { avgMatchTier, laneMatchups } = await computeLiveLaneMatchups(
    blueTeam,
    redTeam,
    mapId,
    queueId
  );

  const winProbability = calculateLiveGameWinProbability(
    blueTeam,
    redTeam,
    mapId,
    queueId,
    laneMatchups,
    avgMatchTier
  );

  return {
    inGame: true,
    game: {
      gameId: Number(currentGame.gameId),
      gameStartTime: Number(currentGame.gameStartTime || Date.now()),
      gameLength: Number(currentGame.gameLength || 0),
      mapId,
      queueId,
      queueName: getQueueName(queueId),
      blueTeam,
      redTeam,
      bans,
      avgMatchTier,
      laneMatchups,
      winProbability,
    },
  };
}

const LIVE_LANE_ROLES: LiveLaneRole[] = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];

const ROLE_TO_LOLALYTICS: Record<LiveLaneRole, string> = {
  TOP: 'top',
  JUNGLE: 'jungle',
  MID: 'middle',
  ADC: 'bottom',
  SUPPORT: 'support',
};

const TIER_BASE_LP: Record<string, number> = {
  IRON: 0,
  BRONZE: 400,
  SILVER: 800,
  GOLD: 1200,
  PLATINUM: 1600,
  EMERALD: 2000,
  DIAMOND: 2400,
  MASTER: 2800,
  GRANDMASTER: 3200,
  CHALLENGER: 3600,
};

const DIVISION_OFFSET_LP: Record<string, number> = {
  IV: 0,
  III: 100,
  II: 200,
  I: 300,
};

function getParticipantMmr(p: LiveGameParticipant | null | undefined): number | null {
  if (!p || !p.rank || !p.rank.tier) return null;
  const tier = (p.rank.tier || '').toUpperCase();
  if (!tier || tier === 'UNRANKED') return null;
  const base = TIER_BASE_LP[tier];
  if (base === undefined) return null;
  if (tier === 'MASTER' || tier === 'GRANDMASTER' || tier === 'CHALLENGER') {
    return base + (p.rank.leaguePoints || 0);
  }
  const div = (p.rank.rank || 'IV').toUpperCase();
  const divOffset = DIVISION_OFFSET_LP[div] ?? 0;
  return base + divOffset + (p.rank.leaguePoints || 0);
}

function mmrToCounterPickTier(mmr: number | null): string {
  if (mmr === null) return 'all';
  if (mmr < 400) return 'iron';
  if (mmr < 800) return 'bronze';
  if (mmr < 1200) return 'silver';
  if (mmr < 1600) return 'gold';
  if (mmr < 2000) return 'platinum';
  if (mmr < 2400) return 'emerald';
  if (mmr < 2800) return 'diamond';
  if (mmr < 3200) return 'master';
  if (mmr < 3600) return 'grandmaster';
  return 'challenger';
}

function getTierFallbackChain(tier: string): string[] {
  switch (tier) {
    case 'challenger':
      return ['challenger', 'master_plus', 'diamond_plus', 'all'];
    case 'grandmaster':
      return ['grandmaster', 'master_plus', 'diamond_plus', 'all'];
    case 'master':
      return ['master', 'master_plus', 'diamond_plus', 'all'];
    case 'diamond':
      return ['diamond', 'diamond_plus', 'all'];
    case 'emerald':
      return ['emerald', 'emerald_plus', 'all'];
    case 'platinum':
      return ['platinum', 'platinum_plus', 'all'];
    case 'gold':
      return ['gold', 'gold_plus', 'all'];
    case 'silver':
    case 'bronze':
    case 'iron':
      return [tier, 'all'];
    default:
      return ['all'];
  }
}

function roleStringToLiveLane(raw?: string | null): LiveLaneRole | null {
  const up = (raw || '').toUpperCase().trim();
  if (up === 'TOP') return 'TOP';
  if (up === 'JUNGLE' || up === 'JGL') return 'JUNGLE';
  if (up === 'MID' || up === 'MIDDLE') return 'MID';
  if (up === 'ADC' || up === 'BOT' || up === 'BOTTOM' || up === 'CARRY') return 'ADC';
  if (up === 'SUPPORT' || up === 'SUP' || up === 'UTILITY') return 'SUPPORT';
  return null;
}

const backendChampPosMap = new Map<
  string,
  { role?: string; recommendedPositions?: string[] }
>();
for (const [k, v] of Object.entries(championPositionsRaw as Record<string, any>)) {
  const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
  backendChampPosMap.set(cleanKey, v);
  if (v?.name) {
    backendChampPosMap.set(String(v.name).toLowerCase().replace(/[^a-z0-9]/g, ''), v);
  }
}

function assignLiveTeamSlots(team: LiveGameParticipant[]): Map<LiveLaneRole, LiveGameParticipant> {
  const result = new Map<LiveLaneRole, LiveGameParticipant>();
  if (!team || team.length === 0) return result;

  if (team.length !== 5) {
    const order = (p: LiveGameParticipant) => {
      const clean = (p.championName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pos = roleStringToLiveLane(backendChampPosMap.get(clean)?.role);
      const idx = pos ? LIVE_LANE_ROLES.indexOf(pos) : 99;
      return idx;
    };
    const sorted = [...team].sort((a, b) => order(a) - order(b));
    LIVE_LANE_ROLES.forEach((role, idx) => {
      if (sorted[idx]) result.set(role, sorted[idx]);
    });
    return result;
  }

  const assigned = new Map<LiveGameParticipant, LiveLaneRole>();
  const unassignedPlayers = [...team];
  const unassignedRoles = new Set<LiveLaneRole>(LIVE_LANE_ROLES);

  const smitePlayers = unassignedPlayers.filter((p) => p.spell1Id === 11 || p.spell2Id === 11);
  if (smitePlayers.length === 1) {
    const jgl = smitePlayers[0];
    assigned.set(jgl, 'JUNGLE');
    unassignedRoles.delete('JUNGLE');
    unassignedPlayers.splice(unassignedPlayers.indexOf(jgl), 1);
  } else if (smitePlayers.length > 1) {
    const jgl =
      smitePlayers.find((p) => {
        const clean = (p.championName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return roleStringToLiveLane(backendChampPosMap.get(clean)?.role) === 'JUNGLE';
      }) || smitePlayers[0];
    assigned.set(jgl, 'JUNGLE');
    unassignedRoles.delete('JUNGLE');
    unassignedPlayers.splice(unassignedPlayers.indexOf(jgl), 1);
  }

  const remRoles = Array.from(unassignedRoles);
  const getPermutations = <P,>(arr: P[]): P[][] => {
    if (arr.length <= 1) return [arr];
    const out: P[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of getPermutations(rest)) out.push([arr[i], ...p]);
    }
    return out;
  };

  const perms = getPermutations(remRoles);
  let bestPerm = perms[0] || remRoles;
  let bestScore = -1;

  for (const perm of perms) {
    let score = 0;
    for (let i = 0; i < unassignedPlayers.length; i++) {
      const p = unassignedPlayers[i];
      const targetRole = perm[i];
      const clean = (p.championName || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const cInfo = backendChampPosMap.get(clean);
      const mainPos = roleStringToLiveLane(cInfo?.role);
      const recPos = (cInfo?.recommendedPositions || []).map(roleStringToLiveLane);

      if (mainPos === targetRole) score += 20;
      else if (recPos.includes(targetRole)) score += 10;

      const apiPos = roleStringToLiveLane(p.teamPosition);
      if (apiPos === targetRole) score += 5;
    }
    if (score > bestScore) {
      bestScore = score;
      bestPerm = perm;
    }
  }

  for (let i = 0; i < unassignedPlayers.length; i++) {
    assigned.set(unassignedPlayers[i], bestPerm[i]);
  }

  for (const role of LIVE_LANE_ROLES) {
    const member = team.find((m) => assigned.get(m) === role);
    if (member) result.set(role, member);
  }

  return result;
}

async function computeLiveLaneMatchups(
  blueTeam: LiveGameParticipant[],
  redTeam: LiveGameParticipant[],
  mapId: number,
  queueId: number
): Promise<{ avgMatchTier: string; laneMatchups: LiveGameLaneMatchup[] }> {
  const allMmrs = [...blueTeam, ...redTeam]
    .map(getParticipantMmr)
    .filter((m): m is number => m !== null);
  const avgMmr =
    allMmrs.length > 0
      ? Math.round(allMmrs.reduce((a, b) => a + b, 0) / allMmrs.length)
      : null;

  const avgMatchTier = mmrToCounterPickTier(avgMmr);

  if (!checkIsSummonersRift(mapId, queueId)) {
    return { avgMatchTier, laneMatchups: [] };
  }

  const blueSlots = assignLiveTeamSlots(blueTeam);
  const redSlots = assignLiveTeamSlots(redTeam);

  const allChampionIds = Array.from(
    new Set(
      [...blueTeam, ...redTeam]
        .map((p) => p.championId)
        .filter((id) => typeof id === 'number' && id > 0)
    )
  );

  const tierChain = getTierFallbackChain(avgMatchTier);
  const lolalyticsRoles = LIVE_LANE_ROLES.map((r) => ROLE_TO_LOLALYTICS[r]);

  const rowMap = new Map<string, { patch: string; matchups: Record<string, CounterMatchupStats | null> }>();

  if (allChampionIds.length > 0) {
    try {
      await ensureCounterPickTableExists();
      const rows = await prisma.counterPick.findMany({
        where: {
          slot: { in: ['current', 'previous'] },
          championId: { in: allChampionIds },
          tier: { in: tierChain },
          role: { in: lolalyticsRoles },
        },
        select: {
          slot: true,
          patch: true,
          championId: true,
          tier: true,
          role: true,
          matchups: true,
        },
      });

      for (const r of rows) {
        rowMap.set(`${r.slot}:${r.championId}:${r.tier}:${r.role}`, {
          patch: r.patch,
          matchups: (r.matchups as Record<string, CounterMatchupStats | null>) || {},
        });
      }
    } catch (err: any) {
      console.warn('[LiveGame] CounterPick lookup failed:', err?.message);
    }
  }

  const laneMatchups: LiveGameLaneMatchup[] = [];

  for (const role of LIVE_LANE_ROLES) {
    const bluePlayer = blueSlots.get(role);
    const redPlayer = redSlots.get(role);
    if (!bluePlayer || !redPlayer) continue;

    const lolalyticsRole = ROLE_TO_LOLALYTICS[role];
    let blueWinrate: number | null = null;
    let games: number | null = null;
    let tierUsed = avgMatchTier;
    let patchUsed: string | null = null;

    outer: for (const slot of ['current', 'previous'] as const) {
      for (const tierCandidate of tierChain) {
        const blueRow = rowMap.get(
          `${slot}:${bluePlayer.championId}:${tierCandidate}:${lolalyticsRole}`
        );
        const blueVsRed = blueRow?.matchups?.[String(redPlayer.championId)];
        if (blueVsRed && typeof blueVsRed.vsWr === 'number') {
          blueWinrate = Math.round(blueVsRed.vsWr * 10) / 10;
          games = typeof blueVsRed.games === 'number' ? blueVsRed.games : null;
          tierUsed = tierCandidate;
          patchUsed = blueRow?.patch || null;
          break outer;
        }

        const redRow = rowMap.get(
          `${slot}:${redPlayer.championId}:${tierCandidate}:${lolalyticsRole}`
        );
        const redVsBlue = redRow?.matchups?.[String(bluePlayer.championId)];
        if (redVsBlue && typeof redVsBlue.vsWr === 'number') {
          blueWinrate = Math.round((100 - redVsBlue.vsWr) * 10) / 10;
          games = typeof redVsBlue.games === 'number' ? redVsBlue.games : null;
          tierUsed = tierCandidate;
          patchUsed = redRow?.patch || null;
          break outer;
        }
      }
    }

    const redWinrate =
      blueWinrate !== null ? Math.round((100 - blueWinrate) * 10) / 10 : null;
    const favoredSide: 'blue' | 'red' | 'even' | null =
      blueWinrate === null
        ? null
        : blueWinrate >= 50.5
        ? 'blue'
        : redWinrate !== null && redWinrate >= 50.5
        ? 'red'
        : 'even';

    laneMatchups.push({
      role,
      lolalyticsRole,
      blueChampionId: bluePlayer.championId,
      blueChampionName: bluePlayer.championName,
      redChampionId: redPlayer.championId,
      redChampionName: redPlayer.championName,
      blueWinrate,
      redWinrate,
      games,
      favoredSide,
      tier: tierUsed,
      requestedTier: avgMatchTier,
      patch: patchUsed,
    });
  }

  return { avgMatchTier, laneMatchups };
}

export function calculateLiveGameWinProbability(
  blueTeam: LiveGameParticipant[],
  redTeam: LiveGameParticipant[],
  mapId?: number,
  queueId?: number,
  laneMatchups: LiveGameLaneMatchup[] = [],
  avgMatchTier?: string
): LiveGameWinProbability {
  const TIER_BASE_LP: Record<string, number> = {
    IRON: 0,
    BRONZE: 400,
    SILVER: 800,
    GOLD: 1200,
    PLATINUM: 1600,
    EMERALD: 2000,
    DIAMOND: 2400,
    MASTER: 2800,
    GRANDMASTER: 3200,
    CHALLENGER: 3600,
  };

  const DIVISION_OFFSET_LP: Record<string, number> = {
    IV: 0,
    III: 100,
    II: 200,
    I: 300,
  };

  function getPlayerMmr(p: LiveGameParticipant | null | undefined): number | null {
    if (!p || !p.rank || !p.rank.tier) return null;
    const tier = (p.rank.tier || '').toUpperCase();
    if (tier === 'UNRANKED' || !tier) return null;
    const base = TIER_BASE_LP[tier];
    if (base === undefined) return null;
    if (tier === 'MASTER' || tier === 'GRANDMASTER' || tier === 'CHALLENGER') {
      return base + (p.rank.leaguePoints || 0);
    }
    const div = (p.rank.rank || 'IV').toUpperCase();
    const divOffset = DIVISION_OFFSET_LP[div] ?? 0;
    return base + divOffset + (p.rank.leaguePoints || 0);
  }

  const safeBlueTeam = Array.isArray(blueTeam) ? blueTeam.filter(Boolean) : [];
  const safeRedTeam = Array.isArray(redTeam) ? redTeam.filter(Boolean) : [];

  // 1. Calculate MMR per team, imputing unranked players with match average
  const allKnownMmrs = [...safeBlueTeam, ...safeRedTeam]
    .map(getPlayerMmr)
    .filter((m): m is number => m !== null);
  const matchAvgMmr =
    allKnownMmrs.length > 0
      ? Math.round(allKnownMmrs.reduce((a, b) => a + b, 0) / allKnownMmrs.length)
      : 1200; // Gold IV fallback

  const blueMmrs = safeBlueTeam.map((p) => getPlayerMmr(p) ?? matchAvgMmr);
  const blueAvgMmr =
    blueMmrs.length > 0
      ? Math.round(blueMmrs.reduce((a, b) => a + b, 0) / blueMmrs.length)
      : matchAvgMmr;

  const redMmrs = safeRedTeam.map((p) => getPlayerMmr(p) ?? matchAvgMmr);
  const redAvgMmr =
    redMmrs.length > 0
      ? Math.round(redMmrs.reduce((a, b) => a + b, 0) / redMmrs.length)
      : matchAvgMmr;

  const rankDiffLp = blueAvgMmr - redAvgMmr;
  // 100 LP (~1 division) = 2.5% swing, clamped to +/-18%
  const mmrAdvantage = Math.max(-18, Math.min(18, rankDiffLp / 40));

  // 2. Ranked Winrates
  const blueWrs = safeBlueTeam
    .filter((p) => p && p.rank && typeof p.rank.winrate === 'number' && ((p.rank.wins || 0) + (p.rank.losses || 0) > 0))
    .map((p) => p.rank!.winrate);
  const redWrs = safeRedTeam
    .filter((p) => p && p.rank && typeof p.rank.winrate === 'number' && ((p.rank.wins || 0) + (p.rank.losses || 0) > 0))
    .map((p) => p.rank!.winrate);

  const blueAvgWinrate =
    blueWrs.length > 0 ? Math.round(blueWrs.reduce((a, b) => a + b, 0) / blueWrs.length) : null;
  const redAvgWinrate =
    redWrs.length > 0 ? Math.round(redWrs.reduce((a, b) => a + b, 0) / redWrs.length) : null;

  let wrAdvantage = 0;
  if (blueAvgWinrate !== null && redAvgWinrate !== null) {
    const wrDelta = blueAvgWinrate - redAvgWinrate;
    wrAdvantage = Math.max(-8, Math.min(8, wrDelta * 0.35));
  }

  // 3. Champion Winrates
  const blueChampWrs = safeBlueTeam
    .filter((p) => p && p.championStats && typeof p.championStats.winrate === 'number' && (p.championStats.games || 0) >= 2)
    .map((p) => p.championStats!.winrate);
  const redChampWrs = safeRedTeam
    .filter((p) => p && p.championStats && typeof p.championStats.winrate === 'number' && (p.championStats.games || 0) >= 2)
    .map((p) => p.championStats!.winrate);

  const blueChampWinrate =
    blueChampWrs.length > 0 ? Math.round(blueChampWrs.reduce((a, b) => a + b, 0) / blueChampWrs.length) : null;
  const redChampWinrate =
    redChampWrs.length > 0 ? Math.round(redChampWrs.reduce((a, b) => a + b, 0) / redChampWrs.length) : null;

  let champAdvantage = 0;
  if (blueChampWinrate !== null && redChampWinrate !== null) {
    const champDelta = blueChampWinrate - redChampWinrate;
    champAdvantage = Math.max(-6, Math.min(6, champDelta * 0.25));
  }

  // 4. Champion Mastery Experience
  function getPlayerMasteryScore(p: LiveGameParticipant): number {
    if (!p.mastery) return 25; // neutral baseline (~5k-10k pts)
    const pts = Math.max(0, p.mastery.championPoints || 0);
    const lvl = Math.max(0, p.mastery.championLevel || 0);

    // Smooth log scale for points (0 to 100)
    // 0 pts -> 0, 5k -> ~33, 25k -> ~56, 50k -> ~66, 100k -> ~76, 250k -> ~90, 500k+ -> 100
    const ptsScore = pts <= 0 ? 0 : Math.min(100, Math.log10(pts / 500 + 1) * 33.3);
    const lvlScore = Math.min(100, lvl * 10);
    return Math.round(ptsScore * 0.85 + lvlScore * 0.15);
  }

  const blueMasteryScores = safeBlueTeam.map(getPlayerMasteryScore);
  const redMasteryScores = safeRedTeam.map(getPlayerMasteryScore);

  const blueAvgMasteryScore =
    blueMasteryScores.length > 0
      ? blueMasteryScores.reduce((a, b) => a + b, 0) / blueMasteryScores.length
      : 25;
  const redAvgMasteryScore =
    redMasteryScores.length > 0
      ? redMasteryScores.reduce((a, b) => a + b, 0) / redMasteryScores.length
      : 25;

  const blueKnownMasteries = safeBlueTeam.filter((p) => p.mastery != null);
  const redKnownMasteries = safeRedTeam.filter((p) => p.mastery != null);

  const blueAvgMasteryPts =
    blueKnownMasteries.length > 0
      ? Math.round(
          blueKnownMasteries.reduce((a, b) => a + (b.mastery?.championPoints || 0), 0) /
            blueKnownMasteries.length
        )
      : null;
  const redAvgMasteryPts =
    redKnownMasteries.length > 0
      ? Math.round(
          redKnownMasteries.reduce((a, b) => a + (b.mastery?.championPoints || 0), 0) /
            redKnownMasteries.length
        )
      : null;

  const blueAvgMasteryLevel =
    blueKnownMasteries.length > 0
      ? Math.round(
          (blueKnownMasteries.reduce((a, b) => a + (b.mastery?.championLevel || 0), 0) /
            blueKnownMasteries.length) *
            10
        ) / 10
      : null;
  const redAvgMasteryLevel =
    redKnownMasteries.length > 0
      ? Math.round(
          (redKnownMasteries.reduce((a, b) => a + (b.mastery?.championLevel || 0), 0) /
            redKnownMasteries.length) *
            10
        ) / 10
      : null;

  let masteryAdvantage = 0;
  if (blueAvgMasteryPts !== null || redAvgMasteryPts !== null) {
    const masteryDelta = blueAvgMasteryScore - redAvgMasteryScore;
    // Map -100..+100 to max +/-7% winrate swing
    masteryAdvantage = Math.max(-7, Math.min(7, Math.round(masteryDelta * 0.07 * 10) / 10));
  }

  // 5. Lane Matchup Advantage (from CounterPick data at avg match rank)
  const validMatchups = laneMatchups.filter((m) => m.blueWinrate !== null);
  let matchupAdvantage = 0;
  let blueAvgMatchupWinrate: number | null = null;
  let redAvgMatchupWinrate: number | null = null;
  if (validMatchups.length > 0) {
    const avgBlueLaneWr =
      validMatchups.reduce((acc, m) => acc + (m.blueWinrate ?? 50), 0) / validMatchups.length;
    blueAvgMatchupWinrate = Math.round(avgBlueLaneWr * 10) / 10;
    redAvgMatchupWinrate = Math.round((100 - blueAvgMatchupWinrate) * 10) / 10;
    const avgEdge = avgBlueLaneWr - 50;
    matchupAdvantage = Math.max(-6, Math.min(6, Math.round(avgEdge * 0.6 * 10) / 10));
  }

  // 6. Map & Side Advantage (Summoner's Rift has ~51.2% Blue bias)
  const isSummonersRift = checkIsSummonersRift(mapId, queueId);
  const sideAdvantage = isSummonersRift ? 1.2 : 0;

  // 7. Total Blue Winrate
  const rawBlue =
    50 +
    mmrAdvantage +
    wrAdvantage +
    champAdvantage +
    masteryAdvantage +
    matchupAdvantage +
    sideAdvantage;
  const clampedBlue = Math.max(20, Math.min(80, rawBlue));
  const blueWinrate = Math.round(clampedBlue * 10) / 10;
  const redWinrate = Math.round((100 - blueWinrate) * 10) / 10;

  const favoredTeam: 'blue' | 'red' | 'even' =
    blueWinrate >= 51.0 ? 'blue' : redWinrate >= 51.0 ? 'red' : 'even';

  const knownCount = allKnownMmrs.length;
  const knownMasteryCount = [...safeBlueTeam, ...safeRedTeam].filter(
    (p) => p.mastery != null
  ).length;
  const confidence: 'high' | 'medium' | 'low' =
    knownCount >= 8 && knownMasteryCount >= 6
      ? 'high'
      : knownCount >= 4 || knownMasteryCount >= 6
      ? 'medium'
      : 'low';

  return {
    blueWinrate,
    redWinrate,
    favoredTeam,
    confidence,
    factors: {
      rankDiffLp,
      blueAvgMmr,
      redAvgMmr,
      blueAvgWinrate,
      redAvgWinrate,
      blueChampWinrate,
      redChampWinrate,
      sideAdvantage,
      blueAvgMasteryPts,
      redAvgMasteryPts,
      blueAvgMasteryLevel,
      redAvgMasteryLevel,
      masteryAdvantage,
      mmrAdvantage,
      wrAdvantage,
      champAdvantage,
      matchupAdvantage,
      blueAvgMatchupWinrate,
      redAvgMatchupWinrate,
      matchupCount: validMatchups.length,
      matchupTier: avgMatchTier || null,
    },
  };
}
