import { prisma } from '../db/prisma';

export interface GameQueueItem {
  id: number;
  name: string;
}

// Fallback defaults for standard queues (used when database table is not yet populated)
export const DEFAULT_QUEUES: Record<number, string> = {
  420: 'Ranked Solo/Duo',
  440: 'Ranked Flex',
  710: 'Ranked 5s',
  450: 'ARAM',
  400: 'Normal Draft',
  430: 'Normal Blind',
  490: 'Quickplay',
  1700: 'Arena',
  700: 'Clash',
};

// In-memory cache loaded from the database table `game_queues`
const queuesCache = new Map<number, string>();

// Initialize in-memory cache with defaults
for (const [idStr, name] of Object.entries(DEFAULT_QUEUES)) {
  queuesCache.set(Number(idStr), name);
}

/**
 * Loads GameQueue records from PostgreSQL into the in-memory cache.
 * If the table is empty, seeds the default queues once so they appear in Prisma Studio.
 */
export async function loadQueuesFromDb(): Promise<void> {
  try {
    const dbQueues = await prisma.gameQueue.findMany({
      orderBy: { id: 'asc' },
    });

    if (dbQueues.length > 0) {
      queuesCache.clear();
      for (const q of dbQueues) {
        queuesCache.set(q.id, q.name);
      }
      console.log(`[GameQueue] Loaded ${dbQueues.length} queue(s) from database into cache.`);
    } else {
      // Seed initial default queues into the database so the user can view/edit them in Prisma Studio
      console.log('[GameQueue] Database table empty. Seeding default queues into database...');
      const seedEntries = Object.entries(DEFAULT_QUEUES).map(([idStr, name]) => ({
        id: Number(idStr),
        name,
      }));

      await prisma.gameQueue.createMany({
        data: seedEntries,
        skipDuplicates: true,
      });

      for (const q of seedEntries) {
        queuesCache.set(q.id, q.name);
      }
      console.log(`[GameQueue] Seeded ${seedEntries.length} default queues into database.`);
    }
  } catch (err: any) {
    console.warn('[GameQueue] Notice while loading queues from database (defaults remain active):', err?.message || err);
  }
}

/**
 * Returns human-readable queue name by queueId (e.g. 420 -> "Ranked Solo/Duo").
 */
export function getQueueName(queueId: number): string {
  return queuesCache.get(queueId) || DEFAULT_QUEUES[queueId] || `Queue ${queueId}`;
}

/**
 * Checks whether the given queue is a Ranked queue.
 */
export function isRankedQueue(queueId: number): boolean {
  if (queueId === 420 || queueId === 440 || queueId === 710) return true;
  const name = queuesCache.get(queueId) || DEFAULT_QUEUES[queueId];
  if (!name) return false;
  const lower = name.toLowerCase();
  return lower.includes('ranked') || lower.includes('solo') || lower.includes('flex');
}

/**
 * Returns all ranked queue IDs.
 */
export function getRankedQueueIds(): number[] {
  const ids = new Set<number>([420, 440, 710]);
  for (const [id, name] of queuesCache.entries()) {
    const lower = name.toLowerCase();
    if (lower.includes('ranked') || lower.includes('solo') || lower.includes('flex')) {
      ids.add(id);
    }
  }
  return Array.from(ids);
}

/**
 * Determines dynamically if a match is on Summoner's Rift.
 */
export function isSummonersRift(mapId?: number, queueId?: number): boolean {
  if (mapId !== undefined && (mapId === 11 || mapId === 1 || mapId === 2)) return true;
  if (queueId !== undefined && [420, 440, 400, 430, 490, 700].includes(queueId)) return true;
  return false;
}

/**
 * Maps queue filter query string to matching numeric queue IDs.
 */
export function mapQueueFilterToId(filter?: string): number[] | undefined {
  if (!filter || filter === 'all') return undefined;
  const f = filter.toLowerCase().trim();

  const num = parseInt(f, 10);
  if (!isNaN(num) && num > 0) {
    return [num];
  }

  if (f === 'ranked_solo' || f === 'solo') return [420];
  if (f === 'ranked_flex' || f === 'flex') return [440];
  if (f === 'ranked_5s' || f === 'ranked5s') return [710];
  if (f === 'aram') return [450];
  if (f === 'arena') return [1700];
  if (f === 'normals' || f === 'normal') return [400, 430, 490];
  if (f === 'clash') return [700];

  return undefined;
}

/**
 * Returns all currently cached queues as an array.
 */
export function getAllQueues(): GameQueueItem[] {
  return Array.from(queuesCache.entries()).map(([id, name]) => ({ id, name }));
}
