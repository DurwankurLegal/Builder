#!/usr/bin/env bash
# Builder CRM - automated redeploy (called by CI/CD or cron).
#
# Pulls the latest main and rebuilds ONLY the buildercrm stack. It never
# touches cctv/dsa: it uses this project's own compose file + project name,
# and prunes only DANGLING images (never images in use by other containers).
#
# Safe to run repeatedly - the seed is idempotent (schemas/columns only,
# no demo data).
set -euo pipefail

# A minimal, robust PATH so this works even under a restricted (forced-command)
# SSH session where the environment is bare.
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:${PATH:-}"

REPO="/opt/buildercrm"
cd "$REPO"

echo "==> [$(date -u +%FT%TZ)] Fetching latest code"
git pull --ff-only origin main

cd "$REPO/deploy"
echo "==> Rebuilding buildercrm stack (loopback ports only, other apps untouched)"
docker compose -f docker-compose.prod.yml --env-file .env up -d --build

echo "==> Applying idempotent DB migrations / seed"
docker compose -f docker-compose.prod.yml exec -T backend python -m app.db.seed

echo "==> Removing dangling images (safe: never removes images in use)"
docker image prune -f

echo "==> Deployed $(git -C "$REPO" rev-parse --short HEAD) at $(date -u +%FT%TZ)"
