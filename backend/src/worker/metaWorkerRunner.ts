import {
  initMetaWorker,
  stopMetaWorker,
  META_WORKER_INTERVAL_MS,
} from './metaWorker';
import { setupWorkerProcess, registerGracefulShutdown } from './workerUtils';

setupWorkerProcess('MetaWorker');

async function main() {
  console.log('=================================================================');
  console.log('📊 RiftHero Meta Analysis & Tier List Worker Starting...');
  console.log(`⏱️ Analysis Interval: Every ${META_WORKER_INTERVAL_MS / 3600000} hours`);
  console.log('🧠 Dedicated to computing match winrates, pickrates, and tier lists');
  console.log('=================================================================');

  // unref = false keeps the node process running
  initMetaWorker(META_WORKER_INTERVAL_MS, false);

  registerGracefulShutdown('MetaWorker', async () => {
    stopMetaWorker();
  });
}

main().catch((err) => {
  console.error('Fatal MetaWorker error:', err);
  process.exit(1);
});
