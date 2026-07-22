#!/usr/bin/env bash
# Builder CRM Stop Script for Mac/Linux
PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
GRAY='\033[0;90m'
NC='\033[0m'

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}        Builder CRM Stop Helper        ${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# 1. Stop Docker Compose services if Docker is running
if docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}[1/2] Stopping Docker containers...${NC}"
    cd "$PROJECT_ROOT"
    docker compose down
    echo -e "${GREEN}  Docker containers stopped.${NC}"
else
    echo -e "${GRAY}[1/2] Docker is not active; skipping container shutdown.${NC}"
fi

# 2. Stop local dev server processes if running
echo -e "${YELLOW}[2/2] Checking for local dev server processes...${NC}"
STOPPED=0

# Kill python/uvicorn backend processes related to this project
BACKEND_PIDS=$(pgrep -f "app.main:app" 2>/dev/null || true)
if [ -n "$BACKEND_PIDS" ]; then
    for pid in $BACKEND_PIDS; do
        kill "$pid" 2>/dev/null && echo -e "${GRAY}  Stopped Backend process (PID: $pid)${NC}" && STOPPED=$((STOPPED + 1))
    done
fi

# Also catch any uvicorn processes from the backend venv
UVICORN_PIDS=$(pgrep -f "Builder/backend.*uvicorn" 2>/dev/null || true)
if [ -n "$UVICORN_PIDS" ]; then
    for pid in $UVICORN_PIDS; do
        kill "$pid" 2>/dev/null && echo -e "${GRAY}  Stopped Backend process (PID: $pid)${NC}" && STOPPED=$((STOPPED + 1))
    done
fi

# Kill node/vite frontend processes related to this project
FRONTEND_PIDS=$(pgrep -f "Builder/frontend.*vite" 2>/dev/null || true)
if [ -n "$FRONTEND_PIDS" ]; then
    for pid in $FRONTEND_PIDS; do
        kill "$pid" 2>/dev/null && echo -e "${GRAY}  Stopped Frontend process (PID: $pid)${NC}" && STOPPED=$((STOPPED + 1))
    done
fi

# Also check for node processes in the frontend directory
NODE_PIDS=$(pgrep -f "node.*Builder/frontend" 2>/dev/null || true)
if [ -n "$NODE_PIDS" ]; then
    for pid in $NODE_PIDS; do
        kill "$pid" 2>/dev/null && echo -e "${GRAY}  Stopped Frontend process (PID: $pid)${NC}" && STOPPED=$((STOPPED + 1))
    done
fi

if [ "$STOPPED" -eq 0 ]; then
    echo -e "${GRAY}  No background Backend or Frontend local processes found.${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}   Builder CRM services are stopped!    ${NC}"
echo -e "${GREEN}========================================${NC}"
