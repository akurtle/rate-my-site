import type { DisplayOptions, Site, SortOption } from '../types'
import SiteCard from './SiteCard'
import TweaksPanel from './TweaksPanel'

type GallerySectionProps = {
  query: string
  sortOption: SortOption
  visibleSites: Site[]
  featuredSites: Site[]
  showFeatured: boolean
  isLoading: boolean
  loadError: string | null
  upvotedIds: Set<string>
  displayOptions: DisplayOptions
  onSiteOpen: (siteId: string) => void
  onToggleUpvote: (siteId: string) => void
  onDisplayChange: (options: DisplayOptions) => void
}

function GallerySection({
  query,
  sortOption,
  visibleSites,
  featuredSites,
  showFeatured,
  isLoading,
  loadError,
  upvotedIds,
  displayOptions,
  onSiteOpen,
  onToggleUpvote,
  onDisplayChange,
}: GallerySectionProps) {
  return (
    <section className="gallery-shell" id="gallery">
      <div className="gallery-toolbar">
        <div>
          <p className="section-kicker">* GALLERY FEED</p>
          <h2>{query ? `Search results for "${query}"` : 'Browse community picks'}</h2>
          <p className="muted">
            {visibleSites.length} result{visibleSites.length === 1 ? '' : 's'} by{' '}
            {sortOption.toLowerCase()}.
          </p>
        </div>
        <TweaksPanel options={displayOptions} onChange={onDisplayChange} />
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
                onOpen={() => onSiteOpen(site.id)}
                onToggleUpvote={() => onToggleUpvote(site.id)}
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
              onOpen={() => onSiteOpen(site.id)}
              onToggleUpvote={() => onToggleUpvote(site.id)}
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
  )
}

export default GallerySection
