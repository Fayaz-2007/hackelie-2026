import { useEffect, useState } from 'react'
import './pages.css'
import { fetchLatest, fetchSettings, saveSettings } from '../api'
import {
  FULL_GAS_WEIGHT_KG,
  GAS_ABS_THRESHOLD_PPM,
  GAS_WARNING_PPM,
  TARE_WEIGHT_KG,
  TEMP_CRITICAL_C,
  TEMP_WARNING_C,
} from '../thresholds'

// /settings — configurable system information.
//
// Persistence honesty:
//  • Booking section  -> really saved (existing POST /api/settings).
//  • Notifications     -> saved on this device (localStorage). Clearly labelled.
//  • Thresholds / Cylinder -> mirror the firmware + backend constants in
//    thresholds.js / analytics.py. Editable here for illustration only; there
//    is no persistence endpoint for them yet, so nothing is written.

const LS_PUSH = 'safelpg.notifications.push'
const LS_ALERT = 'safelpg.notifications.alert'

function readBool(key, fallback) {
  try {
    const v = localStorage.getItem(key)
    return v === null ? fallback : v === 'true'
  } catch {
    return fallback
  }
}

const THRESHOLD_DEFAULTS = {
  gasWarning: GAS_WARNING_PPM,
  gasDanger: GAS_ABS_THRESHOLD_PPM,
  tempWarning: TEMP_WARNING_C,
  tempDanger: TEMP_CRITICAL_C,
  emptyCylinder: TARE_WEIGHT_KG,
  lpgCapacity: FULL_GAS_WEIGHT_KG,
}

export default function SettingsPage() {
  // ---- Device / connection --------------------------------------------
  const [connection, setConnection] = useState('checking') // 'checking' | 'online' | 'offline'
  useEffect(() => {
    let cancelled = false
    fetchLatest()
      .then(() => !cancelled && setConnection('online'))
      .catch(() => !cancelled && setConnection('offline'))
    return () => {
      cancelled = true
    }
  }, [])

  // ---- Thresholds / cylinder (illustrative, not persisted) ------------
  const [cfg, setCfg] = useState(THRESHOLD_DEFAULTS)
  const cfgDirty = Object.keys(THRESHOLD_DEFAULTS).some(
    (k) => Number(cfg[k]) !== THRESHOLD_DEFAULTS[k],
  )
  const setCfgField = (k) => (e) => setCfg((p) => ({ ...p, [k]: e.target.value }))

  // ---- Notifications (localStorage, per-device) ----------------------
  const [pushOn, setPushOn] = useState(() => readBool(LS_PUSH, true))
  const [alertOn, setAlertOn] = useState(() => readBool(LS_ALERT, true))
  useEffect(() => {
    try {
      localStorage.setItem(LS_PUSH, String(pushOn))
    } catch {
      /* storage unavailable — ignore */
    }
  }, [pushOn])
  useEffect(() => {
    try {
      localStorage.setItem(LS_ALERT, String(alertOn))
    } catch {
      /* storage unavailable — ignore */
    }
  }, [alertOn])

  // ---- Booking (real backend persistence) ---------------------------
  const [booking, setBooking] = useState(null)
  const [bookingState, setBookingState] = useState('loading') // loading | ready | error
  const [bookingSaving, setBookingSaving] = useState(false)
  const [bookingSaved, setBookingSaved] = useState(false)
  useEffect(() => {
    let cancelled = false
    fetchSettings()
      .then((s) => {
        if (cancelled) return
        setBooking({
          registered_mobile_number: s?.registered_mobile_number ?? '',
          provider_name: s?.provider_name ?? '',
          provider_booking_url: s?.provider_booking_url ?? '',
        })
        setBookingState('ready')
      })
      .catch((err) => {
        console.error('Failed to load settings:', err)
        if (!cancelled) setBookingState('error')
      })
    return () => {
      cancelled = true
    }
  }, [])

  const setBookingField = (k) => (e) => {
    setBooking((p) => ({ ...p, [k]: e.target.value }))
    setBookingSaved(false)
  }

  async function handleBookingSave(e) {
    e.preventDefault()
    if (!booking) return
    setBookingSaving(true)
    try {
      const saved = await saveSettings({
        registered_mobile_number: booking.registered_mobile_number.trim(),
        provider_name: booking.provider_name.trim(),
        provider_booking_url: booking.provider_booking_url.trim(),
      })
      setBooking({
        registered_mobile_number: saved.registered_mobile_number ?? '',
        provider_name: saved.provider_name ?? '',
        provider_booking_url: saved.provider_booking_url ?? '',
      })
      setBookingSaved(true)
    } catch (err) {
      console.error('Failed to save settings:', err)
      setBookingState('error')
    } finally {
      setBookingSaving(false)
    }
  }

  return (
    <div className="page">
      <header className="page__head">
        <div>
          <h1 className="page__title">SETTINGS</h1>
          <p className="page__sub">Device information, safety thresholds and notification preferences</p>
        </div>
      </header>

      {/* -------- Device -------- */}
      <section className="panel settings-section" aria-label="Device">
        <div className="panel__header">
          <h2 className="panel__title">Device</h2>
        </div>
        <div className="settings-row">
          <span className="settings-row__key">
            Device Name <span className="settings-tag">mock</span>
          </span>
          <span className="settings-row__val">SafeLPG Kitchen Unit</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__key">
            Device ID <span className="settings-tag">mock</span>
          </span>
          <span className="settings-row__val">SLPG-ESP32-0001</span>
        </div>
        <div className="settings-row">
          <span className="settings-row__key">Connection Status</span>
          <span className="settings-row__val">
            <span
              className={`status-dot ${connection === 'online' ? 'status-dot--ok' : 'status-dot--down'}`}
            />
            {connection === 'checking'
              ? 'Checking…'
              : connection === 'online'
                ? 'Backend online'
                : 'Backend offline'}
          </span>
        </div>
        <p className="settings-note">
          Device name and ID are placeholders until the ESP32 reports its own identity.
        </p>
      </section>

      {/* -------- Safety Thresholds -------- */}
      <section className="panel settings-section" aria-label="Safety thresholds">
        <div className="panel__header">
          <h2 className="panel__title">Safety Thresholds</h2>
          {cfgDirty && (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setCfg(THRESHOLD_DEFAULTS)}
            >
              Reset to defaults
            </button>
          )}
        </div>
        <ConfigRow label="Gas Warning Threshold" unit="ppm" value={cfg.gasWarning} onChange={setCfgField('gasWarning')} />
        <ConfigRow label="Gas Danger Threshold" unit="ppm" value={cfg.gasDanger} onChange={setCfgField('gasDanger')} />
        <ConfigRow label="Temperature Warning" unit="°C" value={cfg.tempWarning} onChange={setCfgField('tempWarning')} />
        <ConfigRow label="Temperature Danger" unit="°C" value={cfg.tempDanger} onChange={setCfgField('tempDanger')} />
        <p className="settings-note">
          These mirror the constants in <code>frontend/src/thresholds.js</code> and{' '}
          <code>backend/analytics.py</code>. Editing here is a local preview for the demo — there is
          no persistence endpoint yet, so nothing is saved.
        </p>
      </section>

      {/* -------- Cylinder -------- */}
      <section className="panel settings-section" aria-label="Cylinder">
        <div className="panel__header">
          <h2 className="panel__title">Cylinder</h2>
        </div>
        <ConfigRow label="Empty Cylinder Weight (tare)" unit="kg" value={cfg.emptyCylinder} onChange={setCfgField('emptyCylinder')} />
        <ConfigRow label="LPG Capacity (full)" unit="kg" value={cfg.lpgCapacity} onChange={setCfgField('lpgCapacity')} />
        <p className="settings-note">
          Standard 14.2 kg domestic cylinder. Preview only — same non-persistence note as above.
        </p>
      </section>

      {/* -------- Notifications -------- */}
      <section className="panel settings-section" aria-label="Notifications">
        <div className="panel__header">
          <h2 className="panel__title">Notifications</h2>
          <span className="panel__hint">saved on this device</span>
        </div>
        <div className="settings-row">
          <label className="settings-toggle" htmlFor="notif-push">
            <input
              id="notif-push"
              type="checkbox"
              checked={pushOn}
              onChange={(e) => setPushOn(e.target.checked)}
            />
            Push Notifications
          </label>
          <span className="settings-row__val">{pushOn ? 'On' : 'Off'}</span>
        </div>
        <div className="settings-row">
          <label className="settings-toggle" htmlFor="notif-alert">
            <input
              id="notif-alert"
              type="checkbox"
              checked={alertOn}
              onChange={(e) => setAlertOn(e.target.checked)}
            />
            Alert Notifications
          </label>
          <span className="settings-row__val">{alertOn ? 'On' : 'Off'}</span>
        </div>
        <p className="settings-note">
          Stored in this browser via <code>localStorage</code>. The safety buzzer/LED/OLED on the
          device are local and always active regardless of this setting.
        </p>
      </section>

      {/* -------- Booking (really persisted) -------- */}
      <section className="panel settings-section" aria-label="Booking">
        <div className="panel__header">
          <h2 className="panel__title">Booking</h2>
          <span className="panel__hint">saved to backend</span>
        </div>

        {bookingState === 'error' ? (
          <p className="page__notice">
            Could not reach the backend. Start it with{' '}
            <code>uvicorn backend.main:app --port 8000</code> and reload.
          </p>
        ) : bookingState === 'loading' || !booking ? (
          <p className="page__notice">Loading…</p>
        ) : (
          <form className="modal__form" onSubmit={handleBookingSave}>
            <label className="field">
              <span className="field__label">Registered mobile number</span>
              <input
                className="field__input"
                type="tel"
                value={booking.registered_mobile_number}
                onChange={setBookingField('registered_mobile_number')}
                placeholder="9876543210"
                autoComplete="tel"
              />
            </label>
            <label className="field">
              <span className="field__label">Provider name</span>
              <input
                className="field__input"
                type="text"
                value={booking.provider_name}
                onChange={setBookingField('provider_name')}
                placeholder="Indane / HP Gas / Bharat Gas"
              />
            </label>
            <label className="field">
              <span className="field__label">Provider booking URL</span>
              <input
                className="field__input"
                type="url"
                value={booking.provider_booking_url}
                onChange={setBookingField('provider_booking_url')}
                placeholder="https://cx.indianoil.in/"
              />
            </label>
            <div className="modal__actions">
              {bookingSaved && <span className="field__hint">Saved ✓</span>}
              <button type="submit" className="btn btn--primary" disabled={bookingSaving}>
                {bookingSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

function ConfigRow({ label, unit, value, onChange }) {
  return (
    <div className="settings-row">
      <span className="settings-row__key">{label}</span>
      <span>
        <input
          className="settings-row__input"
          type="number"
          step="any"
          value={value}
          onChange={onChange}
          aria-label={label}
        />
        <span className="settings-tag">{unit}</span>
      </span>
    </div>
  )
}
