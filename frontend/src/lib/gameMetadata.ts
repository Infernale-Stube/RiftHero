import { GameQueue } from '@/types';

// Default fallback queue map (id -> display name)
const DEFAULT_QUEUES: Record<number, string> = {
  0: 'Custom',
  400: 'Normal Draft',
  420: 'Ranked Solo/Duo',
  430: 'Normal Blind',
  440: 'Ranked Flex',
  450: 'ARAM',
  490: 'Quickplay',
  700: 'Clash',
  710: 'Ranked 5v5',
  720: 'ARAM Clash',
  830: 'Co-op vs AI (Intro)',
  840: 'Co-op vs AI (Beginner)',
  850: 'Co-op vs AI (Intermediate)',
  900: 'ARURF',
  1020: 'One for All',
  1300: 'Nexus Blitz',
  1400: 'Ultimate Spellbook',
  1700: 'Arena',
  1710: 'Arena',
  1900: 'Pick URF',
};

const queuesMap = new Map<number, GameQueue>();
Object.entries(DEFAULT_QUEUES).forEach(([id, name]) => {
  queuesMap.set(Number(id), { id: Number(id), name });
});

/**
 * Update or seed in-memory queues (e.g. from /meta/queues).
 */
export function setQueues(queues: GameQueue[]): void {
  queues.forEach((q) => queuesMap.set(q.id, q));
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
  if (q) return q.name;
  return `Queue ${queueId}`;
}

/**
 * Dynamically check if a queue is a Ranked queue.
 */
export function isRankedQueue(queueId?: number | null): boolean {
  if (!queueId) return false;
  if (queueId === 420 || queueId === 440 || queueId === 710) return true;
  const q = queuesMap.get(queueId);
  if (!q) return false;
  return q.name.toLowerCase().includes('ranked');
}

/**
 * Check if the game is played on Summoner's Rift.
 */
export function isSummonersRift(mapId?: number | null, queueId?: number | null): boolean {
  if (mapId !== undefined && mapId !== null) {
    if (mapId === 11 || mapId === 1 || mapId === 2) return true;
  }
  if (queueId !== undefined && queueId !== null) {
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
