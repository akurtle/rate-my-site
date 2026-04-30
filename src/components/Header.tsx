import { useAuth } from '../lib/auth'

type HeaderProps = {
  query: string
  onQueryChange: (value: string) => void
  onSearchOpen: () => void
  onAuthOpen: () => void
  onSubmitOpen: () => void
}

function Header({
  query,
  onQueryChange,
  onSearchOpen,
  onAuthOpen,
  onSubmitOpen,
}: HeaderProps) {
  const { user, isConfigured, isLoading } = useAuth()
  const displayName =
    user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Member'
  const avatarLabel = user ? displayName.charAt(0).toUpperCase() : ''

  return (
    <header className="header">
      <div className="nav-shell">
        <div className="nav-left">
          <a className="brand" href="#gallery" aria-label="RateMySite home">
            <span className="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3 20 7.5v9L12 21l-8-4.5v-9L12 3Z" fill="none" stroke="currentColor" strokeWidth="2" />
                <path d="M8.6 9.5 12 7.6l3.4 1.9v4L12 15.4l-3.4-1.9v-4Z" fill="currentColor" />
              </svg>
            </span>
            <span className="brand-name">RateMySite</span>
          </a>

          <nav className="header-nav" aria-label="Main navigation">
            <a href="#gallery">Discover</a>
            <button type="button" onClick={() => onQueryChange('')}>
              Top Rated
            </button>
            <button type="button">Collections</button>
          </nav>
        </div>

        <div className="header-actions">
          <div className="nav-search">
            <button className="search-trigger" type="button" onClick={onSearchOpen} aria-label="Open search modal">
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
            <input
              aria-label="Search sites"
              placeholder="Search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
            />
          </div>

          <button className="button primary nav-submit" type="button" onClick={onSubmitOpen}>
            + Submit
          </button>

          {!isConfigured ? (
            <button className="avatar-button" type="button" onClick={onAuthOpen} aria-label="Supabase env not set">
              !
            </button>
          ) : isLoading ? (
            <span className="avatar-button loading" aria-label="Loading account" />
          ) : (
            <button
              className="avatar-button"
              type="button"
              onClick={onAuthOpen}
              aria-label={user ? `Open account for ${displayName}` : 'Sign in'}
              title={user ? displayName : 'Sign in'}
            >
              {avatarLabel || (
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
