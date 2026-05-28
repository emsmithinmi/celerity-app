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
    bg: '#89b4fa',
    text: '#1e1e2e',
    hover: '#7aa2f7',
    border: 'transparent',
  },
  secondary: {
    bg: 'transparent',
    text: '#cdd6f4',
    hover: '#313244',
    border: '#313244',
  },
  ghost: {
    bg: 'transparent',
    text: '#6c7086',
    hover: '#313244',
    border: 'transparent',
  },
  danger: {
    bg: '#DB4437',
    text: '#ffffff',
    hover: '#c53929',
    border: 'transparent',
  },
  success: {
    bg: '#0F9D58',
    text: '#000000',
    hover: '#0b7a42',
    border: 'transparent',
  },
  action: {
    bg: '#313244',
    text: '#cdd6f4',
    hover: '#414255',
    border: '#414255',
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
