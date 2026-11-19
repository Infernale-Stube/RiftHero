import { FastifyInstance } from 'fastify';
import { prisma } from '../../db/prisma';

export async function healthRoutes(fastify: FastifyInstance) {
  fastify.get('/health', async () => {
    let dbStatus = 'healthy';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'unhealthy';
    }

    return {
      status: dbStatus === 'healthy' ? 'ok' : 'degraded',
      service: 'rifthero-api',
      uptime: process.uptime(),
      db: dbStatus,
      timestamp: new Date().toISOString(),
    };
  });
}
