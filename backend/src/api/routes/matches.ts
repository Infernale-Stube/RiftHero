import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../../db/prisma';
import { getSummonerMatches, getSummonerChampionStats } from '../../services/matchService';
import { parseRiotIdTag } from './summoners';
import { normalizeRegion } from '../../riot/regions';

export async function matchRoutes(fastify: FastifyInstance) {
  // Get matches list
  fastify.get(
    '/summoners/:region/:tag/matches',
    async (
      request: FastifyRequest<{
        Params: { region: string; tag: string };
        Querystring: { queue?: string; limit?: string; offset?: string };
      }>,
      reply: FastifyReply
    ) => {
      const { region: rawRegion, tag } = request.params;
      const { queue, limit, offset } = request.query;
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

      const take = limit ? Math.min(parseInt(limit, 10), 50) : 20;
      const skip = offset ? parseInt(offset, 10) : 0;

      const result = await getSummonerMatches(summoner.puuid, {
        queueFilter: queue,
        limit: take,
        offset: skip,
      });

      return result;
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
}
