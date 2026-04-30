import { useEffect, useState, type FormEvent } from 'react'
import type { Site } from '../App'
import { supabase } from '../lib/supabaseClient'
import { createRating } from '../lib/api'

type RateModalProps = {
  site: Site | null
  onClose: () => void
}

function RateModal({ site, onClose }: RateModalProps) {
  const [ratingValue, setRatingValue] = useState(5)
  const [commentText, setCommentText] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!site) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [site])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!site) return
    if (!supabase) {
      setStatus('Supabase is not configured.')
      return
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session
    if (!session) {
      setStatus('Sign in to rate a site.')
      return
    }
    if (!commentText.trim()) {
      setStatus('Add a comment with your rating.')
      return
    }

    setIsSubmitting(true)
    setStatus('')
    try {
      await createRating(
        site.id,
        {
          score: ratingValue,
          comment: commentText.trim(),
        },
        session.access_token,
      )
      setStatus('Thanks for your feedback.')
      setCommentText('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to submit rating.')
    }
    setIsSubmitting(false)
  }

  if (!site) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card modal-rate" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Rate this site</p>
            <h3>{site.name}</h3>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M6 6l12 12M18 6l-12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="modal-body rate-body">
          <div className="rate-info">
            <div className="tag-row">
              {site.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
            <p className="muted">{site.description}</p>
          </div>

          <form className="rate-form" onSubmit={handleSubmit}>
            <div className="star-row" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`star-button ${ratingValue >= value ? 'active' : ''}`}
                  onClick={() => setRatingValue(value)}
                  aria-pressed={ratingValue >= value}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="m12 3.5 2.9 5.88 6.5.95-4.7 4.6 1.1 6.46L12 18.8l-5.8 3.06 1.1-6.46-4.7-4.6 6.5-.95L12 3.5z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              ))}
              <span className="muted">{ratingValue} / 5</span>
            </div>
            <textarea
              value={commentText}
              onChange={(event) => setCommentText(event.target.value)}
              placeholder="Share specific feedback that will help improve the site."
            />
            <button className="button primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Submitting...' : 'Submit rating'}
            </button>
            {status ? <p className="muted">{status}</p> : null}
          </form>
        </div>
      </div>
    </div>
  )
}

export default RateModal
