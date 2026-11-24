import { FastifyInstance } from 'fastify';
import {
  getMetaChampions,
  getFullTierList,
  computeAndSaveMetaAnalysis,
  getStoredMetaPatches,
} from '../../services/metaService';
import {
  getAllGameMetadata,
  syncGameMetadata,
  getQueue,
  getMap,
  getGameMode,
  getGameType,
} from '../../services/gameMetadataService';

export async function metaRoutes(fastify: FastifyInstance) {
  // Stored / Live Riot Game Metadata: queues, maps, gameModes, gameTypes
  fastify.get('/meta/game-data', async () => {
    return getAllGameMetadata();
  });

  fastify.get('/meta/queues', async () => {
    return getAllGameMetadata().queues;
  });

  fastify.get('/meta/maps', async () => {
    return getAllGameMetadata().maps;
  });

  fastify.get('/meta/game-modes', async () => {
    return getAllGameMetadata().gameModes;
  });

  fastify.get('/meta/game-types', async () => {
    return getAllGameMetadata().gameTypes;
  });

  fastify.all('/meta/sync-game-data', async (request, reply) => {
    try {
      const result = await syncGameMetadata(true);
      return {
        success: true,
        message: 'Game metadata synchronized successfully with official Riot endpoints',
        ...result,
      };
    } catch (err) {
      request.log.error(err, 'Failed to sync game metadata');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });
  // Force refresh precomputed meta analysis (winrates, pickrates, tier lists from matches)
  fastify.all('/meta/refresh', async (request, reply) => {
    try {
      const result = await computeAndSaveMetaAnalysis();
      return {
        success: true,
        message: 'Meta analysis recomputed successfully from match data',
        patch: result.patch,
        slot: result.id,
        totalMatches: result.totalMatches,
      };
    } catch (err) {
      request.log.error(err, 'Failed to refresh meta snapshot');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // Stored patch slots (current and previous)
  fastify.get('/meta/patches', async (request, reply) => {
    try {
      const patches = await getStoredMetaPatches();
      return patches;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve stored meta patches');
      return reply.status(500).send({ error: 'Failed to retrieve stored meta patches' });
    }
  });

  // Top 4 meta picks per role
  fastify.get('/meta/champions', async (request, reply) => {
    try {
      const { slot } = request.query as { slot?: 'current' | 'previous' };
      const meta = await getMetaChampions(slot || 'current');
      return meta;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve meta champions');
      return reply.status(500).send({ error: 'Failed to retrieve meta champions' });
    }
  });

  // Full Tier List across all positions
  fastify.get('/meta/tier-list', async (request, reply) => {
    try {
      const { role, slot } = request.query as { role?: string; slot?: 'current' | 'previous' };
      const tierList = await getFullTierList(role, slot || 'current');
      return tierList;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve tier list');
      return reply.status(500).send({ error: 'Failed to retrieve tier list' });
    }
  });
}
