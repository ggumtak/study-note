@echo off
title Study Notes Server
echo ========================================
echo   Study Notes - Local Server
echo ========================================
echo.
echo Starting server at http://localhost:8080
echo Press Ctrl+C to stop the server
echo.

:: Open browser after 1 second delay
start "" timeout /t 1 /nobreak >nul & start http://localhost:8080

:: Start Python HTTP server
python -m http.server 8080

pause
