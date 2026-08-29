// =============================================================================
// DEMO / MOCK DATA  —  NOT real sensor readings.
// =============================================================================
// This module fabricates a short history of LPG cylinder readings so the
// Smart Consumption Intelligence page has something to analyse during a
// hackathon demo. It deliberately imitates the shape of the REAL pipeline
// that the hardware will eventually feed:
//
//     ESP32 -> HX711 load cell -> TOTAL CYLINDER WEIGHT (kg)
//           -> timestamp -> backend -> historical database
//           -> consumption analytics -> Smart Consumption page
//
// Each entry below is a *total cylinder weight* reading — exactly what a
// load cell physically measures. The usable "LPG remaining" figure is
// DERIVED later in analysis.js by subtracting the empty-cylinder tare;
// nothing here pretends the raw weight is the gas weight.
//
// Values are intentionally slightly irregular (not a perfect straight line)
// so the analytics code is exercised the way noisy real data would exercise
// it. Wire a real API in `SmartConsumptionPage` in place of MOCK_HISTORY to
// go live — the analysis layer does not care where the readings come from.
// =============================================================================

export const MOCK_DATA_SOURCE = 'DEMO_MOCK'

// LPG *remaining* (kg) the demo should walk through, oldest -> newest.
// Drops by a slightly varying 0.55–0.65 kg/day and lands on 5.2 kg "today",
// which is the headline number the page is designed to showcase.
const DEMO_LPG_REMAINING_KG = [10.6, 10.05, 9.4, 8.8, 8.25, 7.6, 7.0, 6.45, 5.8, 5.2]

// Empty-cylinder tare for this demo cylinder. Added back here so each stored
// reading is a realistic TOTAL weight; removed again in analysis.js.
const DEMO_EMPTY_CYLINDER_KG = 5.0

function isoDate(d) {
  return d.toISOString().slice(0, 10)
}

/**
 * Build the demo history ending "today", one reading per day at a fixed
 * clock time so the elapsed gap between consecutive readings is exactly
 * 1.0 day (keeps the timestamp-based rate maths easy to follow).
 */
export function buildMockHistory(now = new Date()) {
  const anchor = new Date(now)
  anchor.setHours(9, 0, 0, 0)
  const n = DEMO_LPG_REMAINING_KG.length

  return DEMO_LPG_REMAINING_KG.map((lpgRemaining, i) => {
    const ts = new Date(anchor)
    ts.setDate(anchor.getDate() - (n - 1 - i))
    return {
      id: `demo-${i + 1}`,
      source: MOCK_DATA_SOURCE,
      dayLabel: `Day ${i + 1}`,
      date: isoDate(ts),
      timestamp: ts.toISOString(),
      // What the HX711 load cell would report:
      total_cylinder_weight_kg: Number((lpgRemaining + DEMO_EMPTY_CYLINDER_KG).toFixed(2)),
    }
  })
}

export const MOCK_HISTORY = buildMockHistory()
