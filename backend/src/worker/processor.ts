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

  // 4. Upsert Summoner in PostgreSQL
  const encryptedSummonerId = (summonerDto as any).id || null;
  const encryptedAccountId = (summonerDto as any).accountId || null;

  const savedSummoner = await prisma.summoner.upsert({
    where: { puuid },
    create: {
      puuid,
      gameName: cleanGameName,
      tagLine: cleanTagLine,
      region,
      platform,
      summonerId: encryptedSummonerId,
      accountId: encryptedAccountId,
      profileIconId: summonerDto.profileIconId,
      summonerLevel: BigInt(summonerDto.summonerLevel),
      revisionDate: summonerDto.revisionDate ? BigInt(summonerDto.revisionDate) : null,
      lastFetchedAt: new Date(),
    },
    update: {
      gameName: cleanGameName,
      tagLine: cleanTagLine,
      region,
      platform,
      summonerId: encryptedSummonerId,
      accountId: encryptedAccountId,
      profileIconId: summonerDto.profileIconId,
      summonerLevel: BigInt(summonerDto.summonerLevel),
      revisionDate: summonerDto.revisionDate ? BigInt(summonerDto.revisionDate) : null,
      lastFetchedAt: new Date(),
    },
  });

  // 5. Upsert Ranks
  if (Array.isArray(leagueEntries)) {
    for (const entry of leagueEntries) {
      await prisma.summonerRank.upsert({
        where: {
          summonerId_queueType: {
            summonerId: savedSummoner.id,
            queueType: entry.queueType,
          },
        },
        create: {
          summonerId: savedSummoner.id,
          queueType: entry.queueType,
          tier: entry.tier,
          rank: entry.rank,
          leaguePoints: entry.leaguePoints,
          wins: entry.wins,
          losses: entry.losses,
          veteran: entry.veteran || false,
          inactive: entry.inactive || false,
          freshBlood: entry.freshBlood || false,
          hotStreak: entry.hotStreak || false,
        },
        update: {
          tier: entry.tier,
          rank: entry.rank,
          leaguePoints: entry.leaguePoints,
          wins: entry.wins,
          losses: entry.losses,
          veteran: entry.veteran || false,
          inactive: entry.inactive || false,
          freshBlood: entry.freshBlood || false,
          hotStreak: entry.hotStreak || false,
        },
      });
    }
  }

  // 6. Match-v5 (Regional routing: europe, americas, asia)
  const targetMatchCount = matchCount || config.initialMatchCount;
  let matchIds: string[] = [];
  try {
    matchIds = await rApi.matchV5.getIdsByPuuid({
      cluster: cluster as any,
      puuid,
      params: {
        start: 0,
        count: targetMatchCount,
      },
    });
  } catch (err: any) {
    job.log(`[Worker] Error fetching match IDs for ${puuid}: ${err.message}`);
    return;
  }

  job.log(`[Worker] Found ${matchIds.length} matches for ${cleanGameName}#${cleanTagLine}. Ingesting...`);

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

      // Upsert Match
      await prisma.match.upsert({
        where: { id: matchId },
        create: {
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
        },
        update: {
          gameDuration: info.gameDuration,
          queueId: info.queueId,
        },
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
