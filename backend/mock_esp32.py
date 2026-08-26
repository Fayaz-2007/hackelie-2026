"""Simulates the SafeLPG AI ESP32 node (load cell + MQ2 + DHT22 + flame sensor).

Posts realistic sensor readings to the backend at a fixed interval. Weight
declines slowly from a full cylinder toward the empty tare weight, gas ppm
fluctuates around a safe baseline, and a leak or flame event can be injected
at a chosen tick for demo purposes.

Usage:
    python backend/mock_esp32.py
    python backend/mock_esp32.py --trigger-leak-at 10
    python backend/mock_esp32.py --trigger-flame-at 15 --interval 2
"""

import argparse
import random
import sys
import time

import requests

DEFAULT_URL = "http://localhost:8000/api/sensor-data"

STARTING_WEIGHT_KG = 29.5
TARE_WEIGHT_KG = 15.3
GAS_BASELINE_PPM = 80.0
TEMP_BASELINE_C = 29.0
LEAK_SPIKE_PPM = 1500.0
LEAK_DURATION_TICKS = 3
FLAME_DURATION_TICKS = 2


def build_reading(tick, weight_kg, trigger_leak_at, trigger_flame_at):
    gas_ppm = max(0.0, GAS_BASELINE_PPM + random.uniform(-15, 15))
    flame_detected = False

    if trigger_leak_at is not None and trigger_leak_at <= tick < trigger_leak_at + LEAK_DURATION_TICKS:
        gas_ppm = max(0.0, LEAK_SPIKE_PPM + random.uniform(-100, 100))

    if trigger_flame_at is not None and trigger_flame_at <= tick < trigger_flame_at + FLAME_DURATION_TICKS:
        flame_detected = True
        gas_ppm = max(gas_ppm, LEAK_SPIKE_PPM * 0.5)

    temp_c = TEMP_BASELINE_C + random.uniform(-0.5, 0.5)
    if flame_detected:
        temp_c += random.uniform(5, 15)

    return {
        "weight_kg": round(weight_kg, 3),
        "gas_ppm": round(gas_ppm, 1),
        "temp_c": round(temp_c, 1),
        "flame_detected": flame_detected,
    }


def main():
    parser = argparse.ArgumentParser(description="Simulate an ESP32 SafeLPG sensor node.")
    parser.add_argument("--url", default=DEFAULT_URL, help="Backend endpoint to POST sensor data to.")
    parser.add_argument("--interval", type=float, default=3.0, help="Seconds between readings.")
    parser.add_argument("--ticks", type=int, default=0, help="Number of readings to send (0 = run forever).")
    parser.add_argument("--trigger-leak-at", type=int, default=None, help="Tick at which to inject a simulated gas leak spike.")
    parser.add_argument("--trigger-flame-at", type=int, default=None, help="Tick at which to inject a simulated flame event.")
    args = parser.parse_args()

    weight_kg = STARTING_WEIGHT_KG
    tick = 0

    print(f"[mock_esp32] Posting to {args.url} every {args.interval}s (Ctrl+C to stop)")

    try:
        while args.ticks == 0 or tick < args.ticks:
            depletion = random.uniform(0.01, 0.05)
            weight_kg = max(TARE_WEIGHT_KG, weight_kg - depletion)

            reading = build_reading(tick, weight_kg, args.trigger_leak_at, args.trigger_flame_at)

            try:
                response = requests.post(args.url, json=reading, timeout=5)
                response.raise_for_status()
                status = "OK"
            except requests.RequestException as exc:
                status = f"ERROR: {exc}"

            print(
                f"[tick {tick}] weight={reading['weight_kg']}kg gas={reading['gas_ppm']}ppm "
                f"temp={reading['temp_c']}C flame={reading['flame_detected']} -> {status}"
            )

            tick += 1
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\n[mock_esp32] Stopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()
