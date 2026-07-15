#!/bin/sh
set -e

# Sync schema on container start (Coolify DATABASE_URL)
if [ -n "$DATABASE_URL" ] && [ -f /app/prisma/schema.prisma ]; then
  echo "[entrypoint] prisma db push..."
  if ! prisma db push --schema=/app/prisma/schema.prisma --skip-generate; then
    echo "[entrypoint] WARNING: prisma db push failed — check DATABASE_URL and DB permissions"
  fi
fi

exec node apps/web/server.js
