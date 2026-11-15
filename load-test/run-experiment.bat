@echo off
setlocal enabledelayedexpansion
title SHOWBEE - Research Experiment Selector
echo ======================================================================
echo   SHOWBEE - Research Experiment Runner (4 Configurations)
echo ======================================================================
echo.
echo Choose an experimental configuration to run:
echo.
echo   [1] EXP-001: Modular Monolith   + Optimistic Locking (OCC)
echo   [2] EXP-002: Modular Monolith   + Pessimistic Locking (PCC)  [Default Monolith]
echo   [3] EXP-003: Booking Microservice + Optimistic Locking (OCC)
echo   [4] EXP-004: Booking Microservice + Pessimistic Locking (PCC) [Default Microservice]
echo   [5] LIVE-DEMO: Automatic 20s Staircase (10 to 5000 VUs) Monolith
echo   [6] LIVE-DEMO: Automatic 20s Staircase (10 to 5000 VUs) Microservice
echo   [7] RUN ALL 4 EXPERIMENTS: Automated Matrix (24 Runs)
echo.
set /p choice="Enter choice [1-7]: "

cd /d "%~dp0.."

if "%choice%"=="1" (
    set TARGET_URL=http://localhost:5001
    set LOCK_MODE=OPTIMISTIC
    "load-test\bin\k6.exe" run load-test\k6\scenario-c-hotspot.js
) else if "%choice%"=="2" (
    set TARGET_URL=http://localhost:5001
    set LOCK_MODE=PESSIMISTIC
    "load-test\bin\k6.exe" run load-test\k6\scenario-c-hotspot.js
) else if "%choice%"=="3" (
    set TARGET_URL=http://localhost:5002
    set LOCK_MODE=OPTIMISTIC
    "load-test\bin\k6.exe" run load-test\k6\scenario-c-hotspot.js
) else if "%choice%"=="4" (
    set TARGET_URL=http://localhost:5002
    set LOCK_MODE=PESSIMISTIC
    "load-test\bin\k6.exe" run load-test\k6\scenario-c-hotspot.js
) else if "%choice%"=="5" (
    set TARGET_URL=http://localhost:5001
    set LOCK_MODE=HEAD_TO_HEAD
    "load-test\bin\k6.exe" run load-test\k6\live-demo-load.js
) else if "%choice%"=="6" (
    set TARGET_URL=http://localhost:5002
    set LOCK_MODE=HEAD_TO_HEAD
    "load-test\bin\k6.exe" run load-test\k6\live-demo-load.js
) else if "%choice%"=="7" (
    cd backend && npm run run-exp4
) else (
    echo Invalid choice.
)

pause
