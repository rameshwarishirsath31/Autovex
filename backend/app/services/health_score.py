from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app import models

COMPONENT_WEIGHTS = {
    "Engine Oil": 1.8,
    "Oil Filter": 1.2,
    "Brake Pads": 2.2,
    "Brake Fluid": 2.0,
    "Tires": 2.0,
    "Timing Belt": 1.9,
    "Battery": 1.5,
    "Coolant": 1.5,
    "Spark Plugs": 1.1,
    "Air Filter": 1.0,
    "Clutch/Transmission Fluid": 1.4
}

def calculate_vehicle_health_score(db: Session, vehicle_id: int) -> Dict[str, Any]:
    """
    Computes a weighted 0-100 overall vehicle health score
    based on the latest component predictions and active DTC fault codes.
    """
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise ValueError(f"Vehicle {vehicle_id} not found")

    predictions = (
        db.query(models.Prediction)
        .filter(models.Prediction.vehicle_id == vehicle_id)
        .all()
    )

    if not predictions:
        # If no predictions yet, return default pristine or preliminary
        return {
            "vehicle_id": vehicle_id,
            "health_score": 95.0,
            "status": "Good",
            "grade": "A",
            "summary": "Preliminary status. Run ML prediction for detailed component breakdown.",
            "component_breakdown": []
        }

    total_weight = 0.0
    weighted_health_sum = 0.0
    component_breakdown = []
    critical_count = 0
    replace_count = 0

    for pred in predictions:
        comp_name = pred.component.name if pred.component else f"Component {pred.component_id}"
        weight = COMPONENT_WEIGHTS.get(comp_name, 1.0)

        # Health is the inverse of risk score (risk 0 -> health 100)
        comp_health = max(0.0, min(100.0, 100.0 - pred.risk_score))
        weighted_health_sum += comp_health * weight
        total_weight += weight

        if pred.risk_level == "Critical" or pred.recommendation == "Replace":
            critical_count += 1
            replace_count += 1
        elif pred.recommendation == "Service":
            replace_count += 1

        component_breakdown.append({
            "component_id": pred.component_id,
            "component_name": comp_name,
            "category": pred.component.category if pred.component else "General",
            "risk_score": pred.risk_score,
            "health_score": round(comp_health, 1),
            "risk_level": pred.risk_level,
            "recommendation": pred.recommendation,
            "weight": weight
        })

    raw_health = (weighted_health_sum / max(0.1, total_weight))

    # Deduct for active DTC codes
    active_dtcs = (
        db.query(models.DTCCode)
        .filter(models.DTCCode.vehicle_id == vehicle_id, models.DTCCode.cleared == False)
        .all()
    )
    dtc_penalty = 0.0
    for dtc in active_dtcs:
        if dtc.severity == "Critical":
            dtc_penalty += 12.0
        elif dtc.severity == "High":
            dtc_penalty += 8.0
        elif dtc.severity == "Medium":
            dtc_penalty += 4.0
        else:
            dtc_penalty += 2.0

    final_health = max(5.0, min(100.0, raw_health - dtc_penalty))
    final_health = round(final_health, 1)

    # Determine status & grade
    if final_health >= 90:
        status, grade = "Excellent", "A"
        summary = "Vehicle is in outstanding mechanical condition. Continue routine maintenance."
    elif final_health >= 75:
        status, grade = "Good", "B"
        summary = "Vehicle systems are operating within safe tolerances. Keep monitoring components."
    elif final_health >= 60:
        status, grade = "Fair", "C"
        summary = f"Vehicle has wear detected. {replace_count} components require upcoming inspection or service."
    elif final_health >= 40:
        status, grade = "Poor", "D"
        summary = f"Attention required. {critical_count} critical components are near wear limits. Schedule service soon."
    else:
        status, grade = "Critical", "F"
        summary = f"CRITICAL WARNING: {critical_count} components or active DTC codes pose safety risks. Immediate service recommended."

    return {
        "vehicle_id": vehicle_id,
        "health_score": final_health,
        "status": status,
        "grade": grade,
        "summary": summary,
        "component_breakdown": component_breakdown
    }
