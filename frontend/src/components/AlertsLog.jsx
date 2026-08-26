const SEVERITY_META = {
  critical: { label: 'DANGER', className: 'alert-item--critical' },
  warning: { label: 'WARNING', className: 'alert-item--warning' },
}

function formatTimestamp(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export default function AlertsLog({ alerts }) {
  return (
    <section className="panel alerts-panel" aria-label="Alerts log">
      <div className="panel__header">
        <h2 className="panel__title">Alerts Log</h2>
        <span className="panel__hint">{alerts.length} recent</span>
      </div>
      <div className="alerts-panel__list">
        {alerts.length === 0 ? (
          <div className="alerts-empty">No alerts yet — all readings nominal.</div>
        ) : (
          alerts.map((alert, index) => {
            const meta = SEVERITY_META[alert.severity] ?? SEVERITY_META.warning
            return (
              <div key={alert.id ?? index} className={`alert-item ${meta.className}`}>
                <span className="alert-item__badge">{meta.label}</span>
                <div className="alert-item__body">
                  <p className="alert-item__message">{alert.message}</p>
                  <p className="alert-item__meta">
                    {alert.type} · {formatTimestamp(alert.timestamp)}
                  </p>
                </div>
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}
