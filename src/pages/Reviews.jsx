import { useParams, useNavigate } from 'react-router-dom'
import { HardHat } from 'lucide-react'

const S = {
  card:  { backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' },
  muted: { color: 'var(--text-secondary)' },
  text:  { color: 'var(--text-primary)' },
}

const REVIEW_TYPES = [
  { key: 'daily',   label: 'Daily'   },
  { key: 'weekly',  label: 'Weekly'  },
  { key: 'monthly', label: 'Monthly' },
]

export default function Reviews() {
  const { type = 'daily' } = useParams()
  const navigate = useNavigate()
  const activeType = REVIEW_TYPES.find(r => r.key === type) ? type : 'daily'
  const today = new Date().toLocaleDateString('en-CA')

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <h1 className="text-xl font-semibold" style={S.text}>Reviews</h1>
        <p className="text-sm" style={S.muted}>
          {new Date(today + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
        </p>
      </div>

      {/* Type tabs */}
      <div className="flex gap-1 px-4 py-3 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        {REVIEW_TYPES.map(rt => (
          <button key={rt.key}
            onClick={() => navigate(`/reviews/${rt.key}`)}
            className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
            style={{ backgroundColor: activeType === rt.key ? 'var(--border)' : 'transparent', color: activeType === rt.key ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
            {rt.label}
          </button>
        ))}
      </div>

      {/* Body — under construction */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-24 text-center">
          <HardHat size={56} strokeWidth={1.5} className="mx-auto mb-6" style={{ color: 'var(--text-secondary)' }} />
          <h2 className="text-2xl font-semibold mb-3" style={S.text}>Under construction</h2>
          <p className="text-sm leading-relaxed" style={S.muted}>
            The review system is getting rebuilt from the ground up. Hang tight — this page will come back when the new flow is ready.
          </p>
        </div>
      </div>
    </div>
  )
}
