@echo off
setlocal enabledelayedexpansion
title SHOWBEE - Live Optimistic CAS Load Incrementation
echo ======================================================================
echo   SHOWBEE - Live Optimistic CAS Load Incrementation
echo ======================================================================
echo.
echo Target Architecture: Modular Monolith (http://localhost:5001)
echo Concurrency Mode:    OPTIMISTIC Locking (Version-based Atomic CAS)
echo Grafana Dashboard:   http://localhost:3001/d/showbee-locking-perf
echo Prometheus Scrape:   5 seconds
echo.
echo Load Profile: Staircase 0 - 10 - 25 - 50 - 100 - 250 - 500 - 750 - 1000 - 1500 - 2000 - 3000 - 4000 - 5000 VUs
echo Step Timing:  5s ramp + 15s hold = 20s per step
echo.
echo ======================================================================
echo Watch the OPTIMISTIC CAS graph climb in real-time in Grafana!
echo ======================================================================
echo.

cd /d "%~dp0.."

set TARGET_URL=http://localhost:5001
set LOCK_MODE=OPTIMISTIC

echo [1/2] Verifying Monolith Health...
powershell -Command "try { $r = Invoke-WebRequest -Uri 'http://localhost:5001/api/shows/admin/all?limit=1' -TimeoutSec 3 -UseBasicParsing; Write-Host 'Backend is ONLINE' -ForegroundColor Green } catch { Write-Host 'Backend on 5001 is unreachable! Please run start-all.bat first.' -ForegroundColor Yellow }"

echo [2/2] Launching K6 Optimistic CAS Load Profile...
echo.
"load-test\bin\k6.exe" run load-test\k6\live-demo-load.js

echo.
echo ======================================================================
echo Optimistic load test completed!
echo Review your metrics in Grafana at http://localhost:3001/d/showbee-locking-perf
echo ======================================================================
pause
