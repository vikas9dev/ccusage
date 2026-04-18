import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

const COLORS = ['#7C3AED','#0891B2','#059669','#D97706','#3B82F6','#DC2626','#7C3AED','#0891B2','#059669','#D97706']

export default function TopProjectsChart({ projects, period }) {
  const top10 = projects.slice(0, 10).map(p => ({ name: p.display_name, messages: p.messages }))

  return (
    <div className="chart-box">
      <div className="section-title">Top Projects — {period}</div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={top10} layout="vertical" margin={{ top: 4, right: 20, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#30363d" horizontal={false} />
          <XAxis type="number" tick={{ fill: '#8b949e', fontSize: 11 }} />
          <YAxis type="category" dataKey="name" tick={{ fill: '#e6edf3', fontSize: 12 }} width={90} />
          <Tooltip
            contentStyle={{ background: '#1c2128', border: '1px solid #30363d', borderRadius: 6 }}
            labelStyle={{ color: '#e6edf3' }}
            itemStyle={{ color: '#e6edf3' }}
            formatter={(val) => [val.toLocaleString(), 'Messages']}
          />
          <Bar dataKey="messages" radius={[0, 4, 4, 0]}>
            {top10.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
