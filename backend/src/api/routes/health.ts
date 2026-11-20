import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma';
import { getLatestDDragonVersion } from '../../riot/ddragon';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    let dbStatus = 'healthy';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'unhealthy';
    }

    const ddragonVersion = await getLatestDDragonVersion();

    return {
      status: dbStatus === 'healthy' ? 'ok' : 'degraded',
      service: 'rifthero-api',
      uptime: process.uptime(),
      db: dbStatus,
      ddragonVersion,
      timestamp: new Date().toISOString(),
    };
  });
}
