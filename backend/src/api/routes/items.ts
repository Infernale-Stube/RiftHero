import { FastifyInstance } from 'fastify';
import { getItemsRoster, getItemDetail, computeAndSaveItemSnapshot } from '../../services/itemService';

export async function itemRoutes(fastify: FastifyInstance) {
  // Full Items Roster from 'item_snapshots' table (0 client calls to Riot API!)
  fastify.get('/items', async (request, reply) => {
    try {
      const { locale } = request.query as { locale?: string };
      const roster = await getItemsRoster(locale || 'de');
      return roster;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve items roster');
      return reply.status(500).send({ error: 'Failed to retrieve items roster' });
    }
  });

  // Individual Item Detail (recipes, stats, build path, descriptions)
  fastify.get('/items/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { locale } = request.query as { locale?: string };
      const detail = await getItemDetail(id, locale || 'de');
      if (!detail.item) {
        return reply.status(404).send({ error: `Item '${id}' not found` });
      }
      return detail;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve item detail');
      return reply.status(500).send({ error: 'Failed to retrieve item detail' });
    }
  });

  // Manual Trigger to re-sync items table from Riot DDragon
  fastify.post('/items/sync', async (request, reply) => {
    try {
      const result = await computeAndSaveItemSnapshot(true);
      return {
        success: true,
        version: result.version,
        patch: result.patch,
        totalItems: result.totalItems,
      };
    } catch (err) {
      request.log.error(err, 'Failed to sync items');
      return reply.status(500).send({ error: 'Failed to sync items' });
    }
  });
}
