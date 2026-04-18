export const PERIODS = [
  { label: '12H', days: 0.5  },
  { label: '1D',  days: 1    },
  { label: '7D',  days: 7    },
  { label: '15D', days: 15   },
  { label: '30D', days: 30   },
  { label: '3M',  days: 90   },
  { label: 'All', days: null },
]

export const DEFAULT_PERIOD = '30D'

/** Numeric days value to pass to ?days= API param. null = all-time. */
export function getDays(periodLabel) {
  const p = PERIODS.find(x => x.label === periodLabel)
  return p ? (p.days ?? null) : null
}

/** Date cutoff for client-side filtering of daily_activity / projects. */
export function getCutoff(periodLabel) {
  const p = PERIODS.find(x => x.label === periodLabel)
  if (!p || p.days === null) return null
  const d = new Date()
  d.setTime(d.getTime() - p.days * 24 * 60 * 60 * 1000)
  return d
}

export function filterActivity(dailyActivity, cutoff) {
  if (!cutoff) return dailyActivity
  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return dailyActivity.filter(d => d.date >= cutoffStr)
}

export function filterProjects(projects, cutoff) {
  if (!cutoff) return projects
  return projects.filter(p => p.last_active && new Date(p.last_active) >= cutoff)
}

export function deriveSummary(globalSummary, filteredActivity, filteredProjects) {
  const messages = filteredActivity.reduce((s, d) => s + (d.messageCount ?? 0), 0)
  const sessions  = filteredActivity.reduce((s, d) => s + (d.sessionCount ?? 0), 0)
  return {
    ...globalSummary,
    total_projects: filteredProjects.length,
    total_messages: messages,
    total_sessions: sessions,
    total_cost_usd: globalSummary.period_cost_usd ?? globalSummary.total_cost_usd,
  }
}
