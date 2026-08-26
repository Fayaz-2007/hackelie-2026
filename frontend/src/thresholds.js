// Mirrors the constants in backend/analytics.py so the gauge/status has a
// sensible value immediately from the initial REST fetch, before the first
// WebSocket broadcast (which carries the backend's authoritative analytics).
export const TARE_WEIGHT_KG = 15.3
export const FULL_GAS_WEIGHT_KG = 14.2
export const GAS_ABS_THRESHOLD_PPM = 1000
export const LOW_FILL_PERCENT_ALERT = 5

// Frontend-only visual thresholds for flagging metric cards (not alerting).
export const GAS_WARNING_PPM = 400
export const TEMP_WARNING_C = 45
export const TEMP_CRITICAL_C = 60

export function estimateInitialAnalytics(reading) {
  if (!reading) return null
  const fillPercentage = Math.max(
    0,
    Math.min(100, ((reading.weight_kg - TARE_WEIGHT_KG) / FULL_GAS_WEIGHT_KG) * 100),
  )
  const leakDetected = reading.gas_ppm >= GAS_ABS_THRESHOLD_PPM
  let status = 'SAFE'
  if (reading.flame_detected) status = 'DANGER'
  else if (leakDetected || fillPercentage < LOW_FILL_PERCENT_ALERT) status = 'ALERT'

  return {
    status,
    fill_percentage: fillPercentage,
    burn_rate_kg_per_day: null,
    days_remaining: null,
    leak_detected: leakDetected,
    gas_z_score: null,
    abnormal_usage_detected: false,
  }
}

export function gasFlagLevel(gasPpm, leakDetected) {
  if (gasPpm == null) return 'normal'
  if (leakDetected || gasPpm >= GAS_ABS_THRESHOLD_PPM) return 'critical'
  if (gasPpm >= GAS_WARNING_PPM) return 'warning'
  return 'normal'
}

export function tempFlagLevel(tempC) {
  if (tempC == null) return 'normal'
  if (tempC >= TEMP_CRITICAL_C) return 'critical'
  if (tempC >= TEMP_WARNING_C) return 'warning'
  return 'normal'
}

export function flameFlagLevel(flameDetected) {
  return flameDetected ? 'critical' : 'normal'
}
