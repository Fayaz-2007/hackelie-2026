import { useEffect, useState } from 'react'
import Header from './components/Header'
import CylinderPanel from './components/CylinderPanel'
import MetricCard from './components/MetricCard'
import WeightChart from './components/WeightChart'
import AlertsLog from './components/AlertsLog'
import { fetchAlerts, fetchHistory, fetchLatest } from './api'
import { useLiveSocket } from './useLiveSocket'
import { estimateInitialAnalytics, gasFlagLevel, tempFlagLevel, flameFlagLevel } from './thresholds'

const HISTORY_LIMIT = 200
const ALERTS_LIMIT = 100

function App() {
  const [latest, setLatest] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [history, setHistory] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      try {
        const [latestData, historyData, alertsData] = await Promise.all([
          fetchLatest(),
          fetchHistory(HISTORY_LIMIT),
          fetchAlerts(ALERTS_LIMIT),
        ])
        if (cancelled) return
        if (latestData) {
          setLatest(latestData)
          setAnalytics(estimateInitialAnalytics(latestData))
        }
        setHistory(historyData ?? [])
        setAlerts(alertsData ?? [])
      } catch (err) {
        console.error('Failed to load initial state from backend:', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadInitial()
    return () => {
      cancelled = true
    }
  }, [])

  const connected = useLiveSocket((payload) => {
    setLatest(payload.reading)
    setAnalytics(payload.analytics)

    setHistory((prev) => {
      const next = [...prev, payload.reading]
      return next.length > HISTORY_LIMIT ? next.slice(next.length - HISTORY_LIMIT) : next
    })

    if (payload.alerts?.length) {
      setAlerts((prev) => {
        const merged = [...payload.alerts, ...prev]
        return merged.length > ALERTS_LIMIT ? merged.slice(0, ALERTS_LIMIT) : merged
      })
    }
  })

  const status = analytics?.status ?? 'SAFE'

  return (
    <div className="app">
      <Header connected={connected} />

      <main className="dashboard">
        <CylinderPanel
          fillPercentage={analytics?.fill_percentage}
          daysRemaining={analytics?.days_remaining}
          status={status}
        />

        <div className="dashboard__metrics">
          <MetricCard
            label="Gas Concentration"
            value={latest ? Math.round(latest.gas_ppm) : '—'}
            unit={latest ? 'ppm' : ''}
            flagLevel={latest ? gasFlagLevel(latest.gas_ppm, analytics?.leak_detected) : 'normal'}
          />
          <MetricCard
            label="Temperature"
            value={latest ? latest.temp_c.toFixed(1) : '—'}
            unit={latest ? '°C' : ''}
            flagLevel={latest ? tempFlagLevel(latest.temp_c) : 'normal'}
          />
          <MetricCard
            label="Flame Sensor"
            value={latest ? (latest.flame_detected ? 'DETECTED' : 'CLEAR') : '—'}
            flagLevel={latest ? flameFlagLevel(latest.flame_detected) : 'normal'}
          />
        </div>

        <WeightChart data={history} />

        <AlertsLog alerts={alerts} />
      </main>

      {loading && !latest && (
        <div className="boot-overlay">
          <span className="boot-overlay__text">Connecting to SafeLPG backend…</span>
        </div>
      )}
    </div>
  )
}

export default App
