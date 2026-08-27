#!/bin/sh
set -eu

node apps/api/dist/migrate.js
exec node apps/api/dist/server.js
