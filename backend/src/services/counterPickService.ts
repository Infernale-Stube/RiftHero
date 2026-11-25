import { prisma } from '../db/prisma';
import { getLatestDDragonVersion, getLatestPatch } from '../riot/ddragon';
import { syncChampionSnapshot } from './championService';

export const COUNTERPICK_TIERS = [
  'all',
  'iron',
  'bronze',
  'silver',
  'gold',
  'platinum',
  'emerald',
  'diamond',
  'master',
  'grandmaster',
  'challenger',
  'gold_plus',
  'platinum_plus',
  'emerald_plus',
  'diamond_plus',
  'master_plus',
  'd2_plus',
] as const;

export type CounterPickTier = (typeof COUNTERPICK_TIERS)[number];

export const COUNTERPICK_ROLES = [
  'top',
  'jungle',
  'middle',
  'bottom',
  'support',
] as const;

export type CounterPickRole = (typeof COUNTERPICK_ROLES)[number];

export type CounterPickSlot = 'current' | 'previous';

export interface CounterMatchupStats {
  vsWr: number;
  games: number;
  defaultLane?: string;
}

export interface ParsedLolalyticsCounters {
  patch: string;
  cid: number | null;
  defaultLane: string | null;
  lane: string | null;
  vsLane: string | null;
  winrate: number | null;
  pickrate: number | null;
  banrate: number | null;
  analysedGames: number | null;
  lanes: Record<string, number>;
  counters: Array<{
    cid: number;
    vsWr: number;
    games: number;
    defaultLane?: string;
  }>;
  champPath: Record<string, string>;
}

export const COUNTERPICK_WORKER_INTERVAL_MS = 60 * 60 * 1000; // Every 1 hour
const FETCH_TIMEOUT_MS = 15000;
const DEFAULT_CONCURRENCY = Number(process.env.COUNTERPICK_CONCURRENCY || '8');

let tableChecked = false;
let isSyncRunning = false;

const FALLBACK_SLUG_OVERRIDES: Record<string, string> = {
  monkeyking: 'wukong',
  wukong: 'wukong',
  renata: 'renata',
  nunu: 'nunu',
  fiddlesticks: 'fiddlesticks',
  leblanc: 'leblanc',
  chogath: 'chogath',
  kaisa: 'kaisa',
  khazix: 'khazix',
  velkoz: 'velkoz',
  belveth: 'belveth',
  ksante: 'ksante',
  kogmaw: 'kogmaw',
  leesin: 'leesin',
  masteryi: 'masteryi',
  missfortune: 'missfortune',
  drmundo: 'drmundo',
  jarvaniv: 'jarvaniv',
  tahmkench: 'tahmkench',
  twistedfate: 'twistedfate',
  xinzhao: 'xinzhao',
  aurelionsol: 'aurelionsol',
  reksai: 'reksai',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toFiniteNumber(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = typeof val === 'number' ? val : Number(val);
  return Number.isFinite(n) ? n : null;
}

/**
 * Ensures the counter_picks table exists in PostgreSQL.
 */
export async function ensureCounterPickTableExists(): Promise<void> {
  if (tableChecked) return;
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS counter_picks (
        id TEXT PRIMARY KEY,
        slot TEXT NOT NULL,
        patch TEXT NOT NULL,
        "championId" INTEGER NOT NULL REFERENCES champions(id) ON DELETE CASCADE,
        tier TEXT NOT NULL,
        role TEXT NOT NULL,
        winrate DOUBLE PRECISION,
        pickrate DOUBLE PRECISION,
        banrate DOUBLE PRECISION,
        "analysedGames" INTEGER,
        "roleShare" DOUBLE PRECISION,
        matchups JSONB NOT NULL,
        "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE counter_picks DROP COLUMN IF EXISTS "avgWinrate"
    `);
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS counter_picks_slot_championId_tier_role_key
      ON counter_picks (slot, "championId", tier, role)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS counter_picks_slot_patch_idx ON counter_picks (slot, patch)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS counter_picks_slot_tier_role_idx ON counter_picks (slot, tier, role)
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS counter_picks_championId_slot_idx ON counter_picks ("championId", slot)
    `);
    tableChecked = true;
  } catch (err) {
    console.warn('[CounterPickService] Table check warning:', (err as Error).message);
  }
}

/**
 * Parses Lolalytics SSR <script type="qwik/json"> payload into structured stats and counters.
 */
export function parseLolalyticsCounterHtml(html: string): ParsedLolalyticsCounters | null {
  const match = html.match(/<script type="qwik\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;

  const qwik = JSON.parse(match[1]) as { objs?: unknown[] };
  const objs = qwik.objs;
  if (!Array.isArray(objs) || objs.length === 0) return null;

  const resolve = (val: unknown, depth = 0): unknown => {
    if (depth > 8) return val;
    if (typeof val === 'string' && /^[0-9a-z]+$/.test(val)) {
      const idx = parseInt(val, 36);
      if (idx >= 0 && idx < objs.length) {
        return resolveVal(objs[idx], depth + 1);
      }
    }
    return val;
  };

  const resolveVal = (v: unknown, depth = 0): unknown => {
    if (depth > 8) return v;
    if (v === null || typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string') {
      return v;
    }
    if (Array.isArray(v)) {
      return v.map((item) => resolve(item, depth + 1));
    }
    if (typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, ref] of Object.entries(v as Record<string, unknown>)) {
        out[k] = resolve(ref, depth + 1);
      }
      return out;
    }
    return v;
  };

  let dataObj: any = null;
  let metaObj: any = null;

  for (let i = 0; i < objs.length; i++) {
    const o = objs[i] as Record<string, unknown> | null;
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      if (!dataObj && 'stats' in o && 'counters' in o && 'response' in o) {
        dataObj = resolveVal(o);
      }
      if (!metaObj && 'patch' in o && 'champions' in o && 'champId' in o && 'champPath' in o) {
        metaObj = resolveVal(o);
      }
      if (dataObj && metaObj) break;
    }
  }

  if (!dataObj?.stats) return null;

  const stats = dataObj.stats;
  const rawCounters = Array.isArray(dataObj.counters) ? dataObj.counters : [];
  const counters: ParsedLolalyticsCounters['counters'] = [];

  for (const item of rawCounters) {
    if (!item || typeof item !== 'object') continue;
    const cid = toFiniteNumber(item.cid);
    const vsWr = toFiniteNumber(item.vsWr);
    const games = toFiniteNumber(item.n);

    if (cid === null || vsWr === null || games === null) {
      continue;
    }

    counters.push({
      cid: Math.round(cid),
      vsWr,
      games: Math.round(games),
      defaultLane: typeof item.defaultLane === 'string' ? item.defaultLane : undefined,
    });
  }

  const lanes: Record<string, number> = {};
  if (stats.lanes && typeof stats.lanes === 'object') {
    for (const [k, v] of Object.entries(stats.lanes)) {
      const num = toFiniteNumber(v);
      if (num !== null) lanes[k] = num;
    }
  }

  const champPath: Record<string, string> = {};
  if (metaObj?.champPath && typeof metaObj.champPath === 'object') {
    for (const [k, v] of Object.entries(metaObj.champPath)) {
      if (typeof v === 'string') {
        champPath[String(k)] = v;
      }
    }
  }

  return {
    patch: typeof metaObj?.patch === 'string' ? metaObj.patch : '',
    cid: toFiniteNumber(stats.cid),
    defaultLane: typeof stats.defaultLane === 'string' ? stats.defaultLane : null,
    lane: typeof stats.lane === 'string' ? stats.lane : null,
    vsLane: typeof stats.vsLane === 'string' ? stats.vsLane : null,
    winrate: toFiniteNumber(stats.wr),
    pickrate: toFiniteNumber(stats.pr),
    banrate: toFiniteNumber(stats.br),
    analysedGames: toFiniteNumber(stats.analysed),
    lanes,
    counters,
    champPath,
  };
}

/**
 * Fetches and parses a single Lolalytics counter page with retries & backoff.
 */
export async function fetchLolalyticsCounterPage(
  slug: string,
  tier: string,
  role: string,
  patch: string,
  retries = 3
): Promise<ParsedLolalyticsCounters | null> {
  const params = new URLSearchParams({
    tier,
    lane: role,
    vslane: role,
    patch,
  });
  const url = `https://lolalytics.com/de/lol/${encodeURIComponent(slug)}/counters/?${params.toString()}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'de-DE,de;q=0.9,en;q=0.8',
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });

      if (res.status === 404) {
        return null;
      }

      if (res.status === 429 || res.status >= 500) {
        const delayMs = 800 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 400);
        await sleep(delayMs);
        continue;
      }

      if (!res.ok) {
        return null;
      }

      const html = await res.text();
      return parseLolalyticsCounterHtml(html);
    } catch {
      if (attempt < retries) {
        const delayMs = 600 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 300);
        await sleep(delayMs);
      }
    }
  }

  return null;
}

function resolveChampionLolalyticsSlug(
  champion: { id: number; key: string; nameEn: string },
  champPathMap: Record<string, string>
): string {
  const mapped = champPathMap[String(champion.id)];
  if (mapped) return mapped;

  const rawKey = (champion.key || champion.nameEn || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (FALLBACK_SLUG_OVERRIDES[rawKey]) return FALLBACK_SLUG_OVERRIDES[rawKey];
  return rawKey;
}

/**
 * Shifts current counterpick rows to 'previous' when a new LoL patch is released.
 */
async function shiftCurrentToPreviousIfPatchChanged(latestPatch: string): Promise<boolean> {
  const existingCurrent = await prisma.counterPick.findFirst({
    where: { slot: 'current' },
    select: { patch: true },
  });

  if (existingCurrent && existingCurrent.patch && existingCurrent.patch !== latestPatch) {
    console.log(
      `📦 [CounterPickWorker] New patch detected (${existingCurrent.patch} -> ${latestPatch}). Shifting 'current' CounterPick data to 'previous'...`
    );
    await prisma.$transaction([
      prisma.counterPick.deleteMany({ where: { slot: 'previous' } }),
      prisma.counterPick.updateMany({
        where: { slot: 'current' },
        data: { slot: 'previous' },
      }),
    ]);
    return true;
  }

  return false;
}

/**
 * Synchronizes Lolalytics counterpicks for all Champions (from Champion table),
 * across all 17 tiers and all 5 roles, strictly for the current DDragon patch.
 * If a matchup yields no data on Lolalytics, its entry is stored as null.
 */
export async function syncCounterPicksForCurrentPatch(force = false): Promise<{
  patch: string;
  championsCount: number;
  tasksTotal: number;
  tasksSucceeded: number;
  shiftedToPrevious: boolean;
}> {
  if (isSyncRunning) {
    console.log('[CounterPickWorker] Sync already in progress, skipping duplicate invocation.');
    const patch = await getLatestPatch();
    return {
      patch,
      championsCount: 0,
      tasksTotal: 0,
      tasksSucceeded: 0,
      shiftedToPrevious: false,
    };
  }

  isSyncRunning = true;
  const startedAt = Date.now();

  try {
    await ensureCounterPickTableExists();

    // Force-refresh DDragon versions.json to detect new patches immediately
    await getLatestDDragonVersion(true);
    const currentPatch = await getLatestPatch();

    // Load all champions from Champion table
    let champions = await prisma.champion.findMany({
      select: { id: true, key: true, nameEn: true },
      orderBy: { nameEn: 'asc' },
    });

    if (champions.length === 0) {
      console.log('⚔️ [CounterPickWorker] Champion table empty, syncing Champion catalog first...');
      await syncChampionSnapshot(true);
      champions = await prisma.champion.findMany({
        select: { id: true, key: true, nameEn: true },
        orderBy: { nameEn: 'asc' },
      });
    }

    if (champions.length === 0) {
      throw new Error('Champion table is still empty after sync.');
    }

    const shiftedToPrevious = await shiftCurrentToPreviousIfPatchChanged(currentPatch);

    // Seed Lolalytics champPath map from a reliable page
    let champPathMap: Record<string, string> = {};
    const seedParsed = await fetchLolalyticsCounterPage('briar', 'all', 'jungle', currentPatch);
    if (seedParsed?.champPath && Object.keys(seedParsed.champPath).length > 0) {
      champPathMap = seedParsed.champPath;
    }

    const allChampionIds = champions.map((c) => c.id);
    const tasks: Array<{ champion: { id: number; key: string; nameEn: string }; tier: string; role: string }> = [];

    for (const champion of champions) {
      for (const tier of COUNTERPICK_TIERS) {
        for (const role of COUNTERPICK_ROLES) {
          tasks.push({ champion, tier, role });
        }
      }
    }

    console.log(
      `🚀 [CounterPickWorker] Starting CounterPick sync for Patch ${currentPatch} | ${champions.length} champions × ${COUNTERPICK_TIERS.length} tiers × ${COUNTERPICK_ROLES.length} roles = ${tasks.length} tasks (concurrency=${DEFAULT_CONCURRENCY}, force=${force})`
    );

    let cursor = 0;
    let succeeded = 0;
    let failed = 0;
    const total = tasks.length;

    const worker = async () => {
      while (true) {
        const idx = cursor++;
        if (idx >= total) break;

        const { champion, tier, role } = tasks[idx];
        const slug = resolveChampionLolalyticsSlug(champion, champPathMap);

        try {
          const parsed = await fetchLolalyticsCounterPage(slug, tier, role, currentPatch);
          if (parsed && Object.keys(champPathMap).length === 0 && Object.keys(parsed.champPath).length > 0) {
            champPathMap = parsed.champPath;
          }

          // Build full matchup map across EVERY champion from the Champion table; null if no data
          const parsedByEnemyId = new Map<number, CounterMatchupStats>();
          if (parsed?.counters) {
            for (const c of parsed.counters) {
              parsedByEnemyId.set(c.cid, {
                vsWr: c.vsWr,
                games: c.games,
                ...(c.defaultLane ? { defaultLane: c.defaultLane } : {}),
              });
            }
          }

          const matchups: Record<string, CounterMatchupStats | null> = {};
          for (const enemyId of allChampionIds) {
            matchups[String(enemyId)] = parsedByEnemyId.get(enemyId) ?? null;
          }

          const roleShare = parsed?.lanes?.[role] ?? null;

          await prisma.counterPick.upsert({
            where: {
              slot_championId_tier_role: {
                slot: 'current',
                championId: champion.id,
                tier,
                role,
              },
            },
            create: {
              slot: 'current',
              patch: currentPatch,
              championId: champion.id,
              tier,
              role,
              winrate: parsed?.winrate ?? null,
              pickrate: parsed?.pickrate ?? null,
              banrate: parsed?.banrate ?? null,
              analysedGames: parsed?.analysedGames !== null && parsed?.analysedGames !== undefined
                ? Math.round(parsed.analysedGames)
                : null,
              roleShare,
              matchups: matchups as any,
              fetchedAt: new Date(),
            },
            update: {
              patch: currentPatch,
              winrate: parsed?.winrate ?? null,
              pickrate: parsed?.pickrate ?? null,
              banrate: parsed?.banrate ?? null,
              analysedGames: parsed?.analysedGames !== null && parsed?.analysedGames !== undefined
                ? Math.round(parsed.analysedGames)
                : null,
              roleShare,
              matchups: matchups as any,
              fetchedAt: new Date(),
            },
          });

          succeeded++;
        } catch (err) {
          failed++;
          if (failed <= 15) {
            console.warn(
              `[CounterPickWorker] Failed ${slug} (${tier}/${role}): ${(err as Error).message}`
            );
          }
        }

        const done = succeeded + failed;
        if (done % 500 === 0 || done === total) {
          const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
          console.log(
            `⏳ [CounterPickWorker] Progress: ${done}/${total} (${Math.round((done / total) * 100)}%) | ok=${succeeded}, err=${failed} | ${elapsedSec}s elapsed`
          );
        }
      }
    };

    const workerCount = Math.max(1, Math.min(DEFAULT_CONCURRENCY, 16));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    const totalSec = Math.round((Date.now() - startedAt) / 1000);
    console.log(
      `✅ [CounterPickWorker] Finished Patch ${currentPatch} in ${totalSec}s | ok=${succeeded}/${total}, failed=${failed}`
    );

    return {
      patch: currentPatch,
      championsCount: champions.length,
      tasksTotal: total,
      tasksSucceeded: succeeded,
      shiftedToPrevious,
    };
  } finally {
    isSyncRunning = false;
  }
}

/**
 * Returns metadata for the /counterpicks page (champions, available patches, tiers, roles).
 */
export async function getCounterPickMeta(locale = 'de') {
  await ensureCounterPickTableExists();

  const [champions, currentSample, previousSample, currentCount, previousCount] = await Promise.all([
    prisma.champion.findMany({
      select: {
        id: true,
        key: true,
        nameDe: true,
        nameEn: true,
        titleDe: true,
        titleEn: true,
        image: true,
        role: true,
        positions: true,
      },
      orderBy: locale === 'de' ? { nameDe: 'asc' } : { nameEn: 'asc' },
    }),
    prisma.counterPick.findFirst({
      where: { slot: 'current' },
      select: { patch: true, fetchedAt: true },
      orderBy: { fetchedAt: 'desc' },
    }),
    prisma.counterPick.findFirst({
      where: { slot: 'previous' },
      select: { patch: true, fetchedAt: true },
      orderBy: { fetchedAt: 'desc' },
    }),
    prisma.counterPick.count({ where: { slot: 'current' } }),
    prisma.counterPick.count({ where: { slot: 'previous' } }),
  ]);

  const latestPatch = await getLatestPatch();

  return {
    patches: {
      current: {
        slot: 'current' as const,
        patch: currentSample?.patch || latestPatch,
        fetchedAt: currentSample?.fetchedAt || null,
        rowCount: currentCount,
        available: currentCount > 0,
      },
      previous: {
        slot: 'previous' as const,
        patch: previousSample?.patch || null,
        fetchedAt: previousSample?.fetchedAt || null,
        rowCount: previousCount,
        available: previousCount > 0,
      },
    },
    tiers: [...COUNTERPICK_TIERS],
    roles: [...COUNTERPICK_ROLES],
    champions: champions.map((c) => ({
      id: c.id,
      key: c.key,
      name: locale === 'de' ? c.nameDe : c.nameEn,
      nameDe: c.nameDe,
      nameEn: c.nameEn,
      title: locale === 'de' ? c.titleDe : c.titleEn,
      image: c.image,
      role: c.role,
      positions: c.positions,
    })),
  };
}

/**
 * Returns CounterPick data for a single champion, tier, role, and patch slot ('current' | 'previous'),
 * including every champion from the Champion table (with null values when no matchup data exists).
 */
export async function getChampionCounterPicks(params: {
  champion: string;
  tier?: string;
  role?: string;
  slot?: CounterPickSlot;
  locale?: string;
}) {
  await ensureCounterPickTableExists();

  const locale = params.locale === 'en' ? 'en' : 'de';
  const slot: CounterPickSlot = params.slot === 'previous' ? 'previous' : 'current';
  const tier = COUNTERPICK_TIERS.includes(params.tier as CounterPickTier)
    ? (params.tier as CounterPickTier)
    : 'all';

  const allChampions = await prisma.champion.findMany({
    select: {
      id: true,
      key: true,
      nameDe: true,
      nameEn: true,
      titleDe: true,
      titleEn: true,
      image: true,
      role: true,
      positions: true,
    },
    orderBy: locale === 'de' ? { nameDe: 'asc' } : { nameEn: 'asc' },
  });

  const queryNorm = params.champion.trim().toLowerCase();
  const numericQuery = /^\d+$/.test(queryNorm) ? parseInt(queryNorm, 10) : null;

  const targetChampion = allChampions.find((c) => {
    if (numericQuery !== null && c.id === numericQuery) return true;
    return (
      c.key.toLowerCase() === queryNorm ||
      c.nameEn.toLowerCase() === queryNorm ||
      c.nameDe.toLowerCase() === queryNorm ||
      c.nameEn.toLowerCase().replace(/[^a-z0-9]/g, '') === queryNorm.replace(/[^a-z0-9]/g, '')
    );
  });

  if (!targetChampion) {
    return null;
  }

  // Fetch all role summaries for this champion in this slot & tier
  const roleSummaries = await prisma.counterPick.findMany({
    where: {
      slot,
      championId: targetChampion.id,
      tier,
    },
    select: {
      role: true,
      patch: true,
      winrate: true,
      pickrate: true,
      banrate: true,
      roleShare: true,
      fetchedAt: true,
    },
  });

  // Determine role: requested role, or highest roleShare, or Champion.positions[0], or 'jungle'
  let role: CounterPickRole;
  if (params.role && COUNTERPICK_ROLES.includes(params.role as CounterPickRole)) {
    role = params.role as CounterPickRole;
  } else {
    const sortedByShare = [...roleSummaries].sort(
      (a, b) => (b.roleShare ?? -1) - (a.roleShare ?? -1)
    );
    const topRole = sortedByShare[0]?.role as CounterPickRole | undefined;
    if (topRole && COUNTERPICK_ROLES.includes(topRole)) {
      role = topRole;
    } else {
      const posMap: Record<string, CounterPickRole> = {
        TOP: 'top',
        JUNGLE: 'jungle',
        MID: 'middle',
        MIDDLE: 'middle',
        ADC: 'bottom',
        BOTTOM: 'bottom',
        SUPPORT: 'support',
      };
      const firstPos = (targetChampion.positions[0] || targetChampion.role || '').toUpperCase();
      role = posMap[firstPos] || 'jungle';
    }
  }

  const row = await prisma.counterPick.findUnique({
    where: {
      slot_championId_tier_role: {
        slot,
        championId: targetChampion.id,
        tier,
        role,
      },
    },
  });

  const rawMatchups = (row?.matchups as Record<string, CounterMatchupStats | null> | null) || {};

  // Build matchup entry for EVERY champion from Champion table (excluding self)
  const matchups = allChampions
    .filter((enemy) => enemy.id !== targetChampion.id)
    .map((enemy) => {
      const stats = rawMatchups[String(enemy.id)] ?? null;
      return {
        enemyChampionId: enemy.id,
        enemyKey: enemy.key,
        enemyName: locale === 'de' ? enemy.nameDe : enemy.nameEn,
        enemyNameDe: enemy.nameDe,
        enemyNameEn: enemy.nameEn,
        enemyTitle: locale === 'de' ? enemy.titleDe : enemy.titleEn,
        enemyImage: enemy.image,
        enemyPositions: enemy.positions,
        vsWr: stats ? stats.vsWr : null,
        games: stats ? stats.games : null,
        defaultLane: stats?.defaultLane ?? null,
      };
    });

  const withData = matchups.filter((m) => m.vsWr !== null && m.games !== null);
  const strongestCounters = [...withData]
    .sort((a, b) => (b.vsWr ?? 0) - (a.vsWr ?? 0))
    .slice(0, 10);
  const weakestCounters = [...withData]
    .sort((a, b) => (a.vsWr ?? 100) - (b.vsWr ?? 100))
    .slice(0, 10);

  const latestPatch = await getLatestPatch();

  return {
    slot,
    patch: row?.patch || roleSummaries[0]?.patch || (slot === 'current' ? latestPatch : null),
    tier,
    role,
    hasData: Boolean(row),
    fetchedAt: row?.fetchedAt || null,
    champion: {
      id: targetChampion.id,
      key: targetChampion.key,
      name: locale === 'de' ? targetChampion.nameDe : targetChampion.nameEn,
      nameDe: targetChampion.nameDe,
      nameEn: targetChampion.nameEn,
      title: locale === 'de' ? targetChampion.titleDe : targetChampion.titleEn,
      image: targetChampion.image,
      role: targetChampion.role,
      positions: targetChampion.positions,
    },
    stats: {
      winrate: row?.winrate ?? null,
      pickrate: row?.pickrate ?? null,
      banrate: row?.banrate ?? null,
      analysedGames: row?.analysedGames ?? null,
    },
    roleShares: COUNTERPICK_ROLES.map((r) => {
      const found = roleSummaries.find((s) => s.role === r);
      return {
        role: r,
        roleShare: found?.roleShare ?? null,
        winrate: found?.winrate ?? null,
        pickrate: found?.pickrate ?? null,
      };
    }),
    strongestCounters,
    weakestCounters,
    matchups,
  };
}
