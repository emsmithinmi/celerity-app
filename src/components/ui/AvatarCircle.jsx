import { useRef, useState } from 'react'
import { Camera } from 'lucide-react'

const SIZES = {
  sm: { px: 32, fontSize: '11px', iconSize: 11 },
  md: { px: 48, fontSize: '15px', iconSize: 14 },
  lg: { px: 72, fontSize: '22px', iconSize: 18 },
}

function initials(name) {
  if (!name) return '?'
  if (name.includes('@')) {
    return name.split('@')[0].slice(0, 2).toUpperCase()
  }
  return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

// bgColor: custom background hex (overrides CSS var)
export default function AvatarCircle({ src, name = '', size = 'md', canUpload = false, uploading = false, onFileSelect, bgColor }) {
  const fileRef = useRef(null)
  const [hovered, setHovered] = useState(false)
  const { px, fontSize, iconSize } = SIZES[size] ?? SIZES.md

  return (
    <div
      onClick={() => canUpload && !uploading && fileRef.current?.click()}
      onMouseEnter={() => canUpload && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-full overflow-hidden shrink-0 flex items-center justify-center select-none"
      style={{
        width: px,
        height: px,
        minWidth: px,
        backgroundColor: bgColor ?? 'var(--border)',
        cursor: canUpload && !uploading ? 'pointer' : 'default',
      }}
    >
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span style={{ fontSize, color: 'var(--accent)', fontWeight: 600, lineHeight: 1 }}>
          {initials(name)}
        </span>
      )}

      {/* Hover overlay */}
      {canUpload && !uploading && hovered && (
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--avatar-overlay)' }}
        >
          <Camera size={iconSize} color="var(--text-primary)" />
        </div>
      )}

      {/* Upload spinner */}
      {uploading && (
        <div
          className="absolute inset-0 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--avatar-overlay)' }}
        >
          <div
            className="animate-spin rounded-full border-2"
            style={{
              width: iconSize + 4,
              height: iconSize + 4,
              borderColor: 'var(--text-dim)',
              borderTopColor: 'var(--accent)',
            }}
          />
        </div>
      )}

      {canUpload && (
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onFileSelect?.(file)
            e.target.value = ''
          }}
        />
      )}
    </div>
  )
}
