import { useState, useEffect, useMemo } from 'react'
import { Pencil, Trash2, ChevronDown, ChevronUp, Search, StickyNote } from 'lucide-react'
import { getNotes, createNote, updateNote, deleteNote } from '../lib/api/notes'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'

const PREVIEW_CHARS = 300
const PREVIEW_LINES = 5

function NoteCard({ note, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(note.body)
  const [saving,   setSaving]   = useState(false)

  const lines   = note.body.split('\n')
  const isLong  = lines.length > PREVIEW_LINES || note.body.length > PREVIEW_CHARS
  const display = (!expanded && isLong)
    ? lines.slice(0, PREVIEW_LINES).join('\n').slice(0, PREVIEW_CHARS)
    : note.body

  const timeStr = new Date(note.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  }) + ' · ' + new Date(note.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit',
  })

  const handleSave = async () => {
    if (!draft.trim() || draft === note.body) { setEditing(false); return }
    setSaving(true)
    await onEdit(note.id, draft.trim())
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => { setDraft(note.body); setEditing(false) }

  return (
    <div
      className="rounded-xl border p-4"
      style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{timeStr}</p>
        {!editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setDraft(note.body); setEditing(true); setExpanded(true) }}
              title="Edit note"
              className="flex items-center justify-center rounded transition-colors duration-150"
              style={{ width: 24, height: 24, color: 'var(--text-dim)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)' }}
            >
              <Pencil size={12} />
            </button>
            <button
              onClick={() => onDelete(note.id)}
              title="Delete note"
              className="flex items-center justify-center rounded transition-colors duration-150"
              style={{ width: 24, height: 24, color: 'var(--text-dim)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-dim)'}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave()
              if (e.key === 'Escape') handleCancel()
            }}
            autoFocus
            rows={Math.max(4, draft.split('\n').length + 1)}
            className="w-full bg-transparent border rounded-lg px-3 py-2 text-sm outline-none resize-none"
            style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }}
          />
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={handleSave} disabled={saving || !draft.trim()}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>
            {display}
            {!expanded && isLong && <span style={{ color: 'var(--text-secondary)' }}>…</span>}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 mt-2 text-xs transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show more</>}
            </button>
          )}
        </>
      )}
    </div>
  )
}

function NewNoteModal({ open, onClose, onSave }) {
  const [body,   setBody]   = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { if (open) setBody('') }, [open])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    await onSave(body.trim())
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Note"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!body.trim() || saving}>
            {saving ? 'Saving…' : 'Save Note'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e) }}
          placeholder="What's on your mind?"
          rows={5}
          autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
          style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </form>
    </Modal>
  )
}

export default function Notes() {
  const [notes,       setNotes]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [modalOpen,   setModalOpen]   = useState(false)

  useEffect(() => {
    getNotes().then(setNotes).finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return notes
    return notes.filter(n => n.body.toLowerCase().includes(q))
  }, [notes, search])

  const handleSave = async (body) => {
    const note = await createNote(body)
    setNotes(prev => [note, ...prev])
  }

  const handleEdit = async (id, body) => {
    const updated = await updateNote(id, body)
    setNotes(prev => prev.map(n => n.id === id ? updated : n))
  }

  const handleDelete = async (id) => {
    await deleteNote(id)
    setNotes(prev => prev.filter(n => n.id !== id))
  }

  return (
    <div className="px-10 py-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Notes</h1>
          {!loading && (
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              {notes.length} {notes.length === 1 ? 'note' : 'notes'}
            </span>
          )}
        </div>
        <Button variant="secondary" size="sm" onClick={() => setModalOpen(true)}>
          New Note
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          style={{ color: 'var(--text-dim)' }}
        />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search notes…"
          className="w-full pl-9 pr-4 py-2 rounded-lg text-sm border outline-none"
          style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {/* Notes list */}
      {loading ? (
        <p className="text-sm text-center py-8" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      ) : filtered.length === 0 ? (
        search ? (
          <EmptyState variant="card">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No notes match <span style={{ color: 'var(--text-primary)' }}>"{search}"</span>
            </p>
          </EmptyState>
        ) : (
          <EmptyState variant="card">
            <StickyNote size={24} style={{ color: 'var(--text-dim)', margin: '0 auto 8px' }} />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>No notes yet. Hit New Note to start.</p>
          </EmptyState>
        )
      ) : (
        <div className="space-y-3">
          {filtered.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
          {search && filtered.length < notes.length && (
            <p className="text-xs text-center pt-1" style={{ color: 'var(--text-secondary)' }}>
              Showing {filtered.length} of {notes.length} notes
            </p>
          )}
        </div>
      )}

      <NewNoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
