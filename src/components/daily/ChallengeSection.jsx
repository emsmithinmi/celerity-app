import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import Button from '../ui/Button'
import { pickRandomChallenge, deleteChallenge } from '../../lib/api/challenges'

const toSnapshot = (c) => ({
  id: c.id,
  prompt: c.prompt,
  answer: c.answer,
  difficulty: c.difficulty ?? 'easy',
  completed: false,
})

// A pinned snapshot is only usable if it carries the new shape (prompt + answer).
// Older AI-era code_challenge blobs are treated as stale and replaced.
const isValidSnapshot = (c) => !!(c && c.prompt && c.answer)

export default function ChallengeSection({ challenge, onUpdate, onComplete }) {
  const [current,   setCurrent]   = useState(isValidSnapshot(challenge) ? challenge : null)
  const [revealed,  setRevealed]  = useState(false)
  const [bankEmpty, setBankEmpty] = useState(false)
  const [working,   setWorking]   = useState(false)
  const initRef = useRef(false)

  // Pin a challenge to today on first mount if none is set yet.
  useEffect(() => {
    if (initRef.current) return
    initRef.current = true
    if (current) return // already have today's (pinned snapshot)
    ;(async () => {
      try {
        const picked = await pickRandomChallenge()
        if (picked) {
          const snap = toSnapshot(picked)
          setCurrent(snap)
          onUpdate(snap)
        } else {
          setBankEmpty(true)
        }
      } catch { /* leave empty */ }
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSkip = async () => {
    setWorking(true)
    try {
      const picked = await pickRandomChallenge(current?.id)
      if (picked) {
        const snap = toSnapshot(picked)
        setCurrent(snap)
        setRevealed(false)
        onUpdate(snap)
      }
    } finally {
      setWorking(false)
    }
  }

  const handleComplete = async () => {
    if (!current) return
    setWorking(true)
    try {
      if (current.id) await deleteChallenge(current.id).catch(() => {}) // one and done
      const done = { ...current, completed: true }
      setCurrent(done)
      onUpdate(done)
      onComplete?.() // marks the Code Challenge habit for today
    } finally {
      setWorking(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 w-full mb-3">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Challenge</h3>
        {current && (
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: 'var(--challenge-python-bg)', color: 'var(--accent)' }}
          >
            Python
          </span>
        )}
        {current?.completed && (
          <span className="text-xs inline-flex items-center gap-1" style={{ color: 'var(--habit-done-bg)' }}><Check size={12} strokeWidth={3} /> done</span>
        )}
      </div>

      {/* Body */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {!current ? (
          <p className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {bankEmpty
              ? "You've cleared the whole bank! Run the refresh-challenges skill to load 25 more."
              : 'Loading a challenge…'}
          </p>
        ) : (
          <>
            {/* Prompt */}
            <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                {current.prompt}
              </p>
              <p className="text-xs mt-3" style={{ color: 'var(--text-dim)' }}>
                Solve it in your editor, then mark it complete.
              </p>
            </div>

            {/* Reveal answer */}
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)' }}>
              <button
                onClick={() => setRevealed(r => !r)}
                className="text-xs font-medium transition-opacity hover:opacity-80 inline-flex items-center gap-1"
                style={{ color: 'var(--accent)' }}
              >
                {revealed ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                {revealed ? 'Hide answer' : 'Reveal answer'}
              </button>
              {revealed && (
                <pre
                  className="mt-3 text-sm font-mono leading-relaxed whitespace-pre-wrap rounded-lg px-3 py-2"
                  style={{ color: 'var(--text-mid)', backgroundColor: 'var(--app-bg)' }}
                >
                  {current.answer}
                </pre>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-4">
              {current.completed ? (
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Nice work — done for today. A fresh one rolls in tomorrow.
                </p>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="success" onClick={handleComplete} disabled={working}>
                    {working ? '…' : 'Mark Complete'}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleSkip} disabled={working}>
                    Skip
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
