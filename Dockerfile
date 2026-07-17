# Coolify: Build Pack = Dockerfile (Nixpacks kullanmayın — imaj şişip unpack’te düşer)
FROM node:22-bookworm-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json ./apps/web/
COPY apps/mobile/package.json ./apps/mobile/
COPY packages/database/package.json ./packages/database/
COPY packages/shared/package.json ./packages/shared/
COPY packages/api-client/package.json ./packages/api-client/
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @magaza/database generate
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN pnpm --filter @magaza/web build \
  && rm -rf apps/web/.next/cache apps/mobile node_modules/.cache

FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
ENV UPLOAD_DIR=/app/uploads
WORKDIR /app

RUN mkdir -p /app/uploads /app/apps/web/public \
  && npm install -g prisma@6.19.3 --omit=dev

# Seed deps in isolated folder — NEVER npm install into /app (breaks Next standalone)
WORKDIR /seed
COPY packages/database/prisma ./prisma
COPY scripts/ensure-seed.cjs ./ensure-seed.cjs
RUN npm init -y \
  && npm install @prisma/client@6.19.3 bcryptjs@2.4.3 --omit=dev \
  && prisma generate --schema=/seed/prisma/schema.prisma

WORKDIR /app

# Next standalone (küçük runtime)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/database/prisma ./prisma
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh

# Prisma Query Engine: Next standalone + pnpm often omits *.so.node.
# Without this, /api/health/db and login return engine-not-found → 401.
COPY --from=builder /app/node_modules/.pnpm /tmp/pnpm-mods
RUN set -e; \
  ENGINE=$(find /tmp/pnpm-mods -name 'libquery_engine-debian-openssl-3.0.x.so.node' | head -n 1); \
  if [ -z "$ENGINE" ]; then \
    echo "FATAL: Prisma debian query engine not found in builder node_modules"; \
    find /tmp/pnpm-mods -name 'libquery_engine*' || true; \
    exit 1; \
  fi; \
  CLIENT_SRC=$(dirname "$ENGINE"); \
  # Path Prisma Client looks for under pnpm (see health/db error)
  PKG_REL=$(echo "$CLIENT_SRC" | sed 's|^/tmp/pnpm-mods/||'); \
  mkdir -p "/app/node_modules/.pnpm/$PKG_REL"; \
  cp -a "$CLIENT_SRC/." "/app/node_modules/.pnpm/$PKG_REL/"; \
  # Also place engines where Next/Prisma fallbacks search
  mkdir -p /app/node_modules/.prisma/client /app/apps/web/.next/server /app/apps/web/.prisma/client; \
  cp -a "$CLIENT_SRC/." /app/node_modules/.prisma/client/; \
  cp -a "$CLIENT_SRC/." /app/apps/web/.prisma/client/; \
  cp "$ENGINE" /app/apps/web/.next/server/; \
  # @prisma/client package (JS) next to nested .prisma if present
  PRISMA_CLIENT_JS=$(find /tmp/pnpm-mods -type d -path '*/node_modules/@prisma/client' | head -n 1); \
  if [ -n "$PRISMA_CLIENT_JS" ]; then \
    DEST_JS=$(echo "$PRISMA_CLIENT_JS" | sed 's|^/tmp/pnpm-mods/|/app/node_modules/.pnpm/|'); \
    mkdir -p "$DEST_JS"; \
    cp -a "$PRISMA_CLIENT_JS/." "$DEST_JS/"; \
  fi; \
  rm -rf /tmp/pnpm-mods; \
  echo "[docker] Prisma engine installed: $(basename "$ENGINE")"

RUN chmod +x /app/docker-entrypoint.sh \
  && mkdir -p /app/apps/web/public /app/uploads

EXPOSE 3000
CMD ["/app/docker-entrypoint.sh"]
