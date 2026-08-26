import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const SERIES_BLUE = '#3987e5'
const GRID = '#2c2c2a'
const AXIS = '#383835'
const MUTED_TEXT = '#898781'
const SURFACE = '#1a1a19'

function formatTime(ts) {
  const d = new Date(ts)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__time">{formatTime(label)}</div>
      <div className="chart-tooltip__value">{payload[0].value.toFixed(2)} kg</div>
    </div>
  )
}

export default function WeightChart({ data }) {
  return (
    <section className="panel chart-panel" aria-label="Cylinder weight over time">
      <div className="panel__header">
        <h2 className="panel__title">Weight Over Time</h2>
        <span className="panel__hint">kg</span>
      </div>
      <div className="chart-panel__body">
        {data.length === 0 ? (
          <div className="chart-empty">Waiting for readings…</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={SERIES_BLUE} stopOpacity={0.32} />
                  <stop offset="100%" stopColor={SERIES_BLUE} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatTime}
                stroke={AXIS}
                tick={{ fill: MUTED_TEXT, fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={{ stroke: AXIS }}
                minTickGap={48}
              />
              <YAxis
                domain={['dataMin - 0.3', 'dataMax + 0.3']}
                tickFormatter={(v) => v.toFixed(1)}
                stroke={AXIS}
                tick={{ fill: MUTED_TEXT, fontSize: 11, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="weight_kg"
                stroke={SERIES_BLUE}
                strokeWidth={2}
                fill="url(#weightFill)"
                isAnimationActive={false}
                dot={false}
                activeDot={{ r: 4, fill: SERIES_BLUE, stroke: SURFACE, strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}
