# syntax=docker/dockerfile:1

# Build from the repository root:
#   docker build -f apps/cms/Dockerfile -t iaeste-cms .
FROM node:22-slim AS base
# sharp needs libvips at runtime; the slim image does not ship it.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libvips42 \
  && rm -rf /var/lib/apt/lists/*

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2.6.1
COPY . .
RUN turbo prune cms --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 npm ci

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .

# next.config.mjs imports @repo/env/cms/server while compiling, so the build
# needs every CMS key present. These are non-secret placeholders confined to
# this stage; Coolify supplies the real runtime values to the container.
ENV NEXT_TELEMETRY_DISABLED=1 \
    CMS_DATABASE_URL=postgres://build:build@localhost:5432/build \
    CMS_PAYLOAD_SECRET=build-placeholder-build-placeholder-0001 \
    CMS_PUBLIC_ORIGIN=http://localhost:3006 \
    CMS_MEDIA_DIR=/data/media \
    CMS_EMAIL_FROM=noreply@iaestelleida.cat \
    CMS_PREVIEW_SECRET=build-placeholder-build-placeholder-0002 \
    WEB_PUBLIC_ORIGIN=http://localhost:3000 \
    WEB_REVALIDATE_URL=http://localhost:3000/api/revalidate/blog \
    WEB_REVALIDATE_SECRET=build-placeholder-build-placeholder-0003 \
    RESEND_API_KEY=build-placeholder

RUN npx turbo run build --filter=cms

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3006 \
    HOSTNAME=0.0.0.0

RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --create-home nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/public ./apps/cms/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next/static ./apps/cms/.next/static
# Payload config, generated types/import map and committed migrations travel
# with the runtime image so `payload migrate` can run at boot.
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/src ./apps/cms/src
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/docker-entrypoint.sh ./apps/cms/docker-entrypoint.sh

USER nextjs

EXPOSE 3006

# The health endpoint runs a bounded Postgres query, so an unhealthy database
# keeps the container from going ready — which is what we want after a failed
# migration.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3006/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["apps/cms/docker-entrypoint.sh"]
