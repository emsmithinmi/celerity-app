export default function ContextTag({ tag, onRemove, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${className}`}
      style={{ backgroundColor: 'var(--context-tag-bg)', color: 'var(--context-tag-text)' }}
    >
      {tag}
      {onRemove && (
        <button
          onClick={() => onRemove(tag)}
          className="ml-0.5 hover:opacity-70 transition-opacity leading-none"
          aria-label={`Remove ${tag}`}
        >
          ×
        </button>
      )}
    </span>
  )
}

export function ContextTagList({ tags = [], onRemove, className = '' }) {
  if (!tags.length) return null
  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map(tag => (
        <ContextTag key={tag} tag={tag} onRemove={onRemove} />
      ))}
    </div>
  )
}
