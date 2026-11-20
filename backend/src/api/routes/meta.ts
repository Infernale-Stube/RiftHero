import { FastifyInstance } from 'fastify';
import { getMetaChampions } from '../../services/metaService';

export async function metaRoutes(fastify: FastifyInstance) {
  fastify.get('/meta/champions', async (request, reply) => {
    try {
      const meta = await getMetaChampions();
      return meta;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve meta champions');
      return reply.status(500).send({ error: 'Failed to retrieve meta champions' });
    }
  });
}
