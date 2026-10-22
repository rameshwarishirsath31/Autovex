import io
import csv
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Response
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.services.health_score import calculate_vehicle_health_score

router = APIRouter(prefix="/reports", tags=["Reports & Export"])

@router.get("/{vehicle_id}/summary")
def get_vehicle_summary_report(
    vehicle_id: int,
    db: Session = Depends(get_db)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    health_info = calculate_vehicle_health_score(db, vehicle_id)
    service_count = db.query(models.ServiceRecord).filter(models.ServiceRecord.vehicle_id == vehicle_id).count()
    active_dtc = db.query(models.DTCCode).filter(models.DTCCode.vehicle_id == vehicle_id, models.DTCCode.cleared == False).count()
    pending_reminders = db.query(models.Reminder).filter(models.Reminder.vehicle_id == vehicle_id, models.Reminder.status == "Pending").count()

    predictions = db.query(models.Prediction).filter(models.Prediction.vehicle_id == vehicle_id).all()
    recommendation_counts = {"Monitor": 0, "Inspect": 0, "Service": 0, "Replace": 0}
    for p in predictions:
        if p.recommendation in recommendation_counts:
            recommendation_counts[p.recommendation] += 1

    return {
        "vehicle": {
            "id": vehicle.id,
            "make": vehicle.make,
            "model": vehicle.model,
            "year": vehicle.year,
            "fuel_type": vehicle.fuel_type,
            "registration_no": vehicle.registration_no,
            "odometer_km": vehicle.odometer_km,
            "usage_pattern": vehicle.usage_pattern
        },
        "health": health_info,
        "metrics": {
            "total_service_records": service_count,
            "active_dtc_count": active_dtc,
            "pending_reminders_count": pending_reminders,
            "recommendation_breakdown": recommendation_counts
        },
        "generated_at": datetime.utcnow().isoformat()
    }

@router.get("/{vehicle_id}/export-csv")
def export_vehicle_report_csv(
    vehicle_id: int,
    db: Session = Depends(get_db)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    predictions = db.query(models.Prediction).filter(models.Prediction.vehicle_id == vehicle_id).all()

    output = io.StringIO()
    writer = csv.writer(output)

    # Header
    writer.writerow([
        "Vehicle ID", "Registration No", "Make", "Model", "Odometer (km)",
        "Component Name", "Category", "Risk Score (0-100)", "Risk Level",
        "Recommendation", "Remaining Useful Life (km)", "Predicted At"
    ])

    for p in predictions:
        comp_name = p.component.name if p.component else f"Component {p.component_id}"
        comp_cat = p.component.category if p.component else "General"
        writer.writerow([
            vehicle.id,
            vehicle.registration_no,
            vehicle.make,
            vehicle.model,
            vehicle.odometer_km,
            comp_name,
            comp_cat,
            p.risk_score,
            p.risk_level,
            p.recommendation,
            p.remaining_useful_life_km,
            p.predicted_at.isoformat() if p.predicted_at else ""
        ])

    output.seek(0)
    filename = f"autovex_report_{vehicle.registration_no}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
