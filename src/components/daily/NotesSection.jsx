import { useState } from 'react'
import { Pencil, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import Button from '../ui/Button'

const PREVIEW_LINES = 3

function NoteEntry({ entry, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const [editing,  setEditing]  = useState(false)
  const [draft,    setDraft]    = useState(entry.body)
  const [saving,   setSaving]   = useState(false)

  const date    = new Date(entry.timestamp)
  const timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' · '
    + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const lines       = entry.body.split('\n')
  const isLong      = lines.length > PREVIEW_LINES || entry.body.length > 240
  const displayBody = (!expanded && isLong)
    ? lines.slice(0, PREVIEW_LINES).join('\n').slice(0, 240)
    : entry.body

  const handleSave = async () => {
    if (!draft.trim() || draft === entry.body) { setEditing(false); return }
    setSaving(true)
    await onEdit(entry.timestamp, draft.trim())
    setSaving(false)
    setEditing(false)
  }

  const handleCancel = () => { setDraft(entry.body); setEditing(false) }

  return (
    <div
      className="rounded-lg px-3 py-2.5 border"
      style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}
    >
      {/* Header: timestamp + actions */}
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{timeStr}</p>
        {!editing && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setDraft(entry.body); setEditing(true); setExpanded(true) }}
              title="Edit note"
              className="flex items-center justify-center rounded transition-colors duration-150"
              style={{ width: 22, height: 22, backgroundColor: 'transparent', color: 'var(--text-dim)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-dim)' }}
            >
              <Pencil size={11} />
            </button>
            <button
              onClick={() => onDelete(entry.timestamp)}
              title="Delete note"
              className="flex items-center justify-center rounded transition-colors duration-150"
              style={{ width: 22, height: 22, backgroundColor: 'transparent', color: 'var(--text-dim)' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)' }}
            >
              <Trash2 size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Body */}
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
            rows={Math.max(3, draft.split('\n').length + 1)}
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
            {displayBody}
            {!expanded && isLong && <span style={{ color: 'var(--text-secondary)' }}>…</span>}
          </p>
          {isLong && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="flex items-center gap-1 mt-1 text-xs transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              {expanded
                ? <><ChevronUp size={12} /> Show less</>
                : <><ChevronDown size={12} /> Show more</>}
            </button>
          )}
        </>
      )}
    </div>
  )
}

export default function NotesSection({ notes = [], onAdd, onEdit, onDelete }) {
  const [body,   setBody]   = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e?.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    try {
      await onAdd(body.trim())
      setBody('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
        Notes
      </h3>

      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2 items-start">
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e) }}
              placeholder="Add a note… (Ctrl+Enter)"
              rows={2}
              className="flex-1 px-3 py-2 rounded-lg text-sm border outline-none resize-none"
              style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <Button type="submit" size="sm" variant="secondary" disabled={!body.trim() || saving}>
              {saving ? 'Saving…' : 'Add'}
            </Button>
          </div>
        </form>

        {notes.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No notes yet.</p>
        ) : (
          <div className="space-y-2">
            {[...notes].reverse().map(entry => (
              <NoteEntry key={entry.timestamp} entry={entry} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
