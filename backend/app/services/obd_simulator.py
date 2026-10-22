import asyncio
import random
from datetime import datetime
from typing import Dict, Set, Optional
from fastapi import WebSocket
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

class OBDManager:
    def __init__(self):
        # vehicle_id -> active simulation task
        self.sim_tasks: Dict[int, asyncio.Task] = {}
        # vehicle_id -> set of active WebSocket connections
        self.active_websockets: Dict[int, Set[WebSocket]] = {}
        # vehicle_id -> dynamic state (speed, rpm, etc.)
        self.vehicle_states: Dict[int, Dict[str, float]] = {}

    def get_or_init_state(self, vehicle_id: int) -> Dict[str, float]:
        if vehicle_id not in self.vehicle_states:
            self.vehicle_states[vehicle_id] = {
                "speed_kmh": 45.0,
                "rpm": 2100.0,
                "coolant_temp_c": 91.0,
                "throttle_pct": 28.0,
                "engine_load_pct": 36.0,
                "fuel_level_pct": 74.5,
                "battery_voltage": 14.1,
                "trend": 1.0  # 1 = accelerating, -1 = braking/slowing
            }
        return self.vehicle_states[vehicle_id]

    def generate_next_reading(self, vehicle_id: int) -> Dict[str, float]:
        state = self.get_or_init_state(vehicle_id)

        # Realistic physics fluctuation
        if random.random() < 0.2:
            state["trend"] = -state["trend"]

        speed_delta = (random.uniform(0.5, 4.0) * state["trend"]) + random.uniform(-1.0, 1.0)
        state["speed_kmh"] = max(0.0, min(140.0, state["speed_kmh"] + speed_delta))

        # Correlate RPM and throttle with speed
        if state["speed_kmh"] < 1.0:
            state["rpm"] = round(random.uniform(750, 850), 1)  # Idle
            state["throttle_pct"] = round(random.uniform(2.0, 6.0), 1)
            state["engine_load_pct"] = round(random.uniform(14.0, 20.0), 1)
        else:
            base_rpm = 1000 + (state["speed_kmh"] * 24.0)
            state["rpm"] = round(max(800.0, min(5500.0, base_rpm + random.uniform(-150, 200))), 1)
            state["throttle_pct"] = round(max(5.0, min(95.0, 15.0 + (state["speed_kmh"] * 0.45) + random.uniform(-5, 8))), 1)
            state["engine_load_pct"] = round(max(10.0, min(90.0, 20.0 + (state["throttle_pct"] * 0.6) + random.uniform(-4, 5))), 1)

        # Coolant temp fluctuates realistically around 90-95 C
        state["coolant_temp_c"] = round(max(82.0, min(108.0, state["coolant_temp_c"] + random.uniform(-0.3, 0.4))), 1)

        # Fuel slowly drops
        state["fuel_level_pct"] = round(max(5.0, state["fuel_level_pct"] - 0.005), 2)

        # Battery alternator voltage
        state["battery_voltage"] = round(random.uniform(13.8, 14.3), 2)

        return {
            "rpm": state["rpm"],
            "speed_kmh": round(state["speed_kmh"], 1),
            "coolant_temp_c": state["coolant_temp_c"],
            "throttle_pct": state["throttle_pct"],
            "engine_load_pct": state["engine_load_pct"],
            "fuel_level_pct": state["fuel_level_pct"],
            "battery_voltage": state["battery_voltage"]
        }

    async def connect_websocket(self, vehicle_id: int, websocket: WebSocket):
        await websocket.accept()
        if vehicle_id not in self.active_websockets:
            self.active_websockets[vehicle_id] = set()
        self.active_websockets[vehicle_id].add(websocket)

    def disconnect_websocket(self, vehicle_id: int, websocket: WebSocket):
        if vehicle_id in self.active_websockets:
            self.active_websockets[vehicle_id].discard(websocket)

    async def broadcast_reading(self, vehicle_id: int, data: dict):
        if vehicle_id in self.active_websockets:
            dead_sockets = set()
            for ws in list(self.active_websockets[vehicle_id]):
                try:
                    await ws.send_json(data)
                except Exception:
                    dead_sockets.add(ws)
            for ws in dead_sockets:
                self.active_websockets[vehicle_id].discard(ws)

    def start_simulation(self, vehicle_id: int) -> bool:
        if vehicle_id in self.sim_tasks and not self.sim_tasks[vehicle_id].done():
            return False  # Already running

        async def _sim_loop():
            try:
                while True:
                    reading = self.generate_next_reading(vehicle_id)
                    recorded_at = datetime.utcnow()

                    # Save to DB
                    db: Session = SessionLocal()
                    try:
                        db_reading = models.OBDReading(
                            vehicle_id=vehicle_id,
                            recorded_at=recorded_at,
                            **reading
                        )
                        db.add(db_reading)

                        # Update vehicle odometer by small delta (e.g. speed / 1800 km in 2s)
                        veh = db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()
                        if veh:
                            veh.odometer_km = round(veh.odometer_km + (reading["speed_kmh"] / 1800.0), 3)

                        db.commit()
                    finally:
                        db.close()

                    # Broadcast payload with timestamp
                    payload = {
                        "vehicle_id": vehicle_id,
                        "recorded_at": recorded_at.isoformat(),
                        **reading
                    }
                    await self.broadcast_reading(vehicle_id, payload)
                    await asyncio.sleep(2.0)
            except asyncio.CancelledError:
                pass

        task = asyncio.create_task(_sim_loop())
        self.sim_tasks[vehicle_id] = task
        return True

    def stop_simulation(self, vehicle_id: int) -> bool:
        if vehicle_id in self.sim_tasks and not self.sim_tasks[vehicle_id].done():
            self.sim_tasks[vehicle_id].cancel()
            del self.sim_tasks[vehicle_id]
            return True
        return False

    def is_simulating(self, vehicle_id: int) -> bool:
        return vehicle_id in self.sim_tasks and not self.sim_tasks[vehicle_id].done()

obd_manager = OBDManager()
