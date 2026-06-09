/**
 * ActionBtn — compact outlined/chip-style button for use inside list rows.
 * Distinct from Button (which is solid-fill). ActionBtn is outlined by default,
 * fills with its border color on hover.
 *
 * Variants: success | primary | warning | secondary | ghost | danger
 * Size: px-2 py-1 text-xs — intentionally smaller than Button sm for dense rows.
 */

const VARIANTS = {
  success:   { bg: 'var(--state-success-bg)',  border: 'var(--accent-green)',  text: 'var(--accent-green)'  },
  primary:   { bg: 'var(--card-task-bg)',       border: 'var(--accent)',        text: 'var(--accent)'        },
  warning:   { bg: 'var(--card-reminder-bg)',   border: 'var(--accent-yellow)', text: 'var(--accent-yellow)' },
  secondary: { bg: 'var(--border)',             border: 'var(--text-dim)',      text: 'var(--text-secondary)'},
  ghost:     { bg: 'transparent',               border: 'var(--border)',        text: 'var(--text-secondary)'},
  danger:    { bg: 'var(--state-error-bg)',      border: 'var(--accent-red)',    text: 'var(--accent-red)'    },
}

export default function ActionBtn({ variant = 'ghost', onClick, disabled, title, children }) {
  const s = VARIANTS[variant] ?? VARIANTS.ghost
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="px-2 py-1 rounded text-xs font-medium border transition-colors"
      style={{
        backgroundColor: s.bg,
        borderColor: s.border,
        color: s.text,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.backgroundColor = s.border; e.currentTarget.style.color = 'var(--app-bg)' } }}
      onMouseLeave={e => { if (!disabled) { e.currentTarget.style.backgroundColor = s.bg;     e.currentTarget.style.color = s.text } }}
    >
      {children}
    </button>
  )
}
