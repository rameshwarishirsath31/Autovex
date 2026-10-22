#!/bin/bash
echo "================================================================="
echo "  AUTOVEX - Automotive Vehicle Health & EXpert Intelligence"
echo "  Starting Services (PostgreSQL + Backend + Frontend)"
echo "================================================================="

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$ROOT_DIR"

# 1. Database Check (Docker or Local)
if command -v docker &> /dev/null && docker info &> /dev/null; then
    echo "[1/3] Starting PostgreSQL with Docker Compose..."
    docker-compose up -d
else
    echo "[1/3] Docker not running or not found. Assuming local PostgreSQL on port 5432..."
fi

# 2. Start Backend in background
echo "[2/3] Starting FastAPI Backend on http://localhost:8000 ..."
cd "$ROOT_DIR/backend"
if [ -f ".venv/bin/activate" ]; then
    source .venv/bin/activate
fi
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# 3. Start Frontend in background
echo "[3/3] Starting React (Vite) Frontend on http://localhost:5173 ..."
cd "$ROOT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "================================================================="
echo "  AUTOVEX Services Launched!"
echo "  Frontend:  http://localhost:5173"
echo "  API Docs:  http://localhost:8000/docs"
echo "  Health:    http://localhost:8000/health"
echo "  Press Ctrl+C to terminate all services."
echo "================================================================="

trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM
wait
