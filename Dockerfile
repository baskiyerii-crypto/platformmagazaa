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

# Next standalone (küçük runtime)
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/packages/database/prisma ./prisma
COPY scripts/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY scripts/ensure-seed.cjs /app/ensure-seed.cjs
RUN chmod +x /app/docker-entrypoint.sh \
  && npm install @prisma/client@6.19.3 bcryptjs@2.4.3 --omit=dev \
  && prisma generate --schema=/app/prisma/schema.prisma

EXPOSE 3000
CMD ["/app/docker-entrypoint.sh"]
