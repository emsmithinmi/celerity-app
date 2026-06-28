import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import {
  getPerson, updatePerson, deletePerson,
  getPersonTasks, getPersonProjects, uploadPersonAvatar,
} from '../lib/api/people'
import { getTasks, linkPersonToTask, unlinkPersonFromTask } from '../lib/api/tasks'
import AvatarCircle from '../components/ui/AvatarCircle'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { PencilBtn, TrashBtn } from '../components/ui'
import PersonComments from '../components/people/PersonComments'
import { useContextTags } from '../contexts/ContextTagsContext'
import { getPersonNotes } from '../lib/api/notes'

const inputCls  = 'w-full px-3 py-2 rounded-lg text-sm border outline-none bg-transparent'
const inputStyle = { borderColor: 'var(--border)', color: 'var(--text-primary)' }

const CONTACT_TYPES   = ['Work', 'Family', 'Social', 'Services', 'Other']
const SOCIAL_PLATFORMS = ['Twitter/X', 'LinkedIn', 'Instagram', 'Facebook', 'GitHub', 'YouTube', 'TikTok', 'Bluesky', 'Mastodon', 'Other']

// ─── Small helpers ────────────────────────────────────────────────────────────

function ReadField({ label, value, fallback = '—', link }) {
  return (
    <div>
      <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {link && value
        ? <a href={link} className="text-sm hover:underline" style={{ color: 'var(--accent)' }}>{value}</a>
        : <p className="text-sm" style={{ color: value ? 'var(--text-primary)' : 'var(--text-dim)' }}>{value || fallback}</p>
      }
    </div>
  )
}

function SectionCard({ children }) {
  return (
    <div className="rounded-xl border p-4 space-y-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }) {
  return <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-dim)' }}>{children}</p>
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

  const [allTasks,    setAllTasks]    = useState([])
  const [taskSearch,  setTaskSearch]  = useState('')
  const [tasksOpen,   setTasksOpen]   = useState(false)
  const [linkedNotes, setLinkedNotes] = useState([])

  const [socialPlatform, setSocialPlatform] = useState('')
  const [socialHandle,   setSocialHandle]   = useState('')
  const [socialSaving,   setSocialSaving]   = useState(false)
  const [tagPick,        setTagPick]        = useState('')

  const { tags: contextTagPool, tagMap: contextTagMap } = useContextTags()

  const saveContext = async (context) => {
    setPerson(prev => ({ ...prev, context }))
    await updatePerson(person?.id, { context })
  }
  const addTag    = () => { if (tagPick) { saveContext([...(person.context ?? []), tagPick]); setTagPick('') } }
  const removeTag = (tag) => saveContext((person.context ?? []).filter(t => t !== tag))

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
  useEffect(() => { getTasks().then(setAllTasks).catch(() => {}) }, [])
  useEffect(() => { getPersonNotes(id).then(setLinkedNotes).catch(() => {}) }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
    </div>
  )

  if (!person) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--danger)' }}>Person not found.</p>
    </div>
  )

  // ── Edit helpers ──
  const startEdit  = () => { setDraft({ ...person }); setEditing(true) }
  const cancelEdit = () => { setDraft(null); setEditing(false); setSaveError(null) }
  const change     = (field, value) => setDraft(prev => ({ ...prev, [field]: value }))

  const addSocialEntry = async () => {
    const platform = socialPlatform.trim()
    const handle   = socialHandle.trim()
    if (!platform || !handle || socialSaving) return
    setSocialSaving(true)
    try {
      const next = [...(person.social_media ?? []), { platform, handle }]
      const updated = await updatePerson(person.id, { social_media: next })
      setPerson(prev => ({ ...prev, ...updated }))
      setSocialPlatform('')
      setSocialHandle('')
    } finally {
      setSocialSaving(false)
    }
  }

  const removeSocialEntry = async (idx) => {
    const next = (person.social_media ?? []).filter((_, i) => i !== idx)
    const updated = await updatePerson(person.id, { social_media: next })
    setPerson(prev => ({ ...prev, ...updated }))
  }

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
        notes:                draft.notes                || null,
        icon:                 draft.icon                 || null,
        color:                draft.color                || null,
        context:              draft.context              ?? [],
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

  // Format birthday for display
  const formatBirthday = (val) => {
    if (!val) return null
    const dt = new Date(val + 'T12:00:00')
    return dt.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Format home address for read view
  const homeAddressLine = [person.address_street, person.address_city, person.address_state, person.address_zip].filter(Boolean).join(', ')
  const workAddressLine = [person.address_work_street, person.address_work_city, person.address_work_state, person.address_work_zip].filter(Boolean).join(', ')

  const handleLinkTask = async (taskId) => {
    await linkPersonToTask(taskId, id)
    setTaskSearch('')
    setTasksOpen(false)
    const updated = await getPersonTasks(id)
    setTasks(updated)
  }

  const handleUnlinkTask = async (taskId) => {
    await unlinkPersonFromTask(taskId, id)
    const updated = await getPersonTasks(id)
    setTasks(updated)
  }

  const linkedTaskIds = new Set(tasks.map(t => t.id))
  const filteredTasks = allTasks
    .filter(t => !linkedTaskIds.has(t.id))
    .filter(t => {
      const q = taskSearch.trim().toLowerCase()
      if (!q) return true
      return t.title.toLowerCase().includes(q)
    })
    .slice(0, 8)

  return (
    <div className="h-full flex flex-col">

      {/* ── Breadcrumb header ── */}
      <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => navigate('/people')}
          className="text-sm transition-opacity hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← People
        </button>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-sm truncate flex-1" style={{ color: 'var(--text-primary)' }}>
          {displayName(person)}
        </span>
        <TrashBtn onClick={() => setShowDelete(true)} title="Remove contact" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* ── Identity section ── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Identity</h2>
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
            <p className="text-xs mb-2" style={{ color: 'var(--danger)' }}>{saveError}</p>
          )}

          {/* Avatar + color/icon */}
          <div className="flex items-center gap-3 mb-4">
            <AvatarCircle
              src={person.avatar_url}
              name={displayName(person)}
              size="lg"
              canUpload
              uploading={avatarUploading}
              onFileSelect={handleAvatarUpload}
              bgColor={person.color ?? undefined}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{displayName(person)}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
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
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Title</label>
                    <input type="text" value={d.professional_title ?? ''} onChange={e => change('professional_title', e.target.value)} className={inputCls} style={inputStyle} placeholder="Dr., Mr., Ms." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>First Name</label>
                    <input type="text" value={d.first_name ?? ''} onChange={e => change('first_name', e.target.value)} className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Last Name</label>
                    <input type="text" value={d.last_name ?? ''} onChange={e => change('last_name', e.target.value)} className={inputCls} style={inputStyle} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Preferred Name</label>
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

            {/* Avatar icon + color (edit mode only) */}
            {editing && (
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Avatar Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={d.color ?? '#374151'}
                      onChange={e => change('color', e.target.value)}
                      className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5"
                    />
                    <input
                      value={d.color ?? ''}
                      onChange={e => change('color', e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none font-mono bg-transparent"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                      placeholder="#374151"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Relationship / Contact Type / Occupation */}
            <div className="grid grid-cols-3 gap-3">
              {editing ? (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Relationship</label>
                    <input type="text" value={d.relationship ?? ''} onChange={e => change('relationship', e.target.value)} className={inputCls} style={inputStyle} placeholder="Wife, Son, Colleague…" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Contact Type</label>
                    <select value={d.contact_type ?? ''} onChange={e => change('contact_type', e.target.value)} className={inputCls} style={inputStyle}>
                      <option value="">Select…</option>
                      {CONTACT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Occupation</label>
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
                <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Company</label>
                <input type="text" value={d.company ?? ''} onChange={e => change('company', e.target.value)} className={inputCls} style={inputStyle} placeholder="Company or organization" />
              </div>
            ) : person.company ? (
              <ReadField label="Company" value={person.company} />
            ) : null}
          </SectionCard>
        </section>

        {/* ── Contact Details section ── */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Contact Details</h2>
          <SectionCard>
            {/* Emails */}
            <div className="grid grid-cols-2 gap-3">
              {editing ? (
                <>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Personal Email</label>
                    <input type="email" value={d.email_personal ?? ''} onChange={e => change('email_personal', e.target.value)} className={inputCls} style={inputStyle} placeholder="personal@example.com" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Work Email</label>
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
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Personal Phone</label>
                    <input type="tel" value={d.phone_personal ?? ''} onChange={e => change('phone_personal', e.target.value)} className={inputCls} style={inputStyle} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Work Phone</label>
                    <input type="tel" value={d.phone_work ?? ''} onChange={e => change('phone_work', e.target.value)} className={inputCls} style={inputStyle} placeholder="+1 (555) 000-0000" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Birthday</label>
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
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Addresses</h2>
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
                <p className="text-sm" style={{ color: homeAddressLine ? 'var(--text-primary)' : 'var(--text-dim)' }}>{homeAddressLine || '—'}</p>
              )}
            </div>

            <hr style={{ borderColor: 'var(--border)' }} />

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
                <p className="text-sm" style={{ color: workAddressLine ? 'var(--text-primary)' : 'var(--text-dim)' }}>{workAddressLine || '—'}</p>
              )}
            </div>
          </SectionCard>
        </section>

        {/* ── Social Media section ── */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Social Media</h2>
          <SectionCard>
            <datalist id="social-platforms-list">
              {SOCIAL_PLATFORMS.map(p => <option key={p} value={p} />)}
            </datalist>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                list="social-platforms-list"
                value={socialPlatform}
                onChange={e => setSocialPlatform(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSocialEntry()}
                className={inputCls}
                style={{ ...inputStyle, flex: '0 0 160px' }}
                placeholder="Platform"
              />
              <input
                type="text"
                value={socialHandle}
                onChange={e => setSocialHandle(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addSocialEntry()}
                className={`${inputCls} flex-1`}
                style={inputStyle}
                placeholder="@handle or URL"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={addSocialEntry}
                disabled={!socialPlatform.trim() || !socialHandle.trim() || socialSaving}
              >
                {socialSaving ? 'Adding…' : 'Add'}
              </Button>
            </div>

            {(person.social_media ?? []).length > 0 && (
              <div className="space-y-1.5">
                {(person.social_media ?? []).map((entry, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                    style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}
                  >
                    <span className="text-xs font-medium w-28 shrink-0" style={{ color: 'var(--text-secondary)' }}>{entry.platform}</span>
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{entry.handle}</span>
                    <button
                      onClick={() => removeSocialEntry(idx)}
                      title="Remove"
                      className="flex items-center justify-center rounded-md shrink-0 transition-colors"
                      style={{ width: 26, height: 26, backgroundColor: 'transparent', color: 'var(--text-secondary)' }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)' }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        </section>

        {/* ── Notes section ── */}
        {(editing || person.notes) && (
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Notes</h2>
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
                <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{person.notes}</p>
              )}
            </SectionCard>
          </section>
        )}

        {/* ── Context Tags section ── */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Context Tags</h2>
          <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
            <div className="flex gap-2">
              <select
                value={tagPick}
                onChange={e => setTagPick(e.target.value)}
                className={`${inputCls} flex-1`}
                style={inputStyle}
              >
                <option value="">Pick a tag…</option>
                {contextTagPool.filter(t => !(person.context ?? []).includes(t.value)).map(t => (
                  <option key={t.id} value={t.value}>#{t.label}</option>
                ))}
              </select>
              <Button size="sm" variant="secondary" onClick={addTag} disabled={!tagPick}>Add</Button>
            </div>
            {contextTagPool.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                No tags defined yet — add some in Settings → Context Tags.
              </p>
            )}
            {(person.context ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(person.context ?? []).map(tag => {
                  const def = contextTagMap[tag]
                  return (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: def?.bg_color ?? 'var(--context-tag-bg)', color: def?.text_color ?? 'var(--context-tag-text)' }}>
                      #{def?.label ?? tag}
                      <button onClick={() => removeTag(tag)} className="ml-0.5 hover:opacity-70 leading-none" aria-label={`Remove ${tag}`}>×</button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </section>

        {/* ── Tasks section ── */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
            Tasks {tasks.length > 0 && <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>({tasks.length})</span>}
          </h2>
          <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
            <div className="relative">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={taskSearch}
                  onChange={e => { setTaskSearch(e.target.value); setTasksOpen(true) }}
                  onFocus={() => setTasksOpen(true)}
                  onBlur={() => setTimeout(() => setTasksOpen(false), 150)}
                  placeholder="Search tasks…"
                  className={`${inputCls} flex-1`}
                  style={inputStyle}
                />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => navigate('/tasks')}
                  title="Go to Tasks to add a new one"
                >
                  Add
                </Button>
              </div>
              {tasksOpen && filteredTasks.length > 0 && (
                <div
                  className="absolute z-10 left-0 right-0 mt-1 rounded-lg border shadow-lg overflow-hidden"
                  style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
                >
                  {filteredTasks.map(t => (
                    <button
                      key={t.id}
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => handleLinkTask(t.id)}
                      className="w-full text-left px-3 py-2 text-sm hover:opacity-80 border-t first:border-t-0 flex items-center justify-between gap-3"
                      style={{ borderColor: 'var(--border)', color: 'var(--text-primary)', backgroundColor: 'transparent' }}
                    >
                      <span className="truncate">{t.title}</span>
                      <span className="text-xs flex-shrink-0 px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--border)', color: 'var(--text-secondary)' }}>
                        {t.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {tasks.length > 0 && (
              <div className="space-y-1.5">
                {tasks.map(task => task && (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border"
                    style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}
                  >
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--border)', color: 'var(--text-primary)' }}>
                      {task.status}
                    </span>
                    <span
                      className="text-sm flex-1 truncate cursor-pointer hover:underline"
                      style={{ color: 'var(--text-primary)' }}
                      onClick={() => navigate(`/tasks/${task.id}`)}
                    >
                      {task.title}
                    </span>
                    <button
                      onClick={() => handleUnlinkTask(task.id)}
                      className="text-xs hover:opacity-60 flex-shrink-0"
                      style={{ color: 'var(--text-secondary)' }}
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── Projects section ── */}
        {projects.length > 0 && (
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Projects <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>({projects.length})</span>
            </h2>
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
              {projects.map(project => project && (
                <div
                  key={project.id}
                  className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer hover:opacity-80"
                  style={{ borderColor: 'var(--border)' }}
                  onClick={() => navigate(`/projects/${project.id}`)}
                >
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--border)', color: 'var(--text-primary)' }}>
                    {project.status}
                  </span>
                  <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{project.title}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Linked Notes section ── */}
        {linkedNotes.length > 0 && (
          <section>
            <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
              Notes <span className="text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>({linkedNotes.length})</span>
            </h2>
            <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
              {linkedNotes.filter(Boolean).map(note => {
                const firstLine = note.body.split('\n').find(l => l.trim()) ?? ''
                const preview = firstLine.length > 80 ? firstLine.slice(0, 80) + '…' : firstLine
                const dateStr = new Date(note.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                return (
                  <div
                    key={note.id}
                    className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer hover:opacity-80"
                    style={{ borderColor: 'var(--border)' }}
                    onClick={() => navigate(`/notes/${note.id}`)}
                  >
                    <span className="text-sm flex-1 truncate" style={{ color: 'var(--text-primary)' }}>{preview || 'Untitled note'}</span>
                    <span className="text-xs shrink-0" style={{ color: 'var(--text-secondary)' }}>{dateStr}</span>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Comments section ── */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Notes</h2>
          <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
            <PersonComments personId={person.id} />
          </div>
        </section>


      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => { if (!deleting) setShowDelete(false) }}
        onConfirm={handleDelete}
        title="Remove this contact?"
        message="This permanently deletes the contact and all their notes. Their linked tasks and projects are not deleted."
        confirmLabel="Remove"
        variant="danger"
        loading={deleting}
      />

    </div>
  )
}
