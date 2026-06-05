import { useState } from 'react'
import { supabase } from '../lib/supabase'

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.548 0 9s.348 2.825.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
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

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/gmail.modify',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) {
      setError(error.message)
      setGoogleLoading(false)
    }
    // On success, browser redirects — no need to setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--app-bg)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 border"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {/* Logo / Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            Focus Flow
          </h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Your GTD command center
          </p>
        </div>

        {sent ? (
          /* Success state */
          <div className="text-center">
            <div className="text-4xl mb-4">📬</div>
            <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Check your email
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              We sent a magic link to <span style={{ color: 'var(--text-primary)' }}>{email}</span>.
              Click it to sign in — no password needed.
            </p>
            <button
              onClick={() => { setSent(false); setEmail('') }}
              className="mt-6 text-sm underline"
              style={{ color: 'var(--text-secondary)' }}
            >
              Use a different email
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={googleLoading}
              className="w-full py-2.5 rounded-lg text-sm font-medium border transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              style={{
                backgroundColor: 'var(--app-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-primary)',
              }}
            >
              <GoogleIcon />
              {googleLoading ? 'Redirecting...' : 'Continue with Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>or</span>
              <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border)' }} />
            </div>

            {/* Magic link form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: 'var(--text-primary)' }}
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
                    backgroundColor: 'var(--app-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {error && (
                <p className="text-sm" style={{ color: 'var(--danger)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: 'var(--app-bg)' }}
              >
                {loading ? 'Sending...' : 'Send magic link'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
