/**
 * EmptyState — standard empty list placeholder used across all pages and sections.
 *
 * variant="default" (default) — centered flex, h-32, for full-width page lists
 * variant="card"              — bordered card with centered text, for use inside section cards
 */
export default function EmptyState({ message, action, variant = 'default', className = '' }) {
  if (variant === 'card') {
    return (
      <div
        className={`rounded-xl border p-6 text-center mb-4 ${className}`}
        style={{ borderColor: 'var(--border)' }}
      >
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center h-32 gap-2 ${className}`}>
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {action}
    </div>
  )
}
