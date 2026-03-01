import type { Site } from '../App'

type SiteCardProps = {
  site: Site
  onVisit: () => void
  onRate: () => void
}

function SiteCard({ site, onVisit, onRate }: SiteCardProps) {
  const previewImage = site.screenshotUrl || site.screenshots?.[0]
  return (
    <article className="card site-card">
      <div className="site-preview">
        {previewImage ? (
          <img src={previewImage} alt={`${site.name} preview`} />
        ) : (
          <div className="site-preview-placeholder">
            <span className="muted">No preview yet</span>
          </div>
        )}
      </div>
      <div className="site-card-top">
        <div>
          <h3>{site.name}</h3>
          <span className="muted">{site.url}</span>
        </div>
        <span className="pill">{site.rating.toFixed(1)} rating</span>
      </div>
      <p className="muted">{site.description}</p>
      <div className="tag-row">
        {site.tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>
      <div className="site-card-footer">
        <div className="site-meta">
          <span>{site.reviews} reviews</span>
          <span className="divider" aria-hidden="true" />
          <span>{site.trend}</span>
        </div>
        <div className="button-row">
          <button className="button ghost" type="button" onClick={onRate}>
            Rate
          </button>
          <button className="button primary" type="button" onClick={onVisit}>
            Visit
          </button>
        </div>
      </div>
    </article>
  )
}

export default SiteCard
