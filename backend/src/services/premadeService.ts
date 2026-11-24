import { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';

export interface PremadeGroupInfo {
  groupId: number; // 1, 2, ...
  size: number; // 2, 3, 4, 5
  label: 'Duo' | 'Trio' | '4-Stack' | '5-Stack';
  gamesTogether: number;
}

function getPairKey(p1: string, p2: string): string {
  return p1 < p2 ? `${p1}_${p2}` : `${p2}_${p1}`;
}

/**
 * Queries PostgreSQL to find all pairs among the supplied PUUIDs who were on the
 * SAME team in matches at least 2 times.
 * Returns a Map from `${p1}_${p2}` to the list of distinct match IDs.
 */
export async function findTeammateCoOccurrences(
  puuids: string[]
): Promise<Map<string, { p1: string; p2: string; matchIds: string[] }>> {
  const uniquePuuids = Array.from(
    new Set(puuids.filter((p) => typeof p === 'string' && p.trim().length > 0))
  );
  if (uniquePuuids.length < 2) return new Map();

  try {
    const rows = await prisma.$queryRaw<
      Array<{ p1: string; p2: string; match_ids: string[] }>
    >`
      SELECT
        mp1.puuid AS p1,
        mp2.puuid AS p2,
        ARRAY_AGG(DISTINCT mp1."matchId") AS match_ids
      FROM match_participants mp1
      JOIN match_participants mp2
        ON mp1."matchId" = mp2."matchId"
        AND mp1."teamId" = mp2."teamId"
        AND mp1.puuid < mp2.puuid
      WHERE mp1.puuid IN (${Prisma.join(uniquePuuids)})
        AND mp2.puuid IN (${Prisma.join(uniquePuuids)})
      GROUP BY mp1.puuid, mp2.puuid
      HAVING COUNT(DISTINCT mp1."matchId") >= 2;
    `;

    const map = new Map<string, { p1: string; p2: string; matchIds: string[] }>();
    if (Array.isArray(rows)) {
      for (const r of rows) {
        const key = getPairKey(r.p1, r.p2);
        map.set(key, { p1: r.p1, p2: r.p2, matchIds: r.match_ids || [] });
      }
    }
    return map;
  } catch (err: any) {
    console.warn('[PremadeService] Failed to query teammate co-occurrences:', err?.message || err);
    return new Map();
  }
}

/**
 * Analyzes a single team (e.g. 5 players) against the co-occurrence map,
 * excludes the current match ID if supplied, and groups connected components
 * into Duo, Trio, 4-Stack, or 5-Stack premades.
 */
export function detectTeamPremades(
  teamParticipants: Array<{ puuid?: string | null }>,
  coOccurrenceMap: Map<string, { p1: string; p2: string; matchIds: string[] }>,
  currentMatchId?: string,
  minGames = 2
): Map<string, PremadeGroupInfo> {
  const puuids = teamParticipants
    .map((p) => p.puuid)
    .filter((id): id is string => typeof id === 'string' && id.trim().length > 0);

  if (puuids.length < 2 || coOccurrenceMap.size === 0) return new Map();

  // 1. Build adjacency list for edges where pastGames >= minGames
  const adj = new Map<string, Array<{ peer: string; games: number }>>();
  for (const p of puuids) {
    adj.set(p, []);
  }

  for (let i = 0; i < puuids.length; i++) {
    for (let j = i + 1; j < puuids.length; j++) {
      const p1 = puuids[i];
      const p2 = puuids[j];
      const key = getPairKey(p1, p2);
      const entry = coOccurrenceMap.get(key);
      if (entry) {
        // Exclude current match ID if supplied so we only count past matches
        const pastGames = currentMatchId
          ? entry.matchIds.filter((id) => id !== currentMatchId).length
          : entry.matchIds.length;

        if (pastGames >= minGames) {
          adj.get(p1)!.push({ peer: p2, games: pastGames });
          adj.get(p2)!.push({ peer: p1, games: pastGames });
        }
      }
    }
  }

  // 2. Find connected components (BFS)
  const visited = new Set<string>();
  const resultMap = new Map<string, PremadeGroupInfo>();
  let nextGroupId = 1;

  for (const startPuuid of puuids) {
    if (visited.has(startPuuid)) continue;

    const queue = [startPuuid];
    visited.add(startPuuid);
    const componentMembers: string[] = [];
    let maxGames = 0;

    while (queue.length > 0) {
      const curr = queue.shift()!;
      componentMembers.push(curr);

      const neighbors = adj.get(curr) || [];
      for (const edge of neighbors) {
        if (edge.games > maxGames) {
          maxGames = edge.games;
        }
        if (!visited.has(edge.peer)) {
          visited.add(edge.peer);
          queue.push(edge.peer);
        }
      }
    }

    // Only components of 2 or more players are premades!
    if (componentMembers.length >= 2) {
      const size = componentMembers.length;
      let label: 'Duo' | 'Trio' | '4-Stack' | '5-Stack' = 'Duo';
      if (size === 3) label = 'Trio';
      else if (size === 4) label = '4-Stack';
      else if (size >= 5) label = '5-Stack';

      const info: PremadeGroupInfo = {
        groupId: nextGroupId++,
        size,
        label,
        gamesTogether: maxGames,
      };

      for (const member of componentMembers) {
        resultMap.set(member, info);
      }
    }
  }

  return resultMap;
}
