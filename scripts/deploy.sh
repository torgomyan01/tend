#!/usr/bin/env bash
# Սերվերի autodeploy — GitHub Webhook (tend-deploy-hook) կամ workflow_dispatch SSH Actions։
set -euo pipefail

DEPLOY_PATH="${DEPLOY_PATH:-/var/www/tend}"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
PATH="/usr/bin:/usr/local/bin:/bin:/usr/sbin"
export PATH

PM2_BIN="${PM2_BIN:-/usr/local/bin/pm2}"
if ! [ -x "$PM2_BIN" ]; then
  PM2_BIN="$(command -v pm2 || true)"
fi
if [ -z "$PM2_BIN" ] || ! [ -x "$PM2_BIN" ]; then
  echo "pm2 չի գտնվել։ Տեղադրեք PM2 կամ սահմանեք PM2_BIN" >&2
  exit 1
fi

cd "$DEPLOY_PATH"

git config --global --add safe.directory "$DEPLOY_PATH" 2>/dev/null || true

git fetch origin "$DEPLOY_BRANCH"
git checkout "$DEPLOY_BRANCH"
git reset --hard "origin/$DEPLOY_BRANCH"

/usr/bin/npm ci
/usr/bin/npm run build

./scripts/prisma-system-node.sh generate

if compgen -G "prisma/migrations/*/migration.sql" >/dev/null 2>&1; then
  echo "Running prisma migrate deploy…"
  ./scripts/prisma-system-node.sh migrate deploy
else
  echo "No prisma/migrations — skip migrate deploy (սքեման ձեռքով sync արեք կամ ավելացրեք migrations)։"
fi

if "$PM2_BIN" describe tend >/dev/null 2>&1; then
  "$PM2_BIN" restart tend --update-env
else
  "$PM2_BIN" start ecosystem.config.cjs
fi

"$PM2_BIN" save

echo "Deploy finished OK"
