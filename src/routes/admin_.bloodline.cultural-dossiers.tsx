import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { getAccessLevel } from '@/lib/access'
import { AdminNav } from '../components/admin/AdminNav'

export const Route = createFileRoute('/admin_/bloodline/cultural-dossiers')({
  component: CulturalDossiersPage,
})

const PAGE_BG   = '#EDEBE2'
const CARD_BG   = '#FFFFFF'
const FORM_BG   = '#F5F2EA'
const BORDER    = '#E5E0D5'
const GOLD      = '#8B6914'
const GOLD_DEEP = '#604408'
const TEXT      = '#1a1a1a'
const MUTED     = '#6b6b6b'
const cinzel    = 'Cinzel, serif'
const crimson   = '"Crimson Pro", serif'

type Dossier = {
  id: string
  culture_name: string
  description: string | null
  historical_practices: string | null
  religious_influences: string | null
  folk_magic: string | null
  secret_societies: string | null
  pagan_practices: string | null
  known_oaths: string | null
  known_rituals: string | null
  source_book: string | null
  source_author: string | null
  source_page: string | null
  created_at: string
  updated_at: string
}

type Draft = {
  culture_name: string
  description: string
  historical_practices: string
  religious_influences: string
  folk_magic: string
  secret_societies: string
  pagan_practices: string
  known_oaths: string
  known_rituals: string
  source_book: string
  source_author: string
  source_page: string
}

const EMPTY_DRAFT: Draft = {
  culture_name: '', description: '', historical_practices: '',
  religious_influences: '', folk_magic: '', secret_societies: '',
  pagan_practices: '', known_oaths: '', known_rituals: '',
  source_book: '', source_author: '', source_page: '',
}

const inputSty: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '9px 12px', fontFamily: crimson, fontSize: 15,
  background: CARD_BG, border: `1px solid ${BORDER}`,
  borderRadius: 4, color: TEXT, outline: 'none',
}
const textareaSty: React.CSSProperties = {
  ...inputSty, resize: 'vertical' as const, lineHeight: 1.55,
}
const labelSty: React.CSSProperties = {
  display: 'block', fontFamily: cinzel, fontSize: 9,
  letterSpacing: '0.1em', color: GOLD_DEEP, marginBottom: 5,
  textTransform: 'uppercase' as const,
}
const sectionHeadSty: React.CSSProperties = {
  fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em',
  color: MUTED, marginBottom: 12, paddingBottom: 6,
  borderBottom: `1px solid ${BORDER}`,
}

function CulturalDossiersPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken } = useAuth()

  const [dossiers, setDossiers]     = useState<Dossier[]>([])
  const [loading, setLoading]       = useState(true)
  const [listError, setListError]   = useState<string | null>(null)

  const [mode, setMode]             = useState<'list' | 'form'>('list')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [draft, setDraft]           = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving]         = useState(false)
  const [saveError, setSaveError]   = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const tier    = (user?.publicMetadata as any)?.tier as string | undefined
  const role    = (user?.publicMetadata as any)?.role as string | undefined
  const isAdmin = isLoaded && isSignedIn && getAccessLevel({ tier, role }) >= 4

  useEffect(() => {
    if (!isAdmin) return
    loadDossiers()
  }, [isAdmin])

  async function loadDossiers() {
    setLoading(true)
    setListError(null)
    try {
      const token = await getToken()
      const resp = await fetch('/api/admin-cultural-dossiers', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error(`Status ${resp.status}`)
      const data = await resp.json()
      setDossiers(data.dossiers ?? [])
    } catch (err: any) {
      setListError(String(err?.message ?? err))
    } finally {
      setLoading(false)
    }
  }

  function set(field: keyof Draft, value: string) {
    setDraft(p => ({ ...p, [field]: value }))
  }

  function startCreate() {
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setSaveError(null)
    setMode('form')
  }

  function startEdit(d: Dossier) {
    setEditingId(d.id)
    setDraft({
      culture_name:         d.culture_name,
      description:          d.description ?? '',
      historical_practices: d.historical_practices ?? '',
      religious_influences: d.religious_influences ?? '',
      folk_magic:           d.folk_magic ?? '',
      secret_societies:     d.secret_societies ?? '',
      pagan_practices:      d.pagan_practices ?? '',
      known_oaths:          d.known_oaths ?? '',
      known_rituals:        d.known_rituals ?? '',
      source_book:          d.source_book ?? '',
      source_author:        d.source_author ?? '',
      source_page:          d.source_page ?? '',
    })
    setSaveError(null)
    setMode('form')
  }

  function cancelForm() {
    setMode('list')
    setEditingId(null)
    setDraft(EMPTY_DRAFT)
    setSaveError(null)
  }

  async function handleSave() {
    if (!draft.culture_name.trim()) { setSaveError('Culture name is required'); return }
    setSaving(true)
    setSaveError(null)
    try {
      const token = await getToken()
      const body: Record<string, unknown> = { ...draft, action: 'upsert' }
      if (editingId) body.id = editingId
      const resp = await fetch('/api/admin-cultural-dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        setSaveError((err as any).message ?? 'Save failed')
        return
      }
      await loadDossiers()
      cancelForm()
    } catch (err: any) {
      setSaveError(String(err?.message ?? err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete cultural dossier for "${name}"?\n\nThis cannot be undone.`)) return
    setDeletingId(id)
    try {
      const token = await getToken()
      const resp = await fetch('/api/admin-cultural-dossiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'delete', id }),
      })
      if (!resp.ok) return
      setDossiers(prev => prev.filter(d => d.id !== id))
    } catch {
      // silent — list refetched on next load
    } finally {
      setDeletingId(null)
    }
  }

  if (!isLoaded) {
    return (
      <div style={{
        minHeight: '100vh', background: PAGE_BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: crimson, color: MUTED, fontSize: 14,
      }}>
        Verifying access...
      </div>
    )
  }
  if (!isSignedIn || !isAdmin) {
    return (
      <div style={{
        minHeight: '100vh', background: PAGE_BG,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
        <div style={{
          maxWidth: 420, background: CARD_BG, border: `1px solid ${BORDER}`,
          borderRadius: 6, padding: 32, textAlign: 'center',
        }}>
          <div style={{
            fontFamily: cinzel, fontSize: 14, fontWeight: 600,
            color: GOLD_DEEP, letterSpacing: '0.15em', marginBottom: 12,
          }}>
            ⚔ ACCESS DENIED
          </div>
          <p style={{ fontFamily: crimson, fontSize: 15, color: TEXT, margin: '0 0 20px', lineHeight: 1.5 }}>
            This area is restricted to authorized personnel.
          </p>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 12, color: GOLD, textDecoration: 'none', letterSpacing: '0.1em' }}>
            &larr; Return to Community
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG }}>
      <AdminNav current="cultural-dossiers" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: cinzel, fontSize: 28, fontWeight: 600, color: GOLD_DEEP, margin: 0, letterSpacing: '0.05em' }}>
              CULTURAL DOSSIERS
            </h1>
            <p style={{ fontFamily: crimson, fontSize: 15, color: MUTED, margin: '6px 0 0' }}>
              Heritage / cultural-root reference library
            </p>
          </div>
          {mode === 'list' && (
            <button
              onClick={startCreate}
              style={{
                fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em',
                padding: '9px 20px', borderRadius: 4, cursor: 'pointer',
                background: GOLD_DEEP, border: `1px solid ${GOLD_DEEP}`,
                color: '#FFFFFF',
              }}
            >
              + ADD DOSSIER
            </button>
          )}
        </div>

        {/* Error banner (list load) */}
        {listError && (
          <div style={{
            background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 4,
            padding: '8px 12px', marginBottom: 20,
            fontFamily: crimson, fontSize: 13, color: '#991B1B',
          }}>
            Failed to load dossiers: {listError}
          </div>
        )}

        {/* ── FORM ──────────────────────────────────────────────────────────── */}
        {mode === 'form' && (
          <div style={{
            background: FORM_BG, border: `1px solid ${BORDER}`,
            borderRadius: 6, padding: '28px 28px 24px', marginBottom: 32,
          }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: GOLD_DEEP, marginBottom: 24 }}>
              {editingId ? 'EDIT DOSSIER' : 'NEW DOSSIER'}
            </div>

            {/* IDENTITY */}
            <div style={{ marginBottom: 22 }}>
              <div style={sectionHeadSty}>IDENTITY</div>
              <div>
                <label style={labelSty}>Culture Name *</label>
                <input
                  value={draft.culture_name}
                  onChange={e => set('culture_name', e.target.value)}
                  placeholder="e.g. Ancient Babylonian, Celtic, Yoruba…"
                  style={inputSty}
                />
              </div>
            </div>

            {/* PRACTICES */}
            <div style={{ marginBottom: 22 }}>
              <div style={sectionHeadSty}>PRACTICES</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelSty}>Description</label>
                  <textarea value={draft.description} onChange={e => set('description', e.target.value)} rows={4} style={textareaSty} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelSty}>Historical Practices</label>
                    <textarea value={draft.historical_practices} onChange={e => set('historical_practices', e.target.value)} rows={3} style={textareaSty} />
                  </div>
                  <div>
                    <label style={labelSty}>Religious Influences</label>
                    <textarea value={draft.religious_influences} onChange={e => set('religious_influences', e.target.value)} rows={3} style={textareaSty} />
                  </div>
                  <div>
                    <label style={labelSty}>Folk Magic</label>
                    <textarea value={draft.folk_magic} onChange={e => set('folk_magic', e.target.value)} rows={3} style={textareaSty} />
                  </div>
                  <div>
                    <label style={labelSty}>Pagan Practices</label>
                    <textarea value={draft.pagan_practices} onChange={e => set('pagan_practices', e.target.value)} rows={3} style={textareaSty} />
                  </div>
                </div>
              </div>
            </div>

            {/* OATHS & RITUALS */}
            <div style={{ marginBottom: 22 }}>
              <div style={sectionHeadSty}>OATHS &amp; RITUALS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelSty}>Secret Societies</label>
                  <textarea value={draft.secret_societies} onChange={e => set('secret_societies', e.target.value)} rows={2} style={textareaSty} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelSty}>Known Oaths</label>
                    <textarea value={draft.known_oaths} onChange={e => set('known_oaths', e.target.value)} rows={3} style={textareaSty} />
                  </div>
                  <div>
                    <label style={labelSty}>Known Rituals</label>
                    <textarea value={draft.known_rituals} onChange={e => set('known_rituals', e.target.value)} rows={3} style={textareaSty} />
                  </div>
                </div>
              </div>
            </div>

            {/* SOURCE */}
            <div style={{ marginBottom: 24 }}>
              <div style={sectionHeadSty}>SOURCE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelSty}>Source Book</label>
                  <input value={draft.source_book} onChange={e => set('source_book', e.target.value)} style={inputSty} />
                </div>
                <div>
                  <label style={labelSty}>Source Author</label>
                  <input value={draft.source_author} onChange={e => set('source_author', e.target.value)} style={inputSty} />
                </div>
                <div>
                  <label style={labelSty}>Source Page</label>
                  <input value={draft.source_page} onChange={e => set('source_page', e.target.value)} style={inputSty} />
                </div>
              </div>
            </div>

            {saveError && (
              <div style={{
                background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 4,
                padding: '8px 12px', marginBottom: 14,
                fontFamily: crimson, fontSize: 13, color: '#991B1B',
              }}>
                {saveError}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em',
                  padding: '9px 22px', borderRadius: 4,
                  background: saving ? '#C5B89A' : GOLD_DEEP,
                  border: `1px solid ${saving ? '#C5B89A' : GOLD_DEEP}`,
                  color: '#FFFFFF', cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? 'SAVING…' : (editingId ? 'UPDATE' : 'CREATE')}
              </button>
              <button
                onClick={cancelForm}
                style={{
                  fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em',
                  padding: '9px 22px', borderRadius: 4,
                  background: 'transparent', border: `1px solid ${BORDER}`,
                  color: MUTED, cursor: 'pointer',
                }}
              >
                CANCEL
              </button>
            </div>
          </div>
        )}

        {/* ── LIST ──────────────────────────────────────────────────────────── */}
        {!loading && dossiers.length === 0 && !listError && mode !== 'form' && (
          <div style={{
            background: CARD_BG, border: `1px solid ${BORDER}`,
            borderRadius: 6, padding: '48px 32px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, color: GOLD_DEEP, letterSpacing: '0.12em', marginBottom: 10 }}>
              NO DOSSIERS YET
            </div>
            <p style={{ fontFamily: crimson, fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.6 }}>
              No cultural dossiers yet. Add the first to begin building the heritage reference library.
            </p>
          </div>
        )}

        {loading && (
          <div style={{ fontFamily: crimson, fontSize: 14, color: MUTED, padding: 32, textAlign: 'center' }}>
            Loading…
          </div>
        )}

        {!loading && dossiers.length > 0 && (
          <div>
            <div style={{
              fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUTED,
              marginBottom: 12,
            }}>
              {dossiers.length} {dossiers.length === 1 ? 'DOSSIER' : 'DOSSIERS'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {dossiers.map(d => (
                <div
                  key={d.id}
                  style={{
                    background: CARD_BG, border: `1px solid ${BORDER}`,
                    borderRadius: 5, padding: '14px 18px',
                    display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 13, fontWeight: 600, color: GOLD_DEEP, letterSpacing: '0.04em' }}>
                      {d.culture_name}
                    </div>
                    {(d.source_book || d.source_author) && (
                      <div style={{ fontFamily: crimson, fontSize: 13, color: MUTED, marginTop: 3 }}>
                        {[d.source_book, d.source_author].filter(Boolean).join(' — ')}
                      </div>
                    )}
                    <div style={{ fontFamily: crimson, fontSize: 11, color: MUTED, marginTop: 2 }}>
                      Updated {new Date(d.updated_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => startEdit(d)}
                      style={{
                        fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                        padding: '6px 14px', borderRadius: 3, cursor: 'pointer',
                        background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD,
                      }}
                    >
                      EDIT
                    </button>
                    <button
                      onClick={() => handleDelete(d.id, d.culture_name)}
                      disabled={deletingId === d.id}
                      style={{
                        fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                        padding: '6px 14px', borderRadius: 3,
                        cursor: deletingId === d.id ? 'not-allowed' : 'pointer',
                        background: 'transparent',
                        border: '1px solid #FCA5A5',
                        color: '#991B1B',
                        opacity: deletingId === d.id ? 0.5 : 1,
                      }}
                    >
                      {deletingId === d.id ? '…' : 'DEL'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
