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
    if (open) {
      inputRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card modal-search" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Search</p>
            <h3>Find sites, tags, and creators</h3>
          </div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close search">
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
            placeholder="Search sites, tags, or creators"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
          />
          <p className="muted">Tip: try “portfolio”, “agency”, or “SaaS”.</p>
        </div>
      </div>
    </div>
  )
}

export default SearchModal
