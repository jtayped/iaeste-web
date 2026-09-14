# syntax=docker/dockerfile:1

# Build from the repository root:
#   docker build -f apps/cms/Dockerfile -t iaeste-cms .
FROM node:22-slim AS base
# sharp needs libvips at runtime; the slim image does not ship it. gosu lets the
# runner entrypoint start as root, fix the media-volume ownership, then drop to
# the unprivileged `nextjs` user for the actual processes.
RUN apt-get update \
  && apt-get install -y --no-install-recommends libvips42 gosu \
  && rm -rf /var/lib/apt/lists/*

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2.6.1
COPY . .
RUN turbo prune cms --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN --mount=type=cache,target=/root/.npm,sharing=locked \
    SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 npm ci

# `turbo prune` writes a pruned lockfile with every platform-specific optional
# package stripped out, so the `npm ci` above installs sharp's JavaScript
# without a native binding and `require("sharp")` throws at runtime. Next links
# the `opengraph-image` module into the metadata of every page, so that one
# missing binary took the whole site down with "a client-side exception has
# occurred". Reinstalling sharp here resolves its optional deps against this
# image's platform; the version comes from the workspace so the two cannot
# drift apart.
#
# It installs into a scratch prefix and copies only the `@img/*` binding
# packages back in. Installing into /app itself would need --no-package-lock,
# which makes npm re-resolve all ~900 packages from scratch and rewrite the
# tree npm ci just laid down -- that dehoisted a second copy of `next` into
# apps/web/node_modules and broke the build on two incompatible NextConfig
# types. The scratch prefix cannot touch the installed tree at all.
RUN SHARP_VERSION="$(node -p "require('./apps/cms/package.json').dependencies.sharp")" \
 && npm install --no-save --no-package-lock --include=optional \
      --prefix /tmp/sharp "sharp@$SHARP_VERSION" \
 && mkdir -p node_modules/@img \
 && cp -R /tmp/sharp/node_modules/@img/. node_modules/@img/ \
 && rm -rf /tmp/sharp

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

# Payload's admin panel and its migration CLI both need the real, complete
# node_modules — Next's standalone tracer under-includes the `payload`
# package (it drops `payload/bin.js` and most of `payload/dist`), so the
# `payload migrate` entrypoint and parts of the admin fail against a traced
# tree. Ship the pruned production install instead of the standalone output.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
# The pruned workspace packages `@repo/env` / `@repo/constants` are symlinked
# from node_modules; their real source must travel too.
COPY --from=builder --chown=nextjs:nodejs /app/packages ./packages
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/node_modules ./apps/cms/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/package.json ./apps/cms/package.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/tsconfig.json ./apps/cms/tsconfig.json
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/next.config.mjs ./apps/cms/next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/.next ./apps/cms/.next
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/public ./apps/cms/public
# Config + collections + generated types + committed migrations, so the
# entrypoint's `payload migrate` can load the config and apply them.
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/src ./apps/cms/src
COPY --from=builder --chown=nextjs:nodejs /app/apps/cms/docker-entrypoint.sh ./apps/cms/docker-entrypoint.sh

# The entrypoint runs as root only to chown the mounted media volume, then hands
# every long-lived process to `nextjs` via gosu.

EXPOSE 3006

# The health endpoint runs a bounded Postgres query, so an unhealthy database
# keeps the container from going ready — which is what we want after a failed
# migration.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3006/api/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

ENTRYPOINT ["apps/cms/docker-entrypoint.sh"]
