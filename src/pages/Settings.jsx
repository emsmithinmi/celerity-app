import { useState } from 'react'
import { Pencil, Trash2, Plus, Check, X, GripVertical } from 'lucide-react'
import Button from '../components/ui/Button'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import { useEnergyLevels } from '../contexts/EnergyLevelsContext'
import {
  createEnergyLevel,
  updateEnergyLevel,
  deleteEnergyLevel,
} from '../lib/api/energyLevels'

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
        style={{ backgroundColor: '#1e1e2e', borderColor: '#89b4fa' }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Value (slug)</label>
            <input
              value={draft.value}
              disabled
              className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent opacity-50"
              style={{ borderColor: '#313244', color: '#cdd6f4' }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Label</label>
            <input
              value={draft.label}
              onChange={e => ch('label', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
              style={{ borderColor: '#313244', color: '#cdd6f4' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Description</label>
          <input
            value={draft.description ?? ''}
            onChange={e => ch('description', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
            style={{ borderColor: '#313244', color: '#cdd6f4' }}
            placeholder="Short description of when to use this level"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Icon (emoji)</label>
            <input
              value={draft.icon ?? ''}
              onChange={e => ch('icon', e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent text-center"
              style={{ borderColor: '#313244', color: '#cdd6f4' }}
              placeholder="💪"
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Badge background</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={draft.bg_color ?? '#313244'}
                onChange={e => ch('bg_color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5"
              />
              <input
                value={draft.bg_color ?? ''}
                onChange={e => ch('bg_color', e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
                style={{ borderColor: '#313244', color: '#cdd6f4' }}
                placeholder="#313244"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Badge text color</label>
            <div className="flex gap-2 items-center">
              <input
                type="color"
                value={draft.text_color ?? '#cdd6f4'}
                onChange={e => ch('text_color', e.target.value)}
                className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent p-0.5"
              />
              <input
                value={draft.text_color ?? ''}
                onChange={e => ch('text_color', e.target.value)}
                className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none bg-transparent"
                style={{ borderColor: '#313244', color: '#cdd6f4' }}
                placeholder="#cdd6f4"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="flex items-center gap-3">
          <p className="text-xs" style={{ color: '#6c7086' }}>Preview:</p>
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
        style={{ backgroundColor: '#181825', borderColor: '#313244' }}
      >
        {/* Drag handle (visual only) */}
        <GripVertical size={14} style={{ color: '#45475a', flexShrink: 0 }} />

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
          <p className="text-xs" style={{ color: '#45475a' }}>{level.value}</p>
          {level.description && (
            <p className="text-xs truncate" style={{ color: '#6c7086' }}>{level.description}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => { startEdit(); setEditing(true) }}
            title="Edit"
            className="flex items-center justify-center rounded transition-colors"
            style={{ width: 28, height: 28, color: '#6c7086', backgroundColor: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#313244'; e.currentTarget.style.color = '#cdd6f4' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6c7086' }}
          >
            <Pencil size={13} />
          </button>
          <button
            onClick={() => setShowDel(true)}
            title="Delete"
            className="flex items-center justify-center rounded transition-colors"
            style={{ width: 28, height: 28, color: '#6c7086', backgroundColor: 'transparent' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#3d2c2c'; e.currentTarget.style.color = '#f28b82' }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#6c7086' }}
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
const BLANK = { value: '', label: '', description: '', icon: '', bg_color: '#313244', text_color: '#cdd6f4', sort_order: 99 }

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
        style={{ borderColor: '#313244', borderStyle: 'dashed', color: '#6c7086', backgroundColor: 'transparent' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = '#89b4fa'; e.currentTarget.style.color = '#89b4fa' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = '#313244'; e.currentTarget.style.color = '#6c7086' }}
      >
        <Plus size={14} />
        Add energy level
      </button>
    )
  }

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ backgroundColor: '#1e1e2e', borderColor: '#89b4fa' }}
    >
      {error && (
        <p className="text-xs px-2 py-1 rounded" style={{ backgroundColor: '#2d1e1e', color: '#f28b82' }}>{error}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>
            Slug <span style={{ color: '#DB4437' }}>*</span>
          </label>
          <input
            value={draft.value}
            onChange={e => ch('value', e.target.value.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''))}
            className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
            style={{ borderColor: '#313244', color: '#cdd6f4' }}
            placeholder="deep_focus"
          />
          <p className="text-xs mt-0.5" style={{ color: '#45475a' }}>Lowercase, underscores only</p>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>
            Label <span style={{ color: '#DB4437' }}>*</span>
          </label>
          <input
            value={draft.label}
            onChange={e => ch('label', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
            style={{ borderColor: '#313244', color: '#cdd6f4' }}
            placeholder="Deep Focus"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Description</label>
        <input
          value={draft.description}
          onChange={e => ch('description', e.target.value)}
          className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent"
          style={{ borderColor: '#313244', color: '#cdd6f4' }}
          placeholder="Mentally demanding computer work"
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Icon (emoji)</label>
          <input
            value={draft.icon}
            onChange={e => ch('icon', e.target.value)}
            className="w-full px-3 py-1.5 rounded-lg text-sm border outline-none bg-transparent text-center"
            style={{ borderColor: '#313244', color: '#cdd6f4' }}
            placeholder="🧠"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Badge background</label>
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
              style={{ borderColor: '#313244', color: '#cdd6f4' }}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Badge text color</label>
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
              style={{ borderColor: '#313244', color: '#cdd6f4' }}
            />
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="flex items-center gap-3">
        <p className="text-xs" style={{ color: '#6c7086' }}>Preview:</p>
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

// ─── Settings Page ────────────────────────────────────────────────────────────
export default function Settings() {
  const { levels, loading, reload } = useEnergyLevels()
  const [localLevels, setLocalLevels] = useState(null)

  // Use local copy for instant UI updates; falls back to context on load
  const displayed = localLevels ?? levels

  const handleSaved = (updated) => {
    setLocalLevels(prev =>
      (prev ?? levels).map(l => l.id === updated.id ? updated : l)
    )
    reload()
  }

  const handleDeleted = (id) => {
    setLocalLevels(prev => (prev ?? levels).filter(l => l.id !== id))
    reload()
  }

  const handleAdded = (created) => {
    setLocalLevels(prev => [...(prev ?? levels), created])
    reload()
  }

  return (
    <div className="px-10 py-8 max-w-2xl">
      <h1 className="text-2xl font-bold mb-1" style={{ color: '#cdd6f4' }}>Settings</h1>
      <p className="text-sm mb-8" style={{ color: '#6c7086' }}>App preferences and reference data</p>

      {/* ── Energy Levels ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-base font-semibold" style={{ color: '#cdd6f4' }}>Energy Levels</h2>
          <p className="text-sm mt-0.5" style={{ color: '#6c7086' }}>
            The energy level options that appear when editing tasks. Add, rename, re-color, or remove them here — no code changes needed.
          </p>
        </div>

        {loading ? (
          <p className="text-sm" style={{ color: '#6c7086' }}>Loading…</p>
        ) : (
          <div className="space-y-2">
            {displayed.map(level => (
              <EnergyRow
                key={level.id}
                level={level}
                onSaved={handleSaved}
                onDelete={handleDeleted}
              />
            ))}
            <AddEnergyForm
              onAdded={handleAdded}
              nextSortOrder={(displayed[displayed.length - 1]?.sort_order ?? 0) + 10}
            />
          </div>
        )}
      </section>
    </div>
  )
}
