@echo off
title ORBIT - Cognitive Operating System
color 0A

echo.
echo  ====================================
echo       ORBIT - Starting Services
echo  ====================================
echo.

:: Check if Docker is running
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Docker is not running. Starting without infrastructure services.
    echo [WARNING] Make sure PostgreSQL and Redis are available manually.
    echo.
) else (
    echo [1/4] Starting infrastructure services...
    docker-compose up -d
    timeout /t 3 >nul
)

:: Start Backend
echo [2/4] Starting backend server...
cd backend
if not exist venv (
    echo      Creating Python virtual environment...
    python -m venv venv
)
call venv\Scripts\activate
pip install -r requirements.txt -q
start "ORBIT Backend" cmd /k "venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"
cd ..

:: Wait for backend
echo [3/4] Waiting for backend to initialize...
timeout /t 5 >nul

:: Start Frontend
echo [4/4] Starting frontend...
cd frontend
if not exist node_modules (
    echo      Installing npm packages...
    call npm install
)
start "ORBIT Frontend" cmd /k "npm run dev"
cd ..

echo.
echo  ====================================
echo       ORBIT is now running
echo  ====================================
echo.
echo  Frontend:  http://localhost:3000
echo  Backend:   http://localhost:8000
echo  API Docs:  http://localhost:8000/docs
echo.
echo  Press any key to open the app...
pause >nul

start http://localhost:3000
