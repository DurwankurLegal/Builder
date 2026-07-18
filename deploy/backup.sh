#!/usr/bin/env bash
# Builder CRM - database backup. Touches only the buildercrm database.
# Cron (daily 02:30):
#   30 2 * * * /opt/buildercrm/deploy/backup.sh >> /var/log/buildercrm-backup.log 2>&1

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/buildercrm}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
CONTAINER="buildercrm_prod_postgres"
STAMP="$(date +%Y%m%d_%H%M%S)"

ENV_FILE="$(dirname "$0")/.env"
# shellcheck disable=SC1090
[ -f "$ENV_FILE" ] && set -a && . "$ENV_FILE" && set +a

mkdir -p "$BACKUP_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER"; then
    echo "[$(date -Is)] ERROR: $CONTAINER is not running - backup skipped"
    exit 1
fi

OUT="${BACKUP_DIR}/buildercrm_${STAMP}.sql.gz"
echo "[$(date -Is)] Backing up to ${OUT}"

docker exec "$CONTAINER" pg_dump -U "${POSTGRES_USER:-buildercrm}" -d "${POSTGRES_DB:-buildercrm}" \
    | gzip -9 > "$OUT"

# Fail loudly on an empty/truncated dump rather than silently keeping garbage
if [ ! -s "$OUT" ] || [ "$(stat -c%s "$OUT")" -lt 1000 ]; then
    echo "[$(date -Is)] ERROR: backup looks empty - removing ${OUT}"
    rm -f "$OUT"
    exit 1
fi

chmod 600 "$OUT"
echo "[$(date -Is)] OK - $(du -h "$OUT" | cut -f1)"

find "$BACKUP_DIR" -name 'buildercrm_*.sql.gz' -mtime "+${RETENTION_DAYS}" -delete
echo "[$(date -Is)] Pruned backups older than ${RETENTION_DAYS} days"

# Restore (destructive - target database is dropped and recreated):
#   gunzip -c BACKUP.sql.gz | docker exec -i buildercrm_prod_postgres \
#     psql -U buildercrm -d buildercrm
