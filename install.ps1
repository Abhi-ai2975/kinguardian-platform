# KinGuardian - One-Click PowerShell Installation Script
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "   KinGuardian - One-Click Project Installation Script   " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $rootDir

# Helper to refresh PATH in current PowerShell session
function Refresh-EnvPath {
    $machinePath = [System.Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
    $env:PATH = "$machinePath;$userPath"
}

# 1. Backend Python Setup
Write-Host "[1/2] Checking Python installation..." -ForegroundColor Yellow

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
$isWindowsStoreShim = $false
if ($pythonCmd -and $pythonCmd.Source -like "*WindowsApps*") {
    # Check if this is the 0-byte Windows Store shim
    try {
        $testOut = & python --version 2>&1
        if ($LASTEXITCODE -ne 0 -or "$testOut" -like "*Python was not found*") {
            $isWindowsStoreShim = $true
        }
    } catch {
        $isWindowsStoreShim = $true
    }
}

if (-not $pythonCmd -or $isWindowsStoreShim) {
    Write-Host "[!] Python is not installed on this system." -ForegroundColor Yellow
    Write-Host "    Installing Python 3.12 automatically via Windows winget..." -ForegroundColor Cyan
    
    $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCmd) {
        & winget install Python.Python.3.12 -e --accept-package-agreements --accept-source-agreements
        Refresh-EnvPath
        $pythonCmd = Get-Command python -ErrorAction SilentlyContinue
    } else {
        Write-Host "[ERROR] winget not available. Please install Python manually from https://www.python.org/downloads/ and check 'Add Python to PATH'." -ForegroundColor Red
    }
}

$backendDir = Join-Path $rootDir "kinguardian-backend"
Set-Location $backendDir

if ($pythonCmd -and (-not $isWindowsStoreShim)) {
    Write-Host "[OK] Using Python: $($pythonCmd.Source)" -ForegroundColor Green
    
    $venvPath = Join-Path $backendDir ".venv"
    if (-not (Test-Path (Join-Path $venvPath "Scripts\python.exe"))) {
        Write-Host "Creating fresh virtual environment in kinguardian-backend\.venv..." -ForegroundColor Cyan
        & python -m venv .venv
    }
    
    $venvPip = Join-Path $venvPath "Scripts\pip.exe"
    if (Test-Path $venvPip) {
        Write-Host "Installing backend packages via requirements.txt..." -ForegroundColor Cyan
        & $venvPip install --upgrade pip
        & $venvPip install -r requirements.txt
        Write-Host "[OK] Backend dependencies installed!" -ForegroundColor Green
    } else {
        & python -m pip install -r requirements.txt
    }
} else {
    Write-Host "[WARNING] Please restart PowerShell after Python installation completes and run .\install.ps1 again." -ForegroundColor Yellow
}

# 2. Mobile Node.js / React Native Setup
Write-Host ""
Write-Host "[2/2] Checking Node.js installation..." -ForegroundColor Yellow
$mobileDir = Join-Path $rootDir "kinguardian-mobile"
Set-Location $mobileDir

$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Host "[!] Node.js is not installed on this system." -ForegroundColor Yellow
    Write-Host "    Installing Node.js (LTS) automatically via Windows winget..." -ForegroundColor Cyan
    
    $wingetCmd = Get-Command winget -ErrorAction SilentlyContinue
    if ($wingetCmd) {
        & winget install OpenJS.NodeJS -e --accept-package-agreements --accept-source-agreements
        Refresh-EnvPath
        $npmCmd = Get-Command npm -ErrorAction SilentlyContinue
    } else {
        Write-Host "[ERROR] Please install Node.js manually from https://nodejs.org/" -ForegroundColor Red
    }
}

if ($npmCmd) {
    Write-Host "[OK] Using npm: $($npmCmd.Source)" -ForegroundColor Green
    Write-Host "Installing mobile dependencies (npm install)..." -ForegroundColor Cyan
    & npm install --legacy-peer-deps
    Write-Host "[OK] Mobile dependencies installed!" -ForegroundColor Green
} else {
    Write-Host "[NOTE] If Node.js was just installed, please reopen your terminal so the new PATH takes effect, then run: cd kinguardian-mobile; npm install --legacy-peer-deps" -ForegroundColor Yellow
}

Set-Location $rootDir
Write-Host ""
Write-Host "========================================================" -ForegroundColor Green
Write-Host "   Setup Finished!                                      " -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green
Write-Host ""
Write-Host "To run the Backend:" -ForegroundColor Cyan
Write-Host "   cd kinguardian-backend" -ForegroundColor White
Write-Host "   .\.venv\Scripts\Activate.ps1" -ForegroundColor White
Write-Host "   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload" -ForegroundColor White
Write-Host ""
Write-Host "To run the Mobile App:" -ForegroundColor Cyan
Write-Host "   cd kinguardian-mobile" -ForegroundColor White
Write-Host "   npx expo start" -ForegroundColor White
Write-Host ""
