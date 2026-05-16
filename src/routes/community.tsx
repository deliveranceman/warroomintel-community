import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser, SignInButton } from '@clerk/tanstack-start'

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

  if (!isLoaded) {
    return (
      <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: deep }}>
        <span style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', color: gold }}>Loading...</span>
      </div>
    )
  }

  if (!isSignedIn) {
    return (
      <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: deep }}>
        <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '8px', padding: '3rem 2.5rem', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚔</div>
          <h2 style={{ fontFamily: cinzel, fontSize: '18px', color: gold, letterSpacing: '0.1em', marginBottom: '12px' }}>War Room Community</h2>
          <p style={{ fontFamily: crimson, fontSize: '16px', color: textDim, fontStyle: 'italic', lineHeight: 1.7, marginBottom: '28px' }}>
            Sign in to access the live community — a space for deliverance warriors.
          </p>
          <SignInButton mode="modal">
            <button style={{ width: '100%', padding: '13px', background: gold, color: deep, border: 'none', borderRadius: '4px', fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}>
              Sign In ⚔
            </button>
          </SignInButton>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: 'calc(100vh - 73px)', background: deep, padding: '40px 2rem' }}>
      <h1 style={{ fontFamily: cinzel, fontSize: '28px', color: gold, letterSpacing: '0.1em', marginBottom: '12px' }}>
        War Room Community
      </h1>
      <p style={{ fontFamily: crimson, fontSize: '18px', color: textDim, fontStyle: 'italic' }}>
        Welcome, {user?.firstName || 'Warrior'}
      </p>
    </div>
  )
}
