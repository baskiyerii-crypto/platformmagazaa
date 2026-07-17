#!/bin/sh
set -e

echo "[entrypoint] starting..."

# Sync schema + ensure default users (non-fatal — app must still boot)
if [ -n "$DATABASE_URL" ] && [ -f /app/prisma/schema.prisma ]; then
  echo "[entrypoint] prisma db push..."
  if prisma db push --schema=/app/prisma/schema.prisma --skip-generate; then
    echo "[entrypoint] ensure-seed..."
    if [ -f /seed/ensure-seed.cjs ]; then
      # Safe by default: does not recreate deleted Kadıköy / Demir Baş.
      # SKIP_SEED=1 | FORCE_SEED=1 | FORCE_SEED_PASSWORDS=1 supported.
      NODE_PATH=/seed/node_modules node /seed/ensure-seed.cjs \
        || echo "[entrypoint] WARNING: ensure-seed failed (app will still start)"
    else
      echo "[entrypoint] WARNING: /seed/ensure-seed.cjs not found"
    fi
  else
    echo "[entrypoint] WARNING: prisma db push failed — check DATABASE_URL / Postgres"
  fi
else
  echo "[entrypoint] WARNING: DATABASE_URL or schema missing — skip push/seed"
fi

if [ ! -f /app/apps/web/server.js ]; then
  echo "[entrypoint] FATAL: /app/apps/web/server.js not found"
  ls -la /app || true
  ls -la /app/apps || true
  exit 1
fi

UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
mkdir -p "$UPLOAD_DIR"
echo "[entrypoint] upload dir: $UPLOAD_DIR"

echo "[entrypoint] starting Next.js on port ${PORT:-3000}..."
exec node apps/web/server.js
