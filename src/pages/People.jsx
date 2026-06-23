import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePeople } from '../hooks/usePeople'
import PersonRow from '../components/people/PersonRow'
import Button from '../components/ui/Button'
import { EmptyState } from '../components/ui'
import { CapturePersonModal } from '../components/daily/QuickCaptureModals'

export default function People() {
  const navigate = useNavigate()
  const [showCapture, setShowCapture] = useState(false)
  const [search,      setSearch]      = useState('')

  const { people, loading, refresh, createPerson } = usePeople({})

  const displayed = search
    ? people.filter(p =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
        (p.company ?? '').toLowerCase().includes(search.toLowerCase())
      )
    : people

  const handleCapture = async ({ first_name, last_name }) => {
    await createPerson({ first_name, last_name })
    refresh()
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          People
          {people.length > 0 && (
            <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
              {people.length}
            </span>
          )}
        </h1>
        <Button size="sm" variant="primary" onClick={() => setShowCapture(true)}>+ Add Person</Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="px-6 pt-4 pb-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people…"
            className="w-full px-4 py-2 rounded-xl text-sm border outline-none bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* People list */}
        {loading ? (
          <EmptyState message="Loading…" />
        ) : displayed.length === 0 ? (
          <EmptyState
            message={search ? 'No people match your search.' : 'No contacts yet.'}
            action={!search
              ? <Button size="sm" variant="secondary" onClick={() => setShowCapture(true)}>Add someone</Button>
              : undefined}
          />
        ) : (
          <div style={{ backgroundColor: 'var(--pane-bg)' }}>
            {displayed.map(person => (
              <PersonRow
                key={person.id}
                person={person}
                onClick={() => navigate(`/people/${person.id}`)}
              />
            ))}
          </div>
        )}
      </div>

      <CapturePersonModal
        open={showCapture}
        onClose={() => setShowCapture(false)}
        onCreate={handleCapture}
      />
    </div>
  )
}
