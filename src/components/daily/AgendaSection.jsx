function AllDayItem({ title, subtitle }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 border-b last:border-b-0"
      style={{ borderColor: '#313244' }}
    >
      <span className="text-xs font-mono shrink-0 w-12" style={{ color: '#45475a' }}>all day</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: '#cdd6f4' }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate" style={{ color: '#6c7086' }}>{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function TimedItem({ time, title, notes }) {
  return (
    <div
      className="flex items-start gap-3 px-4 py-2.5 border-b last:border-b-0"
      style={{ borderColor: '#313244' }}
    >
      <span className="text-xs font-mono pt-0.5 shrink-0 w-12" style={{ color: '#89b4fa' }}>
        {time}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: '#cdd6f4' }}>{title}</p>
        {notes && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#6c7086' }}>{notes}</p>
        )}
      </div>
    </div>
  )
}

export default function AgendaSection({ storedAgenda = [], dueTasks = [], endingProjects = [] }) {
  // All-day items: tasks due today and projects ending today (no time attached)
  const allDayItems = [
    ...dueTasks.map(t => ({
      id: `task-${t.id}`,
      title: t.title,
      subtitle: t.projects?.title ?? null,
    })),
    ...endingProjects.map(p => ({
      id: `proj-${p.id}`,
      title: p.title,
      subtitle: 'Project deadline',
    })),
  ]

  // Timed items: AI-generated agenda blocks that have a time
  const timedItems = storedAgenda.filter(item => item.time)

  const empty = allDayItems.length === 0 && timedItems.length === 0

  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>Agenda</h3>
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: '#181825', borderColor: '#313244' }}
      >
        {empty ? (
          <p className="px-4 py-3 text-sm" style={{ color: '#6c7086' }}>
            Nothing on the agenda.
          </p>
        ) : (
          <>
            {allDayItems.map(item => (
              <AllDayItem key={item.id} title={item.title} subtitle={item.subtitle} />
            ))}
            {timedItems.map((item, i) => (
              <TimedItem key={i} time={item.time} title={item.title} notes={item.notes} />
            ))}
          </>
        )}
      </div>
      <p className="text-xs mt-1.5" style={{ color: '#6c7086' }}>
        Google Calendar integration coming soon
      </p>
    </div>
  )
}
