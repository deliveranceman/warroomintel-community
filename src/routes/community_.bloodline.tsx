import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-start'
import { useState, useEffect } from 'react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { UpgradeGate } from '@/components/UpgradeGate'
import { getAccessLevel } from '@/lib/access'

export const Route = createFileRoute('/community_/bloodline')({
  component: BloodlinePage,
})

const BG     = 'var(--deep)'
const SURF   = 'var(--surface)'
const SURF2  = 'var(--surface2)'
const BDR    = 'var(--border)'
const GOLD   = 'var(--gold)'
const TXT    = 'var(--t-0)'
const DIM    = 'var(--t-3)'
const RED    = '#c0392b'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

type BloodlineProfile = {
  id: string
  subject_name: string
  status: string
  notes: string | null
  created_at: string
  isMine: boolean
}

function BloodlinePage() {
  const { user, isLoaded } = useUser()

  const tier = ((user?.publicMetadata?.tier as string) || 'watchman').toLowerCase()
  const role = (user?.publicMetadata?.role as string | null) ?? null
  const hasAccess = getAccessLevel({ tier, role }) >= 3

  const userName      = user?.firstName || user?.username || 'Warrior'
  const userTierLabel = tier === 'watchman' || tier === 'free' ? 'WATCHMAN' : tier.toUpperCase()

  const [profiles, setProfiles]       = useState<BloodlineProfile[]>([])
  const [loading, setLoading]         = useState(false)
  const [fetchError, setFetchError]   = useState<string | null>(null)
  const [showCreate, setShowCreate]   = useState(false)
  const [subjectName, setSubjectName] = useState('')
  const [notes, setNotes]             = useState('')
  const [creating, setCreating]       = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  async function fetchProfiles() {
    if (!hasAccess) return
    setLoading(true)
    setFetchError(null)
    try {
      const w = window as any
      const token = w.__clerk?.session
        ? await w.__clerk.session.getToken()
        : null
      const res = await fetch('/api/bloodline-profile-list', {
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

  useEffect(() => {
    if (isLoaded && hasAccess) { fetchProfiles() }
  }, [isLoaded, hasAccess])

  async function handleCreate() {
    if (!subjectName.trim()) return
    setCreating(true)
    setCreateError(null)
    try {
      const w = window as any
      const token = w.__clerk?.session
        ? await w.__clerk.session.getToken()
        : null
      const res = await fetch('/api/bloodline-profile-create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ subject_name: subjectName.trim(), notes: notes.trim() || null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setCreateError((err as any).message ?? 'Failed to create profile')
        return
      }
      const data = await res.json()
      setProfiles(prev => [{ ...data.profile, isMine: true }, ...prev])
      setSubjectName('')
      setNotes('')
      setShowCreate(false)
    } catch {
      setCreateError('Network error')
    } finally {
      setCreating(false)
    }
  }

  if (!isLoaded) {
    return (
      <CommunitySidebarShell activeItem="Bloodline" userName="..." userTierLabel="...">
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: crimson, fontSize: 14, color: DIM,
        }}>
          Verifying access...
        </div>
      </CommunitySidebarShell>
    )
  }

  return (
    <CommunitySidebarShell activeItem="Bloodline" userName={userName} userTierLabel={userTierLabel}>
      {!hasAccess ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UpgradeGate
            variant="screen"
            requiredTier="general"
            featureName="Bloodline Intelligence Center"
            description="The Bloodline Intelligence Center is available to General tier and above. Upgrade to investigate generational iniquity patterns, family bloodlines, and covenant histories."
            isDark
          />
        </div>
      ) : (
        <div style={{
          minHeight: '100dvh', paddingBottom: 40,
          background: BG, padding: '32px 24px', gap: 24,
          maxWidth: 860, margin: '0 auto', width: '100%',
        }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{
                fontFamily: cinzel, fontSize: 11, letterSpacing: '0.18em',
                color: GOLD, textTransform: 'uppercase', marginBottom: 8,
              }}>
                Bloodline Intelligence Center
              </div>
              <h1 style={{
                fontFamily: cinzel, fontSize: 26, fontWeight: 700,
                color: TXT, margin: 0, lineHeight: 1.2,
              }}>
                Investigation begins here.
              </h1>
            </div>
            <button
              onClick={() => { setShowCreate(o => !o); setCreateError(null) }}
              style={{
                fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em',
                padding: '10px 20px', borderRadius: 4, cursor: 'pointer',
                background: 'rgba(201,168,76,0.15)',
                border: `1px solid rgba(201,168,76,0.4)`,
                color: GOLD,
                flexShrink: 0,
              }}
            >
              {showCreate ? '— CANCEL' : '+ NEW INVESTIGATION'}
            </button>
          </div>

          {/* Create form */}
          {showCreate && (
            <div style={{
              background: SURF, border: `1px solid ${BDR}`,
              borderRadius: 6, padding: '20px 24px',
            }}>
              <div style={{
                fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em',
                color: GOLD, marginBottom: 14,
              }}>
                NEW INVESTIGATION
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{
                    display: 'block', fontFamily: cinzel, fontSize: 9,
                    letterSpacing: '0.1em', color: DIM, marginBottom: 6,
                  }}>
                    SUBJECT NAME *
                  </label>
                  <input
                    value={subjectName}
                    onChange={e => setSubjectName(e.target.value)}
                    placeholder="e.g. John Smith Sr."
                    maxLength={200}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: BG, border: `1px solid ${BDR}`,
                      borderRadius: 4, padding: '9px 12px',
                      fontFamily: crimson, fontSize: 15, color: TXT,
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block', fontFamily: cinzel, fontSize: 9,
                    letterSpacing: '0.1em', color: DIM, marginBottom: 6,
                  }}>
                    NOTES (optional)
                  </label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Initial observations or context..."
                    rows={3}
                    style={{
                      width: '100%', boxSizing: 'border-box',
                      background: BG, border: `1px solid ${BDR}`,
                      borderRadius: 4, padding: '9px 12px',
                      fontFamily: crimson, fontSize: 15, color: TXT,
                      outline: 'none', resize: 'vertical',
                    }}
                  />
                </div>

                {createError && (
                  <div style={{ fontFamily: crimson, fontSize: 14, color: RED }}>
                    {createError}
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  disabled={creating || !subjectName.trim()}
                  style={{
                    alignSelf: 'flex-start',
                    fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em',
                    padding: '10px 22px', borderRadius: 4,
                    background: creating || !subjectName.trim()
                      ? 'rgba(201,168,76,0.08)'
                      : 'rgba(201,168,76,0.2)',
                    border: `1px solid rgba(201,168,76,${creating || !subjectName.trim() ? '0.2' : '0.5'})`,
                    color: creating || !subjectName.trim()
                      ? 'rgba(201,168,76,0.35)'
                      : GOLD,
                    cursor: creating || !subjectName.trim() ? 'not-allowed' : 'pointer',
                  }}
                >
                  {creating ? 'CREATING...' : 'CREATE INVESTIGATION'}
                </button>
              </div>
            </div>
          )}

          {/* Profile list */}
          <div style={{
            background: SURF, border: `1px solid ${BDR}`,
            borderRadius: 6, padding: '20px 24px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              marginBottom: 16,
            }}>
              <div style={{
                fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: TXT,
              }}>
                INVESTIGATIONS
              </div>
              <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM }}>
                {loading ? '...' : `${profiles.length} profile${profiles.length !== 1 ? 's' : ''}`}
              </div>
            </div>

            {fetchError && (
              <div style={{ fontFamily: crimson, fontSize: 14, color: RED, marginBottom: 12 }}>
                {fetchError}
              </div>
            )}

            {loading ? (
              <div style={{
                padding: '24px 0', textAlign: 'center',
                fontFamily: crimson, fontSize: 15, color: DIM, fontStyle: 'italic',
              }}>
                Loading...
              </div>
            ) : profiles.length === 0 ? (
              <div style={{
                padding: '32px 0', textAlign: 'center',
                fontFamily: crimson, fontSize: 15, color: DIM, fontStyle: 'italic',
              }}>
                No investigations yet. Create one above.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {profiles.map(p => (
                  <a
                    key={p.id}
                    href={`/community/bloodline/${p.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '12px 0',
                      borderBottom: `1px solid ${BDR}`,
                      textDecoration: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontFamily: crimson, fontSize: 16, color: TXT }}>
                        {p.subject_name}
                      </span>
                      {p.notes && (
                        <span style={{
                          fontFamily: crimson, fontSize: 13, color: DIM,
                          fontStyle: 'italic',
                          maxWidth: 400,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {p.notes}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <span style={{
                        fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
                        padding: '3px 8px', borderRadius: 3,
                        background: p.status === 'active'
                          ? 'rgba(201,168,76,0.12)'
                          : 'rgba(107,97,105,0.15)',
                        color: p.status === 'active' ? GOLD : DIM,
                        border: `1px solid ${p.status === 'active' ? 'rgba(201,168,76,0.3)' : 'rgba(107,97,105,0.2)'}`,
                      }}>
                        {p.status.toUpperCase()}
                      </span>
                      {!p.isMine && (
                        <span style={{
                          fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: DIM,
                        }}>
                          SHARED
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Coming soon */}
          <div style={{
            background: SURF2, border: `1px solid ${BDR}`,
            borderRadius: 6, padding: '20px 24px',
          }}>
            <div style={{
              fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em',
              color: DIM, marginBottom: 14,
            }}>
              COMING IN PHASE 2C+
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Build an ancestor tree with generational data',
                'Track known oaths, lodge memberships, and occult involvement',
                'Log bloodline events and identify recurring patterns',
                'AI-assisted pattern cluster analysis linking ancestors to active spirits',
                'Cultural dossier lookup for heritage-specific bloodline histories',
                'Secret society research (Freemasonry degrees, symbols, known oaths)',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: GOLD, fontFamily: cinzel, fontSize: 12, flexShrink: 0 }}>—</span>
                  <span style={{ fontFamily: crimson, fontSize: 15, color: DIM, lineHeight: 1.5 }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </CommunitySidebarShell>
  )
}
