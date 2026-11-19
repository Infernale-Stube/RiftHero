import { RiotAPI } from '@fightmegg/riot-api';
import { config } from '../config';

let riotApiInstance: RiotAPI | null = null;

export function getRiotClient(): RiotAPI {
  if (riotApiInstance) return riotApiInstance;

  if (!config.riotApiKey) {
    console.warn('⚠️ [Riot API] WARNING: RIOT_API_KEY is empty or invalid in config!');
  }

  riotApiInstance = new RiotAPI(config.riotApiKey, {
    debug: config.env === 'development',
  });

  return riotApiInstance;
}
