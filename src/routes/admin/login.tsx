import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/admin/admin/login')({
  component: AdminLogin,
})

const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const gold    = '#C9A84C'
const deep    = '#0D0B14'
const surface = '#110f1c'
const border  = '#2a2440'
const muted   = '#6a6080'

function AdminLogin() {
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const navigate = useNavigate()

  async function handleLogin() {
    if (!password) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
        credentials: 'same-origin',
      })
      if (res.ok) {
        navigate({ to: '/admin' })
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid password')
      }
    } catch {
      setError('Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: deep, minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center', fontFamily: crimson,
    }}>
      <div style={{
        background: surface, border: `1px solid ${border}`,
        borderRadius: '12px', padding: '48px 40px', width: '100%', maxWidth: '380px',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.25em', color: gold, marginBottom: '8px' }}>
            WAR ROOM INTEL
          </div>
          <div style={{ fontFamily: cinzel, fontSize: '18px', color: '#e8e0d0', marginBottom: '4px' }}>
            Admin Access
          </div>
          <div style={{ fontSize: '13px', color: muted, fontStyle: 'italic' }}>
            Restricted — authorized personnel only
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.14em', color: muted, display: 'block', marginBottom: '8px' }}>
            PASSWORD
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            autoFocus
            style={{
              width: '100%', background: deep, border: `1px solid ${border}`,
              borderRadius: '6px', padding: '10px 14px', color: '#e8e0d0',
              fontFamily: crimson, fontSize: '14px', outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>

        {error && (
          <div style={{
            background: '#2a1010', border: '1px solid #5a2020', borderRadius: '6px',
            padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#e09090',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !password}
          style={{
            width: '100%', background: gold, color: deep,
            fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.14em',
            padding: '12px', borderRadius: '6px', border: 'none',
            cursor: loading || !password ? 'not-allowed' : 'pointer',
            opacity: loading || !password ? 0.6 : 1,
            transition: 'opacity 0.2s',
          }}
        >
          {loading ? 'VERIFYING...' : 'ENTER THE WAR ROOM'}
        </button>
      </div>
    </div>
  )
}
