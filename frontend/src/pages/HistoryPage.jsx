import { useEffect, useMemo, useState } from 'react'
import './pages.css'
import WeightChart from '../components/WeightChart'
import StatusPill from '../components/StatusPill'
import { fetchHistory } from '../api'
import { TARE_WEIGHT_KG, estimateInitialAnalytics } from '../thresholds'

// /history — historical SmartGuard readings from the existing GET /api/history
// endpoint. Reuses <WeightChart>, <StatusPill> and the shared status logic in
// thresholds.js, so it stays compatible with real ESP32/backend data.

function formatWhen(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return String(ts)
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  const sameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  if (sameDay(d, today)) return `Today ${time}`
  if (sameDay(d, yesterday)) return `Yesterday ${time}`
  return `${d.toLocaleDateString([], { month: 'short', day: 'numeric' })} ${time}`
}

function lpgRemainingKg(weightKg) {
  return Math.max(0, weightKg - TARE_WEIGHT_KG)
}

export default function HistoryPage() {
  const [readings, setReadings] = useState([])
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false
    fetchHistory(200)
      .then((data) => {
        if (cancelled) return
        setReadings(Array.isArray(data) ? data : [])
        setState('ready')
      })
      .catch((err) => {
        console.error('Failed to load history:', err)
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  // API returns oldest-first: keep that for the chart, reverse for the table.
  const rows = useMemo(() => [...readings].reverse(), [readings])

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">HISTORY</h1>
          <p className="page__sub">
            Recorded gas, temperature, cylinder weight and safety status over time
          </p>
        </div>
      </header>

      {state === 'error' ? (
        <div className="panel page__notice">
          Could not reach the backend. Start it with{' '}
          <code>uvicorn backend.main:app --port 8000</code> and reload this page.
        </div>
      ) : state === 'loading' ? (
        <div className="panel page__notice">Loading history…</div>
      ) : (
        <>
          <WeightChart data={readings} />

          <section className="panel" aria-label="Reading history">
            <div className="panel__header">
              <h2 className="panel__title">Readings</h2>
              <span className="panel__hint">{rows.length} records</span>
            </div>

            {rows.length === 0 ? (
              <div className="page__notice">No readings recorded yet.</div>
            ) : (
              <div className="page-table__wrap">
                <table className="page-table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th className="page-table__num">Gas (ppm)</th>
                      <th className="page-table__num">Temp (°C)</th>
                      <th className="page-table__num">LPG (kg)</th>
                      <th>Flame</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const status = estimateInitialAnalytics(r)?.status ?? 'SAFE'
                      return (
                        <tr key={r.id}>
                          <td>{formatWhen(r.timestamp)}</td>
                          <td className="page-table__num">{Math.round(r.gas_ppm)}</td>
                          <td className="page-table__num">{r.temp_c.toFixed(1)}</td>
                          <td className="page-table__num">{lpgRemainingKg(r.weight_kg).toFixed(2)}</td>
                          <td>{r.flame_detected ? 'DETECTED' : 'clear'}</td>
                          <td>
                            <StatusPill status={status} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}
