import { useState } from 'react'
import { Button } from '../ui'
import { CONTACT_TYPES } from '../../lib/constants'

const DEFAULT = {
  name:         '',
  title:        '',
  relationship: '',
  contact_type: 'Personal',
  company:      '',
  email:        '',
  phone:        '',
  birthday:     '',
  notes:        '',
}

const inputClass =
  'w-full bg-app-bg border border-app-border rounded-lg px-3 py-2 text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-highlight'

const labelClass =
  'block text-xs font-semibold text-app-muted uppercase tracking-widest mb-1.5'

export default function PersonForm({
  initial,
  onSubmit,
  onCancel,
  submitLabel = 'Add Person',
}) {
  const [form, setForm] = useState({
    ...DEFAULT,
    ...initial,
    birthday: initial?.birthday ?? '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSaving(true)
    setError(null)
    await onSubmit({
      ...form,
      name:         form.name.trim(),
      title:        form.title        || null,
      relationship: form.relationship || null,
      company:      form.company      || null,
      email:        form.email        || null,
      phone:        form.phone        || null,
      birthday:     form.birthday     || null,
      notes:        form.notes        || null,
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

      {/* Name */}
      <div>
        <label className={labelClass}>
          Name <span className="text-red-400 normal-case tracking-normal">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Full name"
          className={inputClass}
          autoFocus
        />
      </div>

      {/* Contact Type */}
      <div>
        <label className={labelClass}>Contact Type</label>
        <select
          value={form.contact_type}
          onChange={(e) => set('contact_type', e.target.value)}
          className={inputClass}
        >
          {CONTACT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Title + Company */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Job title"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Company</label>
          <input
            type="text"
            value={form.company}
            onChange={(e) => set('company', e.target.value)}
            placeholder="Organization"
            className={inputClass}
          />
        </div>
      </div>

      {/* Relationship */}
      <div>
        <label className={labelClass}>Relationship</label>
        <input
          type="text"
          value={form.relationship}
          onChange={(e) => set('relationship', e.target.value)}
          placeholder="How you know them"
          className={inputClass}
        />
      </div>

      {/* Email + Phone */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="email@example.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Phone</label>
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            placeholder="+1 555 000 0000"
            className={inputClass}
          />
        </div>
      </div>

      {/* Birthday */}
      <div>
        <label className={labelClass}>Birthday</label>
        <input
          type="date"
          value={form.birthday}
          onChange={(e) => set('birthday', e.target.value)}
          className={inputClass}
        />
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={form.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Background info, how you met…"
          rows={3}
          className={`${inputClass} resize-none`}
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
