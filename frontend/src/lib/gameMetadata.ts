import queuesData from './data/queues.json';
import gameTypesData from './data/gameTypes.json';
import mapsData from './data/maps.json';
import gameModesData from './data/gameModes.json';
import { GameQueue, GameType, GameMap, GameMode } from '@/types';

// In-memory lookups initialized with bundled official Riot data
const queuesMap = new Map<number, GameQueue>();
const gameTypesMap = new Map<string, GameType>();
const mapsMap = new Map<number, GameMap>();
const gameModesMap = new Map<string, GameMode>();

(queuesData as GameQueue[]).forEach((q) => queuesMap.set(q.queueId, q));
(gameTypesData as GameType[]).forEach((gt) => gameTypesMap.set(gt.gametype.toUpperCase(), gt));
(mapsData as GameMap[]).forEach((m) => mapsMap.set(m.mapId, m));
(gameModesData as GameMode[]).forEach((gm) => gameModesMap.set(gm.gameMode.toUpperCase(), gm));

/**
 * Format a human-friendly queue display name from official Riot description.
 */
export function formatQueueName(queue?: GameQueue | null): string {
  if (!queue) return 'Unknown Queue';
  if (!queue.description) {
    return queue.map || `Queue ${queue.queueId}`;
  }

  let name = queue.description.trim();
  // Strip standard prefixes & suffixes
  name = name.replace(/^5v5\s+/i, '');
  name = name.replace(/^3v3\s+/i, '');
  name = name.replace(/^6v6\s+/i, '');
  name = name.replace(/\s+games$/i, '');

  const lower = name.toLowerCase();
  if (lower === 'ranked solo') return 'Ranked Solo/Duo';
  if (lower === 'ranked flex') return 'Ranked Flex';
  if (lower === 'draft pick') return 'Normal Draft';
  if (lower === 'blind pick') return 'Normal Blind';
  if (lower === 'normal (quickplay)') return 'Quickplay';
  if (lower === 'summoner\'s rift clash') return 'Clash';
  if (lower === 'aram clash') return 'ARAM Clash';

  return name;
}

/**
 * Get queue information by queueId.
 */
export function getQueue(queueId?: number | null): GameQueue | undefined {
  if (queueId === undefined || queueId === null) return undefined;
  return queuesMap.get(queueId);
}

/**
 * Get clean display name for queue (e.g. 420 -> "Ranked Solo/Duo", 450 -> "ARAM", 1700 -> "Arena").
 */
export function getQueueName(queueId?: number | null): string {
  if (queueId === undefined || queueId === null) return 'Queue';
  const q = queuesMap.get(queueId);
  if (!q) return `Queue ${queueId}`;
  return formatQueueName(q);
}

/**
 * Get raw official Riot description for queue (e.g. "5v5 Ranked Solo games").
 */
export function getQueueDescription(queueId?: number | null): string {
  if (queueId === undefined || queueId === null) return '';
  const q = queuesMap.get(queueId);
  return q?.description || q?.map || `Queue ${queueId}`;
}

/**
 * Get map associated with queue.
 */
export function getQueueMap(queueId?: number | null): string {
  if (queueId === undefined || queueId === null) return '';
  const q = queuesMap.get(queueId);
  return q?.map || '';
}

/**
 * Dynamically check if a queue is a Ranked queue.
 * Replaces hardcoded checks like (queueId === 420 || queueId === 440 || queueId === 710).
 */
export function isRankedQueue(queueId?: number | null): boolean {
  if (!queueId) return false;
  if (queueId === 420 || queueId === 440 || queueId === 710) return true;
  const q = queuesMap.get(queueId);
  if (!q) return false;
  const desc = (q.description || '').toLowerCase();
  return desc.includes('ranked');
}

/**
 * Get map details by mapId.
 */
export function getMap(mapId?: number | null): GameMap | undefined {
  if (mapId === undefined || mapId === null) return undefined;
  return mapsMap.get(mapId);
}

/**
 * Get official map name by mapId (e.g. 11 -> "Summoner's Rift", 12 -> "Howling Abyss", 30 -> "Rings of Wrath", 35 -> "The Bandlewood").
 */
export function getMapName(mapId?: number | null): string {
  if (mapId === undefined || mapId === null) return "Summoner's Rift";
  const m = mapsMap.get(mapId);
  if (m?.mapName) return m.mapName;
  if (mapId === 11 || mapId === 1 || mapId === 2) return "Summoner's Rift";
  if (mapId === 12 || mapId === 14) return 'Howling Abyss';
  if (mapId === 30) return 'Rings of Wrath';
  if (mapId === 21) return 'Nexus Blitz';
  if (mapId === 22) return 'Convergence';
  if (mapId === 35) return 'The Bandlewood';
  return `Map ${mapId}`;
}

/**
 * Get game mode details by gameMode key (e.g. "CLASSIC", "ARAM", "CHERRY").
 */
export function getGameMode(gameMode?: string | null): GameMode | undefined {
  if (!gameMode) return undefined;
  return gameModesMap.get(gameMode.toUpperCase());
}

/**
 * Get official game mode description (e.g. "CLASSIC" -> "Classic Summoner's Rift and Twisted Treeline games").
 */
export function getGameModeDescription(gameMode?: string | null): string {
  if (!gameMode) return 'Classic';
  const gm = gameModesMap.get(gameMode.toUpperCase());
  if (gm?.description) return gm.description;
  if (gameMode.toUpperCase() === 'CHERRY') return 'Arena';
  return gameMode;
}

/**
 * Get game type details by gametype string (e.g. "MATCHED_GAME", "CUSTOM_GAME").
 */
export function getGameType(gameType?: string | null): GameType | undefined {
  if (!gameType) return undefined;
  return gameTypesMap.get(gameType.toUpperCase());
}

/**
 * Get game type description (e.g. "MATCHED_GAME" -> "Matched Game" or "all other games").
 */
export function getGameTypeDescription(gameType?: string | null): string {
  if (!gameType) return 'Matched Game';
  const gt = gameTypesMap.get(gameType.toUpperCase());
  if (gt?.description) return gt.description;
  if (gameType.toUpperCase() === 'MATCHED_GAME') return 'Matched Game';
  if (gameType.toUpperCase() === 'CUSTOM_GAME') return 'Custom Game';
  if (gameType.toUpperCase() === 'TUTORIAL_GAME') return 'Tutorial Game';
  return gameType;
}

/**
 * Check if the game is played on Summoner's Rift without hardcoded lists.
 */
export function isSummonersRift(mapId?: number | null, queueId?: number | null): boolean {
  if (mapId !== undefined && mapId !== null) {
    if (mapId === 11 || mapId === 1 || mapId === 2) return true;
    const m = mapsMap.get(mapId);
    if (m && m.mapName.toLowerCase().includes("summoner's rift")) return true;
  }
  if (queueId !== undefined && queueId !== null) {
    const q = queuesMap.get(queueId);
    if (q && q.map && q.map.toLowerCase().includes("summoner's rift")) return true;
    if ([420, 440, 400, 430, 490, 700].includes(queueId)) return true;
  }
  return false;
}

/**
 * Get all available queues.
 */
export function getAllQueues(): GameQueue[] {
  return Array.from(queuesMap.values());
}
