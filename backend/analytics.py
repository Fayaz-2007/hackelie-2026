"""Analytics engine for SafeLPG AI.

Pure computation over readings pulled from database.db — no DB writes here.
backend/main.py calls analyze_reading() on every new reading, persists any
alerts it proposes via database.db.insert_alert, and includes the result in
the HTTP response and the /ws/live broadcast.
"""

import statistics
from datetime import datetime

# --- Standard Indian 14.2kg domestic LPG cylinder ---
TARE_WEIGHT_KG = 15.3
FULL_GAS_WEIGHT_KG = 14.2

# --- Remaining-days prediction ---
MIN_READINGS_FOR_PREDICTION = 5
BURN_RATE_REGRESSION_WINDOW = 50  # most recent readings used for the regression

# --- Leak / anomaly detection ---
GAS_PPM_ABS_THRESHOLD = 1000
ROLLING_ZSCORE_WINDOW = 50  # prior readings used for mean/std, current excluded
ZSCORE_THRESHOLD = 3.0

# --- Abnormal usage detection ---
ABNORMAL_USAGE_RECENT_WINDOW = 10
ABNORMAL_USAGE_MULTIPLIER = 3.0

# --- Overall status ---
LOW_FILL_PERCENT_ALERT = 5.0

# How many past readings main.py should fetch from the DB to feed analyze_reading.
ANALYTICS_HISTORY_LIMIT = 200


def _parse_timestamp(ts):
    return datetime.fromisoformat(ts)


def _linear_regression(xs, ys):
    """Least-squares slope/intercept for y = slope * x + intercept."""
    n = len(xs)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    den = sum((x - mean_x) ** 2 for x in xs)
    if den == 0:
        return 0.0, mean_y
    slope = num / den
    intercept = mean_y - slope * mean_x
    return slope, intercept


def _slope_kg_per_day(timestamps, weights):
    if len(timestamps) < 2:
        return 0.0
    t0 = timestamps[0]
    xs = [(t - t0).total_seconds() / 86400.0 for t in timestamps]
    slope, _ = _linear_regression(xs, weights)
    return slope


def calculate_fill_percentage(weight_kg):
    pct = (weight_kg - TARE_WEIGHT_KG) / FULL_GAS_WEIGHT_KG * 100
    return max(0.0, min(100.0, pct))


def predict_remaining_days(timestamps, weights):
    """Linear regression of weight vs. time -> burn rate and days remaining.

    Returns None if fewer than MIN_READINGS_FOR_PREDICTION readings are given.
    """
    n = len(timestamps)
    if n < MIN_READINGS_FOR_PREDICTION:
        return None

    window = min(n, BURN_RATE_REGRESSION_WINDOW)
    slope = _slope_kg_per_day(timestamps[-window:], weights[-window:])
    burn_rate_kg_per_day = -slope

    if burn_rate_kg_per_day <= 0:
        return {"burn_rate_kg_per_day": round(burn_rate_kg_per_day, 4), "days_remaining": None}

    current_weight = weights[-1]
    days_remaining = max(0.0, (current_weight - TARE_WEIGHT_KG) / burn_rate_kg_per_day)
    return {
        "burn_rate_kg_per_day": round(burn_rate_kg_per_day, 4),
        "days_remaining": round(days_remaining, 2),
    }


def detect_leak(current_gas_ppm, prior_gas_ppms):
    """Absolute threshold + rolling z-score leak/anomaly detection."""
    absolute_exceeded = current_gas_ppm >= GAS_PPM_ABS_THRESHOLD

    z_score = None
    statistical_anomaly = False
    if len(prior_gas_ppms) >= 2:
        mean = statistics.mean(prior_gas_ppms)
        stdev = statistics.stdev(prior_gas_ppms)
        if stdev > 0:
            z_score = (current_gas_ppm - mean) / stdev
            statistical_anomaly = z_score >= ZSCORE_THRESHOLD

    return {
        "absolute_threshold_exceeded": absolute_exceeded,
        "z_score": round(z_score, 2) if z_score is not None else None,
        "statistical_anomaly": statistical_anomaly,
        "is_leak": absolute_exceeded or statistical_anomaly,
    }


def detect_abnormal_usage(timestamps, weights):
    """Compare burn rate over the last N readings vs. all readings before them."""
    n = len(timestamps)
    if n < ABNORMAL_USAGE_RECENT_WINDOW + 2:
        return {
            "recent_burn_rate_kg_per_day": None,
            "prior_burn_rate_kg_per_day": None,
            "is_abnormal": False,
        }

    recent_ts = timestamps[-ABNORMAL_USAGE_RECENT_WINDOW:]
    recent_w = weights[-ABNORMAL_USAGE_RECENT_WINDOW:]
    prior_ts = timestamps[:-ABNORMAL_USAGE_RECENT_WINDOW]
    prior_w = weights[:-ABNORMAL_USAGE_RECENT_WINDOW]

    recent_rate = -_slope_kg_per_day(recent_ts, recent_w)
    prior_rate = -_slope_kg_per_day(prior_ts, prior_w)
    is_abnormal = prior_rate > 0 and recent_rate >= ABNORMAL_USAGE_MULTIPLIER * prior_rate

    return {
        "recent_burn_rate_kg_per_day": round(recent_rate, 4),
        "prior_burn_rate_kg_per_day": round(prior_rate, 4),
        "is_abnormal": is_abnormal,
    }


def analyze_reading(current_reading, history):
    """Run the full analytics engine on a new reading.

    current_reading: the just-inserted reading (dict, as returned by database.db).
    history: prior readings (dicts), oldest first, NOT including current_reading.

    Returns a dict with fill_percentage, burn-rate/days-remaining prediction,
    leak detection, abnormal-usage detection, overall status, and a list of
    proposed alerts ({type, message, severity}) for the caller to persist.
    """
    combined = history + [current_reading]
    timestamps = [_parse_timestamp(r["timestamp"]) for r in combined]
    weights = [r["weight_kg"] for r in combined]

    fill_percentage = calculate_fill_percentage(current_reading["weight_kg"])
    prediction = predict_remaining_days(timestamps, weights)

    prior_gas_ppms = [r["gas_ppm"] for r in history[-ROLLING_ZSCORE_WINDOW:]]
    leak = detect_leak(current_reading["gas_ppm"], prior_gas_ppms)

    usage = detect_abnormal_usage(timestamps, weights)

    flame_detected = bool(current_reading["flame_detected"])

    alerts = []

    if flame_detected:
        alerts.append(
            {"type": "flame", "message": "Flame detected near cylinder!", "severity": "critical"}
        )

    if leak["is_leak"]:
        reasons = []
        if leak["absolute_threshold_exceeded"]:
            reasons.append(f"{current_reading['gas_ppm']} ppm exceeds {GAS_PPM_ABS_THRESHOLD} ppm threshold")
        if leak["statistical_anomaly"]:
            reasons.append(f"z-score {leak['z_score']} >= {ZSCORE_THRESHOLD}")
        alerts.append(
            {
                "type": "gas_leak",
                "message": "Possible gas leak: " + "; ".join(reasons),
                "severity": "critical",
            }
        )

    if fill_percentage < LOW_FILL_PERCENT_ALERT:
        alerts.append(
            {
                "type": "low_cylinder",
                "message": f"Cylinder nearly empty: {fill_percentage:.1f}% remaining",
                "severity": "warning",
            }
        )

    if usage["is_abnormal"]:
        alerts.append(
            {
                "type": "abnormal_usage",
                "message": (
                    f"Abnormal usage: {usage['recent_burn_rate_kg_per_day']} kg/day recently vs. "
                    f"{usage['prior_burn_rate_kg_per_day']} kg/day baseline"
                ),
                "severity": "warning",
            }
        )

    if flame_detected:
        status = "DANGER"
    elif leak["is_leak"] or fill_percentage < LOW_FILL_PERCENT_ALERT:
        status = "ALERT"
    else:
        status = "SAFE"

    return {
        "status": status,
        "fill_percentage": round(fill_percentage, 2),
        "burn_rate_kg_per_day": prediction["burn_rate_kg_per_day"] if prediction else None,
        "days_remaining": prediction["days_remaining"] if prediction else None,
        "leak_detected": leak["is_leak"],
        "gas_z_score": leak["z_score"],
        "abnormal_usage_detected": usage["is_abnormal"],
        "alerts": alerts,
    }
