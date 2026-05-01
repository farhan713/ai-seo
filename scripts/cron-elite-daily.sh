#!/bin/bash
# Wrapper: load .env, then run the daily Elite cron via tsx.
set -e
cd /var/www/aiseotool
set -a
. ./.env
set +a
export NVM_DIR=/root/.nvm
. /root/.nvm/nvm.sh
nvm use 22 >/dev/null
export CLAUDE_TIMEOUT_SECONDS=600
exec /root/.nvm/versions/node/v22.14.0/bin/npx tsx scripts/cron-elite-daily.ts
