// Shared route table for the lightweight in-app router (see Root.jsx).
// The project has no routing library — this History-API router is the
// mechanism it already uses, here extended to a real multi-route table.

export const DASHBOARD_PATH = '/dashboard'
export const SMART_CONSUMPTION_PATH = '/smart-consumption'
export const ALERTS_PATH = '/alerts'
export const HISTORY_PATH = '/history'
export const SETTINGS_PATH = '/settings'

// Order === sidebar order. `emoji`/`label` are consumed by SideNav so the
// sidebar and the router can never drift apart.
export const ROUTES = [
  { path: DASHBOARD_PATH, label: 'Dashboard', emoji: '🏠' },
  { path: SMART_CONSUMPTION_PATH, label: 'Smart Consumption', emoji: '🧠' },
  { path: ALERTS_PATH, label: 'Alerts', emoji: '🚨' },
  { path: HISTORY_PATH, label: 'History', emoji: '📜' },
  { path: SETTINGS_PATH, label: 'Settings', emoji: '⚙' },
]

const KNOWN = new Set(ROUTES.map((r) => r.path))

// Collapse "/", "" and "/index.html" onto the canonical dashboard path, and
// send any unknown path there too, so the sidebar always has one active item.
export function normalizePath(pathname) {
  if (pathname === '/' || pathname === '' || pathname === '/index.html') {
    return DASHBOARD_PATH
  }
  return KNOWN.has(pathname) ? pathname : DASHBOARD_PATH
}
