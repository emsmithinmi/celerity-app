import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

// ─── Capture Task ─────────────────────────────────────────────────────────────
export function CaptureTaskModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

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
        <label className="block text-sm font-medium mb-2" style={{ color: '#cdd6f4' }}>
          Task name
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ backgroundColor: '#1e1e2e', borderColor: '#313244', color: '#cdd6f4' }}
          onFocus={e => e.target.style.borderColor = '#89b4fa'}
          onBlur={e => e.target.style.borderColor = '#313244'}
        />
        <p className="text-xs mt-2" style={{ color: '#6c7086' }}>
          You'll clarify priority, duration, and area next.
        </p>
      </form>
    </Modal>
  )
}

// ─── Capture Project ──────────────────────────────────────────────────────────
export function CaptureProjectModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

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
        <label className="block text-sm font-medium mb-2" style={{ color: '#cdd6f4' }}>
          Project name
        </label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="What's the project?"
          autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ backgroundColor: '#1e1e2e', borderColor: '#313244', color: '#cdd6f4' }}
          onFocus={e => e.target.style.borderColor = '#89b4fa'}
          onBlur={e => e.target.style.borderColor = '#313244'}
        />
        <p className="text-xs mt-2" style={{ color: '#6c7086' }}>
          You'll add description, dates, and tasks in the planning phase.
        </p>
      </form>
    </Modal>
  )
}

// ─── Capture Person ───────────────────────────────────────────────────────────
export function CapturePersonModal({ open, onClose, onCreate }) {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [saving, setSaving]       = useState(false)

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
            <label className="block text-sm font-medium mb-1.5" style={{ color: '#cdd6f4' }}>
              {label}
            </label>
            <input
              type="text"
              value={value}
              onChange={e => setter(e.target.value)}
              placeholder={placeholder}
              autoFocus={label === 'First name'}
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
              style={{ backgroundColor: '#1e1e2e', borderColor: '#313244', color: '#cdd6f4' }}
              onFocus={e => e.target.style.borderColor = '#89b4fa'}
              onBlur={e => e.target.style.borderColor = '#313244'}
            />
          </div>
        ))}
      </form>
    </Modal>
  )
}

// ─── Quick Note (alias for NotesSection inline form, but as a modal) ──────────
export function QuickNoteModal({ open, onClose, onAdd }) {
  const [body, setBody]   = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    await onAdd(body.trim())
    setBody('')
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quick Note"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!body.trim() || saving}>
            {saving ? 'Saving…' : 'Add Note'}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          placeholder="What's on your mind?"
          rows={4}
          autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
          style={{ backgroundColor: '#1e1e2e', borderColor: '#313244', color: '#cdd6f4' }}
          onFocus={e => e.target.style.borderColor = '#89b4fa'}
          onBlur={e => e.target.style.borderColor = '#313244'}
        />
      </form>
    </Modal>
  )
}
