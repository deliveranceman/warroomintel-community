import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser, SignInButton } from '@clerk/tanstack-start'
import { useEffect } from 'react'

export const Route = createFileRoute('/community')({
  ssr: false,
  component: CommunityPage,
})

const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const gold    = 'var(--gold)'
const deep    = 'var(--deep)'
const surface = 'var(--surface)'
const border  = 'var(--border)'
const textDim = 'var(--text-dim)'

function CommunityPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  // Redirect to Clerk sign-in if not authenticated once Clerk has loaded
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      window.location.href =
        'https://accounts.warroomintel.com/sign-in?redirect_url=' +
        encodeURIComponent('https://warroomintel.com/community')
    }
  }, [isLoaded, isSignedIn])

  if (!isLoaded) {
    return (
      <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: deep }}>
        <span style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', color: gold }}>Loading...</span>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: deep }}>
        <span style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', color: gold }}>Redirecting to sign in...</span>
      </div>
    )
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 73px)', background: deep, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '12px' }}>
      <h1 style={{ fontFamily: cinzel, fontSize: '28px', color: gold, letterSpacing: '0.1em' }}>
        War Room Community
      </h1>
      <p style={{ fontFamily: crimson, fontSize: '18px', color: textDim, fontStyle: 'italic' }}>
        Welcome, {user?.firstName || 'Warrior'}
      </p>
    </div>
  )
}
