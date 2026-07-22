#!/usr/bin/env bash
# Builder CRM Startup Script for Mac/Linux
set -e

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
MODE="${1:-docker}"

# Colors
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
GRAY='\033[0;90m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}       Builder CRM Startup Helper       ${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

# Function to test Docker availability
docker_running() {
    docker info > /dev/null 2>&1
}

if [ "$MODE" = "docker" ]; then
    echo -e "${YELLOW}[1/3] Checking Docker status...${NC}"
    if ! docker_running; then
        echo -e "${RED}✗ Error: Docker is not running!${NC}"
        echo -e "${WHITE}  Please start Docker Desktop and run this script again,${NC}"
        echo -e "${WHITE}  or run locally: ./start.sh local${NC}"
        exit 1
    fi

    echo -e "${YELLOW}[2/3] Starting containers with Docker Compose...${NC}"
    cd "$PROJECT_ROOT"
    docker compose up --build -d

    echo -e "${YELLOW}[3/3] Initializing & seeding database...${NC}"
    docker compose exec backend python -m app.db.seed

    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}   Builder CRM is running via Docker!   ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${WHITE} Frontend: http://localhost:5173${NC}"
    echo -e "${WHITE} Backend:  http://localhost:8000${NC}"
    echo -e "${WHITE} API Docs: http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${YELLOW} Default Credentials:${NC}"
    echo -e "${WHITE}   Username: admin${NC}"
    echo -e "${WHITE}   Password: admin${NC}"
    echo -e "${GREEN}========================================${NC}"

elif [ "$MODE" = "local" ]; then
    echo -e "${YELLOW}[1/4] Checking Database services...${NC}"
    if docker_running; then
        echo -e "${GRAY}Starting Postgres & Redis containers...${NC}"
        cd "$PROJECT_ROOT"
        docker compose up postgres redis -d
        sleep 3
    else
        echo -e "${YELLOW}Note: Docker is not running. Make sure PostgreSQL (port 15432 or 5432) and Redis (port 16379 or 6379) are running locally.${NC}"
    fi

    # Setup Backend
    echo -e "${YELLOW}[2/4] Setting up Backend...${NC}"
    BACKEND_DIR="$PROJECT_ROOT/backend"
    cd "$BACKEND_DIR"

    VENV_PATH="$BACKEND_DIR/venv"
    if [ ! -d "$VENV_PATH" ]; then
        echo -e "${GRAY}Creating Python virtual environment...${NC}"
        python3 -m venv venv
    fi

    # Activate venv (Mac/Linux style)
    VENV_PYTHON="$VENV_PATH/bin/python"
    VENV_PIP="$VENV_PATH/bin/pip"
    VENV_UVICORN="$VENV_PATH/bin/uvicorn"

    echo -e "${GRAY}Installing backend dependencies...${NC}"
    "$VENV_PIP" install -r requirements.txt --quiet

    echo -e "${GRAY}Seeding database...${NC}"
    export DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:15432/buildercrm"
    export REDIS_URL="redis://localhost:16379/0"
    export SECRET_KEY="dev-secret-key-change-in-production"

    "$VENV_PYTHON" -m app.db.seed || echo -e "${YELLOW}Database seed notice: Ensure PostgreSQL is reachable at localhost:15432.${NC}"

    echo -e "${GRAY}Launching Backend server in the background...${NC}"
    cd "$BACKEND_DIR"
    DATABASE_URL="$DATABASE_URL" REDIS_URL="$REDIS_URL" SECRET_KEY="$SECRET_KEY" \
        "$VENV_UVICORN" app.main:app --host 0.0.0.0 --port 8000 --reload &
    BACKEND_PID=$!
    echo -e "${GRAY}  Backend PID: $BACKEND_PID${NC}"

    # Setup Frontend
    echo -e "${YELLOW}[3/4] Setting up Frontend...${NC}"
    FRONTEND_DIR="$PROJECT_ROOT/frontend"
    cd "$FRONTEND_DIR"

    if [ ! -d "node_modules" ]; then
        echo -e "${GRAY}Installing frontend dependencies...${NC}"
        npm install
    fi

    echo -e "${GRAY}Launching Frontend dev server in the background...${NC}"
    npm run dev &
    FRONTEND_PID=$!
    echo -e "${GRAY}  Frontend PID: $FRONTEND_PID${NC}"

    cd "$PROJECT_ROOT"
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN} Builder CRM processes started locally! ${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo -e "${WHITE} Frontend: http://localhost:5173${NC}"
    echo -e "${WHITE} Backend:  http://localhost:8000${NC}"
    echo -e "${WHITE} API Docs: http://localhost:8000/docs${NC}"
    echo ""
    echo -e "${YELLOW} Default Credentials:${NC}"
    echo -e "${WHITE}   Username: admin${NC}"
    echo -e "${WHITE}   Password: admin${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${GRAY} Backend PID: $BACKEND_PID | Frontend PID: $FRONTEND_PID${NC}"
    echo -e "${GRAY} To stop: ./stop.sh  (or kill $BACKEND_PID $FRONTEND_PID)${NC}"

    # Wait for background processes so script doesn't exit immediately
    wait
else
    echo -e "${RED}Unknown mode: $MODE${NC}"
    echo -e "${WHITE}Usage: ./start.sh [docker|local]${NC}"
    exit 1
fi
