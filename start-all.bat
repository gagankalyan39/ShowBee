@echo off
title ShowBee Launcher
echo ========================================================
echo   SHOWBEE - Movie Ticket Platform ^& Concurrency Lab
echo ========================================================
echo.
echo [1/3] Starting Monolith Backend (Express on port 5001)...
start "ShowBee Monolith Backend :5001" cmd /k "cd /d "%~dp0backend" && set PORT=5001 && set ARCHITECTURE_LABEL=monolith && npm run dev"

echo [2/3] Starting Booking Microservice (Express on port 5002)...
start "ShowBee Booking Microservice :5002" cmd /k "cd /d "%~dp0booking-service" && set PORT=5002 && set ARCHITECTURE_LABEL=microservice && npm run dev"

echo [3/3] Starting Frontend UI (Next.js on port 3000)...
start "ShowBee Frontend Web :3000" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo --------------------------------------------------------
echo Services running in dedicated terminal windows:
echo - Frontend:             http://localhost:3000
echo - Monolith Backend:     http://localhost:5001 (metrics at /metrics)
echo - Booking Microservice: http://localhost:5002 (metrics at /metrics)
echo - Prometheus:           http://localhost:9090 (if using docker-compose)
echo - Grafana Dashboard:    http://localhost:3001 (if using docker-compose)
echo --------------------------------------------------------
echo.
echo Opening ShowBee in your browser in 5 seconds...
timeout /t 5 >nul
start http://localhost:3000
