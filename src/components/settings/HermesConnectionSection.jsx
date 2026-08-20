import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const BRIDGE_URL = 'http://127.0.0.1:43192'

export default function HermesConnectionSection() {
  const [working, setWorking] = useState(false)
  const [message, setMessage] = useState(null)
  const [error, setError] = useState(null)

  const connect = async () => {
    setWorking(true)
    setMessage(null)
    setError(null)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!session?.access_token || !session.refresh_token) {
        throw new Error('Focus Flow does not have an active session. Sign in again and retry.')
      }

      const response = await fetch(`${BRIDGE_URL}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ refresh_token: session.refresh_token }),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result.error || 'The local Hermes bridge rejected the transfer.')
      setMessage('Hermes is connected. The agent was restarted with your current Focus Flow session.')
    } catch (err) {
      setError(err.message || 'Could not connect Hermes.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <section>
      <div className="mb-4">
        <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Hermes Connection</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Connect Hermes to this signed-in Focus Flow account. The session is handed directly to the local Hermes bridge; it is not copied through chat or the clipboard.
        </p>
      </div>
      <div className="rounded-xl border p-4 space-y-3" style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Start the local Hermes bridge on this desktop, then click Connect. This is a one-time setup for this desktop session.
        </p>
        <button
          type="button"
          onClick={connect}
          disabled={working}
          className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--app-bg)' }}
        >
          {working ? 'Connecting…' : 'Connect Hermes'}
        </button>
        {message && <p className="text-sm" style={{ color: 'var(--accent-green)' }}>{message}</p>}
        {error && <p className="text-sm" style={{ color: 'var(--danger)' }}>{error}</p>}
      </div>
    </section>
  )
}
