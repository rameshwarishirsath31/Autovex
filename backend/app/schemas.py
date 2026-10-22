from datetime import datetime, date
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# User Schemas
class UserBase(BaseModel):
    name: str
    email: str

class UserRegister(UserBase):
    password: str = Field(..., min_length=6)
    role: Optional[str] = "owner"

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(UserBase):
    id: int
    role: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

# Component Schemas
class ComponentResponse(BaseModel):
    id: int
    name: str
    category: str
    replacement_interval_km: float
    replacement_interval_months: int

    class Config:
        from_attributes = True

# Vehicle Schemas
class VehicleBase(BaseModel):
    make: str
    model: str
    year: int
    fuel_type: str = "Petrol"
    registration_no: str
    odometer_km: float = 0.0
    usage_pattern: str = "Mixed"

class VehicleCreate(VehicleBase):
    pass

class VehicleUpdate(BaseModel):
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    fuel_type: Optional[str] = None
    registration_no: Optional[str] = None
    odometer_km: Optional[float] = None
    usage_pattern: Optional[str] = None

class VehicleResponse(VehicleBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Service Record Schemas
class ServiceRecordCreate(BaseModel):
    service_date: date
    odometer_km: float
    service_type: str
    cost: float = 0.0
    notes: Optional[str] = None

class ServiceRecordResponse(ServiceRecordCreate):
    id: int
    vehicle_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Component History Schemas
class ComponentHistoryCreate(BaseModel):
    component_id: int
    replaced_date: date
    replaced_at_km: float
    part_name: str
    cost: float = 0.0

class ComponentHistoryResponse(ComponentHistoryCreate):
    id: int
    vehicle_id: int
    created_at: datetime
    component: Optional[ComponentResponse] = None

    class Config:
        from_attributes = True

# OBD Schemas
class OBDReadingCreate(BaseModel):
    rpm: float
    speed_kmh: float
    coolant_temp_c: float
    throttle_pct: float
    engine_load_pct: float
    fuel_level_pct: float
    battery_voltage: float

class OBDReadingResponse(OBDReadingCreate):
    id: int
    vehicle_id: int
    recorded_at: datetime

    class Config:
        from_attributes = True

# DTC Codes
class DTCCodeCreate(BaseModel):
    code: str
    description: str
    severity: str = "Medium"

class DTCCodeResponse(DTCCodeCreate):
    id: int
    vehicle_id: int
    detected_at: datetime
    cleared: bool

    class Config:
        from_attributes = True

# Predictions
class ComponentPredictionResponse(BaseModel):
    id: Optional[int] = None
    component_id: int
    component_name: str
    category: str
    risk_score: float
    risk_level: str
    recommendation: str
    remaining_useful_life_km: float
    probabilities: Optional[Dict[str, float]] = None
    predicted_at: datetime

    class Config:
        from_attributes = True

class VehiclePredictionSummary(BaseModel):
    vehicle_id: int
    overall_health_score: float
    overall_risk_level: str
    critical_components_count: int
    service_required_count: int
    predictions: List[ComponentPredictionResponse]
    predicted_at: datetime

# Reminders
class ReminderCreate(BaseModel):
    component_id: Optional[int] = None
    due_date: Optional[date] = None
    due_km: Optional[float] = None
    message: str
    status: str = "Pending"

class ReminderUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[date] = None
    due_km: Optional[float] = None
    message: Optional[str] = None

class ReminderResponse(BaseModel):
    id: int
    vehicle_id: int
    component_id: Optional[int] = None
    due_date: Optional[date] = None
    due_km: Optional[float] = None
    message: str
    status: str
    created_at: datetime
    component: Optional[ComponentResponse] = None

    class Config:
        from_attributes = True

# Schedule & Cost
class ServiceScheduleItem(BaseModel):
    component_name: str
    due_km: float
    due_date: Optional[str]
    estimated_cost: float
    urgency: str
    reason: str

class VehicleScheduleResponse(BaseModel):
    vehicle_id: int
    current_odometer_km: float
    next_service_km: float
    estimated_total_cost: float
    items: List[ServiceScheduleItem]

# Health Score
class HealthScoreResponse(BaseModel):
    vehicle_id: int
    health_score: float
    status: str
    grade: str
    summary: str
    component_breakdown: List[Dict[str, Any]]
