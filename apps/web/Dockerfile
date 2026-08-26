# syntax=docker/dockerfile:1
#
# Production image for apps/web (the public marketing site).
#
# IMPORTANT: the build context is the REPOSITORY ROOT, not apps/web/. This is
# an npm-workspaces monorepo: apps/web imports @repo/ui, @repo/env,
# @repo/constants and @repo/email as TypeScript source (there's no compiled
# `dist` for them), and `npm ci` needs the root package-lock.json to install
# reproducibly. Building from apps/web alone can see neither.
#
#   docker build -f apps/web/Dockerfile -t iaeste-web .
#
# Stages:
#   1. pruner    - `turbo prune` trims the workspace down to exactly what
#                  apps/web needs (itself + @repo/ui, @repo/env,
#                  @repo/constants, @repo/email and their tooling configs),
#                  so the next stage doesn't install apps/api's or
#                  apps/inscripcions's dependencies.
#   2. installer - `npm ci` against the pruned lockfile. Dev dependencies are
#                  kept -- `next build` needs them.
#   3. builder   - runs the actual Next.js build. See the ARGs below for why
#                  build-time env is required at all.
#   4. runner    - slim runtime image containing only the standalone server
#                  output, static assets and public/, run as a non-root user.
#                  No node_modules, no source, no devDependencies.
FROM node:22-alpine AS base

# ---------------------------------------------------------------------------
FROM base AS pruner
WORKDIR /app
# turbo prune's own package.json parsing wants this on alpine.
RUN apk add --no-cache libc6-compat
# Installed once here (not via `npx`) so pruning doesn't need network access
# beyond this single package fetch.
RUN npm install -g turbo@^2.6.1
COPY . .
RUN turbo prune web --docker

# ---------------------------------------------------------------------------
FROM base AS installer
WORKDIR /app
RUN apk add --no-cache libc6-compat
# out/json/ is the pruned set of package.json files plus the root lockfile --
# copying just this (before the full source) is what lets Docker cache the
# `npm ci` layer across source-only changes.
COPY --from=pruner /app/out/json/ .
RUN npm ci

# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY --from=installer /app/ .
# out/full/ is the pruned source tree (apps/web + its workspace deps only,
# including its own turbo.json).
COPY --from=pruner /app/out/full/ .

# --- Build-time configuration -----------------------------------------------
# `next build` traces every server module reachable from a route while
# "Collecting page data", which includes apps/web/src/lib/emails.ts -- the
# contact-form server action -- because it constructs a Resend client at
# module scope (`createResendEmailer({ apiKey: env.RESEND_API_KEY, ... })`).
# @repo/env validates these eagerly on import, so the build fails without
# *some* value for all four, even though only NEXT_PUBLIC_INSCRIPCIONS_STATE
# actually gets compiled into the output: Next.js inlines NEXT_PUBLIC_* into
# both the client and server bundles at build time, but RESEND_API_KEY /
# CONTACT_FORM_FROM / CONTACT_FORM_TO are plain server-side `process.env`
# reads that still happen at container runtime. See docs/deployment.md for
# the full build-time-vs-runtime breakdown.
#
# The defaults below are CI/placeholder values, matching .github/ci.yml's
# build job -- never pass real secrets as build args, since they end up
# readable in the image's build history. Only NEXT_PUBLIC_INSCRIPCIONS_STATE
# needs a real value at build time; override it with --build-arg for an
# actual deploy.
ARG NEXT_PUBLIC_INSCRIPCIONS_STATE=on
ARG NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=
ARG RESEND_API_KEY=build-placeholder
ARG CONTACT_FORM_FROM=noreply@iaestelleida.cat
ARG CONTACT_FORM_TO=ci@example.com

ENV NEXT_PUBLIC_INSCRIPCIONS_STATE=$NEXT_PUBLIC_INSCRIPCIONS_STATE \
    NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG=$NEXT_PUBLIC_KEYSTATIC_GITHUB_APP_SLUG \
    RESEND_API_KEY=$RESEND_API_KEY \
    CONTACT_FORM_FROM=$CONTACT_FORM_FROM \
    CONTACT_FORM_TO=$CONTACT_FORM_TO \
    NEXT_TELEMETRY_DISABLED=1

# `turbo` is a devDependency of the root package.json, so `npm ci` in the
# installer stage already installed it into node_modules/.bin -- `npx` here
# resolves that local binary rather than fetching anything.
RUN KEYSTATIC_GITHUB_CLIENT_ID=build-placeholder \
  KEYSTATIC_GITHUB_CLIENT_SECRET=build-placeholder \
  KEYSTATIC_SECRET=build-placeholder \
  npx turbo run build --filter=web

# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs

# Standalone output does not include public/ or .next/static -- Next.js
# expects the Dockerfile to copy them in manually.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
