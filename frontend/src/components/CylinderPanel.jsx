import FillGauge from './FillGauge'
import StatusPill from './StatusPill'

const STATUS_COLOR_VAR = {
  SAFE: 'var(--status-good)',
  ALERT: 'var(--status-warning)',
  DANGER: 'var(--status-critical)',
}

export default function CylinderPanel({ fillPercentage, remaining, status }) {
  const color = STATUS_COLOR_VAR[status] ?? STATUS_COLOR_VAR.SAFE
  const pct = fillPercentage ?? 0
  const value = remaining?.value ?? '—'
  const unit = remaining?.unit ?? 'remaining'

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
          <span className="cylinder-panel__days-value">{value}</span>
          <span className="cylinder-panel__days-label">{unit}</span>
        </div>
      </div>
    </section>
  )
}
