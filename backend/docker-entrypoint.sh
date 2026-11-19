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
  worker)
    echo "⚡ [Entrypoint] Starting RiftHero Background Worker Service (BullMQ & Riot Rate-Limiter)..."
    echo "🚀 [Entrypoint] Launching worker process..."
    exec node dist/worker/index.js
    ;;
  *)
    exec "$@"
    ;;
esac
