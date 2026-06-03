import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePeople } from '../hooks/usePeople'
import PersonRow from '../components/people/PersonRow'
import Button from '../components/ui/Button'
import { CapturePersonModal } from '../components/daily/QuickCaptureModals'

const TABS = [
  { key: 'inbox',  label: 'Inbox'  },
  { key: 'active', label: 'Active' },
  { key: 'stale',  label: 'Stale'  },
  { key: 'all',    label: 'All'    },
]

function StatChip({ label, count }) {
  return (
    <div
      className="flex flex-col items-center px-4 py-3 rounded-xl border"
      style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
    >
      <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{count}</span>
      <span className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</span>
    </div>
  )
}

export default function People() {
  const navigate = useNavigate()
  const [activeTab,   setActiveTab]   = useState('inbox')
  const [showCapture, setShowCapture] = useState(false)
  const [search,      setSearch]      = useState('')

  const { people, loading, refresh, createPerson } = usePeople({})

  const displayed = (() => {
    let base = activeTab === 'all' ? people : people.filter(p => p.status === activeTab)
    if (search) base = base.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (p.company ?? '').toLowerCase().includes(search.toLowerCase())
    )
    return base
  })()

  const stats = {
    total:  people.length,
    active: people.filter(p => p.status === 'active').length,
    inbox:  people.filter(p => p.status === 'inbox').length,
    stale:  people.filter(p => p.status === 'stale' || p.is_stale).length,
  }

  const tabCount = (key) => {
    if (key === 'all') return people.length
    return people.filter(p => p.status === key).length
  }

  const handleCapture = async ({ first_name, last_name }) => {
    await createPerson({ first_name, last_name })
    refresh()
    setActiveTab('inbox')
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>People</h1>
        <Button size="sm" variant="primary" onClick={() => setShowCapture(true)}>+ Add Person</Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3 px-6 pt-5 pb-4">
          <StatChip label="Total"  count={stats.total}  />
          <StatChip label="Active" count={stats.active} />
          <StatChip label="Inbox"  count={stats.inbox}  />
          <StatChip label="Stale"  count={stats.stale}  />
        </div>

        {/* Search */}
        <div className="px-6 pb-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people…"
            className="w-full px-4 py-2 rounded-xl text-sm border outline-none bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Tabs */}
        <div
          className="flex gap-1 px-4 pb-2 overflow-x-auto shrink-0"
          style={{ borderBottom: '1px solid var(--border)' }}
        >
          {TABS.map(tab => {
            const count = tabCount(tab.key)
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0"
                style={{
                  backgroundColor: activeTab === tab.key ? 'var(--border)' : 'transparent',
                  color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                }}
              >
                {tab.label}
                {count > 0 && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[10px] font-semibold leading-none"
                    style={{
                      backgroundColor: activeTab === tab.key ? 'var(--text-secondary)' : 'var(--border)',
                      color: activeTab === tab.key ? 'var(--pane-bg)' : 'var(--text-secondary)',
                    }}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* People list */}
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {search
                ? 'No people match your search.'
                : `No ${activeTab === 'all' ? '' : activeTab} people.`}
            </p>
            {activeTab === 'inbox' && !search && (
              <Button size="sm" variant="secondary" onClick={() => setShowCapture(true)}>
                Add someone
              </Button>
            )}
          </div>
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
