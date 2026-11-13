Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SHOWBEE - Movie Ticket Platform and Concurrency Lab" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot

Write-Host "[1/4] Starting Prometheus & Grafana Monitoring Stack..." -ForegroundColor Green
if (Get-Command docker -ErrorAction SilentlyContinue) {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[INFO] Starting Docker Desktop..." -ForegroundColor Yellow
        $paths = @(
            "$env:LOCALAPPDATA\Programs\DockerDesktop\Docker Desktop.exe",
            "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        )
        foreach ($p in $paths) {
            if (Test-Path $p) {
                Start-Process $p
                break
            }
        }
        Write-Host "[INFO] Waiting for Docker daemon to initialize..." -ForegroundColor Yellow
        Start-Sleep -Seconds 6
    }
    Write-Host "[INFO] Starting Prometheus and Grafana containers..." -ForegroundColor Green
    docker compose up -d prometheus grafana 2>$null
    if ($LASTEXITCODE -ne 0) {
        docker-compose up -d prometheus grafana 2>$null
    }
    Write-Host "[OK] Prometheus on port 9090 and Grafana on port 3001 triggered." -ForegroundColor Green
} else {
    Write-Warning "Docker is not found in PATH. Install Docker Desktop to use Grafana."
}
Write-Host ""

Write-Host "[2/4] Starting Monolith Backend on http://localhost:5001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$env:PORT='5001'; $env:ARCHITECTURE_LABEL='monolith'; Set-Location '$PSScriptRoot\backend'; npm run dev"

Write-Host "[3/4] Starting Booking Microservice on http://localhost:5002..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$env:PORT='5002'; $env:ARCHITECTURE_LABEL='microservice'; Set-Location '$PSScriptRoot\booking-service'; npm run dev"

Write-Host "[4/4] Starting Frontend Web UI on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host "All ShowBee Services Launched:" -ForegroundColor Magenta
Write-Host " - Frontend Web UI:        http://localhost:3000" -ForegroundColor Cyan
Write-Host " - Monolith Backend:       http://localhost:5001" -ForegroundColor Cyan
Write-Host " - Booking Microservice:   http://localhost:5002" -ForegroundColor Cyan
Write-Host " - Prometheus Server:      http://localhost:9090" -ForegroundColor Cyan
Write-Host " - Grafana Live Dashboard: http://localhost:3001" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening ShowBee in your default browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 3
try {
    Start-Process "explorer.exe" "http://localhost:3000"
    Start-Process "explorer.exe" "http://localhost:3001"
} catch {
    # Non-fatal if browser cannot be launched in headless environments
}
