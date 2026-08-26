const STATUS_LABEL = {
  SAFE: 'Safe',
  ALERT: 'Alert',
  DANGER: 'Danger',
}

export default function StatusPill({ status }) {
  const level = STATUS_LABEL[status] ? status : 'SAFE'
  return (
    <span className={`status-pill status-pill--${level.toLowerCase()}`}>
      <span className="status-pill__dot" aria-hidden="true" />
      {STATUS_LABEL[level]}
    </span>
  )
}
