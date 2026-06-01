import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Pin, PinOff } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AvatarCircle from '../ui/AvatarCircle'
import { uploadUserAvatar } from '../../lib/api/user'

const NAV_ITEMS = [
  { to: '/daily',    label: 'Daily',    icon: '📅' },
  { to: '/tasks',    label: 'Tasks',    icon: '⚡' },
  { to: '/projects', label: 'Projects', icon: '🗂' },
  { to: '/people',   label: 'People',   icon: '👥' },
  { to: '/habits',   label: 'Habits',   icon: '🎯' },
  { to: '/reviews',  label: 'Reviews',  icon: '🔍' },
]

const BOTTOM_NAV = [
  { to: '/settings', label: 'Settings', icon: '⚙️' },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const [locked, setLocked] = useState(() => localStorage.getItem('sidebar-locked') !== 'false')
  const [hovered, setHovered] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const expanded = locked || hovered
  const overlaying = !locked && hovered

  function toggleLock() {
    setLocked(l => {
      const next = !l
      localStorage.setItem('sidebar-locked', String(next))
      if (!next) setHovered(false)
      return next
    })
  }

  const handleUserAvatarUpload = async (file) => {
    if (!user) return
    setAvatarUploading(true)
    try {
      await uploadUserAvatar(user.id, file)
    } catch (err) {
      console.error('Avatar upload failed:', err)
    } finally {
      setAvatarUploading(false)
    }
  }

  const navItemClass = ({ isActive }) =>
    `flex items-center rounded-lg text-sm transition-colors ${
      expanded ? 'gap-3' : 'justify-center'
    } ${isActive ? 'font-medium' : 'hover:opacity-80'}`

  const navItemStyle = ({ isActive }) => ({
    backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
    color: isActive ? 'var(--nav-active-text)' : 'var(--nav-idle-text)',
    padding: expanded ? '8px 12px' : '8px',
  })

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--app-bg)' }}>

      {/* Sidebar wrapper — always holds its slice of the flex layout */}
      <div
        className="relative shrink-0 h-full"
        style={{ width: locked ? '224px' : '56px' }}
        onMouseEnter={() => !locked && setHovered(true)}
        onMouseLeave={() => !locked && setHovered(false)}
      >
        <aside
          className="absolute inset-y-0 left-0 flex flex-col border-r overflow-hidden"
          style={{
            width: expanded ? '224px' : '56px',
            backgroundColor: 'var(--pane-bg)',
            borderColor: 'var(--border)',
            zIndex: overlaying ? 50 : 1,
            boxShadow: overlaying ? '6px 0 24px rgba(0,0,0,0.4)' : 'none',
            transition: 'width 200ms ease, box-shadow 200ms ease',
          }}
        >
          {/* User + lock toggle */}
          <div
            className="flex items-center border-b shrink-0"
            style={{
              borderColor: 'var(--border)',
              padding: expanded ? '12px 16px' : '12px 8px',
              justifyContent: expanded ? 'space-between' : 'center',
              gap: '8px',
              transition: 'padding 200ms ease',
            }}
          >
            {user && (
              <div className={`flex items-center min-w-0 ${expanded ? 'flex-1 gap-2' : ''}`}>
                <AvatarCircle
                  src={user.user_metadata?.avatar_url}
                  name={user.email ?? ''}
                  size="sm"
                  canUpload
                  uploading={avatarUploading}
                  onFileSelect={handleUserAvatarUpload}
                />
                {expanded && (
                  <p
                    className="text-xs truncate flex-1"
                    style={{ color: 'var(--text-secondary)' }}
                    title={user.email}
                  >
                    {user.email}
                  </p>
                )}
              </div>
            )}
            <button
              onClick={toggleLock}
              className="flex items-center justify-center rounded-lg transition-colors hover:opacity-80 shrink-0"
              style={{ color: 'var(--btn-muted-text)', backgroundColor: 'var(--btn-muted-bg)', width: '28px', height: '28px' }}
              title={locked ? 'Unpin sidebar' : 'Pin sidebar open'}
            >
              {locked ? <Pin size={13} /> : <PinOff size={13} />}
            </button>
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto" style={{ padding: expanded ? '16px 12px' : '16px 8px' }}>
            <div className="space-y-1">
              {NAV_ITEMS.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={!expanded ? label : undefined}
                  className={navItemClass}
                  style={navItemStyle}
                >
                  <span>{icon}</span>
                  {expanded && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Bottom nav */}
          <div
            className="border-t pb-1"
            style={{ borderColor: 'var(--border)', padding: expanded ? '8px 12px 4px' : '8px 8px 4px' }}
          >
            {BOTTOM_NAV.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                title={!expanded ? label : undefined}
                className={navItemClass}
                style={navItemStyle}
              >
                <span>{icon}</span>
                {expanded && <span>{label}</span>}
              </NavLink>
            ))}
          </div>

          {/* App name + Sign out */}
          <div
            className="border-t"
            style={{ borderColor: 'var(--border)', padding: expanded ? '12px 16px' : '12px 8px' }}
          >
            {expanded && (
              <p className="text-xs font-semibold mb-2 px-1" style={{ color: 'var(--text-secondary)' }}>
                Celerity
              </p>
            )}
            <button
              onClick={signOut}
              className="w-full rounded-md text-xs transition-colors hover:opacity-80"
              style={{
                color: 'var(--btn-muted-text)',
                backgroundColor: 'var(--btn-muted-bg)',
                padding: expanded ? '6px 8px' : '6px',
                textAlign: expanded ? 'left' : 'center',
              }}
              title={!expanded ? 'Sign out' : undefined}
            >
              {expanded ? 'Sign out' : '→'}
            </button>
          </div>
        </aside>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
