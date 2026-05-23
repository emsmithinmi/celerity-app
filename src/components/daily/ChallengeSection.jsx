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

export default function ChallengeSection({ challenge, onUpdate }) {
  const [response, setResponse] = useState(challenge?.user_response ?? '')
  const [saving, setSaving]     = useState(false)
  const [submitted, setSubmitted] = useState(!!challenge?.completed)

  if (!challenge) {
    return (
      <div>
        <h3 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>
          Daily Challenge
        </h3>
        <div
          className="rounded-xl border px-4 py-6 text-center"
          style={{ backgroundColor: '#181825', borderColor: '#313244' }}
        >
          <p className="text-sm" style={{ color: '#6c7086' }}>
            No challenge yet — run the Daily Review to generate one.
          </p>
        </div>
      </div>
    )
  }

  const topic      = TOPIC_COLORS[challenge.topic]     ?? TOPIC_COLORS.general
  const difficulty = DIFFICULTY_COLORS[challenge.difficulty] ?? DIFFICULTY_COLORS.beginner

  const handleSubmit = async () => {
    if (!response.trim()) return
    setSaving(true)
    await onUpdate({ ...challenge, user_response: response, completed: true })
    setSubmitted(true)
    setSaving(false)
  }

  const handleSkip = async () => {
    await onUpdate({ ...challenge, completed: false, skipped: true })
    setSubmitted(true)
  }

  return (
    <div>
      <h3 className="text-base font-semibold mb-3" style={{ color: '#cdd6f4' }}>
        Daily Challenge
      </h3>

      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: '#181825', borderColor: '#313244' }}
      >
        {/* Header badges */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: '#313244' }}
        >
          <span
            className="px-2 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: topic.bg, color: topic.text }}
          >
            {topic.label}
          </span>
          <span
            className="text-xs font-medium capitalize"
            style={{ color: difficulty.text }}
          >
            {challenge.difficulty}
          </span>
        </div>

        {/* Prompt */}
        <div className="px-4 py-4 border-b" style={{ borderColor: '#313244' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#cdd6f4' }}>
            {challenge.prompt}
          </p>
        </div>

        {/* Response area or feedback */}
        {submitted ? (
          <div className="px-4 py-4">
            {challenge.ai_feedback ? (
              <>
                <p className="text-xs font-medium mb-2" style={{ color: '#6c7086' }}>AI Feedback</p>
                <p className="text-sm leading-relaxed" style={{ color: '#cdd6f4' }}>
                  {challenge.ai_feedback}
                </p>
              </>
            ) : (
              <p className="text-sm" style={{ color: '#6c7086' }}>
                ✓ Response submitted. Feedback will appear after the next review.
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
                {saving ? 'Saving…' : 'Submit Solution'}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleSkip}>
                Skip
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
