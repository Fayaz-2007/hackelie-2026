export default function Header({ connected }) {
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
        <p className="header__team">HACKELITE 2026 · Team Hexa Coders</p>
      </div>
    </header>
  )
}
