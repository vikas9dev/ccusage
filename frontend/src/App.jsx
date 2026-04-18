import { useState, useEffect, useCallback, useRef } from 'react'
import { getDashboard, refreshDashboard } from './api'
import SummaryCards from './components/SummaryCards'
import TokenCards from './components/TokenCards'
import DailyChart from './components/DailyChart'
import TopProjectsChart from './components/TopProjectsChart'
import ProjectTable from './components/ProjectTable'
import ModelBreakdown from './components/ModelBreakdown'
import PeriodSelector from './components/PeriodSelector'
import { DEFAULT_PERIOD, getDays, getCutoff, filterActivity, filterProjects, deriveSummary } from './utils/periods'

const AUTO_REFRESH_INTERVAL = 30_000  // 30 seconds

export default function App() {
  const [state, setState]       = useState({ loading: true, error: null, data: null })
  const [period, setPeriod]     = useState(DEFAULT_PERIOD)
  const [autoRefresh, setAuto]  = useState(false)
  const timerRef                = useRef(null)

  const load = useCallback(async (refresh = false, p = period) => {
    setState(s => ({ ...s, loading: !s.data, error: null }))  // only full-spinner on first load
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

  const cutoff           = getCutoff(period)
  const filteredActivity = filterActivity(daily_activity, cutoff)
  const filteredProjects = filterProjects(projects, cutoff)
  const filteredSummary  = deriveSummary(summary, filteredActivity, filteredProjects)

  return (
    <div className="app">
      <div className="header">
        <h1>Claude <span>Usage</span> Dashboard</h1>
        <div className="header-right">
          <span className="freshness">Updated {freshDate}</span>
          <label className="auto-refresh-toggle" title="Auto-refresh every 30s">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAuto(e.target.checked)} />
            <span className="toggle-track"><span className="toggle-thumb" /></span>
            <span className="toggle-label">Auto</span>
          </label>
          <button className="btn btn-primary" onClick={() => load(true)}>↻ Refresh</button>
        </div>
      </div>

      <div className="period-row">
        <PeriodSelector selected={period} onChange={setPeriod} />
      </div>

      <SummaryCards summary={filteredSummary} period={period} />

      <TokenCards modelUsage={model_usage} period={period} />

      <div className="charts-row">
        <DailyChart
          dailyActivity={filteredActivity}
          hourlyActivity={hourly_activity}
          period={period}
        />
        <TopProjectsChart projects={filteredProjects} period={period} />
      </div>

      <ProjectTable projects={filteredProjects} />

      <ModelBreakdown modelUsage={model_usage} />
    </div>
  )
}
