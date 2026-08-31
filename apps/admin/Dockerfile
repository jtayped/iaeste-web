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

# The admin app compiles no NEXT_PUBLIC_* values into the browser bundle, but
# API_INTERNAL_URL *is* baked in at build time: next.config.ts serialises the
# rewrite destinations into .next/routes-manifest.json, and the standalone
# server (node server.js) never re-reads next.config.ts. So the build-time value
# has to be the real internal address of the API on the container network.
# Server components re-read the runtime env, so keep the container's
# API_INTERNAL_URL set to the same value.
ARG API_INTERNAL_URL=http://iaeste-api:3004
# next.config.ts imports @repo/env/admin/server, which parses the whole schema
# while `next build` runs with NODE_ENV=production. CMS_PUBLIC_ORIGIN and
# WEB_PUBLIC_ORIGIN are required in production (no dev fallback), so the build
# needs them present. These are non-secret placeholders confined to this stage:
# both values are re-read from the runtime env by server components, and Coolify
# must supply the real origins — a missing one fails the container at boot
# rather than shipping a localhost link.
ENV NEXT_TELEMETRY_DISABLED=1 \
    API_INTERNAL_URL=$API_INTERNAL_URL \
    CMS_PUBLIC_ORIGIN=http://localhost:3006 \
    WEB_PUBLIC_ORIGIN=http://localhost:3000

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
