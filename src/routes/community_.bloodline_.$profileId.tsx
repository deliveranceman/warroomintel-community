import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-start'
import { useState, useEffect } from 'react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { UpgradeGate } from '@/components/UpgradeGate'
import { getAccessLevel } from '@/lib/access'

export const Route = createFileRoute('/community_/bloodline_/$profileId')({
  component: BloodlineDetailPage,
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

type DetailProfile = {
  id: string
  created_by: string
  subject_name: string
  status: string
  notes: string | null
  created_at: string
  updated_at: string
  curse_depth_default: number
  extended_depth_flag: boolean
  extended_depth_reason: string | null
  extended_depth_estimate: number | null
  discernment_notes: string | null
}

async function getClerkToken(): Promise<string | null> {
  const w = window as any
  return w.__clerk?.session ? await w.__clerk.session.getToken() : null
}

function statusStyle(status: string) {
  if (status === 'active') return { bg: 'rgba(201,168,76,0.12)', border: 'rgba(201,168,76,0.3)', text: GOLD }
  if (status === 'paused') return { bg: 'rgba(107,97,105,0.15)', border: 'rgba(107,97,105,0.2)', text: DIM }
  return { bg: 'rgba(192,57,43,0.1)', border: 'rgba(192,57,43,0.25)', text: RED }
}

function reachCite(reason: string | null): string {
  if (reason === 'illegitimacy') return 'Deuteronomy 23:2 — to the tenth generation'
  if (reason === 'blood_ritual' || reason === 'sex_ritual' || reason === 'molestation')
    return 'Build the visible 4, war the full reach.'
  return ''
}

function reasonLabel(reason: string | null): string {
  if (reason === 'illegitimacy') return 'Illegitimacy'
  if (reason === 'blood_ritual') return 'Blood ritual'
  if (reason === 'sex_ritual') return 'Sex ritual'
  if (reason === 'molestation') return 'Molestation'
  if (reason === 'other') return 'Other'
  return ''
}

function BloodlineDetailPage() {
  const { profileId } = Route.useParams()
  const { user, isLoaded } = useUser()

  const tier = ((user?.publicMetadata?.tier as string) || 'watchman').toLowerCase()
  const role = (user?.publicMetadata?.role as string | null) ?? null
  const hasAccess = getAccessLevel({ tier, role }) >= 3

  const userName      = user?.firstName || user?.username || 'Warrior'
  const userTierLabel = tier === 'watchman' || tier === 'free' ? 'WATCHMAN' : tier.toUpperCase()

  const [profile, setProfile]       = useState<DetailProfile | null>(null)
  const [canWrite, setCanWrite]     = useState(false)
  const [loading, setLoading]       = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [notFound, setNotFound]     = useState(false)
  const [forbidden, setForbidden]   = useState(false)

  // Profile edit state
  const [editing, setEditing]       = useState(false)
  const [editName, setEditName]     = useState('')
  const [editNotes, setEditNotes]   = useState('')
  const [editStatus, setEditStatus] = useState('active')
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)

  // Delete state
  const [deleting, setDeleting]       = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Generational Reach + Discernment state
  const [isIllegitimacy, setIsIllegitimacy] = useState(false)
  const [isRitual, setIsRitual]             = useState(false)
  const [ritualReason, setRitualReason]     = useState('blood_ritual')
  const [depthEstimate, setDepthEstimate]   = useState('10')
  const [discernNotes, setDiscernNotes]     = useState('')
  const [savingReach, setSavingReach]       = useState(false)
  const [reachSaveError, setReachSaveError] = useState<string | null>(null)
  const [reachSaved, setReachSaved]         = useState(false)

  function syncReachFromProfile(p: DetailProfile) {
    setDiscernNotes(p.discernment_notes ?? '')
    if (!p.extended_depth_flag) {
      setIsIllegitimacy(false)
      setIsRitual(false)
      setRitualReason('blood_ritual')
      setDepthEstimate('10')
      return
    }
    const reason = p.extended_depth_reason ?? ''
    if (reason === 'illegitimacy') {
      setIsIllegitimacy(true)
      setIsRitual(false)
    } else if (['blood_ritual', 'sex_ritual', 'molestation', 'other'].includes(reason)) {
      setIsIllegitimacy(false)
      setIsRitual(true)
      setRitualReason(reason)
    }
    setDepthEstimate(String(p.extended_depth_estimate ?? 10))
  }

  async function fetchProfile() {
    setLoading(true)
    setFetchError(null)
    setNotFound(false)
    setForbidden(false)
    try {
      const token = await getClerkToken()
      const res = await fetch(`/api/bloodline-profile-get?id=${encodeURIComponent(profileId)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 403) { setForbidden(true); return }
      if (res.status === 404) { setNotFound(true); return }
      if (!res.ok) { setFetchError('Failed to load investigation'); return }
      const data = await res.json()
      setProfile(data.profile)
      setCanWrite(data.canWrite)
      syncReachFromProfile(data.profile)
    } catch {
      setFetchError('Network error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded && hasAccess) { fetchProfile() }
  }, [isLoaded, hasAccess, profileId])

  function startEdit() {
    if (!profile) return
    setEditName(profile.subject_name)
    setEditNotes(profile.notes ?? '')
    setEditStatus(profile.status)
    setSaveError(null)
    setEditing(true)
  }

  async function handleSave() {
    if (!profile || !editName.trim()) return
    setSaving(true)
    setSaveError(null)
    try {
      const token = await getClerkToken()
      const res = await fetch('/api/bloodline-profile-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: profile.id,
          subject_name: editName.trim(),
          notes: editNotes.trim() || null,
          status: editStatus,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setSaveError((err as any).message ?? 'Save failed')
        return
      }
      const data = await res.json()
      setProfile(data.profile)
      setEditing(false)
    } catch {
      setSaveError('Network error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!profile) return
    if (!window.confirm(
      `Delete investigation for ${profile.subject_name}?\n\nThis removes all ancestors, events, oaths, and patterns. Cannot be undone.`
    )) return
    setDeleting(true)
    setDeleteError(null)
    try {
      const token = await getClerkToken()
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
      window.location.href = '/community/bloodline'
    } catch {
      setDeleteError('Network error')
    } finally {
      setDeleting(false)
    }
  }

  async function handleSaveReach() {
    if (!profile) return
    setSavingReach(true)
    setReachSaveError(null)
    setReachSaved(false)

    const flagActive = isIllegitimacy || isRitual
    let reason: string | null = null
    if (isRitual && isIllegitimacy) {
      reason = ritualReason // ritual is more severe
    } else if (isRitual) {
      reason = ritualReason
    } else if (isIllegitimacy) {
      reason = 'illegitimacy'
    }

    const estimate = flagActive ? (parseInt(depthEstimate, 10) || null) : null

    try {
      const token = await getClerkToken()
      const res = await fetch('/api/bloodline-profile-update', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: profile.id,
          extended_depth_flag:     flagActive,
          extended_depth_reason:   reason,
          extended_depth_estimate: estimate,
          discernment_notes:       discernNotes.trim() || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setReachSaveError((err as any).message ?? 'Save failed')
        return
      }
      const data = await res.json()
      setProfile(data.profile)
      syncReachFromProfile(data.profile)
      setReachSaved(true)
      setTimeout(() => setReachSaved(false), 2500)
    } catch {
      setReachSaveError('Network error')
    } finally {
      setSavingReach(false)
    }
  }

  if (!isLoaded) {
    return (
      <CommunitySidebarShell activeItem="Bloodline" userName="..." userTierLabel="..." fillViewport>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: crimson, fontSize: 14, color: DIM }}>
          Verifying access...
        </div>
      </CommunitySidebarShell>
    )
  }

  if (!hasAccess) {
    return (
      <CommunitySidebarShell activeItem="Bloodline" userName={userName} userTierLabel={userTierLabel} fillViewport>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UpgradeGate
            variant="screen"
            requiredTier="general"
            featureName="Bloodline Intelligence Center"
            description="The Bloodline Intelligence Center is available to General tier and above."
            isDark
          />
        </div>
      </CommunitySidebarShell>
    )
  }

  const sc = profile ? statusStyle(profile.status) : null

  return (
    <CommunitySidebarShell activeItem="Bloodline" userName={userName} userTierLabel={userTierLabel} fillViewport>
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        background: BG, padding: '32px 24px', gap: 24,
        maxWidth: 860, margin: '0 auto', width: '100%',
      }}>

        {/* Breadcrumb */}
        <div>
          <a href="/community/bloodline" style={{
            fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em',
            color: DIM, textDecoration: 'none',
          }}>
            ← BLOODLINE
          </a>
        </div>

        {loading && (
          <div style={{ padding: '32px 0', textAlign: 'center', fontFamily: crimson, fontSize: 15, color: DIM, fontStyle: 'italic' }}>
            Loading...
          </div>
        )}

        {fetchError && !loading && (
          <div style={{ fontFamily: crimson, fontSize: 15, color: RED }}>{fetchError}</div>
        )}

        {notFound && (
          <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 6, padding: '40px', textAlign: 'center' }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: DIM, marginBottom: 14 }}>
              INVESTIGATION NOT FOUND
            </div>
            <a href="/community/bloodline" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: GOLD, textDecoration: 'none' }}>
              ← Back to Bloodline
            </a>
          </div>
        )}

        {forbidden && (
          <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 6, padding: '40px', textAlign: 'center' }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: DIM, marginBottom: 12 }}>
              ACCESS DENIED
            </div>
            <p style={{ fontFamily: crimson, fontSize: 15, color: DIM, margin: '0 0 20px', lineHeight: 1.5 }}>
              You don't have access to this investigation.
            </p>
            <a href="/community/bloodline" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: GOLD, textDecoration: 'none' }}>
              ← Back to Bloodline
            </a>
          </div>
        )}

        {profile && !loading && (
          <>
            {/* ── Profile header card ─────────────────────────────────── */}
            <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 6, padding: '24px' }}>
              {!editing ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <h1 style={{ fontFamily: cinzel, fontSize: 22, fontWeight: 700, color: TXT, margin: 0 }}>
                        {profile.subject_name}
                      </h1>
                      {sc && (
                        <span style={{
                          alignSelf: 'flex-start',
                          fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
                          padding: '3px 10px', borderRadius: 3,
                          background: sc.bg, border: `1px solid ${sc.border}`, color: sc.text,
                        }}>
                          {profile.status.toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                      {canWrite && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={startEdit} style={{
                            fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                            padding: '7px 16px', borderRadius: 3, cursor: 'pointer',
                            background: 'rgba(201,168,76,0.1)', border: `1px solid rgba(201,168,76,0.3)`, color: GOLD,
                          }}>
                            EDIT
                          </button>
                          <button onClick={handleDelete} disabled={deleting} style={{
                            fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                            padding: '7px 16px', borderRadius: 3,
                            cursor: deleting ? 'not-allowed' : 'pointer',
                            background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.3)', color: RED,
                          }}>
                            {deleting ? '...' : 'DELETE'}
                          </button>
                        </div>
                      )}
                      {!canWrite && (
                        <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: DIM }}>
                          SHARED WITH YOU (READ-ONLY)
                        </span>
                      )}
                    </div>
                  </div>

                  {profile.notes && (
                    <p style={{ fontFamily: crimson, fontSize: 15, color: DIM, margin: '0 0 12px', fontStyle: 'italic', lineHeight: 1.6 }}>
                      {profile.notes}
                    </p>
                  )}

                  <div style={{ fontFamily: crimson, fontSize: 12, color: DIM }}>
                    Created {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    {profile.updated_at !== profile.created_at && (
                      <> · Updated {new Date(profile.updated_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</>
                    )}
                  </div>

                  {deleteError && (
                    <div style={{ fontFamily: crimson, fontSize: 13, color: RED, marginTop: 10 }}>{deleteError}</div>
                  )}
                </>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: GOLD }}>
                    EDIT INVESTIGATION
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM, marginBottom: 6 }}>SUBJECT NAME *</label>
                    <input value={editName} onChange={e => setEditName(e.target.value)} maxLength={200} style={{
                      width: '100%', boxSizing: 'border-box',
                      background: BG, border: `1px solid ${BDR}`, borderRadius: 4,
                      padding: '9px 12px', fontFamily: crimson, fontSize: 15, color: TXT, outline: 'none',
                    }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM, marginBottom: 6 }}>STATUS</label>
                    <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{
                      background: BG, border: `1px solid ${BDR}`, borderRadius: 4,
                      padding: '9px 12px', fontFamily: crimson, fontSize: 15, color: TXT,
                      outline: 'none', cursor: 'pointer',
                    }}>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM, marginBottom: 6 }}>NOTES</label>
                    <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={4} style={{
                      width: '100%', boxSizing: 'border-box',
                      background: BG, border: `1px solid ${BDR}`, borderRadius: 4,
                      padding: '9px 12px', fontFamily: crimson, fontSize: 15, color: TXT,
                      outline: 'none', resize: 'vertical',
                    }} />
                  </div>

                  {saveError && <div style={{ fontFamily: crimson, fontSize: 14, color: RED }}>{saveError}</div>}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={handleSave} disabled={saving || !editName.trim()} style={{
                      fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', padding: '8px 18px', borderRadius: 3,
                      background: saving || !editName.trim() ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.2)',
                      border: `1px solid rgba(201,168,76,${saving || !editName.trim() ? '0.2' : '0.5'})`,
                      color: saving || !editName.trim() ? 'rgba(201,168,76,0.35)' : GOLD,
                      cursor: saving || !editName.trim() ? 'not-allowed' : 'pointer',
                    }}>
                      {saving ? 'SAVING...' : 'SAVE'}
                    </button>
                    <button onClick={() => setEditing(false)} style={{
                      fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', padding: '8px 18px', borderRadius: 3,
                      background: 'transparent', border: `1px solid ${BDR}`, color: DIM, cursor: 'pointer',
                    }}>
                      CANCEL
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── GENERATIONAL REACH card ─────────────────────────────── */}
            <div style={{
              background: SURF,
              border: `1px solid ${BDR}`,
              borderLeft: `3px solid var(--gold)`,
              borderRadius: 6,
              padding: '22px 24px',
            }}>
              {/* Card header */}
              <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.14em', color: GOLD, marginBottom: 16 }}>
                GENERATIONAL REACH
              </div>

              {/* Current reach display */}
              <div style={{ marginBottom: 20 }}>
                {!profile.extended_depth_flag ? (
                  <div>
                    <div style={{ fontFamily: cinzel, fontSize: 18, fontWeight: 700, color: TXT, marginBottom: 4 }}>
                      4 generations
                    </div>
                    <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, fontStyle: 'italic' }}>
                      Exodus 20:5 — iniquity to the third and fourth generation
                    </div>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 20, fontWeight: 700, color: TXT }}>
                        {profile.extended_depth_estimate ?? '?'} generations
                      </div>
                      {profile.extended_depth_reason && (
                        <span style={{
                          fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
                          padding: '2px 8px', borderRadius: 3,
                          background: 'rgba(201,168,76,0.1)', border: `1px solid rgba(201,168,76,0.25)`, color: GOLD,
                        }}>
                          {reasonLabel(profile.extended_depth_reason).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {reachCite(profile.extended_depth_reason) && (
                      <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, fontStyle: 'italic' }}>
                        {reachCite(profile.extended_depth_reason)}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Edit controls — canWrite only */}
              {canWrite && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, borderTop: `1px solid ${BDR}`, paddingTop: 16 }}>

                  {/* Checkbox 1 — illegitimacy */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isIllegitimacy}
                      onChange={e => {
                        setIsIllegitimacy(e.target.checked)
                        if (e.target.checked && (!depthEstimate || parseInt(depthEstimate, 10) < 10)) {
                          setDepthEstimate('10')
                        }
                      }}
                      style={{ marginTop: 3, accentColor: 'var(--gold)', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: TXT, marginBottom: 2 }}>
                        Illegitimacy known in this bloodline
                      </div>
                      <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic' }}>
                        Deuteronomy 23:2 — extends reach to the tenth generation
                      </div>
                    </div>
                  </label>

                  {/* Checkbox 2 — ritual / molestation */}
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isRitual}
                      onChange={e => setIsRitual(e.target.checked)}
                      style={{ marginTop: 3, accentColor: 'var(--gold)', cursor: 'pointer' }}
                    />
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: TXT, marginBottom: 2 }}>
                        Blood/sex ritual or molestation known
                      </div>
                      <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic' }}>
                        Opens deeper than the default reach — discern the estimate
                      </div>
                    </div>
                  </label>

                  {/* Reason + estimate (visible when either flag active) */}
                  {(isIllegitimacy || isRitual) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingLeft: 24 }}>

                      {isRitual && (
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: DIM, marginBottom: 5 }}>
                            PRIMARY CAUSE
                          </label>
                          <select
                            value={ritualReason}
                            onChange={e => setRitualReason(e.target.value)}
                            style={{
                              background: BG, border: `1px solid ${BDR}`, borderRadius: 4,
                              padding: '8px 12px', fontFamily: crimson, fontSize: 14, color: TXT,
                              outline: 'none', cursor: 'pointer',
                            }}
                          >
                            <option value="blood_ritual">Blood ritual</option>
                            <option value="sex_ritual">Sex ritual</option>
                            <option value="molestation">Molestation</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                      )}

                      <div>
                        <label style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: DIM, marginBottom: 5 }}>
                          ESTIMATED GENERATIONS
                        </label>
                        <input
                          type="number"
                          min={4}
                          value={depthEstimate}
                          onChange={e => setDepthEstimate(e.target.value)}
                          style={{
                            width: 80, background: BG, border: `1px solid ${BDR}`,
                            borderRadius: 4, padding: '8px 12px',
                            fontFamily: crimson, fontSize: 14, color: TXT, outline: 'none',
                          }}
                        />
                        <span style={{ fontFamily: crimson, fontSize: 12, color: DIM, marginLeft: 10 }}>
                          {isIllegitimacy && !isRitual ? 'Deut 23:2 — min 10' : 'Operator-discerned (min 4)'}
                        </span>
                      </div>

                      {isIllegitimacy && isRitual && (
                        <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic' }}>
                          Multiple sources — record the deepest reach. Ritual category stored as primary cause.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Divider before discernment notes */}
                  <div style={{ borderTop: `1px solid ${BDR}`, paddingTop: 14 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM, marginBottom: 6 }}>
                      DISCERNMENT NOTES
                    </div>
                    <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, marginBottom: 8, fontStyle: 'italic' }}>
                      What the Spirit is revealing — outliers, impressions, recurring words or numbers, anything that doesn't fit the documented tree.
                    </div>
                    <textarea
                      value={discernNotes}
                      onChange={e => setDiscernNotes(e.target.value)}
                      rows={4}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        background: BG, border: `1px solid ${BDR}`, borderRadius: 4,
                        padding: '9px 12px', fontFamily: crimson, fontSize: 14, color: TXT,
                        outline: 'none', resize: 'vertical',
                      }}
                    />
                  </div>

                  {reachSaveError && (
                    <div style={{ fontFamily: crimson, fontSize: 13, color: RED }}>{reachSaveError}</div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <button
                      onClick={handleSaveReach}
                      disabled={savingReach}
                      style={{
                        fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                        padding: '8px 18px', borderRadius: 3,
                        background: savingReach ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.18)',
                        border: `1px solid rgba(201,168,76,${savingReach ? '0.2' : '0.45'})`,
                        color: savingReach ? 'rgba(201,168,76,0.35)' : GOLD,
                        cursor: savingReach ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {savingReach ? 'SAVING...' : 'SAVE REACH & NOTES'}
                    </button>
                    {reachSaved && (
                      <span style={{ fontFamily: crimson, fontSize: 13, color: 'var(--gold)', fontStyle: 'italic' }}>
                        Saved.
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Read-only discernment notes — shared users */}
              {!canWrite && (
                <div style={{ borderTop: `1px solid ${BDR}`, paddingTop: 16, marginTop: 4 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM, marginBottom: 8 }}>
                    DISCERNMENT NOTES
                  </div>
                  {profile.discernment_notes ? (
                    <p style={{ fontFamily: crimson, fontSize: 14, color: TXT, margin: 0, lineHeight: 1.7 }}>
                      {profile.discernment_notes}
                    </p>
                  ) : (
                    <p style={{ fontFamily: crimson, fontSize: 14, color: DIM, margin: 0, fontStyle: 'italic' }}>
                      None recorded.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── FAMILY TREE placeholder ─────────────────────────────── */}
            <PlaceholderCard
              title="FAMILY TREE"
              phase="2C.2"
              description="Build the ancestor lineage for this investigation. Map generational patterns, birth countries, occupations, and known spiritual involvements across generations."
            />

            {/* ── BLOODLINE TIMELINE placeholder ─────────────────────── */}
            <PlaceholderCard
              title="BLOODLINE TIMELINE"
              phase="2D"
              description="Track dated events across generations — dedications, oaths, trauma, occult initiations, and significant family milestones."
            />

            {/* ── OATHS & COVENANTS placeholder ──────────────────────── */}
            <PlaceholderCard
              title="OATHS & COVENANTS"
              phase="2D"
              description="Log military oaths, secret society memberships, blood pacts, and dedications. Track renunciation status for each."
            />

            {/* ── RUN INVESTIGATION placeholder ──────────────────────── */}
            <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 6, padding: '20px 24px' }}>
              <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: DIM, marginBottom: 10 }}>
                RUN INVESTIGATION
              </div>
              <p style={{ fontFamily: crimson, fontSize: 15, color: DIM, margin: '0 0 14px', lineHeight: 1.6 }}>
                SOL synthesizes cultural influences, repeating patterns, and ministry prep notes
                from the complete case file.
              </p>
              <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 14 }}>
                COMING IN PHASE 2G
              </div>
              <button disabled style={{
                fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em',
                padding: '10px 22px', borderRadius: 4,
                background: 'rgba(201,168,76,0.05)',
                border: `1px solid rgba(201,168,76,0.15)`,
                color: 'rgba(201,168,76,0.3)',
                cursor: 'not-allowed',
              }}>
                RUN INVESTIGATION
              </button>
            </div>
          </>
        )}
      </div>
    </CommunitySidebarShell>
  )
}

function PlaceholderCard({ title, phase, description }: {
  title: string
  phase: string
  description: string
}) {
  return (
    <div style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '20px 24px' }}>
      <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: DIM, marginBottom: 8 }}>
        {title}
      </div>
      <p style={{ fontFamily: crimson, fontSize: 15, color: DIM, margin: '0 0 10px', lineHeight: 1.6 }}>
        {description}
      </p>
      <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM }}>
        COMING IN PHASE {phase}
      </div>
    </div>
  )
}
