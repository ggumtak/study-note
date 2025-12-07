@echo off
chcp 65001 >nul
title Study Notes
color 0A

echo.
echo   Study Notes Server
echo   ───────────────────
echo.

:: Kill any existing server
taskkill /f /im python.exe >nul 2>&1

:: Get local IP for mobile access
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    for /f "tokens=1" %%b in ("%%a") do set LOCAL_IP=%%b
)

:: Start server on all interfaces
echo   Starting server...
start /b python -m http.server 8080 --bind 0.0.0.0 >nul 2>&1

timeout /t 2 /nobreak >nul

:: Open browser
start "" http://localhost:8080

echo.
echo   PC:     http://localhost:8080
echo   Mobile: http://%LOCAL_IP%:8080
echo.
echo   Press any key to STOP
pause >nul

taskkill /f /im python.exe >nul 2>&1
