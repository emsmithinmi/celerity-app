import { useState, useEffect } from 'react'
import { Modal, Button } from '../ui'
import { supabase } from '../../lib/supabase'

export default function QuickCapture() {
  const [open,   setOpen]   = useState(false)
  const [title,  setTitle]  = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const close = () => { setOpen(false); setTitle('') }

  const handleSave = async () => {
    if (!title.trim() || saving) return
    setSaving(true)
    await supabase.from('tasks').insert({ title: title.trim(), status: 'inbox' })
    setSaving(false)
    close()
  }

  return (
    <Modal
      isOpen={open}
      onClose={close}
      title="Quick Capture"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={close}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={saving || !title.trim()}
          >
            {saving ? 'Saving…' : 'Add to Inbox'}
          </Button>
        </>
      }
    >
      <div className="space-y-2">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          placeholder="What's on your mind?"
          autoFocus
          className="w-full bg-app-bg border border-app-border rounded-lg px-3 py-2.5 text-sm text-app-text placeholder:text-app-muted focus:outline-none focus:border-app-highlight"
        />
        <p className="text-xs text-app-muted">
          Lands in Inbox — process it later.
        </p>
      </div>
    </Modal>
  )
}
