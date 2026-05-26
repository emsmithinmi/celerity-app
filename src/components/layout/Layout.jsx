import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

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

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1e1e2e' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col shrink-0 border-r transition-all duration-200"
        style={{
          backgroundColor: '#181825',
          borderColor: '#313244',
          width: collapsed ? '56px' : '224px',
          minWidth: collapsed ? '56px' : '224px',
        }}
      >
        {/* Logo + collapse toggle */}
        <div
          className="flex items-center border-b shrink-0"
          style={{
            borderColor: '#313244',
            padding: collapsed ? '16px 8px' : '16px 24px',
            justifyContent: collapsed ? 'center' : 'space-between',
          }}
        >
          {!collapsed && (
            <div>
              <h1 className="text-lg font-semibold" style={{ color: '#cdd6f4' }}>GTD</h1>
              <p className="text-xs mt-0.5" style={{ color: '#6c7086' }}>Getting Things Done</p>
            </div>
          )}
          <button
            onClick={() => setCollapsed(c => !c)}
            className="flex items-center justify-center rounded-lg text-xs transition-colors hover:opacity-80"
            style={{ color: '#6c7086', backgroundColor: '#313244', width: '28px', height: '28px', flexShrink: 0 }}
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
                backgroundColor: isActive ? '#313244' : 'transparent',
                color: isActive ? '#cdd6f4' : '#6c7086',
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
          style={{ borderColor: '#313244', padding: collapsed ? '8px 8px 4px' : '8px 12px 4px' }}
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
                backgroundColor: isActive ? '#313244' : 'transparent',
                color: isActive ? '#cdd6f4' : '#6c7086',
                padding: collapsed ? '8px' : '8px 12px',
              })}
            >
              <span>{icon}</span>
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </div>

        {/* User / Sign out */}
        <div
          className="border-t"
          style={{ borderColor: '#313244', padding: collapsed ? '12px 8px' : '12px 16px' }}
        >
          {user && !collapsed && (
            <p
              className="text-xs truncate mb-2"
              style={{ color: '#6c7086' }}
              title={user.email}
            >
              {user.email}
            </p>
          )}
          <button
            onClick={signOut}
            className="w-full rounded-md text-xs transition-colors hover:opacity-80"
            style={{
              color: '#6c7086',
              backgroundColor: '#313244',
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
