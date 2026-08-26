"""FastAPI backend for SafeLPG AI.

Run from the project root so the sibling `database` package resolves:
    uvicorn backend.main:app --reload --port 8000
"""

from contextlib import asynccontextmanager
from typing import List

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.analytics import ANALYTICS_HISTORY_LIMIT, analyze_reading
from database.db import (
    get_latest_reading,
    get_recent_alerts,
    get_recent_readings,
    init_db,
    insert_alert,
    insert_reading,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(title="SafeLPG AI Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SensorData(BaseModel):
    weight_kg: float
    gas_ppm: float
    temp_c: float
    flame_detected: bool


class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        stale = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)


manager = ConnectionManager()


@app.post("/api/sensor-data")
async def post_sensor_data(data: SensorData):
    reading = insert_reading(data.weight_kg, data.gas_ppm, data.temp_c, data.flame_detected)

    # Everything up to and including `reading` itself, oldest first.
    recent = get_recent_readings(ANALYTICS_HISTORY_LIMIT + 1)
    history = recent[:-1]

    analysis = analyze_reading(reading, history)
    proposed_alerts = analysis.pop("alerts")
    new_alerts = [insert_alert(a["type"], a["message"], a["severity"]) for a in proposed_alerts]

    payload = {
        "reading": reading,
        "status": analysis["status"],
        "analytics": analysis,
        "alerts": new_alerts,
    }
    await manager.broadcast(payload)
    return payload


@app.get("/api/latest")
def get_latest():
    return get_latest_reading()


@app.get("/api/history")
def get_history(limit: int = 50):
    return get_recent_readings(limit)


@app.get("/api/alerts")
def get_alerts(limit: int = 50):
    return get_recent_alerts(limit)


@app.websocket("/ws/live")
async def websocket_live(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
