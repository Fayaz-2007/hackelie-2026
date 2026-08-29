import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

// Same palette the existing WeightChart uses, so this reads as one system.
const SERIES_BLUE = '#3987e5'
const GRID = '#2c2c2a'
const AXIS = '#383835'
const MUTED_TEXT = '#898781'
const SURFACE = '#1a1a19'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__time">
        {p.dayLabel} · {p.date}
      </div>
      <div className="chart-tooltip__value">{p.lpgRemainingKg.toFixed(2)} kg LPG remaining</div>
      {p.dailyUsageKg != null && (
        <div className="chart-tooltip__time">−{p.dailyUsageKg.toFixed(2)} kg since previous</div>
      )}
    </div>
  )
}

/**
 * LPG Consumption Trend — X: day, Y: LPG remaining (kg).
 * `points` is exactly the dataset the analytics used (analysis.points),
 * so the line and the numbers can never disagree.
 */
export default function ConsumptionChart({ points }) {
  return (
    <section className="panel" aria-label="LPG consumption trend">
      <div className="panel__header">
        <h2 className="panel__title">LPG Consumption Trend</h2>
        <span className="panel__hint">kg remaining</span>
      </div>
      <div className="sc-chart__body">
        {points.length < 2 ? (
          <div className="chart-empty">Need at least two readings to plot a trend…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="scLine" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_BLUE} stopOpacity={0.28} />
                  <stop offset="100%" stopColor={SERIES_BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="dayLabel"
                stroke={AXIS}
                tick={{ fill: MUTED_TEXT, fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={{ stroke: AXIS }}
                minTickGap={16}
              />
              <YAxis
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
                tickFormatter={(v) => v.toFixed(1)}
                stroke={AXIS}
                tick={{ fill: MUTED_TEXT, fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="lpgRemainingKg"
                stroke={SERIES_BLUE}
                strokeWidth={2}
                fill="url(#scLine)"
                isAnimationActive={false}
                dot={{ r: 3, fill: SERIES_BLUE, stroke: SURFACE, strokeWidth: 1 }}
                activeDot={{ r: 5, fill: SERIES_BLUE, stroke: SURFACE, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
