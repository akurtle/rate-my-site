import { useEffect, useRef } from 'react'

type SearchModalProps = {
  open: boolean
  query: string
  onQueryChange: (value: string) => void
  onClose: () => void
}

function SearchModal({ open, query, onQueryChange, onClose }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

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

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-card modal-search"
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">SEARCH</p>
            <h2 id="search-title">Find sites, tags, and makers</h2>
          </div>
          <button className="icon-button close-button" type="button" onClick={onClose} aria-label="Close search">
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
        <div className="modal-body">
          <input
            ref={inputRef}
            aria-label="Search sites"
            placeholder="portfolio, SaaS, dashboard..."
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <p className="muted">Results update as you type.</p>
        </div>
      </section>
    </div>
  )
}

export default SearchModal
