import { useEffect, useState, type FormEvent } from 'react'
import type { Site } from '../types'
import { createRating, createReply, fetchRatings } from '../lib/api'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabaseClient'
import SiteThumbnail from './SiteThumbnail'

type SiteDetailModalProps = {
  site: Site | null
  isUpvoted: boolean
  voteCount: number
  onToggleUpvote: () => void
  onRatingCreated: (siteId: string, score: number) => void
  onClose: () => void
}

type Review = {
  id: string
  author: string
  text: string
  time: string
  score: number
  userId?: string | null
  replies: ReplyNode[]
}

type ReplyNode = {
  id: string
  ratingId: string
  parentReplyId?: string | null
  author: string
  text: string
  time: string
  userId?: string | null
  replies: ReplyNode[]
}

type RatingRow = {
  id: string
  user_id?: string | null
  comment?: string | null
  score?: number | null
  created_at?: string | null
  comment_replies?: ReplyRow[] | null
}

type ReplyRow = {
  id: string
  rating_id?: string | null
  parent_reply_id?: string | null
  user_id?: string | null
  comment?: string | null
  created_at?: string | null
}

function normalizeUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `https://${url}`
}

function SiteDetailModal({
  site,
  isUpvoted,
  voteCount,
  onToggleUpvote,
  onRatingCreated,
  onClose,
}: SiteDetailModalProps) {
  const { user } = useAuth()
  const [reviewText, setReviewText] = useState('')
  const [reviews, setReviews] = useState<Review[]>([])
  const [ratingValue, setRatingValue] = useState(4)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [hasUserReviewed, setHasUserReviewed] = useState(false)
  const [replyTargetId, setReplyTargetId] = useState<string | null>(null)
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    if (!site) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose, site])

  useEffect(() => {
    if (!site) return
    let active = true

    const loadReviews = async () => {
      setIsLoading(true)
      setStatus('')
      try {
        const response = await fetchRatings(site.id)
        if (!active) return
        const rows = (response.data ?? []) as RatingRow[]
        setHasUserReviewed(Boolean(user && rows.some((item) => item.user_id === user.id)))
        const mapped = rows
          .filter((item) => item.comment && item.comment.trim().length > 0)
          .map((item) => ({
            id: item.id,
            author: item.user_id ? `@${item.user_id.slice(0, 6)}` : 'Member',
            text: item.comment ?? '',
            time: formatRelative(item.created_at),
            score: item.score ?? 0,
            userId: item.user_id ?? null,
            replies: buildReplyTree(item.comment_replies ?? []),
          }))
        setReviews(mapped)
      } catch (error) {
        if (!active) return
        setStatus(error instanceof Error ? error.message : 'Failed to load reviews.')
        setReviews([])
        setHasUserReviewed(false)
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadReviews()
    return () => {
      active = false
    }
  }, [site, user])

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
    if (hasUserReviewed) {
      setStatus('You have already reviewed this site.')
      return
    }

    setIsSubmitting(true)
    setStatus('')
    setSubmitted(false)
    try {
      const response = await createRating(
        site.id,
        {
          score: ratingValue,
          comment: reviewText.trim() || undefined,
        },
        session.access_token,
      )
      const data = response.data as RatingRow
      if (reviewText.trim()) {
        const newReview: Review = {
          id: data.id,
          author: session.user.email ?? 'You',
          text: reviewText.trim(),
          time: formatRelative(data.created_at),
          score: data.score ?? ratingValue,
          userId: session.user.id,
          replies: [],
        }
        setReviews((prev) => [newReview, ...prev])
      }
      onRatingCreated(site.id, ratingValue)
      setHasUserReviewed(true)
      setReviewText('')
      setSubmitted(true)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to submit rating.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReplySubmit = async (event: FormEvent, reviewId: string, parentReplyId?: string | null) => {
    event.preventDefault()
    if (!site) return
    if (!replyText.trim()) return
    if (!supabase) {
      setStatus('Supabase is not configured.')
      return
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session
    if (!session) {
      setStatus('Sign in to reply.')
      return
    }
    if (hasUserReplied(reviewId, parentReplyId ?? null, session.user.id, reviews)) {
      setStatus('You have already replied to this message.')
      return
    }

    setIsSubmitting(true)
    setStatus('')
    try {
      const response = await createReply(
        reviewId,
        {
          comment: replyText.trim(),
          parentReplyId: parentReplyId ?? null,
        },
        session.access_token,
      )
      const data = response.data as ReplyRow
      const newReply: ReplyNode = {
        id: data.id,
        ratingId: data.rating_id ?? reviewId,
        parentReplyId: data.parent_reply_id ?? null,
        author: session.user.email ?? 'You',
        text: data.comment ?? replyText.trim(),
        time: formatRelative(data.created_at),
        userId: session.user.id,
        replies: [],
      }
      setReviews((prev) =>
        prev.map((review) => {
          if (review.id !== reviewId) return review
          return {
            ...review,
            replies: parentReplyId
              ? addReplyToTree(review.replies, parentReplyId, newReply)
              : [newReply, ...review.replies],
          }
        }),
      )
      setReplyText('')
      setReplyTargetId(null)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to submit reply.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!site) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <article
        className="modal-card modal-detail"
        role="dialog"
        aria-modal="true"
        aria-labelledby="site-detail-title"
        onClick={(event) => event.stopPropagation()}
      >
        <SiteThumbnail site={site} variant="detail" />

        <div className="detail-content">
          <div className="detail-header">
            <div>
              <div className="detail-title-row">
                <h2 id="site-detail-title">{site.name}</h2>
                {site.featured ? <span className="featured-badge">FEATURED</span> : null}
              </div>
              <a className="external-link" href={normalizeUrl(site.url)} target="_blank" rel="noreferrer">
                <span aria-hidden="true">↗</span> {site.url}
              </a>
            </div>

            <div className="detail-score">
              <button className="icon-button close-button" type="button" onClick={onClose} aria-label="Close">
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
              <strong>{site.rating.toFixed(1)}</strong>
              <StarMeter score={site.rating} />
              <span>{voteCount} votes</span>
            </div>
          </div>

          <div className="tag-row detail-tags">
            <span className="tag primary-tag">{site.category}</span>
            {site.tags
              .filter((tag) => tag !== site.category)
              .slice(0, 5)
              .map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
          </div>

          <p className="detail-description">{site.description}</p>

          <button
            className={`upvote-button detail-upvote ${isUpvoted ? 'active' : ''}`}
            type="button"
            aria-pressed={isUpvoted}
            onClick={onToggleUpvote}
          >
            <svg viewBox="0 0 14 14" aria-hidden="true">
              <path d="M7 2 12 8H9v4H5V8H2l5-6Z" fill="currentColor" />
            </svg>
            Upvote {voteCount}
          </button>

          <div className="modal-rule" />

          <section className="rate-section" aria-labelledby="rate-heading">
            <h3 id="rate-heading">Rate This Site</h3>
            <form className="rate-form" onSubmit={handleSubmit}>
              <div className="number-grid" role="radiogroup" aria-label="Rating from 1 to 5">
                {Array.from({ length: 5 }, (_, index) => index + 1).map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={ratingValue === value ? 'active' : ''}
                    aria-pressed={ratingValue === value}
                    disabled={hasUserReviewed}
                    onClick={() => {
                      setRatingValue(value)
                      setSubmitted(false)
                    }}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <textarea
                value={reviewText}
                disabled={hasUserReviewed}
                onChange={(event) => {
                  setReviewText(event.target.value)
                  setSubmitted(false)
                }}
                placeholder="What stands out? Share notes on layout, hierarchy, motion, or polish."
              />
              <button className="button primary" type="submit" disabled={isSubmitting || hasUserReviewed}>
                {isSubmitting ? 'Submitting...' : 'Submit Rating'}
              </button>
              {hasUserReviewed ? (
                <p className="status-text">You have already reviewed this site.</p>
              ) : null}
              {submitted ? <p className="success-box">Thanks! Your rating has been added.</p> : null}
              {status ? <p className="status-text">{status}</p> : null}
            </form>
          </section>

          <div className="modal-rule" />

          <section className="reviews-section" aria-labelledby="reviews-heading">
            <h3 id="reviews-heading">Community Reviews</h3>
            <div className="review-list">
              {isLoading ? (
                <p className="muted">Loading reviews...</p>
              ) : reviews.length ? (
                reviews.slice(0, 8).map((review) => (
                  <article className="review-card" key={review.id}>
                    <div>
                      <strong>{review.author}</strong>
                      <span>
                        <StarMeter score={review.score} /> {review.time}
                      </span>
                    </div>
                    <p>{review.text}</p>
                    <ReplyControls
                      reviewId={review.id}
                      targetId={review.id}
                      parentReplyId={null}
                      isOpen={replyTargetId === review.id}
                      isSubmitting={isSubmitting}
                      replyText={replyText}
                      canReply={!user || !hasUserReplied(review.id, null, user.id, reviews)}
                      onOpen={() => {
                        setReplyTargetId((current) => (current === review.id ? null : review.id))
                        setReplyText('')
                      }}
                      onTextChange={setReplyText}
                      onSubmit={(event) => handleReplySubmit(event, review.id, null)}
                    />
                    {review.replies.length ? (
                      <ReplyList
                        replies={review.replies}
                        reviewId={review.id}
                        currentUserId={user?.id ?? null}
                        replyTargetId={replyTargetId}
                        replyText={replyText}
                        isSubmitting={isSubmitting}
                        allReviews={reviews}
                        onOpenReply={(targetId) => {
                          setReplyTargetId((current) => (current === targetId ? null : targetId))
                          setReplyText('')
                        }}
                        onTextChange={setReplyText}
                        onSubmit={handleReplySubmit}
                      />
                    ) : null}
                  </article>
                ))
              ) : (
                <p className="muted">No written reviews yet.</p>
              )}
            </div>
          </section>
        </div>
      </article>
    </div>
  )
}

function StarMeter({ score }: { score: number }) {
  const filled = Math.max(0, Math.min(5, Math.round(score)))
  return (
    <span className="star-meter" aria-label={`${score.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }, (_, index) => (
        <svg
          key={index}
          viewBox="0 0 24 24"
          aria-hidden="true"
          className={index < filled ? 'filled' : ''}
        >
          <path d="m12 3.5 2.9 5.88 6.5.95-4.7 4.6 1.1 6.46L12 18.8l-5.8 3.06 1.1-6.46-4.7-4.6 6.5-.95L12 3.5z" />
        </svg>
      ))}
    </span>
  )
}

type ReplyControlsProps = {
  reviewId: string
  targetId: string
  parentReplyId?: string | null
  isOpen: boolean
  isSubmitting: boolean
  replyText: string
  canReply: boolean
  onOpen: () => void
  onTextChange: (value: string) => void
  onSubmit: (event: FormEvent, reviewId: string, parentReplyId?: string | null) => void
}

function ReplyControls({
  reviewId,
  targetId,
  parentReplyId,
  isOpen,
  isSubmitting,
  replyText,
  canReply,
  onOpen,
  onTextChange,
  onSubmit,
}: ReplyControlsProps) {
  return (
    <div className="reply-controls">
      <button className="reply-button" type="button" onClick={onOpen} disabled={!canReply}>
        {canReply ? 'Reply' : 'Already replied'}
      </button>
      {isOpen ? (
        <form className="reply-form" onSubmit={(event) => onSubmit(event, reviewId, parentReplyId)}>
          <textarea
            value={replyText}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder={`Reply to this ${targetId === reviewId ? 'review' : 'message'}...`}
          />
          <button className="button primary" type="submit" disabled={isSubmitting || !replyText.trim()}>
            {isSubmitting ? 'Replying...' : 'Post Reply'}
          </button>
        </form>
      ) : null}
    </div>
  )
}

type ReplyListProps = {
  replies: ReplyNode[]
  reviewId: string
  currentUserId: string | null
  replyTargetId: string | null
  replyText: string
  isSubmitting: boolean
  allReviews: Review[]
  onOpenReply: (targetId: string) => void
  onTextChange: (value: string) => void
  onSubmit: (event: FormEvent, reviewId: string, parentReplyId?: string | null) => void
}

function ReplyList({
  replies,
  reviewId,
  currentUserId,
  replyTargetId,
  replyText,
  isSubmitting,
  allReviews,
  onOpenReply,
  onTextChange,
  onSubmit,
}: ReplyListProps) {
  return (
    <div className="reply-list">
      {replies.map((reply) => (
        <article className="reply-card" key={reply.id}>
          <div className="reply-header">
            <strong>{reply.author}</strong>
            <span>{reply.time}</span>
          </div>
          <p>{reply.text}</p>
          <ReplyControls
            reviewId={reviewId}
            targetId={reply.id}
            parentReplyId={reply.id}
            isOpen={replyTargetId === reply.id}
            isSubmitting={isSubmitting}
            replyText={replyText}
            canReply={!currentUserId || !hasUserReplied(reviewId, reply.id, currentUserId, allReviews)}
            onOpen={() => onOpenReply(reply.id)}
            onTextChange={onTextChange}
            onSubmit={onSubmit}
          />
          {reply.replies.length ? (
            <ReplyList
              replies={reply.replies}
              reviewId={reviewId}
              currentUserId={currentUserId}
              replyTargetId={replyTargetId}
              replyText={replyText}
              isSubmitting={isSubmitting}
              allReviews={allReviews}
              onOpenReply={onOpenReply}
              onTextChange={onTextChange}
              onSubmit={onSubmit}
            />
          ) : null}
        </article>
      ))}
    </div>
  )
}

function buildReplyTree(rows: ReplyRow[]) {
  const nodes = new Map<string, ReplyNode>()
  const roots: ReplyNode[] = []

  rows.forEach((row) => {
    nodes.set(row.id, {
      id: row.id,
      ratingId: row.rating_id ?? '',
      parentReplyId: row.parent_reply_id ?? null,
      author: row.user_id ? `@${row.user_id.slice(0, 6)}` : 'Member',
      text: row.comment ?? '',
      time: formatRelative(row.created_at),
      userId: row.user_id ?? null,
      replies: [],
    })
  })

  nodes.forEach((node) => {
    if (node.parentReplyId && nodes.has(node.parentReplyId)) {
      nodes.get(node.parentReplyId)?.replies.push(node)
    } else {
      roots.push(node)
    }
  })

  return roots
}

function addReplyToTree(replies: ReplyNode[], parentReplyId: string, newReply: ReplyNode): ReplyNode[] {
  return replies.map((reply) => {
    if (reply.id === parentReplyId) {
      return { ...reply, replies: [newReply, ...reply.replies] }
    }
    return { ...reply, replies: addReplyToTree(reply.replies, parentReplyId, newReply) }
  })
}

function hasUserReplied(
  reviewId: string,
  parentReplyId: string | null,
  userId: string,
  reviews: Review[],
) {
  const review = reviews.find((item) => item.id === reviewId)
  if (!review) return false
  return flattenReplies(review.replies).some(
    (reply) => reply.userId === userId && (reply.parentReplyId ?? null) === parentReplyId,
  )
}

function flattenReplies(replies: ReplyNode[]): ReplyNode[] {
  return replies.flatMap((reply) => [reply, ...flattenReplies(reply.replies)])
}

function formatRelative(dateValue?: string | null) {
  if (!dateValue) return 'Just now'
  const time = new Date(dateValue).getTime()
  if (Number.isNaN(time)) return 'Just now'
  const minutes = Math.floor((Date.now() - time) / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default SiteDetailModal
