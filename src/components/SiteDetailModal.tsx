import { useEffect, useMemo, useState, type FormEvent } from 'react'
import type { Site } from '../App'
import { supabase } from '../lib/supabaseClient'
import { createRating, createReply, fetchRatings } from '../lib/api'

type SiteDetailModalProps = {
  site: Site | null
  onClose: () => void
}

type Comment = {
  id: string
  author: string
  text: string
  time: string
  score: number
  replies: Reply[]
}

type Reply = {
  id: string
  author: string
  text: string
  time: string
}

function normalizeUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }
  return `https://${url}`
}

function SiteDetailModal({ site, onClose }: SiteDetailModalProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [commentText, setCommentText] = useState('')
  const [comments, setComments] = useState<Comment[]>([])
  const [ratingValue, setRatingValue] = useState(5)
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [replyOpenId, setReplyOpenId] = useState<string | null>(null)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})

  useEffect(() => {
    if (site) {
      setActiveIndex(0)
      setCommentText('')
      setComments([])
      setStatus('')
      setRatingValue(5)
      setReplyOpenId(null)
      setReplyDrafts({})
    }
  }, [site])

  useEffect(() => {
    if (!site) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [site])

  useEffect(() => {
    if (!site) return
    let active = true

    const loadComments = async () => {
      setIsLoading(true)
      setStatus('')
      try {
        const response = await fetchRatings(site.id)
        if (!active) return
        const mapped = (response.data ?? [])
          .filter((item) => item.comment && item.comment.trim().length > 0)
          .map((item) => ({
            id: item.id,
            author: item.user_id ? `@${item.user_id.slice(0, 6)}` : 'Member',
            text: item.comment ?? '',
            time: formatRelative(item.created_at),
            score: item.score ?? 0,
            replies: (item.comment_replies ?? []).map((reply) => ({
              id: reply.id,
              author: reply.user_id ? `@${reply.user_id.slice(0, 6)}` : 'Member',
              text: reply.comment ?? '',
              time: formatRelative(reply.created_at),
            })),
          }))
        setComments(mapped)
      } catch (error) {
        if (!active) return
        setStatus(error instanceof Error ? error.message : 'Failed to load comments.')
        setComments([])
      } finally {
        if (active) setIsLoading(false)
      }
    }

    loadComments()

    return () => {
      active = false
    }
  }, [site])

  const images = site
    ? Array.from(
        new Set([
          ...(site.screenshots ?? []),
          ...(site.screenshotUrl ? [site.screenshotUrl] : []),
        ]),
      )
    : []
  const activeImage = images[activeIndex]
  const screenshotStatus = site?.screenshotStatus

  const placeholderImage = useMemo(
    () => 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1400&auto=format&fit=crop',
    [],
  )

  const handlePrev = () => {
    if (!images.length) return
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1))
  }

  const handleNext = () => {
    if (!images.length) return
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1))
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('')
    if (!commentText.trim()) return
    if (!site) return
    if (!supabase) {
      setStatus('Supabase is not configured.')
      return
    }
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData.session
    if (!session) {
      setStatus('Sign in to comment.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await createRating(
        site.id,
        {
          score: ratingValue,
          comment: commentText.trim(),
        },
        session.access_token,
      )
      const data = response.data
      const newComment: Comment = {
        id: data.id,
        author: session.user.email ?? 'You',
        text: data.comment ?? '',
        time: formatRelative(data.created_at),
        score: data.score ?? ratingValue,
        replies: [],
      }
      setComments((prev) => [newComment, ...prev])
      setCommentText('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to post comment.')
    }
    setIsSubmitting(false)
  }

  const handleReplySubmit = async (commentId: string) => {
    const replyText = (replyDrafts[commentId] ?? '').trim()
    if (!replyText) return
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

    setIsSubmitting(true)
    setStatus('')
    try {
      const response = await createReply(commentId, { comment: replyText }, session.access_token)
      const data = response.data
      const newReply: Reply = {
        id: data.id,
        author: session.user.email ?? 'You',
        text: data.comment ?? '',
        time: formatRelative(data.created_at),
      }
      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? { ...comment, replies: [newReply, ...comment.replies] }
            : comment,
        ),
      )
      setReplyDrafts((prev) => ({ ...prev, [commentId]: '' }))
      setReplyOpenId(null)
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Failed to submit reply.')
    }
    setIsSubmitting(false)
  }

  if (!site) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-card modal-detail"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">Site preview</p>
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

        <div className="modal-body detail-layout">
          <div className="carousel">
            <img src={activeImage ?? placeholderImage} alt={`${site.name} preview`} />
            {!activeImage ? (
              <p className="muted">
                {screenshotStatus === 'processing'
                  ? 'Screenshot processing...'
                  : screenshotStatus === 'failed'
                    ? 'Screenshot failed. Try again later.'
                    : 'Screenshot pending.'}
              </p>
            ) : null}
            <div className="carousel-controls">
              <button className="button ghost" type="button" onClick={handlePrev}>
                Prev
              </button>
              <span className="muted">
                {images.length ? `${activeIndex + 1}/${images.length}` : 'Preview'}
              </span>
              <button className="button ghost" type="button" onClick={handleNext}>
                Next
              </button>
            </div>
            <a className="button primary" href={normalizeUrl(site.url)} target="_blank" rel="noreferrer">
              Visit site
            </a>
          </div>

          <div className="detail-info">
            <div className="detail-meta">
              <span className="pill">Rating {site.rating.toFixed(1)}</span>
              <span className="muted">{site.reviews} reviews</span>
            </div>
            <p className="muted">{site.description}</p>
            <div className="tag-row">
              {site.tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                </span>
              ))}
            </div>
            <div className="detail-author">
              <p className="muted">Created by</p>
              <p>{site.author}</p>
            </div>
            <div className="detail-link">
              <span className="muted">Website</span>
              <a href={normalizeUrl(site.url)} target="_blank" rel="noreferrer">
                {site.url}
              </a>
            </div>
          </div>
        </div>

        <div className="detail-comments">
          <div className="section-header">
            <div>
              <h3>Comments</h3>
              <p className="muted">Share feedback or ask questions.</p>
            </div>
          </div>

          <form className="comment-form" onSubmit={handleSubmit}>
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
              placeholder="Leave a thoughtful comment..."
            />
            <button className="button primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Posting...' : 'Post comment'}
            </button>
            {status ? <p className="muted">{status}</p> : null}
          </form>

          <div className="comment-list">
            {isLoading ? (
              <p className="muted">Loading comments...</p>
            ) : comments.length ? (
              comments.map((comment) => (
                <div key={comment.id} className="comment-card">
                  <div>
                    <strong>{comment.author}</strong>
                    <span className="muted">
                      {comment.time} · {comment.score}/5
                    </span>
                  </div>
                  <p className="muted">{comment.text}</p>
                  <div className="comment-actions">
                    <button
                      className="button ghost"
                      type="button"
                      onClick={() =>
                        setReplyOpenId((current) => (current === comment.id ? null : comment.id))
                      }
                    >
                      Reply
                    </button>
                  </div>
                  {replyOpenId === comment.id ? (
                    <form
                      className="reply-form"
                      onSubmit={(event) => {
                        event.preventDefault()
                        handleReplySubmit(comment.id)
                      }}
                    >
                      <textarea
                        value={replyDrafts[comment.id] ?? ''}
                        onChange={(event) =>
                          setReplyDrafts((prev) => ({ ...prev, [comment.id]: event.target.value }))
                        }
                        placeholder="Write a reply..."
                      />
                      <button className="button primary" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Replying...' : 'Post reply'}
                      </button>
                    </form>
                  ) : null}
                  {comment.replies.length ? (
                    <div className="reply-list">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="reply-card">
                          <div>
                            <strong>{reply.author}</strong>
                            <span className="muted">{reply.time}</span>
                          </div>
                          <p className="muted">{reply.text}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="muted">No comments yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
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
