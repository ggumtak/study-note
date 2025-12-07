@echo off
title Clear Cache
echo ========================================
echo   Service Worker Cache Clearer
echo ========================================
echo.
echo Opening browser to clear all caches...
echo.

:: Create a temporary HTML file to clear caches
echo ^<!DOCTYPE html^>^<html^>^<head^>^<title^>Clearing Cache...^</title^>^</head^>^<body style="background:#1b1b1f;color:#e3e3e3;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;"^>^<div id="msg"^>Clearing caches...^</div^>^<script^>async function clearAll(){try{const regs=await navigator.serviceWorker.getRegistrations();for(const r of regs){await r.unregister();}const keys=await caches.keys();for(const k of keys){await caches.delete(k);}document.getElementById('msg').innerHTML='✅ Cache cleared! Redirecting...';setTimeout(()=^>location.href='http://localhost:8080',1500);}catch(e){document.getElementById('msg').innerHTML='❌ Error: '+e.message;}}clearAll();^</script^>^</body^>^</html^> > "%TEMP%\clear_cache.html"

:: Open the cache clearer page
start "" "%TEMP%\clear_cache.html"

echo Done! The browser will clear caches and redirect to the app.
timeout /t 3 /nobreak >nul
