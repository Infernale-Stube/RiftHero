import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getSummonerProfile,
  getRecentSummoners,
} from '../../services/summonerService';
import { getSummonerJobStatus } from '../../queue/bullmq';
import { normalizeRegion } from '../../riot/regions';

export function parseRiotIdTag(tagParam: string): { gameName: string; tagLine: string } {
  const decoded = decodeURIComponent(tagParam);
  // If user passed GameName#TagLine directly
  if (decoded.includes('#')) {
    const [name, tag] = decoded.split('#');
    return { gameName: name, tagLine: tag };
  }
  // If formatted as GameName-TagLine, split by the last hyphen
  const lastHyphenIndex = decoded.lastIndexOf('-');
  if (lastHyphenIndex !== -1) {
    return {
      gameName: decoded.slice(0, lastHyphenIndex),
      tagLine: decoded.slice(lastHyphenIndex + 1),
    };
  }
  return { gameName: decoded, tagLine: '' };
}

export async function summonerRoutes(fastify: FastifyInstance) {
  // Recent summoners feed for homepage
  fastify.get('/summoners/recent', async (request: FastifyRequest) => {
    const { limit } = request.query as { limit?: string };
    const take = limit ? Math.min(parseInt(limit, 10), 30) : 10;
    return await getRecentSummoners(take);
  });

  // Summoner profile lookup & auto-refresh trigger
  fastify.get(
    '/summoners/:region/:tag',
    async (
      request: FastifyRequest<{
        Params: { region: string; tag: string };
      }>,
      reply: FastifyReply
    ) => {
      const { region, tag } = request.params;
      const { gameName, tagLine } = parseRiotIdTag(tag);

      if (!gameName || !tagLine) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid Riot ID format. Expected format: GameName-TagLine (e.g. Faker-T1 or Agurin-EUW)',
        });
      }

      const result = await getSummonerProfile(region, gameName, tagLine);
      return result;
    }
  );

  // Background refresh job status check
  fastify.get(
    '/summoners/:region/:tag/status',
    async (
      request: FastifyRequest<{
        Params: { region: string; tag: string };
      }>,
      reply: FastifyReply
    ) => {
      const { region, tag } = request.params;
      const { gameName, tagLine } = parseRiotIdTag(tag);

      if (!gameName || !tagLine) {
        return reply.status(400).send({ error: 'Invalid Riot ID format' });
      }

      const status = await getSummonerJobStatus(normalizeRegion(region), gameName, tagLine);
      return { status };
    }
  );
}
