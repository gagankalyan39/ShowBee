@echo off
title ShowBee Launcher
echo ========================================================
echo   SHOWBEE - Online Movie Ticket Booking Platform
echo ========================================================
echo.
echo [1/2] Starting Backend API (Express on port 5000)...
start "ShowBee Backend API" cmd /k "cd /d "%~dp0backend" && npm run dev"

echo [2/2] Starting Frontend UI (Next.js on port 3000)...
start "ShowBee Frontend Web" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo --------------------------------------------------------
echo Both services are starting in dedicated terminal windows!
echo - Frontend: http://localhost:3000
echo - Backend:  http://localhost:5000
echo - Database: PostgreSQL on port 5432
echo --------------------------------------------------------
echo.
echo Opening ShowBee in your browser in 5 seconds...
timeout /t 5 >nul
start http://localhost:3000
