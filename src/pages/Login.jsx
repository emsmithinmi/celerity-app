import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    })

    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: '#1e1e2e' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 border"
        style={{ backgroundColor: '#181825', borderColor: '#313244' }}
      >
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-1" style={{ color: '#cdd6f4' }}>
            Celerity
          </h1>
        </div>

        {sent ? (
          /* Success state */
          <div className="text-center">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-lg font-medium mb-2" style={{ color: '#cdd6f4' }}>
              Check your email
            </h2>
            <p className="text-sm" style={{ color: '#6c7086' }}>
              We sent a magic link to <span style={{ color: '#cdd6f4' }}>{email}</span>.
              Click it to sign in — no password needed.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-6 text-sm underline"
              style={{ color: '#6c7086' }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          /* Login form */
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#cdd6f4' }}
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 rounded-lg text-sm border outline-none transition-colors"
                style={{
                  backgroundColor: '#1e1e2e',
                  borderColor: '#313244',
                  color: '#cdd6f4',
                }}
                onFocus={(e) => e.target.style.borderColor = '#89b4fa'}
                onBlur={(e) => e.target.style.borderColor = '#313244'}
              />
            </div>

            {error && (
              <p className="text-sm" style={{ color: '#DB4437' }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
              style={{ backgroundColor: '#89b4fa', color: '#1e1e2e' }}
            >
              {loading ? 'Sending...' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
