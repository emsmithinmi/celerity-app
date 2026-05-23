import { useState } from 'react'
import { usePeople }    from '../hooks/usePeople'
import PersonRow    from '../components/people/PersonRow'
import PersonDetail from '../components/people/PersonDetail'
import Button       from '../components/ui/Button'
import { CapturePersonModal } from '../components/daily/QuickCaptureModals'

const TABS = [
  { key: 'all',    label: 'All'    },
  { key: 'inbox',  label: 'Inbox'  },
  { key: 'active', label: 'Active' },
  { key: 'stale',  label: 'Stale'  },
]

export default function People() {
  const [activeTab,      setActiveTab]      = useState('all')
  const [selectedPerson, setSelectedPerson] = useState(null)
  const [showCapture,    setShowCapture]    = useState(false)

  const filters = activeTab === 'all' ? {} : { status: activeTab }

  const { people, loading, refresh, createPerson } = usePeople(filters)

  const handleCapture = async ({ first_name, last_name }) => {
    await createPerson({ first_name, last_name })
    setActiveTab('inbox')
  }

  return (
    <div className="h-full flex flex-col">
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: '#313244' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: '#cdd6f4' }}>People</h1>
        <Button size="sm" variant="primary" onClick={() => setShowCapture(true)}>
          + Add Person
        </Button>
      </div>

      {/* ── Tabs ── */}
      <div
        className="flex gap-1 px-4 py-3 border-b shrink-0"
        style={{ borderColor: '#313244' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
            style={{
              backgroundColor: activeTab === tab.key ? '#313244' : 'transparent',
              color: activeTab === tab.key ? '#cdd6f4' : '#6c7086',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── People list ── */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: '#6c7086' }}>Loading…</p>
          </div>
        ) : people.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-sm" style={{ color: '#6c7086' }}>
              No {activeTab === 'all' ? '' : activeTab} people.
            </p>
            {activeTab === 'inbox' && (
              <Button size="sm" variant="secondary" onClick={() => setShowCapture(true)}>
                Add someone
              </Button>
            )}
          </div>
        ) : (
          <div style={{ backgroundColor: '#181825' }}>
            {people.map(person => (
              <PersonRow
                key={person.id}
                person={person}
                onClick={() => setSelectedPerson(person)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Person detail modal ── */}
      {selectedPerson && (
        <PersonDetail
          person={selectedPerson}
          open={!!selectedPerson}
          onClose={() => setSelectedPerson(null)}
          onRefresh={refresh}
        />
      )}

      {/* ── Capture modal ── */}
      <CapturePersonModal
        open={showCapture}
        onClose={() => setShowCapture(false)}
        onCreate={handleCapture}
      />
    </div>
  )
}
