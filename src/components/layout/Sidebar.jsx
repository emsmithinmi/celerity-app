import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navItems'

export default function Sidebar() {
  return (
    <aside className="hidden md:flex w-56 flex-shrink-0 bg-app-pane border-r border-app-border flex-col h-full">
      <div className="p-4 border-b border-app-border">
        <h1 className="text-lg font-bold text-app-text tracking-tight">GTD</h1>
        <p className="text-xs text-app-muted">Getting Things Done</p>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-app-highlight text-white'
                  : 'text-app-muted hover:text-app-text hover:bg-white/5'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-app-border">
        <p className="text-xs text-app-muted text-center">v0.1.0</p>
      </div>
    </aside>
  )
}
