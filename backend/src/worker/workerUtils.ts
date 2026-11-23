import { disconnectPrisma } from '../db/prisma';

export function setupWorkerProcess(workerName: string): void {
  // Polyfill BigInt JSON serialization
  (BigInt.prototype as any).toJSON = function () {
    const n = Number(this);
    return Number.isSafeInteger(n) ? n : this.toString();
  };

  // Intercept uncaught exceptions to prevent worker exit
  process.on('uncaughtException', (err: Error) => {
    console.error(`🚨 [${workerName}] Intercepted uncaughtException:`, err.message);
    if (err.stack) console.error(err.stack);
  });

  process.on('unhandledRejection', (reason: any) => {
    console.error(`🚨 [${workerName}] Intercepted unhandledRejection:`, reason);
  });
}

export function registerGracefulShutdown(
  workerName: string,
  onShutdown: () => Promise<void>
): void {
  let isShuttingDown = false;

  const handleSignal = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    console.log(`\n🛑 [${workerName}] Received ${signal}. Shutting down gracefully...`);
    try {
      await onShutdown();
      await disconnectPrisma();
      console.log(`👋 [${workerName}] Stopped cleanly.`);
      process.exit(0);
    } catch (err: any) {
      console.error(`❌ [${workerName}] Error during shutdown:`, err.message);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => handleSignal('SIGTERM'));
  process.on('SIGINT', () => handleSignal('SIGINT'));
}
