@echo off
title Clear Cache + Start
echo ========================================
echo   Cache Clear + Fresh Start
echo ========================================
echo.

:: Kill any existing Python servers first
taskkill /f /im python.exe >nul 2>&1

echo [1/3] Starting fresh server...
start /b python -m http.server 8080

echo [2/3] Waiting for server...
timeout /t 2 /nobreak >nul

echo [3/3] Opening app (will auto-clear cache)...
start "" "http://localhost:8080?nocache=%random%"

echo.
echo ========================================
echo Server running! Press any key to STOP.
echo ========================================
pause >nul

taskkill /f /im python.exe >nul 2>&1
echo Server stopped.
