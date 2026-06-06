import { useState } from 'react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

export default function TaskCompletionModal({ open, onClose, onConfirm }) {
  const [comment,       setComment]       = useState('')
  const [archive,       setArchive]       = useState(false)
  const [highlight,     setHighlight]     = useState(false)
  const [highlightNote, setHighlightNote] = useState('')
  const [saving,        setSaving]        = useState(false)

  const reset = () => {
    setComment('')
    setArchive(false)
    setHighlight(false)
    setHighlightNote('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleConfirm = async () => {
    setSaving(true)
    try {
      await onConfirm({
        comment:       comment.trim() || null,
        archive,
        highlight,
        highlightNote: highlight ? (highlightNote.trim() || null) : null,
      })
      reset()
    } finally {
      setSaving(false)
    }
  }

  const neitherChecked = !archive && !highlight

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Mark Complete 🎉"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={handleClose} disabled={saving}>Cancel</Button>
          <Button variant="success" onClick={handleConfirm} disabled={saving}>
            {saving ? 'Saving…' : '✓ Done'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">

        {/* Completion comment */}
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
            Completion note <span style={{ color: 'var(--text-dim)' }}>(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="How did it go? Anything worth noting?"
            rows={3}
            autoFocus
            className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
            style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
            onFocus={e => e.target.style.borderColor = 'var(--accent)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Archive */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={archive}
            onChange={e => setArchive(e.target.checked)}
            className="mt-0.5"
            style={{ accentColor: 'var(--accent-purple)' }}
          />
          <div>
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>📁 Archive</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Keep as a permanent record — won't be auto-deleted.
            </p>
          </div>
        </label>

        {/* Highlight */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={highlight}
            onChange={e => setHighlight(e.target.checked)}
            className="mt-0.5"
            style={{ accentColor: 'var(--accent-yellow)' }}
          />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>⭐ Highlight</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
              Flag this as a notable win or milestone.
            </p>
          </div>
        </label>

        {/* Highlight note — only shown when highlight is checked */}
        {highlight && (
          <div className="pl-7">
            <textarea
              value={highlightNote}
              onChange={e => setHighlightNote(e.target.value)}
              placeholder="Why is this worth remembering? (optional)"
              rows={2}
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
              style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--accent-yellow)', color: 'var(--text-primary)' }}
              onFocus={e => e.target.style.borderColor = 'var(--accent-yellow)'}
              onBlur={e => e.target.style.borderColor = 'var(--accent-yellow)'}
            />
          </div>
        )}

        {/* 30-day warning — only shown when neither box is checked */}
        {neitherChecked && (
          <p
            className="text-xs px-3 py-2 rounded-lg"
            style={{ backgroundColor: 'var(--state-warning-bg)', color: 'var(--state-warning-text)' }}
          >
            ⏱ Without archive or highlight, this task will be auto-deleted in 30 days.
          </p>
        )}

      </div>
    </Modal>
  )
}
