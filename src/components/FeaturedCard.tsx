import type { Site } from '../App'

type FeaturedCardProps = {
  site: Site
  onView?: () => void
  onRate?: () => void
}

function FeaturedCard({ site, onView, onRate }: FeaturedCardProps) {
  return (
    <article className="card featured">
      <div className="featured-info">
        <div className="pill">Featured</div>
        <h3>{site.name}</h3>
        <p className="muted">{site.description}</p>
        <div className="tag-row">
          {site.tags.map((tag) => (
            <span key={tag} className="tag">
              {tag}
            </span>
          ))}
        </div>
      </div>
      <div className="featured-metrics">
        <div>
          <span className="metric-label">Rating</span>
          <span className="metric-value">{site.rating.toFixed(1)}</span>
        </div>
        <div>
          <span className="metric-label">Reviews</span>
          <span className="metric-value">{site.reviews}</span>
        </div>
        <div>
          <span className="metric-label">Momentum</span>
          <span className="metric-value">{site.trend}</span>
        </div>
        <div className="button-row">
          <button className="button primary" type="button" onClick={onView}>
            View site
          </button>
          <button className="button ghost" type="button" onClick={onRate}>
            Leave a rating
          </button>
        </div>
      </div>
    </article>
  )
}

export default FeaturedCard
