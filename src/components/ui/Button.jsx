/**
 * Button variants:
 *   primary   — blue, main CTA
 *   secondary — subtle outlined
 *   ghost     — transparent, low-key
 *   danger    — red destructive actions
 *   success   — green positive actions
 *   action    — used for workflow action buttons (wider, more prominent)
 *
 * Sizes: sm | md (default) | lg
 */

const VARIANTS = {
  primary: {
    bg: 'var(--accent)',
    text: 'var(--app-bg)',
    hover: 'var(--accent-hover)',
    border: 'transparent',
  },
  secondary: {
    bg: 'transparent',
    text: 'var(--text-primary)',
    hover: 'var(--border)',
    border: 'var(--border)',
  },
  ghost: {
    bg: 'transparent',
    text: 'var(--text-secondary)',
    hover: 'var(--border)',
    border: 'transparent',
  },
  danger: {
    bg: 'var(--danger)',
    text: 'var(--danger-text, #ffffff)',
    hover: 'var(--danger-hover)',
    border: 'transparent',
  },
  success: {
    bg: 'var(--success)',
    text: 'var(--success-text)',
    hover: 'var(--success-hover)',
    border: 'transparent',
  },
  action: {
    bg: 'var(--border)',
    text: 'var(--text-primary)',
    hover: 'var(--surface-2)',
    border: 'var(--surface-2)',
  },
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-lg',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  onClick,
  type = 'button',
  className = '',
  fullWidth = false,
  title,
}) {
  const v = VARIANTS[variant] ?? VARIANTS.primary
  const s = SIZES[size] ?? SIZES.md

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={`
        inline-flex items-center justify-center gap-2 font-medium border
        transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed
        ${s} ${fullWidth ? 'w-full' : ''} ${className}
      `}
      style={{
        backgroundColor: v.bg,
        color: v.text,
        borderColor: v.border,
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.backgroundColor = v.hover }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.backgroundColor = v.bg }}
    >
      {children}
    </button>
  )
}
