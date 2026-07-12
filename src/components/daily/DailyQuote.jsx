import { useState, useEffect, useRef } from 'react'
import { SkipForward, Ban } from 'lucide-react'
import { updateQuote, getRecentQuoteTexts, getBlockedQuoteTexts, blockQuoteText } from '../../lib/api/daily'
import { pickFresh, QUOTE_POOL } from '../../lib/quotes'

function getDayOfYear(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d - start) / (1000 * 60 * 60 * 24))
}

// Deterministic per-day quote — only used for past dates that never had one saved
function getFallbackQuote(dateStr) {
  return QUOTE_POOL[getDayOfYear(dateStr) % QUOTE_POOL.length]
}

async function getExclusions() {
  const [recent, blocked] = await Promise.all([
    getRecentQuoteTexts(30),
    getBlockedQuoteTexts(),
  ])
  return [...recent, ...blocked]
}

export default function DailyQuote({ note, dateStr }) {
  const [local, setLocal] = useState(null) // override set by reroll/skip/block
  const rerolledForNoteRef = useRef(null)  // guards against StrictMode double-fire

  const today = new Date().toLocaleDateString('en-CA')
  const isToday = dateStr === today

  // Once per calendar day: if today's note has no quote yet, pick a fresh one
  // not shown in the last 30 days and not on the blocklist. Once a quote is
  // saved for today it sticks across revisits — re-mounting Main (nav away
  // and back, refresh) no longer draws a new random quote every time. Past
  // dates keep whatever was saved.
  useEffect(() => {
    if (!isToday || !note?.id) return
    if (note.quote) return
    if (rerolledForNoteRef.current === note.id) return
    rerolledForNoteRef.current = note.id
    ;(async () => {
      try {
        const exclude = await getExclusions()
        const next = pickFresh(exclude, note.quote ?? '')
        setLocal(next)
        await updateQuote(note.id, next.text, next.author)
      } catch {
        // silently swallow — the existing quote or fallback will render
      }
    })()
  }, [isToday, note?.id, note?.quote]) // eslint-disable-line react-hooks/exhaustive-deps

  if (dateStr > today) return null

  const dbQuote = note?.quote ? { text: note.quote, author: note.quote_author ?? '' } : null
  const active  = local ?? dbQuote ?? getFallbackQuote(dateStr)

  async function rerollExcluding(currentText) {
    const exclude = await getExclusions()
    const next = pickFresh(exclude, currentText)
    setLocal(next)
    if (note?.id) await updateQuote(note.id, next.text, next.author)
  }

  async function handleSkip() {
    try { await rerollExcluding(active.text) } catch { /* ignore */ }
  }

  async function handleBlock() {
    try {
      await blockQuoteText(active.text)
      await rerollExcluding(active.text)
    } catch { /* ignore */ }
  }

  const iconBtnStyle = {
    color: 'var(--text-secondary)',
  }
  const iconBtnClass = "flex items-center gap-1 px-2 py-1 rounded-lg text-xs transition-colors"

  return (
    <div className="text-center px-6 py-2 relative group">
      <p className="text-lg font-light italic leading-relaxed" style={{ color: 'var(--text-mid)' }}>
        &ldquo;{active.text}&rdquo;
      </p>
      <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
        &mdash; {active.author}
      </p>

      <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleSkip}
          title="Skip this quote"
          className={iconBtnClass}
          style={iconBtnStyle}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <SkipForward size={13} />
          skip
        </button>
        <button
          onClick={handleBlock}
          title="Never show this quote again"
          className={iconBtnClass}
          style={iconBtnStyle}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-secondary)'}
        >
          <Ban size={13} />
          never
        </button>
      </div>
    </div>
  )
}
