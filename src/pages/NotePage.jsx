import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getNote, updateNote, updateNoteContext, deleteNote } from '../lib/api/notes'
import { useContextTags } from '../contexts/ContextTagsContext'
import Button from '../components/ui/Button'
import { TrashBtn } from '../components/ui/IconBtn'
import ConfirmDialog from '../components/ui/ConfirmDialog'

function formatDateTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function previewTitle(body) {
  if (!body) return 'Note'
  const first = body.split('\n').find(l => l.trim())
  return first ? (first.length > 60 ? first.slice(0, 60) + '…' : first) : 'Note'
}

export default function NotePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tags: contextTagPool, tagMap } = useContextTags()

  const [note,     setNote]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [body,     setBody]     = useState('')
  const [editing,  setEditing]  = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [tagPick,  setTagPick]  = useState('')
  const [showDelete, setShowDelete] = useState(false)
  const [deleting,   setDeleting]   = useState(false)

  useEffect(() => {
    getNote(id)
      .then(n => { setNote(n); setBody(n.body) })
      .catch(() => setNote(null))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
    </div>
  )
  if (!note) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--danger)' }}>Note not found.</p>
    </div>
  )

  const handleSave = async () => {
    if (!body.trim() || body === note.body) { setEditing(false); return }
    setSaving(true)
    const updated = await updateNote(note.id, body.trim())
    setNote(updated)
    setBody(updated.body)
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => { setBody(note.body); setEditing(false) }

  const saveContext = async (context) => {
    setNote(prev => ({ ...prev, context }))
    await updateNoteContext(note.id, context)
  }
  const addTag    = () => { if (tagPick) { saveContext([...(note.context ?? []), tagPick]); setTagPick('') } }
  const removeTag = (tag) => saveContext((note.context ?? []).filter(t => t !== tag))

  const handleDelete = async () => {
    setDeleting(true)
    await deleteNote(note.id)
    navigate('/notes')
  }

  return (
    <div className="h-full flex flex-col">

      {/* Breadcrumb */}
      <div className="flex items-center gap-3 px-6 py-4 border-b shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button
          onClick={() => navigate('/notes')}
          className="text-sm transition-opacity hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          ← Notes Dashboard
        </button>
        <span style={{ color: 'var(--border)' }}>/</span>
        <span className="text-sm truncate flex-1" style={{ color: 'var(--text-primary)' }}>
          {previewTitle(note.body)}
        </span>
        <TrashBtn onClick={() => setShowDelete(true)} title="Delete note" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Metadata */}
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Created</p>
            <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatDateTime(note.created_at)}</p>
          </div>
          {note.updated_at && note.updated_at !== note.created_at && (
            <div>
              <p className="text-xs font-medium mb-0.5" style={{ color: 'var(--text-secondary)' }}>Last edited</p>
              <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{formatDateTime(note.updated_at)}</p>
            </div>
          )}
        </div>

        {/* Body */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Note</h2>
            {!editing ? (
              <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Edit</Button>
            ) : (
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
                <Button size="sm" variant="primary" onClick={handleSave} disabled={saving || !body.trim()}>
                  {saving ? 'Saving…' : 'Save'}
                </Button>
              </div>
            )}
          </div>
          <div className="rounded-xl border p-4" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
            {editing ? (
              <textarea
                value={body}
                onChange={e => setBody(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
                  if (e.key === 'Escape') handleCancel()
                }}
                autoFocus
                rows={Math.max(6, body.split('\n').length + 2)}
                className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm outline-none resize-none"
                style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{note.body}</p>
            )}
          </div>
        </section>

        {/* Context Tags */}
        <section>
          <h2 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Context Tags</h2>
          <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
            <div className="flex gap-2">
              <select
                value={tagPick}
                onChange={e => setTagPick(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none bg-transparent"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="">Pick a tag…</option>
                {contextTagPool.filter(t => !(note.context ?? []).includes(t.value)).map(t => (
                  <option key={t.id} value={t.value}>@{t.label}</option>
                ))}
              </select>
              <Button size="sm" variant="secondary" onClick={addTag} disabled={!tagPick}>Add</Button>
            </div>
            {contextTagPool.length === 0 && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                No tags defined yet — add some in Settings → Context Tags.
              </p>
            )}
            {(note.context ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(note.context ?? []).map(tag => {
                  const def = tagMap[tag]
                  return (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                      style={{ backgroundColor: def?.bg_color ?? 'var(--context-tag-bg)', color: def?.text_color ?? 'var(--context-tag-text)' }}>
                      @{def?.label ?? tag}
                      <button onClick={() => removeTag(tag)} className="ml-0.5 hover:opacity-70 leading-none" aria-label={`Remove ${tag}`}>×</button>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </section>

      </div>

      <ConfirmDialog
        open={showDelete}
        onClose={() => { if (!deleting) setShowDelete(false) }}
        onConfirm={handleDelete}
        title="Delete this note?"
        message="This permanently deletes the note. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />

    </div>
  )
}
