@echo off
setlocal enabledelayedexpansion
title SHOWBEE - Live Microservice Load Incrementation
echo ======================================================================
echo   SHOWBEE - Live Automatic Microservice Load Incrementation
echo ======================================================================
echo.
echo Target Architecture: Booking Microservice (http://localhost:5002)
echo Concurrency Mode:    PESSIMISTIC Locking (SELECT FOR UPDATE)
echo Grafana Dashboard:   http://localhost:3001/d/showbee-scalability-health
echo Prometheus Scrape:   5 seconds
echo.
echo Load Profile: Staircase 0 - 10 - 25 - 50 - 100 - 250 - 500 - 750 - 1000 - 1500 - 2000 - 3000 - 4000 - 5000 VUs
echo Step Timing:  5s ramp + 15s hold = 20s per step
echo.
echo ======================================================================
echo Watch the VU count, RPS, and latency climb in real-time in Grafana!
echo ======================================================================
echo.

cd /d "%~dp0.."

set TARGET_URL=http://localhost:5002
set LOCK_MODE=PESSIMISTIC

echo [1/2] Verifying Microservice Health...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5002/api/shows/002683a4-b644-40d6-88df-648407405cf5/seats' -TimeoutSec 3 -UseBasicParsing; Write-Host 'Microservice is ONLINE' -ForegroundColor Green } catch { Write-Host 'Microservice on 5002 is unreachable! Please run start-all.bat first.' -ForegroundColor Yellow }"

echo [2/2] Launching K6 Live Demo Load Profile...
echo.
"load-test\bin\k6.exe" run load-test\k6\live-demo-load.js

echo.
echo ======================================================================
echo Microservice demonstration load completed!
echo Review your metrics in Grafana at http://localhost:3001
echo ======================================================================
pause
