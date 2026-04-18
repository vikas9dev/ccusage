import InfoTooltip from './InfoTooltip'

const COST_TIP = 'API market-rate equivalent — what your usage would cost on pay-per-token pricing (input / output / cache tokens × per-model rates). If you\'re on a flat subscription, your actual spend is your monthly plan fee.'

export default function SummaryCards({ summary, period }) {
  const fmt     = (n) => n?.toLocaleString() ?? '—'
  const fmtCost = (n) => n != null ? `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
  const isAll   = period === 'All'

  return (
    <div className="cards-grid">
      <div className="card">
        <div className="card-label">Projects {!isAll && `(${period})`}</div>
        <div className="card-value accent">{fmt(summary.total_projects)}</div>
        <div className="card-sub">active in period</div>
      </div>
      <div className="card">
        <div className="card-label">Sessions {!isAll && `(${period})`}</div>
        <div className="card-value info">{fmt(summary.total_sessions)}</div>
        <div className="card-sub">in selected period</div>
      </div>
      <div className="card">
        <div className="card-label">Messages {!isAll && `(${period})`}</div>
        <div className="card-value">{fmt(summary.total_messages)}</div>
        <div className="card-sub">user prompts sent</div>
      </div>
      <div className="card">
        <div className="card-label">
          API Equiv. Cost {!isAll && `(${period})`}
          <InfoTooltip text={COST_TIP} />
        </div>
        <div className="card-value warning">{fmtCost(summary.total_cost_usd)}</div>
        <div className="card-sub">across all models</div>
      </div>
    </div>
  )
}
