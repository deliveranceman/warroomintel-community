import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useEffect } from 'react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { ResourceViewer } from '@/components/ResourceViewer'

export const Route = createFileRoute('/community_/arsenal/$resourceId')({
  ssr: false,
  component: ArsenalResourcePage,
})

const G      = 'var(--gold)'
const cinzel = "'Cinzel', serif"

function ArsenalResourcePage() {
  const { resourceId } = Route.useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()

  const [resource, setResource] = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError]       = useState('')

  const userTier      = ((user?.publicMetadata?.tier as string) || '').toLowerCase()
  const userTierLabel = userTier === 'watchman' || userTier === 'free' || !userTier ? 'WATCHMAN' : userTier.toUpperCase()
  const userName      = user?.firstName || user?.username || ''

  // All hooks above this line
  useEffect(() => {
    if (!isLoaded) return
    let cancelled = false

    async function load() {
      try {
        const token   = await getToken()
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}
        const res     = await fetch(`/api/resource?slug=${encodeURIComponent(resourceId)}`, { headers })
        if (cancelled) return
        if (res.status === 404) { setNotFound(true); setLoading(false); return }
        if (!res.ok)            { setError('Failed to load resource.'); setLoading(false); return }
        const data = await res.json()
        if (!cancelled) setResource(data.resource)
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Network error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [resourceId, isLoaded])

  if (!isLoaded || loading) {
    return (
      <CommunitySidebarShell activeItem="Arsenal" userName={userName} userTierLabel={userTierLabel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--deep)' }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.2em' }}>LOADING RESOURCE…</div>
        </div>
      </CommunitySidebarShell>
    )
  }

  if (notFound) {
    return (
      <CommunitySidebarShell activeItem="Arsenal" userName={userName} userTierLabel={userTierLabel}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--deep)', gap: 16 }}>
          <div style={{ fontFamily: cinzel, fontSize: 14, color: G }}>RESOURCE NOT FOUND</div>
          <button onClick={() => navigate({ to: '/community', search: { section: 'arsenal' } as any })}
            style={{ padding: '8px 20px', background: 'rgba(201,168,76,0.1)', border: '1px solid var(--border)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
            ← BACK TO ARSENAL
          </button>
        </div>
      </CommunitySidebarShell>
    )
  }

  if (error) {
    return (
      <CommunitySidebarShell activeItem="Arsenal" userName={userName} userTierLabel={userTierLabel}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--deep)', gap: 16 }}>
          <div style={{ fontFamily: cinzel, fontSize: 14, color: '#f87171' }}>ERROR</div>
          <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 15, color: 'var(--muted)' }}>{error}</div>
          <button onClick={() => navigate({ to: '/community', search: { section: 'arsenal' } as any })}
            style={{ padding: '8px 20px', background: 'rgba(201,168,76,0.1)', border: '1px solid var(--border)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
            ← BACK TO ARSENAL
          </button>
        </div>
      </CommunitySidebarShell>
    )
  }

  const theme  = (typeof window !== 'undefined' && document.documentElement.getAttribute('data-theme')) || 'dark'
  const isDark = theme !== 'light'

  return (
    <CommunitySidebarShell activeItem="Arsenal" userName={userName} userTierLabel={userTierLabel}>
      <ResourceViewer resource={resource} isDark={isDark} />
    </CommunitySidebarShell>
  )
}
