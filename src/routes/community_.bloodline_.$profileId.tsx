import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-start'
import { useState, useEffect, type CSSProperties } from 'react'
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

type AncestorRow = {
  id: string
  profile_id: string
  name: string | null
  gender: string | null
  generation: number | null
  parent_lineage: string | null
  birth_country: string | null
  birth_year: number | null
  death_year: number | null
  occupation: string | null
  religion: string | null
  military_service: string | null
  secret_societies: string[] | null
  known_trauma: string | null
  abuse: string | null
  addiction: string | null
  suicide: boolean
  occult_involvement: string | null
  freemasonry_degree: number | null
  lodge_membership: string | null
  notes: string | null
  unknown_fields: string[] | null
  created_at: string
  updated_at: string
}

type AncestorDraft = {
  name: string; gender: string; generation: string; parent_lineage: string
  birth_country: string; birth_year: string; death_year: string
  occupation: string; religion: string; military_service: string
  secret_societies: string; known_trauma: string; abuse: string
  addiction: string; suicide: boolean; occult_involvement: string
  freemasonry_degree: string; lodge_membership: string; notes: string
  unknown_fields: string
}

const EMPTY_DRAFT: AncestorDraft = {
  name: '', gender: '', generation: '', parent_lineage: '',
  birth_country: '', birth_year: '', death_year: '',
  occupation: '', religion: '', military_service: '',
  secret_societies: '', known_trauma: '', abuse: '', addiction: '',
  suicide: false, occult_involvement: '', freemasonry_degree: '',
  lodge_membership: '', notes: '', unknown_fields: '',
}

const GEN_HEADER: Record<number, string> = {
  0: 'SUBJECT',
  1: 'GENERATION 1 — PARENTS',
  2: 'GENERATION 2 — GRANDPARENTS',
  3: 'GENERATION 3 — GREAT-GRANDPARENTS',
  4: 'GENERATION 4 — GREAT-GREAT-GRANDPARENTS',
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

  // Ancestor state
  const [ancestors, setAncestors]               = useState<AncestorRow[]>([])
  const [ancestorLoading, setAncestorLoading]   = useState(false)
  const [ancestorError, setAncestorError]       = useState<string | null>(null)
  const [showAncestorForm, setShowAncestorForm] = useState(false)
  const [editingAncestorId, setEditingAncestorId] = useState<string | null>(null)
  const [ancestorDraft, setAncestorDraft]       = useState<AncestorDraft>(EMPTY_DRAFT)
  const [ancestorSaving, setAncestorSaving]     = useState(false)
  const [ancestorSaveError, setAncestorSaveError] = useState<string | null>(null)
  const [deletingAncestorId, setDeletingAncestorId] = useState<string | null>(null)

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

  function parseIntOrNull(s: string): number | null {
    const n = parseInt(s, 10)
    return isNaN(n) ? null : n
  }

  function csvToArray(s: string): string[] | null {
    const arr = s.split(',').map(x => x.trim()).filter(Boolean)
    return arr.length ? arr : null
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

  async function fetchAncestors(pid: string) {
    setAncestorLoading(true)
    setAncestorError(null)
    try {
      const token = await getClerkToken()
      const res = await fetch(`/api/bloodline-ancestor-list?profile_id=${encodeURIComponent(pid)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) { setAncestorError('Failed to load ancestors'); return }
      const data = await res.json()
      setAncestors(data.ancestors ?? [])
    } catch {
      setAncestorError('Network error')
    } finally {
      setAncestorLoading(false)
    }
  }

  useEffect(() => {
    if (isLoaded && hasAccess) { fetchProfile() }
  }, [isLoaded, hasAccess, profileId])

  useEffect(() => {
    if (profile?.id) fetchAncestors(profile.id)
  }, [profile?.id])

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

  function startAddAncestor() {
    setEditingAncestorId(null)
    setAncestorDraft(EMPTY_DRAFT)
    setAncestorSaveError(null)
    setShowAncestorForm(true)
  }

  function startEditAncestor(a: AncestorRow) {
    setEditingAncestorId(a.id)
    setAncestorDraft({
      name: a.name ?? '',
      gender: a.gender ?? '',
      generation: a.generation !== null ? String(a.generation) : '',
      parent_lineage: a.parent_lineage ?? '',
      birth_country: a.birth_country ?? '',
      birth_year: a.birth_year !== null ? String(a.birth_year) : '',
      death_year: a.death_year !== null ? String(a.death_year) : '',
      occupation: a.occupation ?? '',
      religion: a.religion ?? '',
      military_service: a.military_service ?? '',
      secret_societies: (a.secret_societies ?? []).join(', '),
      known_trauma: a.known_trauma ?? '',
      abuse: a.abuse ?? '',
      addiction: a.addiction ?? '',
      suicide: a.suicide,
      occult_involvement: a.occult_involvement ?? '',
      freemasonry_degree: a.freemasonry_degree !== null ? String(a.freemasonry_degree) : '',
      lodge_membership: a.lodge_membership ?? '',
      notes: a.notes ?? '',
      unknown_fields: (a.unknown_fields ?? []).join(', '),
    })
    setAncestorSaveError(null)
    setShowAncestorForm(true)
  }

  function cancelAncestorForm() {
    setShowAncestorForm(false)
    setEditingAncestorId(null)
    setAncestorDraft(EMPTY_DRAFT)
    setAncestorSaveError(null)
  }

  async function handleAncestorSubmit() {
    if (!profile?.id) return
    setAncestorSaving(true)
    setAncestorSaveError(null)
    const isEdit = editingAncestorId !== null
    const payload: Record<string, unknown> = {
      profile_id: profile.id,
      name: ancestorDraft.name.trim() || null,
      gender: ancestorDraft.gender || null,
      generation: parseIntOrNull(ancestorDraft.generation),
      parent_lineage: ancestorDraft.parent_lineage || null,
      birth_country: ancestorDraft.birth_country.trim() || null,
      birth_year: parseIntOrNull(ancestorDraft.birth_year),
      death_year: parseIntOrNull(ancestorDraft.death_year),
      occupation: ancestorDraft.occupation.trim() || null,
      religion: ancestorDraft.religion.trim() || null,
      military_service: ancestorDraft.military_service.trim() || null,
      secret_societies: csvToArray(ancestorDraft.secret_societies),
      known_trauma: ancestorDraft.known_trauma.trim() || null,
      abuse: ancestorDraft.abuse || null,
      addiction: ancestorDraft.addiction.trim() || null,
      suicide: ancestorDraft.suicide,
      occult_involvement: ancestorDraft.occult_involvement.trim() || null,
      freemasonry_degree: parseIntOrNull(ancestorDraft.freemasonry_degree),
      lodge_membership: ancestorDraft.lodge_membership.trim() || null,
      notes: ancestorDraft.notes.trim() || null,
      unknown_fields: csvToArray(ancestorDraft.unknown_fields),
    }
    if (isEdit) payload.id = editingAncestorId
    try {
      const token = await getClerkToken()
      const url = isEdit ? '/api/bloodline-ancestor-update' : '/api/bloodline-ancestor-add'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setAncestorSaveError((err as any).message ?? 'Save failed')
        return
      }
      const data = await res.json()
      if (isEdit) {
        setAncestors(prev => prev.map(a => a.id === editingAncestorId ? data.ancestor : a))
      } else {
        setAncestors(prev => [...prev, data.ancestor])
      }
      cancelAncestorForm()
    } catch {
      setAncestorSaveError('Network error')
    } finally {
      setAncestorSaving(false)
    }
  }

  async function handleAncestorDelete(id: string) {
    if (!window.confirm('Remove this ancestor from the record?')) return
    setDeletingAncestorId(id)
    try {
      const token = await getClerkToken()
      const res = await fetch('/api/bloodline-ancestor-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) return
      setAncestors(prev => prev.filter(a => a.id !== id))
    } catch {
      // network error — list stays as-is
    } finally {
      setDeletingAncestorId(null)
    }
  }

  if (!isLoaded) {
    return (
      <CommunitySidebarShell activeItem="Bloodline" userName="..." userTierLabel="...">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: crimson, fontSize: 14, color: DIM }}>
          Verifying access...
        </div>
      </CommunitySidebarShell>
    )
  }

  if (!hasAccess) {
    return (
      <CommunitySidebarShell activeItem="Bloodline" userName={userName} userTierLabel={userTierLabel}>
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

  const inputSty: CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: SURF, border: `1px solid ${BDR}`, borderRadius: 4,
    padding: '8px 10px', fontFamily: crimson, fontSize: 14, color: TXT, outline: 'none',
  }
  const selectSty: CSSProperties = {
    width: '100%', background: SURF, border: `1px solid ${BDR}`, borderRadius: 4,
    padding: '8px 10px', fontFamily: crimson, fontSize: 14, color: TXT, outline: 'none', cursor: 'pointer',
  }
  const textareaSty: CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: SURF, border: `1px solid ${BDR}`, borderRadius: 4,
    padding: '8px 10px', fontFamily: crimson, fontSize: 14, color: TXT, outline: 'none', resize: 'vertical',
  }

  const sc = profile ? statusStyle(profile.status) : null

  return (
    <CommunitySidebarShell activeItem="Bloodline" userName={userName} userTierLabel={userTierLabel}>
      <div style={{
        minHeight: '100dvh', paddingBottom: 40,
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

            {/* ── FAMILY TREE card ─────────────────────────────────────── */}
            <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 6, overflow: 'hidden' }}>
              {/* header row */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '18px 24px', borderBottom: `1px solid ${BDR}`,
              }}>
                <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.14em', color: GOLD }}>
                  FAMILY TREE
                </div>
                {canWrite && !showAncestorForm && (
                  <button onClick={startAddAncestor} style={{
                    fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                    padding: '6px 14px', borderRadius: 3, cursor: 'pointer',
                    background: 'rgba(201,168,76,0.1)', border: `1px solid rgba(201,168,76,0.3)`, color: GOLD,
                  }}>
                    + ADD ANCESTOR
                  </button>
                )}
              </div>

              <div style={{ padding: '20px 24px' }}>

                {/* ancestor form */}
                {showAncestorForm && (
                  <div style={{ marginBottom: 24, padding: '18px', background: BG, border: `1px solid ${BDR}`, borderRadius: 5 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: GOLD, marginBottom: 16 }}>
                      {editingAncestorId ? 'EDIT ANCESTOR' : 'NEW ANCESTOR'}
                    </div>

                    {/* Identity */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: DIM, marginBottom: 8 }}>IDENTITY</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>NAME</label>
                          <input value={ancestorDraft.name} onChange={e => setAncestorDraft(p => ({ ...p, name: e.target.value }))} style={inputSty} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>GENDER</label>
                            <select value={ancestorDraft.gender} onChange={e => setAncestorDraft(p => ({ ...p, gender: e.target.value }))} style={selectSty}>
                              <option value="">—</option>
                              <option value="M">Male</option>
                              <option value="F">Female</option>
                              <option value="unknown">Unknown</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>GENERATION</label>
                            <select value={ancestorDraft.generation} onChange={e => setAncestorDraft(p => ({ ...p, generation: e.target.value }))} style={selectSty}>
                              <option value="">—</option>
                              <option value="0">0 — Subject</option>
                              <option value="1">1 — Parents</option>
                              <option value="2">2 — Grandparents</option>
                              <option value="3">3 — Great-grandparents</option>
                              <option value="4">4 — Great-great</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>LINEAGE</label>
                            <select value={ancestorDraft.parent_lineage} onChange={e => setAncestorDraft(p => ({ ...p, parent_lineage: e.target.value }))} style={selectSty}>
                              <option value="">—</option>
                              <option value="paternal">Paternal</option>
                              <option value="maternal">Maternal</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Life Context */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: DIM, marginBottom: 8 }}>LIFE CONTEXT</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 8 }}>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>BIRTH COUNTRY</label>
                          <input value={ancestorDraft.birth_country} onChange={e => setAncestorDraft(p => ({ ...p, birth_country: e.target.value }))} style={inputSty} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>BIRTH YEAR</label>
                          <input type="number" value={ancestorDraft.birth_year} onChange={e => setAncestorDraft(p => ({ ...p, birth_year: e.target.value }))} style={inputSty} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>DEATH YEAR</label>
                          <input type="number" value={ancestorDraft.death_year} onChange={e => setAncestorDraft(p => ({ ...p, death_year: e.target.value }))} style={inputSty} />
                        </div>
                      </div>
                    </div>

                    {/* Background */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: DIM, marginBottom: 8 }}>BACKGROUND</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>OCCUPATION</label>
                          <input value={ancestorDraft.occupation} onChange={e => setAncestorDraft(p => ({ ...p, occupation: e.target.value }))} style={inputSty} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>RELIGION</label>
                          <input value={ancestorDraft.religion} onChange={e => setAncestorDraft(p => ({ ...p, religion: e.target.value }))} style={inputSty} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>MILITARY SERVICE</label>
                          <input value={ancestorDraft.military_service} onChange={e => setAncestorDraft(p => ({ ...p, military_service: e.target.value }))} style={inputSty} />
                        </div>
                      </div>
                    </div>

                    {/* Spiritual */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: DIM, marginBottom: 8 }}>SPIRITUAL INVOLVEMENT</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>OCCULT INVOLVEMENT</label>
                          <textarea value={ancestorDraft.occult_involvement} onChange={e => setAncestorDraft(p => ({ ...p, occult_involvement: e.target.value }))} rows={2} style={textareaSty} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 8 }}>
                          <div>
                            <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>MASONRY DEGREE</label>
                            <input type="number" value={ancestorDraft.freemasonry_degree} onChange={e => setAncestorDraft(p => ({ ...p, freemasonry_degree: e.target.value }))} style={inputSty} />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>LODGE MEMBERSHIP</label>
                            <input value={ancestorDraft.lodge_membership} onChange={e => setAncestorDraft(p => ({ ...p, lodge_membership: e.target.value }))} style={inputSty} />
                          </div>
                        </div>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>SECRET SOCIETIES (comma-separated)</label>
                          <input value={ancestorDraft.secret_societies} onChange={e => setAncestorDraft(p => ({ ...p, secret_societies: e.target.value }))} style={inputSty} />
                        </div>
                      </div>
                    </div>

                    {/* Wounds */}
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: DIM, marginBottom: 8 }}>WOUNDS & PATTERNS</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>KNOWN TRAUMA</label>
                          <textarea value={ancestorDraft.known_trauma} onChange={e => setAncestorDraft(p => ({ ...p, known_trauma: e.target.value }))} rows={2} style={textareaSty} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                          <div>
                            <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>ABUSE</label>
                            <select value={ancestorDraft.abuse} onChange={e => setAncestorDraft(p => ({ ...p, abuse: e.target.value }))} style={selectSty}>
                              <option value="">—</option>
                              <option value="received">Received</option>
                              <option value="perpetrated">Perpetrated</option>
                              <option value="both">Both</option>
                              <option value="unknown">Unknown</option>
                            </select>
                          </div>
                          <div>
                            <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>ADDICTION</label>
                            <input value={ancestorDraft.addiction} onChange={e => setAncestorDraft(p => ({ ...p, addiction: e.target.value }))} style={inputSty} />
                          </div>
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                          <input type="checkbox" checked={ancestorDraft.suicide} onChange={e => setAncestorDraft(p => ({ ...p, suicide: e.target.checked }))} style={{ accentColor: 'var(--gold)', cursor: 'pointer' }} />
                          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: TXT }}>SUICIDE IN HISTORY</span>
                        </label>
                      </div>
                    </div>

                    {/* Research */}
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: DIM, marginBottom: 8 }}>RESEARCH NOTES</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>NOTES</label>
                          <textarea value={ancestorDraft.notes} onChange={e => setAncestorDraft(p => ({ ...p, notes: e.target.value }))} rows={3} style={textareaSty} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, marginBottom: 4 }}>UNKNOWN FIELDS (comma-separated)</label>
                          <input value={ancestorDraft.unknown_fields} onChange={e => setAncestorDraft(p => ({ ...p, unknown_fields: e.target.value }))} style={inputSty} />
                        </div>
                      </div>
                    </div>

                    {ancestorSaveError && (
                      <div style={{ fontFamily: crimson, fontSize: 13, color: RED, marginBottom: 10 }}>{ancestorSaveError}</div>
                    )}

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={handleAncestorSubmit} disabled={ancestorSaving} style={{
                        fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', padding: '8px 18px', borderRadius: 3,
                        background: ancestorSaving ? 'rgba(201,168,76,0.08)' : 'rgba(201,168,76,0.2)',
                        border: `1px solid rgba(201,168,76,${ancestorSaving ? '0.2' : '0.5'})`,
                        color: ancestorSaving ? 'rgba(201,168,76,0.35)' : GOLD,
                        cursor: ancestorSaving ? 'not-allowed' : 'pointer',
                      }}>
                        {ancestorSaving ? 'SAVING...' : (editingAncestorId ? 'UPDATE' : 'ADD')}
                      </button>
                      <button onClick={cancelAncestorForm} style={{
                        fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', padding: '8px 18px', borderRadius: 3,
                        background: 'transparent', border: `1px solid ${BDR}`, color: DIM, cursor: 'pointer',
                      }}>
                        CANCEL
                      </button>
                    </div>
                  </div>
                )}

                {ancestorError && (
                  <div style={{ fontFamily: crimson, fontSize: 14, color: RED, marginBottom: 12 }}>{ancestorError}</div>
                )}

                {ancestorLoading && (
                  <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', padding: '20px 0', textAlign: 'center' }}>
                    Loading ancestors...
                  </div>
                )}

                {!ancestorLoading && !ancestorError && ancestors.length === 0 && !showAncestorForm && (
                  <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', padding: '24px 0', textAlign: 'center' }}>
                    No ancestors recorded.{canWrite ? ' Use ADD ANCESTOR to begin.' : ''}
                  </div>
                )}

                {!ancestorLoading && ancestors.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                    {([0, 1, 2, 3, 4, null] as (number | null)[]).map(gen => {
                      const group = ancestors.filter(a => a.generation === gen)
                      if (group.length === 0) return null
                      return (
                        <div key={String(gen)}>
                          <div style={{
                            fontFamily: cinzel, fontSize: 8, letterSpacing: '0.12em', color: DIM,
                            marginBottom: 8, paddingBottom: 6, borderBottom: `1px solid ${BDR}`,
                          }}>
                            {gen !== null ? (GEN_HEADER[gen] ?? `GENERATION ${gen}`) : 'UNKNOWN GENERATION'}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {group.map(a => (
                              <AncestorRowCard
                                key={a.id}
                                ancestor={a}
                                canWrite={canWrite}
                                deleting={deletingAncestorId === a.id}
                                onEdit={() => startEditAncestor(a)}
                                onDelete={() => handleAncestorDelete(a.id)}
                              />
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

              </div>
            </div>

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

function AncestorRowCard({
  ancestor: a,
  canWrite,
  deleting,
  onEdit,
  onDelete,
}: {
  ancestor: AncestorRow
  canWrite: boolean
  deleting: boolean
  onEdit: () => void
  onDelete: () => void
}) {
  const badges: { label: string; color: string }[] = []
  if (a.occult_involvement) badges.push({ label: 'OCCULT', color: RED })
  if (a.freemasonry_degree !== null) badges.push({ label: `MASONRY °${a.freemasonry_degree}`, color: GOLD })
  if (a.suicide) badges.push({ label: 'SUICIDE', color: RED })
  if (a.abuse) badges.push({ label: 'ABUSE', color: RED })
  if (a.addiction) badges.push({ label: 'ADDICTION', color: DIM })

  const lifeContext = [
    a.parent_lineage ? (a.parent_lineage === 'paternal' ? 'Paternal' : 'Maternal') : null,
    a.birth_country || null,
    a.birth_year && a.death_year
      ? `${a.birth_year}–${a.death_year}`
      : a.birth_year ? `b. ${a.birth_year}`
      : a.death_year ? `d. ${a.death_year}` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div style={{
      background: SURF2, border: `1px solid ${BDR}`, borderRadius: 4, padding: '12px 16px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: lifeContext || a.occupation ? 4 : 0, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: cinzel, fontSize: 11, fontWeight: 600, color: TXT }}>
            {a.name || '(unnamed)'}
          </span>
          {a.gender && (
            <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: DIM }}>
              {a.gender === 'M' ? 'M' : a.gender === 'F' ? 'F' : '?'}
            </span>
          )}
        </div>
        {lifeContext && (
          <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, marginBottom: 2 }}>
            {lifeContext}
          </div>
        )}
        {a.occupation && (
          <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic', marginBottom: badges.length ? 4 : 0 }}>
            {a.occupation}
          </div>
        )}
        {badges.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {badges.map(b => (
              <span key={b.label} style={{
                fontFamily: cinzel, fontSize: 7, letterSpacing: '0.06em',
                padding: '2px 7px', borderRadius: 3,
                background: b.color === RED
                  ? 'rgba(192,57,43,0.1)'
                  : b.color === GOLD
                  ? 'rgba(201,168,76,0.1)'
                  : 'rgba(107,97,105,0.12)',
                border: b.color === RED
                  ? '1px solid rgba(192,57,43,0.3)'
                  : b.color === GOLD
                  ? '1px solid rgba(201,168,76,0.25)'
                  : '1px solid rgba(107,97,105,0.2)',
                color: b.color,
              }}>
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
      {canWrite && (
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button onClick={onEdit} style={{
            fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em',
            padding: '5px 10px', borderRadius: 3, cursor: 'pointer',
            background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.25)`, color: GOLD,
          }}>
            EDIT
          </button>
          <button onClick={onDelete} disabled={deleting} style={{
            fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em',
            padding: '5px 10px', borderRadius: 3,
            cursor: deleting ? 'not-allowed' : 'pointer',
            background: 'rgba(192,57,43,0.07)', border: '1px solid rgba(192,57,43,0.25)', color: RED,
            opacity: deleting ? 0.5 : 1,
          }}>
            {deleting ? '...' : 'DEL'}
          </button>
        </div>
      )}
    </div>
  )
}
