import { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'

const SHORT_PERIODS = new Set(['12H', '1D'])

function calcAnomaly(data) {
  const costs = data.map(d => d.cost ?? 0).filter(c => c > 0)
  if (costs.length < 3) return { threshold: Infinity, mean: 0 }
  const mean = costs.reduce((a, b) => a + b, 0) / costs.length
  const std  = Math.sqrt(costs.reduce((a, b) => a + (b - mean) ** 2, 0) / costs.length)
  return { threshold: mean + 1.5 * std, mean }
}

const AnomalyDot = (props) => {
  const { cx, cy, payload } = props
  if (!payload?.isAnomaly) return null
  return <circle cx={cx} cy={cy} r={6} fill="#DC2626" stroke="#fff" strokeWidth={1.5} />
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  const p = payload[0]?.payload
  return (
    <div style={{ background: 'var(--surface2)', border: `1px solid ${p?.isAnomaly ? '#DC2626' : 'var(--border)'}`, borderRadius: 8, padding: '10px 14px' }}>
      {p?.isAnomaly && <div style={{ color: '#DC2626', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>⚠️ Unusually high</div>}
      <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{label}</div>
      {payload.map(e => (
        <div key={e.name} style={{ color: e.color, fontSize: 13 }}>
          {e.name}: {e.name === 'Cost ($)' ? `$${Number(e.value).toFixed(2)}` : e.value}
        </div>
      ))}
    </div>
  )
}

export default function DailyChart({ dailyActivity, hourlyActivity, period }) {
  const [showCost, setShowCost] = useState(false)

  const useHourly = SHORT_PERIODS.has(period) && hourlyActivity?.length > 0

  const data = useMemo(() => {
    if (useHourly) {
      return hourlyActivity.map(d => ({
        label:    d.hour.slice(11, 16),
        messages: d.messageCount ?? 0,
        sessions: d.sessionCount ?? 0,
      }))
    }
    const raw = dailyActivity.map(d => ({
      label:    d.date ? d.date.slice(5) : '',
      messages: d.messageCount ?? 0,
      sessions: d.sessionCount ?? 0,
      cost:     d.cost_usd     ?? 0,
    }))
    const { threshold } = calcAnomaly(raw)
    return raw.map(d => ({ ...d, isAnomaly: d.cost > threshold && threshold < Infinity }))
  }, [useHourly, dailyActivity, hourlyActivity])

  const { threshold } = useMemo(() => calcAnomaly(data), [data])
  const hasAnomalies = data.some(d => d.isAnomaly)

  return (
    <div className="chart-box">
      <div className="chart-header">
        <div className="section-title" style={{ marginBottom: 0 }}>
          {useHourly ? 'Hourly Activity' : 'Daily Activity'} — {period}
        </div>
        {!useHourly && (
          <button
            className={`chart-toggle-btn${showCost ? ' active' : ''}`}
            onClick={() => setShowCost(v => !v)}
          >
            {showCost ? 'Messages' : '$ Cost'}
          </button>
        )}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: -10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
          {showCost && !useHourly && hasAnomalies && threshold < Infinity && (
            <ReferenceLine y={threshold} stroke="#DC2626" strokeDasharray="4 4" label={{ value: 'Threshold', fill: '#DC2626', fontSize: 11 }} />
          )}
          {showCost && !useHourly
            ? <Line type="monotone" dataKey="cost" stroke="#D97706" strokeWidth={2} name="Cost ($)" dot={<AnomalyDot />} activeDot={{ r: 4 }} />
            : <Line type="monotone" dataKey="messages" stroke="#7C3AED" dot={false} strokeWidth={2} name="Messages" />
          }
          <Line type="monotone" dataKey="sessions" stroke="#0891B2" dot={false} strokeWidth={2} name="Sessions" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
