const fmtT = (n) => {
  if (!n) return '0'
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}
const fmtCost = (n) => n != null ? `$${n.toFixed(2)}` : '—'

const MODEL_LABELS = {
  'claude-opus-4-6':           'Opus 4',
  'claude-sonnet-4-6':         'Sonnet 4.6',
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
}
const MODEL_COLORS = {
  'claude-opus-4-6':           '#7C3AED',
  'claude-sonnet-4-6':         '#0891B2',
  'claude-haiku-4-5-20251001': '#059669',
}

import InfoTooltip, { TOKEN_DESCRIPTIONS } from './InfoTooltip'

export default function ModelBreakdown({ modelUsage }) {
  const rows    = Object.entries(modelUsage).sort((a, b) => (b[1].cost_usd ?? 0) - (a[1].cost_usd ?? 0))
  const maxCost = Math.max(...rows.map(([, u]) => u.cost_usd ?? 0), 1)

  return (
    <div className="table-box">
      <div style={{ padding: '16px 20px 12px' }} className="section-title">Model Breakdown</div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Model</th>
              <th>Input <InfoTooltip text={TOKEN_DESCRIPTIONS['Input Tokens']} /></th>
              <th>Output <InfoTooltip text={TOKEN_DESCRIPTIONS['Output Tokens']} /></th>
              <th>Cache Write <InfoTooltip text={TOKEN_DESCRIPTIONS['Cache Write']} /></th>
              <th>Cache Read <InfoTooltip text={TOKEN_DESCRIPTIONS['Cache Read']} /></th>
              <th>Est. Cost</th>
              <th style={{ width: 140 }}>Cost Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([model, u]) => {
              const color  = MODEL_COLORS[model] ?? '#8b949e'
              const barPct = ((u.cost_usd ?? 0) / maxCost * 100).toFixed(1) + '%'
              return (
                <tr key={model}>
                  <td><span className="badge" style={{ background: color + '33', color }}>{MODEL_LABELS[model] ?? model}</span></td>
                  <td>{fmtT(u.input_tokens)}</td>
                  <td>{fmtT(u.output_tokens)}</td>
                  <td>{fmtT(u.cache_creation_tokens)}</td>
                  <td>{fmtT(u.cache_read_tokens)}</td>
                  <td style={{ color: '#D97706', fontWeight: 600 }}>{fmtCost(u.cost_usd)}</td>
                  <td>
                    <div className="model-bar-bg">
                      <div className="model-bar-fill" style={{ width: barPct, background: color }} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
