import { useEffect, useState } from 'react'

export default function SettingsPanel({ initial, onClose, onSave }) {
  const [mobile, setMobile] = useState(initial?.registered_mobile_number ?? '')
  const [provider, setProvider] = useState(initial?.provider_name ?? '')
  const [url, setUrl] = useState(initial?.provider_booking_url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      await onSave({
        registered_mobile_number: mobile.trim(),
        provider_name: provider.trim(),
        provider_booking_url: url.trim(),
      })
      onClose()
    } catch (err) {
      console.error('Failed to save settings:', err)
      setError('Could not save settings. Is the backend running?')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="Booking settings"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">Booking Settings</h2>
          <button type="button" className="modal__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <p className="modal__intro">
          Enter these once. They are stored locally and used to speed up your cylinder booking.
        </p>

        <form className="modal__form" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Registered mobile number</span>
            <input
              className="field__input"
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="9876543210"
              autoComplete="tel"
            />
          </label>

          <label className="field">
            <span className="field__label">Provider name</span>
            <input
              className="field__input"
              type="text"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="Indane / HP Gas / Bharat Gas"
            />
          </label>

          <label className="field">
            <span className="field__label">Provider booking URL</span>
            <input
              className="field__input"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://cx.indianoil.in/"
            />
            <span className="field__hint">
              Your provider’s real booking page — e.g. cx.indianoil.in, hpgas.in, ebharatgas.com
            </span>
          </label>

          {error && <p className="modal__error">{error}</p>}

          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
