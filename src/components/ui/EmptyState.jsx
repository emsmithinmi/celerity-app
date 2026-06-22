import LucideIcon from './LucideIcon'

/**
 * EmptyState — standard empty list placeholder used across all pages and sections.
 *
 * variant="default" (default) — centered flex, h-32, for full-width page lists
 * variant="card"              — bordered card with centered text, for use inside section cards
 *
 * `icon` is a Lucide icon name (e.g. "Sparkles") rendered via LucideIcon.
 */
export default function EmptyState({ message, action, icon, variant = 'default', className = '' }) {
  if (variant === 'card') {
    return (
      <div
        className={`rounded-xl border p-6 text-center mb-4 ${className}`}
        style={{ borderColor: 'var(--border)' }}
      >
        {icon && (
          <div className="flex justify-center mb-2" style={{ color: 'var(--text-secondary)' }}>
            <LucideIcon name={icon} size={28} />
          </div>
        )}
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
        {action && <div className="mt-3">{action}</div>}
      </div>
    )
  }

  return (
    <div className={`flex flex-col items-center justify-center h-32 gap-2 ${className}`}>
      {icon && (
        <span style={{ color: 'var(--text-secondary)' }}>
          <LucideIcon name={icon} size={28} />
        </span>
      )}
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {action}
    </div>
  )
}
