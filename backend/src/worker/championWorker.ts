import {
  initChampionItemWorker,
  stopChampionItemWorker,
  CHAMPION_ITEM_WORKER_INTERVAL_MS,
} from './championItemWorker';
import { setupWorkerProcess, registerGracefulShutdown } from './workerUtils';

setupWorkerProcess('ChampionWorker');

async function main() {
  console.log('=================================================================');
  console.log('⚔️ RiftHero Champion & Item Catalog Sync Worker Starting...');
  console.log(`⏱️ Patch Check Interval: Every ${CHAMPION_ITEM_WORKER_INTERVAL_MS / 60000} minutes`);
  console.log('📦 Dedicated to syncing DDragon versions, champion skins, and LoLDB items');
  console.log('=================================================================');

  // unref = false keeps the node process running
  initChampionItemWorker(CHAMPION_ITEM_WORKER_INTERVAL_MS, false);

  registerGracefulShutdown('ChampionWorker', async () => {
    stopChampionItemWorker();
  });
}

main().catch((err) => {
  console.error('Fatal ChampionWorker error:', err);
  process.exit(1);
});
