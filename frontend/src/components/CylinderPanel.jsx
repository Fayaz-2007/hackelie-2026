import FillGauge from './FillGauge'
import StatusPill from './StatusPill'

const STATUS_COLOR_VAR = {
  SAFE: 'var(--status-good)',
  ALERT: 'var(--status-warning)',
  DANGER: 'var(--status-critical)',
}

function formatDays(days) {
  if (days === null || days === undefined) return '—'
  if (days < 1) return '<1'
  return days.toFixed(1)
}

export default function CylinderPanel({ fillPercentage, daysRemaining, status }) {
  const color = STATUS_COLOR_VAR[status] ?? STATUS_COLOR_VAR.SAFE
  const pct = fillPercentage ?? 0

  return (
    <section className="panel cylinder-panel" aria-label="Cylinder status">
      <div className="panel__header">
        <h2 className="panel__title">Cylinder Status</h2>
        <StatusPill status={status} />
      </div>

      <div className="cylinder-panel__body">
        <FillGauge percentage={pct} color={color}>
          <span className="cylinder-panel__pct">
            {pct.toFixed(1)}
            <small>%</small>
          </span>
          <span className="cylinder-panel__pct-label">Fill level</span>
        </FillGauge>

        <div className="cylinder-panel__days">
          <span className="cylinder-panel__days-value">{formatDays(daysRemaining)}</span>
          <span className="cylinder-panel__days-label">
            {daysRemaining === null || daysRemaining === undefined ? 'Gathering data…' : 'days remaining'}
          </span>
        </div>
      </div>
    </section>
  )
}
