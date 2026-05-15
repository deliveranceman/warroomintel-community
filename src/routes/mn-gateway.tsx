import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { z } from 'zod'

export const Route = createFileRoute('/mn-gateway')({
  validateSearch: z.object({ email: z.string().optional() }),
  head: () => ({
    meta: [
      { title: 'Resource Arsenal — War Room Intel' },
      { name: 'robots', content: 'noindex' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: '' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&display=swap',
      },
    ],
  }),
  component: MNGateway,
})

const gold = '#C9A84C'
const bg = '#0D0B14'
const surface = '#13101E'
const border = 'rgba(201,168,76,0.35)'

type VerifyState = 'idle' | 'loading' | 'not_found' | 'error'

function MNGateway() {
  const { email: emailParam } = Route.useSearch()
  const navigate = useNavigate()

  const [email, setEmail] = useState(emailParam ?? '')
  const [state, setState] = useState<VerifyState>('idle')
  const autoSubmitted = useRef(false)

  async function verify(target: string) {
    setState('loading')
    try {
      const res = await fetch(`/api/mn-verify?email=${encodeURIComponent(target.trim().toLowerCase())}`)
      const data = await res.json()
      if (res.ok && data.tier) {
        sessionStorage.setItem('wri_session', JSON.stringify(data))
        navigate({ to: '/resources' })
      } else if (res.status === 404 || data.error === 'not_found') {
        setState('not_found')
      } else {
        setState('error')
      }
    } catch {
      setState('error')
    }
  }

  useEffect(() => {
    if (emailParam && !autoSubmitted.current) {
      autoSubmitted.current = true
      verify(emailParam)
    }
  }, [emailParam])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (email.trim()) verify(email)
  }

  const isLoading = state === 'loading'

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      background: bg,
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: surface,
        border: `1px solid ${border}`,
        borderRadius: 12,
        padding: '40px 32px',
        boxSizing: 'border-box',
        textAlign: 'center',
      }}>
        {/* Logo */}
        <img
          src="/logo.png"
          alt="War Room Intel"
          style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 24 }}
        />

        {/* Title */}
        <h1 style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 26,
          fontWeight: 700,
          color: gold,
          margin: '0 0 10px',
          letterSpacing: '0.04em',
        }}>
          Resource Arsenal
        </h1>

        {/* Subtitle */}
        <p style={{ color: '#A89FC0', fontSize: 14, margin: '0 0 28px', lineHeight: 1.6 }}>
          Enter your community email to access your tier resources
        </p>

        {/* Auto-verifying spinner */}
        {isLoading && (
          <p style={{ color: gold, fontSize: 14, marginBottom: 20 }}>Verifying…</p>
        )}

        {/* Form */}
        {!isLoading && (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <input
              type="email"
              required
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: bg,
                border: '1px solid rgba(201,168,76,0.4)',
                borderRadius: 6,
                color: '#EDE9F5',
                fontSize: 15,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />

            <button
              type="submit"
              style={{
                width: '100%',
                padding: '13px 0',
                background: gold,
                color: '#0D0B14',
                border: 'none',
                borderRadius: 6,
                fontFamily: "'Cinzel', serif",
                fontWeight: 700,
                fontSize: 15,
                cursor: 'pointer',
                letterSpacing: '0.03em',
              }}
            >
              Access Arsenal →
            </button>
          </form>
        )}

        {/* Error states */}
        {state === 'not_found' && (
          <div style={{ marginTop: 20 }}>
            <p style={{ color: '#E88C8C', fontSize: 14, marginBottom: 10 }}>
              Email not found in our community records.
            </p>
            <p style={{ color: '#A89FC0', fontSize: 13 }}>
              Not a member yet?{' '}
              <a
                href="https://community.warroomintel.com/plans/1979758?bundle_token=e04c89c08df67ed3964150df587bacc4&utm_source=manual"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: gold, textDecoration: 'underline' }}
              >
                Join the Watchman free plan
              </a>
            </p>
          </div>
        )}

        {state === 'error' && (
          <p style={{ color: '#E88C8C', fontSize: 14, marginTop: 20 }}>
            Something went wrong. Please try again.
          </p>
        )}

        {/* Footer note */}
        <p style={{ color: '#6B6480', fontSize: 12, marginTop: 28, lineHeight: 1.5 }}>
          Use the same email you joined{' '}
          <span style={{ color: '#A89FC0' }}>community.warroomintel.com</span> with
        </p>
      </div>
    </div>
  )
}
