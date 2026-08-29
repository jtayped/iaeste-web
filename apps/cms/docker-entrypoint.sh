#!/bin/sh
# Run committed Payload migrations before the CMS accepts traffic. A migration
# failure aborts the container: no half-migrated schema ever serves requests.
# This is independent of apps/api's Drizzle migration entrypoint — the two
# databases are separate and neither migrator touches the other's schema.
set -e

echo "[cms] running payload migrations"
node apps/cms/node_modules/payload/dist/bin/index.js migrate

echo "[cms] starting next"
exec node apps/cms/server.js
