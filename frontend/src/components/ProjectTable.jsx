import { useState, useMemo } from 'react'
import InfoTooltip, { TOKEN_DESCRIPTIONS } from './InfoTooltip'

const MODEL_SHORT = {
  'claude-opus-4-6':           'Opus',
  'claude-sonnet-4-6':         'Sonnet',
  'claude-haiku-4-5-20251001': 'Haiku',
}
const MODEL_COLOR = {
  'claude-opus-4-6':           '#7C3AED',
  'claude-sonnet-4-6':         '#0891B2',
  'claude-haiku-4-5-20251001': '#059669',
}

const fmtDate   = (iso) => iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'
const fmtCost   = (n)   => n != null ? `$${n.toFixed(2)}` : '—'
const fmtTokens = (n)   => {
  if (!n) return '0'
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)         return (n / 1_000).toFixed(1) + 'K'
  return n.toString()
}

const COLS = [
  { key: 'display_name',          label: 'Project',       tip: null },
  { key: 'messages',              label: 'Messages',       tip: null },
  { key: 'sessions',              label: 'Sessions',       tip: null },
  { key: 'avg_msg_per_session',   label: 'Avg Depth',      tip: 'Average messages per session — higher means longer, more focused conversations.' },
  { key: 'tokens.input',          label: 'Input',          tip: TOKEN_DESCRIPTIONS['Input Tokens'] },
  { key: 'tokens.output',         label: 'Output',         tip: TOKEN_DESCRIPTIONS['Output Tokens'] },
  { key: 'tokens.cache_creation', label: 'Cache Write',    tip: TOKEN_DESCRIPTIONS['Cache Write'] },
  { key: 'tokens.cache_read',     label: 'Cache Read',     tip: TOKEN_DESCRIPTIONS['Cache Read'] },
  { key: 'last_active',           label: 'Last Active',    tip: null },
  { key: 'cost_usd',              label: 'API Equiv. Cost',tip: null },
]

const getVal = (obj, key) => {
  if (key.includes('.')) {
    const [a, b] = key.split('.')
    return obj[a]?.[b] ?? 0
  }
  return obj[key] ?? 0
}

function exportCSV(projects) {
  const headers = ['Path', 'Messages', 'Sessions', 'Avg Depth', 'Input Tokens', 'Output Tokens', 'Cache Write', 'Cache Read', 'Last Active', 'First Active', 'Cost USD', 'Top Model']
  const rows = projects.map(p => [
    p.path,
    p.messages,
    p.sessions,
    p.avg_msg_per_session ?? 0,
    p.tokens?.input ?? 0,
    p.tokens?.output ?? 0,
    p.tokens?.cache_creation ?? 0,
    p.tokens?.cache_read ?? 0,
    p.last_active ?? '',
    p.first_active ?? '',
    p.cost_usd ?? '',
    MODEL_SHORT[p.dominant_model] ?? p.dominant_model ?? '',
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'ccusage-projects.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function ProjectTable({ projects }) {
  const [sortKey, setSortKey] = useState('messages')
  const [sortDir, setSortDir] = useState('desc')
  const [search,  setSearch]  = useState('')

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const filtered = useMemo(() =>
    search.trim()
      ? projects.filter(p => p.path.toLowerCase().includes(search.toLowerCase()) ||
                             p.display_name.toLowerCase().includes(search.toLowerCase()))
      : projects,
    [projects, search]
  )

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av = getVal(a, sortKey)
    let bv = getVal(b, sortKey)
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  }), [filtered, sortKey, sortDir])

  return (
    <div className="table-box">
      <div className="table-toolbar">
        <div className="section-title" style={{ marginBottom: 0 }}>
          All Projects ({filtered.length}{filtered.length !== projects.length ? ` of ${projects.length}` : ''})
        </div>
        <div className="table-toolbar-right">
          <input
            className="search-input"
            placeholder="Search projects…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <button className="btn" onClick={() => exportCSV(sorted)} title="Export to CSV">⬇ CSV</button>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {COLS.map(c => (
                <th key={c.key} onClick={() => handleSort(c.key)} className={sortKey === c.key ? 'sorted' : ''}>
                  {c.label}{c.tip && <InfoTooltip text={c.tip} />}{' '}
                  {sortKey === c.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </th>
              ))}
              <th>Top Model</th>
              <th>First Used</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(p => {
              const modelColor = MODEL_COLOR[p.dominant_model] ?? '#8b949e'
              const modelLabel = MODEL_SHORT[p.dominant_model] ?? (p.dominant_model ? p.dominant_model.slice(0, 8) : '—')
              return (
                <tr key={p.path}>
                  <td><div className="path-cell" title={p.path}>{p.path}</div></td>
                  <td>{p.messages.toLocaleString()}</td>
                  <td>{p.sessions}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.avg_msg_per_session ?? '—'}</td>
                  <td style={{ color: 'var(--info)',    fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(p.tokens?.input)}</td>
                  <td style={{ color: 'var(--accent)',  fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(p.tokens?.output)}</td>
                  <td style={{ color: 'var(--warning)', fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(p.tokens?.cache_creation)}</td>
                  <td style={{ color: 'var(--success)', fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(p.tokens?.cache_read)}</td>
                  <td>{fmtDate(p.last_active)}</td>
                  <td style={{ color: p.cost_usd ? '#D97706' : '#8b949e', fontWeight: p.cost_usd ? 600 : 400 }}>{fmtCost(p.cost_usd)}</td>
                  <td>
                    {p.dominant_model
                      ? <span className="badge" style={{ background: modelColor + '22', color: modelColor }}>{modelLabel}</span>
                      : <span style={{ color: '#8b949e' }}>—</span>
                    }
                  </td>
                  <td>{fmtDate(p.first_active)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
