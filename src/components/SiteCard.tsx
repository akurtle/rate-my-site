import type { KeyboardEvent } from 'react'
import type { Site } from '../App'
import SiteThumbnail from './SiteThumbnail'

type SiteCardProps = {
  site: Site
  index: number
  isUpvoted: boolean
  showScore: boolean
  onOpen: () => void
  onToggleUpvote: () => void
}

function SiteCard({
  site,
  index,
  isUpvoted,
  showScore,
  onOpen,
  onToggleUpvote,
}: SiteCardProps) {
  const voteCount = site.votes + (isUpvoted ? 1 : 0)

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <article
      className="site-card"
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      style={{ animationDelay: `${index * 0.05}s` }}
    >
      <SiteThumbnail site={site} />

      <div className="site-card-body">
        <div className="site-title-row">
          <div className="site-title-copy">
            <h3>{site.name}</h3>
            <p>{site.url}</p>
          </div>
          {showScore ? (
            <span className={`score-badge ${getScoreClass(site.rating)}`}>{site.rating.toFixed(1)}</span>
          ) : null}
        </div>

        <p className="site-card-description">{site.description}</p>

        <div className="site-card-footer">
          <span className="category-chip">{site.category}</span>
          <button
            className={`upvote-button ${isUpvoted ? 'active' : ''}`}
            type="button"
            aria-pressed={isUpvoted}
            onClick={(event) => {
              event.stopPropagation()
              onToggleUpvote()
            }}
          >
            <svg viewBox="0 0 14 14" aria-hidden="true">
              <path d="M7 2 12 8H9v4H5V8H2l5-6Z" fill="currentColor" />
            </svg>
            {voteCount}
          </button>
        </div>
      </div>
    </article>
  )
}

function getScoreClass(score: number) {
  if (score >= 9) return 'score-high'
  if (score >= 8) return 'score-mid'
  return 'score-low'
}

export default SiteCard
