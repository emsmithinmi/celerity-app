import { StatusPill, AvatarCircle } from '../ui'

export default function PersonRow({ person, onClick }) {
  const displayName = person.preferred_name
    ? `${person.preferred_name} ${person.last_name}`
    : `${person.first_name} ${person.last_name}`

  // Build subtitle: relationship and/or company
  const subtitle = [
    person.contact_type && person.contact_type.charAt(0).toUpperCase() + person.contact_type.slice(1),
    person.relationship || person.occupation || person.company,
  ].filter(Boolean).join(' · ')

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-opacity hover:opacity-90"
      style={{ borderColor: 'var(--border)' }}
    >
      <AvatarCircle src={person.avatar_url} name={displayName} size="sm" bgColor={person.color ?? undefined} />

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{
          color: person.status === 'stale' ? 'var(--text-secondary)' : 'var(--text-primary)',
        }}>
          {displayName}
        </p>
        {subtitle && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>

      {/* Status pill */}
      <div className="shrink-0">
        <StatusPill status={person.status} type="people" />
      </div>
    </div>
  )
}
