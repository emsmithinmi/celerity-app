import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Force page reload when a new service worker takes control so users
// always run the latest deployed code, not a cached previous version.
registerSW({
  onNeedRefresh() {
    window.location.reload()
  },
  onOfflineReady() {},
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
