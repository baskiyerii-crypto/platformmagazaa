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

# Extract only Prisma engine + client into a tiny folder (never COPY full .pnpm into runner)
RUN set -e; \
  ENGINE=$(find /app/node_modules/.pnpm -name 'libquery_engine-debian-openssl-3.0.x.so.node' | head -n 1); \
  if [ -z "$ENGINE" ]; then \
    echo "FATAL: Prisma debian query engine not found"; \
    find /app/node_modules -name 'libquery_engine*' || true; \
    exit 1; \
  fi; \
  CLIENT_SRC=$(dirname "$ENGINE"); \
  PKG_REL=$(echo "$CLIENT_SRC" | sed 's|^/app/node_modules/.pnpm/||'); \
  mkdir -p "/prisma-runtime/pnpm/$PKG_REL" \
    /prisma-runtime/dot-prisma \
    /prisma-runtime/next-server; \
  cp -a "$CLIENT_SRC/." "/prisma-runtime/pnpm/$PKG_REL/"; \
  cp -a "$CLIENT_SRC/." /prisma-runtime/dot-prisma/; \
  cp "$ENGINE" /prisma-runtime/next-server/; \
  PRISMA_CLIENT_JS=$(find /app/node_modules/.pnpm -type d -path '*/node_modules/@prisma/client' | head -n 1); \
  if [ -n "$PRISMA_CLIENT_JS" ]; then \
    DEST_REL=$(echo "$PRISMA_CLIENT_JS" | sed 's|^/app/node_modules/.pnpm/||'); \
    mkdir -p "/prisma-runtime/pnpm/$DEST_REL"; \
    cp -a "$PRISMA_CLIENT_JS/." "/prisma-runtime/pnpm/$DEST_REL/"; \
  fi; \
  printf '%s' "$PKG_REL" > /prisma-runtime/engine-pkg-rel.txt; \
  echo "[docker] Prisma engine staged: $(basename "$ENGINE")"

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

# Small Prisma runtime only — full .pnpm must NOT land in this image (export/disk fail)
COPY --from=builder /prisma-runtime /tmp/prisma-runtime
RUN set -e; \
  mkdir -p /app/node_modules/.pnpm \
    /app/node_modules/.prisma/client \
    /app/apps/web/.next/server \
    /app/apps/web/.prisma/client; \
  cp -a /tmp/prisma-runtime/pnpm/. /app/node_modules/.pnpm/; \
  cp -a /tmp/prisma-runtime/dot-prisma/. /app/node_modules/.prisma/client/; \
  cp -a /tmp/prisma-runtime/dot-prisma/. /app/apps/web/.prisma/client/; \
  cp -a /tmp/prisma-runtime/next-server/. /app/apps/web/.next/server/; \
  rm -rf /tmp/prisma-runtime; \
  echo "[docker] Prisma engine installed from staged runtime"

RUN chmod +x /app/docker-entrypoint.sh \
  && mkdir -p /app/apps/web/public /app/uploads

EXPOSE 3000
CMD ["/app/docker-entrypoint.sh"]
