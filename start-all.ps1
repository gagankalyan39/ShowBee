Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  SHOWBEE - Full-Stack Movie Ticket Booking Platform" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/2] Starting Backend API on http://localhost:5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\backend'; npm run dev"

Write-Host "[2/2] Starting Frontend UI on http://localhost:3000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$PSScriptRoot\frontend'; npm run dev"

Write-Host ""
Write-Host "Both servers are starting in separate windows." -ForegroundColor Magenta
Write-Host "Opening http://localhost:3000 in your browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 4
Start-Process "http://localhost:3000"
