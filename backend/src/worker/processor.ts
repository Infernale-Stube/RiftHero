import { Job } from 'bullmq';
import { prisma } from '../db/prisma';
import { getRiotClient } from '../riot/client';
import {
  normalizeRegion,
  getPlatformForRegion,
  getClusterForRegion,
} from '../riot/regions';
import {
  SummonerJobData,
  enqueueLowPrioritySummoner,
} from '../queue/bullmq';
import { config } from '../config';
import { recordLpSnapshot } from '../services/lpService';

export async function processSummonerJob(job: Job<SummonerJobData>): Promise<void> {
  const { gameName, tagLine, region: rawRegion, matchCount, isSnowball } = job.data;
  const region = normalizeRegion(rawRegion);
  const platform = getPlatformForRegion(region);
  const cluster = getClusterForRegion(region);

  const rApi = getRiotClient();

  job.log(`[Worker] Starting ingestion for ${gameName}#${tagLine} (${region.toUpperCase()}) - Priority: ${isSnowball ? 'LOW (Snowball)' : 'HIGH'}`);

  // 1. Account-v1 (Regional routing: europe, americas, asia)
  let account;
  try {
    account = await rApi.account.getByRiotId({
      region: cluster as any,
      gameName,
      tagLine,
    });
  } catch (err: any) {
    if (err.status === 404 || err.statusCode === 404) {
      job.log(`[Worker] Account ${gameName}#${tagLine} not found on cluster ${cluster}`);
      return;
    }
    throw err;
  }

  const { puuid } = account;
  const cleanGameName = account.gameName || gameName;
  const cleanTagLine = account.tagLine || tagLine;

  // 2. Summoner-v4 (Platform routing: euw1, na1, kr, etc.)
  let summonerDto;
  try {
    summonerDto = await rApi.summoner.getByPUUID({
      region: platform as any,
      puuid,
    });
  } catch (err: any) {
    job.log(`[Worker] Summoner data not found on platform ${platform} for puuid ${puuid}: ${err.message}`);
    // Account exists on cluster but might not have LoL profile on this platform
    return;
  }

  // 3. League-v4 (Platform routing)
  let leagueEntries: any[] = [];
  try {
    leagueEntries = await rApi.league.getEntriesByPUUID({
      region: platform as any,
      puuid,
    });
  } catch (err: any) {
    // Fallback: try by summonerId if available
    const encryptedId = (summonerDto as any).id;
    if (encryptedId) {
      try {
        leagueEntries = await (rApi.league as any).getEntriesBySummonerId({
          region: platform as any,
          summonerId: encryptedId,
        });
      } catch (e) {
        job.log(`[Worker] League entries lookup fallback also failed: ${(e as Error).message}`);
      }
    }
  }

  // 4. Parse league entries
  const soloEntry = Array.isArray(leagueEntries)
    ? leagueEntries.find((e: any) => e.queueType === 'RANKED_SOLO_5x5')
    : undefined;
  const flexEntry = Array.isArray(leagueEntries)
    ? leagueEntries.find((e: any) => e.queueType === 'RANKED_FLEX_SR')
    : undefined;
  const ranked5sEntry = Array.isArray(leagueEntries)
    ? leagueEntries.find((e: any) =>
        e.queueType === 'RANKED_PREMADE_5x5' ||
        e.queueType === 'RANKED_TEAM_5x5' ||
        e.queueType === 'RANKED_5s' ||
        e.queueType === 'RANKED_5X5' ||
        e.queueType === 'CHERRY'
      )
    : undefined;

  // 5. Upsert Summoner in PostgreSQL (Ranks integrated directly!)
  const savedSummoner = await prisma.summoner.upsert({
    where: { puuid },
    create: {
      puuid,
      gameName: cleanGameName,
      tagLine: cleanTagLine,
      region,
      platform,
      profileIconId: summonerDto.profileIconId,
      summonerLevel: BigInt(summonerDto.summonerLevel),
      revisionDate: summonerDto.revisionDate ? BigInt(summonerDto.revisionDate) : null,
      lastFetchedAt: new Date(),
      soloTier: soloEntry?.tier || null,
      soloRank: soloEntry?.rank || null,
      soloLp: soloEntry?.leaguePoints ?? 0,
      soloWins: soloEntry?.wins ?? 0,
      soloLosses: soloEntry?.losses ?? 0,
      flexTier: flexEntry?.tier || null,
      flexRank: flexEntry?.rank || null,
      flexLp: flexEntry?.leaguePoints ?? 0,
      flexWins: flexEntry?.wins ?? 0,
      flexLosses: flexEntry?.losses ?? 0,
      ranked5sTier: ranked5sEntry?.tier || null,
      ranked5sRank: ranked5sEntry?.rank || null,
      ranked5sLp: ranked5sEntry?.leaguePoints ?? 0,
      ranked5sWins: ranked5sEntry?.wins ?? 0,
      ranked5sLosses: ranked5sEntry?.losses ?? 0,
    },
    update: {
      gameName: cleanGameName,
      tagLine: cleanTagLine,
      region,
      platform,
      profileIconId: summonerDto.profileIconId,
      summonerLevel: BigInt(summonerDto.summonerLevel),
      revisionDate: summonerDto.revisionDate ? BigInt(summonerDto.revisionDate) : null,
      lastFetchedAt: new Date(),
      soloTier: soloEntry?.tier || null,
      soloRank: soloEntry?.rank || null,
      soloLp: soloEntry?.leaguePoints ?? 0,
      soloWins: soloEntry?.wins ?? 0,
      soloLosses: soloEntry?.losses ?? 0,
      flexTier: flexEntry?.tier || null,
      flexRank: flexEntry?.rank || null,
      flexLp: flexEntry?.leaguePoints ?? 0,
      flexWins: flexEntry?.wins ?? 0,
      flexLosses: flexEntry?.losses ?? 0,
      ranked5sTier: ranked5sEntry?.tier || null,
      ranked5sRank: ranked5sEntry?.rank || null,
      ranked5sLp: ranked5sEntry?.leaguePoints ?? 0,
      ranked5sWins: ranked5sEntry?.wins ?? 0,
      ranked5sLosses: ranked5sEntry?.losses ?? 0,
    },
  });

  // 6. Record LP Snapshots if ranks exist
  if (soloEntry) {
    try {
      await recordLpSnapshot(
        savedSummoner.id,
        'RANKED_SOLO_5x5',
        soloEntry.tier,
        soloEntry.rank,
        soloEntry.leaguePoints,
        soloEntry.wins,
        soloEntry.losses
      );
    } catch {
      // Ignore snapshot errors
    }
  }

  if (flexEntry) {
    try {
      await recordLpSnapshot(
        savedSummoner.id,
        'RANKED_FLEX_SR',
        flexEntry.tier,
        flexEntry.rank,
        flexEntry.leaguePoints,
        flexEntry.wins,
        flexEntry.losses
      );
    } catch {
      // Ignore snapshot errors
    }
  }

  if (ranked5sEntry) {
    try {
      await recordLpSnapshot(
        savedSummoner.id,
        ranked5sEntry.queueType,
        ranked5sEntry.tier,
        ranked5sEntry.rank,
        ranked5sEntry.leaguePoints,
        ranked5sEntry.wins,
        ranked5sEntry.losses
      );
    } catch {
      // Ignore snapshot errors
    }
  }

  // 6. Match-v5 (Regional routing: europe, americas, asia)
  let matchIds: string[] = [];
  try {
    if (isSnowball) {
      // Snowball crawling uses limited depth (e.g. 20) to preserve rate limits
      const targetCount = matchCount || config.snowballMatchDepth;
      matchIds = await rApi.matchV5.getIdsByPuuid({
        cluster: cluster as any,
        puuid,
        params: {
          start: 0,
          count: targetCount,
        },
      });
    } else {
      // Active user profile: Paginate to fetch ALL matches into database!
      let start = 0;
      const batchSize = 100;
      const seasonStart = config.seasonStartEpoch;

      while (start < config.maxSeasonMatches) {
        const params: any = {
          start,
          count: batchSize,
        };
        // Only set startTime if a non-zero timestamp is provided
        if (seasonStart && seasonStart > 0) {
          params.startTime = seasonStart;
        }

        const batch = await rApi.matchV5.getIdsByPuuid({
          cluster: cluster as any,
          puuid,
          params,
        });

        if (!batch || batch.length === 0) break;
        matchIds.push(...batch);
        start += batch.length;

        job.log(`[Worker] Match Crawler: Found ${matchIds.length} match IDs so far...`);

        // Reached end of history
        if (batch.length < batchSize) break;
      }
    }
  } catch (err: any) {
    job.log(`[Worker] Error fetching match IDs for ${puuid}: ${err.message}`);
    return;
  }

  job.log(`[Worker] Ingesting total of ${matchIds.length} matches for ${cleanGameName}#${cleanTagLine}...`);

  const snowballCandidates: Array<{ gameName: string; tagLine: string; region: string }> = [];

  for (let i = 0; i < matchIds.length; i++) {
    const matchId = matchIds[i];

    // Check if match already exists in database
    const existingMatch = await prisma.match.findUnique({
      where: { id: matchId },
      include: {
        participants: {
          where: { puuid },
        },
      },
    });

    if (existingMatch) {
      // If match exists and our summoner is already connected, skip
      if (existingMatch.participants.length > 0) {
        const p = existingMatch.participants[0];
        if (!p.summonerId) {
          await prisma.matchParticipant.update({
            where: { id: p.id },
            data: { summonerId: savedSummoner.id },
          });
        }
        continue;
      }
    }

    try {
      // Fetch full match from Riot Match-v5
      const matchData = await rApi.matchV5.getMatchById({
        cluster: cluster as any,
        matchId,
      });

      if (!matchData || !matchData.info) continue;

      const { info, metadata } = matchData;

      const blueTeam = info.teams?.find((t: any) => t.teamId === 100);
      const redTeam = info.teams?.find((t: any) => t.teamId === 200);

      const blueBans = blueTeam?.bans || [];
      const redBans = redTeam?.bans || [];

      const blueObj = (blueTeam?.objectives || {}) as any;
      const redObj = (redTeam?.objectives || {}) as any;

      const matchDataToSave = {
        gameDuration: info.gameDuration,
        gameEndTimestamp: info.gameEndTimestamp ? BigInt(info.gameEndTimestamp) : null,
        gameMode: info.gameMode,
        gameType: info.gameType,
        gameVersion: info.gameVersion,
        mapId: info.mapId,
        queueId: info.queueId,
        endOfGameResult: info.endOfGameResult || null,

        // Blue Bans (championId > 0)
        blueBan1: blueBans[0]?.championId > 0 ? blueBans[0].championId : null,
        blueBan2: blueBans[1]?.championId > 0 ? blueBans[1].championId : null,
        blueBan3: blueBans[2]?.championId > 0 ? blueBans[2].championId : null,
        blueBan4: blueBans[3]?.championId > 0 ? blueBans[3].championId : null,
        blueBan5: blueBans[4]?.championId > 0 ? blueBans[4].championId : null,

        // Red Bans (championId > 0)
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
      };

      // Upsert Match
      await prisma.match.upsert({
        where: { id: matchId },
        create: {
          id: matchId,
          gameCreation: BigInt(info.gameCreation),
          ...matchDataToSave,
        },
        update: matchDataToSave,
      });

      // Save all 10 participants
      if (Array.isArray(info.participants)) {
        for (const p of info.participants) {
          const isMainPlayer = p.puuid === puuid;
          const kdaValue = p.deaths === 0
            ? p.kills + p.assists
            : Number(((p.kills + p.assists) / p.deaths).toFixed(2));

          const participantGameName = p.riotIdName || (p as any).riotIdGameName || p.summonerName || 'Unknown';
          const participantTagline = p.riotIdTagline || '';

          await prisma.matchParticipant.upsert({
            where: {
              matchId_puuid: {
                matchId,
                puuid: p.puuid,
              },
            },
            create: {
              matchId,
              puuid: p.puuid,
              summonerId: isMainPlayer ? savedSummoner.id : null,
              riotIdGameName: participantGameName,
              riotIdTagline: participantTagline,
              championId: p.championId,
              championName: p.championName,
              champLevel: p.champLevel || 1,
              teamId: p.teamId,
              win: p.win,
              role: p.role || null,
              lane: p.lane || null,
              teamPosition: p.teamPosition || null,
              profileIcon: (p as any).profileIcon || 29,
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
            },
            update: {
              summonerId: isMainPlayer ? savedSummoner.id : undefined,
              championId: p.championId,
              championName: p.championName,
              win: p.win,
              kills: p.kills,
              deaths: p.deaths,
              assists: p.assists,
              kda: kdaValue,
              item0: p.item0,
              item1: p.item1,
              item2: p.item2,
              item3: p.item3,
              item4: p.item4,
              item5: p.item5,
              item6: p.item6,
            },
          });

          // Collect candidates for snowballing if crawler is active
          if (
            config.enableSnowballCrawler &&
            !isSnowball &&
            !isMainPlayer &&
            participantGameName !== 'Unknown' &&
            participantTagline
          ) {
            snowballCandidates.push({
              gameName: participantGameName,
              tagLine: participantTagline,
              region,
            });
          }
        }
      }

      await job.updateProgress(Math.round(((i + 1) / matchIds.length) * 100));
    } catch (err: any) {
      job.log(`[Worker] Failed to ingest match ${matchId}: ${err.message}`);
    }
  }

  // 7. Trigger Snowball Background Crawling for fellow 9 players
  if (config.enableSnowballCrawler && !isSnowball && snowballCandidates.length > 0) {
    job.log(`[Worker] Snowball Crawler: Found ${snowballCandidates.length} fellow player candidates. Enqueueing to low-priority queue...`);
    
    // Deduplicate candidates
    const uniqueCandidates = new Map<string, { gameName: string; tagLine: string; region: string }>();
    for (const c of snowballCandidates) {
      const key = `${c.gameName.toLowerCase()}#${c.tagLine.toLowerCase()}`;
      if (!uniqueCandidates.has(key)) {
        uniqueCandidates.set(key, c);
      }
    }

    let enqueuedCount = 0;
    for (const candidate of uniqueCandidates.values()) {
      try {
        const res = await enqueueLowPrioritySummoner({
          gameName: candidate.gameName,
          tagLine: candidate.tagLine,
          region: candidate.region,
          matchCount: config.snowballMatchDepth,
        });
        if (res) enqueuedCount++;
      } catch (err) {
        // Ignore enqueue errors in snowball
      }
    }
    job.log(`[Worker] Snowball Crawler: Enqueued ${enqueuedCount} players into low priority queue`);
  }

  job.log(`[Worker] Successfully completed ingestion for ${cleanGameName}#${cleanTagLine}`);
}
