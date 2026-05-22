import { CONTACT_TYPES } from '../../lib/constants'
import PersonCard from './PersonCard'

export default function PersonList({ people, typeFilter, onSelectPerson }) {
  if (people.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-app-muted text-sm">
          {typeFilter ? `No ${typeFilter} contacts.` : 'No people yet. Add one to get started.'}
        </p>
      </div>
    )
  }

  if (typeFilter) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {people.map((p) => (
          <PersonCard key={p.id} person={p} onClick={() => onSelectPerson(p)} />
        ))}
      </div>
    )
  }

  const groups = CONTACT_TYPES
    .map((type) => ({
      type,
      people: people.filter((p) => p.contact_type === type),
    }))
    .filter((g) => g.people.length > 0)

  const ungrouped = people.filter((p) => !CONTACT_TYPES.includes(p.contact_type))

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.type}>
          <h2 className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-3">
            {group.type}
            <span className="font-normal normal-case tracking-normal ml-2">
              ({group.people.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {group.people.map((p) => (
              <PersonCard key={p.id} person={p} onClick={() => onSelectPerson(p)} />
            ))}
          </div>
        </section>
      ))}

      {ungrouped.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-app-muted uppercase tracking-widest mb-3">
            Other
            <span className="font-normal normal-case tracking-normal ml-2">
              ({ungrouped.length})
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {ungrouped.map((p) => (
              <PersonCard key={p.id} person={p} onClick={() => onSelectPerson(p)} />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
