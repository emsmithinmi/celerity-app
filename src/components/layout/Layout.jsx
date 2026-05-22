import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import QuickCapture from './QuickCapture'

function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)

  useEffect(() => {
    const on  = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online',  on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online',  on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (online) return null
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-black text-xs text-center py-1.5 font-medium">
      You're offline — changes will sync when reconnected
    </div>
  )
}

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      <OfflineBanner />
      <Sidebar />
      <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
        <div className="p-4 md:p-6 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
      <BottomNav />
      <QuickCapture />
    </div>
  )
}
