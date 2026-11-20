import { FastifyInstance } from 'fastify';
import { getMetaChampions, getFullTierList } from '../../services/metaService';

export async function metaRoutes(fastify: FastifyInstance) {
  // Top 4 meta picks per role
  fastify.get('/meta/champions', async (request, reply) => {
    try {
      const meta = await getMetaChampions();
      return meta;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve meta champions');
      return reply.status(500).send({ error: 'Failed to retrieve meta champions' });
    }
  });

  // Full Tier List across all positions
  fastify.get('/meta/tier-list', async (request, reply) => {
    try {
      const { role } = request.query as { role?: string };
      const tierList = await getFullTierList(role);
      return tierList;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve tier list');
      return reply.status(500).send({ error: 'Failed to retrieve tier list' });
    }
  });
}
