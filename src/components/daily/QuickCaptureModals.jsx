import { useState, useEffect } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

// ─── Capture Task ─────────────────────────────────────────────────────────────
export function CaptureTaskModal({ open, onClose, onCreate, initialValues }) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setTitle(initialValues?.title ?? '') }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onCreate(title.trim())
    setTitle('')
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Capture Task"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!title.trim() || saving}>
            {saving ? 'Capturing…' : 'Capture'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Task name
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          You'll clarify priority, duration, and area next.
        </p>
      </form>
    </Modal>
  )
}

// ─── Capture Project ──────────────────────────────────────────────────────────
export function CaptureProjectModal({ open, onClose, onCreate, initialValues }) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) setTitle(initialValues?.title ?? '') }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onCreate(title.trim())
    setTitle('')
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Capture Project"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!title.trim() || saving}>
            {saving ? 'Capturing…' : 'Capture'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
          Project name
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What's the project?"
          autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
          You'll add description, dates, and tasks in the planning phase.
        </p>
      </form>
    </Modal>
  )
}

// ─── Capture Person ───────────────────────────────────────────────────────────
export function CapturePersonModal({ open, onClose, onCreate, initialValues }) {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [saving, setSaving]       = useState(false)
  useEffect(() => { if (open) { setFirstName(initialValues?.first_name ?? ''); setLastName(initialValues?.last_name ?? '') } }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim()) return
    setSaving(true)
    await onCreate({ first_name: firstName.trim(), last_name: lastName.trim() })
    setFirstName('')
    setLastName('')
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Person"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!firstName.trim() || !lastName.trim() || saving}>
            {saving ? 'Saving…' : 'Add Person'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        {[
          { label: 'First name', value: firstName, setter: setFirstName, placeholder: 'First' },
          { label: 'Last name',  value: lastName,  setter: setLastName,  placeholder: 'Last'  },
        ].map(({ label, value, setter, placeholder }) => (
          <div key={label}>
            <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)' }}>
              {label}
            </label>
            <input
              type="text"
              value={value}
              onChange={e => setter(e.target.value)}
              placeholder={placeholder}
              autoFocus={label === 'First name'}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        ))}
      </form>
    </Modal>
  )
}

