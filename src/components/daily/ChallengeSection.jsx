import { useState } from 'react'
import Button from '../ui/Button'

const TOPIC_COLORS = {
  python:  { bg: '#1e2d3d', text: '#89b4fa', label: 'Python'  },
  ai:      { bg: '#2d1e2d', text: '#cba6f7', label: 'AI'      },
  llm:     { bg: '#1e2d2d', text: '#94e2d5', label: 'LLM'     },
  general: { bg: '#2d2d1e', text: '#f9e2af', label: 'General' },
}

const DIFFICULTY_COLORS = {
  beginner:     { text: '#0F9D58' },
  intermediate: { text: '#FBBC05' },
  advanced:     { text: '#DB4437' },
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
        <h3 className="text-base font-semibold" style={{ color: '#cdd6f4' }}>Challenge</h3>
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
          <span className="text-xs" style={{ color: '#0F9D58' }}>✓ done</span>
        )}
        {!challenge && (
          <span className="text-xs" style={{ color: '#6c7086' }}>none yet</span>
        )}
        <span className="ml-auto text-xs" style={{ color: '#6c7086' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* Expandable body */}
      {open && (
        <div
          className="mt-3 rounded-xl border overflow-hidden"
          style={{ backgroundColor: '#181825', borderColor: '#313244' }}
        >
          {!challenge ? (
            <p className="px-4 py-4 text-sm" style={{ color: '#6c7086' }}>
              No challenge yet — run the Daily Review to generate one.
            </p>
          ) : (
            <>
              {/* Prompt */}
              <div className="px-4 py-4 border-b" style={{ borderColor: '#313244' }}>
                <p className="text-sm leading-relaxed" style={{ color: '#cdd6f4' }}>
                  {challenge.prompt}
                </p>
                {challenge.hint && (
                  <p className="text-xs mt-3 italic" style={{ color: '#6c7086' }}>
                    💡 {challenge.hint}
                  </p>
                )}
              </div>

              {/* Previous feedback, if any */}
              {challenge.ai_feedback && (
                <div className="px-4 py-3 border-b" style={{ borderColor: '#313244', backgroundColor: '#1a1f2e' }}>
                  <p className="text-xs font-medium mb-1" style={{ color: '#6c7086' }}>Feedback from last review</p>
                  <p className="text-sm leading-relaxed" style={{ color: '#cdd6f4' }}>{challenge.ai_feedback}</p>
                </div>
              )}

              {/* Response area or done state */}
              {submitted ? (
                <div className="px-4 py-4">
                  {challenge.user_response && (
                    <>
                      <p className="text-xs font-medium mb-2" style={{ color: '#6c7086' }}>Your answer</p>
                      <pre className="text-sm font-mono leading-relaxed whitespace-pre-wrap" style={{ color: '#a6adc8' }}>
                        {challenge.user_response}
                      </pre>
                    </>
                  )}
                  {!challenge.ai_feedback && (
                    <p className="text-xs mt-3" style={{ color: '#6c7086' }}>
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
                    style={{ color: '#cdd6f4', borderColor: '#313244' }}
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
