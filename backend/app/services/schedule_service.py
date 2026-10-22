from datetime import datetime, timedelta
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app import models

COMPONENT_ESTIMATED_COSTS = {
    "Engine Oil": 65.0,
    "Oil Filter": 25.0,
    "Air Filter": 35.0,
    "Brake Pads": 180.0,
    "Brake Fluid": 95.0,
    "Battery": 160.0,
    "Tires": 450.0,
    "Spark Plugs": 110.0,
    "Coolant": 85.0,
    "Clutch/Transmission Fluid": 140.0,
    "Timing Belt": 550.0
}

def get_vehicle_service_schedule(db: Session, vehicle_id: int) -> Dict[str, Any]:
    """
    Computes upcoming service schedule, itemized cost estimates, and creates reminders.
    """
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise ValueError(f"Vehicle {vehicle_id} not found")

    predictions = (
        db.query(models.Prediction)
        .filter(models.Prediction.vehicle_id == vehicle_id)
        .all()
    )

    items = []
    total_estimated_cost = 0.0
    min_due_km = vehicle.odometer_km + 10000.0  # default horizon

    # Assumed daily travel km based on usage pattern
    daily_km = 35.0 if vehicle.usage_pattern == "City" else (65.0 if vehicle.usage_pattern == "Highway" else 48.0)
    now = datetime.utcnow()

    for pred in predictions:
        comp_name = pred.component.name if pred.component else f"Component {pred.component_id}"
        cost = COMPONENT_ESTIMATED_COSTS.get(comp_name, 75.0)

        due_km = vehicle.odometer_km + max(200.0, pred.remaining_useful_life_km)
        days_until = max(2, int(pred.remaining_useful_life_km / daily_km))
        due_date_str = (now + timedelta(days=days_until)).strftime("%Y-%m-%d")

        urgency = "Normal"
        reason = f"Normal wear ({pred.remaining_useful_life_km:.0f} km RUL remaining)"

        if pred.recommendation == "Replace" or pred.risk_level == "Critical":
            urgency = "Critical"
            reason = f"Exceeded safety threshold. Replace immediately ({pred.remaining_useful_life_km:.0f} km remaining)"
            total_estimated_cost += cost
            if due_km < min_due_km:
                min_due_km = due_km
        elif pred.recommendation == "Service" or pred.risk_level == "High":
            urgency = "High"
            reason = f"Service required soon. Wear ratio high ({pred.remaining_useful_life_km:.0f} km remaining)"
            total_estimated_cost += cost
            if due_km < min_due_km:
                min_due_km = due_km
        elif pred.recommendation == "Inspect" or pred.risk_level == "Medium":
            urgency = "Medium"
            reason = f"Inspect during next service interval ({pred.remaining_useful_life_km:.0f} km remaining)"
            if due_km < min_due_km:
                min_due_km = due_km

        items.append({
            "component_name": comp_name,
            "due_km": round(due_km, 1),
            "due_date": due_date_str,
            "estimated_cost": cost,
            "urgency": urgency,
            "reason": reason
        })

    # Sort items by urgency (Critical -> High -> Medium -> Normal)
    urgency_order = {"Critical": 0, "High": 1, "Medium": 2, "Normal": 3}
    items.sort(key=lambda x: urgency_order.get(x["urgency"], 4))

    # Sync high/critical reminders in the database
    for item in items:
        if item["urgency"] in ["Critical", "High"]:
            comp = db.query(models.Component).filter(models.Component.name == item["component_name"]).first()
            if comp:
                existing_reminder = (
                    db.query(models.Reminder)
                    .filter(
                        models.Reminder.vehicle_id == vehicle_id,
                        models.Reminder.component_id == comp.id,
                        models.Reminder.status == "Pending"
                    )
                    .first()
                )
                if not existing_reminder:
                    new_rem = models.Reminder(
                        vehicle_id=vehicle_id,
                        component_id=comp.id,
                        due_date=datetime.strptime(item["due_date"], "%Y-%m-%d").date(),
                        due_km=item["due_km"],
                        message=f"{item['urgency']} Alert: {item['component_name']} needs {item['urgency'].lower()} service.",
                        status="Pending"
                    )
                    db.add(new_rem)

    db.commit()

    return {
        "vehicle_id": vehicle_id,
        "current_odometer_km": round(vehicle.odometer_km, 1),
        "next_service_km": round(min_due_km, 1),
        "estimated_total_cost": round(total_estimated_cost, 2),
        "items": items
    }
