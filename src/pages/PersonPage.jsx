import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2, Pencil } from 'lucide-react'
import {
  getPerson, updatePerson, activatePerson, deletePerson,
  getPersonTasks, getPersonProjects,
} from '../lib/api/people'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { StatusPill } from '../components/ui'
import PersonComments from '../components/people/PersonComments'
import { PEOPLE_STATUSES } from '../lib/constants'

const inputCls  = 'w-full px-3 py-2 rounded-lg text-sm border outline-none bg-transparent'
const inputStyle = { borderColor: '#313244', color: '#cdd6f4' }

const CONTACT_TYPES = ['colleague', 'friend', 'family', 'client', 'vendor', 'mentor', 'other']

function PencilBtn({ onClick, title = 'Edit' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-md transition-colors duration-150"
      style={{ width: 30, height: 30, backgroundColor: 'transparent', color: '#6c7086' }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#313244'; e.currentTarget.style.color = '#cdd6f4' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6c7086' }}
    >
      <Pencil size={14} />
    </button>
  )
}

function TrashBtn({ onClick, title = 'Remove contact' }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-md transition-colors duration-150"
      style={{ width: 30, height: 30, backgroundColor: '#DB4437', color: '#fff' }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#c53929'}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#DB4437'}
    >
      <Trash2 size={14} />
    </button>
  )
}

function ReadField({ label, value, fallback = '—' }) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: '#6c7086' }}>{label}</p>
      <p className="text-sm" style={{ color: value ? '#cdd6f4' : '#45475a' }}>{value || fallback}</p>
    </div>
  )
}

function displayName(person) {
  const first = person.preferred_name ?? person.first_name
  return `${first} ${person.last_name}`.trim()
}

export default function PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [person,   setPerson]   = useState(null)
  const [tasks,    setTasks]    = useState([])
  const [projects, setProjects] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState(null)
  const [showDelete,  setShowDelete]  = useState(false)
  const [deleting,    setDeleting]    = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [p, t, pr] = await Promise.all([
        getPerson(id),
        getPersonTasks(id),
        getPersonProjects(id),
      ])
      setPerson(p)
      setTasks(t)
      setProjects(pr)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: '#6c7086' }}>Loading…</p>
    </div>
  )

  if (!person) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: '#DB4437' }}>Person not found.</p>
    </div>
  )

  const startEdit  = () => { setDraft({ ...person }); setEditing(true) }
  const cancelEdit = () => { setDraft(null); setEditing(false) }
  const change     = (field, value) => setDraft(prev => ({ ...prev, [field]: value }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updatePerson(person.id, {
        first_name:      draft.first_name,
        last_name:       draft.last_name,
        preferred_name:  draft.preferred_name || null,
        contact_type:    draft.contact_type   || null,
        company:         draft.company        || null,
        email:           draft.email          || null,
        phone:           draft.phone          || null,
        last_contact_at: draft.last_contact_at || null,
        notes:           draft.notes          || null,
      })
      setPerson(prev => ({ ...prev, ...updated }))
      setEditing(false)
      setDraft(null)
    } catch (err) {
      console.error('Save failed:', err)
      setSaveError(err.message ?? 'Save failed — check console for details')
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async () => {
    const updated = await activatePerson(person.id)
    setPerson(prev => ({ ...prev, ...updated }))
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deletePerson(person.id)
      navigate('/people')
    } finally {
      setDeleting(false)
    }
  }

  const d = editing ? draft : person
  const statusConfig = PEOPLE_STATUSES[person.status] ?? {}

  return (
    <div className="h-full flex flex-col">
      {/* Breadcrumb header */}
      <div
        className="flex items-center gap-3 px-6 py-4 border-b shrink-0"
        style={{ borderColor: '#313244' }}
      >
        <button
          onClick={() => navigate('/people')}
          className="text-sm transition-opacity hover:opacity-80"
          style={{ color: '#6c7086' }}
        >
          ← People
        </button>
        <span style={{ color: '#313244' }}>/</span>
        <span className="text-sm truncate flex-1" style={{ color: '#cdd6f4' }}>
          {displayName(person)}
        </span>
        <span
          className="text-xs px-2.5 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}
        >
          {statusConfig.label ?? person.status}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Stale banner */}
        {(person.is_stale || person.status === 'stale') && (
          <div
            className="rounded-lg px-4 py-3 border text-sm"
            style={{ backgroundColor: '#2d1e1e', borderColor: '#DB4437', color: '#f28b82' }}
          >
            <p className="font-medium">⚠ Contact is stale</p>
            <p className="text-xs mt-1" style={{ color: '#c07070' }}>
              Last contact:{' '}
              {person.last_contact_at
                ? new Date(person.last_contact_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : 'never'}
            </p>
          </div>
        )}

        {/* Contact Info section */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: '#cdd6f4' }}>Contact Info</h2>
            {!editing ? (
              <PencilBtn onClick={startEdit} />
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
                <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}
          </div>

          <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: '#181825', borderColor: '#313244' }}>
            <div className="grid grid-cols-3 gap-4">
              {/* First name */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>First Name</label>
                  <input type="text" value={d.first_name ?? ''} onChange={e => change('first_name', e.target.value)} className={inputCls} style={inputStyle} />
                </div>
              ) : (
                <ReadField label="First Name" value={person.first_name} />
              )}

              {/* Last name */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Last Name</label>
                  <input type="text" value={d.last_name ?? ''} onChange={e => change('last_name', e.target.value)} className={inputCls} style={inputStyle} />
                </div>
              ) : (
                <ReadField label="Last Name" value={person.last_name} />
              )}

              {/* Preferred name */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Preferred Name</label>
                  <input type="text" value={d.preferred_name ?? ''} onChange={e => change('preferred_name', e.target.value)} className={inputCls} style={inputStyle} placeholder="Optional" />
                </div>
              ) : (
                <ReadField label="Preferred Name" value={person.preferred_name} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Contact type */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Contact Type</label>
                  <select value={d.contact_type ?? ''} onChange={e => change('contact_type', e.target.value)} className={inputCls} style={inputStyle}>
                    <option value="">Select…</option>
                    {CONTACT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                  </select>
                </div>
              ) : (
                <ReadField label="Contact Type" value={person.contact_type ? person.contact_type.charAt(0).toUpperCase() + person.contact_type.slice(1) : null} />
              )}

              {/* Company */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Company</label>
                  <input type="text" value={d.company ?? ''} onChange={e => change('company', e.target.value)} className={inputCls} style={inputStyle} placeholder="Company or organization" />
                </div>
              ) : (
                <ReadField label="Company" value={person.company} />
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {/* Email */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Email</label>
                  <input type="email" value={d.email ?? ''} onChange={e => change('email', e.target.value)} className={inputCls} style={inputStyle} placeholder="email@example.com" />
                </div>
              ) : (
                <div>
                  <p className="text-xs font-medium mb-0.5" style={{ color: '#6c7086' }}>Email</p>
                  {person.email
                    ? <a href={`mailto:${person.email}`} className="text-sm hover:underline" style={{ color: '#89b4fa' }}>{person.email}</a>
                    : <p className="text-sm" style={{ color: '#45475a' }}>—</p>
                  }
                </div>
              )}

              {/* Phone */}
              {editing ? (
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Phone</label>
                  <input type="tel" value={d.phone ?? ''} onChange={e => change('phone', e.target.value)} className={inputCls} style={inputStyle} placeholder="+1 (555) 000-0000" />
                </div>
              ) : (
                <ReadField label="Phone" value={person.phone} />
              )}
            </div>

            {/* Last contact */}
            {editing ? (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Last Contact</label>
                <input type="date" value={d.last_contact_at ? d.last_contact_at.split('T')[0] : ''} onChange={e => change('last_contact_at', e.target.value ? new Date(e.target.value).toISOString() : null)} className={inputCls} style={inputStyle} />
              </div>
            ) : (
              <ReadField
                label="Last Contact"
                value={person.last_contact_at
                  ? new Date(person.last_contact_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                  : null}
              />
            )}

            {/* Notes */}
            {editing ? (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Notes</label>
                <textarea value={d.notes ?? ''} onChange={e => change('notes', e.target.value)} rows={3} className={`${inputCls} resize-none`} style={inputStyle} placeholder="Notes about this person…" />
              </div>
            ) : person.notes ? (
              <ReadField label="Notes" value={person.notes} />
            ) : null}
          </div>
        </section>

        {/* Tasks section */}
        {tasks.length > 0 && (
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>
              Tasks <span className="text-sm font-normal" style={{ color: '#6c7086' }}>({tasks.length})</span>
            </h2>
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#181825', borderColor: '#313244' }}>
              {tasks.map(task => task && (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer hover:opacity-80"
                  style={{ borderColor: '#313244' }}
                  onClick={() => navigate(`/tasks/${task.id}`)}
                >
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#313244', color: '#cdd6f4' }}>
                    {task.status}
                  </span>
                  <span className="text-sm flex-1 truncate" style={{ color: '#cdd6f4' }}>{task.title}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Projects section */}
        {projects.length > 0 && (
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>
              Projects <span className="text-sm font-normal" style={{ color: '#6c7086' }}>({projects.length})</span>
            </h2>
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: '#181825', borderColor: '#313244' }}>
              {projects.map(project => project && (
                <div
                  key={project.id}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer hover:opacity-80"
                  style={{ borderColor: '#313244' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#313244', color: '#cdd6f4' }}>
                    {project.status}
                  </span>
                  <span className="text-sm flex-1 truncate" style={{ color: '#cdd6f4' }}>{project.title}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Comments section */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>Comments</h2>
          <div className="rounded-xl border p-4" style={{ backgroundColor: '#181825', borderColor: '#313244' }}>
            <PersonComments personId={person.id} />
          </div>
        </section>

        {/* What's Next */}
        <section className="pb-6">
          <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>What's Next?</h2>
          <div className="flex flex-wrap gap-2">
            {(person.status === 'inbox' || person.status === 'stale' || person.is_stale) && (
              <Button variant="success" size="sm" onClick={handleActivate}>
                {person.status === 'inbox' ? 'Activate Contact' : 'Reactivate Contact'}
              </Button>
            )}
            {person.email && (
              <Button variant="secondary" size="sm" onClick={() => window.open(`mailto:${person.email}`)}>
                Send Email
              </Button>
            )}
            <TrashBtn onClick={() => setShowDelete(true)} title="Remove contact" />
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => { if (!deleting) setShowDelete(false) }}
        onConfirm={handleDelete}
        title="Remove this contact?"
        message="This permanently deletes the contact and all their comments. Their linked tasks and projects are not deleted."
        confirmLabel="Remove"
        variant="danger"
        loading={deleting}
      />
    </div>
  )
}
