import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { getNotes, createNote, updateNote, updateNoteContext, deleteNote } from '../lib/api/notes'
import { parseHashtags, resolveHashtags } from '../lib/mentions'
import Button from '../components/ui/Button'
import { PencilBtn, TrashBtn } from '../components/ui/IconBtn'
import Modal from '../components/ui/Modal'
import EmptyState from '../components/ui/EmptyState'
import { useContextTags } from '../contexts/ContextTagsContext'

const PREVIEW_CHARS = 300
const PREVIEW_LINES = 5

function NoteCard({ note, onEdit, onDelete, onUpdateContext, contextTagPool, tagMap, selectable, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(note.body)
  const [saving,   setSaving]   = useState(false)
  const [tagPick,  setTagPick]  = useState('')

  const addTag = async () => {
    if (!tagPick) return
    const next = [...(note.context ?? []), tagPick]
    setTagPick('')
    await onUpdateContext(note.id, next)
  }

  const removeTag = async (tag) => {
    const next = (note.context ?? []).filter(t => t !== tag)
    await onUpdateContext(note.id, next)
  }

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
    const newTags = resolveHashtags(parseHashtags(draft), contextTagPool, note.context ?? [])
    if (newTags.length > 0) await onUpdateContext(note.id, [...(note.context ?? []), ...newTags])
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => { setDraft(note.body); setEditing(false) }

  const navigate = useNavigate()

  const handleCardClick = () => {
    if (selectable) { onToggle?.(); return }
    navigate(`/notes/${note.id}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className="rounded-xl border p-4"
      style={{
        backgroundColor: 'var(--pane-bg)',
        borderColor: selected ? 'var(--accent)' : 'var(--border)',
        cursor: 'pointer',
        transition: 'border-color 150ms',
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {selectable && (
            <span
              className="flex items-center justify-center rounded-full border shrink-0 transition-colors"
              style={{
                width: 16, height: 16,
                backgroundColor: selected ? 'var(--accent)' : 'transparent',
                borderColor: selected ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              {selected && (
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M1.5 4L3.5 6L6.5 2" stroke="var(--app-bg)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              )}
            </span>
          )}
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{timeStr}</p>
        </div>
        {!editing && !selectable && (
          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
            <PencilBtn onClick={() => { setDraft(note.body); setEditing(true); setExpanded(true) }} />
            <TrashBtn onClick={() => onDelete(note.id)} />
          </div>
        )}
      </div>

      {editing ? (
        <div className="space-y-2" onClick={e => e.stopPropagation()}>
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
          {/* Tag picker in edit mode */}
          {contextTagPool.length > 0 && (
            <div className="flex gap-2">
              <select
                value={tagPick}
                onChange={e => setTagPick(e.target.value)}
                className="flex-1 px-2 py-1 rounded-lg text-xs border outline-none bg-transparent"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              >
                <option value="">Add tag…</option>
                {contextTagPool.filter(t => !(note.context ?? []).includes(t.value)).map(t => (
                  <option key={t.id} value={t.value}>#{t.label}</option>
                ))}
              </select>
              <Button size="sm" variant="secondary" onClick={addTag} disabled={!tagPick}>Add</Button>
            </div>
          )}
          {(note.context ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {(note.context ?? []).map(tag => {
                const def = tagMap[tag]
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
          {isLong && !selectable && (
            <button
              onClick={e => { e.stopPropagation(); setExpanded(v => !v) }}
              className="flex items-center gap-1 mt-2 text-xs transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              {expanded ? '↑ Show less' : '↓ Show more'}
            </button>
          )}
          {/* Tags in read mode */}
          {(note.context ?? []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(note.context ?? []).map(tag => {
                const def = tagMap[tag]
                return (
                  <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{ backgroundColor: def?.bg_color ?? 'var(--context-tag-bg)', color: def?.text_color ?? 'var(--context-tag-text)' }}>
                    #{def?.label ?? tag}
                  </span>
                )
              })}
            </div>
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
  const { tags: contextTagPool, tagMap } = useContextTags()
  const [notes,       setNotes]       = useState([])
  const [loading,     setLoading]     = useState(true)
  const [search,      setSearch]      = useState('')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [selectMode,  setSelectMode]  = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkWorking, setBulkWorking] = useState(false)

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

  const handleUpdateContext = async (id, context) => {
    const updated = await updateNoteContext(id, context)
    setNotes(prev => prev.map(n => n.id === id ? updated : n))
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
      const selected = notes.filter(n => selectedIds.has(n.id))
      const dupes = await Promise.all(selected.map(n => createNote(n.body)))
      setNotes(prev => [...dupes, ...prev])
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
          Notes Dashboard
          {!loading && notes.length > 0 && (
            <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-secondary)' }}>
              {notes.length}
            </span>
          )}
        </h1>
        <div className="flex items-center gap-2">
          <Button size="sm" variant={selectMode ? 'secondary' : 'ghost'} onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}>
            {selectMode ? `Cancel (${selectedIds.size} selected)` : 'Select'}
          </Button>
          <Button variant="primary" size="sm" onClick={() => setModalOpen(true)}>+ New Note</Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Search */}
        <div className="relative px-6 pt-4 pb-3">
          <Search
            size={14}
            className="absolute left-9 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-dim)', top: 'calc(50% + 2px)' }}
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search notes…"
            className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border outline-none bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Notes list */}
        <div className="px-6 pb-6">
          {loading ? (
            <EmptyState message="Loading…" />
          ) : filtered.length === 0 ? (
            search ? (
              <EmptyState variant="card">
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  No notes match <span style={{ color: 'var(--text-primary)' }}>"{search}"</span>
                </p>
              </EmptyState>
            ) : (
              <EmptyState variant="card">
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
                  onUpdateContext={handleUpdateContext}
                  contextTagPool={contextTagPool}
                  tagMap={tagMap}
                  selectable={selectMode}
                  selected={selectedIds.has(note.id)}
                  onToggle={() => toggleSelect(note.id)}
                />
              ))}
              {search && filtered.length < notes.length && (
                <p className="text-xs text-center pt-1" style={{ color: 'var(--text-secondary)' }}>
                  Showing {filtered.length} of {notes.length} notes
                </p>
              )}
            </div>
          )}
        </div>
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

      <NewNoteModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
      />
    </div>
  )
}
