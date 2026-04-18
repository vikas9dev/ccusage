const BASE = '/api'

function daysParam(days) {
  return days != null ? `?days=${days}` : ''
}

export async function getDashboard(days = null) {
  const res = await fetch(`${BASE}/dashboard${daysParam(days)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function refreshDashboard(days = null) {
  const res = await fetch(`${BASE}/refresh${daysParam(days)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function getConfig() {
  const res = await fetch(`${BASE}/config`)
  if (!res.ok) return { billing_mode: 'api', subscription_cost: 0 }
  return res.json()
}
