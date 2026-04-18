import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#7C3AED','#0891B2','#059669','#D97706','#3B82F6','#DC2626','#7C3AED','#0891B2','#059669','#D97706']

const truncate = (str, n = 14) => str && str.length > n ? str.slice(0, n) + '…' : (str || '—')

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 8, padding: '10px 14px' }}>
      <div style={{ color: '#e6edf3', fontWeight: 600, marginBottom: 4, fontSize: 13 }}>{label}</div>
      <div style={{ color: '#8b949e', fontSize: 13 }}>{payload[0].value.toLocaleString()} messages</div>
    </div>
  )
}

export default function TopProjectsChart({ projects, period }) {
  const top10 = projects.slice(0, 10).map(p => ({
    name: p.display_name || p.path?.split('/').filter(Boolean).pop() || '—',
    messages: p.messages,
  }))

  return (
    <div className="chart-box">
      <div className="section-title">Top Projects — {period}</div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={top10} margin={{ top: 8, right: 16, bottom: 60, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#e6edf3', fontSize: 12 }}
            tickFormatter={(v) => truncate(v, 13)}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis tick={{ fill: '#8b949e', fontSize: 12 }} width={48} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(124,58,237,0.08)' }} />
          <Bar dataKey="messages" radius={[5, 5, 0, 0]} maxBarSize={48}>
            {top10.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
