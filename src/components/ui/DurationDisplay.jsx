/**
 * Formats a PostgreSQL interval string (e.g. "01:30:00") as hh:mm:ss.
 * Also exports helpers for summing durations.
 */

export function parseDuration(intervalStr) {
  if (!intervalStr) return { hours: 0, minutes: 0, seconds: 0, total: 0 }

  // Postgres interval can come back as "HH:MM:SS" or "X hours Y minutes Z seconds"
  let hours = 0, minutes = 0, seconds = 0

  // Try HH:MM:SS format
  const timeMatch = intervalStr.match(/^(\d+):(\d{2}):(\d{2})$/)
  if (timeMatch) {
    hours   = parseInt(timeMatch[1])
    minutes = parseInt(timeMatch[2])
    seconds = parseInt(timeMatch[3])
  } else {
    // Try verbose format "X hours Y mins Z secs"
    const h = intervalStr.match(/(\d+)\s+hour/)
    const m = intervalStr.match(/(\d+)\s+min/)
    const s = intervalStr.match(/(\d+)\s+sec/)
    if (h) hours   = parseInt(h[1])
    if (m) minutes = parseInt(m[1])
    if (s) seconds = parseInt(s[1])
  }

  return {
    hours,
    minutes,
    seconds,
    total: hours * 3600 + minutes * 60 + seconds,
  }
}

export function formatDuration(intervalStr) {
  const { hours, minutes } = parseDuration(intervalStr)
  const mm = String(minutes).padStart(2, '0')
  return `${hours}:${mm}`
}

export function sumDurations(intervalStrings = []) {
  const totalSeconds = intervalStrings.reduce((acc, str) => {
    return acc + (parseDuration(str).total ?? 0)
  }, 0)

  const hours   = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  return `${hours}:${String(minutes).padStart(2, '0')}`
}

/** Input helper: converts hh:mm:ss string to postgres interval format */
export function toIntervalString(hhmmss) {
  const [h = '0', m = '0', s = '0'] = hhmmss.split(':')
  return `${parseInt(h)} hours ${parseInt(m)} minutes ${parseInt(s)} seconds`
}

/** Converts a count of seconds to a postgres interval string, or null if ≤ 0. */
export function secondsToInterval(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return null
  const hours   = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)
  return `${hours} hours ${minutes} minutes ${seconds} seconds`
}

export default function DurationDisplay({ duration, className = '' }) {
  if (!duration) return <span style={{ color: 'var(--text-secondary)' }}>—</span>

  return (
    <span
      className={`font-mono text-sm ${className}`}
      style={{ color: 'var(--text-primary)' }}
    >
      {formatDuration(duration)}
    </span>
  )
}
