@echo off
chcp 65001 >nul
cd /d "%~dp0"

if not exist .git (
  echo Initializing git repo...
  git init
)

git add .
git status
echo.
set /p commit_msg="Commit message [default: Initial commit: TOEFL Speaking Practice]: "
if "%commit_msg%"=="" set commit_msg=Initial commit: TOEFL Speaking Practice
git commit -m "%commit_msg%"

echo.
echo Next: create a new repo on GitHub (e.g. toefl-speaking-practice), then run:
echo   git remote add origin https://github.com/YOUR_USERNAME/toefl-speaking-practice.git
echo   git branch -M main
echo   git push -u origin main
echo.
set /p remote="Paste your repo URL (or press Enter to skip): "
if not "%remote%"=="" (
  git remote remove origin 2>nul
  git remote add origin "%remote%"
  git branch -M main
  git push -u origin main
)
pause
