import { useState } from 'react'
import Button from '../ui/Button'

function NoteEntry({ entry }) {
  const date = new Date(entry.timestamp)
  const timeStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    + ' · '
    + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="px-4 py-3 border-b last:border-b-0"
      style={{ borderColor: '#313244' }}
    >
      <p className="text-xs mb-1" style={{ color: '#6c7086' }}>{timeStr}</p>
      <p className="text-sm whitespace-pre-wrap" style={{ color: '#cdd6f4' }}>{entry.body}</p>
    </div>
  )
}

export default function NotesSection({ notes = [], onAdd }) {
  const [body, setBody]       = useState('')
  const [saving, setSaving]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    await onAdd(body.trim())
    setBody('')
    setSaving(false)
  }

  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>
        Notes
      </h3>

      {/* Existing entries */}
      {notes.length > 0 && (
        <div
          className="rounded-xl border overflow-hidden mb-3"
          style={{ backgroundColor: '#181825', borderColor: '#313244' }}
        >
          {[...notes].reverse().map((entry, i) => (
            <NoteEntry key={i} entry={entry} />
          ))}
        </div>
      )}

      {/* Add note form */}
      <form onSubmit={handleSubmit}>
        <div
          className="rounded-xl border overflow-hidden"
          style={{ backgroundColor: '#181825', borderColor: '#313244' }}
        >
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit(e)
            }}
            placeholder="Add a note… (Ctrl+Enter to save)"
            rows={3}
            className="w-full bg-transparent px-4 pt-3 pb-2 text-sm outline-none resize-none"
            style={{ color: '#cdd6f4' }}
          />
          <div
            className="flex justify-end px-3 pb-3"
          >
            <Button
              type="submit"
              size="sm"
              variant="primary"
              disabled={!body.trim() || saving}
            >
              {saving ? 'Saving…' : 'Add Note'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
