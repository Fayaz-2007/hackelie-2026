export default function FillGauge({ percentage, color, size = 208, strokeWidth = 16, children }) {
  const clamped = Math.max(0, Math.min(100, percentage ?? 0))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - clamped / 100)
  const center = size / 2

  return (
    <div className="fill-gauge" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={color} strokeOpacity="0.16" strokeWidth={strokeWidth} />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${center} ${center})`}
          className="fill-gauge__progress"
        />
      </svg>
      <div className="fill-gauge__content">{children}</div>
    </div>
  )
}
