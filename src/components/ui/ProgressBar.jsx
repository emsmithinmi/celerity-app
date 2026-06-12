/**
 * Slim themed progress bar. fraction: 0..1
 * size: 'sm' (h-1, list rows) | 'md' (h-2, detail pages)
 */
export default function ProgressBar({ fraction = 0, size = 'sm', label = null, className = '' }) {
  const pct = Math.min(100, Math.max(0, Math.round(fraction * 100)))
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`flex-1 rounded-full overflow-hidden ${size === 'md' ? 'h-2' : 'h-1'}`}
        style={{ backgroundColor: 'var(--border)' }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, backgroundColor: 'var(--accent)', transition: 'width 0.2s ease' }}
        />
      </div>
      {label && (
        <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      )}
    </div>
  )
}
