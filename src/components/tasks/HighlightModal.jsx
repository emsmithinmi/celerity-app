import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function HighlightModal({ open, onClose, onConfirm, title = 'Add to Highlights' }) {
  const [note, setNote]   = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    setSaving(true)
    await onConfirm(note.trim() || null)
    setNote('')
    setSaving(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="success" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Saving…' : '⭐ Add to Highlights'}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Optionally add a note about why this is worth remembering.
        </p>
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Why is this a highlight? (optional)"
          rows={3}
          autoFocus
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
          style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>
    </Modal>
  )
}
