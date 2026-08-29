// =============================================================================
// LPG consumption analytics  —  pure, data-driven, framework-free.
// =============================================================================
// Given a list of raw readings shaped like:
//     { total_cylinder_weight_kg: Number, timestamp: ISOString, id, date, dayLabel }
// this module derives EVERYTHING the Smart Consumption page renders:
//
//     raw total weight  ->  LPG remaining (minus tare)
//                       ->  per-step consumption (kg/day, from timestamps)
//                       ->  rolling average consumption
//                       ->  estimated remaining days
//                       ->  usage trend + abnormal-usage flag
//
// No value the page shows is hardcoded — change the readings and every
// number recomputes. There is no React and no network access in here.
// =============================================================================

// Empty-cylinder tare for the demo cylinder. The load cell measures the
// TOTAL cylinder weight; usable gas is (total - tare).
export const EMPTY_CYLINDER_WEIGHT_KG = 5.0

const ROLLING_WINDOW = 7 // readings used for the moving-average burn rate
const RECENT_WINDOW = 3 // "recent" usage window for trend / anomaly comparison
const HIGH_TREND_RATIO = 1.25 // recent vs baseline ratio that counts as HIGH usage
const LOW_TREND_RATIO = 0.75 // ...and as LOW usage
const ABNORMAL_RATIO = 1.6 // recent >= 1.6x baseline -> abnormal usage (still NOT a leak)
const NOISE_KG = 0.15 // an "increase" smaller than this is treated as sensor noise

const round1 = (n) => Math.round(n * 10) / 10
const round2 = (n) => Math.round(n * 100) / 100
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Derive usable LPG remaining from a raw TOTAL cylinder weight reading. */
export function lpgRemainingFromTotal(totalKg, emptyKg = EMPTY_CYLINDER_WEIGHT_KG) {
  return round2(totalKg - emptyKg)
}

/** Reject readings that would poison the consumption maths. */
function isValidReading(r) {
  if (!r || !r.timestamp) return false
  const w = r.total_cylinder_weight_kg
  if (typeof w !== 'number' || !Number.isFinite(w)) return false
  if (w <= EMPTY_CYLINDER_WEIGHT_KG) return false // no gas / impossible
  if (w > EMPTY_CYLINDER_WEIGHT_KG + 25) return false // absurdly heavy -> bad reading
  return true
}

function emptyResult(status) {
  return {
    status,
    points: [],
    usageSteps: [],
    dailyUsageValues: [],
    currentLpgKg: null,
    previousLpgKg: null,
    consumedSincePreviousKg: null,
    averageDailyConsumptionKg: null,
    overallAverageKg: null,
    estimatedRemainingDays: null,
    trend: 'INSUFFICIENT_DATA',
    abnormal: { detected: false, recentAvgKg: null, baselineAvgKg: null, ratio: null },
  }
}

function pointOf(r, dailyUsageKg) {
  return {
    id: r.id,
    date: r.date,
    dayLabel: r.dayLabel,
    timestamp: r.timestamp,
    totalCylinderWeightKg: r.total_cylinder_weight_kg,
    lpgRemainingKg: r.lpgRemainingKg,
    dailyUsageKg, // null for the very first point
  }
}

/**
 * Analyse a list of raw readings.
 * @param {Array} rawReadings
 * @param {{ rollingWindow?: number }} [opts]
 */
export function analyzeConsumption(rawReadings, opts = {}) {
  const rollingWindow = opts.rollingWindow ?? ROLLING_WINDOW

  // 1. Keep only valid readings, derive LPG remaining, sort oldest -> newest.
  const valid = (Array.isArray(rawReadings) ? rawReadings : [])
    .filter(isValidReading)
    .map((r) => ({
      ...r,
      _t: new Date(r.timestamp).getTime(),
      lpgRemainingKg: lpgRemainingFromTotal(r.total_cylinder_weight_kg),
    }))
    .filter((r) => Number.isFinite(r._t))
    .sort((a, b) => a._t - b._t)

  if (valid.length === 0) return emptyResult('COLLECTING')
  if (valid.length === 1) {
    return {
      ...emptyResult('NEED_MORE_DATA'),
      points: [pointOf(valid[0], null)],
      currentLpgKg: valid[0].lpgRemainingKg,
    }
  }

  // 2. Consumption between each consecutive pair of readings.
  const usageSteps = []
  for (let i = 1; i < valid.length; i += 1) {
    const prev = valid[i - 1]
    const cur = valid[i]
    const elapsedDays = (cur._t - prev._t) / 86_400_000
    if (elapsedDays <= 0) continue // duplicate / out-of-order timestamp -> skip

    const deltaKg = round2(prev.lpgRemainingKg - cur.lpgRemainingKg)
    let usagePerDayKg = deltaKg / elapsedDays
    let anomaly = null

    if (deltaKg < 0) {
      // LPG appears to have INCREASED. Small -> measurement fluctuation;
      // large -> cylinder was swapped / refilled. Never report negative
      // consumption, and never let it drag the average down.
      anomaly = Math.abs(deltaKg) <= NOISE_KG ? 'fluctuation' : 'refill'
      usagePerDayKg = 0
    }

    usageSteps.push({
      fromId: prev.id,
      toId: cur.id,
      date: cur.date,
      dayLabel: cur.dayLabel,
      elapsedDays: round2(elapsedDays),
      deltaKg,
      dailyUsageKg: round2(usagePerDayKg),
      anomaly, // null | 'fluctuation' | 'refill'
      countsTowardAverage: anomaly === null,
    })
  }

  // 3. Chart-ready points (first reading + one per step).
  const points = [
    pointOf(valid[0], null),
    ...usageSteps.map((s, i) => pointOf(valid[i + 1], s.dailyUsageKg)),
  ]

  const dailyUsageValues = usageSteps
    .filter((s) => s.countsTowardAverage)
    .map((s) => s.dailyUsageKg)

  const last = valid[valid.length - 1]
  const prev = valid[valid.length - 2]
  const currentLpgKg = last.lpgRemainingKg
  const previousLpgKg = prev.lpgRemainingKg
  const consumedSincePreviousKg = round2(Math.max(0, previousLpgKg - currentLpgKg))

  if (dailyUsageValues.length === 0) {
    // Every step was flat or a refill -> no usable consumption signal.
    return {
      ...emptyResult('CANNOT_ESTIMATE'),
      points,
      usageSteps,
      currentLpgKg,
      previousLpgKg,
      consumedSincePreviousKg,
    }
  }

  // 4. Averages. `overall` = every valid step; `average...` = simple moving
  //    average over the most recent `rollingWindow` steps (this is the value
  //    the prediction uses — understandable and reasonably stable).
  const overallAverageKg = round2(mean(dailyUsageValues))
  const rolling = dailyUsageValues.slice(-rollingWindow)
  const averageDailyConsumptionKg = round2(mean(rolling))

  // 5. Trend: recent burn rate vs the baseline that preceded it.
  const recentVals = dailyUsageValues.slice(-RECENT_WINDOW)
  const baselineVals =
    dailyUsageValues.length > RECENT_WINDOW
      ? dailyUsageValues.slice(0, -RECENT_WINDOW)
      : dailyUsageValues
  const recentAvgKg = round2(mean(recentVals))
  const baselineAvgKg = round2(mean(baselineVals))
  const ratio = baselineAvgKg > 0 ? round2(recentAvgKg / baselineAvgKg) : null

  let trend = 'NORMAL'
  if (dailyUsageValues.length < 2 || ratio == null) trend = 'INSUFFICIENT_DATA'
  else if (ratio >= HIGH_TREND_RATIO) trend = 'HIGH'
  else if (ratio <= LOW_TREND_RATIO) trend = 'LOW'

  // 6. Abnormal usage — a stricter version of "HIGH". An anomaly INDICATOR,
  //    explicitly not a gas-leak claim (leak detection is the safety
  //    engine's job and stays independent).
  const abnormalDetected =
    dailyUsageValues.length >= 4 && ratio != null && ratio >= ABNORMAL_RATIO

  // 7. Estimated remaining days = current LPG / average daily consumption.
  //    Guarded against divide-by-zero and non-positive rates.
  let status = 'OK'
  let estimatedRemainingDays = null
  if (averageDailyConsumptionKg <= 0) {
    status = 'CANNOT_ESTIMATE'
  } else {
    estimatedRemainingDays = currentLpgKg / averageDailyConsumptionKg
  }

  return {
    status, // 'OK' | 'COLLECTING' | 'NEED_MORE_DATA' | 'CANNOT_ESTIMATE'
    points,
    usageSteps,
    dailyUsageValues,
    currentLpgKg,
    previousLpgKg,
    consumedSincePreviousKg,
    averageDailyConsumptionKg,
    overallAverageKg,
    estimatedRemainingDays, // Number | null (unrounded; format for display)
    trend, // 'NORMAL' | 'HIGH' | 'LOW' | 'INSUFFICIENT_DATA'
    abnormal: { detected: abnormalDetected, recentAvgKg, baselineAvgKg, ratio },
  }
}

// ---------------------------------------------------------------------------
// Presentation helpers — kept beside the maths so the page stays declarative.
// ---------------------------------------------------------------------------

/** "8" from 8.67 (floors, matching the "≈ 8 days" framing). null -> null. */
export function formatRemainingDays(days) {
  if (days == null || !Number.isFinite(days)) return null
  if (days >= 1000) return '999+'
  return String(Math.floor(days))
}

export function trendLabel(trend) {
  switch (trend) {
    case 'HIGH':
      return 'HIGH'
    case 'LOW':
      return 'LOW'
    case 'NORMAL':
      return 'NORMAL'
    default:
      return 'INSUFFICIENT DATA'
  }
}

/** Human-readable Smart Insight text, generated from the analysis result. */
export function buildInsight(a) {
  if (a.status === 'COLLECTING') {
    return 'Collecting data… add at least two daily readings to estimate the remaining duration.'
  }
  if (a.status === 'NEED_MORE_DATA') {
    return 'Only one reading recorded so far. One more day of data unlocks the consumption estimate.'
  }
  if (a.status === 'CANNOT_ESTIMATE') {
    return 'LPG level is flat or increasing across the recorded readings, so a remaining-duration estimate is not meaningful yet.'
  }
  const rate = round1(a.averageDailyConsumptionKg).toFixed(1)
  const days = formatRemainingDays(a.estimatedRemainingDays)
  return `Your current LPG consumption is approximately ${rate} kg/day. At this rate, the estimated remaining LPG duration is approximately ${days} days.`
}
