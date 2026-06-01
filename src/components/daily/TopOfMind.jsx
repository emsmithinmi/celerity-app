import { useState } from 'react'
import Button from '../ui/Button'

export default function TopOfMind({ items = [], onSave }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft]     = useState(items)

  const startEdit = () => {
    setDraft([...items])
    setEditing(true)
  }

  const handleSave = async () => {
    const cleaned = draft.map(s => s.trim()).filter(Boolean)
    await onSave(cleaned)
    setEditing(false)
  }

  const handleCancel = () => {
    setDraft([...items])
    setEditing(false)
  }

  const updateItem = (i, value) => {
    setDraft(prev => prev.map((v, idx) => idx === i ? value : v))
  }

  const addItem = () => setDraft(prev => [...prev, ''])

  const removeItem = (i) => setDraft(prev => prev.filter((_, idx) => idx !== i))

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Top of Mind
        </h3>
        {!editing && (
          <button
            onClick={startEdit}
            className="text-sm transition-opacity hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
            title="Edit"
          >
            ✏️
          </button>
        )}
      </div>

      <div
        className="rounded-xl border px-4 py-3"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {editing ? (
          <div className="space-y-2">
            {draft.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span style={{ color: 'var(--text-secondary)' }}>•</span>
                <input
                  type="text"
                  value={item}
                  onChange={e => updateItem(i, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addItem()
                    if (e.key === 'Backspace' && item === '' && draft.length > 1) {
                      e.preventDefault()
                      removeItem(i)
                    }
                  }}
                  autoFocus={i === draft.length - 1}
                  className="flex-1 bg-transparent text-sm outline-none border-b"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  placeholder="What's on your mind..."
                />
                <button
                  onClick={() => removeItem(i)}
                  style={{ color: 'var(--text-secondary)' }}
                  className="hover:opacity-70 text-sm"
                >
                  ×
                </button>
              </div>
            ))}
            <button
              onClick={addItem}
              className="text-xs mt-1 hover:opacity-70"
              style={{ color: 'var(--text-secondary)' }}
            >
              + Add item
            </button>
            <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
              <Button size="sm" variant="primary" onClick={handleSave}>Save</Button>
              <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
            </div>
          </div>
        ) : items.length > 0 ? (
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                <span className="mt-0.5" style={{ color: 'var(--text-secondary)' }}>•</span>
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Nothing added yet. Click ✏️ to add items.
          </p>
        )}
      </div>
    </div>
  )
}
