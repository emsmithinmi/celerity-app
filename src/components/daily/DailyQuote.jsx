import { useState } from 'react'
import { SkipForward } from 'lucide-react'
import { updateQuote } from '../../lib/api/daily'
import { pickRandom } from '../../lib/quotes'

function getDayOfYear(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d - start) / (1000 * 60 * 60 * 24))
}

// Fallback pool for days before the AI has run — cycles deterministically
import { QUOTE_POOL } from '../../lib/quotes'
function getFallbackQuote(dateStr) {
  return QUOTE_POOL[getDayOfYear(dateStr) % QUOTE_POOL.length]
}

export default function DailyQuote({ note, dateStr }) {
  const [local, setLocal] = useState(null) // override set by skip

  const dbQuote = note?.quote ? { text: note.quote, author: note.quote_author ?? '' } : null
  const active  = local ?? dbQuote ?? getFallbackQuote(dateStr)

  async function handleSkip() {
    const next = pickRandom(active.text)
    setLocal(next)
    if (note?.id) {
      try {
        await updateQuote(note.id, next.text, next.author)
      } catch {
        // silently swallow — local state is already updated
      }
    }
  }

  return (
    <div className="text-center px-6 py-2 relative group">
      <p className="text-lg font-light italic leading-relaxed" style={{ color: 'var(--text-mid)' }}>
        &ldquo;{active.text}&rdquo;
      </p>
      <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
        &mdash; {active.author}
      </p>

      <button
        onClick={handleSkip}
        title="Skip this quote"
        className="absolute right-0 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
      >
        <SkipForward size={13} />
        skip
      </button>
    </div>
  )
}
