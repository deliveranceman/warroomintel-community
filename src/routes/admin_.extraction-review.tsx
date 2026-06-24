import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { getAccessLevel } from '@/lib/access'
import { AdminNav } from '../components/admin/AdminNav'

export const Route = createFileRoute('/admin_/extraction-review')({
  component: ExtractionReviewPage,
})

const PAGE_BG   = '#EDEBE2'
const CARD_BG   = '#FFFFFF'
const BORDER    = '#E5E0D5'
const GOLD      = '#8B6914'
const GOLD_DEEP = '#604408'
const TEXT      = '#1a1a1a'
const MUTED     = '#6b6b6b'
const cinzel    = 'Cinzel, serif'
const crimson   = '"Crimson Pro", serif'

type Candidate = {
  id: string
  target_table: string
  confidence: string
  status: string
  source_name: string | null
  source_id: string | null
  payload: Record<string, any>
  created_at: string
}

type TaggedItem = {
  type: string
  text: string
  source_excerpt: string
  scripture: string | null
}

const ITEM_TYPE_ORDER = ['doctrine', 'manifestation', 'testimony', 'prayer', 'teaching']

function tableLabel(t: string): string {
  if (t === 'curses')             return 'Curses'
  if (t === 'cultural_dossiers')  return 'Cultural Roots'
  if (t === 'secret_societies')   return 'Societies'
  return t
}

function confidenceColor(c: string): { bg: string; border: string; color: string } {
  if (c === 'high')   return { bg: 'rgba(34,197,94,0.1)',  border: 'rgba(34,197,94,0.35)',  color: '#166534' }
  if (c === 'medium') return { bg: 'rgba(234,179,8,0.1)',  border: 'rgba(234,179,8,0.35)',  color: '#854D0E' }
  return               { bg: 'rgba(107,114,128,0.1)', border: 'rgba(107,114,128,0.3)', color: '#374151' }
}

const labelSty: React.CSSProperties = {
  display: 'block', fontFamily: cinzel, fontSize: 9,
  letterSpacing: '0.1em', color: GOLD_DEEP, marginBottom: 4,
  textTransform: 'uppercase',
}
const valueSty: React.CSSProperties = {
  fontFamily: crimson, fontSize: 14, color: TEXT, lineHeight: 1.6,
  whiteSpace: 'pre-wrap',
}
const mutedValueSty: React.CSSProperties = { ...valueSty, color: MUTED }
const fieldSty: React.CSSProperties = { marginBottom: 14 }

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={fieldSty}>
      <span style={labelSty}>{label}</span>
      <div style={valueSty}>{value}</div>
    </div>
  )
}

function TaggedItemsSection({
  items,
  open,
  onToggle,
}: {
  items: TaggedItem[]
  open: boolean
  onToggle: () => void
}) {
  if (!items || items.length === 0) return null

  const grouped: Record<string, TaggedItem[]> = {}
  for (const item of items) {
    const key = item.type || 'other'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }

  const orderedKeys = [
    ...ITEM_TYPE_ORDER.filter(k => grouped[k]),
    ...Object.keys(grouped).filter(k => !ITEM_TYPE_ORDER.includes(k)),
  ]

  return (
    <div style={{ marginTop: 12, borderTop: `1px solid ${BORDER}`, paddingTop: 10 }}>
      <button
        onClick={onToggle}
        style={{
          fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em',
          color: GOLD, background: 'transparent', border: 'none',
          cursor: 'pointer', padding: 0, textTransform: 'uppercase',
        }}
      >
        {open ? '▾' : '▸'} Tagged Items ({items.length})
      </button>
      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orderedKeys.map(type => (
            <div key={type}>
              <div style={{
                fontFamily: cinzel, fontSize: 8, letterSpacing: '0.12em',
                color: MUTED, textTransform: 'uppercase', marginBottom: 6,
              }}>
                {type}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grouped[type].map((item, i) => (
                  <div key={i} style={{
                    background: '#F9F7F2', border: `1px solid ${BORDER}`,
                    borderRadius: 4, padding: '8px 12px',
                  }}>
                    <div style={{ fontFamily: crimson, fontSize: 14, color: TEXT, lineHeight: 1.55 }}>
                      {item.text}
                    </div>
                    {item.scripture && (
                      <div style={{ fontFamily: crimson, fontSize: 12, color: GOLD, marginTop: 4, fontStyle: 'italic' }}>
                        {item.scripture}
                      </div>
                    )}
                    {item.source_excerpt && (
                      <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 4, fontStyle: 'italic' }}>
                        &ldquo;{item.source_excerpt}&rdquo;
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CurseCard({ c, onApprove, onReject }: {
  c: Candidate
  onApprove: () => void
  onReject: () => void
}) {
  const [open, setOpen] = useState(false)
  const p = c.payload
  const tagged: TaggedItem[] = Array.isArray(p.tagged_items) ? p.tagged_items : []
  const conf = confidenceColor(c.confidence)

  return (
    <div style={{
      background: CARD_BG, border: `1px solid ${BORDER}`,
      borderRadius: 6, padding: '20px 22px',
    }}>
      {/* Card header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 15, fontWeight: 600, color: GOLD_DEEP, letterSpacing: '0.04em' }}>
            {p.name || '(unnamed)'}
            {p.aka && (
              <span style={{ fontFamily: crimson, fontWeight: 400, fontSize: 14, color: MUTED, marginLeft: 8 }}>
                aka {p.aka}
              </span>
            )}
          </div>
          {c.source_name && (
            <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 2 }}>
              From: {c.source_name}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{
            fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
            padding: '3px 8px', borderRadius: 3,
            background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color,
          }}>
            {c.confidence}
          </span>
          <span style={{
            fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
            padding: '3px 8px', borderRadius: 3,
            background: 'rgba(139,105,20,0.08)', border: `1px solid rgba(139,105,20,0.2)`, color: GOLD,
          }}>
            curse
          </span>
        </div>
      </div>

      {/* Fields */}
      <FieldRow label="Origin" value={p.origin_description} />
      <FieldRow label="How It Enters" value={p.how_it_enters} />
      <FieldRow label="Manifestations" value={p.manifestations} />
      <FieldRow label="Scripture Refs" value={p.scripture_refs} />
      <FieldRow label="Generational Depth" value={p.generational_depth_note} />
      <FieldRow label="Forgiveness Focus" value={p.forgiveness_focus} />
      <FieldRow label="Breaking Prayer" value={p.breaking_prayer} />

      {/* Suggested linkage hint */}
      {(p.suggested_cultural_root || p.suggested_society) && (
        <div style={{
          fontFamily: crimson, fontSize: 12, color: MUTED, fontStyle: 'italic',
          background: '#F5F2EA', border: `1px solid ${BORDER}`, borderRadius: 4,
          padding: '6px 10px', marginBottom: 12,
        }}>
          Suggested link:{' '}
          {[p.suggested_cultural_root, p.suggested_society].filter(Boolean).join(' / ')}
          {' '}— set via the curse edit form after approval.
        </div>
      )}

      <TaggedItemsSection items={tagged} open={open} onToggle={() => setOpen(x => !x)} />

      <CardActions onApprove={onApprove} onReject={onReject} />
    </div>
  )
}

function DossierCard({ c, onApprove, onReject }: {
  c: Candidate
  onApprove: () => void
  onReject: () => void
}) {
  const p = c.payload
  const conf = confidenceColor(c.confidence)
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 15, fontWeight: 600, color: GOLD_DEEP, letterSpacing: '0.04em' }}>
            {p.culture_name || '(unnamed)'}
          </div>
          {c.source_name && (
            <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 2 }}>From: {c.source_name}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color }}>
            {c.confidence}
          </span>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: 'rgba(139,105,20,0.08)', border: `1px solid rgba(139,105,20,0.2)`, color: GOLD }}>
            cultural root
          </span>
        </div>
      </div>
      <FieldRow label="Description" value={p.description} />
      <FieldRow label="Historical Practices" value={p.historical_practices} />
      <FieldRow label="Religious Influences" value={p.religious_influences} />
      <FieldRow label="Folk Magic" value={p.folk_magic} />
      <FieldRow label="Pagan Practices" value={p.pagan_practices} />
      <FieldRow label="Secret Societies" value={p.secret_societies} />
      <FieldRow label="Known Oaths" value={p.known_oaths} />
      <FieldRow label="Known Rituals" value={p.known_rituals} />
      {(p.source_book || p.source_author) && (
        <div style={{ ...fieldSty }}>
          <span style={labelSty}>Source</span>
          <div style={mutedValueSty}>
            {[p.source_book, p.source_author, p.source_page].filter(Boolean).join(' — ')}
          </div>
        </div>
      )}
      <CardActions onApprove={onApprove} onReject={onReject} />
    </div>
  )
}

function SocietyCard({ c, onApprove, onReject }: {
  c: Candidate
  onApprove: () => void
  onReject: () => void
}) {
  const p = c.payload
  const conf = confidenceColor(c.confidence)
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 15, fontWeight: 600, color: GOLD_DEEP, letterSpacing: '0.04em' }}>
            {p.name || '(unnamed)'}
          </div>
          {c.source_name && (
            <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 2 }}>From: {c.source_name}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color }}>
            {c.confidence}
          </span>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: 'rgba(139,105,20,0.08)', border: `1px solid rgba(139,105,20,0.2)`, color: GOLD }}>
            society
          </span>
        </div>
      </div>
      <FieldRow label="History" value={p.history} />
      <FieldRow label="Known Oaths" value={p.known_oaths} />
      <FieldRow label="Known Symbols" value={p.known_symbols} />
      <FieldRow label="Known Degrees" value={p.known_degrees} />
      <FieldRow label="Scriptures" value={p.scriptures} />
      <FieldRow label="Ministry Considerations" value={p.ministry_considerations} />
      {(p.source_book || p.source_author) && (
        <div style={fieldSty}>
          <span style={labelSty}>Source</span>
          <div style={mutedValueSty}>
            {[p.source_book, p.source_author, p.source_page].filter(Boolean).join(' — ')}
          </div>
        </div>
      )}
      <CardActions onApprove={onApprove} onReject={onReject} />
    </div>
  )
}

function GenericCard({ c, onApprove, onReject }: {
  c: Candidate
  onApprove: () => void
  onReject: () => void
}) {
  const conf = confidenceColor(c.confidence)
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 13, fontWeight: 600, color: GOLD_DEEP }}>
            {c.target_table}
          </div>
          {c.source_name && (
            <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 2 }}>From: {c.source_name}</div>
          )}
        </div>
        <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color }}>
          {c.confidence}
        </span>
      </div>
      <pre style={{ fontFamily: crimson, fontSize: 12, color: MUTED, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {JSON.stringify(c.payload, null, 2)}
      </pre>
      <CardActions onApprove={onApprove} onReject={onReject} />
    </div>
  )
}

function CardActions({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
      <button
        onClick={onApprove}
        style={{
          fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em',
          padding: '7px 18px', borderRadius: 3, cursor: 'pointer',
          background: GOLD_DEEP, border: `1px solid ${GOLD_DEEP}`, color: '#FFFFFF',
        }}
      >
        APPROVE
      </button>
      <button
        onClick={onReject}
        style={{
          fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em',
          padding: '7px 18px', borderRadius: 3, cursor: 'pointer',
          background: 'transparent', border: '1px solid #FCA5A5', color: '#991B1B',
        }}
      >
        REJECT
      </button>
    </div>
  )
}

function ExtractionReviewPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken } = useAuth()

  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading]       = useState(true)
  const [listError, setListError]   = useState<string | null>(null)
  const [activeFilter, setActive]   = useState<string | null>(null)
  const [toast, setToast]           = useState<string | null>(null)
  const [acting, setActing]         = useState<string | null>(null)

  const tier    = (user?.publicMetadata as any)?.tier as string | undefined
  const role    = (user?.publicMetadata as any)?.role as string | undefined
  const isAdmin = isLoaded && isSignedIn && getAccessLevel({ tier, role }) >= 4

  useEffect(() => {
    if (!isAdmin) return
    loadCandidates()
  }, [isAdmin])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  async function loadCandidates() {
    setLoading(true)
    setListError(null)
    try {
      const token = await getToken()
      const resp = await fetch('/api/admin-extraction-candidates', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error(`Status ${resp.status}`)
      const data = await resp.json()
      setCandidates(data.candidates ?? [])
    } catch (err: any) {
      setListError(String(err?.message ?? err))
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(c: Candidate) {
    const label = tableLabel(c.target_table)
    const name  = c.payload?.name || c.payload?.culture_name || c.target_table
    if (!window.confirm(`Approve "${name}" and write to ${label}?\n\nThis cannot be undone.`)) return

    setActing(c.id)
    try {
      const token = await getToken()
      const resp = await fetch('/api/admin-extraction-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'approve', id: c.id }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        setToast(`Error: ${(err as any).error ?? 'approve failed'}`)
        return
      }
      setCandidates(prev => prev.filter(x => x.id !== c.id))
      setToast(`Approved — written to ${label}`)
    } catch (err: any) {
      setToast(`Error: ${String(err?.message ?? err)}`)
    } finally {
      setActing(null)
    }
  }

  async function handleReject(c: Candidate) {
    const name = c.payload?.name || c.payload?.culture_name || c.target_table
    const reason = window.prompt(`Reject "${name}"?\n\nEnter a short reason (optional):`)
    if (reason === null) return  // user cancelled

    setActing(c.id)
    try {
      const token = await getToken()
      const resp = await fetch('/api/admin-extraction-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'reject', id: c.id, rejection_reason: reason }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        setToast(`Error: ${(err as any).error ?? 'reject failed'}`)
        return
      }
      setCandidates(prev => prev.filter(x => x.id !== c.id))
      setToast('Candidate rejected')
    } catch (err: any) {
      setToast(`Error: ${String(err?.message ?? err)}`)
    } finally {
      setActing(null)
    }
  }

  // Derive distinct target_table values from loaded candidates
  const distinctTables = Array.from(new Set(candidates.map(c => c.target_table))).sort()

  const visible = activeFilter
    ? candidates.filter(c => c.target_table === activeFilter)
    : candidates

  if (!isLoaded) {
    return (
      <div style={{ minHeight: '100vh', background: PAGE_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: crimson, color: MUTED, fontSize: 14 }}>
        Verifying access...
      </div>
    )
  }
  if (!isSignedIn || !isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: PAGE_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 420, background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 32, textAlign: 'center' }}>
          <div style={{ fontFamily: cinzel, fontSize: 14, fontWeight: 600, color: GOLD_DEEP, letterSpacing: '0.15em', marginBottom: 12 }}>
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
      <AdminNav current="extraction-review" />

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 16, right: 16, zIndex: 9999,
          background: CARD_BG, border: `1px solid ${BORDER}`,
          borderRadius: 5, padding: '10px 16px',
          fontFamily: crimson, fontSize: 14, color: TEXT,
          boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
          maxWidth: 320,
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: cinzel, fontSize: 26, fontWeight: 600, color: GOLD_DEEP, margin: 0, letterSpacing: '0.05em' }}>
            EXTRACTION REVIEW
          </h1>
          <p style={{ fontFamily: crimson, fontSize: 15, color: MUTED, margin: '6px 0 0', lineHeight: 1.5 }}>
            Review and approve AI-extracted candidates before they enter the reference tables.
          </p>
        </div>

        {/* Error banner */}
        {listError && (
          <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: 4, padding: '8px 12px', marginBottom: 20, fontFamily: crimson, fontSize: 13, color: '#991B1B' }}>
            Failed to load candidates: {listError}
          </div>
        )}

        {/* Pills */}
        {!loading && candidates.length > 0 && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
            <button
              onClick={() => setActive(null)}
              style={{
                fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em',
                padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                background:   activeFilter === null ? GOLD_DEEP : 'transparent',
                border:       `1px solid ${activeFilter === null ? GOLD_DEEP : BORDER}`,
                color:        activeFilter === null ? '#FFFFFF' : MUTED,
              }}
            >
              All ({candidates.length})
            </button>
            {distinctTables.map(t => {
              const count = candidates.filter(c => c.target_table === t).length
              const active = activeFilter === t
              return (
                <button
                  key={t}
                  onClick={() => setActive(t)}
                  style={{
                    fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em',
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    background: active ? GOLD_DEEP : 'transparent',
                    border:     `1px solid ${active ? GOLD_DEEP : BORDER}`,
                    color:      active ? '#FFFFFF' : MUTED,
                  }}
                >
                  {tableLabel(t)} ({count})
                </button>
              )
            })}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ fontFamily: crimson, fontSize: 14, color: MUTED, padding: 32, textAlign: 'center' }}>
            Loading…
          </div>
        )}

        {/* Empty state */}
        {!loading && candidates.length === 0 && !listError && (
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, color: GOLD_DEEP, letterSpacing: '0.12em', marginBottom: 10 }}>
              NO PENDING CANDIDATES
            </div>
            <p style={{ fontFamily: crimson, fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.6 }}>
              No pending candidates. Run a Research Drop to extract some.
            </p>
          </div>
        )}

        {/* Cards */}
        {!loading && visible.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {acting && (
              <div style={{ fontFamily: crimson, fontSize: 13, color: MUTED, textAlign: 'center', padding: 8 }}>
                Working…
              </div>
            )}
            {visible.map(c => {
              if (c.target_table === 'curses') {
                return (
                  <CurseCard
                    key={c.id}
                    c={c}
                    onApprove={() => handleApprove(c)}
                    onReject={() => handleReject(c)}
                  />
                )
              }
              if (c.target_table === 'cultural_dossiers') {
                return (
                  <DossierCard
                    key={c.id}
                    c={c}
                    onApprove={() => handleApprove(c)}
                    onReject={() => handleReject(c)}
                  />
                )
              }
              if (c.target_table === 'secret_societies') {
                return (
                  <SocietyCard
                    key={c.id}
                    c={c}
                    onApprove={() => handleApprove(c)}
                    onReject={() => handleReject(c)}
                  />
                )
              }
              return (
                <GenericCard
                  key={c.id}
                  c={c}
                  onApprove={() => handleApprove(c)}
                  onReject={() => handleReject(c)}
                />
              )
            })}
          </div>
        )}

      </div>
    </div>
  )
}
