import { useState, type FormEvent } from 'react'

type UploadPanelProps = {
  onCreate: (payload: {
    name: string
    url: string
    description: string
    tags: string[]
  }) => Promise<void>
}

function UploadPanel({ onCreate }: UploadPanelProps) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [category, setCategory] = useState('Portfolio')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setStatus('')
    if (!name.trim() || !url.trim() || !description.trim()) {
      setStatus('Please fill in the required fields.')
      return
    }
    setIsSubmitting(true)
    try {
      await onCreate({
        name: name.trim(),
        url: url.trim(),
        description: description.trim(),
        tags: [category],
      })
      setStatus('Site submitted successfully.')
      setName('')
      setUrl('')
      setDescription('')
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Unable to submit site.')
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
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label>
          Site URL
          <input
            placeholder="https://atlasapp.io"
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option>Portfolio</option>
            <option>SaaS</option>
            <option>Agency</option>
            <option>Ecommerce</option>
            <option>Blog</option>
            <option>Tools</option>
          </select>
        </label>
        <label className="full">
          Quick summary
          <textarea
            placeholder="Tell people what makes your site special and what feedback you want."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
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
