import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../db/prisma';
import { getSummonerMatches, getSummonerChampionStats } from '../../services/matchService';
import { getMatchDetails } from '../../services/matchDetailService';
import { parseRiotIdTag } from './summoners';
import { normalizeRegion } from '../../riot/regions';

export async function matchRoutes(fastify: FastifyInstance) {
  // Get matches list
  fastify.get(
    '/summoners/:region/:tag/matches',
    async (
      request: FastifyRequest<{
        Params: { region: string; tag: string };
        Querystring: {
          queue?: string;
          championId?: string;
          role?: string;
          result?: 'win' | 'loss' | 'all';
          limit?: string;
          offset?: string;
        };
      }>,
      reply: FastifyReply
    ) => {
      const { region: rawRegion, tag } = request.params;
      const { queue, championId, role, result, limit, offset } = request.query;
      const { gameName, tagLine } = parseRiotIdTag(tag);
      const region = normalizeRegion(rawRegion);

      // Find summoner to obtain puuid
      const summoner = await prisma.summoner.findFirst({
        where: {
          region,
          gameName: { equals: gameName, mode: 'insensitive' },
          tagLine: { equals: tagLine, mode: 'insensitive' },
        },
        select: { puuid: true },
      });

      if (!summoner) {
        return { matches: [], total: 0 };
      }

      const take = limit ? Math.min(parseInt(limit, 10), 50) : 10;
      const skip = offset ? parseInt(offset, 10) : 0;
      const parsedChampId = championId ? parseInt(championId, 10) : undefined;

      const matchesResult = await getSummonerMatches(summoner.puuid, {
        queueFilter: queue,
        championId: isNaN(parsedChampId as number) ? undefined : parsedChampId,
        role,
        result,
        limit: take,
        offset: skip,
      });

      return matchesResult;
    }
  );

  // Get aggregated champion stats
  fastify.get(
    '/summoners/:region/:tag/champion-stats',
    async (
      request: FastifyRequest<{
        Params: { region: string; tag: string };
        Querystring: { queue?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { region: rawRegion, tag } = request.params;
      const { queue } = request.query;
      const { gameName, tagLine } = parseRiotIdTag(tag);
      const region = normalizeRegion(rawRegion);

      const summoner = await prisma.summoner.findFirst({
        where: {
          region,
          gameName: { equals: gameName, mode: 'insensitive' },
          tagLine: { equals: tagLine, mode: 'insensitive' },
        },
        select: { puuid: true },
      });

      if (!summoner) {
        return [];
      }

      const stats = await getSummonerChampionStats(summoner.puuid, queue);
      return stats;
    }
  );

  // Get single full match details (dedicated match page)
  fastify.get(
    '/matches/:region/:matchId',
    async (
      request: FastifyRequest<{
        Params: { region: string; matchId: string };
      }>,
      reply: FastifyReply
    ) => {
      const { region, matchId } = request.params;
      const details = await getMatchDetails(region, matchId);

      if (!details) {
        return reply.status(404).send({
          error: 'Not Found',
          message: `Match ${matchId} not found`,
        });
      }

      return details;
    }
  );
}
