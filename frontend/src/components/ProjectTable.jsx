import { useState, useMemo } from 'react'
import InfoTooltip, { TOKEN_DESCRIPTIONS } from './InfoTooltip'
import { getModelShort, getModelColor, getModelLabel } from '../utils/models'

const PAGE_SIZE = 20

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
  { key: 'display_name',          label: 'Project',        tip: null },
  { key: 'messages',              label: 'Messages',        tip: null },
  { key: 'sessions',              label: 'Sessions',        tip: null },
  { key: 'avg_msg_per_session',   label: 'Avg Depth',       tip: 'Average messages per session — higher means longer, more focused conversations.' },
  { key: 'cost_per_session',      label: 'Cost / Session',  tip: 'API equivalent cost divided by number of sessions.' },
  { key: 'tokens.input',          label: 'Input',           tip: TOKEN_DESCRIPTIONS['Input Tokens'] },
  { key: 'tokens.output',         label: 'Output',          tip: TOKEN_DESCRIPTIONS['Output Tokens'] },
  { key: 'tokens.cache_creation', label: 'Cache Write',     tip: TOKEN_DESCRIPTIONS['Cache Write'] },
  { key: 'tokens.cache_read',     label: 'Cache Read',      tip: TOKEN_DESCRIPTIONS['Cache Read'] },
  { key: 'last_active',           label: 'Last Active',     tip: null },
  { key: 'cost_usd',              label: 'API Equiv. Cost', tip: null },
]

const getVal = (obj, key) => {
  if (key === 'cost_per_session') return obj.sessions > 0 ? (obj.cost_usd ?? 0) / obj.sessions : 0
  if (key.includes('.')) {
    const [a, b] = key.split('.')
    return obj[a]?.[b] ?? 0
  }
  return obj[key] ?? 0
}

function exportCSV(projects) {
  const headers = ['Path', 'Messages', 'Sessions', 'Avg Depth', 'Cost/Session', 'Input Tokens', 'Output Tokens', 'Cache Write', 'Cache Read', 'Last Active', 'First Active', 'Cost USD', 'Top Model']
  const rows = projects.map(p => [
    p.path,
    p.messages,
    p.sessions,
    p.avg_msg_per_session ?? 0,
    p.sessions > 0 ? ((p.cost_usd ?? 0) / p.sessions).toFixed(4) : 0,
    p.tokens?.input ?? 0,
    p.tokens?.output ?? 0,
    p.tokens?.cache_creation ?? 0,
    p.tokens?.cache_read ?? 0,
    p.last_active ?? '',
    p.first_active ?? '',
    p.cost_usd ?? '',
    getModelShort(p.dominant_model),
  ])
  const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = 'ccusage-projects.csv'; a.click()
  URL.revokeObjectURL(url)
}

function ExpandedRow({ project }) {
  const byModel = project.by_model ?? {}
  const entries = Object.entries(byModel)
  if (!entries.length) return (
    <div className="expand-content"><span style={{ color: 'var(--text-muted)', fontSize: 13 }}>No model breakdown available.</span></div>
  )
  return (
    <div className="expand-content">
      <div className="expand-title">Model Breakdown</div>
      <div className="expand-models">
        {entries.map(([model, t]) => {
          const color = getModelColor(model)
          const label = getModelLabel(model)
          return (
            <div className="expand-model-card" key={model} style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
              <div className="expand-model-name" style={{ color }}>{label}</div>
              <div className="expand-model-stat"><span>Input</span><span>{fmtTokens(t.input)}</span></div>
              <div className="expand-model-stat"><span>Output</span><span>{fmtTokens(t.output)}</span></div>
              <div className="expand-model-stat"><span>Cache Write</span><span>{fmtTokens(t.cache_creation)}</span></div>
              <div className="expand-model-stat"><span>Cache Read</span><span>{fmtTokens(t.cache_read)}</span></div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function ProjectTable({ projects }) {
  const [sortKey, setSortKey] = useState('messages')
  const [sortDir, setSortDir] = useState('desc')
  const [search,  setSearch]  = useState('')
  const [page,    setPage]    = useState(1)
  const [expanded, setExpanded] = useState(null)

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
    setPage(1)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return q
      ? projects.filter(p => p.path.toLowerCase().includes(q) || p.display_name.toLowerCase().includes(q))
      : projects
  }, [projects, search])

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av = getVal(a, sortKey)
    let bv = getVal(b, sortKey)
    if (typeof av === 'string') av = av.toLowerCase()
    if (typeof bv === 'string') bv = bv.toLowerCase()
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  }), [filtered, sortKey, sortDir])

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE)
  const paged      = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleExpand = (path) => setExpanded(e => e === path ? null : path)

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
            onChange={e => { setSearch(e.target.value); setPage(1) }}
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
            {paged.map(p => {
              const modelColor    = getModelColor(p.dominant_model)
              const modelLabel    = getModelShort(p.dominant_model)
              const costPerSess   = p.sessions > 0 ? (p.cost_usd ?? 0) / p.sessions : null
              const isExpanded    = expanded === p.path
              return [
                <tr
                  key={p.path}
                  className={`clickable-row${isExpanded ? ' row-expanded' : ''}`}
                  onClick={() => toggleExpand(p.path)}
                  title="Click to expand model breakdown"
                >
                  <td><div className="path-cell" title={p.path}>{p.path}</div></td>
                  <td>{p.messages.toLocaleString()}</td>
                  <td>{p.sessions}</td>
                  <td style={{ color: 'var(--text-muted)' }}>{p.avg_msg_per_session ?? '—'}</td>
                  <td style={{ color: 'var(--warning)', fontWeight: 600 }}>{costPerSess != null ? fmtCost(costPerSess) : '—'}</td>
                  <td style={{ color: 'var(--info)',    fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(p.tokens?.input)}</td>
                  <td style={{ color: 'var(--accent)',  fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(p.tokens?.output)}</td>
                  <td style={{ color: 'var(--warning)', fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(p.tokens?.cache_creation)}</td>
                  <td style={{ color: 'var(--success)', fontFamily: 'monospace', fontSize: 12 }}>{fmtTokens(p.tokens?.cache_read)}</td>
                  <td>{fmtDate(p.last_active)}</td>
                  <td style={{ color: p.cost_usd ? '#D97706' : 'var(--text-muted)', fontWeight: p.cost_usd ? 600 : 400 }}>{fmtCost(p.cost_usd)}</td>
                  <td>
                    {p.dominant_model
                      ? <span className="badge" style={{ background: modelColor + '22', color: modelColor }}>{modelLabel}</span>
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>
                    }
                  </td>
                  <td>{fmtDate(p.first_active)}</td>
                </tr>,
                isExpanded && (
                  <tr key={`${p.path}-expand`} className="expand-row">
                    <td colSpan={COLS.length + 2}>
                      <ExpandedRow project={p} />
                    </td>
                  </tr>
                )
              ]
            })}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>← Prev</button>
          <span className="pagination-info">Page {page} of {totalPages} · {sorted.length} projects</span>
          <button className="btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next →</button>
        </div>
      )}
    </div>
  )
}
