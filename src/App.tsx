import { useEffect, useMemo, useState } from 'react'
import './App.css'
import AuthModal from './components/AuthModal'
import FeaturedCard from './components/FeaturedCard'
import FilterBar from './components/FilterBar'
import Footer from './components/Footer'
import Header from './components/Header'
import RateModal from './components/RateModal'
import SearchModal from './components/SearchModal'
import SiteDetailModal from './components/SiteDetailModal'
import SiteCard from './components/SiteCard'
import UploadPanel from './components/UploadPanel'
import { supabase } from './lib/supabaseClient'
import { createSite, fetchSites, uploadScreenshots } from './lib/api'

export type Site = {
  id: string
  name: string
  url: string
  description: string
  tags: string[]
  rating: number
  reviews: number
  trend: string
  featured?: boolean
  author: string
  createdAt?: string | null
  screenshotUrl?: string | null
  screenshotStatus?: string | null
  screenshots?: string[]
}

const filters = ['All', 'Portfolio', 'SaaS', 'Agency', 'Ecommerce', 'Blog', 'Tools']

type SiteRow = {
  id: string
  name: string
  url: string
  description: string
  tags: string[] | null
  avg_rating: number | null
  rating_count: number | null
  created_at: string | null
  owner_id: string | null
  screenshot_url?: string | null
  screenshot_status?: string | null
  site_screenshots?: { url: string }[] | null
}

  const getTrendLabel = (createdAt: string | null, reviews: number) => {
  if (!createdAt) return 'New'
  const createdTime = new Date(createdAt).getTime()
  if (Number.isNaN(createdTime)) return 'New'
  const days = Math.floor((Date.now() - createdTime) / 86400000)
  if (days <= 1) return 'New today'
  if (days <= 7) return 'New this week'
  if (reviews > 100) return 'Top rated'
  return 'Steady'
}

const mapSiteRow = (row: SiteRow): Site => ({
  id: row.id,
  name: row.name,
  url: row.url,
  description: row.description,
  tags: row.tags ?? [],
  rating: Number(row.avg_rating ?? 0),
  reviews: row.rating_count ?? 0,
  trend: getTrendLabel(row.created_at, row.rating_count ?? 0),
  author: row.owner_id ? `@${row.owner_id.slice(0, 6)}` : 'Community',
  createdAt: row.created_at,
  screenshotUrl: row.screenshot_url ?? null,
  screenshotStatus: row.screenshot_status ?? null,
  screenshots: row.site_screenshots?.map((shot) => shot.url) ?? [],
})

function App() {
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState(filters[0])
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [selectedSite, setSelectedSite] = useState<Site | null>(null)
  const [ratingSite, setRatingSite] = useState<Site | null>(null)
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }, [])

  useEffect(() => {
    let active = true
    const loadSites = async () => {
      setIsLoading(true)
      setLoadError(null)
      const controller = new AbortController()
      const timeoutId = window.setTimeout(() => controller.abort(), 10000)
      try {
        const response = await fetchSites(undefined, undefined, { signal: controller.signal })
        if (!active) return
        const rows = (response.data ?? []) as SiteRow[]
        setSites(rows.map(mapSiteRow))
      } catch (error) {
        if (!active) return
        if (error instanceof DOMException && error.name === 'AbortError') {
          setLoadError('Loading sites timed out. Please try again.')
        } else {
          setLoadError(error instanceof Error ? error.message : 'Failed to load sites.')
        }
        setSites([])
      } finally {
        window.clearTimeout(timeoutId)
        if (active) setIsLoading(false)
      }
    }

    loadSites()
    return () => {
      active = false
    }
  }, [])

  const featuredSite = useMemo(() => {
    if (!sites.length) return null
    return sites.reduce((top, site) => (site.rating > top.rating ? site : top), sites[0])
  }, [sites])

  const filteredSites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return sites.filter((site) => {
      const matchesFilter =
        activeFilter === 'All' ||
        site.tags.some((tag) => tag.toLowerCase() === activeFilter.toLowerCase())
      const matchesQuery =
        normalizedQuery.length === 0 ||
        site.name.toLowerCase().includes(normalizedQuery) ||
        site.description.toLowerCase().includes(normalizedQuery) ||
        site.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      return matchesFilter && matchesQuery
    })
  }, [activeFilter, query, sites])

  const totalReviews = useMemo(
    () => sites.reduce((sum, site) => sum + site.reviews, 0),
    [sites],
  )

  const handleCreateSite = async (
    payload: {
      name: string
      url: string
      description: string
      tags: string[]
    },
    screenshots?: File[],
  ) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session
    if (!session) {
      throw new Error('Sign in to upload a site.')
    }
    const response = await createSite(payload, session.access_token)
    const newSite = mapSiteRow(response.data as SiteRow)
    setSites((prev) => [newSite, ...prev])

    if (screenshots?.length) {
      await uploadScreenshots(newSite.id, screenshots, session.access_token)
    }
  }

  return (
    <div className="app">
      <div className="bg-orbit" aria-hidden="true" />
      <Header onSearchOpen={() => setIsSearchOpen(true)} onAuthOpen={() => setIsAuthOpen(true)} />

      <main className="app-shell">
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Rate the web, one site at a time</p>
            <h1>Showcase your site and collect feedback that actually helps.</h1>
            <p className="hero-subtitle">
              Upload your latest build, capture ratings, and highlight daily favorites. Curated
              categories make discovery fast while comments keep feedback precise.
            </p>
            <div className="hero-actions">
              <a className="button primary" href="#upload">
                Upload a site
              </a>
              <a className="button ghost" href="#explore">
                Browse top rated
              </a>
            </div>
            <div className="hero-stats">
            <div>
                <span className="stat-value">{sites.length}</span>
                <span className="stat-label">Sites tracked</span>
              </div>
              <div>
                <span className="stat-value">{totalReviews}</span>
                <span className="stat-label">Ratings total</span>
              </div>
              <div>
                <span className="stat-value">{Math.max(totalReviews, 0)}</span>
                <span className="stat-label">Community reviews</span>
              </div>
            </div>
          </div>
          <div className="hero-card">
            <div className="hero-card-top">
              <span className="pill">Today</span>
              <span className="muted">{todayLabel}</span>
            </div>
            <h3>Daily top featured</h3>
            <p className="muted">
              Every day we spotlight one standout experience. Check back to see the top-rated
              site and the reviews pushing it forward.
            </p>
            <div className="hero-card-actions">
              <button className="button ghost" type="button">
                See how it works
              </button>
            </div>
          </div>
        </section>

        <section className="section">
          <FilterBar
            filters={filters}
            activeFilter={activeFilter}
            onChange={setActiveFilter}
          />
        </section>

        <section className="section">
          <div className="section-header">
            <div>
              <h2>Today&apos;s featured site</h2>
              <p className="muted">Daily winner chosen by community ratings.</p>
            </div>
            <a className="button ghost" href="#explore">
              View all
            </a>
          </div>
          {featuredSite ? (
            <FeaturedCard
              site={featuredSite}
              onView={() => setSelectedSite(featuredSite)}
              onRate={() => setRatingSite(featuredSite)}
            />
          ) : (
            <div className="card">No featured site yet.</div>
          )}
        </section>

        <section className="section" id="explore">
          <div className="section-header">
            <div>
              <h2>Explore the latest uploads</h2>
              <p className="muted">Sort by category, search, or jump into trending picks.</p>
            </div>
            <div className="results-actions">
              <div className="pill muted">{filteredSites.length} results</div>
              <button className="button ghost" type="button" onClick={() => setIsSearchOpen(true)}>
                Search
              </button>
            </div>
          </div>
          {isLoading ? (
            <div className="card">Loading sites...</div>
          ) : loadError ? (
            <div className="card">{loadError}</div>
          ) : filteredSites.length ? (
            <div className="grid">
              {filteredSites.map((site) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  onVisit={() => setSelectedSite(site)}
                  onRate={() => setRatingSite(site)}
                />
              ))}
            </div>
          ) : (
            <div className="card">No sites match your search yet.</div>
          )}
        </section>

        <UploadPanel onCreate={handleCreateSite} />
      </main>

      <Footer />
      <SearchModal
        open={isSearchOpen}
        query={query}
        onQueryChange={setQuery}
        onClose={() => setIsSearchOpen(false)}
      />
      <AuthModal open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <SiteDetailModal site={selectedSite} onClose={() => setSelectedSite(null)} />
      <RateModal site={ratingSite} onClose={() => setRatingSite(null)} />
    </div>
  )
}

export default App
