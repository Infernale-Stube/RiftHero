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
import { syncParticipantLpForQueue, computePeakRank } from '../services/lpService';
import { calculateMatchScores } from '../services/scoreService';
import { isRankedQueue, getRankedQueueIds } from '../services/gameMetadataService';

function withTimeout<T>(promise: Promise<T>, ms = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
}

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
    ? leagueEntries.find((e: any) => e.queueType?.toUpperCase() === 'RANKED_SOLO_5X5')
    : undefined;
  const flexEntry = Array.isArray(leagueEntries)
    ? leagueEntries.find((e: any) => e.queueType?.toUpperCase() === 'RANKED_FLEX_SR')
    : undefined;
  const ranked5sEntry = Array.isArray(leagueEntries)
    ? leagueEntries.find((e: any) => {
        const q = e.queueType?.toUpperCase();
        return (
          q === 'RANKED_PREMADE_5X5' ||
          q === 'RANKED_TEAM_5X5' ||
          q === 'RANKED_5S' ||
          q === 'RANKED_5X5' ||
          q === 'CHERRY'
        );
      })
    : undefined;

  console.log(`[Worker] League entries parsed for ${cleanGameName}#${cleanTagLine}: Solo=${soloEntry?.tier} ${soloEntry?.rank} (${soloEntry?.leaguePoints} LP), Flex=${flexEntry?.tier} ${flexEntry?.rank} (${flexEntry?.leaguePoints} LP), Ranked5s=${ranked5sEntry?.tier} ${ranked5sEntry?.rank} (${ranked5sEntry?.leaguePoints} LP)`);

  // 5. Query existing summoner to preserve or update peak ranks and rank fallbacks
  const existingSummoner = await prisma.summoner.findUnique({
    where: { puuid },
  });

  const effectiveSoloTier = soloEntry?.tier || existingSummoner?.soloTier || null;
  const effectiveSoloRank = soloEntry?.rank || existingSummoner?.soloRank || null;
  const effectiveSoloLp = soloEntry?.leaguePoints ?? existingSummoner?.soloLp ?? 0;
  const effectiveSoloWins = soloEntry?.wins ?? existingSummoner?.soloWins ?? 0;
  const effectiveSoloLosses = soloEntry?.losses ?? existingSummoner?.soloLosses ?? 0;

  const effectiveFlexTier = flexEntry?.tier || existingSummoner?.flexTier || null;
  const effectiveFlexRank = flexEntry?.rank || existingSummoner?.flexRank || null;
  const effectiveFlexLp = flexEntry?.leaguePoints ?? existingSummoner?.flexLp ?? 0;
  const effectiveFlexWins = flexEntry?.wins ?? existingSummoner?.flexWins ?? 0;
  const effectiveFlexLosses = flexEntry?.losses ?? existingSummoner?.flexLosses ?? 0;

  const effectiveRanked5sTier = ranked5sEntry?.tier || existingSummoner?.ranked5sTier || null;
  const effectiveRanked5sRank = ranked5sEntry?.rank || existingSummoner?.ranked5sRank || null;
  const effectiveRanked5sLp = ranked5sEntry?.leaguePoints ?? existingSummoner?.ranked5sLp ?? 0;
  const effectiveRanked5sWins = ranked5sEntry?.wins ?? existingSummoner?.ranked5sWins ?? 0;
  const effectiveRanked5sLosses = ranked5sEntry?.losses ?? existingSummoner?.ranked5sLosses ?? 0;

  const soloPeak = computePeakRank(
    effectiveSoloTier,
    effectiveSoloRank,
    effectiveSoloLp,
    existingSummoner?.soloPeakTier,
    existingSummoner?.soloPeakRank,
    existingSummoner?.soloPeakLp
  );

  const flexPeak = computePeakRank(
    effectiveFlexTier,
    effectiveFlexRank,
    effectiveFlexLp,
    existingSummoner?.flexPeakTier,
    existingSummoner?.flexPeakRank,
    existingSummoner?.flexPeakLp
  );

  const ranked5sPeak = computePeakRank(
    effectiveRanked5sTier,
    effectiveRanked5sRank,
    effectiveRanked5sLp,
    existingSummoner?.ranked5sPeakTier,
    existingSummoner?.ranked5sPeakRank,
    existingSummoner?.ranked5sPeakLp
  );

  // Upsert Summoner in PostgreSQL (Ranks & Peaks integrated directly!)
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
      soloTier: effectiveSoloTier,
      soloRank: effectiveSoloRank,
      soloLp: effectiveSoloLp,
      soloWins: effectiveSoloWins,
      soloLosses: effectiveSoloLosses,
      soloPeakTier: soloPeak.peakTier,
      soloPeakRank: soloPeak.peakRank,
      soloPeakLp: soloPeak.peakLp,
      flexTier: effectiveFlexTier,
      flexRank: effectiveFlexRank,
      flexLp: effectiveFlexLp,
      flexWins: effectiveFlexWins,
      flexLosses: effectiveFlexLosses,
      flexPeakTier: flexPeak.peakTier,
      flexPeakRank: flexPeak.peakRank,
      flexPeakLp: flexPeak.peakLp,
      ranked5sTier: effectiveRanked5sTier,
      ranked5sRank: effectiveRanked5sRank,
      ranked5sLp: effectiveRanked5sLp,
      ranked5sWins: effectiveRanked5sWins,
      ranked5sLosses: effectiveRanked5sLosses,
      ranked5sPeakTier: ranked5sPeak.peakTier,
      ranked5sPeakRank: ranked5sPeak.peakRank,
      ranked5sPeakLp: ranked5sPeak.peakLp,
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
      soloTier: effectiveSoloTier,
      soloRank: effectiveSoloRank,
      soloLp: effectiveSoloLp,
      soloWins: effectiveSoloWins,
      soloLosses: effectiveSoloLosses,
      soloPeakTier: soloPeak.peakTier,
      soloPeakRank: soloPeak.peakRank,
      soloPeakLp: soloPeak.peakLp,
      flexTier: effectiveFlexTier,
      flexRank: effectiveFlexRank,
      flexLp: effectiveFlexLp,
      flexWins: effectiveFlexWins,
      flexLosses: effectiveFlexLosses,
      flexPeakTier: flexPeak.peakTier,
      flexPeakRank: flexPeak.peakRank,
      flexPeakLp: flexPeak.peakLp,
      ranked5sTier: effectiveRanked5sTier,
      ranked5sRank: effectiveRanked5sRank,
      ranked5sLp: effectiveRanked5sLp,
      ranked5sWins: effectiveRanked5sWins,
      ranked5sLosses: effectiveRanked5sLosses,
      ranked5sPeakTier: ranked5sPeak.peakTier,
      ranked5sPeakRank: ranked5sPeak.peakRank,
      ranked5sPeakLp: ranked5sPeak.peakLp,
    },
  });

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

        // Check if any match in this batch was already ingested for this player
        const existingCount = await prisma.matchParticipant.count({
          where: {
            puuid,
            matchId: { in: batch },
          },
        });

        // If this summoner already exists in DB and we hit previously ingested matches,
        // we have connected with historical data and can safely stop fetching further batches!
        if (existingSummoner && existingCount > 0) {
          console.log(`[Worker] Found ${existingCount} previously ingested matches in batch. Stopping pagination to conserve API limits.`);
          break;
        }

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
  const newlyIngestedRankedMatches: Array<{
    matchId: string;
    queueId: number;
    participants: Array<{ puuid: string; gameName: string; tagLine: string }>;
  }> = [];

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

    if (existingMatch && existingMatch.participants.length > 0) {
      continue;
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

        // Red Objectives
        redTowerKills: redObj.tower?.kills ?? 0,
        redInhibitorKills: redObj.inhibitor?.kills ?? 0,
        redBaronKills: redObj.baron?.kills ?? 0,
        redDragonKills: redObj.dragon?.kills ?? 0,
        redRiftHeraldKills: redObj.riftHerald?.kills ?? 0,
        redHordeKills: redObj.horde?.kills ?? 0,
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
        const matchScores = calculateMatchScores(info.participants, info.gameDuration);

        for (const p of info.participants) {
          const isMainPlayer = p.puuid === puuid;
          const heroScore = matchScores.get(p.puuid)?.score ?? null;

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
              riotIdGameName: participantGameName,
              riotIdTagline: participantTagline,
              championId: p.championId,
              champLevel: p.champLevel || 1,
              teamId: p.teamId,
              win: p.win,
              teamPosition: p.teamPosition && p.teamPosition.trim() ? p.teamPosition.trim().toUpperCase() : null,
              profileIcon: (p as any).profileIcon || 29,
              kills: p.kills,
              deaths: p.deaths,
              assists: p.assists,
              totalDamageDealtToChampions: p.totalDamageDealtToChampions,
              totalDamageTaken: p.totalDamageTaken,
              totalMinionsKilled: (p.totalMinionsKilled || 0) + (p.neutralMinionsKilled || 0),
              visionScore: p.visionScore,
              visionWardsBoughtInGame: p.visionWardsBoughtInGame,
              wardsPlaced: p.wardsPlaced,
              wardsKilled: p.wardsKilled,
              goldEarned: p.goldEarned,
              heroScore,
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
            },
            update: {
              championId: p.championId,
              win: p.win,
              teamPosition: p.teamPosition && p.teamPosition.trim() ? p.teamPosition.trim().toUpperCase() : null,
              kills: p.kills,
              deaths: p.deaths,
              assists: p.assists,
              heroScore,
              item0: p.item0,
              item1: p.item1,
              item2: p.item2,
              item3: p.item3,
              item4: p.item4,
              item5: p.item5,
              item6: p.item6,
            },
          });

          // Persist basic summoner profile for every match participant
          const participantProfileIcon = (p as any).profileIcon || 29;
          const participantSummonerLevel = (p as any).summonerLevel ? BigInt((p as any).summonerLevel) : BigInt(30);

          if (p.puuid && !isMainPlayer && participantGameName !== 'Unknown') {
            await prisma.summoner.upsert({
              where: { puuid: p.puuid },
              create: {
                puuid: p.puuid,
                gameName: participantGameName,
                tagLine: participantTagline,
                region,
                platform,
                profileIconId: participantProfileIcon,
                summonerLevel: participantSummonerLevel,
              },
              update: {
                gameName: participantGameName,
                tagLine: participantTagline || undefined,
                profileIconId: participantProfileIcon,
                summonerLevel: participantSummonerLevel,
              },
            }).catch(() => {});
          }

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

        if (isRankedQueue(info.queueId)) {
          newlyIngestedRankedMatches.push({
            matchId,
            queueId: info.queueId,
            participants: info.participants.map((part: any) => ({
              puuid: part.puuid,
              gameName: part.riotIdName || (part as any).riotIdGameName || part.summonerName || 'Unknown',
              tagLine: part.riotIdTagline || '',
              profileIcon: (part as any).profileIcon || 29,
              summonerLevel: (part as any).summonerLevel || 30,
            })),
          });
        }
      }

      await job.updateProgress(Math.round(((i + 1) / matchIds.length) * 100));
    } catch (err: any) {
      job.log(`[Worker] Failed to ingest match ${matchId}: ${err.message}`);
    }
  }

  // 7. Synchronize LP deltas and post-game rank onto match participants for the 3 ranked queues (Solo, Flex, 5s)
  console.log(`[Worker] Step 7: Checking LP sync for ${cleanGameName}#${cleanTagLine} (puuid=${puuid})...`);

  if (effectiveSoloTier && effectiveSoloTier.toUpperCase() !== 'UNRANKED') {
    try {
      console.log(`[Worker] Syncing Solo/Duo LP (queue 420): ${effectiveSoloTier} ${effectiveSoloRank} ${effectiveSoloLp} LP`);
      await syncParticipantLpForQueue(
        puuid,
        420,
        effectiveSoloTier,
        effectiveSoloRank,
        effectiveSoloLp
      );
    } catch (err: any) {
      console.error(`[Worker] Failed to sync Solo LP for ${puuid}:`, err);
      job.log(`[Worker] Failed to sync Solo LP: ${err.message}`);
    }
  } else {
    console.log(`[Worker] Skipping Solo/Duo LP sync: summoner is unranked in Solo/Duo`);
  }

  if (effectiveFlexTier && effectiveFlexTier.toUpperCase() !== 'UNRANKED') {
    try {
      console.log(`[Worker] Syncing Flex LP (queue 440): ${effectiveFlexTier} ${effectiveFlexRank} ${effectiveFlexLp} LP`);
      await syncParticipantLpForQueue(
        puuid,
        440,
        effectiveFlexTier,
        effectiveFlexRank,
        effectiveFlexLp
      );
    } catch (err: any) {
      console.error(`[Worker] Failed to sync Flex LP for ${puuid}:`, err);
      job.log(`[Worker] Failed to sync Flex LP: ${err.message}`);
    }
  } else {
    console.log(`[Worker] Skipping Flex LP sync: summoner is unranked in Flex`);
  }

  if (effectiveRanked5sTier && effectiveRanked5sTier.toUpperCase() !== 'UNRANKED') {
    try {
      console.log(`[Worker] Syncing Ranked 5s LP (queue 710): ${effectiveRanked5sTier} ${effectiveRanked5sRank} ${effectiveRanked5sLp} LP`);
      await syncParticipantLpForQueue(
        puuid,
        710, // Ranked 5s queue ID
        effectiveRanked5sTier,
        effectiveRanked5sRank,
        effectiveRanked5sLp
      );
    } catch (err: any) {
      console.error(`[Worker] Failed to sync Ranked 5s LP for ${puuid}:`, err);
      job.log(`[Worker] Failed to sync Ranked 5s LP: ${err.message}`);
    }
  } else {
    console.log(`[Worker] Skipping Ranked 5s LP sync: summoner is unranked in Ranked 5s`);
  }

  // 7b. Synchronize LP and post-game rank for all fellow participants in ranked matches
  if (newlyIngestedRankedMatches.length === 0) {
    const latestDbMatch = await prisma.match.findFirst({
      where: {
        queueId: { in: getRankedQueueIds() },
        participants: { some: { puuid } },
      },
      orderBy: { gameCreation: 'desc' },
      include: {
        participants: {
          select: {
            puuid: true,
            riotIdGameName: true,
            riotIdTagline: true,
            profileIcon: true,
            postGameTier: true,
          },
        },
      },
    });

    if (latestDbMatch && latestDbMatch.participants.some((p) => p.puuid !== puuid && !p.postGameTier)) {
      newlyIngestedRankedMatches.push({
        matchId: latestDbMatch.id,
        queueId: latestDbMatch.queueId,
        participants: latestDbMatch.participants.map((p) => ({
          puuid: p.puuid,
          gameName: p.riotIdGameName,
          tagLine: p.riotIdTagline,
          profileIcon: p.profileIcon || 29,
          summonerLevel: 30,
        })),
      });
    }
  }

  const fellowParticipantMap = new Map<
    string,
    {
      puuid: string;
      gameName: string;
      tagLine: string;
      profileIcon: number;
      summonerLevel: number;
      queueId: number;
    }
  >();
  for (const m of newlyIngestedRankedMatches) {
    for (const p of m.participants) {
      if (p.puuid && p.puuid !== puuid && !fellowParticipantMap.has(p.puuid)) {
        fellowParticipantMap.set(p.puuid, {
          puuid: p.puuid,
          gameName: p.gameName,
          tagLine: p.tagLine,
          profileIcon: (p as any).profileIcon || 29,
          summonerLevel: (p as any).summonerLevel || 30,
          queueId: m.queueId,
        });
      }
    }
  }

  if (fellowParticipantMap.size > 0) {
    console.log(`[Worker] Step 7b: Syncing LP/rank for ${fellowParticipantMap.size} fellow participants in ranked matches...`);

    const fellowPuuids = Array.from(fellowParticipantMap.keys());
    const existingFellows = await prisma.summoner.findMany({
      where: { puuid: { in: fellowPuuids } },
      select: {
        puuid: true,
        gameName: true,
        tagLine: true,
        profileIconId: true,
        summonerLevel: true,
        lastFetchedAt: true,
        soloTier: true,
        soloRank: true,
        soloLp: true,
        soloWins: true,
        soloLosses: true,
        soloPeakTier: true,
        soloPeakRank: true,
        soloPeakLp: true,
        flexTier: true,
        flexRank: true,
        flexLp: true,
        flexWins: true,
        flexLosses: true,
        flexPeakTier: true,
        flexPeakRank: true,
        flexPeakLp: true,
        ranked5sTier: true,
        ranked5sRank: true,
        ranked5sLp: true,
        ranked5sWins: true,
        ranked5sLosses: true,
        ranked5sPeakTier: true,
        ranked5sPeakRank: true,
        ranked5sPeakLp: true,
      },
    });

    const fellowDbMap = new Map<string, any>();
    for (const f of existingFellows) {
      fellowDbMap.set(f.puuid, f);
    }

    const missingRankPuuids = fellowPuuids.filter((fPuuid) => {
      const dbSummoner = fellowDbMap.get(fPuuid);
      if (!dbSummoner || !dbSummoner.lastFetchedAt) return true;
      const isStale = Date.now() - new Date(dbSummoner.lastFetchedAt).getTime() > 15 * 60 * 1000;
      if (isStale) return true;
      const queueId = fellowParticipantMap.get(fPuuid)!.queueId;
      if (queueId === 420) return !dbSummoner.soloTier;
      if (queueId === 440) return !dbSummoner.flexTier;
      if (queueId === 710) return !dbSummoner.ranked5sTier;
      return false;
    });

    if (missingRankPuuids.length > 0) {
      console.log(`[Worker] Fetching live ranks for ${missingRankPuuids.length} fellow participants from Riot League API...`);
      await Promise.allSettled(
        missingRankPuuids.map(async (fPuuid) => {
          try {
            const entries = await withTimeout(
              rApi.league.getEntriesByPUUID({
                region: platform as any,
                puuid: fPuuid,
              }),
              3000
            );

            if (Array.isArray(entries)) {
              const fSolo = entries.find((e: any) => e.queueType?.toUpperCase() === 'RANKED_SOLO_5X5');
              const fFlex = entries.find((e: any) => e.queueType?.toUpperCase() === 'RANKED_FLEX_SR');
              const f5s = entries.find((e: any) => {
                const q = e.queueType?.toUpperCase();
                return (
                  q === 'RANKED_PREMADE_5X5' ||
                  q === 'RANKED_TEAM_5X5' ||
                  q === 'RANKED_5S' ||
                  q === 'RANKED_5X5' ||
                  q === 'CHERRY'
                );
              });

              const info = fellowParticipantMap.get(fPuuid);
              if (info) {
                const prev = fellowDbMap.get(fPuuid);
                const soloPeak = computePeakRank(
                  fSolo?.tier || prev?.soloTier,
                  fSolo?.rank || prev?.soloRank,
                  fSolo?.leaguePoints ?? prev?.soloLp ?? 0,
                  prev?.soloPeakTier,
                  prev?.soloPeakRank,
                  prev?.soloPeakLp
                );
                const flexPeak = computePeakRank(
                  fFlex?.tier || prev?.flexTier,
                  fFlex?.rank || prev?.flexRank,
                  fFlex?.leaguePoints ?? prev?.flexLp ?? 0,
                  prev?.flexPeakTier,
                  prev?.flexPeakRank,
                  prev?.flexPeakLp
                );
                const ranked5sPeak = computePeakRank(
                  f5s?.tier || prev?.ranked5sTier,
                  f5s?.rank || prev?.ranked5sRank,
                  f5s?.leaguePoints ?? prev?.ranked5sLp ?? 0,
                  prev?.ranked5sPeakTier,
                  prev?.ranked5sPeakRank,
                  prev?.ranked5sPeakLp
                );

                await prisma.summoner.upsert({
                  where: { puuid: fPuuid },
                  create: {
                    puuid: fPuuid,
                    gameName: info.gameName || 'Unknown',
                    tagLine: info.tagLine || '',
                    region,
                    platform,
                    profileIconId: info.profileIcon || 29,
                    summonerLevel: BigInt(info.summonerLevel || 30),
                    lastFetchedAt: new Date(),
                    soloTier: fSolo?.tier || null,
                    soloRank: fSolo?.rank || null,
                    soloLp: fSolo?.leaguePoints ?? 0,
                    soloWins: fSolo?.wins ?? 0,
                    soloLosses: fSolo?.losses ?? 0,
                    soloPeakTier: soloPeak.peakTier,
                    soloPeakRank: soloPeak.peakRank,
                    soloPeakLp: soloPeak.peakLp,
                    flexTier: fFlex?.tier || null,
                    flexRank: fFlex?.rank || null,
                    flexLp: fFlex?.leaguePoints ?? 0,
                    flexWins: fFlex?.wins ?? 0,
                    flexLosses: fFlex?.losses ?? 0,
                    flexPeakTier: flexPeak.peakTier,
                    flexPeakRank: flexPeak.peakRank,
                    flexPeakLp: flexPeak.peakLp,
                    ranked5sTier: f5s?.tier || null,
                    ranked5sRank: f5s?.rank || null,
                    ranked5sLp: f5s?.leaguePoints ?? 0,
                    ranked5sWins: f5s?.wins ?? 0,
                    ranked5sLosses: f5s?.losses ?? 0,
                    ranked5sPeakTier: ranked5sPeak.peakTier,
                    ranked5sPeakRank: ranked5sPeak.peakRank,
                    ranked5sPeakLp: ranked5sPeak.peakLp,
                  },
                  update: {
                    gameName: info.gameName || undefined,
                    tagLine: info.tagLine || undefined,
                    region,
                    platform,
                    profileIconId: info.profileIcon || undefined,
                    summonerLevel: info.summonerLevel ? BigInt(info.summonerLevel) : undefined,
                    lastFetchedAt: new Date(),
                    soloTier: fSolo?.tier || undefined,
                    soloRank: fSolo?.rank || undefined,
                    soloLp: fSolo?.leaguePoints !== undefined ? fSolo.leaguePoints : undefined,
                    soloWins: fSolo?.wins !== undefined ? fSolo.wins : undefined,
                    soloLosses: fSolo?.losses !== undefined ? fSolo.losses : undefined,
                    soloPeakTier: soloPeak.peakTier,
                    soloPeakRank: soloPeak.peakRank,
                    soloPeakLp: soloPeak.peakLp,
                    flexTier: fFlex?.tier || undefined,
                    flexRank: fFlex?.rank || undefined,
                    flexLp: fFlex?.leaguePoints !== undefined ? fFlex.leaguePoints : undefined,
                    flexWins: fFlex?.wins !== undefined ? fFlex.wins : undefined,
                    flexLosses: fFlex?.losses !== undefined ? fFlex.losses : undefined,
                    flexPeakTier: flexPeak.peakTier,
                    flexPeakRank: flexPeak.peakRank,
                    flexPeakLp: flexPeak.peakLp,
                    ranked5sTier: f5s?.tier || undefined,
                    ranked5sRank: f5s?.rank || undefined,
                    ranked5sLp: f5s?.leaguePoints !== undefined ? f5s.leaguePoints : undefined,
                    ranked5sWins: f5s?.wins !== undefined ? f5s.wins : undefined,
                    ranked5sLosses: f5s?.losses !== undefined ? f5s.losses : undefined,
                    ranked5sPeakTier: ranked5sPeak.peakTier,
                    ranked5sPeakRank: ranked5sPeak.peakRank,
                    ranked5sPeakLp: ranked5sPeak.peakLp,
                  },
                });

                fellowDbMap.set(fPuuid, {
                  puuid: fPuuid,
                  soloTier: fSolo?.tier || prev?.soloTier || null,
                  soloRank: fSolo?.rank || prev?.soloRank || null,
                  soloLp: fSolo?.leaguePoints ?? prev?.soloLp ?? 0,
                  flexTier: fFlex?.tier || prev?.flexTier || null,
                  flexRank: fFlex?.rank || prev?.flexRank || null,
                  flexLp: fFlex?.leaguePoints ?? prev?.flexLp ?? 0,
                  ranked5sTier: f5s?.tier || prev?.ranked5sTier || null,
                  ranked5sRank: f5s?.rank || prev?.ranked5sRank || null,
                  ranked5sLp: f5s?.leaguePoints ?? prev?.ranked5sLp ?? 0,
                });
              }
            }
          } catch {
            // Ignore rate limits or lookup errors for fellow participants
          }
        })
      );
    }

    for (const [fPuuid, fellow] of fellowParticipantMap.entries()) {
      try {
        const dbSummoner = fellowDbMap.get(fPuuid);
        if (!dbSummoner) continue;

        let tier: string | null = null;
        let rank: string | null = null;
        let lp: number | null = null;

        if (fellow.queueId === 420) {
          tier = dbSummoner.soloTier;
          rank = dbSummoner.soloRank;
          lp = dbSummoner.soloLp;
        } else if (fellow.queueId === 440) {
          tier = dbSummoner.flexTier;
          rank = dbSummoner.flexRank;
          lp = dbSummoner.flexLp;
        } else if (fellow.queueId === 710) {
          tier = dbSummoner.ranked5sTier;
          rank = dbSummoner.ranked5sRank;
          lp = dbSummoner.ranked5sLp;
        }

        if (tier && tier.toUpperCase() !== 'UNRANKED') {
          await syncParticipantLpForQueue(fPuuid, fellow.queueId, tier, rank, lp);
        }
      } catch (err: any) {
        console.error(`[Worker] Failed fellow participant LP sync for ${fPuuid}:`, err?.message || err);
      }
    }
  }

  // 8. Trigger Snowball Background Crawling for fellow 9 players
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
