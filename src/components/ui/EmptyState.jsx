/**
 * EmptyState — standard empty list placeholder used across all pages and sections.
 *
 * Usage:
 *   <EmptyState message="No inbox tasks." />
 *   <EmptyState message="Nothing here." action={<Button ...>Capture</Button>} />
 */
export default function EmptyState({ message, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 gap-2">
      {icon && <span className="text-2xl">{icon}</span>}
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>
      {action}
    </div>
  )
}
