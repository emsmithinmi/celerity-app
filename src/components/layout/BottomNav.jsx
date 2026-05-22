import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from './navItems'

export default function BottomNav() {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-app-pane border-t border-app-border flex">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className="flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors"
        >
          {({ isActive }) => (
            <>
              <span
                className={`p-1.5 rounded-lg transition-colors ${
                  isActive ? 'bg-app-highlight text-white' : 'text-app-muted'
                }`}
              >
                <Icon size={18} />
              </span>
              <span className={isActive ? 'text-app-text' : 'text-app-muted'}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
