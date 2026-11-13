@echo off
setlocal enabledelayedexpansion
title ShowBee Launcher
echo ========================================================
echo   SHOWBEE - Movie Ticket Platform and Concurrency Lab
echo ========================================================
echo.

cd /d "%~dp0"

echo [1/4] Starting Prometheus and Grafana Monitoring Stack...
where docker >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    docker info >nul 2>&1
    if !ERRORLEVEL! NEQ 0 (
        echo [INFO] Docker daemon is not active. Launching Docker Desktop...
        if exist "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe" (
            start "" "%LOCALAPPDATA%\Programs\DockerDesktop\Docker Desktop.exe"
        ) else if exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" (
            start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
        )
        echo [INFO] Waiting for Docker daemon to initialize...
        ping 127.0.0.1 -n 8 >nul
    )
    echo [INFO] Starting Prometheus and Grafana containers...
    docker compose up -d prometheus grafana 2>nul || docker-compose up -d prometheus grafana 2>nul
    echo [OK] Prometheus on port 9090 and Grafana on port 3001 triggered.
) else (
    echo [WARN] Docker not found in PATH. Please install Docker to use Grafana.
)
echo.

echo [2/4] Starting Monolith Backend on port 5001...
start "ShowBee Monolith Backend :5001" cmd /k "cd /d "%~dp0backend" && set PORT=5001 && set ARCHITECTURE_LABEL=monolith && npm run dev"

echo [3/4] Starting Booking Microservice on port 5002...
start "ShowBee Booking Microservice :5002" cmd /k "cd /d "%~dp0booking-service" && set PORT=5002 && set ARCHITECTURE_LABEL=microservice && npm run dev"

echo [4/4] Starting Frontend Web UI on port 3000...
start "ShowBee Frontend Web :3000" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo --------------------------------------------------------
echo All ShowBee Services Launched:
echo - Frontend Web UI:        http://localhost:3000
echo - Monolith Backend:       http://localhost:5001
echo - Booking Microservice:   http://localhost:5002
echo - Prometheus Server:      http://localhost:9090
echo - Grafana Live Dashboard: http://localhost:3001
echo --------------------------------------------------------
echo.
echo Opening ShowBee in your default browser...
ping 127.0.0.1 -n 4 >nul
start "" "http://localhost:3000" 2>nul
start "" "http://localhost:3001" 2>nul
