import { useEnergyLevels } from '../../contexts/EnergyLevelsContext'

export default function EnergyBadge({ energyLevel, className = '' }) {
  const { levelMap } = useEnergyLevels()
  const def = levelMap[energyLevel]
  if (!def) return null

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
      style={{ backgroundColor: def.bg_color, color: def.text_color }}
    >
      {def.label}
    </span>
  )
}
