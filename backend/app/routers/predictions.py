from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.services.ml_service import ml_service
from app.services.health_score import calculate_vehicle_health_score

router = APIRouter(prefix="/predictions", tags=["Predictions & ML"])

@router.post("/{vehicle_id}/run", response_model=schemas.VehiclePredictionSummary)
def run_prediction(
    vehicle_id: int,
    db: Session = Depends(get_db)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    predictions_data = ml_service.run_vehicle_predictions(db, vehicle_id)
    health_info = calculate_vehicle_health_score(db, vehicle_id)

    critical_count = sum(1 for p in predictions_data if p["risk_level"] == "Critical" or p["recommendation"] == "Replace")
    service_count = sum(1 for p in predictions_data if p["recommendation"] in ["Service", "Replace"])

    overall_risk = "Low"
    if health_info["health_score"] < 50 or critical_count > 0:
        overall_risk = "Critical"
    elif health_info["health_score"] < 70 or service_count > 1:
        overall_risk = "High"
    elif health_info["health_score"] < 85:
        overall_risk = "Medium"

    return {
        "vehicle_id": vehicle_id,
        "overall_health_score": health_info["health_score"],
        "overall_risk_level": overall_risk,
        "critical_components_count": critical_count,
        "service_required_count": service_count,
        "predictions": predictions_data,
        "predicted_at": datetime.utcnow()
    }

@router.get("/{vehicle_id}/latest", response_model=schemas.VehiclePredictionSummary)
def get_latest_predictions(
    vehicle_id: int,
    db: Session = Depends(get_db)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    db_preds = (
        db.query(models.Prediction)
        .filter(models.Prediction.vehicle_id == vehicle_id)
        .all()
    )

    if not db_preds:
        # Run on demand if never predicted
        return run_prediction(vehicle_id, db)

    predictions_data = []
    for pred in db_preds:
        predictions_data.append({
            "id": pred.id,
            "component_id": pred.component_id,
            "component_name": pred.component.name if pred.component else f"Component {pred.component_id}",
            "category": pred.component.category if pred.component else "General",
            "risk_score": pred.risk_score,
            "risk_level": pred.risk_level,
            "recommendation": pred.recommendation,
            "remaining_useful_life_km": pred.remaining_useful_life_km,
            "probabilities": {pred.recommendation: 0.85},
            "predicted_at": pred.predicted_at
        })

    health_info = calculate_vehicle_health_score(db, vehicle_id)
    critical_count = sum(1 for p in predictions_data if p["risk_level"] == "Critical" or p["recommendation"] == "Replace")
    service_count = sum(1 for p in predictions_data if p["recommendation"] in ["Service", "Replace"])

    overall_risk = "Low"
    if health_info["health_score"] < 50 or critical_count > 0:
        overall_risk = "Critical"
    elif health_info["health_score"] < 70 or service_count > 1:
        overall_risk = "High"
    elif health_info["health_score"] < 85:
        overall_risk = "Medium"

    latest_time = max(p["predicted_at"] for p in predictions_data) if predictions_data else datetime.utcnow()

    return {
        "vehicle_id": vehicle_id,
        "overall_health_score": health_info["health_score"],
        "overall_risk_level": overall_risk,
        "critical_components_count": critical_count,
        "service_required_count": service_count,
        "predictions": predictions_data,
        "predicted_at": latest_time
    }
