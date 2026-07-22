# Builder CRM Startup Script for Windows (PowerShell)
[CmdletBinding()]
param (
    [ValidateSet("docker", "local")]
    [string]$Mode = "docker"
)

$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "       Builder CRM Startup Helper       " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to test Docker availability
function Test-DockerRunning {
    try {
        $null = docker info 2>&1
        return $true
    } catch {
        return $false
    }
}

if ($Mode -eq "docker") {
    Write-Host "[1/3] Checking Docker status..." -ForegroundColor Yellow
    if (-not (Test-DockerRunning)) {
        Write-Host "X Error: Docker Desktop is not running!" -ForegroundColor Red
        Write-Host "  Please start Docker Desktop and run this script again," -ForegroundColor White
        Write-Host "  or run locally: .\start.bat -Mode local" -ForegroundColor White
        exit 1
    }

    Write-Host "[2/3] Starting containers with Docker Compose..." -ForegroundColor Yellow
    Set-Location $ProjectRoot
    docker compose up --build -d

    Write-Host "[3/3] Initializing & seeding database..." -ForegroundColor Yellow
    docker compose exec backend python -m app.db.seed

    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   Builder CRM is running via Docker!   " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Frontend: http://localhost:5173" -ForegroundColor White
    Write-Host " Backend:  http://localhost:8000" -ForegroundColor White
    Write-Host " API Docs: http://localhost:8000/docs" -ForegroundColor White
    Write-Host ""
    Write-Host " Default Credentials:" -ForegroundColor Yellow
    Write-Host "   Username: admin" -ForegroundColor White
    Write-Host "   Password: admin" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Green
}
elseif ($Mode -eq "local") {
    Write-Host "[1/4] Checking Database services..." -ForegroundColor Yellow
    if (Test-DockerRunning) {
        Write-Host "Starting Postgres & Redis containers..." -ForegroundColor Gray
        Set-Location $ProjectRoot
        docker compose up postgres redis -d
        Start-Sleep -Seconds 3
    } else {
        Write-Host "Note: Docker is not running. Make sure PostgreSQL (port 15432 or 5432) and Redis (port 16379 or 6379) are running locally." -ForegroundColor Yellow
    }

    # Setup Backend
    Write-Host "[2/4] Setting up Backend..." -ForegroundColor Yellow
    $BackendDir = Join-Path $ProjectRoot "backend"
    Set-Location $BackendDir

    $VenvPath = Join-Path $BackendDir "venv"
    if (-not (Test-Path $VenvPath)) {
        Write-Host "Creating Python virtual environment..." -ForegroundColor Gray
        python -m venv venv
    }

    $VenvPython = Join-Path $VenvPath "Scripts\python.exe"
    $VenvPip = Join-Path $VenvPath "Scripts\pip.exe"
    $VenvUvicorn = Join-Path $VenvPath "Scripts\uvicorn.exe"

    Write-Host "Installing backend dependencies..." -ForegroundColor Gray
    & $VenvPip install -r requirements.txt --quiet

    Write-Host "Seeding database..." -ForegroundColor Gray
    $env:DATABASE_URL = "postgresql+asyncpg://postgres:postgres@localhost:15432/buildercrm"
    $env:REDIS_URL = "redis://localhost:16379/0"
    $env:SECRET_KEY = "dev-secret-key-change-in-production"

    try {
        & $VenvPython -m app.db.seed
    } catch {
        Write-Host "Database seed notice: Ensure PostgreSQL is reachable at localhost:15432." -ForegroundColor Yellow
    }

    Write-Host "Launching Backend server in a new window..." -ForegroundColor Gray
    $BackendCommand = "`$env:DATABASE_URL='$env:DATABASE_URL'; `$env:REDIS_URL='$env:REDIS_URL'; `$env:SECRET_KEY='$env:SECRET_KEY'; cd '$BackendDir'; & '$VenvUvicorn' app.main:app --host 0.0.0.0 --port 8000 --reload"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $BackendCommand

    # Setup Frontend
    Write-Host "[3/4] Setting up Frontend..." -ForegroundColor Yellow
    $FrontendDir = Join-Path $ProjectRoot "frontend"
    Set-Location $FrontendDir

    $NodeModules = Join-Path $FrontendDir "node_modules"
    if (-not (Test-Path $NodeModules)) {
        Write-Host "Installing frontend dependencies..." -ForegroundColor Gray
        npm install
    }

    Write-Host "Launching Frontend dev server in a new window..." -ForegroundColor Gray
    $FrontendCommand = "cd '$FrontendDir'; npm run dev"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", $FrontendCommand

    Set-Location $ProjectRoot
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Builder CRM processes started locally! " -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host " Frontend: http://localhost:5173" -ForegroundColor White
    Write-Host " Backend:  http://localhost:8000" -ForegroundColor White
    Write-Host " API Docs: http://localhost:8000/docs" -ForegroundColor White
    Write-Host ""
    Write-Host " Default Credentials:" -ForegroundColor Yellow
    Write-Host "   Username: admin" -ForegroundColor White
    Write-Host "   Password: admin" -ForegroundColor White
    Write-Host "========================================" -ForegroundColor Green
}
