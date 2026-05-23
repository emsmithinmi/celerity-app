import { useState, useEffect } from 'react'
import { getPersonComments, addPersonComment } from '../../lib/api/people'
import Button from '../ui/Button'

export default function PersonComments({ personId }) {
  const [comments, setComments] = useState([])
  const [body,     setBody]     = useState('')
  const [saving,   setSaving]   = useState(false)
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    if (!personId) return
    getPersonComments(personId)
      .then(setComments)
      .finally(() => setLoading(false))
  }, [personId])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!body.trim()) return
    setSaving(true)
    const comment = await addPersonComment(personId, body.trim())
    setComments(prev => [...prev, comment])
    setBody('')
    setSaving(false)
  }

  return (
    <div className="space-y-3">
      {loading ? (
        <p className="text-xs" style={{ color: '#6c7086' }}>Loading…</p>
      ) : comments.length > 0 ? (
        <div className="space-y-2">
          {comments.map(c => (
            <div
              key={c.id}
              className="rounded-lg px-3 py-2.5 border"
              style={{ backgroundColor: '#1e1e2e', borderColor: '#313244' }}
            >
              <p className="text-xs mb-1" style={{ color: '#6c7086' }}>
                {new Date(c.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: '#cdd6f4' }}>{c.body}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs" style={{ color: '#6c7086' }}>No comments yet.</p>
      )}

      <form onSubmit={handleAdd} className="space-y-2">
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd(e) }}
          placeholder="Add a comment… (Ctrl+Enter)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none resize-none"
          style={{ backgroundColor: '#1e1e2e', borderColor: '#313244', color: '#cdd6f4' }}
          onFocus={e => e.target.style.borderColor = '#89b4fa'}
          onBlur={e => e.target.style.borderColor = '#313244'}
        />
        <div className="flex justify-end">
          <Button type="submit" size="sm" variant="secondary" disabled={!body.trim() || saving}>
            {saving ? 'Adding…' : 'Add Comment'}
          </Button>
        </div>
      </form>
    </div>
  )
}
