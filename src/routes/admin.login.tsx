import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { useAuth, useUser } from '@clerk/tanstack-start'

export const Route = createFileRoute('/admin/login')({
  component: AdminLogin,
})

const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const gold    = 'var(--gold)'
const deep    = 'var(--deep)'
const surface = 'var(--surface)'
const border  = 'var(--border)'
const muted   = 'var(--muted)'

function AdminLogin() {
  const { isSignedIn, isLoaded } = useAuth()
  const { user }                 = useUser()
  const navigate                 = useNavigate()

  useEffect(() => {
    if (!isLoaded) return
    const role    = (user?.publicMetadata?.role as string) || ''
    const isAdmin = role === 'minister' || role === 'commandant'
    if (isSignedIn && isAdmin) navigate({ to: '/admin' })
  }, [isLoaded, isSignedIn, user, navigate])

  if (!isLoaded) {
    return (
      <div style={{
        background: deep, minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.2em', color: gold,
      }}>
        LOADING...
      </div>
    )
  }

  if (!isSignedIn) {
    const redirectUrl = typeof window !== 'undefined' ? window.location.href : 'https://warroomintel.com/admin'
    return (
      <div style={{
        background: deep, minHeight: '100vh', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: crimson,
      }}>
        <div style={{
          background: surface, border: `1px solid ${border}`,
          borderRadius: '12px', padding: '48px 40px', width: '100%', maxWidth: '380px',
          textAlign: 'center',
        }}>
          <div style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.25em', color: gold, marginBottom: '8px' }}>
            WAR ROOM INTEL
          </div>
          <div style={{ fontFamily: cinzel, fontSize: '18px', color: '#e8e0d0', marginBottom: '4px' }}>
            Admin Access
          </div>
          <div style={{ fontSize: '13px', color: muted, fontStyle: 'italic', marginBottom: '28px' }}>
            Sign in with your ordained minister account to continue.
          </div>
          <a
            href={`https://accounts.warroomintel.com/sign-in?redirect_url=${encodeURIComponent(redirectUrl)}`}
            style={{
              display: 'block', background: gold, color: deep,
              fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.14em',
              padding: '12px', borderRadius: '6px', textDecoration: 'none',
            }}
          >
            SIGN IN
          </a>
        </div>
      </div>
    )
  }

  // Signed in but not admin — show access denied
  return (
    <div style={{
      background: deep, minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: crimson,
    }}>
      <div style={{
        background: surface, border: `1px solid ${border}`,
        borderRadius: '12px', padding: '48px 40px', width: '100%', maxWidth: '380px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '36px', marginBottom: '16px' }}>🔒</div>
        <div style={{ fontFamily: cinzel, fontSize: '18px', color: '#e8e0d0', marginBottom: '4px' }}>
          Access Denied
        </div>
        <div style={{ fontSize: '13px', color: muted, fontStyle: 'italic', marginBottom: '28px' }}>
          This panel requires an ordained minister account.
        </div>
        <a href="/community" style={{
          display: 'block', background: gold, color: deep,
          fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.14em',
          padding: '12px', borderRadius: '6px', textDecoration: 'none',
        }}>
          RETURN TO COMMUNITY
        </a>
      </div>
    </div>
  )
}
