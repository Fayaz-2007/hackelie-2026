import { useEffect, useState } from 'react'
import './pages.css'
import AlertsLog from '../components/AlertsLog'
import { fetchAlerts } from '../api'

// /alerts — full-page view of the same safety alerts the dashboard shows.
// Reuses the existing <AlertsLog> component and the existing GET /api/alerts
// endpoint, so there is no duplicate data source.
export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [state, setState] = useState('loading') // 'loading' | 'ready' | 'error'

  useEffect(() => {
    let cancelled = false
    fetchAlerts(200)
      .then((data) => {
        if (cancelled) return
        setAlerts(Array.isArray(data) ? data : [])
        setState('ready')
      })
      .catch((err) => {
        console.error('Failed to load alerts:', err)
        if (!cancelled) setState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">ALERTS</h1>
          <p className="page__sub">
            Safety events raised by the SmartGuard monitoring engine (flame, gas, temperature,
            low cylinder)
          </p>
        </div>
      </header>

      {state === 'error' ? (
        <div className="panel page__notice">
          Could not reach the backend. Start it with{' '}
          <code>uvicorn backend.main:app --port 8000</code> and reload this page.
        </div>
      ) : state === 'loading' ? (
        <div className="panel page__notice">Loading alerts…</div>
      ) : (
        <AlertsLog alerts={alerts} />
      )}
    </div>
  )
}
