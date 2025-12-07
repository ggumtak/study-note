@echo off
title Study Notes Server
echo ========================================
echo   Study Notes - Local Server
echo ========================================
echo.
echo Starting server at http://localhost:8080
echo.

:: Start Python server in background first
start /b python -m http.server 8080

:: Wait 2 seconds for server to initialize
echo Waiting for server to start...
timeout /t 2 /nobreak >nul

:: Then open browser
echo Opening browser...
start "" http://localhost:8080

echo.
echo ========================================
echo Server is running!
echo Press any key to STOP the server.
echo ========================================
pause >nul

:: Kill Python server when user presses key
taskkill /f /im python.exe >nul 2>&1
echo Server stopped.
