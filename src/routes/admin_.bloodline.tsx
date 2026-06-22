import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-start'
import { useState, useEffect } from 'react'
import { getAccessLevel } from '@/lib/access'
import { AdminNav } from '../components/admin/AdminNav'

export const Route = createFileRoute('/admin_/bloodline')({
  component: AdminBloodlinePage,
})

const PAGE_BG  = '#EDEBE2'
const CARD_BG  = '#FFFFFF'
const BDR      = '#E5E0D5'
const GOLD     = '#8B6914'
const DEEP     = '#604408'
const TEXT     = '#1a1a1a'
const MUTED    = '#6b6b6b'
const RED      = '#c0392b'
const cinzel   = "'Cinzel', serif"
const crimson  = "'Crimson Pro', serif"

type AdminProfile = {
  id: string
  created_by: string
  subject_name: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
}

function AdminBloodlinePage() {
  const { user, isLoaded, isSignedIn } = useUser()

  const tier    = (user?.publicMetadata as any)?.tier as string | undefined
  const role    = (user?.publicMetadata as any)?.role as string | undefined
  const isAdmin      = getAccessLevel({ tier, role }) >= 4
  const isCommandant = getAccessLevel({ tier, role }) >= 5

  const [profiles, setProfiles]     = useState<AdminProfile[]>([])
  const [loading, setLoading]       = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function fetchProfiles() {
    setLoading(true)
    setFetchError(null)
    try {
      const w = window as any
      const token = w.__clerk?.session
        ? await w.__clerk.session.getToken()
        : null
      const res = await fetch('/api/admin-bloodline-profile-list', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        setFetchError('Failed to load profiles')
        return
      }
      const data = await res.json()
      setProfiles(data.profiles ?? [])
    } catch {
      setFetchError('Network error')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(profile: AdminProfile) {
    if (!window.confirm(
      `Delete investigation for ${profile.subject_name}?\n\nThis removes all ancestors, events, oaths, and patterns. Cannot be undone.`
    )) return
    setDeletingId(profile.id)
    setDeleteError(null)
    try {
      const w = window as any
      const token = w.__clerk?.session ? await w.__clerk.session.getToken() : null
      const res = await fetch('/api/bloodline-profile-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: profile.id }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setDeleteError((err as any).message ?? 'Delete failed')
        return
      }
      setProfiles(prev => prev.filter(p => p.id !== profile.id))
    } catch {
      setDeleteError('Network error')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    if (isLoaded && isSignedIn && isAdmin) { fetchProfiles() }
  }, [isLoaded, isSignedIn, isAdmin])

  // Gate: Clerk resolving
  if (!isLoaded) {
    return (
      <div style={{
        minHeight:      '100vh',
        background:     PAGE_BG,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        fontFamily:     crimson,
        color:          MUTED,
        fontSize:       14,
      }}>
        Verifying access...
      </div>
    )
  }

  // Gate: not signed in or insufficient tier
  if (!isSignedIn || !isAdmin) {
    return (
      <div style={{
        minHeight:      '100vh',
        background:     PAGE_BG,
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        24,
      }}>
        <div style={{
          maxWidth:     420,
          background:   CARD_BG,
          border:       `1px solid ${BDR}`,
          borderRadius: 6,
          padding:      32,
          textAlign:    'center',
        }}>
          <div style={{
            fontFamily:    cinzel,
            fontSize:      14,
            fontWeight:    600,
            color:         DEEP,
            letterSpacing: '0.15em',
            marginBottom:  12,
          }}>
            ACCESS DENIED
          </div>
          <p style={{
            fontFamily: crimson,
            fontSize:   15,
            color:      TEXT,
            margin:     '0 0 20px 0',
            lineHeight: 1.5,
          }}>
            This area is restricted to Minister tier and above.
          </p>
          <a href="/community" style={{
            fontFamily:     cinzel,
            fontSize:       12,
            color:          GOLD,
            textDecoration: 'none',
            letterSpacing:  '0.1em',
          }}>
            Return to Community
          </a>
        </div>
      </div>
    )
  }

  function statusColor(status: string) {
    if (status === 'active')  return { bg: 'rgba(139,105,20,0.1)',  border: 'rgba(139,105,20,0.3)',  text: GOLD }
    if (status === 'paused')  return { bg: 'rgba(107,97,105,0.1)', border: 'rgba(107,97,105,0.25)', text: MUTED }
    return { bg: 'rgba(192,57,43,0.08)',  border: 'rgba(192,57,43,0.25)',  text: RED }
  }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, color: TEXT }}>
      <AdminNav current="bloodline-overview" />

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 28px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <div style={{
            fontFamily:    cinzel, fontSize: 9,
            letterSpacing: '0.18em', color: MUTED,
            textTransform: 'uppercase', marginBottom: 6,
          }}>
            Admin / Bloodline
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
            <h1 style={{
              fontFamily: cinzel, fontSize: 24, fontWeight: 700,
              color: DEEP, margin: 0, letterSpacing: '0.05em',
            }}>
              Bloodline Intelligence Center
            </h1>
            <div style={{
              fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em',
              padding: '4px 10px', borderRadius: 3,
              background: isCommandant ? 'rgba(192,57,43,0.08)' : 'rgba(139,105,20,0.08)',
              border: `1px solid ${isCommandant ? 'rgba(192,57,43,0.25)' : 'rgba(139,105,20,0.2)'}`,
              color: isCommandant ? RED : GOLD,
            }}>
              {isCommandant ? 'COMMANDANT OVERRIDE' : 'READ-ONLY OVERSIGHT'}
            </div>
          </div>
          <p style={{
            fontFamily: crimson, fontSize: 15, color: MUTED,
            margin: '8px 0 0', lineHeight: 1.5,
          }}>
            {isCommandant
              ? 'Commandant authority active. Full delete access across all profiles. Actions are permanent and cannot be undone.'
              : 'Minister oversight dashboard. View all active bloodline investigation profiles across the community. No edit or delete actions at this tier.'
            }
          </p>
        </div>

        {/* Profile list */}
        <div style={{
          background:   CARD_BG,
          border:       `1px solid ${BDR}`,
          borderRadius: 6,
          padding:      '24px',
        }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   20,
          }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: DEEP }}>
              ALL PROFILES
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {!loading && (
                <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUTED }}>
                  {profiles.length} profile{profiles.length !== 1 ? 's' : ''}
                </div>
              )}
              <button
                onClick={fetchProfiles}
                disabled={loading}
                style={{
                  fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
                  padding: '5px 12px', borderRadius: 3, cursor: loading ? 'not-allowed' : 'pointer',
                  background: 'transparent',
                  border: `1px solid ${BDR}`,
                  color: MUTED,
                }}
              >
                {loading ? '...' : 'REFRESH'}
              </button>
            </div>
          </div>

          {fetchError && (
            <div style={{ fontFamily: crimson, fontSize: 14, color: RED, marginBottom: 14 }}>
              {fetchError}
            </div>
          )}

          {deleteError && (
            <div style={{ fontFamily: crimson, fontSize: 14, color: RED, marginBottom: 14 }}>
              Delete failed: {deleteError}
            </div>
          )}

          {loading ? (
            <div style={{
              padding: '32px 0', textAlign: 'center',
              fontFamily: crimson, fontSize: 15, color: MUTED, fontStyle: 'italic',
            }}>
              Loading...
            </div>
          ) : profiles.length === 0 ? (
            <div style={{
              padding: '32px 0', textAlign: 'center',
              fontFamily: crimson, fontSize: 15, color: MUTED, fontStyle: 'italic',
            }}>
              No profiles yet. Community members will create bloodline investigations
              once they access the Bloodline Intelligence Center.
            </div>
          ) : (
            <div>
              {/* Table header */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: isCommandant ? '1fr 160px 100px 100px 72px' : '1fr 160px 100px 100px',
                gap: 12,
                padding: '0 0 10px',
                borderBottom: `1px solid ${BDR}`,
                marginBottom: 4,
              }}>
                {[
                  'SUBJECT', 'CREATOR ID', 'STATUS', 'CREATED',
                  ...(isCommandant ? ['ACTION'] : []),
                ].map(h => (
                  <div key={h} style={{
                    fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: MUTED,
                  }}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {profiles.map(p => {
                const sc = statusColor(p.status)
                const created = new Date(p.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })
                const isDeleting = deletingId === p.id
                return (
                  <div
                    key={p.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isCommandant ? '1fr 160px 100px 100px 72px' : '1fr 160px 100px 100px',
                      gap: 12,
                      padding: '12px 0',
                      borderBottom: `1px solid ${BDR}`,
                      alignItems: 'center',
                      opacity: isDeleting ? 0.5 : 1,
                    }}
                  >
                    <div>
                      <div style={{ fontFamily: crimson, fontSize: 15, color: TEXT }}>
                        {p.subject_name}
                      </div>
                      {p.notes && (
                        <div style={{
                          fontFamily: crimson, fontSize: 12, color: MUTED,
                          fontStyle: 'italic', marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: 320,
                        }}>
                          {p.notes}
                        </div>
                      )}
                    </div>
                    <div style={{
                      fontFamily: 'monospace', fontSize: 11, color: MUTED,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {p.created_by.slice(0, 16)}…
                    </div>
                    <div>
                      <span style={{
                        fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
                        padding: '3px 8px', borderRadius: 3,
                        background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                      }}>
                        {p.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontFamily: crimson, fontSize: 13, color: MUTED }}>
                      {created}
                    </div>
                    {isCommandant && (
                      <div>
                        <button
                          onClick={() => handleDelete(p)}
                          disabled={isDeleting}
                          style={{
                            fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em',
                            padding: '4px 10px', borderRadius: 3,
                            background: 'rgba(192,57,43,0.07)',
                            border: '1px solid rgba(192,57,43,0.3)',
                            color: RED,
                            cursor: isDeleting ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {isDeleting ? '...' : 'DELETE'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
