import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getLiveGame } from '../../services/liveGameService';
import { parseRiotIdTag } from './summoners';

export async function liveGameRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/summoners/:region/:tag/live-game',
    async (
      request: FastifyRequest<{
        Params: { region: string; tag: string };
      }>,
      reply: FastifyReply
    ) => {
      const { region, tag } = request.params;
      const { gameName, tagLine } = parseRiotIdTag(tag);

      if (!gameName) {
        return reply.status(400).send({
          error: 'Bad Request',
          message: 'Invalid Riot ID',
        });
      }

      try {
        const result = await getLiveGame(region, gameName, tagLine);
        return result;
      } catch (err: any) {
        console.error('[LiveGame Route Error]:', err);
        return {
          inGame: false,
          message: 'Fehler beim Abrufen des Live-Spiels: ' + (err?.message || 'Unbekannter Fehler'),
        };
      }
    }
  );
}
