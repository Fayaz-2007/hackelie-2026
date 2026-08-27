export default function Header({ connected, onOpenSettings }) {
  return (
    <header className="header">
      <div className="header__brand">
        <div className="header__mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="26" height="26">
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.6" />
            <path d="M12 4 A8 8 0 0 1 19 15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h1 className="header__title">
            SafeLPG <span>AI</span>
          </h1>
          <p className="header__subtitle">Cylinder Monitoring Console</p>
        </div>
      </div>

      <div className="header__meta">
        <div className={`conn-indicator ${connected ? 'conn-indicator--live' : 'conn-indicator--down'}`}>
          <span className="conn-indicator__dot" aria-hidden="true" />
          <span className="conn-indicator__label">{connected ? 'Live' : 'Reconnecting…'}</span>
        </div>
        {onOpenSettings && (
          <button type="button" className="header__settings-btn" onClick={onOpenSettings}>
            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
              <path
                d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 13a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 11a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              />
            </svg>
            Settings
          </button>
        )}
        <p className="header__team">HACKELITE 2026 · Team Hexa Coders</p>
      </div>
    </header>
  )
}
