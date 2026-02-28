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
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

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
      <div className="modal-card" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">Account</p>
            <h3>Sign in to rate and favorite sites</h3>
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

        <div className="modal-body">
          {!isConfigured ? (
            <p className="muted">Supabase env not set.</p>
          ) : user ? (
            <div className="auth-stack">
              <p className="muted">Signed in as</p>
              <p>{user.email}</p>
              <button className="button ghost" type="button" onClick={handleSignOut}>
                Sign out
              </button>
            </div>
          ) : (
            <div className="auth-stack">
              <button className="button google" type="button" onClick={handleGoogleSignIn}>
                Continue with Google
              </button>
              <p className="muted">
                We&apos;ll only use your account for ratings, comments, and favorites.
              </p>
            </div>
          )}
          {status ? <p className="muted">{status}</p> : null}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
