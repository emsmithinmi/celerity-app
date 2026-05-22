import { useState } from 'react'
import { Button } from '../ui'
import { PROJECT_STATUS_ORDER, PROJECT_STATUSES, PRIORITY_ORDER, PRIORITIES, AREAS } from '../../lib/constants'

const DEFAULT = {
  title:       '',
  status:      'inbox',
  priority:    'routine',
  area:        '',
  start_date:  '',
  end_date:    '',
  description: '',
  waiting_for: '',
}

const inputClass =
  'w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-highlight'

const labelClass =
  'block text-xs font-semibold text-app-muted uppercase tracking-widest mb-1.5'

export default function ProjectForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Add Project',
}) {
  const [form, setForm] = useState({
    ...DEFAULT,
    ...initial,
    start_date: initial?.start_date ?? '',
    end_date:   initial?.end_date   ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) { setError('Title is required.'); return }
    setSaving(true)
    setError(null)
    await onSubmit({
      ...form,
      title:       form.title.trim(),
      start_date:  form.start_date  || null,
      end_date:    form.end_date    || null,
      area:        form.area        || null,
      description: form.description || null,
      waiting_for: form.waiting_for || null,
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
          placeholder="What's the project?"
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
            {PROJECT_STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{PROJECT_STATUSES[s].label}</option>
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

      {/* Area */}
      <div>
        <label className={labelClass}>Area</label>
        <select
          value={form.area}
          onChange={(e) => set('area', e.target.value)}
          className={inputClass}
        >
          <option value="">— None —</option>
          {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {/* Start + End dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Start Date</label>
          <input
            type="date"
            value={form.start_date}
            onChange={(e) => set('start_date', e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>End Date</label>
          <input
            type="date"
            value={form.end_date}
            onChange={(e) => set('end_date', e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>Description</label>
        <textarea
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What is this project about?"
          rows={3}
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Waiting For */}
      <div>
        <label className={labelClass}>Waiting For</label>
        <input
          type="text"
          value={form.waiting_for}
          onChange={(e) => set('waiting_for', e.target.value)}
          placeholder="Who or what are you waiting on?"
          className={inputClass}
        />
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
