import { FastifyInstance } from 'fastify';
import {
  getCounterPickMeta,
  getChampionCounterPicks,
  getPoolCounterPicks,
  syncCounterPicksForCurrentPatch,
  CounterPickSlot,
} from '../../services/counterPickService';

export async function counterpickRoutes(fastify: FastifyInstance) {
  // Metadata: champions list (from Champion table), patches (current & previous), tiers, roles
  fastify.get('/counterpicks/meta', async (request, reply) => {
    try {
      const { locale } = request.query as { locale?: string };
      return await getCounterPickMeta(locale || 'de');
    } catch (err) {
      request.log.error(err, 'Failed to retrieve counterpicks metadata');
      return reply.status(500).send({ error: 'Failed to retrieve counterpicks metadata' });
    }
  });

  // Force refresh counterpicks for current patch (manual trigger)
  fastify.all('/counterpicks/refresh', async (request, reply) => {
    try {
      const result = await syncCounterPicksForCurrentPatch(true);
      return {
        success: true,
        message: 'CounterPick sync completed for current patch',
        ...result,
      };
    } catch (err) {
      request.log.error(err, 'Failed to refresh counterpicks');
      return reply.status(500).send({ error: (err as Error).message });
    }
  });

  // Personal champion pool recommendations against an opponent pick
  fastify.post('/counterpicks/pool', async (request, reply) => {
    try {
      const body = (request.body || {}) as {
        enemyChampion?: string;
        poolChampionIds?: number[];
        tier?: string;
        role?: string;
        slot?: CounterPickSlot;
        locale?: string;
      };

      if (!body.enemyChampion || typeof body.enemyChampion !== 'string') {
        return reply.status(400).send({ error: 'enemyChampion is required' });
      }

      const poolIds = Array.isArray(body.poolChampionIds) ? body.poolChampionIds : [];
      const data = await getPoolCounterPicks({
        enemyChampion: body.enemyChampion,
        poolChampionIds: poolIds,
        tier: body.tier,
        role: body.role,
        slot: body.slot,
        locale: body.locale,
      });

      if (!data) {
        return reply.status(404).send({ error: `Champion '${body.enemyChampion}' not found` });
      }

      return data;
    } catch (err) {
      request.log.error(err, 'Failed to evaluate pool counterpicks');
      return reply.status(500).send({ error: 'Failed to evaluate pool counterpicks' });
    }
  });

  // Counterpicks for a specific champion, tier, role, and patch slot ('current' | 'previous')
  fastify.get('/counterpicks/:champion', async (request, reply) => {
    try {
      const { champion } = request.params as { champion: string };
      const { tier, role, slot, locale } = request.query as {
        tier?: string;
        role?: string;
        slot?: CounterPickSlot;
        locale?: string;
      };

      const data = await getChampionCounterPicks({
        champion,
        tier,
        role,
        slot,
        locale,
      });

      if (!data) {
        return reply.status(404).send({ error: `Champion '${champion}' not found` });
      }

      return data;
    } catch (err) {
      request.log.error(err, 'Failed to retrieve champion counterpicks');
      return reply.status(500).send({ error: 'Failed to retrieve champion counterpicks' });
    }
  });
}
