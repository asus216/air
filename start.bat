@echo off
title Diamond Airbus Server Launcher
color 0A
echo ====================================================
echo   DIAMOND AIRBUS - AUTOMATIC SERVER LAUNCHER
echo ====================================================
echo.

cd /d "%~dp0"

:: Check Python is available
python --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python is not installed or not in PATH.
    echo         Please install Python 3.x and try again.
    pause
    exit /b 1
)

:: Check if server already running on port 3000
netstat -ano | findstr ":3000 " | findstr LISTENING >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [WARN]  Port 3000 is already in use. Server may already be running.
    echo [INFO]  Opening pages in browser without starting a new server...
    timeout /t 1 /nobreak >nul
    start "" http://localhost:3000
    start "" http://localhost:3000/admin.html
    start "" http://localhost:3000/counter.html
    echo.
    echo [INFO]  Website:      http://localhost:3000
    echo [INFO]  Admin Panel:  http://localhost:3000/admin.html
    echo [INFO]  Staff POS:    http://localhost:3000/counter.html
    echo.
    pause
    exit /b 0
)

echo [INFO]  Starting Diamond Airbus Web Server on port 3000...
echo [INFO]  Opening Website, Admin Portal and Staff Counter POS...
echo [INFO]  Keep this window open while using the site.
echo.
echo [INFO]  Website:      http://localhost:3000
echo [INFO]  Admin Panel:  http://localhost:3000/admin.html
echo [INFO]  Staff POS:    http://localhost:3000/counter.html
echo.
echo ====================================================

python server.py

echo.
echo [INFO]  Server has stopped.
pause
