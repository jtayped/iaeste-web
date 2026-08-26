# syntax=docker/dockerfile:1

# Build from the repository root:
#   docker build -f apps/api/Dockerfile -t iaeste-api .
FROM node:22-slim AS base

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2.6.1
COPY . .
RUN turbo prune @repo/api --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .

# OpenAPI generation constructs the application during the build. These are
# non-secret placeholders confined to this stage; Coolify supplies the real
# server-only values to the running container.
RUN DATABASE_URL=postgres://build:build@localhost:5432/build \
  RESEND_API_KEY=build-placeholder \
  REGISTRATION_EMAIL_FROM=noreply@iaestelleida.cat \
  npx turbo run build --filter=@repo/api

FROM installer AS production-dependencies
RUN npm prune --omit=dev --ignore-scripts

FROM base AS runner
WORKDIR /app
RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --create-home api

ENV NODE_ENV=production \
    API_PORT=3004

COPY --from=production-dependencies --chown=api:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=api:nodejs /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=api:nodejs /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=api:nodejs /app/packages/db/drizzle ./packages/db/drizzle
COPY --from=builder --chown=api:nodejs /app/apps/api/docker-entrypoint.sh ./apps/api/docker-entrypoint.sh

USER api

EXPOSE 3004

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3004/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["apps/api/docker-entrypoint.sh"]
