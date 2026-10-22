from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app import models, schemas
from app.utils.security import get_current_user

router = APIRouter(prefix="/reminders", tags=["Reminders & Alerts"])

@router.get("", response_model=List[schemas.ReminderResponse])
def get_reminders(
    vehicle_id: Optional[int] = Query(None),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    q = db.query(models.Reminder)

    if current_user.role != "admin":
        user_vehicle_ids = [v.id for v in current_user.vehicles]
        q = q.filter(models.Reminder.vehicle_id.in_(user_vehicle_ids))

    if vehicle_id:
        q = q.filter(models.Reminder.vehicle_id == vehicle_id)
    if status:
        q = q.filter(models.Reminder.status == status)

    return q.order_by(models.Reminder.due_date.asc(), models.Reminder.created_at.desc()).all()

@router.post("", response_model=schemas.ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    reminder_in: schemas.ReminderCreate,
    vehicle_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vehicle not found")
    if current_user.role != "admin" and vehicle.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    reminder = models.Reminder(
        vehicle_id=vehicle_id,
        component_id=reminder_in.component_id,
        due_date=reminder_in.due_date,
        due_km=reminder_in.due_km,
        message=reminder_in.message,
        status=reminder_in.status or "Pending"
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)
    return reminder

@router.patch("/{reminder_id}", response_model=schemas.ReminderResponse)
def update_reminder(
    reminder_id: int,
    reminder_in: schemas.ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

    update_data = reminder_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(reminder, key, value)

    db.commit()
    db.refresh(reminder)
    return reminder

@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    reminder = db.query(models.Reminder).filter(models.Reminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")

    db.delete(reminder)
    db.commit()
    return None
