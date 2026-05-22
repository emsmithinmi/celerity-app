import {
  LayoutDashboard,
  CalendarDays,
  CheckSquare,
  FolderKanban,
  Users,
} from 'lucide-react'

export const NAV_ITEMS = [
  { to: '/daily',     label: 'Daily',     icon: CalendarDays },
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/tasks',     label: 'Tasks',     icon: CheckSquare },
  { to: '/projects',  label: 'Projects',  icon: FolderKanban },
  { to: '/people',    label: 'People',    icon: Users },
]
