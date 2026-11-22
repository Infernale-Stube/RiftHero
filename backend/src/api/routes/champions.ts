import { FastifyInstance } from 'fastify';
import {
  getChampionsRoster,
  getChampionDetail,
  getAllSkins,
  syncChampionSnapshot,
} from '../../services/championService';

export async function championsRoutes(fastify: FastifyInstance) {
  // Force refresh champion catalog snapshot from DDragon + LoLDB
  fastify.all('/champions/refresh', async (request, reply) => {
    try {
      const result = await syncChampionSnapshot(true);
      return {
        success: true,
        message: 'Champion catalog refreshed successfully from DDragon & LoLDB',
        version: result.version,
        patch: result.patch,
        slot: result.id,
        championsCount: result.championsCount,
      };
    } catch (err) {
      request.log.error(err, 'Failed to refresh champion catalog');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // Localized champion catalog roster (supports optional slot: 'current' | 'previous')
  fastify.get('/champions', async (request, reply) => {
    try {
      const { locale, slot } = request.query as { locale?: string; slot?: 'current' | 'previous' };
      const roster = await getChampionsRoster(locale || 'de', slot || 'current');
      return roster;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve champions roster');
      return reply.status(500).send({ error: 'Failed to retrieve champions roster' });
    }
  });

  // Individual champion details (spells, passives, lore, stats, skins)
  fastify.get('/champions/:slug', async (request, reply) => {
    try {
      const { slug } = request.params as { slug: string };
      const { locale, slot } = request.query as { locale?: string; slot?: 'current' | 'previous' };
      const detail = await getChampionDetail(slug, locale || 'de', slot || 'current');
      if (!detail || !detail.champion) {
        return reply.status(404).send({ error: `Champion '${slug}' not found` });
      }
      return detail;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve champion detail');
      return reply.status(500).send({ error: 'Failed to retrieve champion detail' });
    }
  });

  // Complete skins catalog from LoLDB /skins
  fastify.get('/skins', async (request, reply) => {
    try {
      const { champion } = request.query as { champion?: string };
      const skins = await getAllSkins(champion);
      return skins;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve skins catalog');
      return reply.status(500).send({ error: 'Failed to retrieve skins catalog' });
    }
  });

  // Skins for a specific champion
  fastify.get('/skins/:champion', async (request, reply) => {
    try {
      const { champion } = request.params as { champion: string };
      const skins = await getAllSkins(champion);
      return skins;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve skins for champion');
      return reply.status(500).send({ error: 'Failed to retrieve skins for champion' });
    }
  });
}
