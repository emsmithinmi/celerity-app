const today = new Date().toISOString().split('T')[0]

function AgendaItem({ time, title, source, location }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-2.5 border-b last:border-b-0"
      style={{ borderColor: '#313244' }}
    >
      {time && (
        <span className="text-xs font-mono pt-0.5 shrink-0 w-12" style={{ color: '#89b4fa' }}>
          {time}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: '#cdd6f4' }}>{title}</p>
        {location && (
          <p className="text-xs truncate" style={{ color: '#6c7086' }}>{location}</p>
        )}
      </div>
      {source && (
        <span className="text-xs shrink-0" style={{ color: '#6c7086' }}>{source}</span>
      )}
    </div>
  )
}

export default function AgendaSection({ scheduledTasks = [], projectDates = [] }) {
  const items = [
    ...scheduledTasks.map(t => ({
      id: t.id,
      time: null,
      title: t.title,
      source: 'Task',
      location: t.projects?.title ?? null,
    })),
    ...projectDates.map(p => ({
      id: p.id,
      time: null,
      title: p.title,
      source: p.start_date === today ? 'Project Start' : 'Project End',
      location: null,
    })),
  ]

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
