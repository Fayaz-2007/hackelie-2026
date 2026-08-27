"""SQLite schema, connection handling, and data access for SafeLPG AI."""

import os
import sqlite3
from datetime import datetime, timezone

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "safelpg.db")


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_connection()
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                weight_kg REAL NOT NULL,
                gas_ppm REAL NOT NULL,
                temp_c REAL NOT NULL,
                flame_detected INTEGER NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS alerts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                type TEXT NOT NULL,
                message TEXT NOT NULL,
                severity TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS bookings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT NOT NULL,
                fill_percent REAL,
                remaining_days REAL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                registered_mobile_number TEXT NOT NULL DEFAULT '',
                provider_name TEXT NOT NULL DEFAULT '',
                provider_booking_url TEXT NOT NULL DEFAULT ''
            )
            """
        )
        conn.execute(
            """
            INSERT OR IGNORE INTO settings (id, registered_mobile_number, provider_name, provider_booking_url)
            VALUES (1, '', '', '')
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_readings_timestamp ON readings(timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_bookings_timestamp ON bookings(timestamp)")
        conn.commit()
    finally:
        conn.close()


def _now_iso():
    return datetime.now(timezone.utc).isoformat()


def insert_reading(weight_kg, gas_ppm, temp_c, flame_detected):
    conn = get_connection()
    try:
        timestamp = _now_iso()
        cursor = conn.execute(
            """
            INSERT INTO readings (timestamp, weight_kg, gas_ppm, temp_c, flame_detected)
            VALUES (?, ?, ?, ?, ?)
            """,
            (timestamp, weight_kg, gas_ppm, temp_c, int(bool(flame_detected))),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM readings WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return dict(row)
    finally:
        conn.close()


def insert_alert(alert_type, message, severity):
    conn = get_connection()
    try:
        timestamp = _now_iso()
        cursor = conn.execute(
            """
            INSERT INTO alerts (timestamp, type, message, severity)
            VALUES (?, ?, ?, ?)
            """,
            (timestamp, alert_type, message, severity),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM alerts WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return dict(row)
    finally:
        conn.close()


def get_recent_readings(limit=50):
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM readings ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in reversed(rows)]
    finally:
        conn.close()


def get_latest_reading():
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM readings ORDER BY id DESC LIMIT 1").fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_recent_alerts(limit=50):
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM alerts ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def insert_booking(fill_percent, remaining_days):
    conn = get_connection()
    try:
        timestamp = _now_iso()
        cursor = conn.execute(
            """
            INSERT INTO bookings (timestamp, fill_percent, remaining_days)
            VALUES (?, ?, ?)
            """,
            (timestamp, fill_percent, remaining_days),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM bookings WHERE id = ?", (cursor.lastrowid,)).fetchone()
        return dict(row)
    finally:
        conn.close()


def get_recent_bookings(limit=50):
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM bookings ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
        return [dict(row) for row in rows]
    finally:
        conn.close()


def get_settings():
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
        if row:
            return dict(row)
        return {
            "id": 1,
            "registered_mobile_number": "",
            "provider_name": "",
            "provider_booking_url": "",
        }
    finally:
        conn.close()


def update_settings(registered_mobile_number, provider_name, provider_booking_url):
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO settings (id, registered_mobile_number, provider_name, provider_booking_url)
            VALUES (1, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                registered_mobile_number = excluded.registered_mobile_number,
                provider_name = excluded.provider_name,
                provider_booking_url = excluded.provider_booking_url
            """,
            (registered_mobile_number, provider_name, provider_booking_url),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM settings WHERE id = 1").fetchone()
        return dict(row)
    finally:
        conn.close()
