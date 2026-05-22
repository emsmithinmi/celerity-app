import { Mail, Phone } from 'lucide-react'

const TYPE_COLORS = {
  Personal: { bg: '#4ade80', text: '#000' },
  Work:     { bg: '#60a5fa', text: '#000' },
  Services: { bg: '#f472b6', text: '#000' },
}

function initials(name) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function PersonCard({ person, onClick }) {
  const colors = TYPE_COLORS[person.contact_type] || { bg: '#6c7086', text: '#fff' }

  return (
    <div
      onClick={onClick}
      className="bg-app-pane border border-app-border rounded-xl p-4 cursor-pointer hover:border-app-highlight transition-colors"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
          style={{ background: colors.bg, color: colors.text }}
        >
          {initials(person.name)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="text-sm font-semibold text-app-text truncate">{person.name}</h3>
            {person.contact_type && (
              <span
                className="text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0"
                style={{ background: colors.bg, color: colors.text }}
              >
                {person.contact_type}
              </span>
            )}
          </div>

          {(person.title || person.company) && (
            <p className="text-xs text-app-muted truncate mb-1">
              {[person.title, person.company].filter(Boolean).join(' @ ')}
            </p>
          )}

          {person.relationship && (
            <p className="text-xs text-app-muted truncate">{person.relationship}</p>
          )}

          {(person.email || person.phone) && (
            <div className="flex items-center gap-3 mt-2">
              {person.email && (
                <span className="flex items-center gap-1 text-xs text-app-muted">
                  <Mail size={10} />
                  <span className="truncate max-w-[120px]">{person.email}</span>
                </span>
              )}
              {person.phone && (
                <span className="flex items-center gap-1 text-xs text-app-muted">
                  <Phone size={10} />
                  {person.phone}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
