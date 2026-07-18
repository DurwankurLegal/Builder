#!/usr/bin/env bash
# Builder CRM - pre-deployment safety check.
#
# Read-only. Changes nothing. Run this BEFORE deploying and only proceed if it
# reports OK. It verifies the new stack cannot collide with anything already
# running on this server (cctv.durwankur.com / dsa.durwankur.com).

set -uo pipefail

RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YLW=$'\033[0;33m'; NC=$'\033[0m'
FAIL=0

ok()   { echo "${GRN}  [OK]${NC}   $*"; }
warn() { echo "${YLW}  [WARN]${NC} $*"; }
bad()  { echo "${RED}  [FAIL]${NC} $*"; FAIL=1; }

echo "=============================================="
echo " Builder CRM - preflight (read-only)"
echo "=============================================="

echo
echo "1. Ports the new stack will bind (127.0.0.1 only)"
for PORT in 18000 18080 18432 18379; do
    if ss -ltn 2>/dev/null | awk '{print $4}' | grep -qE "[:.]${PORT}\$"; then
        bad "port ${PORT} is already in use - pick another in docker-compose.prod.yml"
    else
        ok "port ${PORT} free"
    fi
done

echo
echo "2. Ports currently in use by your existing services (must stay untouched)"
ss -ltnp 2>/dev/null | grep -E ':(80|443)\b' | sed 's/^/     /' || warn "could not read :80/:443"

echo
echo "3. Docker object name collisions"
for NAME in buildercrm_prod_postgres buildercrm_prod_redis buildercrm_prod_backend buildercrm_prod_frontend; do
    if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -qx "$NAME"; then
        bad "container '${NAME}' already exists"
    else
        ok "container name '${NAME}' available"
    fi
done
for VOL in buildercrm_prod_postgres_data buildercrm_prod_redis_data; do
    if docker volume ls --format '{{.Name}}' 2>/dev/null | grep -qx "$VOL"; then
        warn "volume '${VOL}' exists - data from a previous deploy will be reused"
    else
        ok "volume '${VOL}' available"
    fi
done

echo
echo "4. Existing containers (these must remain Up after deploy)"
docker ps --format '     {{.Names}}\t{{.Status}}\t{{.Ports}}' 2>/dev/null || warn "docker not readable by this user"

echo
echo "5. nginx"
if command -v nginx >/dev/null 2>&1; then
    ok "nginx installed"
    if [ -e /etc/nginx/sites-enabled/builder.durwankur.com ]; then
        warn "vhost builder.durwankur.com already enabled - it will be replaced"
    else
        ok "no existing builder.durwankur.com vhost"
    fi
    echo "     Currently enabled sites:"
    ls -1 /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/       /'
    if sudo nginx -t >/dev/null 2>&1; then
        ok "current nginx config is valid (baseline good)"
    else
        bad "current nginx config is ALREADY invalid - fix before deploying"
    fi
else
    bad "nginx not installed"
fi

echo
echo "6. DNS"
RESOLVED=$(getent hosts builder.durwankur.com | awk '{print $1}' | head -1)
if [ -n "$RESOLVED" ]; then
    ok "builder.durwankur.com resolves to ${RESOLVED}"
    [ "$RESOLVED" = "103.14.97.240" ] || warn "does not match this server's public IP (103.14.97.240)"
else
    bad "builder.durwankur.com does not resolve - create the A record before requesting a certificate"
fi

echo
echo "7. Resources"
free -h 2>/dev/null | sed 's/^/     /'
df -h / 2>/dev/null | sed 's/^/     /'
AVAIL=$(free -m 2>/dev/null | awk '/^Mem:/{print $7}')
if [ -n "${AVAIL:-}" ] && [ "$AVAIL" -lt 1200 ]; then
    warn "only ${AVAIL}MB available RAM - the stack is capped at ~1.6GB"
else
    ok "sufficient free memory"
fi

echo
echo "=============================================="
if [ "$FAIL" -eq 0 ]; then
    echo "${GRN} PREFLIGHT PASSED - safe to deploy${NC}"
else
    echo "${RED} PREFLIGHT FAILED - resolve the items above first${NC}"
fi
echo "=============================================="
exit "$FAIL"
