import { useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

const SHORT_PERIODS = new Set(['12H', '1D'])

export default function DailyChart({ dailyActivity, hourlyActivity, period }) {
  const [showCost, setShowCost] = useState(false)

  const useHourly = SHORT_PERIODS.has(period) && hourlyActivity?.length > 0

  const data = useHourly
    ? hourlyActivity.map(d => ({
        label:    d.hour.slice(11, 16),  // "HH:MM"
        messages: d.messageCount  ?? 0,
        sessions: d.sessionCount  ?? 0,
      }))
    : dailyActivity.map(d => ({
        label:    d.date ? d.date.slice(5) : '',
        messages: d.messageCount  ?? 0,
        sessions: d.sessionCount  ?? 0,
        cost:     d.cost_usd      ?? 0,
      }))

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
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
          <XAxis dataKey="label" tick={{ fill: '#8b949e', fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis tick={{ fill: '#8b949e', fontSize: 11 }} />
          <Tooltip
            contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 6 }}
            labelStyle={{ color: '#e6edf3' }}
            itemStyle={{ color: '#e6edf3' }}
            formatter={(val, name) => name === 'cost' ? [`$${val.toFixed(2)}`, 'Cost'] : [val, name]}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: '#8b949e' }} />
          {showCost && !useHourly
            ? <Line type="monotone" dataKey="cost"     stroke="#D97706" dot={false} strokeWidth={2} name="Cost ($)" />
            : <Line type="monotone" dataKey="messages" stroke="#7C3AED" dot={false} strokeWidth={2} name="Messages" />
          }
          <Line type="monotone" dataKey="sessions" stroke="#0891B2" dot={false} strokeWidth={2} name="Sessions" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
