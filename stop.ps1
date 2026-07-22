# Builder CRM Stop Script for Windows (PowerShell)
$ErrorActionPreference = "Continue"
$ProjectRoot = $PSScriptRoot

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "        Builder CRM Stop Helper        " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Stop Docker Compose services if Docker is running
try {
    $dockerCheck = docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[1/2] Stopping Docker containers..." -ForegroundColor Yellow
        Set-Location $ProjectRoot
        docker compose down
        Write-Host "  Docker containers stopped." -ForegroundColor Green
    } else {
        Write-Host "[1/2] Docker is not active; skipping container shutdown." -ForegroundColor Gray
    }
} catch {
    Write-Host "[1/2] Docker CLI not active; skipping container shutdown." -ForegroundColor Gray
}

# 2. Stop local node (Vite) and python (Uvicorn) backend processes if running
Write-Host "[2/2] Checking for local dev server processes..." -ForegroundColor Yellow

$StoppedCount = 0

# Kill python processes running app.main:app or running from backend\venv
$BackendProcs = Get-CimInstance Win32_Process | Where-Object { 
    $_.CommandLine -like "*app.main:app*" -or $_.CommandLine -like "*app.db.seed*" -or ($_.CommandLine -like "*python*" -and $_.CommandLine -like "*Builder\backend*")
}

foreach ($proc in $BackendProcs) {
    try {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped Backend process (PID: $($proc.ProcessId))" -ForegroundColor Gray
        $StoppedCount++
    } catch {}
}

# Kill node/vite processes running from Builder\frontend
$FrontendProcs = Get-CimInstance Win32_Process | Where-Object {
    ($_.CommandLine -like "*vite*" -or $_.CommandLine -like "*node*") -and $_.CommandLine -like "*Builder\frontend*"
}

foreach ($proc in $FrontendProcs) {
    try {
        Stop-Process -Id $proc.ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "  Stopped Frontend process (PID: $($proc.ProcessId))" -ForegroundColor Gray
        $StoppedCount++
    } catch {}
}

if ($StoppedCount -eq 0) {
    Write-Host "  No background Backend or Frontend local processes found." -ForegroundColor Gray
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "   Builder CRM services are stopped!    " -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
