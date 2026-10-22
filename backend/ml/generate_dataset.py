import os
import numpy as np
import pandas as pd

COMPONENTS = [
    {"name": "Engine Oil", "category": "Fluids", "interval_km": 10000, "interval_months": 6},
    {"name": "Oil Filter", "category": "Engine", "interval_km": 10000, "interval_months": 6},
    {"name": "Air Filter", "category": "Engine", "interval_km": 15000, "interval_months": 12},
    {"name": "Brake Pads", "category": "Braking", "interval_km": 30000, "interval_months": 24},
    {"name": "Brake Fluid", "category": "Fluids", "interval_km": 40000, "interval_months": 24},
    {"name": "Battery", "category": "Electrical", "interval_km": 50000, "interval_months": 36},
    {"name": "Tires", "category": "Chassis", "interval_km": 45000, "interval_months": 36},
    {"name": "Spark Plugs", "category": "Electrical", "interval_km": 30000, "interval_months": 24},
    {"name": "Coolant", "category": "Fluids", "interval_km": 40000, "interval_months": 24},
    {"name": "Clutch/Transmission Fluid", "category": "Fluids", "interval_km": 50000, "interval_months": 36},
    {"name": "Timing Belt", "category": "Engine", "interval_km": 80000, "interval_months": 60},
]

USAGE_PATTERNS = ["City", "Highway", "Mixed"]

def generate_synthetic_data(num_samples=22000, random_seed=42):
    np.random.seed(random_seed)
    data = []

    for _ in range(num_samples):
        comp = COMPONENTS[np.random.choice(len(COMPONENTS))]
        usage = np.random.choice(USAGE_PATTERNS, p=[0.45, 0.25, 0.30])
        
        vehicle_age_years = round(float(np.random.uniform(0.5, 14.0)), 2)
        annual_km = np.random.uniform(9000, 22000)
        odometer_km = round(float(max(5000, vehicle_age_years * annual_km + np.random.normal(0, 3000))), 1)
        
        # Replacement interval
        interval_km = float(comp["interval_km"])
        
        # Simulated wear ratio distribution across cycles
        base_fraction = np.random.beta(2.2, 1.8) * 1.35  # spreads nicely 0.0 to 1.3+
        km_since_last_replacement = round(float(base_fraction * interval_km), 1)
        
        # Days since replacement roughly correlating with km
        daily_km = odometer_km / max(180, vehicle_age_years * 365)
        days_since_last_replacement = int(max(10, min(1500, km_since_last_replacement / max(10, daily_km))))
        
        # Telemetry features
        avg_coolant_temp = round(float(np.random.normal(91.0, 5.5)), 1)
        avg_rpm = round(float(np.random.normal(2350, 480)), 1)
        hard_braking_score = round(float(np.random.uniform(0.5, 9.5)), 2)
        
        # DTC count
        dtc_prob = 0.15 if base_fraction < 0.7 else (0.45 if base_fraction < 1.0 else 0.75)
        active_dtc_count = int(np.random.poisson(1.2)) if np.random.rand() < dtc_prob else 0
        active_dtc_count = min(5, active_dtc_count)
        
        # Past replacement count
        past_replacement_count = int(odometer_km // interval_km)
        
        # Adjusted wear calculation
        base_ratio = km_since_last_replacement / interval_km
        usage_adj = 0.10 if usage == "City" else (-0.05 if usage == "Highway" else 0.02)
        temp_adj = 0.08 if avg_coolant_temp > 98.0 else (-0.02 if avg_coolant_temp < 88.0 else 0.0)
        rpm_adj = 0.06 if avg_rpm > 3000 else 0.0
        brake_adj = (hard_braking_score / 10.0) * 0.12 if comp["name"] in ["Brake Pads", "Tires", "Brake Fluid"] else (hard_braking_score / 10.0) * 0.03
        dtc_adj = active_dtc_count * 0.07
        age_adj = (vehicle_age_years / 14.0) * 0.05
        noise = float(np.random.normal(0, 0.035))
        
        wear_ratio = max(0.02, base_ratio + usage_adj + temp_adj + rpm_adj + brake_adj + dtc_adj + age_adj + noise)
        
        # Class determination
        if wear_ratio < 0.60:
            recommendation = "Monitor"
            risk_level = "Low"
        elif wear_ratio < 0.85:
            recommendation = "Inspect"
            risk_level = "Medium"
        elif wear_ratio <= 1.00:
            recommendation = "Service"
            risk_level = "High"
        else:
            recommendation = "Replace"
            risk_level = "Critical"
            
        risk_score = round(float(min(100.0, max(0.0, wear_ratio * 100.0))), 2)
        
        # Regression target: Remaining useful life in km
        raw_rul = max(0.0, (1.0 - wear_ratio) * interval_km)
        remaining_useful_life_km = round(float(max(0.0, raw_rul + np.random.normal(0, interval_km * 0.02))), 1)

        data.append({
            "component_type": comp["name"],
            "component_category": comp["category"],
            "replacement_interval_km": interval_km,
            "vehicle_age_years": vehicle_age_years,
            "odometer_km": odometer_km,
            "km_since_last_replacement": km_since_last_replacement,
            "days_since_last_replacement": days_since_last_replacement,
            "usage_pattern": usage,
            "avg_coolant_temp": avg_coolant_temp,
            "avg_rpm": avg_rpm,
            "hard_braking_score": hard_braking_score,
            "active_dtc_count": active_dtc_count,
            "past_replacement_count": past_replacement_count,
            "wear_ratio": round(wear_ratio, 4),
            "risk_score": risk_score,
            "risk_level": risk_level,
            "recommendation": recommendation,
            "remaining_useful_life_km": remaining_useful_life_km
        })

    df = pd.DataFrame(data)
    return df

if __name__ == "__main__":
    output_dir = os.path.join(os.path.dirname(__file__), "data")
    os.makedirs(output_dir, exist_ok=True)
    out_file = os.path.join(output_dir, "synthetic_vehicle_maintenance_data.csv")
    print(f"Generating synthetic vehicle maintenance dataset (22,000 samples)...")
    df = generate_synthetic_data(num_samples=22000)
    df.to_csv(out_file, index=False)
    print(f"Dataset saved to: {out_file}")
    print("\nClass distribution:")
    print(df["recommendation"].value_counts(normalize=True).round(3))
    print("\nSummary:")
    print(df.describe().T[["mean", "std", "min", "max"]])
