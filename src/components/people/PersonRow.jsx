import { StatusPill } from '../ui'

export default function PersonRow({ person, onClick }) {
  const displayName = person.preferred_name
    ? `${person.preferred_name} ${person.last_name}`
    : `${person.first_name} ${person.last_name}`

  const initials = `${person.first_name?.[0] ?? ''}${person.last_name?.[0] ?? ''}`.toUpperCase()

  // Build subtitle: relationship and/or company
  const subtitle = [
    person.contact_type && person.contact_type.charAt(0).toUpperCase() + person.contact_type.slice(1),
    person.relationship || person.occupation || person.company,
  ].filter(Boolean).join(' · ')

  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-opacity hover:opacity-90"
      style={{ borderColor: '#313244' }}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
        style={{ backgroundColor: '#313244', color: '#89b4fa' }}
      >
        {initials}
      </div>

      {/* Name + subtitle */}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{
          color: person.status === 'stale' ? '#6c7086' : '#cdd6f4',
        }}>
          {displayName}
        </p>
        {subtitle && (
          <p className="text-xs truncate mt-0.5" style={{ color: '#6c7086' }}>
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
