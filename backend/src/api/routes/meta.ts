import { FastifyInstance } from 'fastify';
import {
  getMetaChampions,
  getFullTierList,
  getChampionsRoster,
  getChampionDetail,
  computeAndSaveMetaAnalysis,
} from '../../services/metaService';

export async function metaRoutes(fastify: FastifyInstance) {
  // Force refresh precomputed champion & meta snapshot
  fastify.all('/meta/refresh', async (request, reply) => {
    try {
      const result = await computeAndSaveMetaAnalysis();
      return {
        success: true,
        message: 'Champion snapshot recomputed successfully from DDragon & LoLDB',
        patch: result.patch,
        championsCount: result.championsCount,
      };
    } catch (err) {
      request.log.error(err, 'Failed to refresh meta snapshot');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
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

  // Full Champions Roster from 'champion_snapshots' table (0 client calls to Riot API!)
  fastify.get('/champions', async (request, reply) => {
    try {
      const { locale } = request.query as { locale?: string };
      const roster = await getChampionsRoster(locale || 'de');
      return roster;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve champions roster');
      return reply.status(500).send({ error: 'Failed to retrieve champions roster' });
    }
  });

  // Individual Champion Details (spells, passive, lore, skins) cached server-side
  fastify.get('/champions/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      const { locale } = request.query as { locale?: string };
      const detail = await getChampionDetail(slug, locale || 'de');
      if (!detail.champion) {
        return reply.status(404).send({ error: `Champion '${slug}' not found` });
      }
      return detail;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve champion detail');
      return reply.status(500).send({ error: 'Failed to retrieve champion detail' });
    }
  });
}
