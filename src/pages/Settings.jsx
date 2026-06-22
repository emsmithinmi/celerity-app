import { useState, useEffect, useCallback } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import Button from '../components/ui/Button'
import { PencilBtn, TrashBtn } from '../components/ui/IconBtn'
import { getConnectedGoogleAccounts, getGoogleConnectUrl, disconnectGoogleAccount } from '../lib/api/googleConnect'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useEnergyLevels } from '../contexts/EnergyLevelsContext'
import { usePriorities }   from '../contexts/PrioritiesContext'
import { useAreas }        from '../contexts/AreasContext'
import { useContextTags }  from '../contexts/ContextTagsContext'
import { createEnergyLevel, updateEnergyLevel, deleteEnergyLevel } from '../lib/api/energyLevels'
import { createPriority,   updatePriority,   deletePriority   } from '../lib/api/priorities'
import { createArea,       updateArea,       deleteArea       } from '../lib/api/areas'
import { createContextTag, updateContextTag, deleteContextTag } from '../lib/api/contextTags'
import { useTheme } from '../contexts/ThemeContext'
import { useSortableList } from '../hooks/useSortableList'

// Drag handle — wraps GripVertical with draggable + cursor:grab. Set on the
// element you want the user to grab to start a drag; the surrounding row
// receives the drop via onDragOver/onDrop.
function DragHandle({ onDragStart, onDragEnd }) {
  return (
    <span
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      title="Drag to reorder"
      style={{ cursor: 'grab', color: 'var(--text-dim)', flexShrink: 0, display: 'inline-flex' }}
    >
      <GripVertical size={14} />
    </span>
  )
}

// Inline-style helper for a drop-target wrapper around a sortable row.
function dropTargetStyle(isOver) {
  return isOver ? { boxShadow: 'inset 0 2px 0 0 var(--accent)' } : undefined
}

// ─── Shared form input styles ─────────────────────────────────────────────────
// FIELD_STYLE: for bg-transparent inputs (forms inside cards)
// INPUT_STYLE: for inputs that need an explicit background (AI settings)
const FIELD_STYLE = { borderColor: 'var(--border)', color: 'var(--text-primary)' }
const INPUT_STYLE = { backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }

// ─── Inline editable row ──────────────────────────────────────────────────────
function EnergyRow({ level, onSaved, onDelete, onDragStart, onDragEnd }) {
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
              style={FIELD_STYLE}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Label</label>
            <input
              value={draft.label}
              onChange={e => ch('label', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
              style={FIELD_STYLE}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Description</label>
          <input
            value={draft.description ?? ''}
            onChange={e => ch('description', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
            style={FIELD_STYLE}
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
              style={FIELD_STYLE}
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
                style={FIELD_STYLE}
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
                style={FIELD_STYLE}
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
        <DragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} />

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
          <PencilBtn onClick={() => { startEdit(); setEditing(true) }} />
          <TrashBtn  onClick={() => setShowDel(true)} />
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
            style={FIELD_STYLE}
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
            style={FIELD_STYLE}
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
          style={FIELD_STYLE}
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
            style={FIELD_STYLE}
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
              style={FIELD_STYLE}
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
              style={FIELD_STYLE}
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
function PriorityRow({ item, onSaved, onDelete, onDragStart, onDragEnd }) {
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
            <input value={draft.value} disabled className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent opacity-50" style={FIELD_STYLE} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Label</label>
            <input value={draft.label} onChange={e => ch('label', e.target.value)} className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent" style={FIELD_STYLE} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Badge background</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={draft.bg_color ?? 'var(--border)'} onChange={e => ch('bg_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5" />
              <input value={draft.bg_color ?? ''} onChange={e => ch('bg_color', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent" style={FIELD_STYLE} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Text color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={draft.text_color ?? 'var(--text-primary)'} onChange={e => ch('text_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5" />
              <input value={draft.text_color ?? ''} onChange={e => ch('text_color', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent" style={FIELD_STYLE} />
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
        <DragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} />
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide uppercase" style={{ backgroundColor: item.bg_color, color: item.text_color }}>{item.label}</span>
        <p className="flex-1 text-xs truncate" style={{ color: 'var(--text-dim)' }}>{item.value}</p>
        <div className="flex items-center gap-1 shrink-0">
          <PencilBtn onClick={() => { setDraft({ ...item }); setEditing(true) }} />
          <TrashBtn  onClick={() => setShowDel(true)} />
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
          <input value={draft.value} onChange={e => ch('value', e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))} className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent" style={FIELD_STYLE} placeholder="high_priority" />
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-dim)' }}>Lowercase, underscores only</p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Label <span style={{ color: 'var(--danger)' }}>*</span></label>
          <input value={draft.label} onChange={e => ch('label', e.target.value)} className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent" style={FIELD_STYLE} placeholder="High Priority" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Badge background</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={draft.bg_color} onChange={e => ch('bg_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5" />
            <input value={draft.bg_color} onChange={e => ch('bg_color', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent" style={FIELD_STYLE} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Text color</label>
          <div className="flex gap-2 items-center">
            <input type="color" value={draft.text_color} onChange={e => ch('text_color', e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5" />
            <input value={draft.text_color} onChange={e => ch('text_color', e.target.value)} className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent" style={FIELD_STYLE} />
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

// ─── Area rows (with colors) ──────────────────────────────────────────────────
function AreaRow({ item, onSaved, onDelete, onDragStart, onDragEnd }) {
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [label,     setLabel]     = useState(item.label)
  const [icon,      setIcon]      = useState(item.icon ?? '')
  const [bgColor,   setBgColor]   = useState(item.bg_color ?? '#374151')
  const [textColor, setTextColor] = useState(item.text_color ?? '#f9fafb')
  const [showDel,   setShowDel]   = useState(false)

  const save = async () => {
    if (!label.trim()) return
    setSaving(true)
    try {
      const updated = await updateArea(item.id, { label: label.trim(), value: label.trim(), icon: icon || null, bg_color: bgColor, text_color: textColor })
      onSaved(updated); setEditing(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    await deleteArea(item.id); onDelete(item.id); setShowDel(false)
  }

  return (
    <>
      <div className="rounded-xl border" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <DragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} />
          {editing ? (
            <>
              <input autoFocus value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setLabel(item.label); setEditing(false) } }} className="flex-1 px-2 py-1 rounded-lg text-sm border outline-none bg-transparent" style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }} />
              <Button size="sm" variant="primary" onClick={save} disabled={saving}>{saving ? '…' : 'Save'}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setLabel(item.label); setIcon(item.icon ?? ''); setBgColor(item.bg_color ?? '#374151'); setTextColor(item.text_color ?? '#f9fafb'); setEditing(false) }}>Cancel</Button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: bgColor, color: textColor }}>{icon && <span>{icon}</span>}{label}</span>
              <span className="flex-1" />
              <div className="flex items-center gap-1 shrink-0">
                <PencilBtn onClick={() => setEditing(true)} />
                <TrashBtn  onClick={() => setShowDel(true)} />
              </div>
            </>
          )}
        </div>
        {editing && (
          <div className="px-4 pb-3 grid grid-cols-3 gap-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Icon (emoji)</label>
              <input value={icon} onChange={e => setIcon(e.target.value)} className="w-full px-2 py-1 rounded-lg text-sm border outline-none bg-transparent text-center" style={FIELD_STYLE} placeholder="🏠" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                <input value={bgColor} onChange={e => setBgColor(e.target.value)} className="flex-1 px-2 py-1 rounded-lg text-xs border outline-none font-mono bg-transparent" style={FIELD_STYLE} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Text</label>
              <div className="flex items-center gap-2">
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                <input value={textColor} onChange={e => setTextColor(e.target.value)} className="flex-1 px-2 py-1 rounded-lg text-xs border outline-none font-mono bg-transparent" style={FIELD_STYLE} />
              </div>
            </div>
            <div className="col-span-3">
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Preview</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: bgColor, color: textColor }}>{icon && <span>{icon}</span>}{label || 'Area'}</span>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog open={showDel} onClose={() => setShowDel(false)} onConfirm={handleDelete} title="Remove Area?" message={`"${item.label}" will be removed from the list. Tasks/projects that already use it keep their stored value.`} confirmLabel="Remove" variant="danger" />
    </>
  )
}

function AddAreaForm({ onAdded, nextSortOrder }) {
  const [open,      setOpen]      = useState(false)
  const [label,     setLabel]     = useState('')
  const [icon,      setIcon]      = useState('')
  const [bgColor,   setBgColor]   = useState('#374151')
  const [textColor, setTextColor] = useState('#f9fafb')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)

  const submit = async () => {
    if (!label.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)
    try {
      const created = await createArea({ value: label.trim(), label: label.trim(), icon: icon || null, bg_color: bgColor, text_color: textColor, sort_order: nextSortOrder })
      onAdded(created); setLabel(''); setIcon(''); setBgColor('#374151'); setTextColor('#f9fafb'); setOpen(false)
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
        <input autoFocus value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setOpen(false); setLabel('') } }} className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent" style={FIELD_STYLE} placeholder="e.g. Side Projects" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Icon (emoji)</label>
          <input value={icon} onChange={e => setIcon(e.target.value)} className="w-full px-2 py-1 rounded-lg text-sm border outline-none bg-transparent text-center" style={FIELD_STYLE} placeholder="🏠" />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Background</label>
          <div className="flex items-center gap-2">
            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
            <input value={bgColor} onChange={e => setBgColor(e.target.value)} className="flex-1 px-2 py-1 rounded-lg text-xs border outline-none font-mono bg-transparent" style={FIELD_STYLE} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Text</label>
          <div className="flex items-center gap-2">
            <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
            <input value={textColor} onChange={e => setTextColor(e.target.value)} className="flex-1 px-2 py-1 rounded-lg text-xs border outline-none font-mono bg-transparent" style={FIELD_STYLE} />
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Preview</p>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: bgColor, color: textColor }}>{icon && <span>{icon}</span>}{label || 'Area'}</span>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={submit} disabled={saving}>{saving ? 'Adding…' : 'Add'}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setLabel(''); setIcon(''); setError(null) }}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── Context Tag rows (full CRUD, mirrors AreaRow) ───────────────────────────
function ContextTagRow({ item, onSaved, onDelete, onDragStart, onDragEnd }) {
  const [editing,   setEditing]   = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [label,     setLabel]     = useState(item.label)
  const [bgColor,   setBgColor]   = useState(item.bg_color ?? '#374151')
  const [textColor, setTextColor] = useState(item.text_color ?? '#f9fafb')
  const [showDel,   setShowDel]   = useState(false)

  const save = async () => {
    if (!label.trim()) return
    setSaving(true)
    try {
      const updated = await updateContextTag(item.id, { label: label.trim(), bg_color: bgColor, text_color: textColor })
      onSaved(updated); setEditing(false)
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    await deleteContextTag(item.id); onDelete(item.id); setShowDel(false)
  }

  return (
    <>
      <div className="rounded-xl border" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 px-4 py-3">
          <DragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} />
          {editing ? (
            <>
              <input autoFocus value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setLabel(item.label); setEditing(false) } }} className="flex-1 px-2 py-1 rounded-lg text-sm border outline-none bg-transparent" style={{ borderColor: 'var(--accent)', color: 'var(--text-primary)' }} />
              <Button size="sm" variant="primary" onClick={save} disabled={saving}>{saving ? '…' : 'Save'}</Button>
              <Button size="sm" variant="ghost" onClick={() => { setLabel(item.label); setBgColor(item.bg_color ?? '#374151'); setTextColor(item.text_color ?? '#f9fafb'); setEditing(false) }}>Cancel</Button>
            </>
          ) : (
            <>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: bgColor, color: textColor }}>@{label}</span>
              <span className="flex-1" />
              <div className="flex items-center gap-1 shrink-0">
                <PencilBtn onClick={() => setEditing(true)} />
                <TrashBtn  onClick={() => setShowDel(true)} />
              </div>
            </>
          )}
        </div>
        {editing && (
          <div className="px-4 pb-3 grid grid-cols-2 gap-4 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Background</label>
              <div className="flex items-center gap-2">
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                <input value={bgColor} onChange={e => setBgColor(e.target.value)} className="flex-1 px-2 py-1 rounded-lg text-xs border outline-none font-mono bg-transparent" style={FIELD_STYLE} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Text</label>
              <div className="flex items-center gap-2">
                <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
                <input value={textColor} onChange={e => setTextColor(e.target.value)} className="flex-1 px-2 py-1 rounded-lg text-xs border outline-none font-mono bg-transparent" style={FIELD_STYLE} />
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Preview</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: bgColor, color: textColor }}>@{label || 'tag'}</span>
            </div>
          </div>
        )}
      </div>
      <ConfirmDialog open={showDel} onClose={() => setShowDel(false)} onConfirm={handleDelete} title="Remove Context Tag?" message={`"@${item.label}" will be removed from the list. Tasks that already use it keep the stored value but it won't appear in the picker.`} confirmLabel="Remove" variant="danger" />
    </>
  )
}

function AddContextTagForm({ onAdded, nextSortOrder }) {
  const [open,      setOpen]      = useState(false)
  const [label,     setLabel]     = useState('')
  const [bgColor,   setBgColor]   = useState('#374151')
  const [textColor, setTextColor] = useState('#f9fafb')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState(null)

  const submit = async () => {
    if (!label.trim()) { setError('Name is required.'); return }
    setSaving(true); setError(null)
    try {
      const value = label.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
      const created = await createContextTag({ value, label: label.trim(), bg_color: bgColor, text_color: textColor, sort_order: nextSortOrder })
      onAdded(created); setLabel(''); setBgColor('#374151'); setTextColor('#f9fafb'); setOpen(false)
    } catch (err) { setError(err.message ?? 'Failed to create context tag') } finally { setSaving(false) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)} className="flex items-center gap-2 w-full px-4 py-2.5 rounded-xl border text-sm transition-colors" style={{ borderColor: 'var(--border)', borderStyle: 'dashed', color: 'var(--text-secondary)', backgroundColor: 'transparent' }} onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }} onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
      <Plus size={14} />Add context tag
    </button>
  )

  return (
    <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent)' }}>
      {error && <p className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--state-error-bg)', color: 'var(--state-error-text)' }}>{error}</p>}
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Name <span style={{ color: 'var(--danger)' }}>*</span></label>
        <input autoFocus value={label} onChange={e => setLabel(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submit(); if (e.key === 'Escape') { setOpen(false); setLabel('') } }} className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent" style={FIELD_STYLE} placeholder="e.g. Lawncare" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Background</label>
          <div className="flex items-center gap-2">
            <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
            <input value={bgColor} onChange={e => setBgColor(e.target.value)} className="flex-1 px-2 py-1 rounded-lg text-xs border outline-none font-mono bg-transparent" style={FIELD_STYLE} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Text</label>
          <div className="flex items-center gap-2">
            <input type="color" value={textColor} onChange={e => setTextColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer border-0 p-0" />
            <input value={textColor} onChange={e => setTextColor(e.target.value)} className="flex-1 px-2 py-1 rounded-lg text-xs border outline-none font-mono bg-transparent" style={FIELD_STYLE} />
          </div>
        </div>
      </div>
      <div>
        <p className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Preview</p>
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: bgColor, color: textColor }}>@{label || 'tag'}</span>
      </div>
      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="primary" onClick={submit} disabled={saving}>{saving ? 'Adding…' : 'Add'}</Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setError(null) }}>Cancel</Button>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

// ─── Google Accounts ──────────────────────────────────────────────────────────
function GoogleAccountsSection() {
  const [accounts, setAccounts] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    try {
      setAccounts(await getConnectedGoogleAccounts())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleAdd = async () => {
    setConnecting(true)
    setError(null)
    try {
      const redirectUri = `${window.location.origin}/auth/google-callback`
      sessionStorage.setItem('google_connect_label', 'work')
      const url = await getGoogleConnectUrl(redirectUri)
      window.location.href = url
    } catch (e) {
      setError(e.message)
      setConnecting(false)
    }
  }

  const handleRemove = async (account) => {
    // Don't allow removing the last / primary account (label = personal)
    if (account.label === 'personal') return
    try {
      await disconnectGoogleAccount(account.id)
      setAccounts(prev => prev.filter(a => a.id !== account.id))
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) return <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p>

  return (
    <div className="space-y-3">
      {accounts.map(account => (
        <div
          key={account.id}
          className="flex items-center justify-between rounded-xl border px-4 py-3"
          style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
        >
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{account.email}</p>
            <p className="text-xs mt-0.5 capitalize" style={{ color: 'var(--text-secondary)' }}>
              {account.label} · Connected {new Date(account.updated_at).toLocaleDateString()}
            </p>
          </div>
          {account.label !== 'personal' && (
            <button
              onClick={() => handleRemove(account)}
              className="text-xs px-2 py-1 rounded"
              style={{ color: 'var(--state-danger-text)', backgroundColor: 'var(--state-danger-bg)' }}
            >
              Disconnect
            </button>
          )}
          {account.label === 'personal' && (
            <span className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-secondary)', backgroundColor: 'var(--app-bg)' }}>
              Primary
            </span>
          )}
        </div>
      ))}

      {error && (
        <p className="text-sm" style={{ color: 'var(--state-danger-text)' }}>{error}</p>
      )}

      <Button onClick={handleAdd} disabled={connecting} variant="secondary" size="sm">
        {connecting ? 'Redirecting to Google…' : '+ Add Google Account'}
      </Button>

      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
        Additional accounts pull Gmail labels (@Action, @Waiting) and primary calendar events into your Daily Review and Agenda.
      </p>
    </div>
  )
}

export default function Settings() {
  const { levels,     loading: elLoading,   reload: reloadEL }   = useEnergyLevels()
  const { priorities, loading: priLoading,  reload: reloadPri }  = usePriorities()
  const { areas,      loading: areaLoading, reload: reloadArea } = useAreas()
  const { tags: ctxTags, loading: ctxLoading, reload: reloadCtx } = useContextTags()
  const { theme, setTheme, themes } = useTheme()

  const el  = useLocalList(levels,     reloadEL)
  const pri = useLocalList(priorities, reloadPri)
  const ar  = useLocalList(areas,      reloadArea)
  const ct  = useLocalList(ctxTags,    reloadCtx)

  // Drag-to-reorder per list — drag in any of the 4 Settings sections
  // recomputes every row's sort_order to (i+1)*10 and writes the changes back.
  const elSortable  = useSortableList(el.displayed,  updateEnergyLevel, reloadEL)
  const priSortable = useSortableList(pri.displayed, updatePriority,    reloadPri)
  const arSortable  = useSortableList(ar.displayed,  updateArea,        reloadArea)
  const ctSortable  = useSortableList(ct.displayed,  updateContextTag,  reloadCtx)

  return (
    <div className="px-10 py-8 max-w-2xl space-y-12">
      <div>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Settings</h1>
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
            {elSortable.ordered.map(level => (
              <div
                key={level.id}
                onDragOver={e => elSortable.handleDragOver(e, level.id)}
                onDrop={() => elSortable.handleDrop(level.id)}
                style={dropTargetStyle(elSortable.dragOverId === level.id)}
              >
                <EnergyRow
                  level={level}
                  onSaved={el.onSaved}
                  onDelete={el.onDeleted}
                  onDragStart={() => elSortable.handleDragStart(level.id)}
                  onDragEnd={elSortable.handleDragEnd}
                />
              </div>
            ))}
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
            {priSortable.ordered.map(item => (
              <div
                key={item.id}
                onDragOver={e => priSortable.handleDragOver(e, item.id)}
                onDrop={() => priSortable.handleDrop(item.id)}
                style={dropTargetStyle(priSortable.dragOverId === item.id)}
              >
                <PriorityRow
                  item={item}
                  onSaved={pri.onSaved}
                  onDelete={pri.onDeleted}
                  onDragStart={() => priSortable.handleDragStart(item.id)}
                  onDragEnd={priSortable.handleDragEnd}
                />
              </div>
            ))}
            <AddPriorityForm onAdded={pri.onAdded} nextSortOrder={(pri.displayed[pri.displayed.length - 1]?.sort_order ?? 0) + 10} />
          </div>
        )}
      </section>

      {/* ── Areas ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Areas</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Area suggestions with badge colors. You can still type a custom value when editing a task or project.</p>
        </div>
        {areaLoading ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
          <div className="space-y-2">
            {arSortable.ordered.map(item => (
              <div
                key={item.id}
                onDragOver={e => arSortable.handleDragOver(e, item.id)}
                onDrop={() => arSortable.handleDrop(item.id)}
                style={dropTargetStyle(arSortable.dragOverId === item.id)}
              >
                <AreaRow
                  item={item}
                  onSaved={ar.onSaved}
                  onDelete={ar.onDeleted}
                  onDragStart={() => arSortable.handleDragStart(item.id)}
                  onDragEnd={arSortable.handleDragEnd}
                />
              </div>
            ))}
            <AddAreaForm onAdded={ar.onAdded} nextSortOrder={(ar.displayed[ar.displayed.length - 1]?.sort_order ?? 0) + 10} />
          </div>
        )}
      </section>

      {/* ── Context Tags ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Context Tags</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>The set of @context tags you can apply to tasks. Add them here first; tasks pick from this list.</p>
        </div>
        {ctxLoading ? <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading…</p> : (
          <div className="space-y-2">
            {ctSortable.ordered.map(item => (
              <div
                key={item.id}
                onDragOver={e => ctSortable.handleDragOver(e, item.id)}
                onDrop={() => ctSortable.handleDrop(item.id)}
                style={dropTargetStyle(ctSortable.dragOverId === item.id)}
              >
                <ContextTagRow
                  item={item}
                  onSaved={ct.onSaved}
                  onDelete={ct.onDeleted}
                  onDragStart={() => ctSortable.handleDragStart(item.id)}
                  onDragEnd={ctSortable.handleDragEnd}
                />
              </div>
            ))}
            <AddContextTagForm onAdded={ct.onAdded} nextSortOrder={(ct.displayed[ct.displayed.length - 1]?.sort_order ?? 0) + 10} />
          </div>
        )}
      </section>

      {/* ── Google Accounts ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Google Accounts</h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Connected Google accounts for Calendar and Gmail. Your sign-in account is always connected.
          </p>
        </div>
        <GoogleAccountsSection />
      </section>
    </div>
  )
}
