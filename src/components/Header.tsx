import { useAuth } from '../lib/auth'

type HeaderProps = {
  onSearchOpen: () => void
  onAuthOpen: () => void
}

function Header({ onSearchOpen, onAuthOpen }: HeaderProps) {
  const { user, isConfigured, isLoading, signOut } = useAuth()
  const displayName =
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    'Signed in'

  return (
    <header className="header">
      <div className="app-shell header-shell">
        <div className="brand">
          <div className="brand-mark">R</div>
          <div>
            <p className="brand-name">Rate My Site</p>
            <p className="muted">Community feedback for live web builds</p>
          </div>
        </div>

        <nav className="header-nav">
          <a className="button ghost" href="#explore">
            Discover
          </a>
          <a className="button primary" href="#upload">
            Upload site
          </a>
        </nav>

        <div className="header-actions">
          <button
            className="icon-button"
            type="button"
            onClick={onSearchOpen}
            aria-label="Open search"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Zm9 2-4.35-4.35"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {!isConfigured ? (
            <span className="pill muted">Supabase env not set</span>
          ) : isLoading ? (
            <span className="muted">Loading...</span>
          ) : user ? (
            <div className="user-chip">
              <span>{displayName}</span>
              <button className="button ghost" type="button" onClick={signOut}>
                Sign out
              </button>
            </div>
          ) : (
            <button className="button ghost" type="button" onClick={onAuthOpen}>
              Sign in
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
