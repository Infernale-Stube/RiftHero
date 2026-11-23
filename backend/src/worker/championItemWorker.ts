import {
  syncChampionSnapshot,
  ensureMetaTableExists,
} from '../services/championService';
import {
  computeAndSaveItemSnapshot,
  ensureItemTableExists,
} from '../services/itemService';
import { getLatestDDragonVersion } from '../riot/ddragon';
import { prisma } from '../db/prisma';

export const CHAMPION_ITEM_WORKER_INTERVAL_MS = 60 * 60 * 1000; // Check hourly for new game patch
let workerTimer: NodeJS.Timeout | null = null;
let isSyncRunning = false;

/**
 * Champion & Items Worker Task:
 * Synchronizes Champion catalog (DDragon + LoLDB /skins & store pricing)
 * and Item catalog (DDragon items, recipes, gold stats).
 */
export async function syncChampionAndItemData(force = false): Promise<{
  championsCount: number;
  itemsCount: number;
  version: string;
}> {
  if (isSyncRunning) {
    console.log('[ChampionItemWorker] Sync already in progress, skipping duplicate invocation.');
    const latestVersion = await getLatestDDragonVersion();
    return { championsCount: 0, itemsCount: 0, version: latestVersion };
  }

  isSyncRunning = true;
  try {
    console.log('🔄 [ChampionItemWorker] Synchronizing Champion and Item catalogs...');
    const [champResult, itemResult] = await Promise.all([
      syncChampionSnapshot(force),
      computeAndSaveItemSnapshot(force),
    ]);

    console.log(
      `⚡ [ChampionItemWorker] Sync complete! Version: ${champResult.version} | ${champResult.championsCount} champions | ${itemResult.totalItems} items.`
    );

    return {
      championsCount: champResult.championsCount,
      itemsCount: itemResult.totalItems,
      version: champResult.version,
    };
  } finally {
    isSyncRunning = false;
  }
}

/**
 * Initializes the dedicated Champion & Items Worker:
 * 1. Startup check: verifies that both champion_snapshots and item_snapshots exist,
 *    match the latest DDragon version, and contain valid LoLDB skin release dates.
 * 2. Hourly periodic check: polls Riot's versions.json and automatically synchronizes
 *    both catalogs whenever a new patch drops.
 */
export function initChampionItemWorker(intervalMs = CHAMPION_ITEM_WORKER_INTERVAL_MS): void {
  // 1. Startup check
  (async () => {
    try {
      await Promise.all([ensureMetaTableExists(), ensureItemTableExists()]);
      const latestVersion = await getLatestDDragonVersion();

      const champCount = await prisma.champion.count();
      const champSample = await prisma.champion.findFirst({ select: { version: true } });
      const itemCount = await prisma.item.count();
      const itemSample = await prisma.item.findFirst({ select: { version: true } });

      const champNeedsUpdate =
        champCount === 0 ||
        !champSample ||
        champSample.version !== latestVersion;

      const itemNeedsUpdate =
        itemCount === 0 ||
        !itemSample ||
        itemSample.version !== latestVersion;

      if (champNeedsUpdate || itemNeedsUpdate) {
        console.log(
          `🔄 [ChampionItemWorker] Catalog missing or outdated (Champs: ${champSample?.version || 'none'} [${champCount}], Items: ${itemSample?.version || 'none'} [${itemCount}] vs Latest: ${latestVersion}). Triggering initial synchronization...`
        );
        syncChampionAndItemData().catch((err) => {
          console.error('[ChampionItemWorker] Initial catalog sync failed:', err);
        });
      } else {
        console.log(
          `⚡ [ChampionItemWorker] Catalogs up-to-date (Version: ${latestVersion}, ${champCount} champions, ${itemCount} items).`
        );
      }
    } catch (err) {
      console.warn('[ChampionItemWorker] Startup check error:', (err as Error).message);
    }
  })();

  // 2. Periodic hourly check for new patches
  if (!workerTimer) {
    workerTimer = setInterval(async () => {
      try {
        const latestVersion = await getLatestDDragonVersion(true);
        const champSample = await prisma.champion.findFirst({
          select: { version: true },
        });

        if (champSample && champSample.version !== latestVersion) {
          console.log(
            `⏰ [ChampionItemWorker] New game version detected (${champSample.version} -> ${latestVersion}). Updating champion and item catalogs...`
          );
          await syncChampionAndItemData(true);
        }
      } catch (err) {
        console.error('[ChampionItemWorker] Periodic patch check error:', err);
      }
    }, intervalMs);
    workerTimer.unref();
  }
}
