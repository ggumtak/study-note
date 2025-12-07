@echo off
chcp 65001 >nul
echo.
echo ========================================
echo   Study Note 업데이트 Push
echo ========================================
echo.

cd /d "c:\Users\percy\Desktop\새 폴더 (2)\markdown-study-helper"

echo [1/3] 변경된 파일 추가...
git add .

echo.
echo [2/3] 커밋 생성...
set /p msg="커밋 메시지 입력 (Enter = 'Update'): "
if "%msg%"=="" set msg=Update

git commit -m "%msg%"

echo.
echo [3/3] GitHub에 Push...
git push

echo.
echo ========================================
echo   업데이트 완료!
echo ========================================
echo   https://ggumtak.github.io/study-note/
echo.
pause
