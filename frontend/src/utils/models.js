const LABELS = {
  'claude-opus-4-6':           'Opus 4',
  'claude-sonnet-4-6':         'Sonnet 4.6',
  'claude-haiku-4-5-20251001': 'Haiku 4.5',
}

const COLORS = {
  'claude-opus-4-6':           '#7C3AED',
  'claude-sonnet-4-6':         '#0891B2',
  'claude-haiku-4-5-20251001': '#059669',
}

function matchFamily(model) {
  if (!model) return null
  const m = model.toLowerCase()
  if (m.includes('opus'))   return 'opus'
  if (m.includes('haiku'))  return 'haiku'
  if (m.includes('sonnet')) return 'sonnet'
  return null
}

const OTHERS_COLOR = '#6b7280'

export function getModelLabel(model) {
  if (!model) return 'Others'
  if (LABELS[model]) return LABELS[model]
  const family = matchFamily(model)
  if (family === 'opus')   return 'Opus'
  if (family === 'haiku')  return 'Haiku'
  if (family === 'sonnet') return 'Sonnet'
  return 'Others'
}

export function getModelShort(model) {
  if (!model) return 'Others'
  if (LABELS[model]) return LABELS[model].split(' ')[0]
  const family = matchFamily(model)
  if (family) return family.charAt(0).toUpperCase() + family.slice(1)
  return 'Others'
}

export function getModelColor(model) {
  if (!model) return OTHERS_COLOR
  if (COLORS[model]) return COLORS[model]
  const family = matchFamily(model)
  if (family === 'opus')   return '#7C3AED'
  if (family === 'sonnet') return '#0891B2'
  if (family === 'haiku')  return '#059669'
  return OTHERS_COLOR
}
