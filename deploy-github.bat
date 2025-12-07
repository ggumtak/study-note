@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   GitHub에 Study Note 배포하기
echo ========================================
echo.

cd /d "c:\Users\percy\Desktop\새 폴더 (2)\markdown-study-helper"

echo [1/5] Git 초기화...
git init

echo.
echo [2/5] 모든 파일 추가...
git add .

echo.
echo [3/5] 커밋 생성...
git commit -m "Initial commit - Study Note App"

echo.
echo [4/5] 브랜치 이름 설정...
git branch -M main

echo.
echo [5/5] GitHub에 Push...
git remote add origin https://github.com/ggumtak/study-note.git
git push -u origin main

echo.
echo ========================================
echo   완료!
echo ========================================
echo.
echo   GitHub Pages 설정하러 가세요:
echo   https://github.com/ggumtak/study-note/settings/pages
echo.
echo   Source: Deploy from a branch
echo   Branch: main / (root)
echo   Save 클릭!
echo.
echo   1-2분 후 접속 가능:
echo   https://ggumtak.github.io/study-note/
echo.
pause
