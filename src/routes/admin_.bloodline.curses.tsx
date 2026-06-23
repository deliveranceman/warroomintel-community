import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { getAccessLevel } from '@/lib/access'
import { AdminNav } from '../components/admin/AdminNav'

export const Route = createFileRoute('/admin_/bloodline/curses')({
  component: CursesPage,
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

type Curse = {
  id: string
  name: string
  aka: string | null
  cultural_dossier_id: string | null
  secret_society_id: string | null
  origin_description: string | null
  how_it_enters: string | null
  manifestations: string | null
  scripture_refs: string | null
  breaking_prayer: string | null
  source_book: string | null
  source_author: string | null
  source_page: string | null
  created_at: string
  updated_at: string
}

type Draft = {
  name: string
  aka: string
  cultural_dossier_id: string
  secret_society_id: string
  origin_description: string
  how_it_enters: string
  manifestations: string
  scripture_refs: string
  breaking_prayer: string
  source_book: string
  source_author: string
  source_page: string
}

type LinkItem = { id: string; label: string }

const EMPTY_DRAFT: Draft = {
  name: '', aka: '', cultural_dossier_id: '', secret_society_id: '',
  origin_description: '', how_it_enters: '',
  manifestations: '', scripture_refs: '', breaking_prayer: '',
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
const selectSty: React.CSSProperties = {
  ...inputSty, cursor: 'pointer', appearance: 'auto' as const,
}
const labelSty: React.CSSProperties = {
  display: 'block', fontFamily: cinzel, fontSize: 9,
  letterSpacing: '0.1em', color: GOLD_DEEP, marginBottom: 5,
  textTransform: 'uppercase' as const,
}
const hintSty: React.CSSProperties = {
  fontFamily: crimson, fontSize: 12, color: MUTED,
  fontStyle: 'italic', marginTop: 4,
}
const sectionHeadSty: React.CSSProperties = {
  fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em',
  color: MUTED, marginBottom: 12, paddingBottom: 6,
  borderBottom: `1px solid ${BORDER}`,
}

function CursesPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken } = useAuth()

  const [curses, setCurses]          = useState<Curse[]>([])
  const [loading, setLoading]        = useState(true)
  const [listError, setListError]    = useState<string | null>(null)

  const [dossiers, setDossiers]      = useState<LinkItem[]>([])
  const [societies, setSocieties]    = useState<LinkItem[]>([])

  const [mode, setMode]              = useState<'list' | 'form'>('list')
  const [editingId, setEditingId]    = useState<string | null>(null)
  const [draft, setDraft]            = useState<Draft>(EMPTY_DRAFT)
  const [saving, setSaving]          = useState(false)
  const [saveError, setSaveError]    = useState<string | null>(null)
  const [deletingId, setDeletingId]  = useState<string | null>(null)

  const tier    = (user?.publicMetadata as any)?.tier as string | undefined
  const role    = (user?.publicMetadata as any)?.role as string | undefined
  const isAdmin = isLoaded && isSignedIn && getAccessLevel({ tier, role }) >= 4

  useEffect(() => {
    if (!isAdmin) return
    loadAll()
  }, [isAdmin])

  async function loadAll() {
    const token = await getToken()
    const headers = { Authorization: `Bearer ${token}` }
    await Promise.all([
      loadCurses(token),
      fetch('/api/admin-cultural-dossiers', { headers })
        .then(r => r.ok ? r.json() : { dossiers: [] })
        .then(d => setDossiers((d.dossiers ?? []).map((x: any) => ({ id: x.id, label: x.culture_name })))),
      fetch('/api/admin-secret-societies', { headers })
        .then(r => r.ok ? r.json() : { societies: [] })
        .then(d => setSocieties((d.societies ?? []).map((x: any) => ({ id: x.id, label: x.name })))),
    ])
  }

  async function loadCurses(token?: string | null) {
    setLoading(true)
    setListError(null)
    try {
      const t = token ?? await getToken()
      const resp = await fetch('/api/admin-curses', {
        headers: { Authorization: `Bearer ${t}` },
      })
      if (!resp.ok) throw new Error(`Status ${resp.status}`)
      const data = await resp.json()
      setCurses(data.curses ?? [])
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

  function startEdit(c: Curse) {
    setEditingId(c.id)
    setDraft({
      name:                c.name,
      aka:                 c.aka ?? '',
      cultural_dossier_id: c.cultural_dossier_id ?? '',
      secret_society_id:   c.secret_society_id ?? '',
      origin_description:  c.origin_description ?? '',
      how_it_enters:       c.how_it_enters ?? '',
      manifestations:      c.manifestations ?? '',
      scripture_refs:      c.scripture_refs ?? '',
      breaking_prayer:     c.breaking_prayer ?? '',
      source_book:         c.source_book ?? '',
      source_author:       c.source_author ?? '',
      source_page:         c.source_page ?? '',
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
    if (!draft.name.trim()) { setSaveError('Name is required'); return }
    setSaving(true)
    setSaveError(null)
    try {
      const token = await getToken()
      const body: Record<string, unknown> = { ...draft, action: 'upsert' }
      if (editingId) body.id = editingId
      const resp = await fetch('/api/admin-curses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        setSaveError((err as any).message ?? 'Save failed')
        return
      }
      await loadCurses()
      cancelForm()
    } catch (err: any) {
      setSaveError(String(err?.message ?? err))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete curse "${name}"?\n\nThis cannot be undone.`)) return
    setDeletingId(id)
    try {
      const token = await getToken()
      const resp = await fetch('/api/admin-curses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'delete', id }),
      })
      if (!resp.ok) return
      setCurses(prev => prev.filter(c => c.id !== id))
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
      <AdminNav current="curses" />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: cinzel, fontSize: 28, fontWeight: 600, color: GOLD_DEEP, margin: 0, letterSpacing: '0.05em' }}>
              CURSES
            </h1>
            <p style={{ fontFamily: crimson, fontSize: 15, color: MUTED, margin: '6px 0 0' }}>
              Named-curse reference library — origin, entry, manifestations, and breaking prayer
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
              + ADD CURSE
            </button>
          )}
        </div>

        {/* Error banner */}
        {listError && (
          <div style={{
            background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 4,
            padding: '8px 12px', marginBottom: 20,
            fontFamily: crimson, fontSize: 13, color: '#991B1B',
          }}>
            Failed to load curses: {listError}
          </div>
        )}

        {/* ── FORM ──────────────────────────────────────────────────────────── */}
        {mode === 'form' && (
          <div style={{
            background: FORM_BG, border: `1px solid ${BORDER}`,
            borderRadius: 6, padding: '28px 28px 24px', marginBottom: 32,
          }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: GOLD_DEEP, marginBottom: 24 }}>
              {editingId ? 'EDIT CURSE' : 'NEW CURSE'}
            </div>

            {/* IDENTITY */}
            <div style={{ marginBottom: 22 }}>
              <div style={sectionHeadSty}>IDENTITY</div>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelSty}>Name *</label>
                  <input
                    value={draft.name}
                    onChange={e => set('name', e.target.value)}
                    placeholder="e.g. Curse of Poverty, Generational Infirmity…"
                    style={inputSty}
                  />
                </div>
                <div>
                  <label style={labelSty}>Also Known As</label>
                  <input
                    value={draft.aka}
                    onChange={e => set('aka', e.target.value)}
                    placeholder="Alternate names or aliases"
                    style={inputSty}
                  />
                </div>
              </div>
            </div>

            {/* ORIGIN & ENTRY */}
            <div style={{ marginBottom: 22 }}>
              <div style={sectionHeadSty}>ORIGIN &amp; ENTRY</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelSty}>Origin Description</label>
                  <textarea value={draft.origin_description} onChange={e => set('origin_description', e.target.value)} rows={4} style={textareaSty} />
                </div>
                <div>
                  <label style={labelSty}>How It Enters</label>
                  <textarea value={draft.how_it_enters} onChange={e => set('how_it_enters', e.target.value)} rows={4} style={textareaSty} />
                </div>
              </div>
            </div>

            {/* OPERATION */}
            <div style={{ marginBottom: 22 }}>
              <div style={sectionHeadSty}>OPERATION</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelSty}>Manifestations</label>
                  <textarea value={draft.manifestations} onChange={e => set('manifestations', e.target.value)} rows={4} style={textareaSty} />
                </div>
                <div>
                  <label style={labelSty}>Scripture References</label>
                  <textarea value={draft.scripture_refs} onChange={e => set('scripture_refs', e.target.value)} rows={4} style={textareaSty} />
                </div>
              </div>
            </div>

            {/* MINISTRY */}
            <div style={{ marginBottom: 22 }}>
              <div style={sectionHeadSty}>MINISTRY</div>
              <div>
                <label style={labelSty}>Breaking Prayer</label>
                <textarea value={draft.breaking_prayer} onChange={e => set('breaking_prayer', e.target.value)} rows={5} style={textareaSty} />
              </div>
            </div>

            {/* LINKAGE */}
            <div style={{ marginBottom: 22 }}>
              <div style={sectionHeadSty}>LINKAGE</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelSty}>Cultural Root (optional)</label>
                  <select value={draft.cultural_dossier_id} onChange={e => set('cultural_dossier_id', e.target.value)} style={selectSty}>
                    <option value="">None</option>
                    {dossiers.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                  {dossiers.length === 0 && (
                    <p style={hintSty}>No cultural dossiers yet — create one under Cultural Dossiers.</p>
                  )}
                </div>
                <div>
                  <label style={labelSty}>Originating Society (optional)</label>
                  <select value={draft.secret_society_id} onChange={e => set('secret_society_id', e.target.value)} style={selectSty}>
                    <option value="">None</option>
                    {societies.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </select>
                  {societies.length === 0 && (
                    <p style={hintSty}>No secret societies yet — create one under Secret Societies.</p>
                  )}
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
        {!loading && curses.length === 0 && !listError && mode !== 'form' && (
          <div style={{
            background: CARD_BG, border: `1px solid ${BORDER}`,
            borderRadius: 6, padding: '48px 32px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, color: GOLD_DEEP, letterSpacing: '0.12em', marginBottom: 10 }}>
              NO CURSES RECORDED YET
            </div>
            <p style={{ fontFamily: crimson, fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.6 }}>
              No curses recorded yet. Add the first to begin building the named-curse reference library.
            </p>
          </div>
        )}

        {loading && (
          <div style={{ fontFamily: crimson, fontSize: 14, color: MUTED, padding: 32, textAlign: 'center' }}>
            Loading…
          </div>
        )}

        {!loading && curses.length > 0 && (
          <div>
            <div style={{
              fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUTED,
              marginBottom: 12,
            }}>
              {curses.length} {curses.length === 1 ? 'CURSE' : 'CURSES'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {curses.map(c => {
                const linkedDossier  = c.cultural_dossier_id ? dossiers.find(d => d.id === c.cultural_dossier_id) : null
                const linkedSociety  = c.secret_society_id   ? societies.find(s => s.id === c.secret_society_id)  : null
                return (
                  <div
                    key={c.id}
                    style={{
                      background: CARD_BG, border: `1px solid ${BORDER}`,
                      borderRadius: 5, padding: '14px 18px',
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', gap: 12,
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 13, fontWeight: 600, color: GOLD_DEEP, letterSpacing: '0.04em' }}>
                        {c.name}
                        {c.aka && (
                          <span style={{ fontFamily: crimson, fontSize: 13, fontWeight: 400, color: MUTED, marginLeft: 8 }}>
                            aka {c.aka}
                          </span>
                        )}
                      </div>
                      {(linkedDossier || linkedSociety) && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                          {linkedDossier && (
                            <span style={{
                              fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em',
                              padding: '2px 7px', borderRadius: 3,
                              background: 'rgba(139,105,20,0.1)', border: `1px solid rgba(139,105,20,0.25)`,
                              color: GOLD,
                            }}>
                              {linkedDossier.label}
                            </span>
                          )}
                          {linkedSociety && (
                            <span style={{
                              fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em',
                              padding: '2px 7px', borderRadius: 3,
                              background: 'rgba(139,105,20,0.1)', border: `1px solid rgba(139,105,20,0.25)`,
                              color: GOLD,
                            }}>
                              {linkedSociety.label}
                            </span>
                          )}
                        </div>
                      )}
                      {(c.source_book || c.source_author) && (
                        <div style={{ fontFamily: crimson, fontSize: 13, color: MUTED, marginTop: 3 }}>
                          {[c.source_book, c.source_author].filter(Boolean).join(' — ')}
                        </div>
                      )}
                      <div style={{ fontFamily: crimson, fontSize: 11, color: MUTED, marginTop: 2 }}>
                        Updated {new Date(c.updated_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                      <button
                        onClick={() => startEdit(c)}
                        style={{
                          fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                          padding: '6px 14px', borderRadius: 3, cursor: 'pointer',
                          background: 'transparent', border: `1px solid ${GOLD}`, color: GOLD,
                        }}
                      >
                        EDIT
                      </button>
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        disabled={deletingId === c.id}
                        style={{
                          fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                          padding: '6px 14px', borderRadius: 3,
                          cursor: deletingId === c.id ? 'not-allowed' : 'pointer',
                          background: 'transparent',
                          border: '1px solid #FCA5A5',
                          color: '#991B1B',
                          opacity: deletingId === c.id ? 0.5 : 1,
                        }}
                      >
                        {deletingId === c.id ? '…' : 'DEL'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
