export default function QuoteBlock({ quote, author }) {
  if (!quote) return null

  return (
    <div className="text-center py-2">
      <p className="text-sm italic" style={{ color: 'var(--text-primary)' }}>
        &ldquo;{quote}&rdquo;
      </p>
      {author && (
        <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
          — {author}
        </p>
      )}
    </div>
  )
}
