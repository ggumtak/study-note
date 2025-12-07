@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Study Notes Server
color 0A

echo.
echo   Study Notes Server
echo   ───────────────────
echo.

:: Kill any existing Python servers
taskkill /f /im python.exe >nul 2>&1
taskkill /f /im pythonw.exe >nul 2>&1

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do set LOCAL_IP=%%b
)

:: Start server
echo   Starting...
start /b python -m http.server 8080 --bind 0.0.0.0

timeout /t 2 /nobreak >nul

start "" http://localhost:8080

echo.
echo   PC:     http://localhost:8080
echo   Mobile: http://%LOCAL_IP%:8080
echo.
echo   ───────────────────────────────────
echo   Press any key to STOP server
echo   ───────────────────────────────────
pause >nul

taskkill /f /im python.exe >nul 2>&1
echo   Stopped!
timeout /t 1 >nul
