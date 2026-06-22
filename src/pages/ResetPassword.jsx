import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password,  setPassword]  = useState('')
  const [confirm,   setConfirm]   = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [done,      setDone]      = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (password !== confirm) { setError("Passwords don't match."); return }
    if (password.length < 8)  { setError('Password must be at least 8 characters.'); return }
    setSaving(true)
    setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (err) { setError(err.message); return }
    setDone(true)
    setTimeout(() => navigate('/daily'), 1500)
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--app-bg)' }}>
      <div className="w-full max-w-sm px-8 py-10 rounded-2xl border" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Set a new password</h1>
        <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>Choose something you'll remember.</p>

        {done ? (
          <p className="text-sm text-center" style={{ color: 'var(--accent-green)' }}>Password updated — taking you in…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>New password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
                required
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Confirm password</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ backgroundColor: 'var(--app-bg)', borderColor: 'var(--border)', color: 'var(--text-primary)' }}
              />
            </div>
            {error && <p className="text-xs" style={{ color: 'var(--accent-red)' }}>{error}</p>}
            <button
              type="submit"
              disabled={saving || !password || !confirm}
              className="w-full py-2.5 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--app-bg)', opacity: (saving || !password || !confirm) ? 0.5 : 1 }}
            >
              {saving ? 'Saving…' : 'Set password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
