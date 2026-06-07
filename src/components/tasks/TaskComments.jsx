import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { getTaskComments, addTaskComment, deleteTaskComment } from '../../lib/api/tasks'
import Button from '../ui/Button'

export default function TaskComments({ taskId }) {
  const [comments,   setComments]   = useState([])
  const [body,       setBody]       = useState('')
  const [saving,     setSaving]     = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [deletingId, setDeletingId] = useState(null)

  useEffect(() => {
    if (!taskId) return
    getTaskComments(taskId)
      .then(setComments)
      .finally(() => setLoading(false))
  }, [taskId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    const comment = await addTaskComment(taskId, body.trim())
    setComments(prev => [...prev, comment])
    setBody('')
    setSaving(false)
  }

  const handleDelete = async (id) => {
    setDeletingId(id)
    try {
      await deleteTaskComment(id)
      setComments(prev => prev.filter(c => c.id !== id))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Loading…</p>
      ) : comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map(c => (
            <div
              key={c.id}
              className="rounded-lg px-3 py-2.5 border"
              style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(c.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
                <button
                  onClick={() => handleDelete(c.id)}
                  disabled={deletingId === c.id}
                  title="Delete note"
                  className="flex items-center justify-center rounded transition-colors disabled:opacity-40"
                  style={{ color: 'var(--text-dim)' }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--danger)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)' }}
                >
                  <X size={12} />
                </button>
              </div>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--text-primary)' }}>{c.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>No notes yet.</p>
      )}

      <form onSubmit={handleAdd} className="space-y-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd(e) }}
          placeholder="Add a note… (Ctrl+Enter)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
          style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
          onFocus={e => e.target.style.borderColor = 'var(--accent)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" variant="secondary" disabled={!body.trim() || saving}>
            {saving ? 'Adding…' : 'Add Note'}
          </Button>
        </div>
      </form>
    </div>
  )
}
