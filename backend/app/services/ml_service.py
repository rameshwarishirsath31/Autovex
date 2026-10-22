import os
import json
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, date
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models

class MLService:
    def __init__(self):
        self.models_dir = os.path.join(os.path.dirname(__file__), "..", "..", "ml", "models")
        self.classifier = None
        self.regressor = None
        self.preprocessor = None
        self.metadata = None
        self._load_models()

    def _load_models(self):
        try:
            clf_path = os.path.join(self.models_dir, "best_classifier.joblib")
            reg_path = os.path.join(self.models_dir, "rul_regressor.joblib")
            prep_path = os.path.join(self.models_dir, "preprocessor.joblib")
            meta_path = os.path.join(self.models_dir, "metrics.json")

            if os.path.exists(clf_path) and os.path.exists(prep_path):
                self.classifier = joblib.load(clf_path)
                self.preprocessor = joblib.load(prep_path)
                if os.path.exists(reg_path):
                    self.regressor = joblib.load(reg_path)
                if os.path.exists(meta_path):
                    with open(meta_path, "r") as f:
                        self.metadata = json.load(f)
                print("ML models loaded successfully.")
            else:
                print("ML models not yet trained or found in", self.models_dir)
        except Exception as e:
            print(f"Warning: Failed to load ML models ({e}). Will use rule-based fallback if called.")

    def reload(self):
        self._load_models()

    def predict_component(
        self,
        component_name: str,
        replacement_interval_km: float,
        vehicle_age_years: float,
        odometer_km: float,
        km_since_last_replacement: float,
        days_since_last_replacement: int,
        usage_pattern: str,
        avg_coolant_temp: float,
        avg_rpm: float,
        hard_braking_score: float,
        active_dtc_count: int,
        past_replacement_count: int
    ) -> Dict[str, Any]:
        """
        Runs ML prediction for a single component.
        Falls back to deterministic rule-based physics if models aren't ready.
        """
        # If models loaded, use trained pipeline
        if self.classifier is not None and self.preprocessor is not None:
            input_df = pd.DataFrame([{
                "vehicle_age_years": float(vehicle_age_years),
                "odometer_km": float(odometer_km),
                "km_since_last_replacement": float(km_since_last_replacement),
                "days_since_last_replacement": int(days_since_last_replacement),
                "avg_coolant_temp": float(avg_coolant_temp),
                "avg_rpm": float(avg_rpm),
                "hard_braking_score": float(hard_braking_score),
                "active_dtc_count": int(active_dtc_count),
                "replacement_interval_km": float(replacement_interval_km),
                "past_replacement_count": int(past_replacement_count),
                "component_type": component_name,
                "usage_pattern": usage_pattern
            }])

            X_trans = self.preprocessor.transform(input_df)
            pred_idx = int(self.classifier.predict(X_trans)[0])

            class_labels = ["Monitor", "Inspect", "Service", "Replace"]
            recommendation = class_labels[pred_idx] if pred_idx < len(class_labels) else "Monitor"

            probabilities = {}
            if hasattr(self.classifier, "predict_proba"):
                probs = self.classifier.predict_proba(X_trans)[0]
                for i, lbl in enumerate(class_labels):
                    if i < len(probs):
                        probabilities[lbl] = round(float(probs[i]), 3)

            # RUL prediction
            if self.regressor is not None:
                rul_km = float(max(0.0, self.regressor.predict(X_trans)[0]))
            else:
                rul_km = max(0.0, replacement_interval_km - km_since_last_replacement)

            # Calculate risk score 0 - 100
            # Higher wear ratio = higher risk score
            ratio = km_since_last_replacement / max(1.0, replacement_interval_km)
            # Factor in probabilities of Service/Replace
            prob_urgent = (probabilities.get("Service", 0.0) * 0.7) + (probabilities.get("Replace", 0.0) * 1.0)
            risk_score = round(min(100.0, max(0.0, (ratio * 60.0) + (prob_urgent * 40.0) + (active_dtc_count * 4.0))), 1)

            if risk_score < 40:
                risk_level = "Low"
            elif risk_score < 70:
                risk_level = "Medium"
            elif risk_score < 88:
                risk_level = "High"
            else:
                risk_level = "Critical"

            return {
                "recommendation": recommendation,
                "risk_level": risk_level,
                "risk_score": risk_score,
                "remaining_useful_life_km": round(rul_km, 1),
                "probabilities": probabilities
            }

        # Fallback heuristic calculation if model not yet loaded
        base_ratio = km_since_last_replacement / max(1.0, replacement_interval_km)
        wear = base_ratio + (active_dtc_count * 0.08)
        if wear < 0.60:
            rec, lvl = "Monitor", "Low"
        elif wear < 0.85:
            rec, lvl = "Inspect", "Medium"
        elif wear <= 1.0:
            rec, lvl = "Service", "High"
        else:
            rec, lvl = "Replace", "Critical"

        score = round(min(100.0, max(0.0, wear * 100.0)), 1)
        rul = round(max(0.0, (1.0 - wear) * replacement_interval_km), 1)

        return {
            "recommendation": rec,
            "risk_level": lvl,
            "risk_score": score,
            "remaining_useful_life_km": rul,
            "probabilities": {rec: 0.85}
        }

    def run_vehicle_predictions(self, db: Session, vehicle_id: int) -> List[Dict[str, Any]]:
        """
        Calculates and stores predictions for all components for a specific vehicle.
        """
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
        if not vehicle:
            raise ValueError(f"Vehicle {vehicle_id} not found")

        current_year = datetime.utcnow().year
        vehicle_age_years = max(0.5, float(current_year - vehicle.year))

        # Recent OBD telemetry aggregates
        readings = (
            db.query(models.OBDReading)
            .filter(models.OBDReading.vehicle_id == vehicle_id)
            .order_by(models.OBDReading.recorded_at.desc())
            .limit(20)
            .all()
        )
        if readings:
            avg_coolant = float(np.mean([r.coolant_temp_c for r in readings]))
            avg_rpm = float(np.mean([r.rpm for r in readings]))
            # Estimate hard braking from speed deceleration
            speeds = [r.speed_kmh for r in readings]
            diffs = np.diff(speeds) if len(speeds) > 1 else [0]
            hard_braking = float(min(10.0, max(1.0, abs(np.min(diffs)) if len(diffs) > 0 else 3.0)))
        else:
            avg_coolant = 90.0
            avg_rpm = 2200.0
            hard_braking = 3.5

        # Active DTC codes count
        active_dtc_count = (
            db.query(models.DTCCode)
            .filter(models.DTCCode.vehicle_id == vehicle_id, models.DTCCode.cleared == False)
            .count()
        )

        components = db.query(models.Component).all()
        results = []

        now = datetime.utcnow()

        for comp in components:
            # Query last replacement history
            last_hist = (
                db.query(models.ComponentHistory)
                .filter(
                    models.ComponentHistory.vehicle_id == vehicle_id,
                    models.ComponentHistory.component_id == comp.id
                )
                .order_by(models.ComponentHistory.replaced_date.desc())
                .first()
            )

            past_count = (
                db.query(models.ComponentHistory)
                .filter(
                    models.ComponentHistory.vehicle_id == vehicle_id,
                    models.ComponentHistory.component_id == comp.id
                )
                .count()
            )

            if last_hist:
                km_since = max(0.0, vehicle.odometer_km - last_hist.replaced_at_km)
                replaced_dt = datetime.combine(last_hist.replaced_date, datetime.min.time())
                days_since = max(1, (now - replaced_dt).days)
            else:
                # If no history record, wear is based on vehicle odometer
                km_since = vehicle.odometer_km % comp.replacement_interval_km
                if km_since == 0 and vehicle.odometer_km > 0:
                    km_since = comp.replacement_interval_km * 0.75
                days_since = int(max(30, min(1000, vehicle_age_years * 300)))

            pred = self.predict_component(
                component_name=comp.name,
                replacement_interval_km=comp.replacement_interval_km,
                vehicle_age_years=vehicle_age_years,
                odometer_km=vehicle.odometer_km,
                km_since_last_replacement=km_since,
                days_since_last_replacement=days_since,
                usage_pattern=vehicle.usage_pattern,
                avg_coolant_temp=avg_coolant,
                avg_rpm=avg_rpm,
                hard_braking_score=hard_braking,
                active_dtc_count=active_dtc_count,
                past_replacement_count=past_count
            )

            # Update or create Prediction in DB
            db_pred = (
                db.query(models.Prediction)
                .filter(
                    models.Prediction.vehicle_id == vehicle_id,
                    models.Prediction.component_id == comp.id
                )
                .first()
            )

            if not db_pred:
                db_pred = models.Prediction(
                    vehicle_id=vehicle_id,
                    component_id=comp.id,
                    risk_score=pred["risk_score"],
                    risk_level=pred["risk_level"],
                    recommendation=pred["recommendation"],
                    remaining_useful_life_km=pred["remaining_useful_life_km"],
                    predicted_at=now
                )
                db.add(db_pred)
            else:
                db_pred.risk_score = pred["risk_score"]
                db_pred.risk_level = pred["risk_level"]
                db_pred.recommendation = pred["recommendation"]
                db_pred.remaining_useful_life_km = pred["remaining_useful_life_km"]
                db_pred.predicted_at = now

            results.append({
                "component_id": comp.id,
                "component_name": comp.name,
                "category": comp.category,
                "risk_score": pred["risk_score"],
                "risk_level": pred["risk_level"],
                "recommendation": pred["recommendation"],
                "remaining_useful_life_km": pred["remaining_useful_life_km"],
                "probabilities": pred.get("probabilities", {}),
                "predicted_at": now
            })

        db.commit()
        return results

ml_service = MLService()
