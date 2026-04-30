import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import type { Category } from '../types'
import { ApiError } from '../lib/api'

type UploadPanelProps = {
  open: boolean
  categories: Exclude<Category, 'All'>[]
  onCreate: (payload: {
    url: string
    category: Exclude<Category, 'All'>
    description: string
    screenshots: File[]
  }) => Promise<void>
  onClose: () => void
}

function UploadPanel({ open, categories, onCreate, onClose }: UploadPanelProps) {
  const [step, setStep] = useState(1)
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState<Exclude<Category, 'All'>>(categories[0] ?? 'Portfolio')
  const [description, setDescription] = useState('')
  const [screenshots, setScreenshots] = useState<File[]>([])
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedUrl, setSubmittedUrl] = useState('')

  const canContinue = useMemo(() => url.trim().length > 0 && Boolean(category), [category, url])
  const canSubmit = description.trim().length >= 10 && !isSubmitting
  const screenshotPreviews = useMemo(
    () =>
      screenshots.map((file) => ({
        file,
        url: URL.createObjectURL(file),
      })),
    [screenshots],
  )

  useEffect(() => {
    if (!open) return
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
  }, [onClose, open])

  useEffect(() => {
    return () => {
      screenshotPreviews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [screenshotPreviews])

  const handleScreenshotChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []).filter((file) =>
      file.type.startsWith('image/'),
    )
    setScreenshots((current) => {
      const next = [...current, ...selectedFiles].slice(0, 2)
      if (current.length + selectedFiles.length > 2) {
        setStatus('Only two screenshots are allowed.')
      } else {
        setStatus('')
      }
      return next
    })
    event.target.value = ''
  }

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((current) => current.filter((_, itemIndex) => itemIndex !== index))
    setStatus('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!canSubmit) return
    setStatus('')
    setIsSubmitting(true)
    try {
      await onCreate({
        url: url.trim(),
        category,
        description: description.trim(),
        screenshots,
      })
      setSubmittedUrl(url.trim())
      setStep(3)
    } catch (error) {
      if (error instanceof ApiError && error.fields?.length) {
        setStatus(`Invalid fields: ${error.fields.join(', ')}`)
      } else {
        setStatus(error instanceof Error ? error.message : 'Unable to submit site.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-card submit-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">SUBMIT</p>
            <h2 id="submit-title">Add a site</h2>
          </div>
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
        </div>

        <div className="progress-bar" aria-label={`Step ${Math.min(step, 2)} of 2`}>
          <span className={step >= 1 ? 'active' : ''} />
          <span className={step >= 2 ? 'active' : ''} />
        </div>

        {step === 1 ? (
          <form
            className="submit-step"
            onSubmit={(event) => {
              event.preventDefault()
              if (canContinue) setStep(2)
            }}
          >
            <label>
              Site URL
              <input
                type="url"
                value={url}
                placeholder="https://example.com"
                onChange={(event) => {
                  setUrl(event.target.value)
                  setStatus('')
                }}
              />
            </label>

            <div className="submit-field">
              <span>Category</span>
              <div className="category-picker">
                {categories.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={category === item ? 'active' : ''}
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <button className="button primary full-button" type="submit" disabled={!canContinue}>
              Continue
            </button>
          </form>
        ) : null}

        {step === 2 ? (
          <form className="submit-step" onSubmit={handleSubmit}>
            <label>
              Description
              <textarea
                value={description}
                placeholder="What should reviewers notice about the design?"
                onChange={(event) => {
                  setDescription(event.target.value)
                  setStatus('')
                }}
              />
            </label>
            <div className="submit-field">
              <span>Screenshots (max 2)</span>
              <label className="screenshot-dropzone">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  disabled={screenshots.length >= 2}
                  onChange={handleScreenshotChange}
                />
                <span>{screenshots.length >= 2 ? 'Two screenshots selected' : 'Add screenshots'}</span>
              </label>
              {screenshotPreviews.length ? (
                <div className="screenshot-preview-grid">
                  {screenshotPreviews.map((preview, index) => (
                    <div className="screenshot-preview" key={`${preview.file.name}-${index}`}>
                      <img src={preview.url} alt={`Screenshot ${index + 1} preview`} />
                      <button
                        className="icon-button"
                        type="button"
                        onClick={() => handleRemoveScreenshot(index)}
                        aria-label={`Remove screenshot ${index + 1}`}
                      >
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
                  ))}
                </div>
              ) : null}
            </div>
            <div className="submit-actions">
              <button className="button secondary" type="button" onClick={() => setStep(1)}>
                Back
              </button>
              <button className="button primary" type="submit" disabled={!canSubmit}>
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </button>
            </div>
            {status ? <p className="status-text">{status}</p> : null}
          </form>
        ) : null}

        {step === 3 ? (
          <div className="confirmation-step">
            <div className="confirmation-mark" aria-hidden="true">
              ✓
            </div>
            <h3>Submitted</h3>
            <p>
              <strong>{submittedUrl}</strong> has been added to the gallery.
            </p>
            <button className="button primary full-button" type="button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : null}
      </section>
    </div>
  )
}

export default UploadPanel
