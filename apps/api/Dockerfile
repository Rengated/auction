# API (NestJS) — собирается из корня монорепо:
#   docker build -f apps/api/Dockerfile .
FROM node:22-bookworm-slim

# openssl нужен Prisma-движкам
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/* \
 && npm i -g pnpm@10

WORKDIR /app

# Слой зависимостей — кэшируется, пока не меняются package.json/lock/shared
# (shared копируется целиком: его prepare-скрипт собирает пакет прямо при install)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @hermes/api...

COPY apps/api apps/api
RUN pnpm --filter @hermes/api exec prisma generate \
 && pnpm --filter @hermes/api build

ENV NODE_ENV=production
WORKDIR /app/apps/api
EXPOSE 3000

# Миграции применяются на старте — рестарт контейнера после обновления кода обновляет и схему
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
