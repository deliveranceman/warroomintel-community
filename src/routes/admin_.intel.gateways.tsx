import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { getAccessLevel } from '@/lib/access'

export const Route = createFileRoute('/admin_/intel/gateways')({
  component: GatewaysBrowsePage,
})

const PAGE_BG = '#EDEBE2'
const CARD_BG = '#FFFFFF'
const BORDER  = '#E5E0D5'
const GOLD    = '#8B6914'
const GOLD_DEEP = '#604408'
const TEXT    = '#1a1a1a'
const MUTED   = '#6b6b6b'

function GatewaysBrowsePage() {
  // ALL hooks first (React hooks rule)
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken } = useAuth()
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sourceFilter, setSourceFilter] = useState<'all' | 'ministry' | 'intelligence' | 'legacy'>('all')

  const tier = (user?.publicMetadata as any)?.tier as string | undefined
  const role = (user?.publicMetadata as any)?.role as string | undefined
  const isAdmin = isLoaded && isSignedIn &&
    getAccessLevel({ tier, role }) >= 4

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const token = await getToken()
        const resp = await fetch('/api/admin-gateways-list', {
          headers: { 'Authorization': `Bearer ${token}` },
        })
        if (!resp.ok) throw new Error(`Status ${resp.status}`)
        const data = await resp.json()
        if (!cancelled) {
          setRows(data.rows ?? [])
          setError(null)
        }
      } catch (err: any) {
        if (!cancelled) setError(String(err?.message ?? err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [isAdmin])

  // Early returns — AFTER all hooks
  if (!isLoaded) {
    return (
      <div style={{
        minHeight: '100vh', background: PAGE_BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: '"Crimson Pro", serif', color: MUTED, fontSize: 14,
      }}>
        Verifying access...
      </div>
    )
  }
  if (!isSignedIn || !isAdmin) {
    return (
      <div style={{
        minHeight: '100vh', background: PAGE_BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}>
        <div style={{
          maxWidth: 420, background: CARD_BG, border: `1px solid ${BORDER}`,
          borderRadius: 6, padding: 32, textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'Cinzel, serif', fontSize: 14, fontWeight: 600,
            color: GOLD_DEEP, letterSpacing: '0.15em', marginBottom: 12,
          }}>
            ⚔ ACCESS DENIED
          </div>
          <p style={{
            fontFamily: '"Crimson Pro", serif', fontSize: 15,
            color: TEXT, margin: '0 0 20px 0', lineHeight: 1.5,
          }}>
            This area is restricted to authorized personnel.
          </p>
          <a href="/community" style={{
            fontFamily: 'Cinzel, serif', fontSize: 12, color: GOLD,
            textDecoration: 'none', letterSpacing: '0.1em',
          }}>
            &larr; Return to Community
          </a>
        </div>
      </div>
    )
  }

  // Filter rows in-memory (38 rows — no perf concern)
  const filtered = rows.filter((r) => {
    if (sourceFilter === 'legacy') {
      if (r.provenance) return false
    } else if (sourceFilter === 'ministry') {
      if (!r.provenance?.resource || r.provenance.resource.isAdversarial) return false
    } else if (sourceFilter === 'intelligence') {
      if (!r.provenance?.resource || !r.provenance.resource.isAdversarial) return false
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      const hay = `${r.spirit?.name ?? ''} ${r.gateway ?? ''} ${r.notes ?? ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  // Group filtered rows by spirit name
  const grouped: Record<string, any[]> = {}
  for (const r of filtered) {
    const spiritName = r.spirit?.name ?? '(unknown spirit)'
    if (!grouped[spiritName]) grouped[spiritName] = []
    grouped[spiritName].push(r)
  }
  const spiritGroups = Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0]))

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, padding: '32px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Breadcrumb */}
        <a
          href="/admin/dashboard"
          style={{
            fontFamily: 'Cinzel, serif', fontSize: 11, color: GOLD,
            textDecoration: 'none', letterSpacing: '0.12em',
            display: 'inline-block', marginBottom: 8,
          }}
        >
          &larr; DASHBOARD
        </a>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: 'Cinzel, serif', fontSize: 32, fontWeight: 600,
            color: GOLD_DEEP, margin: 0, letterSpacing: '0.05em',
          }}>
            🚪 GATEWAYS
          </h1>
          <p style={{
            fontFamily: '"Crimson Pro", serif', fontSize: 15,
            color: MUTED, margin: '8px 0 0 0',
          }}>
            {loading
              ? 'Loading…'
              : `${filtered.length} of ${rows.length} gateways across ${spiritGroups.length} spirits`
            }
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            background: '#FEE2E2', border: '1px solid #FCA5A5',
            borderRadius: 4, padding: '8px 12px', marginBottom: 16,
            fontFamily: '"Crimson Pro", serif', fontSize: 13, color: '#991B1B',
          }}>
            Failed to load gateways: {error}
          </div>
        )}

        {/* Filters */}
        <div style={{
          display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <input
            type="text"
            placeholder="Search by spirit or gateway…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              flex: '1 1 240px',
              padding: '10px 14px',
              fontFamily: '"Crimson Pro", serif',
              fontSize: 14,
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              color: TEXT,
            }}
          />
          {(['all', 'ministry', 'intelligence', 'legacy'] as const).map((opt) => (
            <button
              key={opt}
              onClick={() => setSourceFilter(opt)}
              style={{
                padding: '8px 14px',
                fontFamily: 'Cinzel, serif',
                fontSize: 11,
                letterSpacing: '0.1em',
                background: sourceFilter === opt ? GOLD_DEEP : CARD_BG,
                color: sourceFilter === opt ? '#FFFFFF' : TEXT,
                border: `1px solid ${sourceFilter === opt ? GOLD_DEEP : BORDER}`,
                borderRadius: 4,
                cursor: 'pointer',
                textTransform: 'uppercase',
              }}
            >
              {opt === 'all' ? 'ALL' :
               opt === 'ministry' ? '📖 MINISTRY' :
               opt === 'intelligence' ? '🕯️ INTEL' :
               '⚪ LEGACY'}
            </button>
          ))}
        </div>

        {/* Grouped list */}
        {!loading && spiritGroups.map(([spiritName, gateways]) => (
          <div key={spiritName} style={{ marginBottom: 32 }}>
            <div style={{
              fontFamily: 'Cinzel, serif', fontSize: 12, fontWeight: 600,
              color: GOLD_DEEP, letterSpacing: '0.15em',
              marginBottom: 12, paddingBottom: 8,
              borderBottom: `1px solid ${BORDER}`,
            }}>
              🔮 {spiritName.toUpperCase()} · {gateways.length}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {gateways.map((gw) => (
                <div key={gw.id} style={{
                  background: CARD_BG,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  padding: 16,
                }}>
                  <div style={{
                    fontFamily: '"Crimson Pro", serif',
                    fontSize: 16,
                    fontWeight: 600,
                    color: TEXT,
                    marginBottom: 6,
                  }}>
                    {gw.gateway}
                  </div>
                  {gw.notes && (
                    <div style={{
                      fontFamily: '"Crimson Pro", serif',
                      fontSize: 13,
                      color: MUTED,
                      marginBottom: 10,
                      lineHeight: 1.5,
                    }}>
                      {gw.notes.length > 220 ? gw.notes.slice(0, 220) + '…' : gw.notes}
                    </div>
                  )}
                  <div style={{
                    fontFamily: 'Cinzel, serif',
                    fontSize: 10,
                    letterSpacing: '0.08em',
                    color: MUTED,
                    paddingTop: 8,
                    borderTop: `1px dashed ${BORDER}`,
                  }}>
                    {gw.provenance?.resource ? (
                      <>
                        {gw.provenance.resource.isAdversarial ? '🕯️ INTEL' : '📖 MINISTRY'}
                        {' · '}
                        {gw.provenance.resource.title}
                        {gw.provenance.resource.author ? ` — ${gw.provenance.resource.author}` : ''}
                      </>
                    ) : (
                      <>⚪ LEGACY (no provenance chain)</>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {!loading && spiritGroups.length === 0 && !error && (
          <div style={{
            fontFamily: '"Crimson Pro", serif', color: MUTED,
            fontSize: 14, textAlign: 'center', padding: 40,
          }}>
            No gateways match your filters.
          </div>
        )}
      </div>
    </div>
  )
}
