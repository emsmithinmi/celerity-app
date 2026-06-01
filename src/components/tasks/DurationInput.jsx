import { useState, useEffect } from 'react'
import { parseDuration, toIntervalString } from '../ui/DurationDisplay'

/**
 * Three-part hh:mm:ss input.
 * value: postgres interval string (or null)
 * onChange: called with new interval string
 */
export default function DurationInput({ value, onChange, className = '' }) {
  const parsed = parseDuration(value)
  const [h, setH] = useState(String(parsed.hours).padStart(2, '0'))
  const [m, setM] = useState(String(parsed.minutes).padStart(2, '0'))
  const [s, setS] = useState(String(parsed.seconds).padStart(2, '0'))

  useEffect(() => {
    const p = parseDuration(value)
    setH(String(p.hours).padStart(2, '0'))
    setM(String(p.minutes).padStart(2, '0'))
    setS(String(p.seconds).padStart(2, '0'))
  }, [value])

  const emit = (newH, newM, newS) => {
    const hv = Math.max(0, parseInt(newH) || 0)
    const mv = Math.min(59, Math.max(0, parseInt(newM) || 0))
    const sv = Math.min(59, Math.max(0, parseInt(newS) || 0))
    if (hv === 0 && mv === 0 && sv === 0) {
      onChange(null)
    } else {
      onChange(toIntervalString(`${hv}:${mv}:${sv}`))
    }
  }

  const part = (val, setter, max, onBlur) => (
    <input
      type="number"
      min={0}
      max={max}
      value={val}
      onChange={e => setter(e.target.value)}
      onBlur={() => onBlur()}
      className="w-12 text-center bg-transparent border rounded px-1 py-1 text-sm outline-none"
      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.select() }}
    />
  )

  return (
    <div className={`flex items-center gap-1 font-mono ${className}`} style={{ color: 'var(--text-secondary)' }}>
      {part(h, setH, 999, () => emit(h, m, s))}
      <span>:</span>
      {part(m, setM,  59, () => emit(h, m, s))}
      <span>:</span>
      {part(s, setS,  59, () => emit(h, m, s))}
      <span className="text-xs ml-1">hh:mm:ss</span>
    </div>
  )
}
