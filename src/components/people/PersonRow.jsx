import { StatusPill } from '../ui'

export default function PersonRow({ person, onClick }) {
  const displayName = person.preferred_name
    ? `${person.preferred_name} ${person.last_name}`
    : `${person.first_name} ${person.last_name}`

  const initials = `${person.first_name?.[0] ?? ''}${person.last_name?.[0] ?? ''}`.toUpperCase()

  const today         = new Date().toISOString().split('T')[0]
  const lastContactDate = person.last_contact_at
    ? new Date(person.last_contact_at + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      })
    : null

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

      {/* Name + company */}
      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{
          color: person.status === 'stale' ? '#6c7086' : '#cdd6f4',
        }}>
          {displayName}
        </p>
        {person.company && (
          <p className="text-xs truncate mt-0.5" style={{ color: '#6c7086' }}>
            {person.contact_type && <span className="capitalize">{person.contact_type} · </span>}
            {person.company}
          </p>
        )}
      </div>

      {/* Meta */}
      <div className="flex items-center gap-2 shrink-0">
        {lastContactDate && (
          <span className="text-xs" style={{ color: '#6c7086' }}>
            Last: {lastContactDate}
          </span>
        )}
        <StatusPill status={person.status} type="people" />
      </div>
    </div>
  )
}
