const CARDS = [
  { key: 'inProgress',  label: 'In Progress',  color: '#89b4fa' },
  { key: 'nextActions', label: 'Next Actions',  color: '#0F9D58' },
  { key: 'waiting',     label: 'Waiting',       color: '#DB4437' },
  { key: 'dueToday',    label: 'Due Today',     color: '#FBBC05' },
  { key: 'stalled',     label: 'Stalled',       color: '#673ab7' },
]

function StatCard({ label, value, color }) {
  return (
    <div
      className="flex-1 rounded-xl px-4 py-3 border text-center min-w-0"
      style={{ backgroundColor: '#181825', borderColor: '#313244' }}
    >
      <p className="text-xs mb-1 truncate" style={{ color: '#6c7086' }}>{label}</p>
      <p className="text-2xl font-bold" style={{ color }}>{value}</p>
    </div>
  )
}

export default function StatCards({ stats }) {
  return (
    <div className="flex gap-3">
      {CARDS.map(({ key, label, color }) => (
        <StatCard key={key} label={label} value={stats[key] ?? 0} color={color} />
      ))}
    </div>
  )
}
