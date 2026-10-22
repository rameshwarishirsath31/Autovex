from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text, Index
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="owner", nullable=False)  # "owner", "admin"
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicles = relationship("Vehicle", back_populates="user", cascade="all, delete-orphan")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    make = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    year = Column(Integer, nullable=False)
    fuel_type = Column(String(50), default="Petrol", nullable=False)  # Petrol, Diesel, EV, Hybrid
    registration_no = Column(String(50), unique=True, index=True, nullable=False)
    odometer_km = Column(Float, default=0.0, nullable=False)
    usage_pattern = Column(String(50), default="Mixed", nullable=False)  # City, Highway, Mixed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    user = relationship("User", back_populates="vehicles")
    service_records = relationship("ServiceRecord", back_populates="vehicle", cascade="all, delete-orphan")
    component_histories = relationship("ComponentHistory", back_populates="vehicle", cascade="all, delete-orphan")
    obd_readings = relationship("OBDReading", back_populates="vehicle", cascade="all, delete-orphan")
    dtc_codes = relationship("DTCCode", back_populates="vehicle", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="vehicle", cascade="all, delete-orphan")
    reminders = relationship("Reminder", back_populates="vehicle", cascade="all, delete-orphan")


class Component(Base):
    __tablename__ = "components"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False)
    category = Column(String(50), nullable=False)  # Engine, Braking, Electrical, Chassis, Fluids
    replacement_interval_km = Column(Float, nullable=False)
    replacement_interval_months = Column(Integer, nullable=False)

    component_histories = relationship("ComponentHistory", back_populates="component")
    predictions = relationship("Prediction", back_populates="component")
    reminders = relationship("Reminder", back_populates="component")


class ServiceRecord(Base):
    __tablename__ = "service_records"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    service_date = Column(Date, nullable=False)
    odometer_km = Column(Float, nullable=False)
    service_type = Column(String(100), nullable=False)  # Routine Maintenance, Major Service, Inspection, Repair
    cost = Column(Float, default=0.0, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle", back_populates="service_records")


class ComponentHistory(Base):
    __tablename__ = "component_history"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    component_id = Column(Integer, ForeignKey("components.id", ondelete="CASCADE"), nullable=False, index=True)
    replaced_date = Column(Date, nullable=False)
    replaced_at_km = Column(Float, nullable=False)
    part_name = Column(String(150), nullable=False)
    cost = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle", back_populates="component_histories")
    component = relationship("Component", back_populates="component_histories")


class OBDReading(Base):
    __tablename__ = "obd_readings"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    recorded_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    rpm = Column(Float, nullable=False)
    speed_kmh = Column(Float, nullable=False)
    coolant_temp_c = Column(Float, nullable=False)
    throttle_pct = Column(Float, nullable=False)
    engine_load_pct = Column(Float, nullable=False)
    fuel_level_pct = Column(Float, nullable=False)
    battery_voltage = Column(Float, nullable=False)

    vehicle = relationship("Vehicle", back_populates="obd_readings")

    __table_args__ = (
        Index("ix_obd_vehicle_recorded", "vehicle_id", "recorded_at"),
    )


class DTCCode(Base):
    __tablename__ = "dtc_codes"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    code = Column(String(20), nullable=False)
    description = Column(String(255), nullable=False)
    severity = Column(String(30), default="Medium", nullable=False)  # Low, Medium, High, Critical
    detected_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    cleared = Column(Boolean, default=False, nullable=False)

    vehicle = relationship("Vehicle", back_populates="dtc_codes")


class Prediction(Base):
    __tablename__ = "predictions"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    component_id = Column(Integer, ForeignKey("components.id", ondelete="CASCADE"), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)  # 0 to 100
    risk_level = Column(String(30), nullable=False)  # Low, Medium, High, Critical
    recommendation = Column(String(50), nullable=False)  # Monitor, Inspect, Service, Replace
    remaining_useful_life_km = Column(Float, nullable=False)
    predicted_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle", back_populates="predictions")
    component = relationship("Component", back_populates="predictions")


class Reminder(Base):
    __tablename__ = "reminders"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id", ondelete="CASCADE"), nullable=False, index=True)
    component_id = Column(Integer, ForeignKey("components.id", ondelete="SET NULL"), nullable=True, index=True)
    due_date = Column(Date, nullable=True)
    due_km = Column(Float, nullable=True)
    message = Column(String(255), nullable=False)
    status = Column(String(30), default="Pending", nullable=False)  # Pending, Completed, Dismissed
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle", back_populates="reminders")
    component = relationship("Component", back_populates="reminders")
