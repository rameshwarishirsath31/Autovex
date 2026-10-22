from typing import List, Dict, Any
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.services.obd_simulator import obd_manager

router = APIRouter(tags=["OBD-II Telemetry"])

@router.post("/obd/{vehicle_id}/ingest", response_model=schemas.OBDReadingResponse, status_code=status.HTTP_201_CREATED)
async def ingest_obd_reading(
    vehicle_id: int,
    reading_in: schemas.OBDReadingCreate,
    db: Session = Depends(get_db)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    reading = models.OBDReading(
        vehicle_id=vehicle_id,
        recorded_at=datetime.utcnow(),
        rpm=reading_in.rpm,
        speed_kmh=reading_in.speed_kmh,
        coolant_temp_c=reading_in.coolant_temp_c,
        throttle_pct=reading_in.throttle_pct,
        engine_load_pct=reading_in.engine_load_pct,
        fuel_level_pct=reading_in.fuel_level_pct,
        battery_voltage=reading_in.battery_voltage
    )
    db.add(reading)
    db.commit()
    db.refresh(reading)

    # Broadcast to active WebSockets
    await obd_manager.broadcast_reading(vehicle_id, {
        "vehicle_id": vehicle_id,
        "recorded_at": reading.recorded_at.isoformat(),
        "rpm": reading.rpm,
        "speed_kmh": reading.speed_kmh,
        "coolant_temp_c": reading.coolant_temp_c,
        "throttle_pct": reading.throttle_pct,
        "engine_load_pct": reading.engine_load_pct,
        "fuel_level_pct": reading.fuel_level_pct,
        "battery_voltage": reading.battery_voltage
    })

    return reading

@router.get("/obd/{vehicle_id}/latest", response_model=schemas.OBDReadingResponse)
def get_latest_obd_reading(
    vehicle_id: int,
    db: Session = Depends(get_db)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    reading = (
        db.query(models.OBDReading)
        .filter(models.OBDReading.vehicle_id == vehicle_id)
        .order_by(models.OBDReading.recorded_at.desc())
        .first()
    )
    if not reading:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No OBD readings found for vehicle")
    return reading

@router.get("/obd/{vehicle_id}/history", response_model=List[schemas.OBDReadingResponse])
def get_obd_history(
    vehicle_id: int,
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    readings = (
        db.query(models.OBDReading)
        .filter(models.OBDReading.vehicle_id == vehicle_id)
        .order_by(models.OBDReading.recorded_at.desc())
        .limit(limit)
        .all()
    )
    return list(reversed(readings))

@router.post("/obd/{vehicle_id}/simulate/start")
async def start_simulation(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    started = obd_manager.start_simulation(vehicle_id)
    return {
        "status": "success",
        "simulating": True,
        "message": f"OBD simulation {'started' if started else 'already active'} for vehicle {vehicle_id}"
    }

@router.post("/obd/{vehicle_id}/simulate/stop")
async def stop_simulation(vehicle_id: int, db: Session = Depends(get_db)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")

    stopped = obd_manager.stop_simulation(vehicle_id)
    return {
        "status": "success",
        "simulating": False,
        "message": f"OBD simulation {'stopped' if stopped else 'was not active'} for vehicle {vehicle_id}"
    }

@router.get("/obd/{vehicle_id}/simulate/status")
def get_simulation_status(vehicle_id: int):
    is_active = obd_manager.is_simulating(vehicle_id)
    return {
        "vehicle_id": vehicle_id,
        "simulating": is_active
    }

@router.websocket("/ws/obd/{vehicle_id}")
async def websocket_obd_endpoint(websocket: WebSocket, vehicle_id: int):
    await obd_manager.connect_websocket(vehicle_id, websocket)
    try:
        # Keep connection open and respond to any client pings
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        obd_manager.disconnect_websocket(vehicle_id, websocket)
    except Exception:
        obd_manager.disconnect_websocket(vehicle_id, websocket)
