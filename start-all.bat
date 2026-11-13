@echo off
title ShowBee Launcher
echo ========================================================
echo   SHOWBEE - Movie Ticket Platform ^& Concurrency Lab
echo ========================================================
echo.

echo [1/4] Starting Prometheus ^& Grafana Monitoring Stack...
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    docker info >nul 2>&1
    if %ERRORLEVEL% NEQ 0 (
        echo [INFO] Docker daemon is not running. Launching Docker Desktop...
        if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
            start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
        ) else if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
            start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        )
        echo [INFO] Waiting 8 seconds for Docker daemon initialization...
        timeout /t 8 >nul
    )
    echo [INFO] Running 'docker compose up -d prometheus grafana'...
    docker compose up -d prometheus grafana 2>nul || docker-compose up -d prometheus grafana 2>nul
    echo [OK] Prometheus (port 9090) and Grafana (port 3001) triggered.
) else (
    echo [WARN] Docker executable not found in PATH. Grafana requires Docker Desktop to be installed.
)
echo.

echo [2/4] Starting Monolith Backend (Express on port 5001)...
start "ShowBee Monolith Backend :5001" cmd /k "cd /d "%~dp0backend" && set PORT=5001 && set ARCHITECTURE_LABEL=monolith && npm run dev"

echo [3/4] Starting Booking Microservice (Express on port 5002)...
start "ShowBee Booking Microservice :5002" cmd /k "cd /d "%~dp0booking-service" && set PORT=5002 && set ARCHITECTURE_LABEL=microservice && npm run dev"

echo [4/4] Starting Frontend UI (Next.js on port 3000)...
start "ShowBee Frontend Web :3000" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo --------------------------------------------------------
echo All ShowBee Services Running:
echo - Frontend:             http://localhost:3000
echo - Monolith Backend:     http://localhost:5001 (metrics: /metrics)
echo - Booking Microservice: http://localhost:5002 (metrics: /metrics)
echo - Prometheus Server:    http://localhost:9090
echo - Grafana Dashboard:    http://localhost:3001 (auto-provisioned)
echo --------------------------------------------------------
echo.
echo Opening ShowBee and Grafana in your browser in 5 seconds...
timeout /t 5 >nul
start http://localhost:3000
start http://localhost:3001
