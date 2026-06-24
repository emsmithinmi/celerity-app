import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { getGoogleConnectUrl } from '../../lib/api/googleConnect'

function fmt(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function fmtHour(date) {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
}

// Distinct palette — saturated enough to read on white text
const PALETTE = ['#4f86f7', '#f97316', '#a855f7', '#10b981', '#ec4899', '#14b8a6', '#f59e0b', '#ef4444']

// Stable calendar-name → color mapping built from the ordered event list
function buildColorMap(events) {
  const map = new Map()
  let idx = 0
  for (const e of events) {
    const key = e.calendar_name || ''
    if (!map.has(key)) { map.set(key, PALETTE[idx % PALETTE.length]); idx++ }
  }
  return map
}

// Assign column positions to handle overlapping events.
// Returns events with _col (0-based column index) and _numCols (concurrent column count).
function layoutEvents(sorted) {
  const cols = [] // end-time (ms) per column
  const result = sorted.map(e => {
    const endMs = e.end ? e.end.getTime() : e.start.getTime() + 30 * 60 * 1000
    let col = cols.findIndex(t => t <= e.start.getTime())
    if (col === -1) col = cols.length
    cols[col] = endMs
    return { ...e, _col: col, _numCols: 1, _endMs: endMs }
  })
  // Second pass: find how many concurrent columns each event shares
  result.forEach(e => {
    let maxCol = e._col
    result.forEach(o => {
      if (o === e) return
      if (e.start.getTime() < o._endMs && e._endMs > o.start.getTime()) maxCol = Math.max(maxCol, o._col)
    })
    e._numCols = maxCol + 1
  })
  return result
}

// Reconnect through the google-connect flow (NOT supabase.auth.signInWithOAuth).
// The calendar reads tokens from the user_integrations table, which only the
// google-connect edge function writes. Re-authorizing the same email upserts a
// fresh refresh token onto the existing 'personal' row (onConflict user_id,provider,email).
async function reconnectGoogle() {
  const redirectUri = `${window.location.origin}/auth/google-callback`
  sessionStorage.setItem('google_connect_label', 'personal')
  const url = await getGoogleConnectUrl(redirectUri)
  window.location.href = url
}

export default function AgendaSection({ calendarEvents = [], dueTasks = [], endingProjects = [], onRefresh, authRequired = false }) {
  const navigate = useNavigate()
  const [now, setNow] = useState(new Date())
  const [spinning, setSpinning] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  const handleReconnect = async () => {
    setReconnecting(true)
    try { await reconnectGoogle() } finally { setReconnecting(false) }
  }

  const handleRefresh = async () => {
    if (!onRefresh || spinning) return
    setSpinning(true)
    await onRefresh()
    setSpinning(false)
  }

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
  const timedEvents = useMemo(() => calendarEvents
    .filter(e => !e.all_day && e.start_time)
    .map(e => ({ ...e, start: new Date(e.start_time), end: e.end_time ? new Date(e.end_time) : null }))
    .filter(e => e.start < windowEnd && (!e.end || e.end > windowStart))
    .sort((a, b) => a.start - b.start)
  , [calendarEvents, windowStart.getTime(), windowEnd.getTime()]) // eslint-disable-line react-hooks/exhaustive-deps

  const colorMap = useMemo(() => buildColorMap(timedEvents), [timedEvents])
  const laidOut  = useMemo(() => layoutEvents(timedEvents),  [timedEvents])

  // Exclude scheduled tasks — they already appear as Focus Flow calendar events
  const allDayItems = [
    ...calendarEvents.filter(e => e.all_day),
    ...dueTasks.filter(t => t.status !== 'scheduled').map(t => ({ summary: t.title, _subtitle: t.projects?.title ?? 'Task due today', _dim: true, _href: `/tasks/${t.id}` })),
    ...endingProjects.map(p => ({ summary: p.title, _subtitle: 'Project deadline', _dim: true, _href: `/projects/${p.id}` })),
  ]

  // % position within the 4-hour window
  const pct = (date) => {
    const clamped = Math.max(windowStart.getTime(), Math.min(windowEnd.getTime(), date.getTime()))
    return ((clamped - windowStart.getTime()) / (4 * 60 * 60 * 1000)) * 100
  }

  const nowPct = pct(now)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Agenda</h3>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            title="Refresh calendar"
            className="flex items-center justify-center rounded-md transition-colors"
            style={{ width: 26, height: 26, color: 'var(--text-secondary)', background: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <RefreshCw size={13} style={{ animation: spinning ? 'spin 0.7s linear infinite' : 'none' }} />
          </button>
        )}
      </div>

      {/* Reconnect prompt when Google auth has been revoked */}
      {authRequired && (
        <div
          className="rounded-xl border px-4 py-3 mb-3 flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--state-warning-bg)',
            borderColor: 'var(--state-warning-text)',
            color: 'var(--state-warning-text)',
          }}
        >
          <div className="text-xs flex-1">
            <p className="font-semibold">Google calendar disconnected</p>
            <p className="opacity-90 mt-0.5">Your Google authorization has expired or been revoked. Reconnect to see Focus Flow calendar events here.</p>
          </div>
          <button
            onClick={handleReconnect}
            disabled={reconnecting}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap disabled:opacity-50"
            style={{ backgroundColor: 'var(--state-warning-text)', color: 'var(--state-warning-bg)' }}
          >
            {reconnecting ? 'Redirecting…' : 'Reconnect Google'}
          </button>
        </div>
      )}

      {/* All-day / due items */}
      {allDayItems.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden mb-3"
          style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
        >
          {allDayItems.map((e, i) => (
            <div
              key={i}
              onClick={e._href ? () => navigate(e._href) : undefined}
              className={`flex items-center gap-3 px-4 py-2 border-b last:border-b-0${e._href ? ' cursor-pointer hover:opacity-90 transition-opacity' : ''}`}
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

          {/* Calendar events — column-laid-out, color-coded by calendar */}
          {laidOut.map((e, i) => {
            const startPct  = pct(e.start)
            const endPct    = e.end ? pct(e.end) : Math.min(startPct + 8, 100)
            const heightPct = Math.max(endPct - startPct, 4)
            const color     = colorMap.get(e.calendar_name || '') ?? PALETTE[0]
            // Track occupies: left=5rem from container edge, right=1rem → trackWidth = 100% - 6rem
            const trackW  = '(100% - 6rem)'
            const colW    = `calc(${trackW} / ${e._numCols} - 3px)`
            const colLeft = `calc(5rem + ${e._col} * ${trackW} / ${e._numCols})`
            return (
              <div
                key={i}
                className="absolute rounded-lg px-2 py-1 z-20 overflow-hidden"
                style={{
                  top:      `calc(${startPct}% * 0.88 + 6%)`,
                  height:   `calc(${heightPct}% * 0.88)`,
                  left:     colLeft,
                  width:    colW,
                  minHeight: 28,
                  backgroundColor: color,
                }}
              >
                <p className="text-xs font-semibold truncate" style={{ color: '#fff' }}>
                  {e.summary}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>
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

        {/* Calendar color legend — only shown when >1 calendar is present */}
        {colorMap.size > 1 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1 px-4 pb-2 pt-1">
            {[...colorMap.entries()].map(([name, color]) => (
              <div key={name} className="flex items-center gap-1">
                <span className="shrink-0 rounded-sm" style={{ width: 8, height: 8, backgroundColor: color }} />
                <span className="text-[10px] truncate" style={{ color: 'var(--text-dim)', maxWidth: 120 }}>
                  {name || 'Calendar'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
