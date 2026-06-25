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

// ── Shared types ────────────────────────────────────────────────────────────

type Candidate = {
  id: string
  target_table: string
  confidence: string
  status: string
  source_name: string | null
  source_id: string | null
  payload: Record<string, any>
  created_at: string
  existing_record?: Record<string, any> | null
  parent_condition_exists?: boolean
}

type TaggedItem = {
  type: string
  text: string
  source_excerpt: string
  scripture: string | null
}

// ── Condition-card local state types ────────────────────────────────────────

type CondItemDraft = {
  type: string
  content: string
  source_excerpt?: string
}

type SpiritLinkDraft = {
  spirit_name: string
  relationship: string
  note: string
}

type RegionLinkDraft = {
  region_label: string
  relevance: string
}

type ConditionDraft = {
  condition_key: string
  display_name: string
  system: string
  system_key: string
  source_strength: number
  source_note: string
  symptoms: string
  author_conclusion: string
  enriched_overview: string
  tagsText: string
  is_enrichment: boolean
  tagged_items: CondItemDraft[]
  proposed_spirit_links: SpiritLinkDraft[]
  proposed_region_links: RegionLinkDraft[]
}

type AnatomyRegion = {
  region_key: string
  display_name: string
  category: string
  body_side: string | null
  view: string | null
}

function seedDraft(p: Record<string, any>): ConditionDraft {
  const rawTags: string[] = Array.isArray(p.spiritual_tags) ? p.spiritual_tags : []
  return {
    condition_key:    p.condition_key    ?? '',
    display_name:     p.display_name     ?? '',
    system:           p.system           ?? '',
    system_key:       p.system_key       ?? '',
    source_strength:  typeof p.source_strength === 'number' ? p.source_strength : 3,
    source_note:      p.source_note      ?? '',
    symptoms:         p.symptoms         ?? '',
    author_conclusion: p.author_conclusion ?? '',
    enriched_overview: p.enriched_overview ?? '',
    tagsText:         rawTags.join(', '),
    is_enrichment:    p.is_enrichment === true,
    tagged_items:     Array.isArray(p.tagged_items)
      ? p.tagged_items.map((i: any) => ({ type: i.type ?? '', content: i.content ?? '', source_excerpt: i.source_excerpt }))
      : [],
    proposed_spirit_links: Array.isArray(p.proposed_spirit_links)
      ? p.proposed_spirit_links.map((l: any) => ({ spirit_name: l.spirit_name ?? '', relationship: l.relationship ?? 'associated', note: l.note ?? '' }))
      : [],
    proposed_region_links: Array.isArray(p.proposed_region_links)
      ? p.proposed_region_links.map((l: any) => ({ region_label: l.region_label ?? '', relevance: l.relevance ?? 'medium' }))
      : [],
  }
}

function normalizeTags(text: string): string[] {
  return [...new Set(
    text.split(/[,\n]/).map(t => t.toLowerCase().replace(/_/g, '-').trim()).filter(Boolean)
  )]
}

function draftToPayload(draft: ConditionDraft): Record<string, any> {
  return {
    condition_key:         draft.condition_key,
    display_name:          draft.display_name,
    system:                draft.system || undefined,
    system_key:            draft.system_key || undefined,
    source_strength:       draft.source_strength,
    source_note:           draft.source_note || undefined,
    symptoms:              draft.symptoms || undefined,
    author_conclusion:     draft.author_conclusion || undefined,
    enriched_overview:     draft.enriched_overview || undefined,
    spiritual_tags:        normalizeTags(draft.tagsText),
    tagged_items:          draft.tagged_items,
    proposed_spirit_links: draft.proposed_spirit_links.filter(l => l.spirit_name.trim()),
    proposed_region_links: draft.proposed_region_links.filter(l => l.region_label.trim()),
    is_enrichment:         draft.is_enrichment,
  }
}

// ── Shared style helpers ────────────────────────────────────────────────────

const ITEM_TYPE_ORDER = ['doctrine', 'manifestation', 'testimony', 'prayer', 'teaching']
const COND_ITEM_TYPE_ORDER = ['spiritual_root', 'physiological', 'symptom', 'teaching', 'scripture', 'prayer', 'testimony']

function tableLabel(t: string): string {
  if (t === 'curses')                 return 'Curses'
  if (t === 'cultural_dossiers')      return 'Cultural Roots'
  if (t === 'secret_societies')       return 'Societies'
  if (t === 'conditions')             return 'Conditions'
  if (t === 'condition_region_links') return 'Region Placements'
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

const inputSty: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 11px', fontFamily: crimson, fontSize: 14,
  background: CARD_BG, border: `1px solid ${BORDER}`,
  borderRadius: 4, color: TEXT, outline: 'none',
}
const textareaSty: React.CSSProperties = {
  ...inputSty, resize: 'vertical' as const, lineHeight: 1.55,
}
const selectSty: React.CSSProperties = {
  ...inputSty, cursor: 'pointer', appearance: 'auto' as const, padding: '7px 11px',
}
const sectionHeadSty: React.CSSProperties = {
  fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em',
  color: MUTED, marginBottom: 10, paddingBottom: 5,
  borderBottom: `1px solid ${BORDER}`,
}

// ── Shared read-only field ────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div style={fieldSty}>
      <span style={labelSty}>{label}</span>
      <div style={valueSty}>{value}</div>
    </div>
  )
}

// ── TaggedItemsSection (read-only, bloodline cards) ─────────────────────────

function TaggedItemsSection({
  items, open, onToggle,
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
        style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: GOLD, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, textTransform: 'uppercase' }}
      >
        {open ? '▾' : '▸'} Tagged Items ({items.length})
      </button>
      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {orderedKeys.map(type => (
            <div key={type}>
              <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.12em', color: MUTED, textTransform: 'uppercase', marginBottom: 6 }}>{type}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {grouped[type].map((item, i) => (
                  <div key={i} style={{ background: '#F9F7F2', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '8px 12px' }}>
                    <div style={{ fontFamily: crimson, fontSize: 14, color: TEXT, lineHeight: 1.55 }}>{item.text}</div>
                    {item.scripture && <div style={{ fontFamily: crimson, fontSize: 12, color: GOLD, marginTop: 4, fontStyle: 'italic' }}>{item.scripture}</div>}
                    {item.source_excerpt && <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 4, fontStyle: 'italic' }}>&ldquo;{item.source_excerpt}&rdquo;</div>}
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

// ── CardActions (bloodline cards) ───────────────────────────────────────────

function CardActions({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
      <button
        onClick={onApprove}
        style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '7px 18px', borderRadius: 3, cursor: 'pointer', background: GOLD_DEEP, border: `1px solid ${GOLD_DEEP}`, color: '#FFFFFF' }}
      >
        APPROVE
      </button>
      <button
        onClick={onReject}
        style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '7px 18px', borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #FCA5A5', color: '#991B1B' }}
      >
        REJECT
      </button>
    </div>
  )
}

// ── CurseCard ────────────────────────────────────────────────────────────────

function CurseCard({ c, onApprove, onReject }: { c: Candidate; onApprove: () => void; onReject: () => void }) {
  const [open, setOpen] = useState(false)
  const p = c.payload
  const tagged: TaggedItem[] = Array.isArray(p.tagged_items) ? p.tagged_items : []
  const conf = confidenceColor(c.confidence)

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 15, fontWeight: 600, color: GOLD_DEEP, letterSpacing: '0.04em' }}>
            {p.name || '(unnamed)'}
            {p.aka && <span style={{ fontFamily: crimson, fontWeight: 400, fontSize: 14, color: MUTED, marginLeft: 8 }}>aka {p.aka}</span>}
          </div>
          {c.source_name && <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 2 }}>From: {c.source_name}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color }}>{c.confidence}</span>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: 'rgba(139,105,20,0.08)', border: `1px solid rgba(139,105,20,0.2)`, color: GOLD }}>curse</span>
        </div>
      </div>
      <FieldRow label="Origin" value={p.origin_description} />
      <FieldRow label="How It Enters" value={p.how_it_enters} />
      <FieldRow label="Manifestations" value={p.manifestations} />
      <FieldRow label="Scripture Refs" value={p.scripture_refs} />
      <FieldRow label="Generational Depth" value={p.generational_depth_note} />
      <FieldRow label="Forgiveness Focus" value={p.forgiveness_focus} />
      <FieldRow label="Breaking Prayer" value={p.breaking_prayer} />
      {(p.suggested_cultural_root || p.suggested_society) && (
        <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, fontStyle: 'italic', background: '#F5F2EA', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '6px 10px', marginBottom: 12 }}>
          Suggested link: {[p.suggested_cultural_root, p.suggested_society].filter(Boolean).join(' / ')} — set via the curse edit form after approval.
        </div>
      )}
      <TaggedItemsSection items={tagged} open={open} onToggle={() => setOpen(x => !x)} />
      <CardActions onApprove={onApprove} onReject={onReject} />
    </div>
  )
}

// ── DossierCard ──────────────────────────────────────────────────────────────

function DossierCard({ c, onApprove, onReject }: { c: Candidate; onApprove: () => void; onReject: () => void }) {
  const p = c.payload
  const conf = confidenceColor(c.confidence)
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 15, fontWeight: 600, color: GOLD_DEEP, letterSpacing: '0.04em' }}>{p.culture_name || '(unnamed)'}</div>
          {c.source_name && <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 2 }}>From: {c.source_name}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color }}>{c.confidence}</span>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: 'rgba(139,105,20,0.08)', border: `1px solid rgba(139,105,20,0.2)`, color: GOLD }}>cultural root</span>
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
        <div style={fieldSty}><span style={labelSty}>Source</span><div style={mutedValueSty}>{[p.source_book, p.source_author, p.source_page].filter(Boolean).join(' — ')}</div></div>
      )}
      <CardActions onApprove={onApprove} onReject={onReject} />
    </div>
  )
}

// ── SocietyCard ──────────────────────────────────────────────────────────────

function SocietyCard({ c, onApprove, onReject }: { c: Candidate; onApprove: () => void; onReject: () => void }) {
  const p = c.payload
  const conf = confidenceColor(c.confidence)
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 15, fontWeight: 600, color: GOLD_DEEP, letterSpacing: '0.04em' }}>{p.name || '(unnamed)'}</div>
          {c.source_name && <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 2 }}>From: {c.source_name}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color }}>{c.confidence}</span>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: 'rgba(139,105,20,0.08)', border: `1px solid rgba(139,105,20,0.2)`, color: GOLD }}>society</span>
        </div>
      </div>
      <FieldRow label="History" value={p.history} />
      <FieldRow label="Known Oaths" value={p.known_oaths} />
      <FieldRow label="Known Symbols" value={p.known_symbols} />
      <FieldRow label="Known Degrees" value={p.known_degrees} />
      <FieldRow label="Scriptures" value={p.scriptures} />
      <FieldRow label="Ministry Considerations" value={p.ministry_considerations} />
      {(p.source_book || p.source_author) && (
        <div style={fieldSty}><span style={labelSty}>Source</span><div style={mutedValueSty}>{[p.source_book, p.source_author, p.source_page].filter(Boolean).join(' — ')}</div></div>
      )}
      <CardActions onApprove={onApprove} onReject={onReject} />
    </div>
  )
}

// ── GenericCard ──────────────────────────────────────────────────────────────

function GenericCard({ c, onApprove, onReject }: { c: Candidate; onApprove: () => void; onReject: () => void }) {
  const conf = confidenceColor(c.confidence)
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '20px 22px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 13, fontWeight: 600, color: GOLD_DEEP }}>{c.target_table}</div>
          {c.source_name && <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 2 }}>From: {c.source_name}</div>}
        </div>
        <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color }}>{c.confidence}</span>
      </div>
      <pre style={{ fontFamily: crimson, fontSize: 12, color: MUTED, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(c.payload, null, 2)}</pre>
      <CardActions onApprove={onApprove} onReject={onReject} />
    </div>
  )
}

// ── ConditionCard — inline-editable ─────────────────────────────────────────

function ConditionCard({ c, onApprove, onReject }: {
  c: Candidate
  onApprove: (editedPayload: Record<string, any>) => void
  onReject: () => void
}) {
  const existing = c.existing_record as Record<string, any> | null

  // All hooks at the top — before any conditional return
  const [draft, setDraft]           = useState<ConditionDraft>(() => seedDraft(c.payload))
  const [openTagged, setOpenTagged] = useState(false)
  const [openLinks, setOpenLinks]   = useState(false)

  const conf = confidenceColor(c.confidence)
  const isEnrichment = draft.is_enrichment

  function setField<K extends keyof ConditionDraft>(k: K, v: ConditionDraft[K]) {
    setDraft(p => ({ ...p, [k]: v }))
  }

  function updateTaggedItem(i: number, field: keyof CondItemDraft, value: string) {
    setDraft(p => {
      const items = p.tagged_items.map((item, idx) => idx === i ? { ...item, [field]: value } : item)
      return { ...p, tagged_items: items }
    })
  }

  function removeTaggedItem(i: number) {
    setDraft(p => ({ ...p, tagged_items: p.tagged_items.filter((_, idx) => idx !== i) }))
  }

  function updateSpiritLink(i: number, field: keyof SpiritLinkDraft, value: string) {
    setDraft(p => {
      const links = p.proposed_spirit_links.map((l, idx) => idx === i ? { ...l, [field]: value } : l)
      return { ...p, proposed_spirit_links: links }
    })
  }

  function removeSpiritLink(i: number) {
    setDraft(p => ({ ...p, proposed_spirit_links: p.proposed_spirit_links.filter((_, idx) => idx !== i) }))
  }

  function updateRegionLink(i: number, field: keyof RegionLinkDraft, value: string) {
    setDraft(p => {
      const links = p.proposed_region_links.map((l, idx) => idx === i ? { ...l, [field]: value } : l)
      return { ...p, proposed_region_links: links }
    })
  }

  function removeRegionLink(i: number) {
    setDraft(p => ({ ...p, proposed_region_links: p.proposed_region_links.filter((_, idx) => idx !== i) }))
  }

  // Group tagged items by type for display
  const taggedGrouped: Record<string, { item: CondItemDraft; idx: number }[]> = {}
  draft.tagged_items.forEach((item, idx) => {
    const k = item.type || 'other'
    if (!taggedGrouped[k]) taggedGrouped[k] = []
    taggedGrouped[k].push({ item, idx })
  })
  const taggedGroupKeys = [
    ...COND_ITEM_TYPE_ORDER.filter(k => taggedGrouped[k]),
    ...Object.keys(taggedGrouped).filter(k => !COND_ITEM_TYPE_ORDER.includes(k)),
  ]

  const delBtnSty: React.CSSProperties = {
    fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em',
    padding: '3px 8px', borderRadius: 3, cursor: 'pointer',
    background: 'transparent', border: '1px solid #FCA5A5', color: '#991B1B', flexShrink: 0,
  }
  const toggleBtnSty: React.CSSProperties = {
    fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em',
    color: GOLD, background: 'transparent', border: 'none',
    cursor: 'pointer', padding: 0, textTransform: 'uppercase',
  }

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '20px 22px' }}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          {isEnrichment && (
            <div style={{
              fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: '#166534',
              background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)',
              borderRadius: 4, padding: '4px 10px', display: 'inline-block', marginBottom: 8,
            }}>
              ↑ ENRICHING EXISTING: {existing?.display_name ?? draft.condition_key}
            </div>
          )}
          {c.source_name && <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED }}>From: {c.source_name}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: conf.bg, border: `1px solid ${conf.border}`, color: conf.color }}>{c.confidence}</span>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: 'rgba(139,105,20,0.08)', border: `1px solid rgba(139,105,20,0.2)`, color: GOLD }}>condition</span>
        </div>
      </div>

      {/* ── IDENTITY ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <div style={sectionHeadSty}>IDENTITY</div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={labelSty}>Display Name</label>
            <input value={draft.display_name} onChange={e => setField('display_name', e.target.value)} style={inputSty} />
          </div>
          <div>
            <label style={labelSty}>
              Condition Key{' '}
              <span style={{ color: '#991B1B', fontSize: 8 }}>(join key — edit carefully)</span>
            </label>
            <input value={draft.condition_key} onChange={e => setField('condition_key', e.target.value)} style={{ ...inputSty, fontFamily: 'monospace', fontSize: 12 }} />
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 12 }}>
          <div>
            <label style={labelSty}>Body System</label>
            <input value={draft.system} onChange={e => setField('system', e.target.value)} style={inputSty} placeholder="e.g. Nervous System" />
          </div>
          <div>
            <label style={labelSty}>System Key</label>
            <input value={draft.system_key} onChange={e => setField('system_key', e.target.value)} style={inputSty} placeholder="e.g. nervous" />
          </div>
          <div>
            <label style={labelSty}>Source Strength (1-5)</label>
            <input type="number" min={1} max={5} value={draft.source_strength}
              onChange={e => setField('source_strength', Math.min(5, Math.max(1, parseInt(e.target.value) || 3)))}
              style={inputSty} />
          </div>
          <div>
            <label style={labelSty}>Source Note</label>
            <input value={draft.source_note} onChange={e => setField('source_note', e.target.value)} style={inputSty} placeholder="e.g. High | Henry Wright" />
          </div>
        </div>
        {isEnrichment && (
          <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, fontStyle: 'italic', marginTop: 8 }}>
            system / system_key will NOT change on enrichment — existing taxonomy is kept.
          </div>
        )}
      </div>

      {/* ── CONTENT ───────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <div style={sectionHeadSty}>CONTENT</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            {isEnrichment && existing?.symptoms && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ ...labelSty, color: MUTED }}>Symptoms — Current</label>
                <div style={{ ...mutedValueSty, fontSize: 12, background: '#F5F2EA', padding: '6px 10px', borderRadius: 4, border: `1px solid ${BORDER}` }}>{existing.symptoms}</div>
              </div>
            )}
            <label style={labelSty}>{isEnrichment && existing?.symptoms ? 'Symptoms — Proposed' : 'Symptoms'}</label>
            <textarea value={draft.symptoms} onChange={e => setField('symptoms', e.target.value)} rows={4} style={textareaSty} />
          </div>
          <div>
            {isEnrichment && existing?.author_conclusion && (
              <div style={{ marginBottom: 8 }}>
                <label style={{ ...labelSty, color: MUTED }}>Author Conclusion — Current</label>
                <div style={{ ...mutedValueSty, fontSize: 12, background: '#F5F2EA', padding: '6px 10px', borderRadius: 4, border: `1px solid ${BORDER}` }}>{existing.author_conclusion}</div>
              </div>
            )}
            <label style={labelSty}>{isEnrichment && existing?.author_conclusion ? 'Author Conclusion — Proposed' : 'Author Conclusion'}</label>
            <textarea value={draft.author_conclusion} onChange={e => setField('author_conclusion', e.target.value)} rows={4} style={textareaSty} />
          </div>
        </div>
        {isEnrichment && (
          <div style={{ marginTop: 12 }}>
            <label style={labelSty}>Enriched Overview (optional)</label>
            <textarea value={draft.enriched_overview} onChange={e => setField('enriched_overview', e.target.value)} rows={3} style={textareaSty} placeholder="Synthesized admin-approved overview after enrichment" />
          </div>
        )}
      </div>

      {/* ── SPIRITUAL TAGS ────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 18 }}>
        <div style={sectionHeadSty}>SPIRITUAL TAGS</div>
        {isEnrichment && existing != null && (existing.spiritual_tags as string[])?.length > 0 && (
          <div style={{ marginBottom: 8 }}>
            <label style={{ ...labelSty, color: MUTED }}>Current Tags</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {(existing.spiritual_tags as string[]).map(t => (
                <span key={t} style={{ fontFamily: cinzel, fontSize: 8, padding: '2px 8px', borderRadius: 3, background: '#F5F2EA', border: `1px solid ${BORDER}`, color: MUTED }}>{t}</span>
              ))}
            </div>
          </div>
        )}
        <label style={labelSty}>{isEnrichment && existing?.spiritual_tags?.length > 0 ? 'Proposed Tags (comma or newline-separated)' : 'Spiritual Tags (comma or newline-separated)'}</label>
        <textarea value={draft.tagsText} onChange={e => setField('tagsText', e.target.value)} rows={2} style={textareaSty} placeholder="fear, anxiety, stress, self-rejection" />
        {draft.tagsText && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
            {normalizeTags(draft.tagsText).map(t => (
              <span key={t} style={{ fontFamily: cinzel, fontSize: 8, padding: '2px 8px', borderRadius: 3, background: 'rgba(139,105,20,0.08)', border: `1px solid rgba(139,105,20,0.2)`, color: GOLD }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* ── TAGGED ITEMS (collapsible, editable) ─────────────────────────── */}
      {draft.tagged_items.length > 0 && (
        <div style={{ marginBottom: 18, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
          <button onClick={() => setOpenTagged(x => !x)} style={toggleBtnSty}>
            {openTagged ? '▾' : '▸'} Tagged Items ({draft.tagged_items.length})
          </button>
          {openTagged && (
            <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 14 }}>
              {taggedGroupKeys.map(type => (
                <div key={type}>
                  <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.12em', color: MUTED, textTransform: 'uppercase', marginBottom: 6 }}>{type}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {taggedGrouped[type].map(({ item, idx }) => (
                      <div key={idx} style={{ background: '#F9F7F2', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '8px 12px' }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                          <textarea
                            value={item.content}
                            onChange={e => updateTaggedItem(idx, 'content', e.target.value)}
                            rows={2}
                            style={{ ...textareaSty, background: '#F9F7F2', fontSize: 13, flex: 1 }}
                          />
                          <button onClick={() => removeTaggedItem(idx)} style={delBtnSty}>✕</button>
                        </div>
                        {item.source_excerpt && (
                          <div style={{ fontFamily: crimson, fontSize: 11, color: MUTED, marginTop: 4, fontStyle: 'italic' }}>&ldquo;{item.source_excerpt}&rdquo;</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SPIRIT + REGION LINKS (collapsible, editable) ────────────────── */}
      {(draft.proposed_spirit_links.length > 0 || draft.proposed_region_links.length > 0) && (
        <div style={{ marginBottom: 18, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
          <button onClick={() => setOpenLinks(x => !x)} style={toggleBtnSty}>
            {openLinks ? '▾' : '▸'} Proposed Links ({draft.proposed_spirit_links.length + draft.proposed_region_links.length})
          </button>
          {openLinks && (
            <div style={{ marginTop: 10 }}>
              {draft.proposed_spirit_links.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase', marginBottom: 6 }}>Spirit Links</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {draft.proposed_spirit_links.map((link, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 2fr auto', gap: 8, alignItems: 'center', background: '#F9F7F2', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '8px 10px' }}>
                        <input value={link.spirit_name} onChange={e => updateSpiritLink(i, 'spirit_name', e.target.value)} style={{ ...inputSty, background: '#F9F7F2', fontSize: 13 }} placeholder="Spirit name" />
                        <select value={link.relationship} onChange={e => updateSpiritLink(i, 'relationship', e.target.value)} style={{ ...selectSty, background: '#F9F7F2', fontSize: 12 }}>
                          <option value="function_of">function_of</option>
                          <option value="manifests_as">manifests_as</option>
                          <option value="associated">associated</option>
                        </select>
                        <input value={link.note} onChange={e => updateSpiritLink(i, 'note', e.target.value)} style={{ ...inputSty, background: '#F9F7F2', fontSize: 12 }} placeholder="Note (optional)" />
                        <button onClick={() => removeSpiritLink(i)} style={delBtnSty}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {draft.proposed_region_links.length > 0 && (
                <div>
                  <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase', marginBottom: 6 }}>Region Links</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {draft.proposed_region_links.map((link, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr auto', gap: 8, alignItems: 'center', background: '#F9F7F2', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '8px 10px' }}>
                        <input value={link.region_label} onChange={e => updateRegionLink(i, 'region_label', e.target.value)} style={{ ...inputSty, background: '#F9F7F2', fontSize: 13 }} placeholder="Region label" />
                        <select value={link.relevance} onChange={e => updateRegionLink(i, 'relevance', e.target.value)} style={{ ...selectSty, background: '#F9F7F2', fontSize: 12 }}>
                          <option value="high">high</option>
                          <option value="medium">medium</option>
                          <option value="low">low</option>
                        </select>
                        <button onClick={() => removeRegionLink(i)} style={delBtnSty}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 8, marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
        <button
          onClick={() => onApprove(draftToPayload(draft))}
          style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '7px 18px', borderRadius: 3, cursor: 'pointer', background: GOLD_DEEP, border: `1px solid ${GOLD_DEEP}`, color: '#FFFFFF' }}
        >
          APPROVE
        </button>
        <button
          onClick={onReject}
          style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '7px 18px', borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #FCA5A5', color: '#991B1B' }}
        >
          REJECT
        </button>
      </div>
    </div>
  )
}

// ── RegionLinkCard — inferred body-map placement picker ──────────────────────

function RegionLinkCard({ c, anatomyRegions, onBind, onNeedsRegion, onReject }: {
  c: Candidate
  anatomyRegions: AnatomyRegion[]
  onBind: (regionKey: string, relevanceStrength: number) => void
  onNeedsRegion: () => void
  onReject: () => void
}) {
  const p      = c.payload
  const isHeld = c.status === 'needs_region'

  // All hooks at top
  const [selectedRegion, setSelectedRegion] = useState(() => {
    const label = ((p.region_label as string) || '').toLowerCase().trim()
    if (!label || anatomyRegions.length === 0) return ''
    const found = anatomyRegions.find(r => {
      const dk = r.display_name.toLowerCase()
      const rk = r.region_key.toLowerCase()
      return dk.includes(label) || label.includes(dk) || rk.includes(label) || label.includes(rk)
    })
    return found?.region_key ?? ''
  })
  const [relevanceStrength, setRelevanceStrength] = useState(() => {
    const pc = (p.placement_confidence as string) || 'medium'
    return pc === 'high' ? 3 : pc === 'low' ? 1 : 2
  })

  const grouped: Record<string, AnatomyRegion[]> = {}
  for (const r of anatomyRegions) {
    const cat = r.category || 'Other'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(r)
  }
  const groupKeys = Object.keys(grouped).sort()

  const pcBadge = confidenceColor((p.placement_confidence as string) || 'medium')

  return (
    <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '20px 22px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
        <div>
          {isHeld && (
            <div style={{
              fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: '#854D0E',
              background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.35)',
              borderRadius: 4, padding: '4px 10px', display: 'inline-block', marginBottom: 8,
            }}>
              HELD — NEEDS NEW REGION
            </div>
          )}
          <div style={{ fontFamily: cinzel, fontSize: 15, fontWeight: 600, color: GOLD_DEEP, letterSpacing: '0.04em' }}>
            {(p.condition_display_name as string) || (p.condition_key as string) || '(unknown)'}
          </div>
          {c.source_name && <div style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 2 }}>From: {c.source_name}</div>}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: pcBadge.bg, border: `1px solid ${pcBadge.border}`, color: pcBadge.color }}>
            {(p.placement_confidence as string) ?? 'medium'}
          </span>
          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 3, background: 'rgba(139,105,20,0.08)', border: `1px solid rgba(139,105,20,0.2)`, color: GOLD }}>
            region placement
          </span>
        </div>
      </div>

      {/* SOL's suggested region label */}
      <div style={fieldSty}>
        <span style={labelSty}>SOL Suggested Region</span>
        <div style={{ ...valueSty, fontFamily: 'monospace', fontSize: 13 }}>{(p.region_label as string) || '—'}</div>
      </div>

      {/* Discernment reasoning */}
      {p.reasoning && (
        <div style={{ marginBottom: 14, background: '#F5F2EA', border: `1px solid ${BORDER}`, borderRadius: 4, padding: '8px 12px' }}>
          <span style={{ ...labelSty, marginBottom: 4 }}>Discernment Reasoning</span>
          <div style={{ fontFamily: crimson, fontSize: 14, color: MUTED, fontStyle: 'italic', lineHeight: 1.55 }}>{p.reasoning as string}</div>
        </div>
      )}
      {p.source_excerpt && (
        <div style={{ marginBottom: 14 }}>
          <span style={labelSty}>Source Excerpt</span>
          <div style={{ fontFamily: crimson, fontSize: 13, color: MUTED, fontStyle: 'italic', lineHeight: 1.5 }}>&ldquo;{p.source_excerpt as string}&rdquo;</div>
        </div>
      )}

      {/* Region picker (grouped by category) */}
      <div style={{ marginBottom: 14 }}>
        <label style={labelSty}>Bind to Region (from anatomy_regions)</label>
        <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)} style={selectSty}>
          <option value="">— select a region —</option>
          {groupKeys.map(cat => (
            <optgroup key={cat} label={cat}>
              {grouped[cat].map(r => (
                <option key={r.region_key} value={r.region_key}>{r.display_name}</option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {/* Relevance */}
      <div style={{ marginBottom: 16 }}>
        <label style={labelSty}>Relevance Strength</label>
        <select value={relevanceStrength} onChange={e => setRelevanceStrength(Number(e.target.value))} style={{ ...selectSty, width: 'auto' }}>
          <option value={1}>1 — Low</option>
          <option value={2}>2 — Medium</option>
          <option value={3}>3 — High</option>
        </select>
      </div>

      {/* Parent-condition guard note — shown when the parent condition has not yet been approved */}
      {c.parent_condition_exists === false && (
        <div style={{ marginBottom: 12, background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.4)', borderRadius: 4, padding: '8px 12px' }}>
          <span style={{ fontFamily: crimson, fontSize: 13, color: '#854D0E', lineHeight: 1.5 }}>
            Approve the condition &ldquo;{(c.payload?.condition_display_name as string) || (c.payload?.condition_key as string) || 'unknown'}&rdquo; first — then you can place it on the body map.
          </span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
        <button
          onClick={() => onBind(selectedRegion, relevanceStrength)}
          disabled={!selectedRegion || c.parent_condition_exists === false}
          style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '7px 18px', borderRadius: 3, cursor: (selectedRegion && c.parent_condition_exists !== false) ? 'pointer' : 'not-allowed', opacity: (selectedRegion && c.parent_condition_exists !== false) ? 1 : 0.5, background: GOLD_DEEP, border: `1px solid ${GOLD_DEEP}`, color: '#FFFFFF' }}
        >
          BIND TO REGION
        </button>
        {!isHeld && (
          <button
            onClick={onNeedsRegion}
            style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '7px 18px', borderRadius: 3, cursor: 'pointer', background: 'transparent', border: `1px solid rgba(234,179,8,0.5)`, color: '#854D0E' }}
          >
            NEEDS NEW REGION
          </button>
        )}
        <button
          onClick={onReject}
          style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '7px 18px', borderRadius: 3, cursor: 'pointer', background: 'transparent', border: '1px solid #FCA5A5', color: '#991B1B' }}
        >
          REJECT
        </button>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

function ExtractionReviewPage() {
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken } = useAuth()

  // All hooks before any conditional return
  const [candidates, setCandidates]       = useState<Candidate[]>([])
  const [anatomyRegions, setAnatomyRegions] = useState<AnatomyRegion[]>([])
  const [loading, setLoading]             = useState(true)
  const [listError, setListError]         = useState<string | null>(null)
  const [activeFilter, setActive]         = useState<string | null>(null)
  const [showNeedsRegion, setShowNeedsRegion] = useState(false)
  const [toast, setToast]                 = useState<string | null>(null)
  const [acting, setActing]               = useState<string | null>(null)

  const tier    = (user?.publicMetadata as any)?.tier as string | undefined
  const role    = (user?.publicMetadata as any)?.role as string | undefined
  const isAdmin = isLoaded && isSignedIn && getAccessLevel({ tier, role }) >= 4

  useEffect(() => {
    if (!isAdmin) return
    loadCandidates()
  }, [isAdmin])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 5000)
    return () => clearTimeout(t)
  }, [toast])

  async function loadCandidates(status = 'pending') {
    setLoading(true)
    setListError(null)
    setActive(null)
    try {
      const token = await getToken()
      const qs    = status !== 'pending' ? `?status=${encodeURIComponent(status)}` : ''
      const resp  = await fetch(`/api/admin-extraction-candidates${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!resp.ok) throw new Error(`Status ${resp.status}`)
      const data = await resp.json()
      setCandidates(data.candidates ?? [])
      if (Array.isArray(data.anatomy_regions)) setAnatomyRegions(data.anatomy_regions)
    } catch (err: any) {
      setListError(String(err?.message ?? err))
    } finally {
      setLoading(false)
    }
  }

  async function handleApprove(c: Candidate, editedPayload?: Record<string, any>) {
    const label = tableLabel(c.target_table)
    const name  = c.payload?.name || c.payload?.culture_name || c.payload?.display_name || c.target_table
    if (!window.confirm(`Approve "${name}" and write to ${label}?\n\nThis cannot be undone.`)) return

    setActing(c.id)
    try {
      const token = await getToken()
      const postBody: Record<string, any> = { action: 'approve', id: c.id }
      if (editedPayload) postBody.edited_payload = editedPayload

      const resp = await fetch('/api/admin-extraction-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(postBody),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        setToast(`Error: ${(err as any).error ?? 'approve failed'}`)
        return
      }

      const result = await resp.json()
      setCandidates(prev => prev.filter(x => x.id !== c.id))

      // Rich toast for conditions; simple toast for bloodline tables
      if (result.condition_key) {
        const mode = result.mode as string
        const ck   = result.condition_key as string
        const created   = (result.spirit_links_created ?? 0) + (result.region_links_created ?? 0)
        const unresolved: string[] = [
          ...(result.spirit_links_unresolved ?? []),
          ...(result.region_links_unresolved ?? []),
        ]
        let msg = `${mode === 'enrichment' ? 'Enriched' : 'New condition'}: ${ck}`
        if (created > 0)          msg += ` — ${created} link${created === 1 ? '' : 's'} created`
        if (unresolved.length > 0) msg += ` — ${unresolved.length} unresolved: ${unresolved.slice(0, 2).join(', ')}`
        setToast(msg)
      } else {
        setToast(`Approved — written to ${label}`)
      }
    } catch (err: any) {
      setToast(`Error: ${String(err?.message ?? err)}`)
    } finally {
      setActing(null)
    }
  }

  async function handleReject(c: Candidate) {
    const name = c.payload?.name || c.payload?.culture_name || c.payload?.display_name || c.target_table
    const reason = window.prompt(`Reject "${name}"?\n\nEnter a short reason (optional):`)
    if (reason === null) return

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

  async function handleBindRegion(c: Candidate, regionKey: string, relevanceStrength: number) {
    setActing(c.id)
    try {
      const token = await getToken()
      const resp = await fetch('/api/admin-extraction-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'approve', id: c.id, region_key: regionKey, relevance_strength: relevanceStrength }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        if ((err as any).error === 'parent_condition_not_approved') {
          setToast(`Cannot bind: ${(err as any).message ?? 'approve the parent condition first'}`)
        } else {
          setToast(`Error: ${(err as any).error ?? 'bind failed'}`)
        }
        return
      }
      const result = await resp.json()
      setCandidates(prev => prev.filter(x => x.id !== c.id))
      const ck = result.condition_key as string
      const rk = result.region_key as string
      const rs = result.relevance_strength as number
      setToast(result.already_existed
        ? `Already linked: ${ck} → ${rk}`
        : `Bound ${ck} → ${rk} (relevance ${rs})`)
    } catch (err: any) {
      setToast(`Error: ${String(err?.message ?? err)}`)
    } finally {
      setActing(null)
    }
  }

  async function handleNeedsRegion(c: Candidate) {
    setActing(c.id)
    try {
      const token = await getToken()
      const resp = await fetch('/api/admin-extraction-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'needs_region', id: c.id }),
      })
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}))
        setToast(`Error: ${(err as any).error ?? 'hold failed'}`)
        return
      }
      setCandidates(prev => prev.filter(x => x.id !== c.id))
      setToast('Held for new region')
    } catch (err: any) {
      setToast(`Error: ${String(err?.message ?? err)}`)
    } finally {
      setActing(null)
    }
  }

  const distinctTables = Array.from(new Set(candidates.map(c => c.target_table))).sort()
  const visible = activeFilter ? candidates.filter(c => c.target_table === activeFilter) : candidates

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
          <div style={{ fontFamily: cinzel, fontSize: 14, fontWeight: 600, color: GOLD_DEEP, letterSpacing: '0.15em', marginBottom: 12 }}>⚔ ACCESS DENIED</div>
          <p style={{ fontFamily: crimson, fontSize: 15, color: TEXT, margin: '0 0 20px', lineHeight: 1.5 }}>
            This area is restricted to authorized personnel.
          </p>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 12, color: GOLD, textDecoration: 'none', letterSpacing: '0.1em' }}>&larr; Return to Community</a>
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
          maxWidth: 380,
        }}>
          {toast}
        </div>
      )}

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: cinzel, fontSize: 26, fontWeight: 600, color: GOLD_DEEP, margin: 0, letterSpacing: '0.05em' }}>EXTRACTION REVIEW</h1>
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

        {/* Pills + needs-region bin toggle */}
        {!loading && (candidates.length > 0 || showNeedsRegion) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
            {candidates.length > 0 && (
              <>
                <button
                  onClick={() => setActive(null)}
                  style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', background: activeFilter === null ? GOLD_DEEP : 'transparent', border: `1px solid ${activeFilter === null ? GOLD_DEEP : BORDER}`, color: activeFilter === null ? '#FFFFFF' : MUTED }}
                >
                  All ({candidates.length})
                </button>
                {distinctTables.map(t => {
                  const count = candidates.filter(c => c.target_table === t).length
                  const active = activeFilter === t
                  return (
                    <button key={t} onClick={() => setActive(t)}
                      style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '6px 14px', borderRadius: 20, cursor: 'pointer', background: active ? GOLD_DEEP : 'transparent', border: `1px solid ${active ? GOLD_DEEP : BORDER}`, color: active ? '#FFFFFF' : MUTED }}
                    >
                      {tableLabel(t)} ({count})
                    </button>
                  )
                })}
              </>
            )}
          </div>
        )}
        {!loading && (
          <div style={{ marginBottom: 24 }}>
            <button
              onClick={() => {
                const next = !showNeedsRegion
                setShowNeedsRegion(next)
                loadCandidates(next ? 'needs_region' : 'pending')
              }}
              style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', padding: '5px 12px', borderRadius: 20, cursor: 'pointer', background: showNeedsRegion ? 'rgba(234,179,8,0.15)' : 'transparent', border: `1px solid ${showNeedsRegion ? 'rgba(234,179,8,0.5)' : BORDER}`, color: showNeedsRegion ? '#854D0E' : MUTED }}
            >
              {showNeedsRegion ? '▾ Needs-Region Bin' : '▸ Show Needs-Region Bin'}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ fontFamily: crimson, fontSize: 14, color: MUTED, padding: 32, textAlign: 'center' }}>Loading…</div>
        )}

        {/* Empty state */}
        {!loading && candidates.length === 0 && !listError && (
          <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 6, padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, color: GOLD_DEEP, letterSpacing: '0.12em', marginBottom: 10 }}>NO PENDING CANDIDATES</div>
            <p style={{ fontFamily: crimson, fontSize: 15, color: MUTED, margin: 0, lineHeight: 1.6 }}>No pending candidates. Run a Research Drop to extract some.</p>
          </div>
        )}

        {/* Cards */}
        {!loading && visible.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {acting && (
              <div style={{ fontFamily: crimson, fontSize: 13, color: MUTED, textAlign: 'center', padding: 8 }}>Working…</div>
            )}
            {visible.map(c => {
              if (c.target_table === 'curses') {
                return <CurseCard key={c.id} c={c} onApprove={() => handleApprove(c)} onReject={() => handleReject(c)} />
              }
              if (c.target_table === 'cultural_dossiers') {
                return <DossierCard key={c.id} c={c} onApprove={() => handleApprove(c)} onReject={() => handleReject(c)} />
              }
              if (c.target_table === 'secret_societies') {
                return <SocietyCard key={c.id} c={c} onApprove={() => handleApprove(c)} onReject={() => handleReject(c)} />
              }
              if (c.target_table === 'conditions') {
                return (
                  <ConditionCard
                    key={c.id}
                    c={c}
                    onApprove={(editedPayload) => handleApprove(c, editedPayload)}
                    onReject={() => handleReject(c)}
                  />
                )
              }
              if (c.target_table === 'condition_region_links') {
                return (
                  <RegionLinkCard
                    key={c.id}
                    c={c}
                    anatomyRegions={anatomyRegions}
                    onBind={(rk, rs) => handleBindRegion(c, rk, rs)}
                    onNeedsRegion={() => handleNeedsRegion(c)}
                    onReject={() => handleReject(c)}
                  />
                )
              }
              return <GenericCard key={c.id} c={c} onApprove={() => handleApprove(c)} onReject={() => handleReject(c)} />
            })}
          </div>
        )}

      </div>
    </div>
  )
}
