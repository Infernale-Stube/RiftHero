#!/bin/sh
set -e

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=1536}"

case "$1" in
  api)
    echo "⚡ [Entrypoint] Starting RiftHero REST API Service..."
    if [ "$AUTO_MIGRATE" != "false" ]; then
      echo "📦 [Entrypoint] Synchronizing PostgreSQL database schema (prisma db push)..."
      npx prisma db push --schema=./prisma/schema.prisma --skip-generate --accept-data-loss || echo "⚠️ [Entrypoint] Prisma db push warning, continuing..."
    fi
    echo "🚀 [Entrypoint] Launching API server on port ${PORT:-4000}..."
    exec node dist/api/server.js
    ;;
  worker:high)
    echo "⚡ [Entrypoint] Starting RiftHero High-Priority Worker (Interactive User Lookups)..."
    exec node dist/worker/highWorker.js
    ;;
  worker:low)
    echo "❄️ [Entrypoint] Starting RiftHero Low-Priority Worker (Snowball Crawler)..."
    exec node dist/worker/lowWorker.js
    ;;
  worker:champions)
    echo "⚔️ [Entrypoint] Starting RiftHero Champion & Item Catalog Sync Worker..."
    exec node dist/worker/championWorker.js
    ;;
  worker:meta)
    echo "📊 [Entrypoint] Starting RiftHero Meta Analysis & Tier List Worker..."
    exec node dist/worker/metaWorkerRunner.js
    ;;
  worker:maintenance)
    echo "🛠️ [Entrypoint] Starting RiftHero Housekeeping & Maintenance Worker..."
    exec node dist/worker/maintenanceWorker.js
    ;;
  worker)
    echo "⚡ [Entrypoint] Starting RiftHero All-in-One Worker (Fallback)..."
    exec node dist/worker/index.js
    ;;
  *)
    exec "$@"
    ;;
esac
