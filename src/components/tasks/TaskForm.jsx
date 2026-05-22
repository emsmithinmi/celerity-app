import { useState } from 'react'
import { Button, ContextTag } from '../ui'
import { TASK_STATUS_ORDER, TASK_STATUSES, PRIORITY_ORDER, PRIORITIES, AREAS } from '../../lib/constants'

const DEFAULT = {
  title:      '',
  status:     'inbox',
  priority:   'routine',
  area:       '',
  due_date:   '',
  notes:      '',
  context:    [],
  project_id: null,
}

const inputClass =
  'w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-highlight'

const labelClass =
  'block text-xs font-semibold text-app-muted uppercase tracking-widest mb-1.5'

export default function TaskForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Add Task',
  projects = [],
}) {
  const [form, setForm] = useState({
    ...DEFAULT,
    ...initial,
    due_date: initial?.due_date ?? '',
    context:  initial?.context  ?? [],
  })
  const [contextInput, setContextInput] = useState('')
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState(null)

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const addContext = () => {
    const tag = contextInput.trim().replace(/^@/, '')
    if (tag && !form.context.includes(tag)) set('context', [...form.context, tag])
    setContextInput('')
  }

  const removeContext = (tag) =>
    set('context', form.context.filter((t) => t !== tag))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)
    await onSubmit({
      ...form,
      title:      form.title.trim(),
      due_date:   form.due_date   || null,
      area:       form.area       || null,
      project_id: form.project_id || null,
      notes:      form.notes      || null,
    })
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="p-5 space-y-5">
      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Title */}
      <div>
        <label className={labelClass}>
          Title <span className="text-red-400 normal-case tracking-normal">*</span>
        </label>
        <input
          type="text"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="What needs to be done?"
          className={inputClass}
          autoFocus
        />
      </div>

      {/* Status + Priority */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Status</label>
          <select
            value={form.status}
            onChange={(e) => set('status', e.target.value)}
            className={inputClass}
          >
            {TASK_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {TASK_STATUSES[s].icon} {TASK_STATUSES[s].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Priority</label>
          <select
            value={form.priority}
            onChange={(e) => set('priority', e.target.value)}
            className={inputClass}
          >
            {PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>{PRIORITIES[p].label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Area + Due Date */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Area</label>
          <select
            value={form.area}
            onChange={(e) => set('area', e.target.value)}
            className={inputClass}
          >
            <option value="">— None —</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Due Date</label>
          <input
            type="date"
            value={form.due_date}
            onChange={(e) => set('due_date', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Project */}
      {projects.length > 0 && (
        <div>
          <label className={labelClass}>Project</label>
          <select
            value={form.project_id ?? ''}
            onChange={(e) => set('project_id', e.target.value || null)}
            className={inputClass}
          >
            <option value="">— None —</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>
      )}

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Additional context..."
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Context tags */}
      <div>
        <label className={labelClass}>Context</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={contextInput}
            onChange={(e) => setContextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); addContext() }
            }}
            placeholder="home, computer, phone..."
            className={inputClass}
          />
          <Button type="button" variant="secondary" size="sm" onClick={addContext}>
            Add
          </Button>
        </div>
        {form.context.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.context.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => removeContext(tag)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium hover:opacity-75 transition-opacity"
                style={{ backgroundColor: '#FFFFFF', color: '#1967D2' }}
              >
                @{tag} ×
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-2 border-t border-app-border">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={saving}>
          {saving ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
