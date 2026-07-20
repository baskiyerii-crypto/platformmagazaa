#!/bin/sh
set -e

echo "[entrypoint] starting..."

# Sync schema + optional seed (non-fatal — app must still boot)
if [ -n "$DATABASE_URL" ] && [ -f /app/prisma/schema.prisma ]; then
  echo "[entrypoint] prisma db push..."
  if prisma db push --schema=/app/prisma/schema.prisma --skip-generate; then
    echo "[entrypoint] ensure-seed..."
    if [ -f /seed/ensure-seed.cjs ]; then
      # Default: no data writes on redeploy (maintenance).
      # Full seed only on empty DB or FORCE_SEED=1.
      # SKIP_SEED=1 = skip entirely | FORCE_SEED_PASSWORDS=1 = reset bootstrap passwords.
      # Coolify: do NOT set FORCE_SEED / FORCE_SEED_PASSWORDS in production.
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
# Coolify sometimes injects empty UPLOAD_DIR= which breaks path resolution
if [ -z "$UPLOAD_DIR" ] || [ "$UPLOAD_DIR" = "" ]; then
  UPLOAD_DIR="/app/uploads"
fi
export UPLOAD_DIR
mkdir -p "$UPLOAD_DIR"
echo "[entrypoint] upload dir: $UPLOAD_DIR (cwd=$(pwd))"
ls -la "$UPLOAD_DIR" 2>/dev/null | head -5 || echo "[entrypoint] upload dir empty or inaccessible"

echo "[entrypoint] starting Next.js on port ${PORT:-3000}..."
exec node apps/web/server.js
