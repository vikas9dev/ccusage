import { PERIODS } from '../utils/periods'

export default function PeriodSelector({ selected, onChange }) {
  return (
    <div className="period-selector">
      {PERIODS.map(p => (
        <button
          key={p.label}
          className={`period-btn${selected === p.label ? ' active' : ''}`}
          onClick={() => onChange(p.label)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
