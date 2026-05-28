import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Trash2, Pencil, Plus, X } from 'lucide-react'
import {
  getPerson, updatePerson, activatePerson, deletePerson,
  getPersonTasks, getPersonProjects, uploadPersonAvatar,
} from '../lib/api/people'
import AvatarCircle from '../components/ui/AvatarCircle'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { StatusPill } from '../components/ui'
import PersonComments from '../components/people/PersonComments'
import { PEOPLE_STATUSES } from '../lib/constants'

const inputCls  = 'w-full px-3 py-2 rounded-lg text-sm border outline-none bg-transparent'
const inputStyle = { borderColor: '#313244', color: '#cdd6f4' }

const CONTACT_TYPES   = ['colleague', 'friend', 'family', 'client', 'vendor', 'mentor', 'other']
const SOCIAL_PLATFORMS = ['Twitter/X', 'LinkedIn', 'Instagram', 'Facebook', 'GitHub', 'YouTube', 'TikTok', 'Bluesky', 'Mastodon', 'Other']

// ─── Small helpers ────────────────────────────────────────────────────────────

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

function ReadField({ label, value, fallback = '—', link }) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: '#6c7086' }}>{label}</p>
      {link && value
        ? <a href={link} className="text-sm hover:underline" style={{ color: '#89b4fa' }}>{value}</a>
        : <p className="text-sm" style={{ color: value ? '#cdd6f4' : '#45475a' }}>{value || fallback}</p>
      }
    </div>
  )
}

function SectionCard({ children }) {
  return (
    <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: '#181825', borderColor: '#313244' }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: '#45475a' }}>{children}</p>
}

function displayName(person) {
  const first = person.preferred_name ?? person.first_name
  return `${first} ${person.last_name}`.trim()
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PersonPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [person,      setPerson]      = useState(null)
  const [tasks,       setTasks]       = useState([])
  const [projects,    setProjects]    = useState([])
  const [loading,     setLoading]     = useState(true)
  const [editing,     setEditing]     = useState(false)
  const [draft,       setDraft]       = useState(null)
  const [saving,      setSaving]      = useState(false)
  const [saveError,   setSaveError]   = useState(null)
  const [showDelete,      setShowDelete]      = useState(false)
  const [deleting,        setDeleting]        = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

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

  // ── Edit helpers ──
  const startEdit  = () => { setDraft({ ...person, social_media: person.social_media ?? [] }); setEditing(true) }
  const cancelEdit = () => { setDraft(null); setEditing(false); setSaveError(null) }
  const change     = (field, value) => setDraft(prev => ({ ...prev, [field]: value }))

  // Social media array helpers
  const addSocial    = () => setDraft(prev => ({ ...prev, social_media: [...(prev.social_media ?? []), { platform: '', handle: '' }] }))
  const removeSocial = (idx) => setDraft(prev => ({ ...prev, social_media: (prev.social_media ?? []).filter((_, i) => i !== idx) }))
  const changeSocial = (idx, field, val) => setDraft(prev => ({
    ...prev,
    social_media: (prev.social_media ?? []).map((item, i) => i === idx ? { ...item, [field]: val } : item),
  }))

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const updated = await updatePerson(person.id, {
        first_name:           draft.first_name,
        last_name:            draft.last_name,
        preferred_name:       draft.preferred_name       || null,
        professional_title:   draft.professional_title   || null,
        relationship:         draft.relationship         || null,
        contact_type:         draft.contact_type         || null,
        company:              draft.company              || null,
        occupation:           draft.occupation           || null,
        email_personal:       draft.email_personal       || null,
        email_work:           draft.email_work           || null,
        phone_personal:       draft.phone_personal       || null,
        phone_work:           draft.phone_work           || null,
        birthday:             draft.birthday             || null,
        address_street:       draft.address_street       || null,
        address_city:         draft.address_city         || null,
        address_state:        draft.address_state        || null,
        address_zip:          draft.address_zip          || null,
        address_work_street:  draft.address_work_street  || null,
        address_work_city:    draft.address_work_city    || null,
        address_work_state:   draft.address_work_state   || null,
        address_work_zip:     draft.address_work_zip     || null,
        social_media:         draft.social_media         ?? [],
        notes:                draft.notes                || null,
      })
      setPerson(prev => ({ ...prev, ...updated }))
      setEditing(false)
      setDraft(null)
    } catch (err) {
      setSaveError(err.message ?? 'Save failed — check console for details')
    } finally {
      setSaving(false)
    }
  }

  const handleActivate = async () => {
    const updated = await activatePerson(person.id)
    setPerson(prev => ({ ...prev, ...updated }))
  }

  const handleAvatarUpload = async (file) => {
    setAvatarUploading(true)
    try {
      const updated = await uploadPersonAvatar(person.id, file)
      setPerson(prev => ({ ...prev, avatar_url: updated.avatar_url }))
    } catch (err) {
      console.error('Avatar upload failed:', err)
    } finally {
      setAvatarUploading(false)
    }
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
  const isStale = person.is_stale || person.status === 'stale'

  // Format birthday for display
  const formatBirthday = (val) => {
    if (!val) return null
    const dt = new Date(val + 'T12:00:00')
    return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Format home address for read view
  const homeAddressLine = [person.address_street, person.address_city, person.address_state, person.address_zip].filter(Boolean).join(', ')
  const workAddressLine = [person.address_work_street, person.address_work_city, person.address_work_state, person.address_work_zip].filter(Boolean).join(', ')

  return (
    <div className="h-full flex flex-col">

      {/* ── Breadcrumb header ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0" style={{ borderColor: '#313244' }}>
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

        {/* ── Stale banner ── */}
        {isStale && (
          <div className="rounded-lg px-4 py-3 border text-sm" style={{ backgroundColor: '#2d1e1e', borderColor: '#DB4437', color: '#f28b82' }}>
            <p className="font-medium">⚠ Contact is stale</p>
          </div>
        )}

        {/* ── Identity section ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: '#cdd6f4' }}>Identity</h2>
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
          {saveError && (
            <p className="text-xs mb-2" style={{ color: '#DB4437' }}>{saveError}</p>
          )}

          {/* Avatar */}
          <div className="flex items-center gap-3 mb-4">
            <AvatarCircle
              src={person.avatar_url}
              name={displayName(person)}
              size="lg"
              canUpload
              uploading={avatarUploading}
              onFileSelect={handleAvatarUpload}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: '#cdd6f4' }}>{displayName(person)}</p>
              <p className="text-xs mt-0.5" style={{ color: '#6c7086' }}>
                {avatarUploading ? 'Uploading…' : 'Click to change photo'}
              </p>
            </div>
          </div>

          <SectionCard>
            {/* Title / First / Last / Preferred */}
            <div className="grid grid-cols-4 gap-3">
              {editing ? (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Title</label>
                    <input type="text" value={d.professional_title ?? ''} onChange={e => change('professional_title', e.target.value)} className={inputCls} style={inputStyle} placeholder="Dr., Mr., Ms." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>First Name</label>
                    <input type="text" value={d.first_name ?? ''} onChange={e => change('first_name', e.target.value)} className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Last Name</label>
                    <input type="text" value={d.last_name ?? ''} onChange={e => change('last_name', e.target.value)} className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Preferred Name</label>
                    <input type="text" value={d.preferred_name ?? ''} onChange={e => change('preferred_name', e.target.value)} className={inputCls} style={inputStyle} placeholder="Optional" />
                  </div>
                </>
              ) : (
                <>
                  <ReadField label="Title" value={person.professional_title} />
                  <ReadField label="First Name" value={person.first_name} />
                  <ReadField label="Last Name" value={person.last_name} />
                  <ReadField label="Preferred Name" value={person.preferred_name} />
                </>
              )}
            </div>

            {/* Relationship / Contact Type / Occupation */}
            <div className="grid grid-cols-3 gap-3">
              {editing ? (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Relationship</label>
                    <input type="text" value={d.relationship ?? ''} onChange={e => change('relationship', e.target.value)} className={inputCls} style={inputStyle} placeholder="Wife, Son, Colleague…" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Contact Type</label>
                    <select value={d.contact_type ?? ''} onChange={e => change('contact_type', e.target.value)} className={inputCls} style={inputStyle}>
                      <option value="">Select…</option>
                      {CONTACT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Occupation</label>
                    <input type="text" value={d.occupation ?? ''} onChange={e => change('occupation', e.target.value)} className={inputCls} style={inputStyle} placeholder="Engineer, Teacher…" />
                  </div>
                </>
              ) : (
                <>
                  <ReadField label="Relationship" value={person.relationship} />
                  <ReadField label="Contact Type" value={person.contact_type ? person.contact_type.charAt(0).toUpperCase() + person.contact_type.slice(1) : null} />
                  <ReadField label="Occupation" value={person.occupation} />
                </>
              )}
            </div>

            {/* Company */}
            {editing ? (
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Company</label>
                <input type="text" value={d.company ?? ''} onChange={e => change('company', e.target.value)} className={inputCls} style={inputStyle} placeholder="Company or organization" />
              </div>
            ) : person.company ? (
              <ReadField label="Company" value={person.company} />
            ) : null}
          </SectionCard>
        </section>

        {/* ── Contact Details section ── */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>Contact Details</h2>
          <SectionCard>
            {/* Emails */}
            <div className="grid grid-cols-2 gap-3">
              {editing ? (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Personal Email</label>
                    <input type="email" value={d.email_personal ?? ''} onChange={e => change('email_personal', e.target.value)} className={inputCls} style={inputStyle} placeholder="personal@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Work Email</label>
                    <input type="email" value={d.email_work ?? ''} onChange={e => change('email_work', e.target.value)} className={inputCls} style={inputStyle} placeholder="work@example.com" />
                  </div>
                </>
              ) : (
                <>
                  <ReadField label="Personal Email" value={person.email_personal} link={person.email_personal ? `mailto:${person.email_personal}` : null} />
                  <ReadField label="Work Email" value={person.email_work} link={person.email_work ? `mailto:${person.email_work}` : null} />
                </>
              )}
            </div>

            {/* Phones + Birthday */}
            <div className="grid grid-cols-3 gap-3">
              {editing ? (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Personal Phone</label>
                    <input type="tel" value={d.phone_personal ?? ''} onChange={e => change('phone_personal', e.target.value)} className={inputCls} style={inputStyle} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Work Phone</label>
                    <input type="tel" value={d.phone_work ?? ''} onChange={e => change('phone_work', e.target.value)} className={inputCls} style={inputStyle} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Birthday</label>
                    <input type="date" value={d.birthday ?? ''} onChange={e => change('birthday', e.target.value || null)} className={inputCls} style={inputStyle} />
                  </div>
                </>
              ) : (
                <>
                  <ReadField label="Personal Phone" value={person.phone_personal} />
                  <ReadField label="Work Phone" value={person.phone_work} />
                  <ReadField label="Birthday" value={formatBirthday(person.birthday)} />
                </>
              )}
            </div>
          </SectionCard>
        </section>

        {/* ── Addresses section ── */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>Addresses</h2>
          <SectionCard>
            {/* Home Address */}
            <div>
              <SectionLabel>Home</SectionLabel>
              {editing ? (
                <div className="space-y-2">
                  <input type="text" value={d.address_street ?? ''} onChange={e => change('address_street', e.target.value)} className={inputCls} style={inputStyle} placeholder="Street address" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={d.address_city ?? ''} onChange={e => change('address_city', e.target.value)} className={inputCls} style={inputStyle} placeholder="City" />
                    <input type="text" value={d.address_state ?? ''} onChange={e => change('address_state', e.target.value)} className={inputCls} style={inputStyle} placeholder="State" />
                    <input type="text" value={d.address_zip ?? ''} onChange={e => change('address_zip', e.target.value)} className={inputCls} style={inputStyle} placeholder="Zip" />
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: homeAddressLine ? '#cdd6f4' : '#45475a' }}>{homeAddressLine || '—'}</p>
              )}
            </div>

            <hr style={{ borderColor: '#313244' }} />

            {/* Work Address */}
            <div>
              <SectionLabel>Work</SectionLabel>
              {editing ? (
                <div className="space-y-2">
                  <input type="text" value={d.address_work_street ?? ''} onChange={e => change('address_work_street', e.target.value)} className={inputCls} style={inputStyle} placeholder="Street address" />
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={d.address_work_city ?? ''} onChange={e => change('address_work_city', e.target.value)} className={inputCls} style={inputStyle} placeholder="City" />
                    <input type="text" value={d.address_work_state ?? ''} onChange={e => change('address_work_state', e.target.value)} className={inputCls} style={inputStyle} placeholder="State" />
                    <input type="text" value={d.address_work_zip ?? ''} onChange={e => change('address_work_zip', e.target.value)} className={inputCls} style={inputStyle} placeholder="Zip" />
                  </div>
                </div>
              ) : (
                <p className="text-sm" style={{ color: workAddressLine ? '#cdd6f4' : '#45475a' }}>{workAddressLine || '—'}</p>
              )}
            </div>
          </SectionCard>
        </section>

        {/* ── Social Media section ── */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>Social Media</h2>
          <SectionCard>
            {editing ? (
              <div className="space-y-2">
                <datalist id="social-platforms-list">
                  {SOCIAL_PLATFORMS.map(p => <option key={p} value={p} />)}
                </datalist>
                {(draft.social_media ?? []).map((entry, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      list="social-platforms-list"
                      value={entry.platform}
                      onChange={e => changeSocial(idx, 'platform', e.target.value)}
                      className={inputCls}
                      style={{ ...inputStyle, flex: '0 0 160px' }}
                      placeholder="Platform"
                    />
                    <input
                      type="text"
                      value={entry.handle}
                      onChange={e => changeSocial(idx, 'handle', e.target.value)}
                      className={`${inputCls} flex-1`}
                      style={inputStyle}
                      placeholder="@handle or URL"
                    />
                    <button
                      onClick={() => removeSocial(idx)}
                      className="flex items-center justify-center rounded-md shrink-0 transition-colors"
                      style={{ width: 30, height: 30, backgroundColor: 'transparent', color: '#6c7086' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#DB4437'; e.currentTarget.style.color = '#fff' }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6c7086' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addSocial}
                  className="flex items-center gap-1.5 text-xs transition-opacity hover:opacity-80"
                  style={{ color: '#89b4fa' }}
                >
                  <Plus size={12} /> Add account
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {(person.social_media ?? []).length === 0 ? (
                  <p className="text-sm" style={{ color: '#45475a' }}>—</p>
                ) : (person.social_media ?? []).map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-28 shrink-0" style={{ color: '#6c7086' }}>{entry.platform}</span>
                    <span className="text-sm" style={{ color: '#cdd6f4' }}>{entry.handle}</span>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        {/* ── Notes section ── */}
        {(editing || person.notes) && (
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>Notes</h2>
            <SectionCard>
              {editing ? (
                <textarea
                  value={d.notes ?? ''}
                  onChange={e => change('notes', e.target.value)}
                  rows={4}
                  className={`${inputCls} resize-none`}
                  style={inputStyle}
                  placeholder="Notes about this person…"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap" style={{ color: '#cdd6f4' }}>{person.notes}</p>
              )}
            </SectionCard>
          </section>
        )}

        {/* ── Tasks section ── */}
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

        {/* ── Projects section ── */}
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

        {/* ── Comments section ── */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>Comments</h2>
          <div className="rounded-xl border p-4" style={{ backgroundColor: '#181825', borderColor: '#313244' }}>
            <PersonComments personId={person.id} />
          </div>
        </section>

        {/* ── What's Next section ── */}
        <section className="pb-6">
          <h2 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>What's Next?</h2>
          <div className="flex flex-wrap gap-2">
            {(person.status === 'inbox' || person.status === 'stale' || person.is_stale) && (
              <Button variant="success" size="sm" onClick={handleActivate}>
                {person.status === 'inbox' ? 'Activate Contact' : 'Reactivate Contact'}
              </Button>
            )}
            {person.email_personal && (
              <Button variant="secondary" size="sm" onClick={() => window.open(`mailto:${person.email_personal}`)}>
                Send Email
              </Button>
            )}
            {person.email_work && !person.email_personal && (
              <Button variant="secondary" size="sm" onClick={() => window.open(`mailto:${person.email_work}`)}>
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
