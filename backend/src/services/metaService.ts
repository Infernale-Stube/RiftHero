import { prisma } from '../db/prisma';
import { getChampionNameById, getDDragonPatches, getLatestDDragonVersion } from '../riot/ddragon';
import championPositionsRaw from '../riot/championPositions.json';

const championPositionsMap = championPositionsRaw as Record<
  string,
  {
    id: string;
    name: string;
    title: string;
    role: string;
    class: string;
    difficulty: number;
    recommendedPositions: string[];
  }
>;

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

// In-memory cache for ultra-fast <1ms responses
let memoryCache: {
  patch: string;
  totalMatches: number;
  metaPicks: Record<string, MetaChampion[]>;
  tierList: TierListChampion[];
  championsRoster?: Record<string, any>;
  championDetails?: Record<string, any>;
  timestamp: number;
} | null = null;

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes in-memory refresh
export const MIN_NEW_PATCH_MATCHES = 30;
export const META_WORKER_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let tableChecked = false;

/**
 * Ensures the dedicated meta_snapshots table exists in PostgreSQL.
 */
export async function ensureMetaTableExists(): Promise<void> {
  if (tableChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS meta_snapshots (
        id TEXT PRIMARY KEY DEFAULT 'active',
        patch TEXT NOT NULL,
        "totalMatches" INTEGER NOT NULL DEFAULT 0,
        "metaPicksJson" JSONB NOT NULL,
        "tierListJson" JSONB NOT NULL,
        "championsJson" JSONB,
        "championDetailsJson" JSONB,
        "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      ALTER TABLE meta_snapshots ADD COLUMN IF NOT EXISTS "championsJson" JSONB;
      ALTER TABLE meta_snapshots ADD COLUMN IF NOT EXISTS "championDetailsJson" JSONB;
    `);
    tableChecked = true;
  } catch (err) {
    console.warn('[MetaWorker] Table check warning:', (err as Error).message);
  }
}

/**
 * Builds localized champion rosters (de & en) enriched with:
 * - DDragon base info (names, titles, blurbs, tags, stats, icons, loading images)
 * - Positional info & classes (from championPositions)
 * - Calculated Meta Analytics (winrate, pickrate, banrate, tier, rank, score, games)
 */
async function buildChampionRosters(
  ddragonVersion: string,
  tierList: TierListChampion[]
): Promise<{ de: any[]; en: any[]; version: string }> {
  const tierMap = new Map<string, TierListChampion>();
  for (const t of tierList) {
    tierMap.set(t.name.toLowerCase().replace(/[^a-z0-9]/g, ''), t);
  }

  const langs = ['de_DE', 'en_US'] as const;
  const rosters: { de: any[]; en: any[] } = { de: [], en: [] };

  for (const lang of langs) {
    const key = lang.startsWith('de') ? 'de' : 'en';
    try {
      const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/${lang}/champion.json`);
      if (res.ok) {
        const json = (await res.json()) as any;
        if (json && json.data) {
          const list = Object.values(json.data).map((champ: any) => {
            const posMeta = championPositionsMap[champ.id];
            const cleanName = champ.name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const cleanId = champ.id.toLowerCase().replace(/[^a-z0-9]/g, '');
            const metaTier = tierMap.get(cleanName) || tierMap.get(cleanId) || null;

            return {
              id: champ.id,
              key: champ.key,
              name: champ.name,
              title: champ.title,
              blurb: champ.blurb,
              info: champ.info,
              image: champ.image,
              tags: champ.tags,
              partype: champ.partype,
              stats: champ.stats,
              role: posMeta?.role || 'Top',
              class: posMeta?.class || champ.tags?.[0] || 'Fighter',
              difficulty: posMeta?.difficulty ?? champ.info?.difficulty ?? 5,
              recommendedPositions: posMeta?.recommendedPositions || ['Top'],
              meta: metaTier
                ? {
                    tier: metaTier.tier,
                    winrate: metaTier.winrate,
                    winrateNum: metaTier.winrateNum,
                    pickrate: metaTier.pickrate,
                    pickrateNum: metaTier.pickrateNum,
                    banrate: metaTier.banrate,
                    banrateNum: metaTier.banrateNum,
                    rank: metaTier.rank,
                    score: metaTier.score,
                    games: metaTier.games,
                  }
                : null,
            };
          });
          rosters[key] = list;
        }
      }
    } catch (err) {
      console.warn(`[MetaService] Failed to fetch DDragon champions for ${lang}:`, (err as Error).message);
    }
  }

  return { ...rosters, version: ddragonVersion };
}

/**
 * Dynamically resolves which patch to use for meta & tier list analytics:
 * - If the latest patch has enough matches (>= MIN_NEW_PATCH_MATCHES), switch to the latest patch.
 * - If there are not enough matches on the new patch, stay on the previous patch from versions.json.
 * - If neither has data, fallback to any available matches in the database.
 */
export async function resolveActiveMetaPatch(): Promise<{
  patch: string;
  isNewPatch: boolean;
  matchCount: number;
}> {
  const patches = await getDDragonPatches();
  const latestPatch = patches[0] || '16.23';
  const previousPatch = patches[1] || '16.22';

  try {
    // 1. Check match count on the latest patch
    const latestCount = await prisma.match.count({
      where: {
        queueId: { in: [420, 440] },
        gameVersion: { startsWith: latestPatch },
      },
    });

    if (latestCount >= MIN_NEW_PATCH_MATCHES) {
      // Sufficient data collected -> automatically switch to the new patch!
      return { patch: latestPatch, isNewPatch: true, matchCount: latestCount };
    }

    // 2. Check match count on the previous patch
    const prevCount = await prisma.match.count({
      where: {
        queueId: { in: [420, 440] },
        gameVersion: { startsWith: previousPatch },
      },
    });

    if (prevCount > 0) {
      // Too few matches on new patch, but previous patch has data -> serve previous patch!
      return { patch: previousPatch, isNewPatch: false, matchCount: prevCount };
    }

    // 3. If latest has some matches (even if < 30) but previous has none
    if (latestCount > 0) {
      return { patch: latestPatch, isNewPatch: true, matchCount: latestCount };
    }

    // 4. Fallback: check most recent ranked match in DB if neither latest nor previous matches exist
    const recentMatch = await prisma.match.findFirst({
      where: { queueId: { in: [420, 440] } },
      select: { gameVersion: true },
      orderBy: { gameCreation: 'desc' },
    });

    if (recentMatch?.gameVersion) {
      const parts = recentMatch.gameVersion.split('.');
      if (parts.length >= 2) {
        const fallbackPatch = `${parts[0]}.${parts[1]}`;
        const fbCount = await prisma.match.count({
          where: {
            queueId: { in: [420, 440] },
            gameVersion: { startsWith: fallbackPatch },
          },
        });
        return { patch: fallbackPatch, isNewPatch: false, matchCount: fbCount };
      }
    }
  } catch (err) {
    console.warn('[MetaService] Error determining active meta patch:', (err as Error).message);
  }

  // Fallback when DB has no matches or is unreachable
  return { patch: previousPatch, isNewPatch: false, matchCount: 0 };
}

let isAnalysisRunning = false;

/**
 * Worker task: Runs every 6h to compute Meta Picks & Tier List from match data
 * and stores the pre-aggregated results into the dedicated 'meta_snapshots' table.
 */
export async function computeAndSaveMetaAnalysis(): Promise<{
  patch: string;
  totalMatches: number;
  metaPicks: Record<string, MetaChampion[]>;
  tierList: TierListChampion[];
}> {
  if (isAnalysisRunning) {
    if (memoryCache) return memoryCache;
  }

  isAnalysisRunning = true;
  await ensureMetaTableExists();

  try {
    const { patch } = await resolveActiveMetaPatch();
    const patchFilter = `${patch}%`;
    console.log(`[MetaWorker] Starting 6h periodic analysis for patch ${patch}...`);

    // 1. Gather ban statistics from matches on this patch
    const banCounts = new Map<string, number>();
    const matchesWithBans = await prisma.match.findMany({
      where: {
        queueId: { in: [420, 440] },
        gameVersion: { startsWith: patch },
      },
      select: { teamsJson: true },
      take: 400,
      orderBy: { gameCreation: 'desc' },
    });

    const totalMatchesAnalyzed = matchesWithBans.length;
    for (const m of matchesWithBans) {
      if (Array.isArray(m.teamsJson)) {
        for (const team of m.teamsJson as any[]) {
          if (Array.isArray(team?.bans)) {
            for (const ban of team.bans) {
              const cid = Number(ban?.championId);
              if (cid && cid > 0) {
                const cname = await getChampionNameById(cid);
                if (cname && !cname.startsWith('Champion_')) {
                  banCounts.set(cname, (banCounts.get(cname) || 0) + 1);
                }
              }
            }
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

    // 3. Fetch & build localized champion rosters (de & en) enriched with meta stats
    const ddragonVersion = await getLatestDDragonVersion();
    const championsRoster = await buildChampionRosters(ddragonVersion, tierList);

    // 4. Save precomputed results into dedicated 'meta_snapshots' database table
    await prisma.metaSnapshot.upsert({
      where: { id: 'active' },
      update: {
        patch,
        totalMatches: totalMatchesAnalyzed,
        metaPicksJson: metaPicks as any,
        tierListJson: tierList as any,
        championsJson: championsRoster as any,
        computedAt: new Date(),
      },
      create: {
        id: 'active',
        patch,
        totalMatches: totalMatchesAnalyzed,
        metaPicksJson: metaPicks as any,
        tierListJson: tierList as any,
        championsJson: championsRoster as any,
        computedAt: new Date(),
      },
    });

    console.log(
      `✅ [MetaWorker] Analysis completed for Patch ${patch}. Analyzed ${totalMatchesAnalyzed} matches. Saved to 'meta_snapshots'.`
    );

    // Update in-memory cache
    memoryCache = {
      patch,
      totalMatches: totalMatchesAnalyzed,
      metaPicks,
      tierList,
      championsRoster,
      timestamp: Date.now(),
    };

    return memoryCache;
  } catch (err) {
    console.warn('[MetaWorker] Analysis error:', (err as Error).message);
    const { patch } = await resolveActiveMetaPatch();
    return {
      patch,
      totalMatches: 0,
      metaPicks: { TOP: [], JUNGLE: [], MID: [], ADC: [], SUPPORT: [] },
      tierList: [],
    };
  } finally {
    isAnalysisRunning = false;
  }
}

/**
 * Loads the active precomputed snapshot from memory or 'meta_snapshots' table.
 * Instant lookup (<1ms), zero query lag for the user!
 */
async function loadActiveSnapshot(): Promise<{
  patch: string;
  totalMatches: number;
  metaPicks: Record<string, MetaChampion[]>;
  tierList: TierListChampion[];
  championsRoster?: Record<string, any>;
  championDetails?: Record<string, any>;
}> {
  const now = Date.now();
  if (memoryCache && now - memoryCache.timestamp < CACHE_TTL_MS) {
    return memoryCache;
  }

  await ensureMetaTableExists();

  try {
    const row = await prisma.metaSnapshot.findUnique({
      where: { id: 'active' },
    });

    if (row && row.metaPicksJson && row.tierListJson) {
      memoryCache = {
        patch: row.patch,
        totalMatches: row.totalMatches,
        metaPicks: row.metaPicksJson as any,
        tierList: row.tierListJson as any,
        championsRoster: row.championsJson as any,
        championDetails: row.championDetailsJson as any,
        timestamp: now,
      };
      return memoryCache;
    }
  } catch (err) {
    console.warn('[MetaService] Snapshot lookup error, computing on the fly:', (err as Error).message);
  }

  // If table is empty or query failed, compute immediately
  return await computeAndSaveMetaAnalysis();
}

/**
 * Returns the localized champion catalog enriched with live meta stats.
 * Instant response time (<2ms) directly from PostgreSQL table 'meta_snapshots'.
 */
export async function getChampionsRoster(locale = 'de'): Promise<{
  version: string;
  patch: string;
  totalMatches: number;
  champions: any[];
}> {
  const snapshot = await loadActiveSnapshot();
  const langKey = locale.toLowerCase().startsWith('en') ? 'en' : 'de';
  const rosterData = snapshot.championsRoster;
  const list = rosterData?.[langKey] || rosterData?.de || rosterData?.en || [];

  return {
    version: rosterData?.version || snapshot.patch,
    patch: snapshot.patch,
    totalMatches: snapshot.totalMatches,
    champions: list,
  };
}

/**
 * Returns detailed champion information (spells, passive, lore, skins)
 * cached in memory/database so the client never hits Riot's CDN directly.
 */
export async function getChampionDetail(
  slug: string,
  locale = 'de'
): Promise<{
  version: string;
  patch: string;
  champion: any;
}> {
  const snapshot = await loadActiveSnapshot();
  const lang = locale.toLowerCase().startsWith('en') ? 'en_US' : 'de_DE';
  const cacheKey = `${lang}_${slug.toLowerCase()}`;

  if (memoryCache?.championDetails?.[cacheKey]) {
    return {
      version: snapshot.championsRoster?.version || snapshot.patch,
      patch: snapshot.patch,
      champion: memoryCache.championDetails[cacheKey],
    };
  }

  // Find champion ID from roster
  const langKey = locale.toLowerCase().startsWith('en') ? 'en' : 'de';
  const list = snapshot.championsRoster?.[langKey] || [];
  const cleanTarget = slug.toLowerCase().replace(/[^a-z0-9]/g, '');
  const found = list.find((c: any) => {
    const cId = c.id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cName = c.name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return cId === cleanTarget || cName === cleanTarget;
  });

  const champId = found?.id || slug;
  const ddragonVersion = snapshot.championsRoster?.version || (await getLatestDDragonVersion());

  try {
    const res = await fetch(`https://ddragon.leagueoflegends.com/cdn/${ddragonVersion}/data/${lang}/champion/${champId}.json`);
    if (res.ok) {
      const data = (await res.json()) as any;
      if (data && data.data && data.data[champId]) {
        const champData = data.data[champId];
        // Cache in memory
        if (!memoryCache) {
          memoryCache = { ...snapshot, timestamp: Date.now() };
        }
        if (!memoryCache.championDetails) {
          memoryCache.championDetails = {};
        }
        memoryCache.championDetails[cacheKey] = champData;

        return {
          version: ddragonVersion,
          patch: snapshot.patch,
          champion: champData,
        };
      }
    }
  } catch (err) {
    console.warn(`[MetaService] Failed to fetch champion detail for ${slug}:`, (err as Error).message);
  }

  return {
    version: ddragonVersion,
    patch: snapshot.patch,
    champion: null,
  };
}

/**
 * Returns top meta picks per role from the precomputed table.
 * Instant response time!
 */
export async function getMetaChampions(): Promise<{ patch: string; champions: Record<string, MetaChampion[]> }> {
  const snapshot = await loadActiveSnapshot();
  return {
    patch: snapshot.patch,
    champions: snapshot.metaPicks,
  };
}

/**
 * Returns the comprehensive LoL Tier List across all positions from the precomputed table.
 * Instant response time!
 */
export async function getFullTierList(roleFilter?: string): Promise<{
  patch: string;
  totalMatches: number;
  champions: TierListChampion[];
}> {
  const snapshot = await loadActiveSnapshot();
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
    patch: snapshot.patch,
    totalMatches: snapshot.totalMatches,
    champions: filtered,
  };
}

let workerTimer: NodeJS.Timeout | null = null;

/**
 * Starts the periodic 6-hour Meta & Tier List background worker.
 * Checks on startup if analysis is missing or older than 6h, and schedules recurring 6h analysis.
 */
export function initMetaAnalysisWorker(intervalMs = META_WORKER_INTERVAL_MS): void {
  // On startup: check if snapshot is missing or stale (>6h)
  (async () => {
    try {
      await ensureMetaTableExists();
      const existing = await prisma.metaSnapshot.findUnique({
        where: { id: 'active' },
        select: { updatedAt: true, totalMatches: true },
      });

      const sixHoursAgo = Date.now() - intervalMs;
      if (!existing || existing.updatedAt.getTime() < sixHoursAgo) {
        console.log('🔄 [MetaWorker] Snapshot missing or older than 6h. Running background analysis...');
        computeAndSaveMetaAnalysis().catch((err) => {
          console.warn('[MetaWorker] Initial background analysis failed:', err);
        });
      } else {
        console.log(`⚡ [MetaWorker] Precomputed snapshot is fresh (${existing.totalMatches} matches). Next run in 6h.`);
      }
    } catch (err) {
      console.warn('[MetaWorker] Startup check warning:', (err as Error).message);
    }
  })();

  if (!workerTimer) {
    workerTimer = setInterval(() => {
      console.log('⏰ [MetaWorker] 6-hour interval reached. Triggering meta & tier list analysis...');
      computeAndSaveMetaAnalysis().catch((err) => {
        console.error('[MetaWorker] Periodic analysis error:', err);
      });
    }, intervalMs);
    workerTimer.unref();
  }
}
