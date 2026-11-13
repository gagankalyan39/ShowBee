Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SHOWBEE - Movie Ticket Platform & Concurrency Lab" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

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
        Write-Host "[INFO] Waiting 8 seconds for Docker daemon initialization..." -ForegroundColor Yellow
        Start-Sleep -Seconds 8
    }
    Write-Host "[INFO] Running 'docker compose up -d prometheus grafana'..." -ForegroundColor Green
    docker compose up -d prometheus grafana 2>$null
    if ($LASTEXITCODE -ne 0) {
        docker-compose up -d prometheus grafana 2>$null
    }
    Write-Host "[OK] Prometheus (port 9090) and Grafana (port 3001) triggered." -ForegroundColor Green
} else {
    Write-Warning "Docker executable not detected in PATH. Install Docker Desktop to run Grafana automatically."
}
Write-Host ""

Write-Host "[2/4] Starting Monolith Backend on http://localhost:5001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$env:PORT='5001'; $env:ARCHITECTURE_LABEL='monolith'; Set-Location '$PSScriptRoot\backend'; npm run dev"

Write-Host "[3/4] Starting Booking Microservice on http://localhost:5002..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$env:PORT='5002'; $env:ARCHITECTURE_LABEL='microservice'; Set-Location '$PSScriptRoot\booking-service'; npm run dev"

Write-Host "[4/4] Starting Frontend UI on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "All ShowBee Services Running:" -ForegroundColor Magenta
Write-Host " - Frontend:             http://localhost:3000" -ForegroundColor Cyan
Write-Host " - Monolith Backend:     http://localhost:5001 (/metrics)" -ForegroundColor Cyan
Write-Host " - Booking Microservice: http://localhost:5002 (/metrics)" -ForegroundColor Cyan
Write-Host " - Prometheus Server:    http://localhost:9090" -ForegroundColor Cyan
Write-Host " - Grafana Dashboard:    http://localhost:3001 (auto-provisioned)" -ForegroundColor Cyan
Write-Host ""
Write-Host "Opening ShowBee and Grafana in your browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"
Start-Process "http://localhost:3001"
