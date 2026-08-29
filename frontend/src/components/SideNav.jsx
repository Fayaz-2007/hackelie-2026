import { ROUTES, normalizePath } from '../routes'

// Sidebar navigation. Visual language is unchanged — same width, colours,
// icons, typography, spacing, logo, name and active-item style. Only the
// destinations changed: every item now points at its own real route, and
// the active item is derived from the current route (never hardcoded).
//
// Items are real <a href> links so Cmd/Ctrl-click, middle-click and "open
// in new tab" work, and so navigation still degrades to a normal page load
// if the SPA router ever fails. A plain left-click is intercepted and
// handled by the History-API router in Root.jsx (no reload).
export default function SideNav({ path, onNavigate }) {
  const current = normalizePath(path)

  return (
    <nav className="sidenav" aria-label="Primary">
      <div className="sidenav__brand">
        <div className="sidenav__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path
              d="M12 4 A8 8 0 0 1 19 15"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <h1 className="sidenav__title">
          SafeLPG <span>AI</span>
        </h1>
      </div>

      {ROUTES.map((item) => {
        const active = current === item.path
        return (
          <a
            key={item.path}
            href={item.path}
            className={`sidenav__item ${active ? 'sidenav__item--active' : ''}`}
            aria-current={active ? 'page' : undefined}
            onClick={(e) => {
              // Let the browser handle new-tab / new-window intents natively.
              if (e.defaultPrevented) return
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
              e.preventDefault()
              onNavigate(item.path)
            }}
          >
            <span className="sidenav__emoji" aria-hidden="true">
              {item.emoji}
            </span>
            {item.label}
          </a>
        )
      })}

      <div className="sidenav__foot">HACKELITE 2026 · Hexa Coders</div>
    </nav>
  )
}
