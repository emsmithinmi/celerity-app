import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Pin, PinOff, LayoutDashboard, FolderKanban, Zap, Users, Target, Settings, LogOut,
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import AvatarCircle from '../ui/AvatarCircle'
import { uploadUserAvatar } from '../../lib/api/user'

const NAV_ITEMS = [
  { to: '/daily',    label: 'Main', Icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', Icon: FolderKanban },
  { to: '/tasks',    label: 'Tasks',    Icon: Zap          },
  { to: '/people',   label: 'People',   Icon: Users        },
  { to: '/habits',   label: 'Habits',   Icon: Target       },
]

const BOTTOM_NAV = [
  { to: '/settings', label: 'Settings', Icon: Settings },
]

export default function Layout() {
  const { user, signOut } = useAuth()
  const [locked, setLocked] = useState(() => localStorage.getItem('sidebar-locked') !== 'false')
  const [clicked, setClicked] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const expanded = locked || clicked
  const overlaying = !locked && clicked

  function toggleLock() {
    setLocked(l => {
      const next = !l
      localStorage.setItem('sidebar-locked', String(next))
      if (!next) setClicked(false)
      return next
    })
  }

  function toggleClicked() {
    if (!locked) setClicked(v => !v)
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
                <div
                  onClick={toggleClicked}
                  title={!expanded ? 'Expand sidebar' : !locked ? 'Collapse sidebar' : undefined}
                  style={{ cursor: !locked ? 'pointer' : 'default', flexShrink: 0 }}
                >
                  <AvatarCircle
                    src={user.user_metadata?.avatar_url}
                    name={user.email ?? ''}
                    size="sm"
                    canUpload={locked}
                    uploading={avatarUploading}
                    onFileSelect={handleUserAvatarUpload}
                  />
                </div>
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
            {expanded && (
              <button
                onClick={toggleLock}
                className="flex items-center justify-center rounded-lg transition-colors shrink-0"
                style={{ color: 'var(--text-secondary)', backgroundColor: 'transparent', width: '28px', height: '28px' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)' }}
                title={locked ? 'Unpin sidebar' : 'Pin sidebar open'}
              >
                {locked ? <Pin size={13} /> : <PinOff size={13} />}
              </button>
            )}
          </div>

          {/* Nav */}
          <nav className="flex-1 overflow-y-auto" style={{ padding: expanded ? '16px 12px' : '16px 8px' }}>
            <div className="space-y-1">
              {NAV_ITEMS.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={!expanded ? label : undefined}
                  className={navItemClass}
                  style={navItemStyle}
                >
                  <Icon size={16} />
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
            {BOTTOM_NAV.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={!expanded ? label : undefined}
                className={navItemClass}
                style={navItemStyle}
              >
                <Icon size={16} />
                {expanded && <span>{label}</span>}
              </NavLink>
            ))}
          </div>

          {/* App name + Sign out */}
          <div
            className="border-t"
            style={{ borderColor: 'var(--border)', padding: expanded ? '12px 16px' : '12px 8px' }}
          >
            <div
              className="flex items-center mb-2"
              style={{ gap: '8px', justifyContent: expanded ? 'flex-start' : 'center', paddingLeft: expanded ? '4px' : 0 }}
            >
              <img src="/icon.svg" alt="Focus Flow" style={{ width: 24, height: 24, borderRadius: 6, flexShrink: 0 }} />
              {expanded && (
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
                  Focus Flow
                </span>
              )}
            </div>
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
              {expanded ? 'Sign out' : <LogOut size={13} className="mx-auto" />}
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
