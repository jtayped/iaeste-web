# syntax=docker/dockerfile:1

# Build from the repository root:
#   docker build -f apps/inscripcions/Dockerfile -t iaeste-inscripcions .
FROM node:22-slim AS base

FROM base AS pruner
WORKDIR /app
RUN npm install -g turbo@^2.6.1
COPY . .
RUN turbo prune inscripcions --docker

FROM base AS installer
WORKDIR /app
COPY --from=pruner /app/out/json/ .
RUN SKIP_INSTALL_SIMPLE_GIT_HOOKS=1 npm ci

FROM base AS builder
WORKDIR /app
COPY --from=installer /app/ .
COPY --from=pruner /app/out/full/ .

# Next.js compiles these public values into the application bundle. The
# defaults make local image builds useful; CI passes the production URLs.
ARG NEXT_PUBLIC_API_URL=http://localhost:3004
ARG NEXT_PUBLIC_INSCRIPCIONS_STATE=on
ARG NEXT_PUBLIC_WHATSAPP_INVITE=https://chat.whatsapp.com/example

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_INSCRIPCIONS_STATE=$NEXT_PUBLIC_INSCRIPCIONS_STATE \
    NEXT_PUBLIC_WHATSAPP_INVITE=$NEXT_PUBLIC_WHATSAPP_INVITE \
    NEXT_TELEMETRY_DISABLED=1

RUN npx turbo run build --filter=inscripcions

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3003 \
    HOSTNAME=0.0.0.0

RUN groupadd --gid 1001 nodejs \
  && useradd --uid 1001 --gid nodejs --create-home nextjs

COPY --from=builder --chown=nextjs:nodejs /app/apps/inscripcions/public ./apps/inscripcions/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/inscripcions/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/inscripcions/.next/static ./apps/inscripcions/.next/static

USER nextjs

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3003/').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"

CMD ["node", "apps/inscripcions/server.js"]
