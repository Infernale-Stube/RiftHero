import { FastifyInstance, FastifyRequest } from 'fastify';
import { searchSummoners } from '../../services/summonerService';

export async function searchRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/search',
    async (
      request: FastifyRequest<{
        Querystring: { q?: string; region?: string; limit?: string };
      }>
    ) => {
      const { q = '', region, limit } = request.query;
      const take = limit ? Math.min(parseInt(limit, 10), 10) : 6;
      return await searchSummoners(q, region, take);
    }
  );
}
