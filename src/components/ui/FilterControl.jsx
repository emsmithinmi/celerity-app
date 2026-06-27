import { useState, useRef, useEffect, useCallback } from 'react'
import { SlidersHorizontal, X } from 'lucide-react'

/**
 * Reusable filter popover. Accepts filter group definitions and current values.
 *
 * groups: [{ key, label, type: 'multi'|'single', options: [{value, label}] }]
 * values: { [key]: string[] (multi) | string|null (single) }
 * onChange: (key, newValue) => void
 */
export default function FilterControl({ groups = [], values = {}, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 0, right: 0 })
  const btnRef = useRef(null)
  const dropRef = useRef(null)

  const reposition = useCallback(() => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect()
      setPos({ top: r.bottom + 4, right: window.innerWidth - r.right })
    }
  }, [])

  const handleToggle = () => {
    if (!open) reposition()
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (
        dropRef.current && !dropRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      document.removeEventListener('mousedown', onDown)
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [open, reposition])

  const activeCount = groups.reduce((sum, g) => {
    const v = values[g.key]
    if (Array.isArray(v)) return sum + v.length
    return sum + (v ? 1 : 0)
  }, 0)

  const clearAll = () => groups.forEach(g => onChange(g.key, g.type === 'multi' ? [] : null))

  const toggleMulti = (key, val) => {
    const arr = values[key] ?? []
    onChange(key, arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val])
  }

  const toggleSingle = (key, val) => onChange(key, values[key] === val ? null : val)

  return (
    <div className={className}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleToggle}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors"
        style={{
          backgroundColor: (open || activeCount > 0) ? 'var(--border)' : 'transparent',
          borderColor: activeCount > 0 ? 'var(--accent)' : 'var(--border)',
          color: activeCount > 0 ? 'var(--accent)' : 'var(--text-secondary)',
        }}
      >
        <SlidersHorizontal size={12} />
        Filter
        {activeCount > 0 && (
          <span
            className="flex items-center justify-center rounded-full text-[10px] font-bold leading-none"
            style={{ width: 16, height: 16, backgroundColor: 'var(--accent)', color: 'var(--app-bg)' }}
          >
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropRef}
          className="fixed z-[9999] rounded-xl border shadow-xl"
          style={{ top: pos.top, right: pos.right, backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', minWidth: 240, maxWidth: 320 }}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Filters</span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 text-[10px] transition-colors"
                style={{ color: 'var(--text-dim)' }}
                onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
              >
                <X size={10} /> Clear all
              </button>
            )}
          </div>
          <div className="p-3 space-y-4 max-h-80 overflow-y-auto">
            {groups.map(g => (
              <div key={g.key}>
                <p className="text-[10px] font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-dim)' }}>
                  {g.label}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {g.options.map(opt => {
                    const active = g.type === 'multi'
                      ? (values[g.key] ?? []).includes(opt.value)
                      : values[g.key] === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => g.type === 'multi' ? toggleMulti(g.key, opt.value) : toggleSingle(g.key, opt.value)}
                        className="px-2 py-1 rounded-md text-xs border transition-colors"
                        style={{
                          backgroundColor: active ? 'var(--accent)' : 'transparent',
                          borderColor: active ? 'var(--accent)' : 'var(--border)',
                          color: active ? 'var(--app-bg)' : 'var(--text-secondary)',
                        }}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
