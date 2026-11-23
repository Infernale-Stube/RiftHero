import { prisma } from '../db/prisma';
import { getLatestDDragonVersion, getChampionNameById } from '../riot/ddragon';

export interface MetaChampion {
  name: string;
  tier: 'S+' | 'S' | 'A' | 'B';
  winrate: string;
  pickrate: string;
  banrate: string;
  role: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  games: number;
  wins: number;
  losses: number;
}

export interface TierListChampion {
  rank: number;
  name: string;
  role: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
  tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  winrate: string;
  winrateNum: number;
  pickrate: string;
  pickrateNum: number;
  banrate: string;
  banrateNum: number;
  games: number;
  wins: number;
  losses: number;
  score: number;
}

export interface ChampionMetaStats {
  tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D';
  winrate: string;
  winrateNum: number;
  pickrate: string;
  pickrateNum: number;
  banrate: string;
  banrateNum: number;
  score: number;
  rank: number;
  games: number;
  role: 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
}

export interface MetaSnapshotData {
  id: 'current' | 'previous';
  patch: string;
  version: string;
  totalMatches: number;
  metaPicks: Record<string, MetaChampion[]>;
  tierList: TierListChampion[];
  championStats?: Record<string, ChampionMetaStats>;
  computedAt: Date;
}

const POSITION_MAP: Record<string, 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT'> = {
  TOP: 'TOP',
  JUNGLE: 'JUNGLE',
  MIDDLE: 'MID',
  MID: 'MID',
  BOTTOM: 'ADC',
  BOT: 'ADC',
  UTILITY: 'SUPPORT',
  SUPPORT: 'SUPPORT',
};

export const MIN_NEW_PATCH_MATCHES = 30;
export const META_WORKER_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
let isAnalysisRunning = false;
let tableChecked = false;

// In-memory cache for fast (<1ms) reads
const memoryCache = new Map<'current' | 'previous', { data: MetaSnapshotData; timestamp: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Ensures the dedicated meta_snapshots table exists in PostgreSQL.
 */
export async function ensureMetaTableExists(): Promise<void> {
  if (tableChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS meta_snapshots (
        id TEXT PRIMARY KEY,
        patch TEXT NOT NULL,
        version TEXT NOT NULL,
        "totalMatches" INTEGER NOT NULL DEFAULT 0,
        "metaPicksJson" JSONB NOT NULL,
        "tierListJson" JSONB NOT NULL,
        "championStatsJson" JSONB,
        "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE meta_snapshots ADD COLUMN IF NOT EXISTS "championStatsJson" JSONB;
    `);
    tableChecked = true;
  } catch (err) {
    console.warn('[MetaService] Table check warning:', (err as Error).message);
  }
}

/**
 * Resolves which patch to analyze from available Ranked matches.
 */
async function resolveActiveMetaPatch(): Promise<{ patch: string; matchCount: number }> {
  try {
    const rawCounts = await prisma.$queryRaw<
      Array<{ gameVersion: string; matchCount: number }>
    >`
      SELECT "gameVersion", COUNT(*)::int as "matchCount"
      FROM matches
      WHERE "queueId" IN (420, 440)
      GROUP BY "gameVersion"
      ORDER BY "matchCount" DESC
      LIMIT 10;
    `;

    if (rawCounts && rawCounts.length > 0) {
      const patchMap = new Map<string, number>();
      for (const row of rawCounts) {
        if (!row.gameVersion) continue;
        const parts = row.gameVersion.split('.');
        if (parts.length >= 2) {
          const patchKey = `${parts[0]}.${parts[1]}`;
          patchMap.set(patchKey, (patchMap.get(patchKey) || 0) + Number(row.matchCount));
        }
      }

      const sortedPatches = Array.from(patchMap.entries()).sort((a, b) => {
        const [aMaj, aMin] = a[0].split('.').map(Number);
        const [bMaj, bMin] = b[0].split('.').map(Number);
        if (aMaj !== bMaj) return bMaj - aMaj;
        return bMin - aMin;
      });

      const newest = sortedPatches[0];
      if (newest && newest[1] >= MIN_NEW_PATCH_MATCHES) {
        return { patch: newest[0], matchCount: newest[1] };
      }

      if (sortedPatches.length > 1) {
        const previous = sortedPatches[1];
        if (previous) {
          return { patch: previous[0], matchCount: previous[1] };
        }
      }

      if (newest) {
        return { patch: newest[0], matchCount: newest[1] };
      }
    }
  } catch (err) {
    console.warn('[MetaService] Could not resolve patch from matches, falling back to DDragon:', (err as Error).message);
  }

  const ddragonVersion = await getLatestDDragonVersion();
  const parts = ddragonVersion.split('.');
  const patch = `${parts[0]}.${parts[1]}`;
  return { patch, matchCount: 0 };
}

/**
 * Meta Worker task: Runs every 6h to compute Meta Picks & Tier List from match data
 * and stores the pre-aggregated results into the dedicated 'meta_snapshots' table.
 *
 * Patch rotation logic:
 * When a new patch arrives (e.g. 14.24 vs existing 14.23):
 * 1. Current data (14.23) is moved into the 'previous' slot (overwriting older patch).
 * 2. New patch (14.24) is saved into the 'current' slot.
 */
export async function computeAndSaveMetaAnalysis(): Promise<MetaSnapshotData> {
  if (isAnalysisRunning) {
    console.log('[MetaWorker] Analysis already in progress, skipping duplicate call.');
    return await getMetaSnapshot('current');
  }

  isAnalysisRunning = true;
  await ensureMetaTableExists();

  try {
    const { patch } = await resolveActiveMetaPatch();
    const ddragonVersion = await getLatestDDragonVersion();
    const patchFilter = `${patch}%`;
    console.log(`[MetaWorker] Starting 6h periodic analysis for patch ${patch}...`);

    // 1. Gather ban statistics from matches on this patch
    const banCounts = new Map<string, number>();
    const matchesWithBans = await prisma.match.findMany({
      where: {
        queueId: { in: [420, 440] },
        gameVersion: { startsWith: patch },
      },
      select: {
        blueBan1: true,
        blueBan2: true,
        blueBan3: true,
        blueBan4: true,
        blueBan5: true,
        redBan1: true,
        redBan2: true,
        redBan3: true,
        redBan4: true,
        redBan5: true,
      },
      take: 400,
      orderBy: { gameCreation: 'desc' },
    });

    const totalMatchesAnalyzed = matchesWithBans.length;
    for (const m of matchesWithBans) {
      const bans = [
        m.blueBan1,
        m.blueBan2,
        m.blueBan3,
        m.blueBan4,
        m.blueBan5,
        m.redBan1,
        m.redBan2,
        m.redBan3,
        m.redBan4,
        m.redBan5,
      ];
      for (const cid of bans) {
        if (cid && cid > 0) {
          const cname = await getChampionNameById(cid);
          if (cname && !cname.startsWith('Champion_')) {
            banCounts.set(cname, (banCounts.get(cname) || 0) + 1);
          }
        }
      }
    }

    // 2. Query participant performance by position and champion for this patch
    const rawStats = await prisma.$queryRaw<
      Array<{
        teamPosition: string;
        championName: string;
        games: number;
        wins: number;
      }>
    >`
      SELECT
        p."teamPosition",
        p."championName",
        COUNT(*)::int as games,
        SUM(CASE WHEN p.win THEN 1 ELSE 0 END)::int as wins
      FROM match_participants p
      JOIN matches m ON p."matchId" = m.id
      WHERE m."queueId" IN (420, 440)
        AND m."gameVersion" LIKE ${patchFilter}
        AND p."teamPosition" IS NOT NULL
        AND p."teamPosition" != ''
        AND p."championName" IS NOT NULL
      GROUP BY p."teamPosition", p."championName"
      ORDER BY games DESC;
    `;

    const metaPicks: Record<string, MetaChampion[]> = {
      TOP: [],
      JUNGLE: [],
      MID: [],
      ADC: [],
      SUPPORT: [],
    };

    let tierList: TierListChampion[] = [];

    if (rawStats && rawStats.length > 0) {
      const byRole: Record<string, typeof rawStats> = {
        TOP: [],
        JUNGLE: [],
        MID: [],
        ADC: [],
        SUPPORT: [],
      };

      const totalGamesByRole = new Map<string, number>();

      for (const row of rawStats) {
        const canonical = POSITION_MAP[row.teamPosition.toUpperCase()] || 'MID';
        totalGamesByRole.set(canonical, (totalGamesByRole.get(canonical) || 0) + row.games);
        if (byRole[canonical]) {
          byRole[canonical].push(row);
        }
      }

      // Build Meta Picks (Top 4 per lane)
      for (const [role, items] of Object.entries(byRole)) {
        if (items.length > 0) {
          const totalRoleGames = totalGamesByRole.get(role) || 1;
          const computed: MetaChampion[] = items.map((champ) => {
            const winrateNum = (champ.wins / Math.max(1, champ.games)) * 100;
            const pickrateNum = (champ.games / totalRoleGames) * 100;
            const bans = banCounts.get(champ.championName) || 0;
            const banrateNum = totalMatchesAnalyzed > 0 ? (bans / totalMatchesAnalyzed) * 100 : 0;

            const score = (winrateNum - 40) * 4 + pickrateNum * 1.5;
            const tier: 'S+' | 'S' | 'A' | 'B' =
              score >= 70 || (winrateNum >= 53.0 && pickrateNum >= 8.0)
                ? 'S+'
                : score >= 55 || (winrateNum >= 51.5 && pickrateNum >= 5.0)
                ? 'S'
                : score >= 42 || winrateNum >= 50.0
                ? 'A'
                : 'B';

            return {
              name: champ.championName,
              tier,
              winrate: `${winrateNum.toFixed(1)}%`,
              pickrate: `${pickrateNum.toFixed(1)}%`,
              banrate: banrateNum > 0 ? `${banrateNum.toFixed(1)}%` : '0.0%',
              role: role as 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT',
              games: champ.games,
              wins: champ.wins,
              losses: Math.max(0, champ.games - champ.wins),
            };
          });

          // Sort by winrate descending, then games, take top 4
          computed.sort((a, b) => parseFloat(b.winrate) - parseFloat(a.winrate) || b.games - a.games);
          metaPicks[role] = computed.slice(0, 4);
        }
      }

      // Build Full Tier List across all champions
      tierList = rawStats.map((item) => {
        const role = (POSITION_MAP[item.teamPosition.toUpperCase()] || 'MID') as 'TOP' | 'JUNGLE' | 'MID' | 'ADC' | 'SUPPORT';
        const wins = item.wins;
        const games = item.games;
        const losses = Math.max(0, games - wins);
        const winrateNum = (wins / Math.max(1, games)) * 100;
        const roleTotal = totalGamesByRole.get(role) || 1;
        const pickrateNum = (games / roleTotal) * 100;
        const bans = banCounts.get(item.championName) || 0;
        const banrateNum = totalMatchesAnalyzed > 0 ? (bans / totalMatchesAnalyzed) * 100 : 0;

        // Composite Performance Score: 50% Winrate + 30% Pickrate + 20% Volume
        const score = Math.min(100, Math.max(0, (winrateNum - 40) * 4 + pickrateNum * 1.5 + Math.min(10, games * 0.5)));

        const tier: 'S+' | 'S' | 'A' | 'B' | 'C' | 'D' =
          score >= 75 || (winrateNum >= 52.5 && pickrateNum >= 10.0)
            ? 'S+'
            : score >= 62 || (winrateNum >= 51.0 && pickrateNum >= 6.0)
            ? 'S'
            : score >= 50 || winrateNum >= 49.5
            ? 'A'
            : score >= 40 || winrateNum >= 47.5
            ? 'B'
            : score >= 30
            ? 'C'
            : 'D';

        return {
          rank: 1,
          name: item.championName,
          role,
          tier,
          winrate: `${winrateNum.toFixed(1)}%`,
          winrateNum,
          pickrate: `${pickrateNum.toFixed(1)}%`,
          pickrateNum,
          banrate: banrateNum > 0 ? `${banrateNum.toFixed(1)}%` : '0.0%',
          banrateNum,
          games,
          wins,
          losses,
          score: Math.round(score * 10) / 10,
        };
      });

      // Sort by score descending, assign ranks
      tierList.sort((a, b) => b.score - a.score || b.winrateNum - a.winrateNum);
      tierList.forEach((c, idx) => {
        c.rank = idx + 1;
      });
    }

    // Build normalized map for instant champion meta lookups
    const championStatsMap: Record<string, ChampionMetaStats> = {};
    for (const t of tierList) {
      const clean = t.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      championStatsMap[clean] = {
        tier: t.tier,
        winrate: t.winrate,
        winrateNum: t.winrateNum,
        pickrate: t.pickrate,
        pickrateNum: t.pickrateNum,
        banrate: t.banrate,
        banrateNum: t.banrateNum,
        score: t.score,
        rank: t.rank,
        games: t.games,
        role: t.role,
      };
    }

    // 3. Patch Rotation check in meta_snapshots table
    const existingCurrent = await prisma.metaSnapshot.findUnique({
      where: { id: 'current' },
    });

    if (existingCurrent && existingCurrent.patch !== patch) {
      console.log(
        `📦 [MetaWorker] New patch detected (${existingCurrent.patch} -> ${patch}). Shifting previous patch ${existingCurrent.patch} into 'previous' slot...`
      );
      await prisma.metaSnapshot.upsert({
        where: { id: 'previous' },
        update: {
          patch: existingCurrent.patch,
          version: existingCurrent.version,
          totalMatches: existingCurrent.totalMatches,
          metaPicksJson: existingCurrent.metaPicksJson as any,
          tierListJson: existingCurrent.tierListJson as any,
          championStatsJson: existingCurrent.championStatsJson as any,
          computedAt: existingCurrent.computedAt,
          updatedAt: new Date(),
        },
        create: {
          id: 'previous',
          patch: existingCurrent.patch,
          version: existingCurrent.version,
          totalMatches: existingCurrent.totalMatches,
          metaPicksJson: existingCurrent.metaPicksJson as any,
          tierListJson: existingCurrent.tierListJson as any,
          championStatsJson: existingCurrent.championStatsJson as any,
          computedAt: existingCurrent.computedAt,
          updatedAt: new Date(),
        },
      });
      // Invalidate in-memory previous cache
      memoryCache.delete('previous');
    }

    // 4. Save newly computed analysis into 'current' slot
    const now = new Date();
    await prisma.metaSnapshot.upsert({
      where: { id: 'current' },
      update: {
        patch,
        version: ddragonVersion,
        totalMatches: totalMatchesAnalyzed,
        metaPicksJson: metaPicks as any,
        tierListJson: tierList as any,
        championStatsJson: championStatsMap as any,
        computedAt: now,
        updatedAt: now,
      },
      create: {
        id: 'current',
        patch,
        version: ddragonVersion,
        totalMatches: totalMatchesAnalyzed,
        metaPicksJson: metaPicks as any,
        tierListJson: tierList as any,
        championStatsJson: championStatsMap as any,
        computedAt: now,
        updatedAt: now,
      },
    });

    const result: MetaSnapshotData = {
      id: 'current',
      patch,
      version: ddragonVersion,
      totalMatches: totalMatchesAnalyzed,
      metaPicks,
      tierList,
      championStats: championStatsMap,
      computedAt: now,
    };

    memoryCache.set('current', { data: result, timestamp: Date.now() });

    console.log(
      `✅ [MetaWorker] Meta analysis completed for Patch ${patch} (${totalMatchesAnalyzed} matches). Saved to 'meta_snapshots' (slot: current).`
    );

    return result;
  } finally {
    isAnalysisRunning = false;
  }
}

/**
 * Loads the meta snapshot for a given slot ('current' or 'previous').
 * Instant lookup (<1ms) from memory cache or database.
 */
export async function getMetaSnapshot(slot: 'current' | 'previous' = 'current'): Promise<MetaSnapshotData> {
  const cached = memoryCache.get(slot);
  const now = Date.now();
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  await ensureMetaTableExists();

  const row = await prisma.metaSnapshot.findUnique({
    where: { id: slot },
  });

  if (row) {
    const data: MetaSnapshotData = {
      id: row.id as 'current' | 'previous',
      patch: row.patch,
      version: row.version,
      totalMatches: row.totalMatches,
      metaPicks: (row.metaPicksJson as any) || { TOP: [], JUNGLE: [], MID: [], ADC: [], SUPPORT: [] },
      tierList: (row.tierListJson as any) || [],
      championStats: (row.championStatsJson as any) || {},
      computedAt: row.computedAt,
    };
    memoryCache.set(slot, { data, timestamp: now });
    return data;
  }

  // If 'current' is missing in table, compute on the fly
  if (slot === 'current') {
    return await computeAndSaveMetaAnalysis();
  }

  // If 'previous' is not yet present, return fallback empty snapshot
  return {
    id: 'previous',
    patch: 'none',
    version: 'none',
    totalMatches: 0,
    metaPicks: { TOP: [], JUNGLE: [], MID: [], ADC: [], SUPPORT: [] },
    tierList: [],
    championStats: {},
    computedAt: new Date(),
  };
}

/**
 * Returns top meta picks per role from the precomputed meta_snapshots table.
 */
export async function getMetaChampions(slot: 'current' | 'previous' = 'current'): Promise<{
  slot: 'current' | 'previous';
  patch: string;
  totalMatches: number;
  champions: Record<string, MetaChampion[]>;
}> {
  const snapshot = await getMetaSnapshot(slot);
  return {
    slot,
    patch: snapshot.patch,
    totalMatches: snapshot.totalMatches,
    champions: snapshot.metaPicks,
  };
}

/**
 * Returns the comprehensive LoL Tier List across all positions from the precomputed meta_snapshots table.
 */
export async function getFullTierList(
  roleFilter?: string,
  slot: 'current' | 'previous' = 'current'
): Promise<{
  slot: 'current' | 'previous';
  patch: string;
  totalMatches: number;
  champions: TierListChampion[];
}> {
  const snapshot = await getMetaSnapshot(slot);
  let filtered = [...snapshot.tierList];

  // Filter by role if requested
  if (roleFilter && roleFilter.toUpperCase() !== 'ALL') {
    const canonicalFilter = POSITION_MAP[roleFilter.toUpperCase()] || roleFilter.toUpperCase();
    filtered = filtered.filter((c) => c.role === canonicalFilter);
    // Re-index ranks for the selected role
    filtered.forEach((c, idx) => {
      c.rank = idx + 1;
    });
  }

  return {
    slot,
    patch: snapshot.patch,
    totalMatches: snapshot.totalMatches,
    champions: filtered,
  };
}

/**
 * Returns the meta statistics for a specific champion (e.g. for linking inside championService).
 */
export async function getChampionMetaStats(
  championNameOrId: string,
  slot: 'current' | 'previous' = 'current'
): Promise<ChampionMetaStats | null> {
  const snapshot = await getMetaSnapshot(slot);
  const clean = (championNameOrId || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return snapshot.championStats?.[clean] || null;
}

/**
 * Returns patch info showing which patches are currently stored in 'current' and 'previous' slots.
 */
export async function getStoredMetaPatches(): Promise<{
  currentPatch: string;
  previousPatch: string | null;
}> {
  await ensureMetaTableExists();
  const rows = await prisma.metaSnapshot.findMany({
    select: { id: true, patch: true },
  });
  const current = rows.find((r) => r.id === 'current')?.patch || 'none';
  const previous = rows.find((r) => r.id === 'previous')?.patch || null;
  return { currentPatch: current, previousPatch: previous };
}
