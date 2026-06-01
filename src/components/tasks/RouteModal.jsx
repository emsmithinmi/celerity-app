import { useState } from 'react'
import { useProjects } from '../../hooks/useProjects'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function RouteModal({ open, onClose, onAssign }) {
  const [selected, setSelected] = useState(null)
  const [saving, setSaving]     = useState(false)
  const { projects, loading }   = useProjects({ archived: false })

  // Only show projects that make sense to assign tasks to
  const eligible = projects.filter(p =>
    ['planning', 'in_progress', 'stalled'].includes(p.status)
  )

  const handleAssign = async () => {
    if (!selected) return
    setSaving(true)
    await onAssign(selected)
    setSelected(null)
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Assign to Project"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleAssign} disabled={!selected || saving}>
            {saving ? 'Assigning…' : 'Assign & Queue'}
          </Button>
        </>
      }
    >
      {loading ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Loading projects…</p>
      ) : eligible.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          No active projects found. Create a project first.
        </p>
      ) : (
        <div className="space-y-1.5">
          {eligible.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className="w-full text-left px-3 py-2.5 rounded-lg border text-sm transition-colors"
              style={{
                backgroundColor: selected === p.id ? 'var(--border)' : 'var(--app-bg)',
                borderColor: selected === p.id ? 'var(--accent)' : 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <span className="font-medium">{p.title}</span>
              {p.area && (
                <span className="ml-2 text-xs" style={{ color: 'var(--text-secondary)' }}>{p.area}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </Modal>
  )
}
