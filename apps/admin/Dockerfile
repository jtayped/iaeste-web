# syntax=docker/dockerfile:1

# Build from the repository root:
#   docker build -f apps/admin/Dockerfile -t iaeste-admin .
FROM node:22-slim AS base

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2.6.1
COPY . .
RUN turbo prune admin --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 npm ci

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .

# Unlike apps/inscripcions there are no NEXT_PUBLIC_* build args: the admin app
# compiles no configuration into the browser bundle, so there is nothing here
# that CI needs to thread through per environment.
#
# API_INTERNAL_URL is still needed *during* the build because next.config.ts
# imports @repo/env/admin/server, which validates at module load. The value
# below is a throwaway that satisfies that check; `next start` re-reads
# next.config.ts at boot, so the runtime value the container is given is the
# one the rewrite and the server components actually use.
ENV NEXT_TELEMETRY_DISABLED=1 \
    API_INTERNAL_URL=http://build-time-placeholder.invalid

RUN npx turbo run build --filter=admin

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3005 \
    HOSTNAME=0.0.0.0

RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --create-home nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/public ./apps/admin/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/admin/.next/static ./apps/admin/.next/static

USER nextjs

EXPOSE 3005

# `/sign-in` rather than `/`: the root is behind the session check and answers
# with a redirect, and it reaches out to the API to get there. The sign-in page
# is the shallowest route that proves this container itself is serving.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3005/sign-in').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/admin/server.js"]
