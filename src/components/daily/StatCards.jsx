const CARDS = [
  { key: 'inbox',          label: 'Inbox'           },
  { key: 'activeProjects', label: 'Projects'        },
  { key: 'activeTasks',    label: 'Tasks'            },
  { key: 'inProgress',     label: 'In Progress'     },
  { key: 'nextActions',    label: 'Next Actions'    },
  { key: 'waiting',        label: 'Waiting'         },
  { key: 'stalled',        label: 'Stalled'         },
  { key: 'dueToday',       label: 'Due Today'       },
]

function StatCard({ label, value }) {
  return (
    <div
      className="flex-1 rounded-xl px-2 py-2 border text-center min-w-0"
      style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
    >
      <p className="text-xs mb-0.5 truncate" style={{ color: 'var(--text-secondary)', fontSize: '0.65rem' }}>{label}</p>
      <p className="text-lg font-bold leading-tight" style={{ color: 'var(--text-primary)' }}>{value}</p>
    </div>
  )
}

export default function StatCards({ stats }) {
  return (
    <div className="flex gap-2">
      {CARDS.map(({ key, label }) => (
        <StatCard key={key} label={label} value={stats[key] ?? 0} />
      ))}
    </div>
  )
}
