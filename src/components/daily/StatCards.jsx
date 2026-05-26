const CARDS = [
  { key: 'inProgress',  label: 'Projects in Progress' },
  { key: 'nextActions', label: 'Next Actions'          },
  { key: 'dueToday',    label: 'Due Today'             },
  { key: 'waiting',     label: 'Tasks Waiting'         },
  { key: 'stalled',     label: 'Stalled Projects'      },
]

function StatCard({ label, value }) {
  return (
    <div
      className="flex-1 rounded-xl px-4 py-3 border text-center min-w-0"
      style={{ backgroundColor: '#181825', borderColor: '#313244' }}
    >
      <p className="text-xs mb-1 truncate" style={{ color: '#6c7086' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color: '#cdd6f4' }}>{value}</p>
    </div>
  )
}

export default function StatCards({ stats }) {
  return (
    <div className="flex gap-3">
      {CARDS.map(({ key, label }) => (
        <StatCard key={key} label={label} value={stats[key] ?? 0} />
      ))}
    </div>
  )
}
