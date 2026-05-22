import { THEME } from '../../lib/constants'

export default function ContextTag({ label }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{
        backgroundColor: THEME.contextTag.bg,
        color: THEME.contextTag.text,
      }}
    >
      @{label}
    </span>
  )
}
