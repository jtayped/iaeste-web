#!/bin/sh
# Run committed Payload migrations before the CMS accepts traffic. A migration
# failure aborts the container: no half-migrated schema ever serves requests.
# This is independent of apps/api's Drizzle migration entrypoint — the two
# databases are separate and neither migrator touches the other's schema.
set -e

cd /app/apps/cms
export PAYLOAD_CONFIG_PATH=/app/apps/cms/src/payload.config.ts

echo "[cms] running payload migrations"
../../node_modules/.bin/payload migrate

echo "[cms] starting next"
exec ../../node_modules/.bin/next start --port 3006
