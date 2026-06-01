function fmt(isoString) {
  if (!isoString) return null
  const d = new Date(isoString)
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function AllDayItem({ title, subtitle, dim }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-2 border-b last:border-b-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <span className="text-xs font-mono shrink-0 w-16" style={{ color: 'var(--text-dim)' }}>all day</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: dim ? 'var(--text-secondary)' : 'var(--text-primary)' }}>{title}</p>
        {subtitle && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>{subtitle}</p>
        )}
      </div>
    </div>
  )
}

function TimedItem({ start, end, title, notes, calendarName }) {
  const startFmt = fmt(start)
  const endFmt   = fmt(end)
  return (
    <div
      className="flex items-start gap-3 px-4 py-2.5 border-b last:border-b-0"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="shrink-0 w-16">
        <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>{startFmt}</span>
        {endFmt && (
          <span className="block text-xs font-mono" style={{ color: 'var(--text-dim)' }}>{endFmt}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>{title}</p>
        {notes && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{notes}</p>
        )}
        {calendarName && (
          <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>{calendarName}</p>
        )}
      </div>
    </div>
  )
}

export default function AgendaSection({ calendarEvents = [], dueTasks = [], endingProjects = [] }) {
  const allDayCalendar = calendarEvents.filter(e => e.all_day)
  const timedCalendar  = calendarEvents.filter(e => !e.all_day)

  const empty = allDayCalendar.length === 0 && timedCalendar.length === 0
             && dueTasks.length === 0 && endingProjects.length === 0

  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Agenda</h3>
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {empty ? (
          <p className="px-4 py-3 text-sm" style={{ color: 'var(--text-secondary)' }}>Nothing on the agenda.</p>
        ) : (
          <>
            {/* All-day: calendar all-day events, tasks due, projects ending */}
            {allDayCalendar.map(e => (
              <AllDayItem key={e.id} title={e.summary} subtitle={e.calendar_name} />
            ))}
            {dueTasks.map(t => (
              <AllDayItem key={`task-${t.id}`} title={t.title} subtitle={t.projects?.title ?? 'Task due today'} dim />
            ))}
            {endingProjects.map(p => (
              <AllDayItem key={`proj-${p.id}`} title={p.title} subtitle="Project deadline" dim />
            ))}

            {/* Timed: real calendar events in order */}
            {timedCalendar.map(e => (
              <TimedItem
                key={e.id}
                start={e.start_time}
                end={e.end_time}
                title={e.summary}
                notes={e.notes}
                calendarName={e.calendar_name !== 'emailemsmith@gmail.com' ? e.calendar_name : null}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
