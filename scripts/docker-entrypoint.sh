#!/bin/sh
set -e

# Sync schema + ensure default users on container start (Coolify DATABASE_URL)
if [ -n "$DATABASE_URL" ] && [ -f /app/prisma/schema.prisma ]; then
  echo "[entrypoint] prisma db push..."
  if ! prisma db push --schema=/app/prisma/schema.prisma --skip-generate; then
    echo "[entrypoint] WARNING: prisma db push failed — check DATABASE_URL and DB permissions"
  else
    echo "[entrypoint] ensure-seed..."
    if [ -f /app/ensure-seed.cjs ]; then
      node /app/ensure-seed.cjs || echo "[entrypoint] WARNING: ensure-seed failed (app will still start)"
    else
      echo "[entrypoint] WARNING: /app/ensure-seed.cjs not found"
    fi
  fi
fi

exec node apps/web/server.js
