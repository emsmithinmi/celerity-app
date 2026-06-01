import { useState } from 'react'
import Button from '../ui/Button'

const TOPIC_COLORS = {
  python:  { bg: 'var(--challenge-python-bg)', text: 'var(--accent)', label: 'Python'  },
  ai:      { bg: 'var(--state-purple-bg)', text: 'var(--accent-purple)', label: 'AI'      },
  llm:     { bg: 'var(--challenge-llm-bg)', text: 'var(--accent-teal)', label: 'LLM'     },
  general: { bg: 'var(--challenge-general-bg)', text: 'var(--accent-yellow)', label: 'General' },
}

const DIFFICULTY_COLORS = {
  beginner:     { text: 'var(--habit-done-bg)' },
  intermediate: { text: 'var(--state-warning-text)' },
  advanced:     { text: 'var(--danger)' },
}

export default function ChallengeSection({ challenge, onUpdate, onComplete }) {
  const [open,      setOpen]      = useState(false)
  const [response,  setResponse]  = useState(challenge?.user_response ?? '')
  const [saving,    setSaving]    = useState(false)
  const [submitted, setSubmitted] = useState(!!challenge?.completed)

  // Collapsed header — always visible, quiet
  const topic      = challenge ? (TOPIC_COLORS[challenge.topic] ?? TOPIC_COLORS.general) : null
  const difficulty = challenge ? (DIFFICULTY_COLORS[challenge.difficulty] ?? DIFFICULTY_COLORS.beginner) : null

  const handleSubmit = async () => {
    if (!response.trim()) return
    setSaving(true)
    await onUpdate({ ...challenge, user_response: response, completed: true })
    onComplete?.()
    setSubmitted(true)
    setSaving(false)
  }

  const handleSkip = async () => {
    await onUpdate({ ...challenge, skipped: true })
    setSubmitted(true)
  }

  return (
    <div>
      {/* Always-visible collapsed row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-3 w-full text-left"
      >
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>Challenge</h3>
        {challenge && topic && (
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: topic.bg, color: topic.text }}
          >
            {topic.label}
          </span>
        )}
        {challenge && difficulty && (
          <span className="text-xs font-medium capitalize" style={{ color: difficulty.text }}>
            {challenge.difficulty}
          </span>
        )}
        {submitted && (
          <span className="text-xs" style={{ color: 'var(--habit-done-bg)' }}>✓ done</span>
        )}
        {!challenge && (
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>none yet</span>
        )}
        <span className="ml-auto text-xs" style={{ color: 'var(--text-secondary)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Expandable body */}
      {open && (
        <div
          className="mt-3 rounded-xl border overflow-hidden"
          style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
        >
          {!challenge ? (
            <p className="px-4 py-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
              No challenge yet — run the Daily Review to generate one.
            </p>
          ) : (
            <>
              {/* Prompt */}
              <div className="px-4 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {challenge.prompt}
                </p>
                {challenge.hint && (
                  <p className="text-xs mt-3 italic" style={{ color: 'var(--text-secondary)' }}>
                    💡 {challenge.hint}
                  </p>
                )}
              </div>

              {/* Previous feedback, if any */}
              {challenge.ai_feedback && (
                <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--state-info-bg)' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Feedback from last review</p>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>{challenge.ai_feedback}</p>
                </div>
              )}

              {/* Response area or done state */}
              {submitted ? (
                <div className="px-4 py-4">
                  {challenge.user_response && (
                    <>
                      <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>Your answer</p>
                      <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-mid)' }}>
                        {challenge.user_response}
                      </pre>
                    </>
                  )}
                  {!challenge.ai_feedback && (
                    <p className="text-xs mt-3" style={{ color: 'var(--text-secondary)' }}>
                      Feedback will appear after your next Daily Review.
                    </p>
                  )}
                </div>
              ) : (
                <div className="px-4 py-4 space-y-3">
                  <textarea
                    value={response}
                    onChange={e => setResponse(e.target.value)}
                    placeholder="Paste your solution here…"
                    rows={6}
                    className="w-full bg-transparent text-sm outline-none resize-none font-mono border rounded-lg px-3 py-2"
                    style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="primary" onClick={handleSubmit} disabled={!response.trim() || saving}>
                      {saving ? 'Saving…' : 'Submit'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleSkip}>
                      Skip
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
