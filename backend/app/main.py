from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base, get_db
from app.routers import auth, vehicles, obd, predictions, reminders, reports
from app.services.ml_service import ml_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure database tables are created
    try:
        Base.metadata.create_all(bind=engine)
        print("Database tables initialized successfully.")
    except Exception as e:
        print(f"Warning: Table creation error ({e}).")

    # Load ML models if available
    try:
        ml_service.reload()
    except Exception as e:
        print(f"Warning: ML service reload note: {e}")

    yield

    # Shutdown logic if any
    print("AUTOVEX Backend shutting down.")

app = FastAPI(
    title="AUTOVEX API",
    description="Automotive Vehicle Health & EXpert Intelligence - AI-based Predictive Maintenance System",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount Routers
app.include_router(auth.router)
app.include_router(vehicles.router)
app.include_router(obd.router)
app.include_router(predictions.router)
app.include_router(reminders.router)
app.include_router(reports.router)

@app.get("/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "ok",
        "database": db_status,
        "environment": settings.ENVIRONMENT,
        "models_loaded": ml_service.classifier is not None
    }

@app.get("/", tags=["Root"])
def root():
    return {
        "project": "AUTOVEX",
        "name": "Automotive Vehicle Health & EXpert Intelligence",
        "version": "1.0.0",
        "status": "operational",
        "docs_url": "/docs",
        "health_check": "/health"
    }
