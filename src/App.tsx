import { useMemo, useState } from 'react'
import './App.css'
import AuthModal from './components/AuthModal'
import CollectionsNav from './components/CollectionsNav'
import FilterBar from './components/FilterBar'
import Footer from './components/Footer'
import GallerySection from './components/GallerySection'
import Header from './components/Header'
import HeroSection from './components/HeroSection'
import SearchModal from './components/SearchModal'
import SiteDetailModal from './components/SiteDetailModal'
import UploadPanel from './components/UploadPanel'
import { useSites } from './hooks/useSites'
import { createSite } from './lib/api'
import { initialDisplayOptions } from './lib/constants'
import { clampScore, deriveNameFromUrl, mapSiteRow, sortSites } from './lib/siteUtils'
import { supabase } from './lib/supabaseClient'
import {
  CATEGORIES,
  SORT_OPTIONS,
  TIME_FILTERS,
  type Category,
  type DisplayOptions,
  type SiteRow,
  type SortOption,
  type TimeFilter,
} from './types'

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

  const { sites, setSites, isLoading, loadError } = useSites()

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

  const featuredSites = useMemo(
    () => sortSites(sites.filter((site) => site.featured), 'Top Rated').slice(0, 3),
    [sites],
  )

  const selectedSite = useMemo(
    () => (selectedSiteId ? sites.find((site) => site.id === selectedSiteId) ?? null : null),
    [selectedSiteId, sites],
  )

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

  const handleDiscoverSelect = () => {
    setQuery('')
    setActiveCategory('All')
    setActiveTime('All Time')
    setSortOption('Newest')
    scrollToGallery()
  }

  const handleTopRatedSelect = () => {
    setQuery('')
    setActiveCategory('All')
    setActiveTime('All Time')
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

  const handleCategoryLinkSelect = (category: Category) => {
    setQuery('')
    setActiveCategory(category)
    setActiveTime('All Time')
    setSortOption(category === 'All' ? 'Top Rated' : 'Most Voted')
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
        onDiscoverSelect={handleDiscoverSelect}
        onTopRatedSelect={handleTopRatedSelect}
        onCollectionsSelect={handleCollectionsSelect}
      />

      <main>
        <HeroSection
          totalVotes={totalVotes}
          siteCount={sites.length}
          averageScore={averageScore}
          totalReviews={totalReviews}
          onSubmit={() => setIsSubmitOpen(true)}
        />

        <CollectionsNav onCategorySelect={handleCategoryLinkSelect} />

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

        <GallerySection
          query={query}
          sortOption={sortOption}
          visibleSites={visibleSites}
          featuredSites={featuredSites}
          showFeatured={showFeatured}
          isLoading={isLoading}
          loadError={loadError}
          upvotedIds={upvotedIds}
          displayOptions={displayOptions}
          onSiteOpen={setSelectedSiteId}
          onToggleUpvote={handleToggleUpvote}
          onDisplayChange={setDisplayOptions}
        />
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
          categories={CATEGORIES.filter((c) => c !== 'All') as Exclude<Category, 'All'>[]}
          onCreate={handleCreateSite}
          onClose={() => setIsSubmitOpen(false)}
        />
      ) : null}
      <SiteDetailModal
        key={selectedSite?.id ?? 'site-detail-closed'}
        site={selectedSite}
        isUpvoted={selectedSite ? upvotedIds.has(selectedSite.id) : false}
        voteCount={
          selectedSite ? selectedSite.votes + (upvotedIds.has(selectedSite.id) ? 1 : 0) : 0
        }
        onToggleUpvote={() => {
          if (selectedSite) handleToggleUpvote(selectedSite.id)
        }}
        onRatingCreated={handleRatingCreated}
        onClose={() => setSelectedSiteId(null)}
      />
    </div>
  )
}

export default App
