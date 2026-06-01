import { useState, useEffect } from 'react'
import { updatePerson, activatePerson, getPersonTasks, getPersonProjects } from '../../lib/api/people'

import Modal         from '../ui/Modal'
import Button        from '../ui/Button'
import { StatusPill, PriorityBadge } from '../ui'
import PersonComments from './PersonComments'
import TaskDetail    from '../tasks/TaskDetail'
import ProjectDetail from '../projects/ProjectDetail'

const CONTACT_TYPES = ['Colleague', 'Friend', 'Family', 'Client', 'Vendor', 'Mentor', 'Other']

function FormField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

const inputCls  = "w-full px-3 py-2 rounded-lg text-sm border outline-none bg-transparent"
const inputStyle = { borderColor: 'var(--border)', color: 'var(--text-primary)' }

// ─── Linked Tasks ─────────────────────────────────────────────────────────────
function PersonTasksTab({ personId }) {
  const [tasks,  setTasks]  = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getPersonTasks(personId).then(setTasks).finally(() => setLoading(false))
  }, [personId])

  if (loading) return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
  if (!tasks.length) return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No linked tasks.</p>

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        {tasks.map(t => (
          <div
            key={t.id}
            onClick={() => setSelected(t)}
            className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 cursor-pointer hover:opacity-90"
            style={{ borderColor: 'var(--border)' }}
          >
            <StatusPill status={t.status} type="task" />
            <span className="flex-1 text-sm truncate" style={{
              color: t.status === 'done' ? 'var(--text-secondary)' : 'var(--text-primary)',
              textDecoration: t.status === 'done' ? 'line-through' : 'none',
            }}>
              {t.title}
            </span>
            <PriorityBadge priority={t.priority} />
          </div>
        ))}
      </div>

      {selected && (
        <TaskDetail
          task={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onRefresh={() => {
            setSelected(null)
            getPersonTasks(personId).then(setTasks)
          }}
        />
      )}
    </>
  )
}

// ─── Linked Projects ──────────────────────────────────────────────────────────
function PersonProjectsTab({ personId }) {
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    getPersonProjects(personId).then(setProjects).finally(() => setLoading(false))
  }, [personId])

  if (loading) return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
  if (!projects.length) return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No linked projects.</p>

  return (
    <>
      <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        {projects.map(p => (
          <div
            key={p.id}
            onClick={() => setSelected(p)}
            className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 cursor-pointer hover:opacity-90"
            style={{ borderColor: 'var(--border)' }}
          >
            <StatusPill status={p.status} type="project" />
            <span className="flex-1 text-sm truncate" style={{ color: 'var(--text-primary)' }}>{p.title}</span>
            {p.area && <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{p.area}</span>}
          </div>
        ))}
      </div>

      {selected && (
        <ProjectDetail
          project={selected}
          open={!!selected}
          onClose={() => setSelected(null)}
          onRefresh={() => {
            setSelected(null)
            getPersonProjects(personId).then(setProjects)
          }}
        />
      )}
    </>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function PersonDetail({ person: initialPerson, open, onClose, onRefresh }) {
  const [person, setPerson] = useState(initialPerson)
  const [tab,    setTab]    = useState('details')
  const [saving, setSaving] = useState(false)
  const [dirty,  setDirty]  = useState(false)

  useEffect(() => { setPerson(initialPerson); setDirty(false) }, [initialPerson])

  if (!person) return null

  const displayName = person.preferred_name
    ? `${person.preferred_name} ${person.last_name}`
    : `${person.first_name} ${person.last_name}`

  const isStale = person.status === 'stale'

  // ── Field change ──
  const change = (field, value) => {
    setPerson(prev => ({ ...prev, [field]: value }))
    setDirty(true)
  }

  // ── Save ──
  const handleSave = async () => {
    setSaving(true)
    const updated = await updatePerson(person.id, {
      first_name:      person.first_name,
      last_name:       person.last_name,
      preferred_name:  person.preferred_name  || null,
      email:           person.email           || null,
      phone:           person.phone           || null,
      company:         person.company         || null,
      contact_type:    person.contact_type    || null,
      notes:           person.notes           || null,
      last_contact_at: person.last_contact_at || null,
    })
    setPerson(prev => ({ ...prev, ...updated }))
    setDirty(false)
    setSaving(false)
    onRefresh?.()
  }

  // ── Activate ──
  const handleActivate = async () => {
    await activatePerson(person.id)
    setPerson(prev => ({ ...prev, status: 'active' }))
    onRefresh?.()
  }

  // ── Re-activate stale person ──
  const handleReactivate = async () => {
    const updated = await updatePerson(person.id, {
      status: 'active',
      is_stale: false,
      last_contact_at: new Date().toISOString().split('T')[0],
    })
    setPerson(prev => ({ ...prev, ...updated }))
    onRefresh?.()
  }

  return (
    <Modal
      open={open}
      onClose={() => { if (dirty) handleSave(); onClose() }}
      size="xl"
      title={null}
      footer={
        dirty ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => { setPerson(initialPerson); setDirty(false) }}>
              Discard changes
            </Button>
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </>
        ) : null
      }
    >
      {/* ── Header row ── */}
      <div className="flex items-start gap-3 mb-4">
        {/* Avatar circle */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold shrink-0"
          style={{ backgroundColor: 'var(--border)', color: 'var(--accent)' }}
        >
          {person.first_name?.[0]?.toUpperCase()}{person.last_name?.[0]?.toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <input
            type="text"
            value={person.first_name}
            onChange={e => change('first_name', e.target.value)}
            placeholder="First name"
            className="bg-transparent text-lg font-semibold outline-none border-b pb-0.5 mr-2"
            style={{ color: 'var(--text-primary)', borderColor: dirty ? 'var(--accent)' : 'transparent', width: '45%' }}
          />
          <input
            type="text"
            value={person.last_name}
            onChange={e => change('last_name', e.target.value)}
            placeholder="Last name"
            className="bg-transparent text-lg font-semibold outline-none border-b pb-0.5"
            style={{ color: 'var(--text-primary)', borderColor: dirty ? 'var(--accent)' : 'transparent', width: '45%' }}
          />
          {person.company && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{person.company}</p>
          )}
        </div>

        <div className="shrink-0 mt-1">
          <StatusPill status={person.status} type="people" />
        </div>
      </div>

      {/* ── Stale banner ── */}
      {isStale && (
        <div
          className="rounded-lg px-4 py-3 mb-4 border text-sm"
          style={{ backgroundColor: 'var(--state-info-bg)', borderColor: 'var(--text-secondary)', color: 'var(--text-mid)' }}
        >
          <p className="font-medium">⚠ Contact is marked stale</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            No contact logged in the past 365 days. Reactivate to clear this flag.
          </p>
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-5 border-b" style={{ borderColor: 'var(--border)' }}>
        {['details', 'tasks', 'projects', 'notes'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors"
            style={{
              borderColor: tab === t ? 'var(--accent)' : 'transparent',
              color:       tab === t ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Details tab ── */}
      {tab === 'details' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Preferred Name">
              <input type="text" value={person.preferred_name ?? ''}
                onChange={e => change('preferred_name', e.target.value)}
                placeholder="Goes by…"
                className={inputCls} style={inputStyle} />
            </FormField>
            <FormField label="Contact Type">
              <select value={person.contact_type ?? ''}
                onChange={e => change('contact_type', e.target.value)}
                className={inputCls} style={inputStyle}>
                <option value="">Select…</option>
                {CONTACT_TYPES.map(t => (
                  <option key={t} value={t.toLowerCase()}>{t}</option>
                ))}
              </select>
            </FormField>
          </div>

          <FormField label="Company / Organization">
            <input type="text" value={person.company ?? ''}
              onChange={e => change('company', e.target.value)}
              placeholder="Where do they work?"
              className={inputCls} style={inputStyle} />
          </FormField>

          <div className="grid grid-cols-2 gap-4">
            <FormField label="Email">
              <input type="email" value={person.email ?? ''}
                onChange={e => change('email', e.target.value)}
                placeholder="email@example.com"
                className={inputCls} style={inputStyle} />
            </FormField>
            <FormField label="Phone">
              <input type="tel" value={person.phone ?? ''}
                onChange={e => change('phone', e.target.value)}
                placeholder="(555) 000-0000"
                className={inputCls} style={inputStyle} />
            </FormField>
          </div>

          <FormField label="Last Contact">
            <input type="date" value={person.last_contact_at ?? ''}
              onChange={e => change('last_contact_at', e.target.value)}
              className={inputCls} style={inputStyle} />
          </FormField>

          <FormField label="Notes">
            <textarea value={person.notes ?? ''}
              onChange={e => change('notes', e.target.value)}
              placeholder="Anything worth remembering about this person…"
              rows={3} className={`${inputCls} resize-none`} style={inputStyle} />
          </FormField>
        </div>
      )}

      {/* ── Tasks tab ── */}
      {tab === 'tasks' && <PersonTasksTab personId={person.id} />}

      {/* ── Projects tab ── */}
      {tab === 'projects' && <PersonProjectsTab personId={person.id} />}

      {/* ── Comments tab ── */}
      {tab === 'notes' && <PersonComments personId={person.id} />}

      {/* ── Action buttons ── */}
      <div className="mt-6 pt-5 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border)' }}>
        {person.status === 'inbox' && (
          <Button variant="success" size="sm" onClick={handleActivate}>
            Activate Contact
          </Button>
        )}
        {isStale && (
          <Button variant="primary" size="sm" onClick={handleReactivate}>
            Reactivate
          </Button>
        )}
        {person.email && (
          <a href={`mailto:${person.email}`}>
            <Button variant="secondary" size="sm">
              Send Email
            </Button>
          </a>
        )}
      </div>
    </Modal>
  )
}
