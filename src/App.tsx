import { useEffect, useMemo, useState } from 'react'
import './App.css'
import AuthModal from './components/AuthModal'
import FilterBar from './components/FilterBar'
import Footer from './components/Footer'
import Header from './components/Header'
import SearchModal from './components/SearchModal'
import SiteCard from './components/SiteCard'
import SiteDetailModal from './components/SiteDetailModal'
import UploadPanel from './components/UploadPanel'
import { createSite, fetchSites } from './lib/api'
import { supabase } from './lib/supabaseClient'

export const CATEGORIES = [
  'All',
  'Portfolio',
  'SaaS',
  'E-commerce',
  'Agency',
  'Landing Page',
  'Blog',
  'Dashboard',
] as const

export const TIME_FILTERS = ['Today', 'This Week', 'All Time'] as const
export const SORT_OPTIONS = ['Top Rated', 'Most Voted', 'Newest'] as const
export const ACCENT_OPTIONS = ['lime', 'cyan', 'amber', 'pink'] as const
export const CARD_SIZE_OPTIONS = ['compact', 'medium', 'large'] as const

export type Category = (typeof CATEGORIES)[number]
export type TimeFilter = (typeof TIME_FILTERS)[number]
export type SortOption = (typeof SORT_OPTIONS)[number]
export type AccentOption = (typeof ACCENT_OPTIONS)[number]
export type CardSizeOption = (typeof CARD_SIZE_OPTIONS)[number]

export type DisplayOptions = {
  accentColor: AccentOption
  cardSize: CardSizeOption
  showScores: boolean
  roundedCards: boolean
}

export type Site = {
  id: string
  name: string
  url: string
  description: string
  tags: string[]
  category: Category
  rating: number
  reviews: number
  votes: number
  trend: string
  featured: boolean
  author: string
  createdAt?: string | null
  screenshotUrl?: string | null
  screenshotStatus?: string | null
  screenshots?: string[]
}

type SiteRow = {
  id: string
  name: string
  url: string
  description: string
  tags: string[] | null
  avg_rating: number | string | null
  rating_count: number | null
  created_at: string | null
  owner_id: string | null
  screenshot_url?: string | null
  screenshot_status?: string | null
  site_screenshots?: { url: string }[] | null
}

const initialDisplayOptions: DisplayOptions = {
  accentColor: 'lime',
  cardSize: 'medium',
  showScores: true,
  roundedCards: true,
}

const categoryAliases: Record<string, Category> = {
  all: 'All',
  portfolio: 'Portfolio',
  saas: 'SaaS',
  'e-commerce': 'E-commerce',
  ecommerce: 'E-commerce',
  agency: 'Agency',
  'landing-page': 'Landing Page',
  landingpage: 'Landing Page',
  landing: 'Landing Page',
  blog: 'Blog',
  dashboard: 'Dashboard',
  tools: 'Dashboard',
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[\s_]+/g, '-')
}

function getSiteCategory(tags: string[]): Category {
  for (const tag of tags) {
    const alias = categoryAliases[normalizeKey(tag)]
    if (alias && alias !== 'All') return alias
  }
  return 'Portfolio'
}

function displayUrl(url: string) {
  return url.replace(/^https?:\/\//, '').replace(/\/$/, '')
}

function getTrendLabel(createdAt: string | null, reviews: number) {
  if (!createdAt) return 'New'
  const createdTime = new Date(createdAt).getTime()
  if (Number.isNaN(createdTime)) return 'New'
  const days = Math.floor((Date.now() - createdTime) / 86400000)
  if (days <= 1) return 'New today'
  if (days <= 7) return 'New this week'
  if (reviews > 100) return 'Top rated'
  return 'Steady'
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) return 0
  return Math.max(0, Math.min(5, score))
}

function mapSiteRow(row: SiteRow): Site {
  const tags = row.tags?.filter(Boolean) ?? []
  const category = getSiteCategory(tags)
  const rating = clampScore(Number(row.avg_rating ?? 0))
  const reviews = row.rating_count ?? 0

  return {
    id: row.id,
    name: row.name,
    url: displayUrl(row.url),
    description: row.description,
    tags: tags.length ? tags : [category],
    category,
    rating,
    reviews,
    votes: reviews,
    trend: getTrendLabel(row.created_at, reviews),
    featured: rating >= 4.5 || reviews >= 25,
    author: row.owner_id ? `@${row.owner_id.slice(0, 6)}` : 'Community',
    createdAt: row.created_at,
    screenshotUrl: row.screenshot_url ?? null,
    screenshotStatus: row.screenshot_status ?? null,
    screenshots: row.site_screenshots?.map((shot) => shot.url) ?? [],
  }
}

function deriveNameFromUrl(url: string) {
  const withProtocol = url.startsWith('http') ? url : `https://${url}`
  try {
    const host = new URL(withProtocol).hostname.replace(/^www\./, '')
    const label = host.split('.')[0] || host
    return label
      .split(/[-_]/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ')
  } catch {
    return url.trim()
  }
}

function sortSites(sites: Site[], sortOption: SortOption) {
  return [...sites].sort((a, b) => {
    if (sortOption === 'Top Rated') {
      return b.rating - a.rating || b.votes - a.votes
    }
    if (sortOption === 'Most Voted') {
      return b.votes - a.votes || b.rating - a.rating
    }
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bTime - aTime || b.id.localeCompare(a.id)
  })
}

function App() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<Category>('All')
  const [activeTime, setActiveTime] = useState<TimeFilter>('This Week')
  const [sortOption, setSortOption] = useState<SortOption>('Top Rated')
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>(initialDisplayOptions)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isAuthOpen, setIsAuthOpen] = useState(false)
  const [isSubmitOpen, setIsSubmitOpen] = useState(false)
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null)
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(() => new Set())
  const [sites, setSites] = useState<Site[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    const controller = new AbortController()

    const loadSites = async () => {
      setIsLoading(true)
      setLoadError(null)
      const timeoutId = window.setTimeout(() => controller.abort(), 10000)
      try {
        const response = await fetchSites(undefined, undefined, { signal: controller.signal })
        if (!active) return
        const rows = (response.data ?? []) as SiteRow[]
        setSites(rows.map(mapSiteRow))
      } catch (error) {
        if (!active) return
        if (error instanceof DOMException && error.name === 'AbortError') {
          setLoadError('Loading sites timed out. Start the API or try again.')
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
      controller.abort()
    }
  }, [])

  const visibleSites = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const filtered = sites.filter((site) => {
      const matchesCategory = activeCategory === 'All' || site.category === activeCategory
      const matchesQuery =
        normalizedQuery.length === 0 ||
        site.name.toLowerCase().includes(normalizedQuery) ||
        site.url.toLowerCase().includes(normalizedQuery) ||
        site.description.toLowerCase().includes(normalizedQuery) ||
        site.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      return matchesCategory && matchesQuery
    })

    return sortSites(filtered, sortOption)
  }, [activeCategory, query, sites, sortOption])

  const featuredSites = useMemo(() => {
    return sortSites(
      sites.filter((site) => site.featured),
      'Top Rated',
    ).slice(0, 3)
  }, [sites])

  const selectedSite = useMemo(() => {
    if (!selectedSiteId) return null
    return sites.find((site) => site.id === selectedSiteId) ?? null
  }, [selectedSiteId, sites])

  const totalReviews = useMemo(() => sites.reduce((sum, site) => sum + site.reviews, 0), [sites])
  const totalVotes = useMemo(
    () => sites.reduce((sum, site) => sum + site.votes, 0) + upvotedIds.size,
    [sites, upvotedIds],
  )
  const averageScore = useMemo(() => {
    if (!sites.length) return '0.0'
    return (sites.reduce((sum, site) => sum + site.rating, 0) / sites.length).toFixed(1)
  }, [sites])
  const showFeatured =
    activeCategory === 'All' && activeTime === 'This Week' && query.trim().length === 0

  const handleToggleUpvote = (siteId: string) => {
    setUpvotedIds((current) => {
      const next = new Set(current)
      if (next.has(siteId)) {
        next.delete(siteId)
      } else {
        next.add(siteId)
      }
      return next
    })
  }

  const handleRatingCreated = (siteId: string, score: number) => {
    setSites((currentSites) =>
      currentSites.map((site) => {
        if (site.id !== siteId) return site
        const nextReviews = site.reviews + 1
        const nextRating = clampScore((site.rating * site.reviews + score) / nextReviews)
        return {
          ...site,
          rating: nextRating,
          reviews: nextReviews,
          votes: site.votes + 1,
          featured: site.featured || nextRating >= 4.5,
        }
      }),
    )
  }

  const handleCreateSite = async (payload: {
    url: string
    category: Exclude<Category, 'All'>
    description: string
  }) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.')
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session
    if (!session) {
      throw new Error('Sign in to submit a site.')
    }

    const response = await createSite(
      {
        name: deriveNameFromUrl(payload.url),
        url: payload.url.trim(),
        description: payload.description.trim(),
        tags: [payload.category],
      },
      session.access_token,
    )
    const newSite = mapSiteRow(response.data as SiteRow)
    setSites((prev) => [newSite, ...prev])
    setActiveCategory('All')
    setSortOption('Newest')
  }

  const scrollToGallery = () => {
    document.getElementById('gallery')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handleTopRatedSelect = () => {
    setQuery('')
    setActiveCategory('All')
    setSortOption('Top Rated')
    scrollToGallery()
  }

  const handleCollectionsSelect = () => {
    setQuery('')
    setActiveCategory('All')
    setActiveTime('This Week')
    setSortOption('Most Voted')
    scrollToGallery()
  }

  return (
    <div
      className="app"
      data-accent={displayOptions.accentColor}
      data-card-size={displayOptions.cardSize}
      data-rounded-cards={displayOptions.roundedCards ? 'true' : 'false'}
    >
      <Header
        query={query}
        onQueryChange={setQuery}
        onSearchOpen={() => setIsSearchOpen(true)}
        onAuthOpen={() => setIsAuthOpen(true)}
        onSubmitOpen={() => setIsSubmitOpen(true)}
        onTopRatedSelect={handleTopRatedSelect}
        onCollectionsSelect={handleCollectionsSelect}
      />

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-inner">
            <p className="hero-badge">* {totalVotes.toLocaleString()} LIVE RATINGS TRACKED</p>
            <h1 id="hero-title">
              Design inspiration, <em>rated by the community.</em>
            </h1>
            <p className="hero-subtitle">
              Rate website design, get site feedback, browse web design inspiration, and compare
              landing pages, portfolios, SaaS sites, dashboards, blogs, and ecommerce experiences.
            </p>
            <div className="hero-actions">
              <button className="button primary" type="button" onClick={() => setIsSubmitOpen(true)}>
                Submit a Site
              </button>
              <a className="button secondary" href="#gallery">
                Browse Gallery
                <span aria-hidden="true">↓</span>
              </a>
            </div>
            <div className="hero-stats" aria-label="Gallery stats">
              <span>
                <strong>{sites.length}</strong>
                <small>Sites</small>
              </span>
              <span>
                <strong>{averageScore}</strong>
                <small>Avg score</small>
              </span>
              <span>
                <strong>{totalReviews}</strong>
                <small>Reviews</small>
              </span>
            </div>
          </div>
        </section>

        <FilterBar
          categories={CATEGORIES}
          timeFilters={TIME_FILTERS}
          sortOptions={SORT_OPTIONS}
          activeCategory={activeCategory}
          activeTime={activeTime}
          sortOption={sortOption}
          onCategoryChange={setActiveCategory}
          onTimeChange={setActiveTime}
          onSortChange={setSortOption}
        />

        <section className="gallery-shell" id="gallery">
          <div className="gallery-toolbar">
            <div>
              <p className="section-kicker">* GALLERY FEED</p>
              <h2>{query ? `Search results for "${query}"` : 'Browse community picks'}</h2>
              <p className="muted">
                {visibleSites.length} result{visibleSites.length === 1 ? '' : 's'} by {sortOption.toLowerCase()}.
              </p>
            </div>
            <TweaksPanel options={displayOptions} onChange={setDisplayOptions} />
          </div>

          {loadError ? <div className="notice">{loadError}</div> : null}

          {showFeatured && featuredSites.length ? (
            <div className="featured-block">
              <p className="section-kicker">* FEATURED PICKS</p>
              <div className="grid featured-grid">
                {featuredSites.map((site, index) => (
                  <SiteCard
                    key={site.id}
                    site={site}
                    index={index}
                    isUpvoted={upvotedIds.has(site.id)}
                    showScore={displayOptions.showScores}
                    onOpen={() => setSelectedSiteId(site.id)}
                    onToggleUpvote={() => handleToggleUpvote(site.id)}
                  />
                ))}
              </div>
              <div className="gallery-separator" />
              <p className="section-kicker">ALL SITES</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="grid">
              {Array.from({ length: 8 }).map((_, index) => (
                <div className="site-card skeleton-card" key={index} aria-hidden="true" />
              ))}
            </div>
          ) : visibleSites.length ? (
            <div className="grid">
              {visibleSites.map((site, index) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  index={index}
                  isUpvoted={upvotedIds.has(site.id)}
                  showScore={displayOptions.showScores}
                  onOpen={() => setSelectedSiteId(site.id)}
                  onToggleUpvote={() => handleToggleUpvote(site.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="section-kicker">NO MATCHES</p>
              <h2>No sites match the current view.</h2>
              <p className="muted">Clear search or choose another category to keep browsing.</p>
            </div>
          )}
        </section>
      </main>

      <Footer />
      <SearchModal
        open={isSearchOpen}
        query={query}
        onQueryChange={setQuery}
        onClose={() => setIsSearchOpen(false)}
      />
      <AuthModal open={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      {isSubmitOpen ? (
        <UploadPanel
          open
          categories={CATEGORIES.filter((category) => category !== 'All') as Exclude<Category, 'All'>[]}
          onCreate={handleCreateSite}
          onClose={() => setIsSubmitOpen(false)}
        />
      ) : null}
      <SiteDetailModal
        key={selectedSite?.id ?? 'site-detail-closed'}
        site={selectedSite}
        isUpvoted={selectedSite ? upvotedIds.has(selectedSite.id) : false}
        voteCount={selectedSite ? selectedSite.votes + (upvotedIds.has(selectedSite.id) ? 1 : 0) : 0}
        onToggleUpvote={() => {
          if (selectedSite) handleToggleUpvote(selectedSite.id)
        }}
        onRatingCreated={handleRatingCreated}
        onClose={() => setSelectedSiteId(null)}
      />
    </div>
  )
}

type TweaksPanelProps = {
  options: DisplayOptions
  onChange: (options: DisplayOptions) => void
}

function TweaksPanel({ options, onChange }: TweaksPanelProps) {
  return (
    <div className="tweaks-panel" aria-label="Display tweaks">
      <div className="swatch-row" aria-label="Accent color">
        {ACCENT_OPTIONS.map((accent) => (
          <button
            key={accent}
            className={`color-swatch color-${accent} ${options.accentColor === accent ? 'active' : ''}`}
            type="button"
            aria-label={`Use ${accent} accent`}
            onClick={() => onChange({ ...options, accentColor: accent })}
          />
        ))}
      </div>
      <div className="segmented-control" aria-label="Card size">
        {CARD_SIZE_OPTIONS.map((size) => (
          <button
            key={size}
            type="button"
            className={options.cardSize === size ? 'active' : ''}
            onClick={() => onChange({ ...options, cardSize: size })}
          >
            {size}
          </button>
        ))}
      </div>
      <label className="toggle-control">
        <input
          type="checkbox"
          checked={options.showScores}
          onChange={(event) => onChange({ ...options, showScores: event.target.checked })}
        />
        Scores
      </label>
      <label className="toggle-control">
        <input
          type="checkbox"
          checked={options.roundedCards}
          onChange={(event) => onChange({ ...options, roundedCards: event.target.checked })}
        />
        Rounded
      </label>
    </div>
  )
}

export default App
