import { AvatarCircle } from '../ui'

export default function PersonRow({ person, onClick, selectable, selected, onToggle }) {
  const displayName = person.preferred_name
    ? `${person.preferred_name} ${person.last_name}`
    : `${person.first_name} ${person.last_name}`

  const subtitle = [
    person.contact_type && person.contact_type.charAt(0).toUpperCase() + person.contact_type.slice(1),
    person.relationship || person.occupation || person.company,
  ].filter(Boolean).join(' · ')

  const handleClick = () => {
    if (selectable) { onToggle?.(); return }
    onClick?.()
  }

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer transition-colors"
      style={{
        borderColor: 'var(--border)',
        backgroundColor: selected ? 'var(--nav-active-bg)' : 'transparent',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.opacity = '0.9' }}
      onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
    >
      {selectable && (
        <span
          className="flex items-center justify-center rounded-full border shrink-0 transition-colors"
          style={{
            width: 16, height: 16,
            backgroundColor: selected ? 'var(--accent)' : 'transparent',
            borderColor: selected ? 'var(--accent)' : 'var(--text-dim)',
          }}
        >
          {selected && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3.5 6L6.5 2" stroke="var(--app-bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </span>
      )}

      <AvatarCircle src={person.avatar_url} name={displayName} size="sm" bgColor={person.color ?? undefined} />

      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: 'var(--text-primary)' }}>
          {displayName}
        </p>
        {subtitle && (
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
