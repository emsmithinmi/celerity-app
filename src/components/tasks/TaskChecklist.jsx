import { useState } from 'react'
import { Pencil, Plus, X } from 'lucide-react'
import { updateTask } from '../../lib/api/tasks'
import Button from '../ui/Button'

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

function PencilBtn({ onClick }) {
  return (
    <button
      onClick={onClick}
      title="Edit subtasks"
      className="flex items-center justify-center rounded-md transition-colors duration-150"
      style={{ width: 30, height: 30, backgroundColor: 'transparent', color: '#6c7086' }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#313244'; e.currentTarget.style.color = '#cdd6f4' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6c7086' }}
    >
      <Pencil size={14} />
    </button>
  )
}

const inputCls = 'flex-1 px-2 py-1 rounded text-sm border outline-none bg-transparent'
const inputStyle = { borderColor: '#313244', color: '#cdd6f4' }

export default function TaskChecklist({ taskId, subtasks = [], onSubtasksChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState([])
  const [newText, setNewText] = useState('')
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    setDraft(subtasks.map(s => ({ ...s })))
    setEditing(true)
  }

  const cancelEdit = () => {
    setDraft([])
    setNewText('')
    setEditing(false)
  }

  const saveEdit = async () => {
    setSaving(true)
    try {
      const finalDraft = newText.trim()
        ? [...draft, { id: genId(), text: newText.trim(), done: false }]
        : draft
      await updateTask(taskId, { subtasks: finalDraft })
      onSubtasksChange(finalDraft)
      setEditing(false)
      setNewText('')
    } finally {
      setSaving(false)
    }
  }

  const toggle = async (itemId) => {
    const updated = subtasks.map(s => s.id === itemId ? { ...s, done: !s.done } : s)
    await updateTask(taskId, { subtasks: updated })
    onSubtasksChange(updated)
  }

  const addItem = () => {
    if (!newText.trim()) return
    setDraft(prev => [...prev, { id: genId(), text: newText.trim(), done: false }])
    setNewText('')
  }

  const removeItem = (itemId) => setDraft(prev => prev.filter(s => s.id !== itemId))

  const changeText = (itemId, text) =>
    setDraft(prev => prev.map(s => s.id === itemId ? { ...s, text } : s))

  const doneCount = subtasks.filter(s => s.done).length

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold" style={{ color: '#cdd6f4' }}>Subtasks</h2>
          {subtasks.length > 0 && (
            <span className="text-xs" style={{ color: '#6c7086' }}>
              {doneCount}/{subtasks.length}
            </span>
          )}
        </div>
        {!editing ? (
          <PencilBtn onClick={startEdit} />
        ) : (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={cancelEdit}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={saveEdit} disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </Button>
          </div>
        )}
      </div>

      <div
        className="rounded-xl border p-4"
        style={{ backgroundColor: '#181825', borderColor: '#313244' }}
      >
        {!editing ? (
          subtasks.length === 0 ? (
            <p className="text-sm" style={{ color: '#45475a' }}>
              No steps yet — click the pencil to add subtasks.
            </p>
          ) : (
            <div className="space-y-2.5">
              {subtasks.map(item => (
                <label key={item.id} className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() => toggle(item.id)}
                    className="w-4 h-4 cursor-pointer rounded"
                    style={{ accentColor: '#89b4fa' }}
                  />
                  <span
                    className="text-sm"
                    style={{
                      color: item.done ? '#45475a' : '#cdd6f4',
                      textDecoration: item.done ? 'line-through' : 'none',
                    }}
                  >
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
          )
        ) : (
          <div className="space-y-2">
            {draft.map(item => (
              <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.text}
                  onChange={e => changeText(item.id, e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addItem()}
                  className={inputCls}
                  style={inputStyle}
                />
                <button
                  onClick={() => removeItem(item.id)}
                  title="Remove"
                  className="flex items-center justify-center rounded transition-colors duration-150 shrink-0"
                  style={{ width: 24, height: 24, color: '#6c7086' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#DB4437' }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#6c7086' }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addItem()}
                className={inputCls}
                style={{ ...inputStyle, borderStyle: 'dashed' }}
                placeholder="Add a step…"
              />
              <button
                onClick={addItem}
                title="Add"
                className="flex items-center justify-center rounded transition-colors duration-150 shrink-0"
                style={{ width: 24, height: 24, color: '#6c7086' }}
                onMouseEnter={e => { e.currentTarget.style.color = '#89b4fa' }}
                onMouseLeave={e => { e.currentTarget.style.color = '#6c7086' }}
              >
                <Plus size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
