import { useState, useEffect } from 'react'
import { Pencil, Trash2, Plus, GripVertical } from 'lucide-react'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useEnergyLevels } from '../contexts/EnergyLevelsContext'
import { usePriorities }   from '../contexts/PrioritiesContext'
import { useAreas }        from '../contexts/AreasContext'
import { createEnergyLevel, updateEnergyLevel, deleteEnergyLevel } from '../lib/api/energyLevels'
import { createPriority,   updatePriority,   deletePriority   } from '../lib/api/priorities'
import { createArea,       updateArea,       deleteArea       } from '../lib/api/areas'
import { getAIConfig, saveAIConfig, getProviderPreset, PROVIDERS, PROVIDER_PRESETS } from '../lib/ai/config'
import { testConnection } from '../lib/ai/client'
import { useTheme } from '../contexts/ThemeContext'

// ─── Inline editable row ──────────────────────────────────────────────────────
function EnergyRow({ level, onSaved, onDelete }) {
  const [editing, setEditing]   = useState(false)
  const [saving,  setSaving]    = useState(false)
  const [draft,   setDraft]     = useState(null)
  const [showDel, setShowDel]   = useState(false)

  const startEdit = () => setDraft({ ...level })
  const cancel    = () => { setDraft(null); setEditing(false) }
  const ch        = (f, v) => setDraft(p => ({ ...p, [f]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updateEnergyLevel(level.id, {
        label:      draft.label,
        description: draft.description,
        icon:       draft.icon,
        bg_color:   draft.bg_color,
        text_color: draft.text_color,
        sort_order: draft.sort_order,
      })
      onSaved(updated)
      setEditing(false)
      setDraft(null)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    await deleteEnergyLevel(level.id)
    onDelete(level.id)
    setShowDel(false)
  }

  if (editing && draft) {
    return (
      <div
        className="rounded-xl border p-4 space-y-3"
        style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent)' }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Value (slug)</label>
            <input
              value={draft.value}
              disabled
              className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent opacity-50"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Label</label>
            <input
              value={draft.label}
              onChange={e => ch('label', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
          <input
            value={draft.description ?? ''}
            onChange={e => ch('description', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="Short description of when to use this level"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Icon (emoji)</label>
            <input
              value={draft.icon ?? ''}
              onChange={e => ch('icon', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent text-center"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              placeholder="💪"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Badge background</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={draft.bg_color ?? 'var(--border)'}
                onChange={e => ch('bg_color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5"
              />
              <input
                value={draft.bg_color ?? ''}
                onChange={e => ch('bg_color', e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="var(--border)"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Badge text color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={draft.text_color ?? 'var(--text-primary)'}
                onChange={e => ch('text_color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5"
              />
              <input
                value={draft.text_color ?? ''}
                onChange={e => ch('text_color', e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
                style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
                placeholder="var(--text-primary)"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Preview:</p>
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: draft.bg_color, color: draft.text_color }}
          >
            <span>{draft.icon}</span>
            {draft.label || 'Label'}
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
          <Button size="sm" variant="ghost" onClick={cancel}>Cancel</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {/* Drag handle (visual only) */}
        <GripVertical size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />

        {/* Badge preview */}
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: level.bg_color, color: level.text_color }}
        >
          <span>{level.icon}</span>
          {level.label}
        </span>

        {/* Slug + description */}
        <div className="flex-1 min-w-0">
          <p className="text-xs" style={{ color: 'var(--text-dim)' }}>{level.value}</p>
          {level.description && (
            <p className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{level.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { startEdit(); setEditing(true) }}
            title="Edit"
            className="flex items-center justify-center rounded transition-colors"
            style={{ width: 28, height: 28, color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setShowDel(true)}
            title="Delete"
            className="flex items-center justify-center rounded transition-colors"
            style={{ width: 28, height: 28, color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--delete-hover-bg)'; e.currentTarget.style.color = 'var(--state-error-text)' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={showDel}
        onClose={() => setShowDel(false)}
        onConfirm={handleDelete}
        title="Remove Energy Level?"
        message={`"${level.label}" will be removed. Tasks that already use it will keep the stored value but it won't appear in dropdowns.`}
        confirmLabel="Remove"
        variant="danger"
      />
    </>
  )
}

// ─── Add form ─────────────────────────────────────────────────────────────────
const BLANK = { value: '', label: '', description: '', icon: '', bg_color: 'var(--border)', text_color: 'var(--text-primary)', sort_order: 99 }

function AddEnergyForm({ onAdded, nextSortOrder }) {
  const [open,   setOpen]   = useState(false)
  const [draft,  setDraft]  = useState({ ...BLANK })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const ch = (f, v) => setDraft(p => ({ ...p, [f]: v }))

  const submit = async () => {
    if (!draft.value.trim() || !draft.label.trim()) {
      setError('Slug and Label are required.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const created = await createEnergyLevel({ ...draft, sort_order: nextSortOrder })
      onAdded(created)
      setDraft({ ...BLANK })
      setOpen(false)
    } catch (err) {
      setError(err.message ?? 'Failed to create energy level')
    } finally {
      setSaving(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border text-sm transition-colors"
        style={{ borderColor: 'var(--border)', borderStyle: 'dashed', color: 'var(--text-secondary)', backgroundColor: 'transparent' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <Plus size={14} />
        Add energy level
      </button>
    )
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent)' }}
    >
      {error && (
        <p className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error-text)' }}>{error}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Slug <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            value={draft.value}
            onChange={e => ch('value', e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
            className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="deep_focus"
          />
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Lowercase, underscores only</p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>
            Label <span style={{ color: 'var(--danger)' }}>*</span>
          </label>
          <input
            value={draft.label}
            onChange={e => ch('label', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="Deep Focus"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
        <input
          value={draft.description}
          onChange={e => ch('description', e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
          style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          placeholder="Mentally demanding computer work"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Icon (emoji)</label>
          <input
            value={draft.icon}
            onChange={e => ch('icon', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent text-center"
            style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            placeholder="🧠"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Badge background</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={draft.bg_color}
              onChange={e => ch('bg_color', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5"
            />
            <input
              value={draft.bg_color}
              onChange={e => ch('bg_color', e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Badge text color</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={draft.text_color}
              onChange={e => ch('text_color', e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5"
            />
            <input
              value={draft.text_color}
              onChange={e => ch('text_color', e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="flex items-center gap-3">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Preview:</p>
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
          style={{ backgroundColor: draft.bg_color, color: draft.text_color }}
        >
          <span>{draft.icon || '?'}</span>
          {draft.label || 'Label'}
        </span>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="primary" onClick={submit} disabled={saving}>
          {saving ? 'Adding…' : 'Add'}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setDraft({ ...BLANK }); setError(null) }}>
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Priority rows ────────────────────────────────────────────────────────────
function PriorityRow({ item, onSaved, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [draft,   setDraft]   = useState(null)
  const [showDel, setShowDel] = useState(false)
  const ch = (f, v) => setDraft(p => ({ ...p, [f]: v }))

  const save = async () => {
    setSaving(true)
    try {
      const updated = await updatePriority(item.id, {
        label: draft.label, bg_color: draft.bg_color, text_color: draft.text_color, sort_order: draft.sort_order,
      })
      onSaved(updated); setEditing(false); setDraft(null)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    await deletePriority(item.id); onDelete(item.id); setShowDel(false)
  }

  if (editing && draft) {
    return (
      <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent)' }}>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Slug (locked)</label>
            <input value={draft.value} disabled className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent opacity-50" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Label</label>
            <input value={draft.label} onChange={e => ch('label', e.target.value)} className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Badge background</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={draft.bg_color ?? 'var(--border)'} onChange={e => ch('bg_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5" />
              <input value={draft.bg_color ?? ''} onChange={e => ch('bg_color', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Text color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={draft.text_color ?? 'var(--text-primary)'} onChange={e => ch('text_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5" />
              <input value={draft.text_color ?? ''} onChange={e => ch('text_color', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Preview:</p>
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase" style={{ backgroundColor: draft.bg_color, color: draft.text_color }}>{draft.label || 'Label'}</span>
        </div>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
          <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setDraft(null) }}>Cancel</Button>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        <GripVertical size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase" style={{ backgroundColor: item.bg_color, color: item.text_color }}>{item.label}</span>
        <p className="flex-1 text-xs truncate" style={{ color: 'var(--text-dim)' }}>{item.value}</p>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => { setDraft({ ...item }); setEditing(true) }} title="Edit" className="flex items-center justify-center rounded transition-colors" style={{ width: 28, height: 28, color: 'var(--text-secondary)', backgroundColor: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}><Pencil size={13} /></button>
          <button onClick={() => setShowDel(true)} title="Delete" className="flex items-center justify-center rounded transition-colors" style={{ width: 28, height: 28, color: 'var(--text-secondary)', backgroundColor: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--delete-hover-bg)'; e.currentTarget.style.color = 'var(--state-error-text)' }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}><Trash2 size={13} /></button>
        </div>
      </div>
      <ConfirmDialog open={showDel} onClose={() => setShowDel(false)} onConfirm={handleDelete} title="Remove Priority?" message={`"${item.label}" will be removed. Tasks/projects that already use it will keep the stored value but it won't appear in dropdowns.`} confirmLabel="Remove" variant="danger" />
    </>
  )
}

function AddPriorityForm({ onAdded, nextSortOrder }) {
  const [open,   setOpen]   = useState(false)
  const [draft,  setDraft]  = useState({ value: '', label: '', bg_color: 'var(--border)', text_color: 'var(--text-primary)' })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)
  const ch = (f, v) => setDraft(p => ({ ...p, [f]: v }))

  const submit = async () => {
    if (!draft.value.trim() || !draft.label.trim()) { setError('Slug and Label are required.'); return }
    setSaving(true); setError(null)
    try {
      const created = await createPriority({ ...draft, sort_order: nextSortOrder })
      onAdded(created); setDraft({ value: '', label: '', bg_color: 'var(--border)', text_color: 'var(--text-primary)' }); setOpen(false)
    } catch (err) { setError(err.message ?? 'Failed to create priority') } finally { setSaving(false) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border text-sm transition-colors" style={{ borderColor: 'var(--border)', borderStyle: 'dashed', color: 'var(--text-secondary)', backgroundColor: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
      <Plus size={14} />Add priority
    </button>
  )

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent)' }}>
      {error && <p className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error-text)' }}>{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Slug <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input value={draft.value} onChange={e => ch('value', e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))} className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="high_priority" />
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Lowercase, underscores only</p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Label <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input value={draft.label} onChange={e => ch('label', e.target.value)} className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="High Priority" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Badge background</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={draft.bg_color} onChange={e => ch('bg_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5" />
            <input value={draft.bg_color} onChange={e => ch('bg_color', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Text color</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={draft.text_color} onChange={e => ch('text_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5" />
            <input value={draft.text_color} onChange={e => ch('text_color', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} />
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Preview:</p>
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase" style={{ backgroundColor: draft.bg_color, color: draft.text_color }}>{draft.label || 'Label'}</span>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="primary" onClick={submit} disabled={saving}>{saving ? 'Adding…' : 'Add'}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setError(null) }}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── Area rows (simple — no colors) ──────────────────────────────────────────
function AreaRow({ item, onSaved, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [label,   setLabel]   = useState(item.label)
  const [showDel, setShowDel] = useState(false)

  const save = async () => {
    if (!label.trim()) return
    setSaving(true)
    try {
      const updated = await updateArea(item.id, { label: label.trim(), value: label.trim() })
      onSaved(updated); setEditing(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    await deleteArea(item.id); onDelete(item.id); setShowDel(false)
  }

  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        <GripVertical size={14} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
        {editing ? (
          <>
            <input autoFocus value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setLabel(item.label); setEditing(false) } }} className="flex-1 px-2 py-1 rounded-lg text-sm border outline-none bg-transparent" style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }} />
            <Button size="sm" variant="primary" onClick={save} disabled={saving}>{saving ? '…' : 'Save'}</Button>
            <Button size="sm" variant="ghost" onClick={() => { setLabel(item.label); setEditing(false) }}>Cancel</Button>
          </>
        ) : (
          <>
            <span className="flex-1 text-sm" style={{ color: 'var(--text-primary)' }}>{item.label}</span>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => setEditing(true)} title="Edit" className="flex items-center justify-center rounded transition-colors" style={{ width: 28, height: 28, color: 'var(--text-secondary)', backgroundColor: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}><Pencil size={13} /></button>
              <button onClick={() => setShowDel(true)} title="Delete" className="flex items-center justify-center rounded transition-colors" style={{ width: 28, height: 28, color: 'var(--text-secondary)', backgroundColor: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--delete-hover-bg)'; e.currentTarget.style.color = 'var(--state-error-text)' }} onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}><Trash2 size={13} /></button>
            </div>
          </>
        )}
      </div>
      <ConfirmDialog open={showDel} onClose={() => setShowDel(false)} onConfirm={handleDelete} title="Remove Area?" message={`"${item.label}" will be removed from the list. Tasks/projects that already use it keep their stored value.`} confirmLabel="Remove" variant="danger" />
    </>
  )
}

function AddAreaForm({ onAdded, nextSortOrder }) {
  const [open,   setOpen]   = useState(false)
  const [label,  setLabel]  = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)

  const submit = async () => {
    if (!label.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)
    try {
      const created = await createArea({ value: label.trim(), label: label.trim(), sort_order: nextSortOrder })
      onAdded(created); setLabel(''); setOpen(false)
    } catch (err) { setError(err.message ?? 'Failed to create area') } finally { setSaving(false) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border text-sm transition-colors" style={{ borderColor: 'var(--border)', borderStyle: 'dashed', color: 'var(--text-secondary)', backgroundColor: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
      <Plus size={14} />Add area
    </button>
  )

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent)' }}>
      {error && <p className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error-text)' }}>{error}</p>}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name <span style={{ color: 'var(--danger)' }}>*</span></label>
        <input autoFocus value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setOpen(false); setLabel('') } }} className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent" style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }} placeholder="e.g. Side Projects" />
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={submit} disabled={saving}>{saving ? 'Adding…' : 'Add'}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setLabel(''); setError(null) }}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function useLocalList(contextList, reloadFn) {
  const [local, setLocal] = useState(null)
  const displayed = local ?? contextList
  const onSaved   = u  => { setLocal(p => (p ?? contextList).map(i => i.id === u.id ? u : i)); reloadFn() }
  const onDeleted = id => { setLocal(p => (p ?? contextList).filter(i => i.id !== id)); reloadFn() }
  const onAdded   = c  => { setLocal(p => [...(p ?? contextList), c]); reloadFn() }
  return { displayed, onSaved, onDeleted, onAdded }
}

// ─── AI Settings ─────────────────────────────────────────────────────────────

const INPUT_STYLE = {
  backgroundColor: 'var(--app-bg)',
  borderColor: 'var(--border)',
  color: 'var(--text-primary)',
}

function AISettings() {
  const [provider, setProvider] = useState('')
  const [model,    setModel]    = useState('')
  const [baseUrl,  setBaseUrl]  = useState('')
  const [apiKey,   setApiKey]   = useState('')
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [testing,  setTesting]  = useState(false)
  const [testStatus, setTestStatus] = useState(null) // 'ok' | 'fail' | null
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    getAIConfig().then(cfg => {
      if (cfg.provider) setProvider(cfg.provider)
      if (cfg.model)    setModel(cfg.model)
      if (cfg.baseUrl)  setBaseUrl(cfg.baseUrl)
      if (cfg.apiKey)   setApiKey(cfg.apiKey)
      setLoading(false)
    })
  }, [])

  const handleProviderChange = (p) => {
    setProvider(p)
    setTestStatus(null)
    const preset = getProviderPreset(p)
    setBaseUrl(preset.baseUrl)
    setModel(preset.model)
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await saveAIConfig({ provider, model, baseUrl, apiKey })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    setTestStatus(null)
    try {
      const ok = await testConnection()
      setTestStatus(ok ? 'ok' : 'fail')
    } catch {
      setTestStatus('fail')
    } finally {
      setTesting(false)
    }
  }

  if (loading) return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>

  return (
    <div className="space-y-4">
      {/* Provider */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Provider</label>
        <select
          value={provider}
          onChange={e => handleProviderChange(e.target.value)}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={INPUT_STYLE}
        >
          <option value="">— Select a provider —</option>
          {PROVIDERS.map(p => (
            <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Base URL */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Base URL</label>
        <input
          type="text"
          value={baseUrl}
          onChange={e => setBaseUrl(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none font-mono"
          style={INPUT_STYLE}
        />
      </div>

      {/* Model */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Model</label>
        <input
          type="text"
          value={model}
          onChange={e => setModel(e.target.value)}
          placeholder="gpt-4o"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none font-mono"
          style={INPUT_STYLE}
        />
      </div>

      {/* API Key */}
      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={e => { setApiKey(e.target.value); setTestStatus(null) }}
          placeholder="sk-…"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none font-mono"
          style={INPUT_STYLE}
        />
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          Stored in your Supabase account — never in the source bundle.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <Button size="sm" variant="primary" onClick={handleSave} disabled={saving || !provider || !apiKey}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
        <Button size="sm" variant="secondary" onClick={handleTest} disabled={testing || !apiKey}>
          {testing ? 'Testing…' : 'Test Connection'}
        </Button>
        {saved && <span className="text-xs" style={{ color: 'var(--accent-green)' }}>✓ Saved</span>}
        {testStatus === 'ok'   && <span className="text-xs" style={{ color: 'var(--accent-green)' }}>✓ Connected</span>}
        {testStatus === 'fail' && <span className="text-xs" style={{ color: 'var(--accent-red)' }}>✕ Failed — check your key and model</span>}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Settings() {
  const { levels,     loading: elLoading,   reload: reloadEL }   = useEnergyLevels()
  const { priorities, loading: priLoading,  reload: reloadPri }  = usePriorities()
  const { areas,      loading: areaLoading, reload: reloadArea }  = useAreas()
  const { theme, setTheme, themes } = useTheme()

  const el  = useLocalList(levels,     reloadEL)
  const pri = useLocalList(priorities, reloadPri)
  const ar  = useLocalList(areas,      reloadArea)

  return (
    <div className="px-10 py-8 max-w-2xl space-y-12">
      <div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Settings</h1>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Manage reference data — no code changes needed.</p>
      </div>

      {/* ── Appearance ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Appearance</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Choose your color theme.</p>
        </div>
        <div className="flex gap-3">
          {themes.map(t => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className="flex-1 rounded-xl border px-4 py-3 text-sm font-medium transition-colors text-left"
              style={{
                borderColor: theme === t.id ? 'var(--accent)' : 'var(--border)',
                backgroundColor: theme === t.id ? 'var(--state-info-bg)' : 'var(--pane-bg)',
                color: theme === t.id ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              <span className="block font-semibold mb-0.5" style={{ color: theme === t.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{t.label}</span>
              <span className="text-xs">{theme === t.id ? 'Active' : 'Click to apply'}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Energy Levels ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Energy Levels</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Options shown when assigning an energy level to a task.</p>
        </div>
        {elLoading ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
          <div className="space-y-2">
            {el.displayed.map(level => <EnergyRow key={level.id} level={level} onSaved={el.onSaved} onDelete={el.onDeleted} />)}
            <AddEnergyForm onAdded={el.onAdded} nextSortOrder={(el.displayed[el.displayed.length - 1]?.sort_order ?? 0) + 10} />
          </div>
        )}
      </section>

      {/* ── Priorities ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Priorities</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Priority levels for tasks and projects, with badge colors.</p>
        </div>
        {priLoading ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
          <div className="space-y-2">
            {pri.displayed.map(item => <PriorityRow key={item.id} item={item} onSaved={pri.onSaved} onDelete={pri.onDeleted} />)}
            <AddPriorityForm onAdded={pri.onAdded} nextSortOrder={(pri.displayed[pri.displayed.length - 1]?.sort_order ?? 0) + 10} />
          </div>
        )}
      </section>

      {/* ── Areas ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Areas</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Area suggestions shown in task and project forms. You can still type a custom value when editing.</p>
        </div>
        {areaLoading ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
          <div className="space-y-2">
            {ar.displayed.map(item => <AreaRow key={item.id} item={item} onSaved={ar.onSaved} onDelete={ar.onDeleted} />)}
            <AddAreaForm onAdded={ar.onAdded} nextSortOrder={(ar.displayed[ar.displayed.length - 1]?.sort_order ?? 0) + 10} />
          </div>
        )}
      </section>

      {/* ── AI ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>AI Assistant</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Connect any OpenAI-compatible provider — or Anthropic directly. Your key is stored in your account, not in the app bundle.
          </p>
        </div>
        <AISettings />
      </section>
    </div>
  )
}
