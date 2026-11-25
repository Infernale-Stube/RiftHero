import {
  syncCounterPicksForCurrentPatch,
  ensureCounterPickTableExists,
  COUNTERPICK_WORKER_INTERVAL_MS,
} from '../services/counterPickService';
import { prisma } from '../db/prisma';
import { getLatestDDragonVersion, getLatestPatch } from '../riot/ddragon';
import { setupWorkerProcess, registerGracefulShutdown } from './workerUtils';

setupWorkerProcess('CounterPickWorker');

let workerTimer: NodeJS.Timeout | null = null;

async function runStartupCheck(): Promise<void> {
  await ensureCounterPickTableExists();
  await getLatestDDragonVersion(true);
  const latestPatch = await getLatestPatch();

  const [currentCount, sample] = await Promise.all([
    prisma.counterPick.count({ where: { slot: 'current' } }),
    prisma.counterPick.findFirst({
      where: { slot: 'current' },
      select: { patch: true, fetchedAt: true },
      orderBy: { fetchedAt: 'desc' },
    }),
  ]);

  const ageMs = sample?.fetchedAt ? Date.now() - sample.fetchedAt.getTime() : Infinity;
  const needsSync =
    currentCount === 0 ||
    !sample ||
    sample.patch !== latestPatch ||
    ageMs >= COUNTERPICK_WORKER_INTERVAL_MS;

  if (needsSync) {
    console.log(
      `🔄 [CounterPickWorker] CounterPick data missing or outdated (rows=${currentCount}, storedPatch=${sample?.patch || 'none'}, latestPatch=${latestPatch}). Starting initial sync...`
    );
    await syncCounterPicksForCurrentPatch();
  } else {
    console.log(
      `✅ [CounterPickWorker] CounterPick table up-to-date for Patch ${latestPatch} (${currentCount} rows). Next hourly sync scheduled.`
    );
  }
}

async function main() {
  console.log('=================================================================');
  console.log('🛡️ RiftHero CounterPick Scraper Worker Starting...');
  console.log(`⏱️ Sync Interval: Every ${COUNTERPICK_WORKER_INTERVAL_MS / 60000} minutes (hourly)`);
  console.log('🌐 Source: Lolalytics + Riot DDragon versions.json patch check');
  console.log('=================================================================');

  // Run initial check in background without blocking shutdown registration
  runStartupCheck().catch((err) => {
    console.error('[CounterPickWorker] Startup sync error:', err);
  });

  workerTimer = setInterval(() => {
    console.log('⏰ [CounterPickWorker] Hourly CounterPick sync triggered...');
    syncCounterPicksForCurrentPatch().catch((err) => {
      console.error('[CounterPickWorker] Scheduled sync error:', err);
    });
  }, COUNTERPICK_WORKER_INTERVAL_MS);

  registerGracefulShutdown('CounterPickWorker', async () => {
    if (workerTimer) {
      clearInterval(workerTimer);
      workerTimer = null;
    }
  });
}

main().catch((err) => {
  console.error('Fatal CounterPickWorker error:', err);
  process.exit(1);
});
