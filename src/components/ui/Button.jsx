const VARIANTS = {
  primary:   'bg-app-highlight text-white hover:bg-purple-700 active:bg-purple-800',
  secondary: 'bg-app-pane text-app-text border border-app-border hover:bg-white/5 active:bg-white/10',
  danger:    'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  ghost:     'text-app-muted hover:text-app-text hover:bg-white/5 active:bg-white/10',
}

const SIZES = {
  sm: 'px-3 py-1.5 text-xs rounded-md',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-sm rounded-lg',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  icon,
  ...props
}) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 font-medium
        transition-colors focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-app-highlight focus-visible:ring-offset-2
        focus-visible:ring-offset-app-bg
        disabled:opacity-50 disabled:cursor-not-allowed
        ${VARIANTS[variant]} ${SIZES[size]} ${className}
      `}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
