import { useState, useEffect } from 'react'
import Modal from './Modal'
import Button from './Button'

function displayName(p) {
  const first = p.preferred_name ?? p.first_name
  return [first, p.last_name].filter(Boolean).join(' ')
}

export default function MentionDisambiguationModal({ open, mentions, onResolve, onClose }) {
  const [choices, setChoices] = useState({})

  useEffect(() => { if (open) setChoices({}) }, [open])

  if (!mentions?.length) return null

  const pick = (word, value) => setChoices(prev => ({ ...prev, [word]: value }))

  const handleConfirm = () => {
    const selected = []
    for (const { word, matches } of mentions) {
      const choice = choices[word]
      if (choice && choice !== 'skip') {
        const person = matches.find(p => p.id === choice)
        if (person) selected.push(person)
      }
    }
    onResolve(selected)
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Ambiguous mentions"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Skip all</Button>
          <Button variant="primary" onClick={handleConfirm}>Link selected</Button>
        </>
      }
    >
      <div className="space-y-6">
        {mentions.map(({ word, matches }) => (
          <div key={word}>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Who did you mean by{' '}
              <span style={{ color: 'var(--accent)' }}>@{word}</span>?
            </p>
            <div className="space-y-1.5">
              {matches.map(p => (
                <div
                  key={p.id}
                  onClick={() => pick(word, p.id)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition-colors"
                  style={{
                    borderColor: choices[word] === p.id ? 'var(--accent)' : 'var(--border)',
                    backgroundColor: choices[word] === p.id ? 'var(--nav-active-bg)' : 'transparent',
                  }}
                >
                  <span className="text-sm flex-1" style={{ color: 'var(--text-primary)' }}>{displayName(p)}</span>
                  {(p.relationship || p.occupation) && (
                    <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {p.relationship ?? p.occupation}
                    </span>
                  )}
                </div>
              ))}
              <div
                onClick={() => pick(word, 'skip')}
                className="flex items-center px-3 py-1.5 rounded-lg border cursor-pointer"
                style={{
                  borderColor: choices[word] === 'skip' ? 'var(--accent)' : 'var(--border)',
                  backgroundColor: choices[word] === 'skip' ? 'var(--nav-active-bg)' : 'transparent',
                }}
              >
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Skip</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}
