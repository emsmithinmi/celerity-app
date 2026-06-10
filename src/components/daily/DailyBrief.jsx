import { useState, useEffect } from 'react'
import { RefreshCw, Cloud, Sun, CloudRain, CloudSnow, Wind } from 'lucide-react'
import Button from '../ui/Button'
import { PencilBtn } from '../ui'

// ─── Weather ──────────────────────────────────────────────────────────────────

const WMO_CODES = {
  0: { label: 'Clear',         Icon: Sun },
  1: { label: 'Mostly clear',  Icon: Sun },
  2: { label: 'Partly cloudy', Icon: Cloud },
  3: { label: 'Overcast',      Icon: Cloud },
  45: { label: 'Foggy',        Icon: Cloud },
  48: { label: 'Icy fog',      Icon: Cloud },
  51: { label: 'Light drizzle',Icon: CloudRain },
  61: { label: 'Light rain',   Icon: CloudRain },
  63: { label: 'Rain',         Icon: CloudRain },
  65: { label: 'Heavy rain',   Icon: CloudRain },
  71: { label: 'Light snow',   Icon: CloudSnow },
  73: { label: 'Snow',         Icon: CloudSnow },
  75: { label: 'Heavy snow',   Icon: CloudSnow },
  80: { label: 'Rain showers', Icon: CloudRain },
  95: { label: 'Thunderstorm', Icon: CloudRain },
}

function getWeatherInfo(code) {
  return WMO_CODES[code] ?? { label: 'Unknown', Icon: Wind }
}

function WeatherWidget() {
  const [weather, setWeather] = useState(null)

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lon } = coords
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weathercode&temperature_unit=fahrenheit&timezone=auto`
        )
          .then(r => r.json())
          .then(d => {
            const temp = Math.round(d.current?.temperature_2m)
            const code = d.current?.weathercode
            setWeather({ temp, ...getWeatherInfo(code) })
          })
          .catch(() => {})
      },
      () => {} // silently skip if location denied
    )
  }, [])

  if (!weather) return null

  const { temp, label, Icon } = weather
  return (
    <div className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
      <Icon size={14} />
      <span>{temp}°F · {label}</span>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DailyBrief({ brief, topOfMind = [], noteId, onRefresh, onSaveTopOfMind }) {
  const [loading,    setLoading]    = useState(false)
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
        <div className="flex items-center gap-3">
          <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Daily Brief
          </h3>
          <WeatherWidget />
        </div>
        <div className="flex items-center gap-2">
          <PencilBtn onClick={() => { setTomDraft([...topOfMind]); setEditingTom(true) }} title="Edit Top of Mind inputs" />
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center justify-center rounded-md transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ width: 26, height: 26, color: 'var(--accent)', backgroundColor: 'transparent' }}
            title="Refresh brief with AI"
          >
            <RefreshCw size={13} style={{ animation: loading ? 'spin 0.7s linear infinite' : 'none' }} />
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

            {/* Top of Mind */}
            {brief.top_of_mind?.length > 0 && (
              <div className="px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--text-secondary)' }}>
                  🧠 Top of Mind
                </p>
                <ul className="space-y-1.5">
                  {brief.top_of_mind.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                      <span className="mt-0.5 shrink-0" style={{ color: 'var(--text-secondary)' }}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
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
