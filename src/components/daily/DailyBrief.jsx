import { useState } from 'react'
import Button from '../ui/Button'
import { PencilBtn } from '../ui'

// Section with label + bullet list
function BriefSection({ label, items }) {
  if (!items?.length) return null
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </p>
      <ul className="space-y-1">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
            <span className="mt-0.5 shrink-0" style={{ color: 'var(--text-secondary)' }}>•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DailyBrief({ brief, topOfMind = [], noteId, onRefresh, onSaveTopOfMind }) {
  const [loading,  setLoading]  = useState(false)
  const [editingTom, setEditingTom] = useState(false)
  const [tomDraft,   setTomDraft]   = useState(topOfMind)

  const handleRefresh = async () => {
    setLoading(true)
    try { await onRefresh() } finally { setLoading(false) }
  }

  const handleSaveTom = async () => {
    const cleaned = tomDraft.map(s => s.trim()).filter(Boolean)
    await onSaveTopOfMind(cleaned)
    setEditingTom(false)
  }

  const updateTomItem = (i, val) => setTomDraft(prev => prev.map((v, idx) => idx === i ? val : v))
  const addTomItem    = ()       => setTomDraft(prev => [...prev, ''])
  const removeTomItem = (i)      => setTomDraft(prev => prev.filter((_, idx) => idx !== i))

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Daily Brief
        </h3>
        <div className="flex items-center gap-2">
          <PencilBtn onClick={() => { setTomDraft([...topOfMind]); setEditingTom(true) }} title="Edit Top of Mind inputs" />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="text-xs px-2 py-1 rounded-md border transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ color: 'var(--accent)', borderColor: 'var(--accent)', backgroundColor: 'transparent' }}
            title="Refresh brief with AI"
          >
            {loading ? '⏳ Thinking…' : '✨ Refresh'}
          </button>
        </div>
      </div>

      {/* Top of Mind editor (inline, collapsible) */}
      {editingTom && (
        <div
          className="mb-3 rounded-xl border px-4 py-3"
          style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--accent)' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--accent)' }}>
            Your Top of Mind (feeds into brief)
          </p>
          <div className="space-y-2">
            {tomDraft.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span style={{ color: 'var(--text-secondary)' }}>•</span>
                <input
                  type="text"
                  value={item}
                  onChange={e => updateTomItem(i, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') addTomItem()
                    if (e.key === 'Backspace' && item === '' && tomDraft.length > 1) {
                      e.preventDefault()
                      removeTomItem(i)
                    }
                  }}
                  autoFocus={i === tomDraft.length - 1}
                  className="flex-1 bg-transparent text-sm outline-none border-b"
                  style={{ color: 'var(--text-primary)', borderColor: 'var(--border)' }}
                  placeholder="What's on your mind..."
                />
                <button onClick={() => removeTomItem(i)} style={{ color: 'var(--text-secondary)' }} className="hover:opacity-70 text-sm">×</button>
              </div>
            ))}
            <button onClick={addTomItem} className="text-xs mt-1 hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
              + Add item
            </button>
          </div>
          <div className="flex gap-2 mt-3 pt-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <Button size="sm" variant="primary" onClick={handleSaveTom}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingTom(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Brief card */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ backgroundColor: 'var(--pane-bg)', borderColor: 'var(--border)' }}
      >
        {!brief ? (
          <div className="px-4 py-6 text-center space-y-3">
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              No brief yet — run your Daily Review to generate one, or hit Refresh to generate one now.
            </p>
            <Button size="sm" variant="action" onClick={handleRefresh} disabled={loading}>
              {loading ? '⏳ Generating…' : '✨ Generate Brief'}
            </Button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {/* Greeting */}
            {brief.greeting && (
              <div className="px-4 py-3">
                <p className="text-sm leading-relaxed italic" style={{ color: 'var(--accent)' }}>
                  {brief.greeting}
                </p>
              </div>
            )}

            {/* Three content sections */}
            {(brief.top_of_mind?.length > 0 || brief.remember?.length > 0 || brief.to_do?.length > 0) && (
              <div className="px-4 py-4 grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <BriefSection label="🧠 Top of Mind" items={brief.top_of_mind} />
                <BriefSection label="📌 Remember"    items={brief.remember} />
                <BriefSection label="✅ To Do"       items={brief.to_do} />
              </div>
            )}

            {/* Words for the day */}
            {brief.words_for_the_day && (
              <div className="px-4 py-3" style={{ backgroundColor: 'var(--state-info-bg)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-secondary)' }}>
                  Words for the Day
                </p>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-primary)' }}>
                  {brief.words_for_the_day}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
