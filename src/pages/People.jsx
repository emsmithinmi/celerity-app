import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePeople } from '../hooks/usePeople'
import PersonRow from '../components/people/PersonRow'
import Button from '../components/ui/Button'
import { EmptyState, FilterControl } from '../components/ui'
import { CapturePersonModal } from '../components/daily/QuickCaptureModals'
import { duplicatePerson } from '../lib/api/people'

export default function People() {
  const navigate = useNavigate()
  const [showCapture, setShowCapture] = useState(false)
  const [search,      setSearch]      = useState('')
  const [selectMode,  setSelectMode]  = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkWorking, setBulkWorking] = useState(false)
  const [filters,     setFilters]     = useState({})

  const { people, loading, refresh, createPerson } = usePeople({})

  const handleFilterChange = (key, val) => setFilters(prev => ({ ...prev, [key]: val }))
  const hasActiveFilters = Object.values(filters).some(v => Array.isArray(v) ? v.length > 0 : !!v)

  // Derive filter options from actual data so only populated values appear
  const relationships = useMemo(() =>
    [...new Set(people.map(p => p.relationship).filter(Boolean))].sort()
  , [people])
  const contactTypes = useMemo(() =>
    [...new Set(people.map(p => p.contact_type).filter(Boolean))].sort()
  , [people])

  const filterGroups = [
    relationships.length && { key: 'relationship', label: 'Relationship', type: 'multi',
      options: relationships.map(r => ({ value: r, label: r.charAt(0).toUpperCase() + r.slice(1) })) },
    contactTypes.length  && { key: 'contact_type', label: 'Contact Type', type: 'multi',
      options: contactTypes.map(c => ({ value: c, label: c.charAt(0).toUpperCase() + c.slice(1) })) },
  ].filter(Boolean)

  const displayed = useMemo(() => {
    let base = people
    if (search) base = base.filter(p =>
      `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (p.company ?? '').toLowerCase().includes(search.toLowerCase())
    )
    if (filters.relationship?.length) base = base.filter(p => filters.relationship.includes(p.relationship))
    if (filters.contact_type?.length) base = base.filter(p => filters.contact_type.includes(p.contact_type))
    return base
  }, [people, search, filters])

  const handleCapture = async ({ first_name, last_name }) => {
    await createPerson({ first_name, last_name })
    refresh()
  }

  const toggleSelect = (id) => setSelectedIds(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()) }

  const handleBulkDuplicate = async () => {
    if (selectedIds.size === 0) return
    setBulkWorking(true)
    try {
      await Promise.all([...selectedIds].map(id => duplicatePerson(id)))
      await refresh()
      exitSelectMode()
    } finally { setBulkWorking(false) }
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4 border-b shrink-0"
        style={{ borderColor: 'var(--border)' }}
      >
        <h1 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          People Dashboard
          {people.length > 0 && (
            <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
              {people.length}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={selectMode ? 'secondary' : 'ghost'} onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}>
            {selectMode ? `Cancel (${selectedIds.size} selected)` : 'Select'}
          </Button>
          <Button size="sm" variant="primary" onClick={() => setShowCapture(true)}>+ Add Person</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search + Filter */}
        <div className="flex items-center gap-2 px-6 pt-4 pb-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people…"
            className="flex-1 px-4 py-2 rounded-xl text-sm border outline-none bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e  => e.target.style.borderColor = 'var(--border)'}
          />
          {filterGroups.length > 0 && (
            <FilterControl groups={filterGroups} values={filters} onChange={handleFilterChange} />
          )}
        </div>

        {/* People list */}
        {loading ? (
          <EmptyState message="Loading…" />
        ) : displayed.length === 0 ? (
          <EmptyState
            message={search || hasActiveFilters ? 'No people match your filters.' : 'No contacts yet.'}
            action={!search && !hasActiveFilters
              ? <Button size="sm" variant="secondary" onClick={() => setShowCapture(true)}>Add someone</Button>
              : undefined}
          />
        ) : (
          <div style={{ backgroundColor: 'var(--pane-bg)' }}>
            {displayed.map(person => (
              <PersonRow
                key={person.id}
                person={person}
                onClick={() => !selectMode && navigate(`/people/${person.id}`)}
                selectable={selectMode}
                selected={selectedIds.has(person.id)}
                onToggle={() => toggleSelect(person.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectMode && (
        <div
          className="shrink-0 flex items-center gap-3 px-6 py-3 border-t"
          style={{ borderColor: 'var(--border)', backgroundColor: 'var(--pane-bg)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {selectedIds.size} selected
          </span>
          <Button size="sm" variant="secondary" onClick={handleBulkDuplicate} disabled={selectedIds.size === 0 || bulkWorking}>
            {bulkWorking ? '…' : '⧉ Duplicate'}
          </Button>
        </div>
      )}

      <CapturePersonModal
        open={showCapture}
        onClose={() => setShowCapture(false)}
        onCreate={handleCapture}
      />
    </div>
  )
}
