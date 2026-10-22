import pytest
from app.services.ml_service import ml_service
from app.services.health_score import calculate_vehicle_health_score
from app.database import SessionLocal
from app import models

def test_ml_service_single_component():
    # Test low wear condition
    pred_low = ml_service.predict_component(
        component_name="Engine Oil",
        replacement_interval_km=10000.0,
        vehicle_age_years=2.0,
        odometer_km=25000.0,
        km_since_last_replacement=2000.0,
        days_since_last_replacement=45,
        usage_pattern="Mixed",
        avg_coolant_temp=90.0,
        avg_rpm=2200.0,
        hard_braking_score=2.0,
        active_dtc_count=0,
        past_replacement_count=2
    )

    assert "recommendation" in pred_low
    assert "risk_score" in pred_low
    assert "risk_level" in pred_low
    assert pred_low["recommendation"] in ["Monitor", "Inspect"]
    assert pred_low["risk_score"] < 60.0

    # Test high wear condition
    pred_high = ml_service.predict_component(
        component_name="Brake Pads",
        replacement_interval_km=30000.0,
        vehicle_age_years=5.0,
        odometer_km=90000.0,
        km_since_last_replacement=34000.0,
        days_since_last_replacement=700,
        usage_pattern="City",
        avg_coolant_temp=95.0,
        avg_rpm=2800.0,
        hard_braking_score=8.5,
        active_dtc_count=2,
        past_replacement_count=2
    )

    assert pred_high["recommendation"] in ["Service", "Replace"]
    assert pred_high["risk_score"] > 60.0
