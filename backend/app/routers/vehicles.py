from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.security import get_current_user
from app.services.health_score import calculate_vehicle_health_score
from app.services.schedule_service import get_vehicle_service_schedule

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])

@router.get("", response_model=List[schemas.VehicleResponse])
def get_vehicles(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    if current_user.role == "admin":
        return db.query(models.Vehicle).all()
    return db.query(models.Vehicle).filter(models.Vehicle.user_id == current_user.id).all()

@router.post("", response_model=schemas.VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(
    vehicle_in: schemas.VehicleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing = db.query(models.Vehicle).filter(models.Vehicle.registration_no == vehicle_in.registration_no).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Vehicle with registration number '{vehicle_in.registration_no}' already exists."
        )

    vehicle = models.Vehicle(
        user_id=current_user.id,
        make=vehicle_in.make,
        model=vehicle_in.model,
        year=vehicle_in.year,
        fuel_type=vehicle_in.fuel_type,
        registration_no=vehicle_in.registration_no,
        odometer_km=vehicle_in.odometer_km,
        usage_pattern=vehicle_in.usage_pattern
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle

@router.get("/{vehicle_id}", response_model=schemas.VehicleResponse)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if current_user.role != "admin" and vehicle.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return vehicle

@router.put("/{vehicle_id}", response_model=schemas.VehicleResponse)
def update_vehicle(
    vehicle_id: int,
    vehicle_in: schemas.VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if current_user.role != "admin" and vehicle.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    update_data = vehicle_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(vehicle, key, value)

    db.commit()
    db.refresh(vehicle)
    return vehicle

@router.delete("/{vehicle_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if current_user.role != "admin" and vehicle.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    db.delete(vehicle)
    db.commit()
    return None

# Service Records
@router.get("/{vehicle_id}/service-records", response_model=List[schemas.ServiceRecordResponse])
def get_service_records(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if current_user.role != "admin" and vehicle.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return (
        db.query(models.ServiceRecord)
        .filter(models.ServiceRecord.vehicle_id == vehicle_id)
        .order_by(models.ServiceRecord.service_date.desc())
        .all()
    )

@router.post("/{vehicle_id}/service-records", response_model=schemas.ServiceRecordResponse, status_code=status.HTTP_201_CREATED)
def create_service_record(
    vehicle_id: int,
    record_in: schemas.ServiceRecordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if current_user.role != "admin" and vehicle.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    record = models.ServiceRecord(
        vehicle_id=vehicle_id,
        service_date=record_in.service_date,
        odometer_km=record_in.odometer_km,
        service_type=record_in.service_type,
        cost=record_in.cost,
        notes=record_in.notes
    )
    # Update vehicle odometer if higher
    if record_in.odometer_km > vehicle.odometer_km:
        vehicle.odometer_km = record_in.odometer_km

    db.add(record)
    db.commit()
    db.refresh(record)
    return record

# Component History
@router.get("/{vehicle_id}/component-history", response_model=List[schemas.ComponentHistoryResponse])
def get_component_history(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if current_user.role != "admin" and vehicle.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    return (
        db.query(models.ComponentHistory)
        .filter(models.ComponentHistory.vehicle_id == vehicle_id)
        .order_by(models.ComponentHistory.replaced_date.desc())
        .all()
    )

@router.post("/{vehicle_id}/component-history", response_model=schemas.ComponentHistoryResponse, status_code=status.HTTP_201_CREATED)
def create_component_history(
    vehicle_id: int,
    history_in: schemas.ComponentHistoryCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if current_user.role != "admin" and vehicle.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    component = db.query(models.Component).filter(models.Component.id == history_in.component_id).first()
    if not component:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Component not found")

    history = models.ComponentHistory(
        vehicle_id=vehicle_id,
        component_id=history_in.component_id,
        replaced_date=history_in.replaced_date,
        replaced_at_km=history_in.replaced_at_km,
        part_name=history_in.part_name,
        cost=history_in.cost
    )
    if history_in.replaced_at_km > vehicle.odometer_km:
        vehicle.odometer_km = history_in.replaced_at_km

    db.add(history)
    db.commit()
    db.refresh(history)
    return history

# DTC Codes
@router.get("/{vehicle_id}/dtc", response_model=List[schemas.DTCCodeResponse])
def get_dtc_codes(
    vehicle_id: int,
    include_cleared: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    q = db.query(models.DTCCode).filter(models.DTCCode.vehicle_id == vehicle_id)
    if not include_cleared:
        q = q.filter(models.DTCCode.cleared == False)
    return q.order_by(models.DTCCode.detected_at.desc()).all()

@router.post("/{vehicle_id}/dtc", response_model=schemas.DTCCodeResponse, status_code=status.HTTP_201_CREATED)
def add_dtc_code(
    vehicle_id: int,
    dtc_in: schemas.DTCCodeCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    code = models.DTCCode(
        vehicle_id=vehicle_id,
        code=dtc_in.code.strip().upper(),
        description=dtc_in.description,
        severity=dtc_in.severity,
        cleared=False
    )
    db.add(code)
    db.commit()
    db.refresh(code)
    return code

@router.patch("/{vehicle_id}/dtc/{dtc_id}/clear", response_model=schemas.DTCCodeResponse)
def clear_dtc_code(
    vehicle_id: int,
    dtc_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    code = db.query(models.DTCCode).filter(
        models.DTCCode.id == dtc_id,
        models.DTCCode.vehicle_id == vehicle_id
    ).first()
    if not code:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="DTC code not found")

    code.cleared = True
    db.commit()
    db.refresh(code)
    return code

# Health Score & Schedule
@router.get("/{vehicle_id}/health-score", response_model=schemas.HealthScoreResponse)
def get_health_score(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        return calculate_vehicle_health_score(db, vehicle_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))

@router.get("/{vehicle_id}/schedule", response_model=schemas.VehicleScheduleResponse)
def get_service_schedule(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    try:
        return get_vehicle_service_schedule(db, vehicle_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
