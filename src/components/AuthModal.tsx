import { useEffect, useState } from 'react'
import { useAuth } from '../lib/auth'

type AuthModalProps = {
  open: boolean
  onClose: () => void
}

function AuthModal({ open, onClose }: AuthModalProps) {
  const { user, signOut, signInWithGoogle, isConfigured } = useAuth()
  const [status, setStatus] = useState('')

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

  const handleGoogleSignIn = async () => {
    setStatus('')
    await signInWithGoogle()
  }

  const handleSignOut = async () => {
    await signOut()
    setStatus('Signed out.')
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="modal-card auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">ACCOUNT</p>
            <h2 id="auth-title">Sign in to rate and submit</h2>
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

        <div className="modal-body auth-stack">
          {!isConfigured ? (
            <p className="status-text">Supabase env is not configured.</p>
          ) : user ? (
            <>
              <p className="muted">Signed in as</p>
              <p className="account-email">{user.email}</p>
              <button className="button secondary" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            </>
          ) : (
            <>
              <button className="button google" type="button" onClick={handleGoogleSignIn}>
                Continue with Google
              </button>
              <p className="muted">Use your account for ratings, comments, and submissions.</p>
            </>
          )}
          {status ? <p className="status-text">{status}</p> : null}
        </div>
      </section>
    </div>
  )
}

export default AuthModal
