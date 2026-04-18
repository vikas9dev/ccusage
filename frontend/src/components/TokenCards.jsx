import InfoTooltip, { TOKEN_DESCRIPTIONS } from './InfoTooltip'

const fmtT = (n) => {
  if (!n) return '0'
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}
const fmtCost = (n) => n ? `$${n.toFixed(2)}` : '$0.00'

const PRICING = {
  'claude-opus-4-6':           { input: 15.0,  output: 75.0,  cw: 18.75, cr: 1.50 },
  'claude-sonnet-4-6':         { input: 3.0,   output: 15.0,  cw: 3.75,  cr: 0.30 },
  'claude-haiku-4-5-20251001': { input: 0.8,   output: 4.0,   cw: 1.00,  cr: 0.08 },
}
const DEF = { input: 3.0, output: 15.0, cw: 3.75, cr: 0.30 }

export default function TokenCards({ modelUsage, period }) {
  let input = 0, output = 0, cacheWrite = 0, cacheRead = 0
  let costIn = 0, costOut = 0, costCW = 0, costCR = 0

  for (const [model, u] of Object.entries(modelUsage)) {
    const p   = PRICING[model] ?? DEF
    input      += u.input_tokens           ?? 0
    output     += u.output_tokens          ?? 0
    cacheWrite += u.cache_creation_tokens  ?? 0
    cacheRead  += u.cache_read_tokens      ?? 0
    costIn  += ((u.input_tokens           ?? 0) * p.input)  / 1e6
    costOut += ((u.output_tokens          ?? 0) * p.output) / 1e6
    costCW  += ((u.cache_creation_tokens  ?? 0) * p.cw)     / 1e6
    costCR  += ((u.cache_read_tokens      ?? 0) * p.cr)     / 1e6
  }

  const total      = input + output + cacheWrite + cacheRead || 1
  const pct        = (n) => ((n / total) * 100).toFixed(1) + '%'
  const cacheHitRate = input + cacheRead > 0
    ? ((cacheRead / (input + cacheRead)) * 100).toFixed(1)
    : '0.0'
  const totalCost  = costIn + costOut + costCW + costCR
  const savedCost  = cacheRead > 0
    ? (cacheRead * (3.0 - 0.30) / 1e6).toFixed(2)  // saved vs re-sending as input (sonnet rates)
    : '0.00'

  const cards = [
    { label: 'Input Tokens',  value: input,      cost: costIn,  color: 'var(--info)',    pct: pct(input) },
    { label: 'Output Tokens', value: output,     cost: costOut, color: 'var(--accent)',  pct: pct(output) },
    { label: 'Cache Write',   value: cacheWrite, cost: costCW,  color: 'var(--warning)', pct: pct(cacheWrite) },
    { label: 'Cache Read',    value: cacheRead,  cost: costCR,  color: 'var(--success)', pct: pct(cacheRead) },
  ]

  return (
    <div className="token-cards-section">
      <div className="token-cards-header">
        <div className="section-title" style={{ marginBottom: 0 }}>Token Usage — {period}</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="savings-badge">
            <span className="savings-label">💰 Saved</span>
            <span className="savings-value">${savedCost}</span>
            <InfoTooltip text={`Estimated savings from prompt caching vs re-sending context as input tokens.`} />
          </div>
          <div className="cache-hit-badge">
            <span className="cache-hit-label">Cache Hit</span>
            <span className="cache-hit-value">{cacheHitRate}%</span>
            <InfoTooltip text={`${cacheHitRate}% of your input context was served from cache.`} />
          </div>
        </div>
      </div>
      <div className="token-cards-grid">
        {cards.map(c => (
          <div className="token-card" key={c.label}>
            <div className="token-card-label">
              {c.label}
              <InfoTooltip text={TOKEN_DESCRIPTIONS[c.label]} />
            </div>
            <div className="token-card-value" style={{ color: c.color }}>{fmtT(c.value)}</div>
            <div className="token-card-bar-bg">
              <div className="token-card-bar-fill" style={{ width: c.pct, background: c.color }} />
            </div>
            <div className="token-card-meta">
              <span>{c.pct} of total</span>
              <span style={{ color: '#D97706', fontWeight: 600 }}>{fmtCost(c.cost)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
