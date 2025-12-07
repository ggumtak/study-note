@echo off
chcp 65001 > nul
title 스터디 노트 APK 빌드

echo ╔══════════════════════════════════════════╗
echo ║      스터디 노트 APK 빌드 스크립트       ║
echo ╚══════════════════════════════════════════╝
echo.

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo https://nodejs.org 에서 Node.js를 설치해주세요.
    pause
    exit /b 1
)

:: Check if Bubblewrap is installed
where bubblewrap >nul 2>&1
if %errorlevel% neq 0 (
    echo [설치] Bubblewrap 설치 중...
    call npm install -g @anthropic/bubblewrap-cli
    if %errorlevel% neq 0 (
        echo [오류] Bubblewrap 설치 실패
        pause
        exit /b 1
    )
)

:: Check if Android SDK/JDK is available
if not defined ANDROID_HOME (
    echo [경고] ANDROID_HOME 환경변수가 설정되지 않았습니다.
    echo Android Studio가 설치되어 있어야 APK 빌드가 가능합니다.
)

cd /d "%~dp0"

:: Check for twa-manifest.json
if not exist twa-manifest.json (
    echo [초기화] TWA 프로젝트 초기화 중...
    call bubblewrap init --manifest https://localhost:8080/manifest.json
)

echo.
echo [빌드] APK 빌드 시작...
call bubblewrap build

if %errorlevel% equ 0 (
    echo.
    echo ╔══════════════════════════════════════════╗
    echo ║         빌드 성공!                       ║
    echo ║  app-release-signed.apk 파일 확인       ║
    echo ╚══════════════════════════════════════════╝
    
    if exist app-release-signed.apk (
        :: Move to output folder
        if not exist output mkdir output
        copy /Y app-release-signed.apk "output\StudyNote_%date:~0,4%%date:~5,2%%date:~8,2%.apk"
        echo.
        echo [완료] output 폴더에 APK가 저장되었습니다.
    )
) else (
    echo.
    echo [오류] 빌드에 실패했습니다.
    echo Bubblewrap 설정을 확인해주세요.
)

echo.
pause
