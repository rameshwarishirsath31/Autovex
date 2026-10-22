import os
import sys
from datetime import datetime, date, timedelta

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(__file__))

from app.database import engine, Base, SessionLocal
from app import models
from app.utils.security import hash_password
from app.services.ml_service import ml_service

def seed():
    print("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # 1. Seed Components
        components_data = [
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

        component_map = {}
        for c in components_data:
            existing = db.query(models.Component).filter(models.Component.name == c["name"]).first()
            if not existing:
                comp = models.Component(
                    name=c["name"],
                    category=c["category"],
                    replacement_interval_km=c["interval_km"],
                    replacement_interval_months=c["interval_months"]
                )
                db.add(comp)
                db.flush()
                component_map[c["name"]] = comp
            else:
                component_map[c["name"]] = existing

        print(f"Seeded/Verified {len(component_map)} components.")

        # 2. Seed Users
        admin_user = db.query(models.User).filter(models.User.email == "admin@autovex.com").first()
        if not admin_user:
            admin_user = models.User(
                name="System Administrator",
                email="admin@autovex.com",
                password_hash=hash_password("admin123"),
                role="admin"
            )
            db.add(admin_user)
            db.flush()
            print("Created Admin user: admin@autovex.com / admin123")

        demo_user = db.query(models.User).filter(models.User.email == "demo@autovex.com").first()
        if not demo_user:
            demo_user = models.User(
                name="Demo User",
                email="demo@autovex.com",
                password_hash=hash_password("demo123"),
                role="owner"
            )
            db.add(demo_user)
            db.flush()
            print("Created Demo user: demo@autovex.com / demo123")

        # 3. Seed Vehicles for Demo User
        vehicles_data = [
            {
                "make": "Hyundai",
                "model": "Creta SX",
                "year": 2021,
                "fuel_type": "Petrol",
                "registration_no": "KA-01-MJ-4021",
                "odometer_km": 38500.0,
                "usage_pattern": "Mixed"
            },
            {
                "make": "Honda",
                "model": "City i-VTEC",
                "year": 2018,
                "fuel_type": "Petrol",
                "registration_no": "DL-08-AB-9922",
                "odometer_km": 72400.0,
                "usage_pattern": "City"
            },
            {
                "make": "Tata",
                "model": "Nexon EV Max",
                "year": 2023,
                "fuel_type": "EV",
                "registration_no": "MH-12-TX-5544",
                "odometer_km": 16200.0,
                "usage_pattern": "Highway"
            }
        ]

        created_vehicles = []
        for v in vehicles_data:
            veh = db.query(models.Vehicle).filter(models.Vehicle.registration_no == v["registration_no"]).first()
            if not veh:
                veh = models.Vehicle(
                    user_id=demo_user.id,
                    make=v["make"],
                    model=v["model"],
                    year=v["year"],
                    fuel_type=v["fuel_type"],
                    registration_no=v["registration_no"],
                    odometer_km=v["odometer_km"],
                    usage_pattern=v["usage_pattern"]
                )
                db.add(veh)
                db.flush()
            created_vehicles.append(veh)

        print(f"Seeded/Verified {len(created_vehicles)} vehicles.")

        # 4. Service Records & Component Replacement History
        v1 = created_vehicles[0]  # Hyundai Creta (38,500 km)
        if not db.query(models.ServiceRecord).filter(models.ServiceRecord.vehicle_id == v1.id).first():
            # Service at 10,000 km
            db.add(models.ServiceRecord(
                vehicle_id=v1.id,
                service_date=date.today() - timedelta(days=580),
                odometer_km=10100.0,
                service_type="Routine Maintenance",
                cost=145.0,
                notes="10,000 km general service. Engine oil & filter renewed."
            ))
            # Service at 20,000 km
            db.add(models.ServiceRecord(
                vehicle_id=v1.id,
                service_date=date.today() - timedelta(days=320),
                odometer_km=20250.0,
                service_type="Routine Maintenance",
                cost=180.0,
                notes="20,000 km scheduled periodic maintenance. Air filter replaced."
            ))
            # Service at 30,000 km
            db.add(models.ServiceRecord(
                vehicle_id=v1.id,
                service_date=date.today() - timedelta(days=95),
                odometer_km=30500.0,
                service_type="Routine Maintenance",
                cost=210.0,
                notes="30,000 km service. Oil change and spark plug inspection."
            ))

            # Component Histories
            db.add(models.ComponentHistory(
                vehicle_id=v1.id,
                component_id=component_map["Engine Oil"].id,
                replaced_date=date.today() - timedelta(days=95),
                replaced_at_km=30500.0,
                part_name="Synthetic 5W-30 Motor Oil",
                cost=65.0
            ))
            db.add(models.ComponentHistory(
                vehicle_id=v1.id,
                component_id=component_map["Oil Filter"].id,
                replaced_date=date.today() - timedelta(days=95),
                replaced_at_km=30500.0,
                part_name="OEM Spin-on Oil Filter",
                cost=25.0
            ))
            db.add(models.ComponentHistory(
                vehicle_id=v1.id,
                component_id=component_map["Brake Pads"].id,
                replaced_date=date.today() - timedelta(days=400),
                replaced_at_km=15000.0,
                part_name="Ceramic Front Brake Pads",
                cost=180.0
            ))

        v2 = created_vehicles[1]  # Honda City (72,400 km)
        if not db.query(models.ServiceRecord).filter(models.ServiceRecord.vehicle_id == v2.id).first():
            db.add(models.ServiceRecord(
                vehicle_id=v2.id,
                service_date=date.today() - timedelta(days=210),
                odometer_km=62000.0,
                service_type="Major Service",
                cost=390.0,
                notes="60k major overhaul, fluid flushing and tire rotation."
            ))
            db.add(models.ComponentHistory(
                vehicle_id=v2.id,
                component_id=component_map["Engine Oil"].id,
                replaced_date=date.today() - timedelta(days=210),
                replaced_at_km=62000.0,
                part_name="0W-20 Synthetic Blend",
                cost=70.0
            ))
            db.add(models.ComponentHistory(
                vehicle_id=v2.id,
                component_id=component_map["Battery"].id,
                replaced_date=date.today() - timedelta(days=700),
                replaced_at_km=35000.0,
                part_name="Exide Matrix 12V 45Ah",
                cost=155.0
            ))

        # 5. DTC Codes
        # Add P0300, P0420, P0171 to vehicles
        if not db.query(models.DTCCode).filter(models.DTCCode.vehicle_id == v2.id).first():
            db.add(models.DTCCode(
                vehicle_id=v2.id,
                code="P0300",
                description="Random/Multiple Cylinder Misfire Detected",
                severity="High",
                cleared=False
            ))
            db.add(models.DTCCode(
                vehicle_id=v2.id,
                code="P0420",
                description="Catalyst System Efficiency Below Threshold (Bank 1)",
                severity="Medium",
                cleared=False
            ))

        if not db.query(models.DTCCode).filter(models.DTCCode.vehicle_id == v1.id).first():
            db.add(models.DTCCode(
                vehicle_id=v1.id,
                code="P0171",
                description="System Too Lean (Bank 1)",
                severity="Medium",
                cleared=False
            ))

        # 6. OBD Readings (Simulated historical telemetry)
        for veh in created_vehicles:
            if not db.query(models.OBDReading).filter(models.OBDReading.vehicle_id == veh.id).first():
                for i in range(15):
                    recorded = datetime.utcnow() - timedelta(minutes=(15 - i) * 2)
                    speed = 40.0 + (i % 5) * 8.0
                    db.add(models.OBDReading(
                        vehicle_id=veh.id,
                        recorded_at=recorded,
                        rpm=1800.0 + (speed * 18.0),
                        speed_kmh=speed,
                        coolant_temp_c=90.0 + (i % 3) * 1.5,
                        throttle_pct=22.0 + (i % 4) * 4.0,
                        engine_load_pct=32.0 + (i % 5) * 3.5,
                        fuel_level_pct=65.0 - (i * 0.1),
                        battery_voltage=14.1
                    ))

        db.commit()

        # 7. Initial Predictions & Reminders
        print("Running initial predictions for vehicles...")
        for veh in created_vehicles:
            try:
                ml_service.run_vehicle_predictions(db, veh.id)
            except Exception as e:
                print(f"Initial prediction note for {veh.registration_no}: {e}")

        # 8. Reminders
        if not db.query(models.Reminder).filter(models.Reminder.vehicle_id == v1.id).first():
            db.add(models.Reminder(
                vehicle_id=v1.id,
                component_id=component_map["Brake Pads"].id,
                due_date=date.today() + timedelta(days=25),
                due_km=40000.0,
                message="Brake pads wear approaching critical limit. Schedule inspection.",
                status="Pending"
            ))
            db.add(models.Reminder(
                vehicle_id=v1.id,
                component_id=component_map["Engine Oil"].id,
                due_date=date.today() + timedelta(days=45),
                due_km=40500.0,
                message="Routine 10,000 km oil and filter change due soon.",
                status="Pending"
            ))

        if not db.query(models.Reminder).filter(models.Reminder.vehicle_id == v2.id).first():
            db.add(models.Reminder(
                vehicle_id=v2.id,
                component_id=component_map["Timing Belt"].id,
                due_date=date.today() + timedelta(days=14),
                due_km=75000.0,
                message="Timing belt inspection required immediately due to vehicle age and mileage.",
                status="Pending"
            ))

        db.commit()
        print("Database seeded successfully with all demo data!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed()
