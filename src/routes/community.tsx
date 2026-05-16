import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense } from 'react'
import { useAuth, useUser, SignInButton, SignUpButton } from '@clerk/tanstack-start'

export const Route = createFileRoute('/community')({
  ssr: false,  // prevents stream-chat-react from running on the server and crashing SSR
  component: CommunityPage,
})

// Dynamically imported — stream-chat-react never runs server-side
const StreamChatView = lazy(() => import('../components/StreamChatView'))

const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const gold    = 'var(--gold)'
const deep    = 'var(--deep)'
const surface = 'var(--surface)'
const border  = 'var(--border)'
const textDim = 'var(--text-dim)'

function LoadingScreen({ message }: { message: string }) {
  return (
    <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--deep)' }}>
      <span style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', color: gold }}>{message}</span>
    </div>
  )
}

function SignInGate() {
  return (
    <div style={{ minHeight: 'calc(100vh - 73px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: deep }}>
      <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '8px', padding: '3rem 2.5rem', maxWidth: '420px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>⚔</div>
        <h2 style={{ fontFamily: cinzel, fontSize: '18px', color: gold, letterSpacing: '0.1em', marginBottom: '12px' }}>
          War Room Community
        </h2>
        <p style={{ fontFamily: crimson, fontSize: '16px', color: textDim, fontStyle: 'italic', lineHeight: 1.7, marginBottom: '28px' }}>
          Sign in to access the War Room community — a live space for deliverance warriors.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <SignInButton mode="modal">
            <button style={{ width: '100%', padding: '13px', background: gold, color: deep, border: 'none', borderRadius: '4px', fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' }}>
              Sign In ⚔
            </button>
          </SignInButton>
          <SignUpButton mode="modal">
            <button style={{ width: '100%', padding: '13px', background: 'transparent', color: gold, border: `1px solid ${border}`, borderRadius: '4px', fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', cursor: 'pointer', textTransform: 'uppercase' }}>
              Join Free
            </button>
          </SignUpButton>
        </div>
      </div>
    </div>
  )
}

function CommunityPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()

  if (!isLoaded) return <LoadingScreen message="Loading..." />
  if (!isSignedIn || !user) return <SignInGate />

  const tier = (user.publicMetadata?.tier as string) || 'Free'

  return (
    <Suspense fallback={<LoadingScreen message="Loading War Room..." />}>
      <StreamChatView
        userId={user.id}
        fullName={user.fullName}
        imageUrl={user.imageUrl}
        tier={tier}
        getToken={getToken}
      />
    </Suspense>
  )
}
