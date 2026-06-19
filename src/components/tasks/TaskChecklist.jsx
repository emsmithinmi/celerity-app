import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { updateTask } from '../../lib/api/tasks'
import Button from '../ui/Button'
import { PencilBtn, ProgressBar, formatDuration } from '../ui'
import DurationInput from './DurationInput'
import { computeProgress, formatSeconds } from '../../lib/progress'

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

const inputCls = 'flex-1 px-2 py-1 rounded text-sm border outline-none bg-transparent'
const inputStyle = { borderColor: 'var(--border)', color: 'var(--text-primary)' }

export default function TaskChecklist({ taskId, subtasks = [], onSubtasksChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState([])
  const [newText, setNewText] = useState('')
  const [quickAddText, setQuickAddText] = useState('')
  const [saving, setSaving] = useState(false)
  const [quickAdding, setQuickAdding] = useState(false)

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
        ? [...draft, { id: genId(), text: newText.trim(), done: false, duration: null }]
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

  const quickAdd = async () => {
    const text = quickAddText.trim()
    if (!text || quickAdding) return
    setQuickAdding(true)
    try {
      const next = [...subtasks, { id: genId(), text, done: false, duration: null }]
      await updateTask(taskId, { subtasks: next })
      onSubtasksChange(next)
      setQuickAddText('')
    } finally {
      setQuickAdding(false)
    }
  }

  const addItem = () => {
    if (!newText.trim()) return
    setDraft(prev => [...prev, { id: genId(), text: newText.trim(), done: false, duration: null }])
    setNewText('')
  }

  const removeItem = (itemId) => setDraft(prev => prev.filter(s => s.id !== itemId))

  const changeText = (itemId, text) =>
    setDraft(prev => prev.map(s => s.id === itemId ? { ...s, text } : s))

  const changeDuration = (itemId, duration) =>
    setDraft(prev => prev.map(s => s.id === itemId ? { ...s, duration } : s))

  const progress = computeProgress(subtasks)
  const draftProgress = computeProgress(draft)

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h2 className="text-base font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>Subtasks</h2>
          {subtasks.length > 0 && !editing && (
            <>
              <ProgressBar fraction={progress.fraction} size="md" className="w-32 shrink-0" />
              <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                {progress.doneCount}/{progress.totalCount} · {progress.percent}%
                {progress.hasEstimates && (
                  <> · {formatSeconds(progress.doneSeconds)} of {formatSeconds(progress.totalSeconds)}</>
                )}
              </span>
            </>
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
        className="rounded-xl border p-4 space-y-3"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {!editing && (
          <div className="flex gap-2">
            <input
              type="text"
              value={quickAddText}
              onChange={e => setQuickAddText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && quickAdd()}
              placeholder="Add a step…"
              className={inputCls}
              style={inputStyle}
            />
            <Button size="sm" variant="secondary" onClick={quickAdd} disabled={!quickAddText.trim() || quickAdding}>
              {quickAdding ? 'Adding…' : 'Add'}
            </Button>
          </div>
        )}

        {!editing ? (
          subtasks.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
              No steps yet.
            </p>
          ) : (
            <>
              <div className="space-y-2.5">
                {subtasks.map(item => (
                  <label key={item.id} className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={item.done}
                      onChange={() => toggle(item.id)}
                      className="w-4 h-4 cursor-pointer rounded"
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    <span
                      className="text-sm flex-1"
                      style={{
                        color: item.done ? 'var(--text-dim)' : 'var(--text-primary)',
                        textDecoration: item.done ? 'line-through' : 'none',
                      }}
                    >
                      {item.text}
                    </span>
                    {item.duration && (
                      <span
                        className="font-mono text-xs shrink-0"
                        style={{ color: item.done ? 'var(--text-dim)' : 'var(--text-secondary)' }}
                      >
                        {formatDuration(item.duration)}
                      </span>
                    )}
                  </label>
                ))}
              </div>
              {progress.hasEstimates && (
                <p className="text-xs mt-3 pt-3 border-t font-mono" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                  Total estimated: {formatSeconds(progress.totalSeconds)}
                  {progress.remainingSeconds > 0 && progress.doneCount > 0 && (
                    <> · {formatSeconds(progress.remainingSeconds)} left</>
                  )}
                </p>
              )}
            </>
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
                <DurationInput
                  value={item.duration ?? null}
                  onChange={v => changeDuration(item.id, v)}
                  className="shrink-0"
                />
                <button
                  onClick={() => removeItem(item.id)}
                  title="Remove"
                  className="flex items-center justify-center rounded transition-colors duration-150 shrink-0"
                  style={{ width: 24, height: 24, color: 'var(--text-secondary)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
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
                style={{ width: 24, height: 24, color: 'var(--text-secondary)' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                <Plus size={13} />
              </button>
            </div>

            {draftProgress.hasEstimates && (
              <p className="text-xs pt-2 font-mono" style={{ color: 'var(--text-secondary)' }}>
                Total estimated: {formatSeconds(draftProgress.totalSeconds)} — a guide for setting the task duration
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
