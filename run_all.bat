@echo off
echo =================================================================
echo   AUTOVEX - Automotive Vehicle Health & EXpert Intelligence
echo   Starting Services (PostgreSQL + Backend + Frontend)
echo =================================================================

cd /d "%~dp0"

:: 1. Database Check (Docker or Local)
docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [1/3] Starting PostgreSQL with Docker Compose...
    docker-compose up -d
) else (
    echo [1/3] Docker not running or not found. Using local PostgreSQL service on port 5432...
)

:: 2. Start Backend
echo [2/3] Starting FastAPI Backend on http://localhost:8000 ...
start "AUTOVEX Backend (FastAPI)" cmd /k "cd /d %~dp0backend && if exist .venv\Scripts\activate.bat (call .venv\Scripts\activate.bat) && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

:: 3. Start Frontend
echo [3/3] Starting React (Vite) Frontend on http://localhost:5173 ...
start "AUTOVEX Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo =================================================================
echo   AUTOVEX Services Launched!
echo   Frontend:  http://localhost:5173
echo   API Docs:  http://localhost:8000/docs
echo   Health:    http://localhost:8000/health
echo =================================================================
pause
