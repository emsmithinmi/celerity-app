import { useState, useEffect } from 'react'

function fmt(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtHour(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
}

export default function AgendaSection({ calendarEvents = [], dueTasks = [], endingProjects = [] }) {
  const [now, setNow] = useState(new Date())

  // Tick every 60 seconds so the window drifts forward in real time
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // 4-hour window: now → now + 4h
  const windowStart = now
  const windowEnd   = new Date(now.getTime() + 4 * 60 * 60 * 1000)

  // Hour markers that fall inside the window (ceiling of windowStart to floor of windowEnd)
  const hourMarkers = []
  const firstHour = new Date(windowStart)
  firstHour.setMinutes(0, 0, 0)
  firstHour.setHours(firstHour.getHours() + 1)
  for (let h = new Date(firstHour); h <= windowEnd; h = new Date(h.getTime() + 60 * 60 * 1000)) {
    hourMarkers.push(new Date(h))
  }

  // Calendar events that overlap the window
  const timedEvents = calendarEvents
    .filter(e => !e.all_day && e.start_time)
    .map(e => ({ ...e, start: new Date(e.start_time), end: e.end_time ? new Date(e.end_time) : null }))
    .filter(e => e.start < windowEnd && (!e.end || e.end > windowStart))
    .sort((a, b) => a.start - b.start)

  const allDayItems = [
    ...calendarEvents.filter(e => e.all_day),
    ...dueTasks.map(t => ({ summary: t.title, _subtitle: t.projects?.title ?? 'Task due today', _dim: true })),
    ...endingProjects.map(p => ({ summary: p.title, _subtitle: 'Project deadline', _dim: true })),
  ]

  // % position within the 4-hour window
  const pct = (date) => {
    const clamped = Math.max(windowStart.getTime(), Math.min(windowEnd.getTime(), date.getTime()))
    return ((clamped - windowStart.getTime()) / (4 * 60 * 60 * 1000)) * 100
  }

  const nowPct = pct(now)

  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Agenda</h3>

      {/* All-day / due items */}
      {allDayItems.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden mb-3"
          style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
        >
          {allDayItems.map((e, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-2 border-b last:border-b-0"
              style={{ borderColor: 'var(--border)' }}
            >
              <span className="text-xs font-mono shrink-0 w-16" style={{ color: 'var(--text-dim)' }}>all day</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm truncate" style={{ color: e._dim ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                  {e.summary}
                </p>
                {e._subtitle && (
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-dim)' }}>{e._subtitle}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rolling 4-hour timeline */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {/* Window label */}
        <div
          className="flex justify-between items-center px-4 py-2 border-b"
          style={{ borderColor: 'var(--border)' }}
        >
          <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            {fmt(windowStart)}
          </span>
          <span className="text-xs" style={{ color: 'var(--text-dim)' }}>next 4 hours</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
            {fmt(windowEnd)}
          </span>
        </div>

        {/* Timeline track */}
        <div className="relative px-4 py-3" style={{ height: 200 }}>

          {/* Hour marker lines */}
          {hourMarkers.map((h, i) => (
            <div
              key={i}
              className="absolute flex items-center gap-2"
              style={{ top: `calc(${pct(h)}% * 0.88 + 6%)`, left: 0, right: 0, paddingLeft: '1rem', paddingRight: '1rem' }}
            >
              <span className="text-[10px] font-mono shrink-0 w-14 text-right" style={{ color: 'var(--text-dim)' }}>
                {fmtHour(h)}
              </span>
              <div className="flex-1 border-t" style={{ borderColor: 'var(--border)' }} />
            </div>
          ))}

          {/* NOW line */}
          <div
            className="absolute flex items-center gap-2 z-10"
            style={{ top: `calc(${nowPct}% * 0.88 + 6%)`, left: 0, right: 0, paddingLeft: '1rem', paddingRight: '1rem' }}
          >
            <span className="text-[10px] font-semibold shrink-0 w-14 text-right" style={{ color: 'var(--accent)' }}>
              now
            </span>
            <div className="flex-1 border-t-2" style={{ borderColor: 'var(--accent)' }} />
          </div>

          {/* Calendar events */}
          {timedEvents.map((e, i) => {
            const startPct = pct(e.start)
            const endPct   = e.end ? pct(e.end) : Math.min(startPct + 8, 100)
            const heightPct = Math.max(endPct - startPct, 4)
            return (
              <div
                key={i}
                className="absolute rounded-lg px-3 py-1.5 z-20"
                style={{
                  top:    `calc(${startPct}% * 0.88 + 6%)`,
                  height: `calc(${heightPct}% * 0.88)`,
                  left: 'calc(1rem + 3.5rem + 0.5rem)',
                  right: '1rem',
                  minHeight: 28,
                  backgroundColor: 'var(--accent)',
                  opacity: 0.9,
                }}
              >
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--pane-bg)' }}>
                  {e.summary}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'var(--pane-bg)', opacity: 0.8 }}>
                  {fmt(e.start)}{e.end ? ` – ${fmt(e.end)}` : ''}
                </p>
              </div>
            )
          })}

          {/* Empty state nudge */}
          {timedEvents.length === 0 && (
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ paddingLeft: '4.5rem' }}
            >
              <span className="text-xs" style={{ color: 'var(--text-dim)' }}>open time</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
