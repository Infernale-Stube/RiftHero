import { prisma } from '../db/prisma';
import fs from 'fs';
import path from 'path';

export interface GameQueueItem {
  id: number;
  name: string;
}

// In-memory cache loaded from the database table `game_queues`
const queuesCache = new Map<number, string>();

/**
 * Format raw queue descriptions into clean, display-friendly names.
 */
function formatQueueName(q: { queueId: number; description?: string | null; map?: string | null }): string {
  if (!q.description) return q.map || `Queue ${q.queueId}`;
  let name = q.description.trim();
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
  if (lower.includes('clash')) {
    if (lower.includes('aram')) return 'ARAM Clash';
    return 'Clash';
  }
  return name;
}

/**
 * Fetches all GameQueue records directly from PostgreSQL, seeds clean defaults if empty,
 * and updates the in-memory cache.
 */
export async function getDbQueues(): Promise<GameQueueItem[]> {
  try {
    let dbQueues = await prisma.gameQueue.findMany({
      orderBy: { id: 'asc' },
    });

    if (dbQueues.length === 0) {
      console.log('[GameQueue] Database table empty. Seeding initial default queues into database...');
      const initialDefaultQueues: GameQueueItem[] = [
        { id: 420, name: 'Solo/Duo' },
        { id: 440, name: 'Flex' },
        { id: 710, name: '5s' },
        { id: 450, name: 'ARAM' },
        { id: 1700, name: 'Arena' },
        { id: 400, name: 'Normal' },
        { id: 490, name: 'Quickplay' },
        { id: 700, name: 'Clash' },
      ];

      await prisma.gameQueue.createMany({
        data: initialDefaultQueues,
        skipDuplicates: true,
      });

      dbQueues = await prisma.gameQueue.findMany({
        orderBy: { id: 'asc' },
      });
      console.log(`[GameQueue] Successfully seeded ${dbQueues.length} default queues into database.`);
    }

    queuesCache.clear();
    for (const q of dbQueues) {
      queuesCache.set(q.id, q.name);
    }
    return dbQueues;
  } catch (err: any) {
    console.warn('[GameQueue] Notice while querying gameQueue from database:', err?.message || err);
    return getAllQueues();
  }
}

/**
 * Loads GameQueue records from PostgreSQL into the in-memory cache.
 */
export async function loadQueuesFromDb(): Promise<void> {
  await getDbQueues();
}

/**
 * Returns human-readable queue name by queueId (e.g. 420 -> "Ranked Solo/Duo").
 */
export function getQueueName(queueId: number): string {
  return queuesCache.get(queueId) || (queueId ? `Queue ${queueId}` : 'Queue');
}

/**
 * Checks whether the given queue is a Ranked queue.
 */
export function isRankedQueue(queueId: number): boolean {
  if (queueId === 420 || queueId === 440 || queueId === 710) return true;
  const name = queuesCache.get(queueId);
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
