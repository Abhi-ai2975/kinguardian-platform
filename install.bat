@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo   KinGuardian - One-Click Project Installation Script
echo ========================================================
echo.

set ROOT_DIR=%~dp0
cd /d "%ROOT_DIR%"

echo [1/3] Checking Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Python is not installed. Attempting to install Python 3.12 via winget...
    where winget >nul 2>&1
    if %errorlevel% equ 0 (
        winget install Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
        echo Python installed. Please restart your terminal if python is not recognized yet.
    ) else (
        echo [ERROR] Please install Python 3.12 from https://www.python.org/downloads/
        echo Make sure to check "Add python.exe to PATH" during installation.
        goto check_node
    )
) else (
    echo [OK] Python is installed.
)

echo.
echo [2/3] Setting up Python virtual environment and installing backend dependencies...
cd "%ROOT_DIR%kinguardian-backend"
if not exist .venv (
    echo Creating virtual environment in kinguardian-backend\.venv...
    python -m venv .venv
)

if exist .venv\Scripts\activate.bat (
    call .venv\Scripts\activate.bat
    python -m pip install --upgrade pip
    python -m pip install -r requirements.txt
    echo [OK] Backend dependencies installed successfully!
)

:check_node
echo.
echo [3/3] Checking Node.js and installing mobile dependencies...
cd "%ROOT_DIR%kinguardian-mobile"
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js is not installed. Attempting to install Node.js via winget...
    where winget >nul 2>&1
    if %errorlevel% equ 0 (
        winget install OpenJS.NodeJS -e --accept-package-agreements --accept-source-agreements
        echo Node.js installed.
    ) else (
        echo [ERROR] Please install Node.js from https://nodejs.org/
    )
) else (
    echo [OK] npm found. Installing mobile dependencies...
    call npm install --legacy-peer-deps
    echo [OK] Mobile dependencies installed successfully!
)

cd /d "%ROOT_DIR%"
echo.
echo ========================================================
echo   Installation Completed!
echo ========================================================
echo.
echo To start the Backend:
echo   cd kinguardian-backend
echo   .venv\Scripts\activate
echo   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
echo.
echo To start the Mobile App:
echo   cd kinguardian-mobile
echo   npx expo start
echo.
pause
