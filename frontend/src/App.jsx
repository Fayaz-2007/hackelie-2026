import { useEffect, useRef, useState } from 'react'
import Header from './components/Header'
import CylinderPanel from './components/CylinderPanel'
import MetricCard from './components/MetricCard'
import WeightChart from './components/WeightChart'
import AlertsLog from './components/AlertsLog'
import BookingBanner from './components/BookingBanner'
import SettingsPanel from './components/SettingsPanel'
import {
  fetchAlerts,
  fetchHistory,
  fetchLatest,
  fetchSettings,
  postBookingInitiated,
  saveSettings,
} from './api'
import { useLiveSocket } from './useLiveSocket'
import { estimateInitialAnalytics, gasFlagLevel, tempFlagLevel, flameFlagLevel } from './thresholds'

const HISTORY_LIMIT = 200
const ALERTS_LIMIT = 100
const BOOKING_DAYS_THRESHOLD = 2

// Auto-scales the "time remaining" unit as the cylinder runs down, so a
// near-empty cylinder reads "22 minutes remaining" instead of "0.0 days".
function formatRemaining(days) {
  if (days == null) return { value: '—', unit: 'remaining' }
  if (days >= 1) return { value: days.toFixed(1), unit: 'days remaining' }

  const hours = days * 24
  if (hours >= 1) return { value: hours.toFixed(1), unit: 'hours remaining' }

  const minutes = Math.round(hours * 60)
  return { value: minutes, unit: 'minutes remaining' }
}

function App() {
  const [latest, setLatest] = useState(null)
  const [analytics, setAnalytics] = useState(null)
  const [history, setHistory] = useState([])
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [settings, setSettings] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const [bookingNote, setBookingNote] = useState(false)
  const toastTimer = useRef(null)

  useEffect(() => {
    let cancelled = false

    async function loadInitial() {
      try {
        const [latestData, historyData, alertsData, settingsData] = await Promise.all([
          fetchLatest(),
          fetchHistory(HISTORY_LIMIT),
          fetchAlerts(ALERTS_LIMIT),
          fetchSettings().catch(() => null),
        ])
        if (cancelled) return
        if (latestData) {
          setLatest(latestData)
          setAnalytics(estimateInitialAnalytics(latestData))
        }
        setHistory(historyData ?? [])
        setAlerts(alertsData ?? [])
        if (settingsData) setSettings(settingsData)
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

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current)
    },
    [],
  )

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
  const daysRemaining = analytics?.days_remaining ?? null
  const remaining = formatRemaining(daysRemaining)

  const showBookingBanner =
    status === 'ALERT' ||
    status === 'DANGER' ||
    (daysRemaining != null && daysRemaining <= BOOKING_DAYS_THRESHOLD)

  const bookingUrgency = status === 'DANGER' ? 'danger' : 'alert'

  function showToast(message) {
    setToast(message)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(null), 4500)
  }

  async function handleBookCylinder() {
    const providerUrl = settings?.provider_booking_url?.trim()
    const mobile = settings?.registered_mobile_number?.trim()

    if (!providerUrl) {
      setSettingsOpen(true)
      showToast('Add your provider booking URL in Settings first')
      return
    }

    if (mobile) {
      try {
        await navigator.clipboard.writeText(mobile)
        showToast('Mobile number copied — paste it in when the booking page asks')
      } catch {
        showToast(`Clipboard blocked — copy your number manually: ${mobile}`)
      }
    }

    try {
      await postBookingInitiated({
        fill_percent: analytics?.fill_percentage ?? null,
        remaining_days: analytics?.days_remaining ?? null,
      })
    } catch (err) {
      console.error('Failed to log booking-initiated event:', err)
    }

    window.open(providerUrl, '_blank', 'noopener')
    setBookingNote(true)
  }

  async function handleSaveSettings(next) {
    const saved = await saveSettings(next)
    setSettings(saved)
  }

  return (
    <div className="app">
      <Header connected={connected} onOpenSettings={() => setSettingsOpen(true)} />

      {showBookingBanner && (
        <div className="booking-banner-wrap">
          <BookingBanner
            urgency={bookingUrgency}
            providerName={settings?.provider_name?.trim() || null}
            note={bookingNote}
            onBook={handleBookCylinder}
          />
        </div>
      )}

      <main className="dashboard">
        <CylinderPanel
          fillPercentage={analytics?.fill_percentage}
          remaining={remaining}
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

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}

      {settingsOpen && (
        <SettingsPanel
          initial={settings}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSaveSettings}
        />
      )}

      {loading && !latest && (
        <div className="boot-overlay">
          <span className="boot-overlay__text">Connecting to SafeLPG backend…</span>
        </div>
      )}
    </div>
  )
}

export default App
