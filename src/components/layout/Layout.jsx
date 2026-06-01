import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
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
  const [collapsed, setCollapsed] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

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

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--app-bg)' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0 border-r transition-all duration-200"
        style={{
          backgroundColor: 'var(--pane-bg)',
          borderColor: 'var(--border)',
          width: collapsed ? '56px' : '224px',
          minWidth: collapsed ? '56px' : '224px',
        }}
      >
        {/* User + collapse toggle */}
        <div
          className="flex items-center border-b shrink-0"
          style={{
            borderColor: 'var(--border)',
            padding: collapsed ? '12px 8px' : '12px 16px',
            justifyContent: collapsed ? 'center' : 'space-between',
            gap: '8px',
          }}
        >
          {user && (
            <div className={`flex items-center min-w-0 ${collapsed ? '' : 'flex-1 gap-2'}`}>
              <AvatarCircle
                src={user.user_metadata?.avatar_url}
                name={user.email ?? ''}
                size="sm"
                canUpload
                uploading={avatarUploading}
                onFileSelect={handleUserAvatarUpload}
              />
              {!collapsed && (
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
            onClick={() => setCollapsed(c => !c)}
            className="flex items-center justify-center rounded-lg text-xs transition-colors hover:opacity-80 shrink-0"
            style={{ color: 'var(--btn-muted-text)', backgroundColor: 'var(--btn-muted-bg)', width: '28px', height: '28px' }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Nav */}
        <nav
          className="flex-1 py-4 space-y-1 overflow-y-auto"
          style={{ padding: collapsed ? '16px 8px' : '16px 12px' }}
        >
          {NAV_ITEMS.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-lg text-sm transition-colors ${
                  collapsed ? 'justify-center' : 'gap-3'
                } ${isActive ? 'font-medium' : 'hover:opacity-80'}`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
                color: isActive ? 'var(--nav-active-text)' : 'var(--nav-idle-text)',
                padding: collapsed ? '8px' : '8px 12px',
              })}
            >
              <span>{icon}</span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom nav (Settings, etc.) */}
        <div
          className="border-t pb-1"
          style={{ borderColor: 'var(--border)', padding: collapsed ? '8px 8px 4px' : '8px 12px 4px' }}
        >
          {BOTTOM_NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-lg text-sm transition-colors ${
                  collapsed ? 'justify-center' : 'gap-3'
                } ${isActive ? 'font-medium' : 'hover:opacity-80'}`
              }
              style={({ isActive }) => ({
                backgroundColor: isActive ? 'var(--nav-active-bg)' : 'transparent',
                color: isActive ? 'var(--nav-active-text)' : 'var(--nav-idle-text)',
                padding: collapsed ? '8px' : '8px 12px',
              })}
            >
              <span>{icon}</span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </div>

        {/* App name + Sign out */}
        <div
          className="border-t"
          style={{ borderColor: 'var(--border)', padding: collapsed ? '12px 8px' : '12px 16px' }}
        >
          {!collapsed && (
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
              padding: collapsed ? '6px' : '6px 8px',
              textAlign: collapsed ? 'center' : 'left',
            }}
            title={collapsed ? 'Sign out' : undefined}
          >
            {collapsed ? '→' : 'Sign out'}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}
