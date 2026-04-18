import { useState, useEffect, useCallback, useRef } from 'react'
import { getDashboard, refreshDashboard } from './api'
import SummaryCards from './components/SummaryCards'
import TokenCards from './components/TokenCards'
import DailyChart from './components/DailyChart'
import TopProjectsChart from './components/TopProjectsChart'
import ProjectTable from './components/ProjectTable'
import ModelBreakdown from './components/ModelBreakdown'
import PeriodSelector from './components/PeriodSelector'
import ErrorBoundary from './components/ErrorBoundary'
import { DEFAULT_PERIOD, getDays, getCutoff, filterActivity, filterProjects, deriveSummary } from './utils/periods'

const AUTO_REFRESH_INTERVAL = 30_000
const STALE_HOURS = 2

export default function App() {
  const [state, setState]       = useState({ loading: true, error: null, data: null })
  const [period, setPeriod]     = useState(DEFAULT_PERIOD)
  const [autoRefresh, setAuto]  = useState(false)
  const [theme, setTheme]       = useState(() => localStorage.getItem('theme') || 'dark')
  const [health, setHealth]     = useState(null)
  const timerRef                = useRef(null)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    fetch('/health').then(r => r.json()).then(setHealth).catch(() => setHealth({ status: 'error' }))
  }, [])

  const load = useCallback(async (refresh = false, p = period) => {
    setState(s => ({ ...s, loading: !s.data, error: null }))
    try {
      const days = getDays(p)
      const data = refresh ? await refreshDashboard(days) : await getDashboard(days)
      setState({ loading: false, error: null, data })
    } catch (e) {
      setState(s => ({ ...s, loading: false, error: e.message }))
    }
  }, [period])

  useEffect(() => { load(false, period) }, [period])

  useEffect(() => {
    clearInterval(timerRef.current)
    if (autoRefresh) timerRef.current = setInterval(() => load(true), AUTO_REFRESH_INTERVAL)
    return () => clearInterval(timerRef.current)
  }, [autoRefresh, load])

  if (state.loading) {
    return (
      <div className="centered">
        <div className="spinner" />
        <div style={{ color: 'var(--text-muted)' }}>Loading usage data…</div>
      </div>
    )
  }

  if (state.error && !state.data) {
    return (
      <div className="centered">
        <div className="error-msg">Error: {state.error}</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
          Make sure the backend is running: <code>python3 backend/server.py</code>
        </div>
        <button className="btn btn-primary" onClick={() => load()}>Retry</button>
      </div>
    )
  }

  const { summary, projects, daily_activity, hourly_activity, model_usage } = state.data
  const freshDate = new Date(summary.data_freshness).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const hoursOld   = (Date.now() - new Date(summary.data_freshness).getTime()) / 36e5
  const isStale    = hoursOld > STALE_HOURS

  const cutoff           = getCutoff(period)
  const filteredActivity = filterActivity(daily_activity, cutoff)
  const filteredProjects = filterProjects(projects, cutoff)
  const filteredSummary  = deriveSummary(summary, filteredActivity, filteredProjects)

  return (
    <div className="app">
      {isStale && (
        <div className="stale-banner">
          ⚠️ Data is {Math.floor(hoursOld)}h old — Claude Code may not have run recently.
          <button className="btn btn-sm" onClick={() => load(true)}>Refresh now</button>
        </div>
      )}

      <div className="header">
        <h1>Claude <span>Usage</span> Dashboard</h1>
        <div className="header-right">
          <div className="health-dot-wrap" title={health ? `Backend v${health.version || '?'} · ${health.status}` : 'Checking…'}>
            <span className={`health-dot ${health?.status === 'ok' ? 'health-ok' : health ? 'health-err' : 'health-pending'}`} />
            <span className="health-label">{health?.status === 'ok' ? 'Online' : health ? 'Error' : '…'}</span>
          </div>
          <span className="freshness">Updated {freshDate}</span>
          <label className="auto-refresh-toggle" title="Auto-refresh every 30s">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAuto(e.target.checked)} />
            <span className="toggle-track"><span className="toggle-thumb" /></span>
            <span className="toggle-label">Auto</span>
          </label>
          <button
            className="btn theme-toggle"
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title="Toggle light/dark mode"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button className="btn btn-primary" onClick={() => load(true)}>↻ Refresh</button>
        </div>
      </div>

      <div className="period-row">
        <PeriodSelector selected={period} onChange={setPeriod} />
      </div>

      <ErrorBoundary>
        <SummaryCards summary={filteredSummary} period={period} />
      </ErrorBoundary>

      <ErrorBoundary>
        <TokenCards modelUsage={model_usage} period={period} />
      </ErrorBoundary>

      <ErrorBoundary>
        <div className="charts-row">
          <DailyChart
            dailyActivity={filteredActivity}
            hourlyActivity={hourly_activity}
            period={period}
          />
          <TopProjectsChart projects={filteredProjects} period={period} />
        </div>
      </ErrorBoundary>

      <ErrorBoundary>
        <ProjectTable projects={filteredProjects} />
      </ErrorBoundary>

      <ErrorBoundary>
        <ModelBreakdown modelUsage={model_usage} />
      </ErrorBoundary>

      <footer className="footer">
        <span className="footer-copy">
          © 2025 <a href="https://github.com/vikas9dev" target="_blank" rel="noreferrer">vikas9dev</a>
          {health?.version && <span className="footer-version"> · v{health.version}</span>}
        </span>
        <div className="footer-links">
          <a href="https://github.com/vikas9dev/ccusage" target="_blank" rel="noreferrer">⭐ GitHub</a>
          <a href="https://hub.docker.com/r/vikas9dev/ccusage" target="_blank" rel="noreferrer">🐳 Docker Hub</a>
        </div>
        <span className="footer-note">Data stays on your machine · Fully offline</span>
      </footer>
    </div>
  )
}
