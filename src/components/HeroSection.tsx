type HeroSectionProps = {
  totalVotes: number
  siteCount: number
  averageScore: string
  totalReviews: number
  onSubmit: () => void
}

function HeroSection({ totalVotes, siteCount, averageScore, totalReviews, onSubmit }: HeroSectionProps) {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="hero-inner">
        <p className="hero-badge">* {totalVotes.toLocaleString()} LIVE RATINGS TRACKED</p>
        <h1 id="hero-title">Rate My Site: website design reviews and feedback</h1>
        <p className="hero-subtitle">
          Rate website design, get site feedback, browse web design inspiration, and compare
          landing pages, portfolios, SaaS sites, dashboards, blogs, and ecommerce experiences.
        </p>
        <div className="hero-actions">
          <button className="button primary" type="button" onClick={onSubmit}>
            Submit a Site
          </button>
          <a className="button secondary" href="#gallery">
            Browse Gallery
            <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="hero-stats" aria-label="Gallery stats">
          <span>
            <strong>{siteCount}</strong>
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
  )
}

export default HeroSection
