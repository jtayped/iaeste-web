#!/bin/sh
# Run committed Payload migrations before the CMS accepts traffic. A migration
# failure aborts the container: no half-migrated schema ever serves requests.
# This is independent of apps/api's Drizzle migration entrypoint — the two
# databases are separate and neither migrator touches the other's schema.
set -e

# Coolify mounts the persistent media volume owned by root; the app runs as
# `nextjs`. Repair ownership on every boot (cheap, and survives volume
# recreation) while we are still root, then drop privileges for everything else.
MEDIA_DIR="${CMS_MEDIA_DIR:-/data/media}"
if [ "$(id -u)" = "0" ]; then
  mkdir -p "$MEDIA_DIR"
  chown -R nextjs:nodejs "$MEDIA_DIR"
  set -- gosu nextjs "$@"
fi

cd /app/apps/cms
export PAYLOAD_CONFIG_PATH=/app/apps/cms/src/payload.config.ts

echo "[cms] running payload migrations"
"$@" ../../node_modules/.bin/payload migrate

echo "[cms] starting next"
exec "$@" ../../node_modules/.bin/next start --port 3006
