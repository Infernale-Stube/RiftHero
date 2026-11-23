import {
  computeAndSaveMetaAnalysis,
  ensureMetaTableExists,
  META_WORKER_INTERVAL_MS,
  MetaSnapshotData,
} from '../services/metaService';
import { prisma } from '../db/prisma';

export { META_WORKER_INTERVAL_MS };

let metaWorkerTimer: NodeJS.Timeout | null = null;

/**
 * Executes a full meta analysis pass:
 * Calculates ban statistics, winrates, pickrates, and tier lists from Ranked matches
 * and saves the results into 'meta_snapshots' (rotating previous patch).
 */
export async function runMetaAnalysis(): Promise<MetaSnapshotData> {
  console.log('🔄 [MetaWorker] Triggering on-demand meta analysis...');
  return await computeAndSaveMetaAnalysis();
}

export function stopMetaWorker(): void {
  if (metaWorkerTimer) {
    clearInterval(metaWorkerTimer);
    metaWorkerTimer = null;
  }
}

/**
 * Initializes the dedicated Meta Worker:
 * 1. Startup check: verifies if match meta analysis is missing or older than 6h in 'meta_snapshots'.
 * 2. Periodic 6-hour interval: recalculates meta stats and saves them to meta_snapshots.
 */
export function initMetaWorker(intervalMs = META_WORKER_INTERVAL_MS, unref = true): void {
  // 1. Startup check
  (async () => {
    try {
      await ensureMetaTableExists();
      const existing = await prisma.metaSnapshot.findUnique({
        where: { id: 'current' },
        select: { computedAt: true, totalMatches: true, tierListJson: true },
      });

      const sixHoursAgo = Date.now() - intervalMs;
      const isMetaMissing =
        !existing || !existing.tierListJson || (existing.tierListJson as any[]).length === 0;
      const isMetaStale =
        existing && existing.computedAt && existing.computedAt.getTime() < sixHoursAgo;

      if (isMetaMissing || isMetaStale) {
        console.log(
          '🔄 [MetaWorker] Match meta analysis missing or older than 6h. Running background analysis...'
        );
        computeAndSaveMetaAnalysis().catch((err) => {
          console.warn('[MetaWorker] Initial background meta analysis failed:', err);
        });
      } else {
        console.log(
          `⚡ [MetaWorker] Precomputed match meta stats are fresh (${existing.totalMatches} matches analyzed). Next run in 6h.`
        );
      }
    } catch (err) {
      console.warn('[MetaWorker] Startup check error:', (err as Error).message);
    }
  })();

  // 2. Periodic 6h execution
  if (!metaWorkerTimer) {
    metaWorkerTimer = setInterval(() => {
      console.log('⏰ [MetaWorker] 6-hour interval reached. Recomputing meta winrates, pickrates & tier list...');
      computeAndSaveMetaAnalysis().catch((err) => {
        console.error('[MetaWorker] Periodic analysis error:', err);
      });
    }, intervalMs);
    if (unref) {
      metaWorkerTimer.unref();
    }
  }
}
