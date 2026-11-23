import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { highPriorityQueue, lowPriorityQueue } from '../queue/bullmq';
import { prisma } from '../db/prisma';
import { setupWorkerProcess, registerGracefulShutdown } from './workerUtils';

const execAsync = promisify(exec);

setupWorkerProcess('MaintenanceWorker');

const QUEUE_CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // Hourly
const DB_MAINTENANCE_INTERVAL_MS = 24 * 60 * 60 * 1000; // Daily (24h)
const BACKUP_DIR = process.env.BACKUP_DIR || '/backups';
const RETENTION_DAYS = parseInt(process.env.BACKUP_RETENTION_DAYS || '7', 10);

let queueInterval: NodeJS.Timeout | null = null;
let dbInterval: NodeJS.Timeout | null = null;

/**
 * 1. Prunes old completed and failed jobs from BullMQ Redis queues
 */
async function cleanQueues(): Promise<void> {
  try {
    console.log('🧹 [Maintenance] Running BullMQ queue maintenance...');
    
    // Clean completed jobs older than 1 hour (3600000 ms)
    const cleanedHighCompleted = await highPriorityQueue.clean(3600 * 1000, 1000, 'completed');
    const cleanedLowCompleted = await lowPriorityQueue.clean(3600 * 1000, 2000, 'completed');

    // Clean failed jobs older than 24 hours (86400000 ms)
    const cleanedHighFailed = await highPriorityQueue.clean(24 * 3600 * 1000, 500, 'failed');
    const cleanedLowFailed = await lowPriorityQueue.clean(24 * 3600 * 1000, 500, 'failed');

    console.log(
      `✅ [Maintenance] BullMQ cleanup complete: Removed completed (${cleanedHighCompleted.length} high, ${cleanedLowCompleted.length} low), failed (${cleanedHighFailed.length} high, ${cleanedLowFailed.length} low)`
    );
  } catch (err: any) {
    console.warn('⚠️ [Maintenance] Queue cleanup warning:', err.message);
  }
}

/**
 * 2. Runs PostgreSQL VACUUM ANALYZE to reclaim storage and update query planner stats
 */
async function runDatabaseMaintenance(): Promise<void> {
  try {
    console.log('🐘 [Maintenance] Running PostgreSQL VACUUM ANALYZE...');
    const startTime = Date.now();
    await prisma.$executeRawUnsafe('VACUUM ANALYZE;');
    const duration = Date.now() - startTime;

    const [matchCount, participantCount, summonerCount] = await Promise.all([
      prisma.match.count(),
      prisma.matchParticipant.count(),
      prisma.summoner.count(),
    ]);

    console.log(
      `⚡ [Maintenance] PostgreSQL VACUUM ANALYZE completed in ${duration}ms. Active records: ${matchCount} matches, ${participantCount} participants, ${summonerCount} summoners.`
    );
  } catch (err: any) {
    console.warn('⚠️ [Maintenance] Database VACUUM ANALYZE warning:', err.message);
  }
}

/**
 * 3. Creates a compressed PostgreSQL database backup via pg_dump
 */
async function runDatabaseBackup(): Promise<void> {
  const host = process.env.POSTGRES_HOST || 'postgres';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = process.env.POSTGRES_USER || 'rifthero';
  const password = process.env.POSTGRES_PASSWORD || 'rifthero_secret_2026';
  const database = process.env.POSTGRES_DB || 'rifthero';

  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(BACKUP_DIR, `rifthero_${database}_${timestamp}.sql.gz`);

    console.log(`💾 [Maintenance] Starting PostgreSQL backup to ${backupFile}...`);

    const command = `PGPASSWORD="${password}" pg_dump -h "${host}" -p "${port}" -U "${user}" -d "${database}" --no-owner --clean | gzip > "${backupFile}"`;

    await execAsync(command);

    if (fs.existsSync(backupFile)) {
      const stats = fs.statSync(backupFile);
      const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`✅ [Maintenance] Database backup successful: ${path.basename(backupFile)} (${sizeMb} MB)`);
    }

    // Prune backups older than retention window
    pruneOldBackups();
  } catch (err: any) {
    console.warn('⚠️ [Maintenance] Database backup warning (pg_dump may not be installed or DB unreachable):', err.message);
  }
}

/**
 * Prunes backup archives older than RETENTION_DAYS
 */
function pruneOldBackups(): void {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;

    const files = fs.readdirSync(BACKUP_DIR);
    const now = Date.now();
    const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith('.sql.gz')) continue;
      const filePath = path.join(BACKUP_DIR, file);
      try {
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ [Maintenance] Pruned expired backup: ${file} (older than ${RETENTION_DAYS} days)`);
        }
      } catch {
        // Ignore single file error
      }
    }
  } catch (err: any) {
    console.warn('⚠️ [Maintenance] Backup pruning warning:', err.message);
  }
}

async function main() {
  console.log('=================================================================');
  console.log('🛠️ RiftHero Maintenance & Housekeeping Worker Starting...');
  console.log(`🧹 Queue Cleanup: Every ${QUEUE_CLEANUP_INTERVAL_MS / 60000}m`);
  console.log(`🐘 DB Maintenance & Backup: Every ${DB_MAINTENANCE_INTERVAL_MS / 3600000}h (Retention: ${RETENTION_DAYS} days)`);
  console.log('=================================================================');

  // Initial runs on startup
  await cleanQueues();
  await runDatabaseMaintenance();
  await runDatabaseBackup();

  // Hourly queue cleanup
  queueInterval = setInterval(() => {
    cleanQueues().catch((err) => console.error('[Maintenance] Hourly queue cleanup error:', err));
  }, QUEUE_CLEANUP_INTERVAL_MS);

  // Daily DB maintenance and backup
  dbInterval = setInterval(async () => {
    console.log('⏰ [Maintenance] Daily interval triggered. Performing maintenance & backup...');
    await runDatabaseMaintenance();
    await runDatabaseBackup();
  }, DB_MAINTENANCE_INTERVAL_MS);

  registerGracefulShutdown('MaintenanceWorker', async () => {
    if (queueInterval) clearInterval(queueInterval);
    if (dbInterval) clearInterval(dbInterval);
    await highPriorityQueue.close();
    await lowPriorityQueue.close();
  });
}

main().catch((err) => {
  console.error('Fatal MaintenanceWorker error:', err);
  process.exit(1);
});
