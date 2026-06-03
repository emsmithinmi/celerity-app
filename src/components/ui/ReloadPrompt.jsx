import { useRegisterSW } from 'virtual:pwa-register/react'

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border text-sm"
      style={{
        backgroundColor: 'var(--sidebar-bg)',
        borderColor: 'var(--border)',
        color: 'var(--text-primary)',
      }}
    >
      <span style={{ color: 'var(--text-secondary)' }}>New version available</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
        style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
      >
        Update
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        Dismiss
      </button>
    </div>
  )
}
