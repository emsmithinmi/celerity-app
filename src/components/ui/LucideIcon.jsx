import * as Icons from 'lucide-react'

// Renders any Lucide icon by name. Falls back to null when the name is
// missing or unknown so misconfigured rows just show nothing instead of
// crashing the badge.
export default function LucideIcon({ name, size = 14, strokeWidth = 2, className, style }) {
  if (!name) return null
  const Icon = Icons[name]
  if (!Icon) return null
  return <Icon size={size} strokeWidth={strokeWidth} className={className} style={style} />
}
