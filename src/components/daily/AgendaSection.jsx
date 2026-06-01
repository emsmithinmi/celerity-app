const today = new Date().toISOString().split('T')[0]

function AgendaItem({ time, title, notes, source, location }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-2.5 border-b last:border-b-0"
      style={{ borderColor: '#313244' }}
    >
      <span className="text-xs font-mono pt-0.5 shrink-0 w-12" style={{ color: '#89b4fa' }}>
        {time ?? '—'}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: '#cdd6f4' }}>{title}</p>
        {notes && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#6c7086' }}>{notes}</p>
        )}
        {location && (
          <p className="text-xs mt-0.5" style={{ color: '#6c7086' }}>{location}</p>
        )}
      </div>
      {source && (
        <span className="text-xs shrink-0 mt-0.5" style={{ color: '#45475a' }}>{source}</span>
      )}
    </div>
  )
}

export default function AgendaSection({ storedAgenda = [], scheduledTasks = [], projectDates = [] }) {
  // AI-generated timed items first, then live task/project items
  const aiItems = storedAgenda.map((item, i) => ({
    id: `ai-${i}`,
    time: item.time ?? null,
    title: item.title,
    notes: item.notes ?? null,
    source: null,
    location: null,
    sortKey: item.time ?? 'zz',
  }))

  const liveItems = [
    ...scheduledTasks.map(t => ({
      id: t.id,
      time: null,
      title: t.title,
      notes: null,
      source: 'Scheduled',
      location: t.projects?.title ?? null,
      sortKey: 'zz',
    })),
    ...projectDates.map(p => ({
      id: p.id,
      time: null,
      title: p.title,
      notes: null,
      source: p.start_date === today ? 'Project Start' : 'Project End',
      location: null,
      sortKey: 'zz',
    })),
  ]

  const items = [...aiItems, ...liveItems]

  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>
        Agenda
      </h3>
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: '#181825', borderColor: '#313244' }}
      >
        {items.length > 0 ? (
          items.map(item => <AgendaItem key={item.id} {...item} />)
        ) : (
          <p className="px-4 py-3 text-sm" style={{ color: '#6c7086' }}>
            No agenda items for today.
          </p>
        )}
      </div>
      <p className="text-xs mt-1.5" style={{ color: '#6c7086' }}>
        Google Calendar integration coming soon
      </p>
    </div>
  )
}
