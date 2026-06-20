import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { updateTask } from '../../lib/api/tasks'
import Button from '../ui/Button'
import { ProgressBar } from '../ui'
import DurationInput from './DurationInput'
import { computeProgress, formatSeconds } from '../../lib/progress'

function genId() {
  return Math.random().toString(36).slice(2, 10)
}

const inputCls = 'flex-1 px-2 py-1 rounded text-sm border outline-none bg-transparent'
const inputStyle = { borderColor: 'var(--border)', color: 'var(--text-primary)' }

function SubtaskRow({ item, onToggle, onTextChange, onDurationChange, onRemove }) {
  const [text, setText] = useState(item.text)

  // Stay in sync if the underlying item changes outside this row
  useEffect(() => { setText(item.text) }, [item.text])

  const commitText = (e) => {
    // Read from the DOM directly to avoid stale closure on rapid type-then-blur
    const trimmed = (e?.target?.value ?? text).trim()
    if (trimmed && trimmed !== item.text) onTextChange(trimmed)
    else setText(item.text) // restore if blanked
  }

  return (
    <div className="flex items-center gap-2.5">
      <input
        type="checkbox"
        checked={item.done}
        onChange={onToggle}
        className="w-4 h-4 cursor-pointer rounded shrink-0"
        style={{ accentColor: 'var(--accent)' }}
      />
      <input
        type="text"
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={commitText}
        onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
        className={inputCls}
        style={{
          ...inputStyle,
          color: item.done ? 'var(--text-dim)' : 'var(--text-primary)',
          textDecoration: item.done ? 'line-through' : 'none',
        }}
      />
      <DurationInput
        value={item.duration ?? null}
        onChange={onDurationChange}
        className="shrink-0"
      />
      <button
        onClick={onRemove}
        title="Remove"
        className="flex items-center justify-center rounded transition-colors duration-150 shrink-0"
        style={{ width: 24, height: 24, color: 'var(--text-secondary)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <X size={13} />
      </button>
    </div>
  )
}

export default function TaskChecklist({ taskId, subtasks = [], onSubtasksChange }) {
  const [quickAddText,     setQuickAddText]     = useState('')
  const [quickAddDuration, setQuickAddDuration] = useState(null)
  const [quickAdding,      setQuickAdding]      = useState(false)

  const save = async (next) => {
    await updateTask(taskId, { subtasks: next })
    onSubtasksChange(next)
  }

  const toggle = (itemId) =>
    save(subtasks.map(s => s.id === itemId ? { ...s, done: !s.done } : s))

  const updateText = (itemId, text) =>
    save(subtasks.map(s => s.id === itemId ? { ...s, text } : s))

  const updateDuration = (itemId, duration) =>
    save(subtasks.map(s => s.id === itemId ? { ...s, duration } : s))

  const remove = (itemId) =>
    save(subtasks.filter(s => s.id !== itemId))

  const quickAdd = async () => {
    const text = quickAddText.trim()
    if (!text || quickAdding) return
    setQuickAdding(true)
    try {
      await save([...subtasks, { id: genId(), text, done: false, duration: quickAddDuration }])
      setQuickAddText('')
      setQuickAddDuration(null)
    } finally {
      setQuickAdding(false)
    }
  }

  const progress = computeProgress(subtasks)

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h2 className="text-base font-semibold shrink-0" style={{ color: 'var(--text-primary)' }}>Subtasks</h2>
          {subtasks.length > 0 && (
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
      </div>

      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={quickAddText}
            onChange={e => setQuickAddText(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && quickAdd()}
            placeholder="Add a step…"
            className={inputCls}
            style={inputStyle}
          />
          <DurationInput
            value={quickAddDuration}
            onChange={setQuickAddDuration}
            className="shrink-0"
          />
          <Button size="sm" variant="secondary" onClick={quickAdd} disabled={!quickAddText.trim() || quickAdding}>
            {quickAdding ? 'Adding…' : 'Add'}
          </Button>
        </div>

        {subtasks.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-dim)' }}>
            No steps yet.
          </p>
        ) : (
          <>
            <div className="space-y-2">
              {subtasks.map(item => (
                <SubtaskRow
                  key={item.id}
                  item={item}
                  onToggle={() => toggle(item.id)}
                  onTextChange={(text) => updateText(item.id, text)}
                  onDurationChange={(duration) => updateDuration(item.id, duration)}
                  onRemove={() => remove(item.id)}
                />
              ))}
            </div>
            {progress.hasEstimates && (
              <p className="text-xs pt-3 border-t font-mono" style={{ color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                Total estimated: {formatSeconds(progress.totalSeconds)}
                {progress.remainingSeconds > 0 && progress.doneCount > 0 && (
                  <> · {formatSeconds(progress.remainingSeconds)} left</>
                )}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  )
}
