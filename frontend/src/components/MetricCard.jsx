const FLAG_LABEL = {
  warning: 'WARNING',
  critical: 'CRITICAL',
}

export default function MetricCard({ label, value, unit, flagLevel = 'normal', hint }) {
  return (
    <div className={`metric-card metric-card--${flagLevel}`}>
      <div className="metric-card__top">
        <span className="metric-card__label">{label}</span>
        {FLAG_LABEL[flagLevel] && <span className="metric-card__flag">{FLAG_LABEL[flagLevel]}</span>}
      </div>
      <div className="metric-card__value">
        {value}
        {unit && <span className="metric-card__unit">{unit}</span>}
      </div>
      {hint && <div className="metric-card__hint">{hint}</div>}
    </div>
  )
}
