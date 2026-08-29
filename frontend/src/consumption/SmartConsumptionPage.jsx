import { useMemo, useState } from 'react'
import './consumption.css'
import MetricCard from '../components/MetricCard'
import ConsumptionChart from './ConsumptionChart'
import { MOCK_HISTORY } from './mockHistory'
import {
  analyzeConsumption,
  buildInsight,
  EMPTY_CYLINDER_WEIGHT_KG,
  formatRemainingDays,
  lpgRemainingFromTotal,
  trendLabel,
} from './analysis'

const DAY_MS = 86_400_000

function fmtKg(n, digits = 2) {
  return n == null || !Number.isFinite(n) ? '—' : `${n.toFixed(digits)} kg`
}

export default function SmartConsumptionPage() {
  // The readings ARE the state. Every displayed number is derived from this
  // array, so editing it (via "Simulate new reading") updates everything.
  const [readings, setReadings] = useState(MOCK_HISTORY)
  const [draftTotal, setDraftTotal] = useState('')

  const analysis = useMemo(() => analyzeConsumption(readings), [readings])
  const insight = useMemo(() => buildInsight(analysis), [analysis])

  const {
    status,
    points,
    usageSteps,
    dailyUsageValues,
    currentLpgKg,
    previousLpgKg,
    consumedSincePreviousKg,
    averageDailyConsumptionKg,
    overallAverageKg,
    estimatedRemainingDays,
    trend,
    abnormal,
  } = analysis

  const remainingLabel = formatRemainingDays(estimatedRemainingDays)

  // ---- demo control: add a new reading -------------------------------------
  const draftNum = Number.parseFloat(draftTotal)
  const draftValid = Number.isFinite(draftNum) && draftNum > EMPTY_CYLINDER_WEIGHT_KG
  const draftLpg = draftValid ? lpgRemainingFromTotal(draftNum) : null

  function addReading(e) {
    e.preventDefault()
    if (!draftValid) return
    setReadings((prev) => {
      const lastTs = prev.length
        ? new Date(prev[prev.length - 1].timestamp).getTime()
        : Date.now()
      const ts = new Date(lastTs + DAY_MS)
      return [
        ...prev,
        {
          id: `sim-${prev.length + 1}-${ts.getTime()}`,
          source: 'DEMO_SIMULATED',
          dayLabel: `Day ${prev.length + 1}`,
          date: ts.toISOString().slice(0, 10),
          timestamp: ts.toISOString(),
          total_cylinder_weight_kg: Number(draftNum.toFixed(2)),
        },
      ]
    })
    setDraftTotal('')
  }

  function resetDemo() {
    setReadings(MOCK_HISTORY)
    setDraftTotal('')
  }

  // ---- summary card values (all derived) ---------------------------------
  const currentCard = {
    value: currentLpgKg != null ? currentLpgKg.toFixed(1) : '—',
    unit: currentLpgKg != null ? 'kg' : '',
  }

  let dailyCard = { value: '—', unit: '', hint: '' }
  if (status === 'COLLECTING') dailyCard = { value: '—', unit: '', hint: 'Collecting data…' }
  else if (status === 'NEED_MORE_DATA') dailyCard = { value: '—', unit: '', hint: 'Need more data' }
  else if (averageDailyConsumptionKg != null)
    dailyCard = {
      value: averageDailyConsumptionKg.toFixed(1),
      unit: 'kg/day',
      hint: `${dailyUsageValues.length}-reading moving average`,
    }

  let remainingCard = { value: '—', unit: '', hint: '' }
  if (status === 'COLLECTING') remainingCard = { value: '—', unit: '', hint: 'Collecting data…' }
  else if (status === 'NEED_MORE_DATA')
    remainingCard = { value: '—', unit: '', hint: 'Need more data' }
  else if (status === 'CANNOT_ESTIMATE')
    remainingCard = { value: '—', unit: '', hint: 'Unable to estimate' }
  else if (remainingLabel != null)
    remainingCard = {
      value: remainingLabel,
      unit: 'days',
      hint: `${currentLpgKg.toFixed(1)} kg ÷ ${averageDailyConsumptionKg.toFixed(1)} kg/day`,
    }

  const trendIsData = trend !== 'INSUFFICIENT_DATA'
  const trendCard = {
    value: trendIsData ? trendLabel(trend) : '—',
    flag: abnormal.detected ? 'critical' : trend === 'HIGH' ? 'warning' : trend === 'LOW' ? 'warning' : 'normal',
    hint: trendIsData
      ? `recent ${abnormal.recentAvgKg?.toFixed(2)} vs ${abnormal.baselineAvgKg?.toFixed(2)} kg/day`
      : 'Need ≥ 2 daily readings',
  }

  return (
    <div className="sc-page">
      <header className="sc-head">
        <div>
          <h1 className="sc-head__title">SMART CONSUMPTION INTELLIGENCE</h1>
          <p className="sc-head__sub">
            Analyze LPG usage patterns and estimate remaining duration
          </p>
        </div>
        <span className="sc-badge" title="These readings are demo data, not live sensor history">
          ◆ DEMO / MOCK DATA
        </span>
      </header>

      {abnormal.detected && (
        <div className="sc-abnormal" role="status">
          <strong>⚠ ABNORMAL USAGE DETECTED</strong> — Recent LPG consumption is significantly
          higher than the historical average ({abnormal.recentAvgKg?.toFixed(2)} kg/day vs{' '}
          {abnormal.baselineAvgKg?.toFixed(2)} kg/day baseline). This is a usage anomaly
          indicator, not a gas-leak detection — leak detection remains the safety engine&apos;s job.
        </div>
      )}

      {/* ---- 4 summary cards ------------------------------------------- */}
      <div className="sc-cards">
        <MetricCard label="Current LPG" value={currentCard.value} unit={currentCard.unit} />
        <MetricCard
          label="Daily Consumption"
          value={dailyCard.value}
          unit={dailyCard.unit}
          hint={dailyCard.hint}
        />
        <MetricCard
          label="Estimated Remaining"
          value={remainingCard.value}
          unit={remainingCard.unit}
          hint={remainingCard.hint}
        />
        <MetricCard
          label="Usage Trend"
          value={trendCard.value}
          flagLevel={trendCard.flag}
          hint={trendCard.hint}
        />
      </div>

      {/* ---- chart + consumption analysis ---------------------------- */}
      <div className="sc-grid">
        <ConsumptionChart points={points} />

        <section className="panel" aria-label="Consumption analysis">
          <div className="panel__header">
            <h2 className="panel__title">Consumption Analysis</h2>
            <span className="panel__hint">derived</span>
          </div>
          <div className="sc-analysis__list">
            <Row k="Previous LPG" v={fmtKg(previousLpgKg)} />
            <Row k="Current LPG" v={fmtKg(currentLpgKg)} />
            <Row k="Consumed" v={fmtKg(consumedSincePreviousKg)} />
            <Row
              k="Average Daily Usage"
              v={averageDailyConsumptionKg != null ? `${averageDailyConsumptionKg.toFixed(2)} kg/day` : '—'}
            />
            <Row
              k="Overall Average"
              v={overallAverageKg != null ? `${overallAverageKg.toFixed(2)} kg/day` : '—'}
            />
            <Row
              k="Estimated Remaining"
              v={remainingLabel != null ? `${remainingLabel} days` : remainingCard.hint || '—'}
            />
          </div>
        </section>
      </div>

      {/* ---- smart insight ----------------------------------------- */}
      <section className="panel sc-insight" aria-label="Smart insight">
        <span className="sc-insight__icon" aria-hidden="true">
          🧠
        </span>
        <div>
          <h2 className="sc-insight__title">Smart Insight</h2>
          <p className="sc-insight__text">{insight}</p>
        </div>
      </section>

      {/* ---- historical table ------------------------------------- */}
      <section className="panel" aria-label="Historical readings">
        <div className="panel__header">
          <h2 className="panel__title">Historical Readings</h2>
          <span className="panel__hint">{points.length} readings</span>
        </div>
        <div className="sc-table__wrap">
          <table className="sc-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Day</th>
                <th>Total Cyl. Wt</th>
                <th>LPG Remaining</th>
                <th>Daily Usage</th>
              </tr>
            </thead>
            <tbody>
              {points.length === 0 ? (
                <tr>
                  <td colSpan={5}>Collecting data…</td>
                </tr>
              ) : (
                points.map((p, i) => {
                  const step = i > 0 ? usageSteps[i - 1] : null
                  return (
                    <tr key={p.id}>
                      <td>{p.date}</td>
                      <td>{p.dayLabel}</td>
                      <td>{p.totalCylinderWeightKg.toFixed(2)} kg</td>
                      <td>{p.lpgRemainingKg.toFixed(2)} kg</td>
                      <td>
                        {p.dailyUsageKg == null ? (
                          '—'
                        ) : (
                          <>
                            {p.dailyUsageKg.toFixed(2)} kg
                            {step?.anomaly && (
                              <span className="sc-table__anom"> · {step.anomaly}</span>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---- demo control: simulate a new reading ---------------- */}
      <section className="panel sc-sim" aria-label="Simulate new reading">
        <div className="panel__header">
          <h2 className="panel__title">Simulate New Reading</h2>
          <span className="panel__hint">demo control</span>
        </div>
        <form className="sc-sim__form" onSubmit={addReading}>
          <div className="sc-sim__field">
            <label className="sc-sim__label" htmlFor="sc-total">
              Total cylinder weight (kg)
            </label>
            <input
              id="sc-total"
              className="sc-sim__input"
              type="number"
              step="0.01"
              min={EMPTY_CYLINDER_WEIGHT_KG}
              placeholder={`e.g. ${(EMPTY_CYLINDER_WEIGHT_KG + 4.6).toFixed(1)}`}
              value={draftTotal}
              onChange={(e) => setDraftTotal(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={!draftValid}>
            + Add Reading
          </button>
          <button type="button" className="btn btn--ghost" onClick={resetDemo}>
            Reset demo data
          </button>
          <span className="sc-sim__hint">
            tare {EMPTY_CYLINDER_WEIGHT_KG.toFixed(1)} kg →{' '}
            <span className="sc-sim__derived">
              LPG remaining {draftLpg != null ? `${draftLpg.toFixed(2)} kg` : '—'}
            </span>
          </span>
        </form>
      </section>
    </div>
  )
}

function Row({ k, v }) {
  return (
    <div className="sc-analysis__row">
      <span className="sc-analysis__key">{k}</span>
      <span className="sc-analysis__val">{v}</span>
    </div>
  )
}
