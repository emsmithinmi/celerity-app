import { SORT_MODES } from '../../hooks/useListSort'

/**
 * Compact "Sort: <mode> ▾" select used on every task list. Stays inline with
 * the status tabs row.
 */
export default function SortDropdown({ value, onChange, disabled = false, className = '' }) {
  return (
    <label
      className={`inline-flex items-center gap-1.5 text-xs ${className}`}
      style={{ color: 'var(--text-secondary)' }}
    >
      <span>Sort:</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        disabled={disabled}
        className="px-2 py-1 rounded-lg text-xs border outline-none bg-transparent cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
      >
        {SORT_MODES.map(m => (
          <option key={m.key} value={m.key} style={{ backgroundColor: 'var(--pane-bg)' }}>
            {m.label}
          </option>
        ))}
      </select>
    </label>
  )
}
