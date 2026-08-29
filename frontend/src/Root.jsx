import { useCallback, useEffect, useState } from 'react'
import './shell.css'
import App from './App.jsx'
import SideNav from './components/SideNav.jsx'
import SmartConsumptionPage from './consumption/SmartConsumptionPage.jsx'
import AlertsPage from './pages/AlertsPage.jsx'
import HistoryPage from './pages/HistoryPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import {
  ALERTS_PATH,
  DASHBOARD_PATH,
  HISTORY_PATH,
  SETTINGS_PATH,
  SMART_CONSUMPTION_PATH,
  normalizePath,
} from './routes'

// Dependency-free client-side router built on the History API — the same
// mechanism the project already used, extended from a 2-way toggle to a
// real route table. No react-router, no full-page reloads.
function useRouter() {
  const [path, setPath] = useState(() => normalizePath(window.location.pathname))

  useEffect(() => {
    // Keep the address bar canonical if we landed on "/" or an unknown path,
    // so direct-URL access and the Back button always have something valid.
    const canonical = normalizePath(window.location.pathname)
    if (canonical !== window.location.pathname) {
      window.history.replaceState({}, '', canonical)
    }

    const onPopState = () => setPath(normalizePath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = useCallback((to) => {
    const target = normalizePath(to)
    if (target === normalizePath(window.location.pathname)) return
    window.history.pushState({}, '', target)
    setPath(target)
    window.scrollTo(0, 0)
  }, [])

  return { path, navigate }
}

const PAGES = {
  [DASHBOARD_PATH]: App,
  [SMART_CONSUMPTION_PATH]: SmartConsumptionPage,
  [ALERTS_PATH]: AlertsPage,
  [HISTORY_PATH]: HistoryPage,
  [SETTINGS_PATH]: SettingsPage,
}

export default function Root() {
  const { path, navigate } = useRouter()
  const Page = PAGES[path] ?? App

  return (
    <div className="shell">
      <SideNav path={path} onNavigate={navigate} />
      <div className="shell__main">
        <Page />
      </div>
    </div>
  )
}
