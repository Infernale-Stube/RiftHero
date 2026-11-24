import { prisma } from '../db/prisma';
import fs from 'fs';
import path from 'path';

export interface RiotQueue {
  queueId: number;
  map: string;
  description: string | null;
  notes: string | null;
}

export interface RiotGameType {
  gametype: string;
  description: string;
}

export interface RiotMap {
  mapId: number;
  mapName: string;
  notes?: string | null;
}

export interface RiotGameMode {
  gameMode: string;
  description: string;
}

export interface GameMetadataBundle {
  queues: RiotQueue[];
  gameTypes: RiotGameType[];
  maps: RiotMap[];
  gameModes: RiotGameMode[];
  lastUpdated: number;
}

const QUEUES_URL = 'https://static.developer.riotgames.com/docs/lol/queues.json';
const GAME_TYPES_URL = 'https://static.developer.riotgames.com/docs/lol/gameTypes.json';
const MAPS_URL = 'https://static.developer.riotgames.com/docs/lol/maps.json';
const GAME_MODES_URL = 'https://static.developer.riotgames.com/docs/lol/gameModes.json';

// In-memory lookup maps for O(1) synchronous resolution
const queuesMap = new Map<number, RiotQueue>();
const gameTypesMap = new Map<string, RiotGameType>();
const mapsMap = new Map<number, RiotMap>();
const gameModesMap = new Map<string, RiotGameMode>();

let lastSyncedAt = 0;
let isSyncInProgress = false;
let schedulerTimer: NodeJS.Timeout | null = null;

/**
 * Loads bundled static data from disk synchronously on module import.
 * Ensures the application is fully functional immediately with zero network latency.
 */
function loadInitialBundledData(): void {
  try {
    const dataDir = path.resolve(__dirname, '../data');

    const queuesPath = path.join(dataDir, 'queues.json');
    if (fs.existsSync(queuesPath)) {
      const data: RiotQueue[] = JSON.parse(fs.readFileSync(queuesPath, 'utf-8'));
      for (const q of data) queuesMap.set(q.queueId, q);
    }

    const gameTypesPath = path.join(dataDir, 'gameTypes.json');
    if (fs.existsSync(gameTypesPath)) {
      const data: RiotGameType[] = JSON.parse(fs.readFileSync(gameTypesPath, 'utf-8'));
      for (const gt of data) gameTypesMap.set(gt.gametype.toUpperCase(), gt);
    }

    const mapsPath = path.join(dataDir, 'maps.json');
    if (fs.existsSync(mapsPath)) {
      const data: RiotMap[] = JSON.parse(fs.readFileSync(mapsPath, 'utf-8'));
      for (const m of data) mapsMap.set(m.mapId, m);
    }

    const gameModesPath = path.join(dataDir, 'gameModes.json');
    if (fs.existsSync(gameModesPath)) {
      const data: RiotGameMode[] = JSON.parse(fs.readFileSync(gameModesPath, 'utf-8'));
      for (const gm of data) gameModesMap.set(gm.gameMode.toUpperCase(), gm);
    }
  } catch (err) {
    console.warn('[GameMetadata] Failed to load local bundled data, will fetch from Riot API:', err);
  }
}

// Initial synchronous load
loadInitialBundledData();

/**
 * Cleanly format a queue name from Riot's official description.
 */
export function formatQueueName(queue?: RiotQueue | null): string {
  if (!queue) return 'Unknown Queue';
  if (!queue.description) {
    return queue.map || `Queue ${queue.queueId}`;
  }

  let name = queue.description.trim();
  // Clean redundant game engine prefixes/suffixes
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
export function getQueue(queueId: number): RiotQueue | undefined {
  return queuesMap.get(queueId);
}

/**
 * Get human-readable queue name.
 */
export function getQueueName(queueId: number): string {
  const q = queuesMap.get(queueId);
  if (!q) return `Queue ${queueId}`;
  return formatQueueName(q);
}

/**
 * Get raw official Riot description for queue.
 */
export function getQueueDescription(queueId: number): string {
  const q = queuesMap.get(queueId);
  return q?.description || q?.map || `Queue ${queueId}`;
}

/**
 * Get map name associated with the queue.
 */
export function getQueueMap(queueId: number): string {
  const q = queuesMap.get(queueId);
  return q?.map || '';
}

/**
 * Checks whether the given queue is a Ranked queue.
 */
export function isRankedQueue(queueId: number): boolean {
  if (queueId === 420 || queueId === 440 || queueId === 710) return true;
  const q = queuesMap.get(queueId);
  if (!q) return false;
  const desc = (q.description || '').toLowerCase();
  return desc.includes('ranked');
}

/**
 * Returns all known ranked queue IDs.
 */
export function getRankedQueueIds(): number[] {
  const ids: number[] = [];
  for (const q of queuesMap.values()) {
    if (isRankedQueue(q.queueId) && !ids.includes(q.queueId)) {
      ids.push(q.queueId);
    }
  }
  return ids.length > 0 ? ids : [420, 440, 710];
}

/**
 * Get map details by mapId.
 */
export function getMap(mapId: number): RiotMap | undefined {
  return mapsMap.get(mapId);
}

/**
 * Get map name by mapId (e.g. 11 -> "Summoner's Rift", 12 -> "Howling Abyss", 30 -> "Rings of Wrath").
 */
export function getMapName(mapId: number): string {
  const m = mapsMap.get(mapId);
  if (m?.mapName) return m.mapName;
  // Fallbacks for well-known map IDs if not found
  if (mapId === 11 || mapId === 1 || mapId === 2) return "Summoner's Rift";
  if (mapId === 12 || mapId === 14) return 'Howling Abyss';
  if (mapId === 30) return 'Rings of Wrath';
  if (mapId === 21) return 'Nexus Blitz';
  if (mapId === 22) return 'Convergence';
  if (mapId === 35) return 'The Bandlewood';
  return `Map ${mapId}`;
}

/**
 * Get game mode details by gameMode string key (e.g. "CLASSIC", "ARAM", "CHERRY").
 */
export function getGameMode(gameMode: string): RiotGameMode | undefined {
  return gameModesMap.get((gameMode || '').toUpperCase());
}

/**
 * Get description of game mode (e.g. "CLASSIC" -> "Classic Summoner's Rift and Twisted Treeline games").
 */
export function getGameModeDescription(gameMode: string): string {
  if (!gameMode) return 'Classic';
  const gm = gameModesMap.get(gameMode.toUpperCase());
  if (gm?.description) return gm.description;
  if (gameMode.toUpperCase() === 'CHERRY') return 'Arena';
  return gameMode;
}

/**
 * Get game type details by gametype string (e.g. "MATCHED_GAME", "CUSTOM_GAME").
 */
export function getGameType(gameType: string): RiotGameType | undefined {
  return gameTypesMap.get((gameType || '').toUpperCase());
}

/**
 * Get description of game type (e.g. "MATCHED_GAME" -> "all other games").
 */
export function getGameTypeDescription(gameType: string): string {
  if (!gameType) return 'Matched Game';
  const gt = gameTypesMap.get(gameType.toUpperCase());
  if (gt?.description) return gt.description;
  if (gameType.toUpperCase() === 'MATCHED_GAME') return 'Matched Game';
  if (gameType.toUpperCase() === 'CUSTOM_GAME') return 'Custom Game';
  if (gameType.toUpperCase() === 'TUTORIAL_GAME') return 'Tutorial Game';
  return gameType;
}

/**
 * Determines dynamically if a match is on Summoner's Rift based on mapId or queue metadata.
 */
export function isSummonersRift(mapId?: number, queueId?: number): boolean {
  if (mapId !== undefined && (mapId === 11 || mapId === 1 || mapId === 2)) return true;
  if (queueId !== undefined) {
    const q = queuesMap.get(queueId);
    if (q && q.map && q.map.toLowerCase().includes("summoner's rift")) return true;
    if ([420, 440, 400, 430, 490, 700].includes(queueId)) return true;
  }
  return false;
}

/**
 * Dynamic mapping from queue filter string to matching queue IDs.
 */
export function mapQueueFilterToId(filter?: string): number[] | undefined {
  if (!filter || filter === 'all') return undefined;
  const f = filter.toLowerCase().trim();

  // If directly a number, filter by that exact queue ID
  const numericId = parseInt(f, 10);
  if (!isNaN(numericId) && numericId > 0) {
    return [numericId];
  }

  const allQueues = Array.from(queuesMap.values());

  if (f === 'ranked_solo' || f === 'solo') {
    const ids = allQueues
      .filter((q) => (q.description || '').toLowerCase().includes('ranked solo'))
      .map((q) => q.queueId);
    return ids.length > 0 ? ids : [420];
  }

  if (f === 'ranked_flex' || f === 'flex') {
    const ids = allQueues
      .filter((q) => (q.description || '').toLowerCase().includes('ranked flex'))
      .map((q) => q.queueId);
    return ids.length > 0 ? ids : [440];
  }

  if (f === 'ranked_5s' || f === 'ranked5s' || f === 'ranked_premade_5x5') {
    const ids = allQueues
      .filter(
        (q) =>
          (q.description || '').toLowerCase().includes('ranked team') ||
          (q.description || '').toLowerCase().includes('ranked premade')
      )
      .map((q) => q.queueId);
    return ids.length > 0 ? ids : [710];
  }

  if (f === 'aram') {
    const ids = allQueues
      .filter(
        (q) =>
          (q.description || '').toLowerCase().includes('aram') ||
          (q.map || '').toLowerCase().includes('howling abyss')
      )
      .map((q) => q.queueId);
    return ids.length > 0 ? ids : [450];
  }

  if (f === 'arena') {
    const ids = allQueues
      .filter(
        (q) =>
          (q.description || '').toLowerCase().includes('arena') ||
          (q.map || '').toLowerCase().includes('rings of wrath')
      )
      .map((q) => q.queueId);
    return ids.length > 0 ? ids : [1700];
  }

  if (f === 'normals' || f === 'normal') {
    const ids = allQueues
      .filter(
        (q) =>
          (q.description || '').toLowerCase().includes('draft pick') ||
          (q.description || '').toLowerCase().includes('blind pick') ||
          (q.description || '').toLowerCase().includes('quickplay')
      )
      .map((q) => q.queueId);
    return ids.length > 0 ? ids : [400, 430, 490];
  }

  if (f === 'clash') {
    const ids = allQueues
      .filter((q) => (q.description || '').toLowerCase().includes('clash'))
      .map((q) => q.queueId);
    return ids.length > 0 ? ids : [700];
  }

  return undefined;
}

/**
 * Returns full metadata bundle of all queues, gameTypes, maps, and gameModes.
 */
export function getAllGameMetadata(): GameMetadataBundle {
  return {
    queues: Array.from(queuesMap.values()),
    gameTypes: Array.from(gameTypesMap.values()),
    maps: Array.from(mapsMap.values()),
    gameModes: Array.from(gameModesMap.values()),
    lastUpdated: lastSyncedAt,
  };
}

/**
 * Fetch and synchronize Riot Game Metadata (queues, maps, gameTypes, gameModes).
 * Persists everything to PostgreSQL via Prisma and updates in-memory cache.
 */
export async function syncGameMetadata(force = false): Promise<{
  queuesCount: number;
  gameTypesCount: number;
  mapsCount: number;
  gameModesCount: number;
}> {
  if (isSyncInProgress) {
    console.log('[GameMetadata] Sync already running, skipping.');
    return {
      queuesCount: queuesMap.size,
      gameTypesCount: gameTypesMap.size,
      mapsCount: mapsMap.size,
      gameModesCount: gameModesMap.size,
    };
  }

  isSyncInProgress = true;
  try {
    console.log('🔄 [GameMetadata] Synchronizing Riot static metadata (queues, maps, gameTypes, gameModes)...');

    const [queuesRes, gameTypesRes, mapsRes, gameModesRes] = await Promise.all([
      fetch(QUEUES_URL),
      fetch(GAME_TYPES_URL),
      fetch(MAPS_URL),
      fetch(GAME_MODES_URL),
    ]);

    let queues: RiotQueue[] = [];
    let gameTypes: RiotGameType[] = [];
    let maps: RiotMap[] = [];
    let gameModes: RiotGameMode[] = [];

    if (queuesRes.ok) {
      queues = (await queuesRes.json()) as RiotQueue[];
      for (const q of queues) queuesMap.set(q.queueId, q);
    }
    if (gameTypesRes.ok) {
      gameTypes = (await gameTypesRes.json()) as RiotGameType[];
      for (const gt of gameTypes) gameTypesMap.set(gt.gametype.toUpperCase(), gt);
    }
    if (mapsRes.ok) {
      maps = (await mapsRes.json()) as RiotMap[];
      for (const m of maps) mapsMap.set(m.mapId, m);
    }
    if (gameModesRes.ok) {
      gameModes = (await gameModesRes.json()) as RiotGameMode[];
      for (const gm of gameModes) gameModesMap.set(gm.gameMode.toUpperCase(), gm);
    }

    lastSyncedAt = Date.now();

    // Persist to PostgreSQL if database connection is available
    try {
      if (queues.length > 0) {
        for (const q of queues) {
          await prisma.gameQueue.upsert({
            where: { queueId: q.queueId },
            create: {
              queueId: q.queueId,
              map: q.map,
              description: q.description,
              notes: q.notes,
            },
            update: {
              map: q.map,
              description: q.description,
              notes: q.notes,
            },
          });
        }
      }

      if (gameTypes.length > 0) {
        for (const gt of gameTypes) {
          await prisma.gameType.upsert({
            where: { gametype: gt.gametype },
            create: {
              gametype: gt.gametype,
              description: gt.description,
            },
            update: {
              description: gt.description,
            },
          });
        }
      }

      if (maps.length > 0) {
        for (const m of maps) {
          await prisma.gameMap.upsert({
            where: { mapId: m.mapId },
            create: {
              mapId: m.mapId,
              mapName: m.mapName,
              notes: m.notes || null,
            },
            update: {
              mapName: m.mapName,
              notes: m.notes || null,
            },
          });
        }
      }

      if (gameModes.length > 0) {
        for (const gm of gameModes) {
          await prisma.gameMode.upsert({
            where: { gameMode: gm.gameMode },
            create: {
              gameMode: gm.gameMode,
              description: gm.description,
            },
            update: {
              description: gm.description,
            },
          });
        }
      }
      console.log('✅ [GameMetadata] Successfully persisted game metadata to PostgreSQL.');
    } catch (dbErr: any) {
      console.warn('⚠️ [GameMetadata] Database persistence notice (in-memory cache remains fully active):', dbErr?.message || dbErr);
    }

    console.log(
      `⚡ [GameMetadata] Synchronized: ${queuesMap.size} queues, ${mapsMap.size} maps, ${gameModesMap.size} gameModes, ${gameTypesMap.size} gameTypes.`
    );

    return {
      queuesCount: queuesMap.size,
      gameTypesCount: gameTypesMap.size,
      mapsCount: mapsMap.size,
      gameModesCount: gameModesMap.size,
    };
  } catch (err: any) {
    console.error('[GameMetadata] Error synchronizing metadata:', err?.message || err);
    return {
      queuesCount: queuesMap.size,
      gameTypesCount: gameTypesMap.size,
      mapsCount: mapsMap.size,
      gameModesCount: gameModesMap.size,
    };
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Periodically refreshes game metadata from Riot static endpoints (hourly).
 */
export function initGameMetadataScheduler(intervalMs = 60 * 60 * 1000): void {
  // Run background sync once at start
  syncGameMetadata().catch((err) => {
    console.warn('[GameMetadata] Initial sync error:', err);
  });

  if (!schedulerTimer) {
    schedulerTimer = setInterval(() => {
      syncGameMetadata().catch((err) => {
        console.warn('[GameMetadata] Periodic sync error:', err);
      });
    }, intervalMs);
    schedulerTimer.unref();
  }
}
