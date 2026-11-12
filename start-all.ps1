Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SHOWBEE - Movie Ticket Platform & Concurrency Lab" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/3] Starting Monolith Backend on http://localhost:5001..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$env:PORT='5001'; $env:ARCHITECTURE_LABEL='monolith'; Set-Location '$PSScriptRoot\backend'; npm run dev"

Write-Host "[2/3] Starting Booking Microservice on http://localhost:5002..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "$env:PORT='5002'; $env:ARCHITECTURE_LABEL='microservice'; Set-Location '$PSScriptRoot\booking-service'; npm run dev"

Write-Host "[3/3] Starting Frontend UI on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "All 3 services are starting in separate windows:" -ForegroundColor Magenta
Write-Host " - Frontend:             http://localhost:3000" -ForegroundColor Cyan
Write-Host " - Monolith Backend:     http://localhost:5001 (/metrics)" -ForegroundColor Cyan
Write-Host " - Booking Microservice: http://localhost:5002 (/metrics)" -ForegroundColor Cyan
Write-Host " - Prometheus & Grafana: Run 'docker-compose up -d prometheus grafana'" -ForegroundColor Yellow
Write-Host "Opening http://localhost:3000 in your browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"
