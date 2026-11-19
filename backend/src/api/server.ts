import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import { config } from '../config';
import { healthRoutes } from './routes/health';
import { summonerRoutes } from './routes/summoners';
import { matchRoutes } from './routes/matches';
import { searchRoutes } from './routes/search';
import { disconnectPrisma } from '../db/prisma';

// Polyfill BigInt JSON serialization for Fastify / Prisma responses
(BigInt.prototype as any).toJSON = function () {
  const n = Number(this);
  return Number.isSafeInteger(n) ? n : this.toString();
};

export async function buildServer() {
  const server = Fastify({
    logger: {
      level: config.env === 'development' ? 'info' : 'warn',
    },
  });

  // Security & CORS
  await server.register(helmet, {
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  });

  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  // Register API Routes under /api
  await server.register(
    async (apiScope) => {
      await apiScope.register(healthRoutes);
      await apiScope.register(summonerRoutes);
      await apiScope.register(matchRoutes);
      await apiScope.register(searchRoutes);
    },
    { prefix: '/api' }
  );

  // Also register root healthcheck for direct container monitoring
  await server.register(healthRoutes);

  return server;
}

async function start() {
  try {
    const server = await buildServer();
    const address = await server.listen({
      port: config.port,
      host: '0.0.0.0',
    });
    console.log(`🚀 RiftHero Fastify REST API running at: ${address}`);

    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}. Shutting down API server gracefully...`);
      await server.close();
      await disconnectPrisma();
      console.log('👋 API Server stopped cleanly.');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err) {
    console.error('Fatal error starting API server:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}
