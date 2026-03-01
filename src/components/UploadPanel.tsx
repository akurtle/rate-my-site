import { useState, type FormEvent } from 'react'
import { ApiError } from '../lib/api'

type UploadPanelProps = {
  onCreate: (
    payload: {
      name: string
      url: string
      description: string
      tags: string[]
    },
    screenshots?: File[],
  ) => Promise<void>
}

function UploadPanel({ onCreate }: UploadPanelProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('Portfolio')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [screenshots, setScreenshots] = useState<File[]>([])

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('')
    setErrors({})
    if (!name.trim() || !url.trim() || !description.trim()) {
      const nextErrors: Record<string, string> = {}
      if (!name.trim()) nextErrors.name = 'Name is required.'
      if (!url.trim()) nextErrors.url = 'URL is required.'
      if (!description.trim()) nextErrors.description = 'Description is required.'
      setErrors(nextErrors)
      setStatus('Please fix the highlighted fields.')
      return
    }
    setIsSubmitting(true)
    try {
      await onCreate(
        {
          name: name.trim(),
          url: url.trim(),
          description: description.trim(),
          tags: [category],
        },
        screenshots,
      )
      setStatus('Site submitted successfully.')
      setName('')
      setUrl('')
      setDescription('')
      setScreenshots([])
    } catch (error) {
      if (error instanceof ApiError && error.fields?.length) {
        const nextErrors: Record<string, string> = {}
        error.fields.forEach((field) => {
          if (field === 'tags') {
            nextErrors.category = 'Choose a category.'
          } else {
            nextErrors[field] = 'Invalid value.'
          }
        })
        setErrors(nextErrors)
        setStatus('Please fix the highlighted fields.')
      } else {
        setStatus(error instanceof Error ? error.message : 'Unable to submit site.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section className="section" id="upload">
      <div className="section-header">
        <div>
          <h2>Upload your site</h2>
          <p className="muted">Share the link, pick a category, and start collecting feedback.</p>
        </div>
        <span className="pill muted">Takes under 2 minutes</span>
      </div>
      <form className="card upload-card" onSubmit={handleSubmit}>
        <label>
          Site name
          <input
            placeholder="Atlas Analytics"
            type="text"
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              if (errors.name) setErrors((prev) => ({ ...prev, name: '' }))
            }}
            className={errors.name ? 'input-error' : ''}
          />
          {errors.name ? <span className="error-text">{errors.name}</span> : null}
        </label>
        <label>
          Site URL
          <input
            placeholder="https://atlasapp.io"
            type="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              if (errors.url) setErrors((prev) => ({ ...prev, url: '' }))
            }}
            className={errors.url ? 'input-error' : ''}
          />
          {errors.url ? <span className="error-text">{errors.url}</span> : null}
        </label>
        <label>
          Category
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value)
              if (errors.category) setErrors((prev) => ({ ...prev, category: '' }))
            }}
            className={errors.category ? 'input-error' : ''}
          >
            <option>Portfolio</option>
            <option>SaaS</option>
            <option>Agency</option>
            <option>Ecommerce</option>
            <option>Blog</option>
            <option>Tools</option>
          </select>
          {errors.category ? <span className="error-text">{errors.category}</span> : null}
        </label>
        <label className="full">
          Quick summary
          <textarea
            placeholder="Tell people what makes your site special and what feedback you want."
            value={description}
            onChange={(event) => {
              setDescription(event.target.value)
              if (errors.description) setErrors((prev) => ({ ...prev, description: '' }))
            }}
            className={errors.description ? 'input-error' : ''}
          />
          {errors.description ? <span className="error-text">{errors.description}</span> : null}
        </label>
        <label className="full">
          Screenshots (optional)
          <div className="file-row">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? [])
                setScreenshots(files)
              }}
            />
            {screenshots.length ? (
              <button
                className="button ghost"
                type="button"
                onClick={() => setScreenshots([])}
              >
                Clear
              </button>
            ) : null}
          </div>
          {screenshots.length ? (
            <span className="muted">{screenshots.length} image(s) selected</span>
          ) : null}
        </label>
        <div className="upload-actions">
          <button className="button primary" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit for review'}
          </button>
          <span className="muted">
            {status || 'Ratings open to signed-in members only.'}
          </span>
        </div>
      </form>
    </section>
  )
}

export default UploadPanel
