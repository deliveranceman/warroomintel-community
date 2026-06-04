import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { useAuth, useUser, SignInButton, SignUpButton, SignedIn, SignedOut } from '@clerk/tanstack-start'
import { TacticalCard, ClassBadge, HUDChip, GoldButton, SectionLabel, MonoTime } from '@/components/primitives'

export const Route = createFileRoute('/')({
  component: WarRoomHome,
})

// ── TYPES ────────────────────────────────────────────────
interface DemonEntry {
  id: string
  name: string
  aka: string
  type: string
  kingdom?: string
  description?: string
  assignment?: string
  function?: string
  manifestation?: string
  scripture?: string
  strongman?: string
  rank?: string
  entryPoints?: string
  legalRights?: string
  protocol?: string
  symptoms?: string
  companionSpirits?: string
  wriNotes?: string
}

// ── URLS ─────────────────────────────────────────────────
const SIGNUP_URL    = 'https://accounts.warroomintel.com/sign-up'
const COMMUNITY_URL = '/community'
// Fallback static links — used in demo section and footer; real checkout goes through handleUpgrade
const SOLDIER_URL   = 'https://buy.stripe.com/9B6fZafJ689F1Zrb4XfrW03'
const COMMANDER_URL = 'https://buy.stripe.com/8x24gsaoMey39rT4GzfrW04'
const GENERAL_URL   = '/community'

async function handleUpgrade(tier: string, getToken: () => Promise<string | null>): Promise<void> {
  try {
    const token = await getToken()
    if (!token) { window.location.href = '/sign-in'; return }
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tier }),
    })
    const data = await res.json().catch(() => ({}))
    if (data.error === 'sold_out') { alert('Founding General spots are sold out.'); return }
    if (data.error === 'coming_soon') { alert('Upgrades coming soon — check back shortly.'); return }
    if (!res.ok) { alert('Upgrades coming soon — check back shortly.'); return }
    if (data.url) window.location.href = data.url
  } catch (err) {
    console.error('Upgrade error:', err)
    alert('Upgrades coming soon — check back shortly.')
  }
}

// ── CONSTANTS ────────────────────────────────────────────
const DEMON_TYPES = ['All Types','Principality','Power','Strongman','Spirit','Fallen Angel','Duke of Hell','Prince of Hell','Female Demon','Spirit of Infirmity','Spirit of Rebellion','Spirit of Divination','Familiar Spirit','Unclean Spirit','Other']

const FEATURES = [
  { icon: '⚔', title: 'Intel Archive', desc: '322+ spirit dossiers with full intelligence data' },
  { icon: '🧠', title: 'AI Symptom Investigator', desc: 'Describe what you\'re seeing. AI maps it to spirits.' },
  { icon: '🗺', title: 'Body Map', desc: 'Anatomical map of 131 manifestation hotspots' },
  { icon: '📡', title: 'Spirit Network', desc: 'Visualize spirit hierarchies and territorial structures' },
  { icon: '🔍', title: 'Gateway Investigator', desc: 'Trace spiritual entry points through culture and exposure' },
  { icon: '📋', title: 'Session HQ', desc: 'Case files, intake forms, and session document builder' },
  { icon: '📖', title: 'Daily Brief', desc: 'AI-generated daily prayer, scripture, and devotional' },
  { icon: '🛡', title: 'Arsenal', desc: 'Tier-gated PDF library of ministry protocols and guides' },
  { icon: '🌐', title: 'Fringe Intelligence', desc: 'Classified research into occult systems and dark territory' },
]

const FAQ = [
  { q: 'Is this a replacement for professional mental health care?', a: 'No. War Room Intel is a spiritual ministry resource only. We are not licensed therapists or medical practitioners. If you are experiencing a mental health crisis please seek professional support. We encourage maintaining any current medical or therapeutic treatment alongside ministry.' },
  { q: 'How is my assessment information kept confidential?', a: 'All assessment information is seen only by our ministry team and is never published, shared, or sold. Anything posted to the public response board is fully anonymized with your permission.' },
  { q: 'What denominations or theological traditions does this represent?', a: 'War Room Intel is rooted in Scripture and Charismatic/Pentecostal ministry tradition. We operate under the pastoral oversight of Staffordtown Church, Copperhill TN. We welcome all Spirit-filled believers regardless of denomination.' },
  { q: 'What membership tiers are available?', a: "Membership is live now. Watchman is free forever. Soldier is $19/mo, Commander $39/mo, General's Table $97/mo. Charter pricing (Soldier $9/mo, Commander $20/mo) is locked for life for the first 100 members. All paid tiers include a 30-day free trial." },
  { q: 'Can I submit a demon that is not in the database?', a: 'Yes! Use the Submit a Demon form in the Assessment menu. All submissions are reviewed by our ministry team before being added. We credit contributors where possible.' },
  { q: 'How do I get a personal ministry response?', a: 'Submit the free Ministry Assessment. Every submission receives a personal response from Pastor Justin. Soldier tier and above receive priority response.' },
]

const TICKER_ITEMS = [
  'Intel Archive · 800+ Documented Spirits',
  'Assessment Tool · 9-Step Intake · Personal Response',
  'Protocol Library · Freemasonry · Soul Ties · Occult Doorways',
  'Dake Bible · 20,399 Annotation Notes',
  'Live Ministry Calls · Soldier · Commander · General',
  'Community · Warriors in the Fight',
  'New Entries Added Weekly',
  'AI-Powered Spirit Diagnostics',
]

// ── HELPERS ──────────────────────────────────────────────
const cinzel  = 'var(--font-display)'
const mono    = 'var(--font-mono)'
const reading = 'Georgia, serif'
const G       = 'var(--gold)'
const GOLD    = '#C9A84C'

function typeColor(type: string) {
  const map: Record<string, string> = {
    'Principality': '#7C5CBF', 'Power': '#5C7CBF', 'Strongman': '#C9A84C',
    'Fallen Angel': '#8B5E3C', 'Spirit': '#4B8C6E', 'Duke of Hell': '#8C4B4B',
    'Female Demon': '#9B4B8C', 'Spirit of Divination': '#5B8C8C',
    'Familiar Spirit': '#6B7C8C', 'Spirit of Infirmity': '#7C6B4B',
  }
  return map[type] || '#6B6480'
}

// ── GLOBAL STYLES ────────────────────────────────────────
const pageStyles = `
  @keyframes ticker {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-gold {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.5; }
  }
  @media (max-width: 640px) {
    .db-table-header { display: none !important; }
    .db-row { display: block !important; padding: 16px !important; }
    .db-row-name { margin-bottom: 8px; }
    .db-row-type { display: none !important; }
    .db-row-func { margin-bottom: 8px; }
    .db-row-toggle { float: right; margin-top: -52px; }
    .db-expanded-grid { grid-template-columns: 1fr !important; }
    .db-expanded-protocol { grid-column: span 1 !important; }
    .wri-hero-ctas { flex-direction: column !important; width: 100% !important; max-width: 320px !important; margin: 0 auto !important; }
    .wri-hero-ctas > * { width: 100% !important; text-align: center !important; box-sizing: border-box !important; }
    .wri-3col { grid-template-columns: 1fr !important; }
    .wri-2col { grid-template-columns: 1fr !important; }
    .wri-4col { grid-template-columns: 1fr 1fr !important; }
    .pricing-tier { border-right: none !important; border-bottom: 1px solid rgba(201,168,76,0.18) !important; }
    .db-banner { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
    .intake-2col { grid-template-columns: 1fr !important; }
    .footer-grid { grid-template-columns: 1fr 1fr !important; }
  }
  @media (min-width: 641px) and (max-width: 900px) {
    .db-row { grid-template-columns: 1fr 90px 36px !important; }
    .db-row-func { display: none !important; }
    .db-table-header { grid-template-columns: 1fr 90px 36px !important; }
    .db-table-header-func { display: none !important; }
    .wri-3col { grid-template-columns: 1fr 1fr !important; }
  }
`

// ── LOCKED FIELD ─────────────────────────────────────────
const TIER_LABELS: Record<string, string> = {
  Soldier: '🔒 Soldier Required',
  Commander: '🔒 Commander Required',
  General: '🔒 General Required',
}

function LockedField({ tier, desc, wide, upgradeUrl }: { tier: string; desc: string; wide?: boolean; upgradeUrl?: string }) {
  return (
    <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 4, padding: wide ? '12px 16px' : '10px 12px', display: 'flex', alignItems: wide ? 'center' : 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 10 }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: cinzel, fontSize: 9, color: 'var(--t-3)', letterSpacing: '0.1em', marginBottom: 4 }}>{TIER_LABELS[tier]}</div>
        <div style={{ fontSize: 12, color: 'var(--t-3)', fontStyle: 'italic' }}>{desc}</div>
      </div>
      {upgradeUrl && (
        <a href={upgradeUrl} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: G, textDecoration: 'none', border: '1px solid rgba(201,168,76,0.35)', padding: '3px 10px', borderRadius: 2, whiteSpace: 'nowrap' as const, transition: 'background 0.2s', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.12)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          Unlock →
        </a>
      )}
    </div>
  )
}

function TierCallout({ title, desc, url, btnLabel }: { title: string; desc: string; url: string; btnLabel: string }) {
  return (
    <div style={{ background: 'var(--bg-3)', border: '1px solid var(--gold-line)', borderRadius: 4, padding: '12px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 14 }}>
      <div>
        <div style={{ fontFamily: cinzel, fontSize: 10, fontWeight: 600, color: G, letterSpacing: '0.07em', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--t-2)', fontFamily: reading, fontStyle: 'italic' }}>{desc}</div>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer"
        style={{ fontFamily: cinzel, fontSize: 9, fontWeight: 700, letterSpacing: '0.09em', color: 'var(--bg-0)', background: GOLD, textDecoration: 'none', padding: '7px 16px', borderRadius: 2, whiteSpace: 'nowrap' as const, flexShrink: 0, transition: 'opacity 0.2s' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        {btnLabel} →
      </a>
    </div>
  )
}

// ── CLASSIFIED TICKER ─────────────────────────────────────
function ClassifiedTicker() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]
  return (
    <div style={{ overflow: 'hidden', height: 32, display: 'flex', alignItems: 'center', background: 'rgba(201,168,76,0.08)', borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
      <div style={{ display: 'flex', gap: '3rem', animation: 'ticker 40s linear infinite', width: 'max-content', whiteSpace: 'nowrap' as const }}>
        {items.map((item, i) => (
          <span key={i} style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.12em', color: 'var(--t-3)', textTransform: 'uppercase' as const, flexShrink: 0 }}>
            <span style={{ color: GOLD, marginRight: 10 }}>⬥</span>{item}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── TACTICAL HERO ─────────────────────────────────────────
function TacticalHero() {
  return (
    <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, position: 'relative', overflow: 'hidden', background: 'var(--bg-0)' }}>
      {/* Classified strip */}
      <div style={{ background: 'rgba(201,168,76,0.08)', borderBottom: '1px solid var(--gold-line)', padding: '6px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.22em', color: 'var(--t-4)', textTransform: 'uppercase' as const }}>CLASSIFICATION: OPEN · MINISTRY INTELLIGENCE PLATFORM</span>
        <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.15em', color: 'var(--t-4)' }}>WRI-PUBLIC-001</span>
      </div>

      {/* Background grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.025) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 90% 90% at 50% 40%, black 0%, transparent 100%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 20%, rgba(201,168,76,0.06) 0%, transparent 60%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(138,80,255,0.03) 0%, transparent 60%)', pointerEvents: 'none' }} />

      {/* Content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem 3rem', position: 'relative', zIndex: 1, textAlign: 'center' }}>

        <div style={{ animation: 'fadeUp 0.7s 0.1s both', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <HUDChip active style={{ fontSize: 9, letterSpacing: '0.2em' }}>CLASSIFIED INTEL</HUDChip>
          <span style={{ fontFamily: mono, fontSize: 9, color: 'var(--t-4)', letterSpacing: '0.15em' }}>A MINISTRY OF STAFFORDTOWN CHURCH · COPPERHILL, TN</span>
        </div>

        <h1 style={{ fontFamily: cinzel, fontSize: 'clamp(38px, 7vw, 80px)', fontWeight: 700, lineHeight: 0.95, letterSpacing: '0.01em', color: 'var(--t-0)', marginBottom: 20, animation: 'fadeUp 0.7s 0.15s both' }}>
          The <span style={{ color: G }}>War Room</span><br />Intelligence
        </h1>

        <p style={{ fontFamily: reading, fontSize: 'clamp(16px, 2vw, 20px)', color: 'var(--t-2)', fontStyle: 'italic', maxWidth: 600, lineHeight: 1.7, marginBottom: 36, animation: 'fadeUp 0.7s 0.2s both' }}>
          The most complete spiritual warfare resource available — a searchable demon database, ministry assessment, deliverance protocols, and a community of warriors.
        </p>

        {/* CTA buttons */}
        <div className="wri-hero-ctas" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, justifyContent: 'center', marginBottom: 48, animation: 'fadeUp 0.7s 0.25s both' }}>
          <a href="#database"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', background: 'linear-gradient(180deg, var(--gold) 0%, #b89538 100%)', color: '#1a1305', fontFamily: cinzel, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', borderRadius: 2, boxShadow: '0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 20px rgba(201,168,76,0.25)', transition: 'opacity 0.2s, transform 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}>
            ⚔ Search the Database
          </a>
          <a href="#ministry-help"
            style={{ display: 'inline-flex', alignItems: 'center', padding: '13px 28px', background: 'transparent', color: G, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', textDecoration: 'none', borderRadius: 2, border: '1px solid var(--gold-line-hi)', transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            Request Ministry Help →
          </a>
          <SignedOut>
            <SignInButton mode="modal">
              <button
                style={{ display: 'inline-flex', alignItems: 'center', padding: '13px 28px', background: 'transparent', color: 'var(--t-2)', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, cursor: 'pointer', transition: 'border-color 0.2s, color 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.color = G; e.currentTarget.style.borderColor = 'var(--gold-line)' }}
                onMouseLeave={e => { e.currentTarget.style.color = 'var(--t-2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
                Member Login →
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <a href="/community"
              style={{ display: 'inline-flex', alignItems: 'center', padding: '13px 28px', background: 'transparent', color: 'var(--t-2)', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, textDecoration: 'none', transition: 'border-color 0.2s, color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.color = G; e.currentTarget.style.borderColor = 'var(--gold-line)' }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--t-2)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}>
              Enter War Room →
            </a>
          </SignedIn>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' as const, justifyContent: 'center', animation: 'fadeUp 0.7s 0.3s both' }}>
          {[
            { n: '800+', l: 'Spirits Documented' },
            { n: 'AI', l: 'Spirit Diagnostics' },
            { n: 'Free', l: 'Entry Tier' },
            { n: 'Live', l: 'Active Community' },
          ].map(({ n, l }) => (
            <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px', border: '1px solid var(--gold-line)', borderRadius: 2, background: 'rgba(201,168,76,0.04)' }}>
              <span style={{ fontFamily: cinzel, fontSize: 13, fontWeight: 700, color: G }}>{n}</span>
              <span style={{ fontFamily: mono, fontSize: 9, color: 'var(--t-4)', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>{l}</span>
            </div>
          ))}
        </div>
      </div>

    </section>
  )
}

// ── MISSION BRIEFING ─────────────────────────────────────
function MissionBriefing() {
  const missions = [
    {
      icon: '⚔',
      title: 'Intel Archive',
      sub: 'OPERATIONAL DATABASE',
      body: 'Search 800+ documented spirits by name, alias, type, kingdom, and function. Unlock entry points, legal rights, protocols, and exorcist notes with membership.',
      cta: 'Search Archive',
      href: '#database',
      cls: 'IV' as const,
    },
    {
      icon: '🗡',
      title: 'Session Center',
      sub: 'ACTIVE MINISTRY',
      body: 'Submit a ministry assessment and receive a personal response from our deliverance team. Access the AI assistant for session preparation and protocol guidance.',
      cta: 'Begin Assessment',
      href: '/assessment',
      cls: 'III' as const,
    },
    {
      icon: '📄',
      title: 'Field Training',
      sub: 'PROTOCOL LIBRARY',
      body: 'Step-by-step deliverance protocols for every major strongman. Structured PDFs for Freemasonry, soul ties, occult doorways, and more.',
      cta: 'View Library',
      href: COMMUNITY_URL,
      cls: 'III' as const,
    },
  ]

  return (
    <section style={{ padding: '4rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 36 }}>
        <SectionLabel>Mission Briefing</SectionLabel>
      </div>
      <div className="wri-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {missions.map(m => (
          <TacticalCard key={m.title} brackets glow style={{ display: 'flex', flexDirection: 'column' as const, height: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 28 }}>{m.icon}</div>
              <ClassBadge level={m.cls} label={m.sub} />
            </div>
            <div style={{ fontFamily: cinzel, fontSize: 14, fontWeight: 600, color: 'var(--t-0)', marginBottom: 10, letterSpacing: '0.04em' }}>{m.title}</div>
            <p style={{ fontSize: 13, color: 'var(--t-2)', lineHeight: 1.7, fontFamily: reading, flex: 1, marginBottom: 20 }}>{m.body}</p>
            <a href={m.href}
              style={{ display: 'inline-flex', alignItems: 'center', padding: '8px 16px', background: 'linear-gradient(180deg, var(--gold) 0%, #b89538 100%)', color: '#1a1305', fontFamily: cinzel, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em', textDecoration: 'none', borderRadius: 2, alignSelf: 'flex-start' }}
              onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
              onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
              {m.cta} ⚔
            </a>
          </TacticalCard>
        ))}
      </div>
    </section>
  )
}

// ── DATABASE (unchanged logic) ────────────────────────────
function DatabaseSection() {
  const [entries, setEntries] = useState<DemonEntry[]>([])
  const [filtered, setFiltered] = useState<DemonEntry[]>([])
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const PER_PAGE = 8
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/demons')
      .then(r => r.json())
      .then(data => { setEntries(data.demons || []); setFiltered(data.demons || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const q = search.toLowerCase()
    const result = entries.filter(d => {
      const matchesSearch = !q || d.name.toLowerCase().includes(q) || (d.aka || '').toLowerCase().includes(q) || (d.function || '').toLowerCase().includes(q)
      const matchesType = typeFilter === 'All Types' || d.type === typeFilter
      return matchesSearch && matchesType
    })
    setFiltered(result)
    setPage(1)
  }, [search, typeFilter, entries])

  const total = filtered.length
  const totalPages = Math.ceil(total / PER_PAGE)
  const pageEntries = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  return (
    <section id="database" style={{ padding: '4rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <SectionLabel action="+ SUBMIT DEMON" onAction={() => window.location.href = '/submit-demon'}>
          Intel Archive · Demon Database
        </SectionLabel>
      </div>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 700, color: 'var(--t-0)', marginBottom: 6 }}>
            The <span style={{ color: G }}>Demon Database</span>
          </div>
          <p style={{ fontSize: 14, color: 'var(--t-3)', fontFamily: reading, fontStyle: 'italic' }}>
            {loading ? 'Loading database...' : (search || typeFilter !== 'All Types') ? `${filtered.length} of ${entries.length} entries` : `${entries.length} entries · Detailed fields unlock with membership`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <ClassBadge level="IV" label="FREE ACCESS" />
          <HUDChip>{entries.length} Entries</HUDChip>
        </div>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' as const }}>
        <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t-4)', fontSize: 13 }}>⚔</span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, alias, or function..."
            style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--gold-line)', borderRadius: 2, padding: '10px 12px 10px 36px', fontFamily: reading, fontSize: 14, color: 'var(--t-0)', outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.2s' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'var(--gold-line-hi)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--gold-line)')}
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ background: 'var(--bg-2)', border: '1px solid var(--gold-line)', borderRadius: 2, padding: '10px 12px', fontFamily: mono, fontSize: 10, letterSpacing: '0.06em', color: 'var(--t-2)', outline: 'none', cursor: 'pointer', minWidth: 160 }}>
          {DEMON_TYPES.map(t => <option key={t} value={t} style={{ background: 'var(--bg-2)' }}>{t}</option>)}
        </select>
        {(search || typeFilter !== 'All Types') && (
          <button onClick={() => { setSearch(''); setTypeFilter('All Types') }}
            style={{ fontFamily: mono, fontSize: 10, padding: '9px 14px', background: 'transparent', border: '1px solid var(--gold-line)', borderRadius: 2, color: 'var(--t-3)', cursor: 'pointer' }}>
            Clear ×
          </button>
        )}
      </div>

      {/* Lock banner */}
      <div className="db-banner" style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid var(--gold-line)', borderRadius: 2, padding: '10px 16px', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8 }}>
        <span style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.07em', color: 'var(--t-3)' }}>
          FREE: Name · Type · Kingdom · Function&nbsp;&nbsp;|&nbsp;&nbsp;
          SOLDIER: + Manifestations · Scripture · Strongman&nbsp;&nbsp;|&nbsp;&nbsp;
          COMMANDER: + Entry Points · Legal Rights · Protocol&nbsp;&nbsp;|&nbsp;&nbsp;
          GENERAL: + Symptoms · Companions · Exorcist Notes
        </span>
        <a href={SOLDIER_URL} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: G, background: 'rgba(201,168,76,0.1)', padding: '4px 12px', borderRadius: 2, textDecoration: 'none', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
          JOIN TO UNLOCK →
        </a>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid var(--gold-line)', borderRadius: 4, overflow: 'hidden' }}>
        <div className="db-table-header" style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1fr 36px', background: 'var(--bg-3)', padding: '10px 20px', borderBottom: '1px solid var(--gold-line)' }}>
          {['Name / Alias', 'Type', 'Description', ''].map((h, i) => (
            <div key={h} className={i === 2 ? 'db-table-header-func' : ''} style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: 'var(--t-4)', textTransform: 'uppercase' as const }}>{h}</div>
          ))}
        </div>

        {loading && <div style={{ padding: '4rem', textAlign: 'center', fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.1em', animation: 'pulse-gold 1.5s ease infinite' }}>Loading database...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontFamily: cinzel, fontSize: 13, color: G, marginBottom: 8 }}>No entries found</div>
            <p style={{ fontSize: 14, color: 'var(--t-3)', fontStyle: 'italic' }}>Try a different search term or clear the filter.</p>
          </div>
        )}

        {pageEntries.map((entry, i) => (
          <div key={entry.id} style={{ borderBottom: i < pageEntries.length - 1 ? '1px solid var(--gold-line)' : 'none' }}>
            <div
              className="db-row"
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              style={{ display: 'grid', gridTemplateColumns: '1fr 90px 1fr 36px', padding: '13px 20px', cursor: 'pointer', transition: 'background 0.15s', alignItems: 'start' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div className="db-row-name">
                <div style={{ fontFamily: cinzel, fontSize: 13, color: 'var(--t-0)', fontWeight: 600, marginBottom: 3 }}>{entry.name}</div>
                {entry.aka && <div style={{ fontSize: 12, color: 'var(--t-4)', fontStyle: 'italic' }}>{entry.aka}</div>}
              </div>
              <div className="db-row-type">
                {(() => {
                  const primary = (entry.type || '').split('/')[0].trim() || '—'
                  const color = typeColor(primary)
                  return (
                    <span title={entry.type || undefined} style={{ fontFamily: mono, fontSize: 9, letterSpacing: '0.08em', padding: '3px 8px', borderRadius: 2, background: color + '22', color, border: `1px solid ${color}44`, display: 'block', maxWidth: 85, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {primary}
                    </span>
                  )
                })()}
              </div>
              <div className="db-row-func" style={{ fontSize: 13, color: 'var(--t-2)', lineHeight: 1.5, paddingRight: 8 }}>
                {entry.description ? (entry.description.length > 120 ? entry.description.slice(0, 120) + '...' : entry.description) : '—'}
              </div>
              <div className="db-row-toggle" style={{ textAlign: 'center', color: G, fontSize: 16, transition: 'transform 0.2s', transform: expanded === entry.id ? 'rotate(45deg)' : 'rotate(0)' }}>+</div>
            </div>

            {expanded === entry.id && (
              <div style={{ padding: '16px 20px 20px', borderTop: '1px solid var(--gold-line)', background: 'var(--bg-1)' }}>
                <div className="db-expanded-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 20 }}>
                  <div><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>KINGDOM</div><p style={{ fontSize: 13, color: 'var(--t-2)', lineHeight: 1.7, fontFamily: reading }}>{entry.kingdom || 'Not documented'}</p></div>
                  <div><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>DESCRIPTION</div><p style={{ fontSize: 13, color: 'var(--t-2)', lineHeight: 1.7, fontFamily: reading }}>{entry.description || 'Not documented'}</p></div>
                  <div><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>ASSIGNMENT</div><p style={{ fontSize: 13, color: 'var(--t-2)', lineHeight: 1.7, fontFamily: reading }}>{entry.assignment || 'Not documented'}</p></div>
                </div>
                <div style={{ height: 1, background: 'var(--gold-line)', marginBottom: 16 }} />
                <div style={{ fontFamily: mono, fontSize: 7, letterSpacing: '0.22em', color: 'var(--t-4)', marginBottom: 10 }}>🔒 SOLDIER TIER</div>
                <TierCallout title="⚔ Upgrade to Soldier — $19/month · 30 days free" desc="Manifestations, Scripture References, Strongman, and Rank" url={SOLDIER_URL} btnLabel="Upgrade to Soldier" />
                <div className="db-expanded-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                  <div><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>FUNCTION</div><LockedField tier="Soldier" desc="The specific function or role in the demonic hierarchy." upgradeUrl={SOLDIER_URL} /></div>
                  <div><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>MANIFESTATIONS</div><LockedField tier="Soldier" desc="Physical and spiritual signs this spirit produces." upgradeUrl={SOLDIER_URL} /></div>
                  <div><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>SCRIPTURE</div><LockedField tier="Soldier" desc="Biblical passages that identify or give authority over this spirit." upgradeUrl={SOLDIER_URL} /></div>
                  <div><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>STRONGMAN</div><LockedField tier="Soldier" desc="The major strongman this spirit operates under." upgradeUrl={SOLDIER_URL} /></div>
                </div>
                <div style={{ height: 1, background: 'var(--gold-line)', marginBottom: 16 }} />
                <div style={{ fontFamily: mono, fontSize: 7, letterSpacing: '0.22em', color: 'var(--t-4)', marginBottom: 10 }}>🔒 COMMANDER TIER</div>
                <TierCallout title="⚔ Upgrade to Commander — $39/month · 30 days free" desc="Entry Points, Legal Rights, and Deliverance Protocol" url={COMMANDER_URL} btnLabel="Upgrade to Commander" />
                <div className="db-expanded-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
                  <div><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>ENTRY POINTS</div><LockedField tier="Commander" desc="How this spirit gains access — trauma, generational patterns, occult doorways." upgradeUrl={COMMANDER_URL} /></div>
                  <div><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>LEGAL RIGHTS</div><LockedField tier="Commander" desc="What gives this spirit authority: iniquity, oaths, trauma, occult involvement." upgradeUrl={COMMANDER_URL} /></div>
                  <div className="db-expanded-protocol" style={{ gridColumn: 'span 2' }}><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>DELIVERANCE PROTOCOL</div><LockedField tier="Commander" desc="Step-by-step protocol for commanding this spirit out and maintaining freedom." wide upgradeUrl={COMMANDER_URL} /></div>
                </div>
                <div style={{ height: 1, background: 'var(--gold-line)', marginBottom: 16 }} />
                <div style={{ fontFamily: mono, fontSize: 7, letterSpacing: '0.22em', color: 'var(--t-4)', marginBottom: 10 }}>🔒 GENERAL TIER</div>
                <TierCallout title="⚔ Upgrade to General — $97/month · 30 days free" desc="Symptoms, Companion Spirits, and WRI Exorcist Notes" url={GENERAL_URL} btnLabel="Upgrade to General" />
                <div className="db-expanded-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
                  <div><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>SYMPTOMS</div><LockedField tier="General" desc="Physical and mental symptoms this spirit produces." upgradeUrl={GENERAL_URL} /></div>
                  <div><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>COMPANION SPIRITS</div><LockedField tier="General" desc="Spirits that cluster with this one." upgradeUrl={GENERAL_URL} /></div>
                  <div className="db-expanded-protocol" style={{ gridColumn: 'span 2' }}><div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.18em', color: G, marginBottom: 8 }}>WRI EXORCIST NOTES</div><LockedField tier="General" desc="Private ministry notes — field observations, case patterns, operational intelligence." wide upgradeUrl={GENERAL_URL} /></div>
                </div>
                <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--gold-line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--t-4)', fontStyle: 'italic' }}>Know more about this entry? Help us improve the database.</span>
                  <a href={`/submit-demon?suggest=${encodeURIComponent(entry.name)}`}
                    style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: G, textDecoration: 'none', border: '1px solid var(--gold-line)', padding: '5px 14px', borderRadius: 2, transition: 'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-line-hi)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--gold-line)')}>
                    🗡 Suggest a Change
                  </a>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, flexWrap: 'wrap' as const }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', padding: '8px 16px', background: 'transparent', border: '1px solid var(--gold-line)', borderRadius: 2, color: page === 1 ? 'var(--t-4)' : 'var(--t-2)', cursor: page === 1 ? 'default' : 'pointer' }}>
            ← Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
            return (
              <button key={p} onClick={() => setPage(p)}
                style={{ fontFamily: cinzel, fontSize: 10, padding: '8px 14px', background: p === page ? GOLD : 'transparent', border: `1px solid ${p === page ? GOLD : 'var(--gold-line)'}`, borderRadius: 2, color: p === page ? '#1a1305' : 'var(--t-2)', cursor: 'pointer' }}>
                {p}
              </button>
            )
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', padding: '8px 16px', background: 'transparent', border: '1px solid var(--gold-line)', borderRadius: 2, color: page === totalPages ? 'var(--t-4)' : 'var(--t-2)', cursor: page === totalPages ? 'default' : 'pointer' }}>
            Next →
          </button>
          <MonoTime size={9} color="var(--t-4)">{total} entries · Page {page} of {totalPages}</MonoTime>
        </div>
      )}

      {/* Submit CTA */}
      <TacticalCard style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 16 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: 'var(--t-0)', fontWeight: 600, marginBottom: 6 }}>Know a spirit that's not in the database?</div>
          <p style={{ fontSize: 14, color: 'var(--t-2)', fontFamily: reading, fontStyle: 'italic', margin: 0 }}>Help us build the most complete spiritual warfare reference available.</p>
        </div>
        <GoldButton onClick={() => window.location.href = '/submit-demon'} icon="🗡">Submit a Demon</GoldButton>
      </TacticalCard>
    </section>
  )
}

// ── FEATURES GRID ─────────────────────────────────────────
function FeaturesSection() {
  return (
    <section style={{ padding: '4rem 2rem', background: 'var(--bg-1)', borderTop: '1px solid var(--gold-line)', borderBottom: '1px solid var(--gold-line)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <SectionLabel style={{ justifyContent: 'center' }}>Platform Capabilities</SectionLabel>
          <div style={{ fontFamily: cinzel, fontSize: 'clamp(22px, 3.5vw, 36px)', fontWeight: 700, color: 'var(--t-0)', marginTop: 12, marginBottom: 8 }}>
            Built for Those Who Are <span style={{ color: G }}>Serious About the Fight</span>
          </div>
          <p style={{ fontSize: 16, color: 'var(--t-3)', fontFamily: reading, fontStyle: 'italic' }}>Not theory. Not inspiration content. Real tools for real spiritual warfare.</p>
        </div>
        <div className="wri-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {FEATURES.map(f => (
            <TacticalCard key={f.title} brackets style={{ display: 'flex', flexDirection: 'column' as const, height: '100%' }}>
              <span style={{ fontSize: 24, marginBottom: 12, display: 'block' }}>{f.icon}</span>
              <div style={{ fontFamily: cinzel, fontSize: 13, fontWeight: 600, color: 'var(--t-0)', marginBottom: 8, letterSpacing: '0.03em' }}>{f.title}</div>
              <p style={{ fontSize: 13, color: 'var(--t-2)', lineHeight: 1.7, fontFamily: reading, margin: 0 }}>{f.desc}</p>
            </TacticalCard>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <SignUpButton mode="modal">
            <button style={{ padding: '14px 32px', background: GOLD, color: '#1a1305', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', border: 'none', borderRadius: 2, cursor: 'pointer', fontWeight: 700 }}>
              Join Free to Access All Features →
            </button>
          </SignUpButton>
        </div>
      </div>
    </section>
  )
}

// ── MINISTRY INTAKE FORM ─────────────────────────────────
function MinistryIntakeForm() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', location: '', description: '', prior_ministry: '', urgency: '', referral: '', website: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (form.website) return // honeypot
    setSubmitting(true); setError('')
    try {
      const res = await fetch('/api/ministry-intake', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.success) setSubmitted(true)
      else setError('Submission failed. Please try again or email exorcist@warroomintel.com')
    } catch { setError('Network error. Please try again.') }
    setSubmitting(false)
  }

  const fieldStyle: React.CSSProperties = { width: '100%', background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 4, padding: '10px 14px', color: 'var(--t-0)', fontFamily: reading, fontSize: 15, outline: 'none', boxSizing: 'border-box' }
  const labelStyle: React.CSSProperties = { display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: 'var(--t-3)', textTransform: 'uppercase', marginBottom: 6 }

  if (submitted) return (
    <div style={{ textAlign: 'center', padding: '40px 20px' }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>✝</div>
      <div style={{ fontFamily: cinzel, fontSize: 16, color: GOLD, letterSpacing: '0.08em', marginBottom: 12 }}>Request Received</div>
      <div style={{ fontFamily: reading, fontSize: 15, color: 'var(--t-2)', lineHeight: 1.7 }}>Pastor Justin Payne personally reviews every submission. You will hear from us within 48–72 hours.<br />You are not alone. There is freedom through Jesus Christ.</div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Honeypot */}
      <input type="text" name="website" value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} style={{ display: 'none' }} tabIndex={-1} autoComplete="off" />

      <div className="intake-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div><label style={labelStyle}>Full Name *</label><input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={fieldStyle} /></div>
        <div><label style={labelStyle}>Email *</label><input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={fieldStyle} /></div>
        <div><label style={labelStyle}>Phone</label><input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={fieldStyle} /></div>
        <div><label style={labelStyle}>Location / City, State</label><input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} style={fieldStyle} /></div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>What are you experiencing? *</label>
        <textarea required rows={5} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the manifestations, duration, and severity — be specific. Nothing you say will surprise us." style={{ ...fieldStyle, resize: 'vertical' }} />
      </div>

      <div className="intake-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Prior Deliverance Ministry?</label>
          <select value={form.prior_ministry} onChange={e => setForm(f => ({ ...f, prior_ministry: e.target.value }))} style={fieldStyle}>
            <option value="">Select...</option>
            <option>No</option>
            <option>Yes, partial</option>
            <option>Yes, full session</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>Urgency</label>
          <select value={form.urgency} onChange={e => setForm(f => ({ ...f, urgency: e.target.value }))} style={fieldStyle}>
            <option value="">Select...</option>
            <option>Monitoring</option>
            <option>Active struggle</option>
            <option>Crisis — need help now</option>
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <label style={labelStyle}>How did you hear about us?</label>
        <input value={form.referral} onChange={e => setForm(f => ({ ...f, referral: e.target.value }))} style={fieldStyle} />
      </div>

      {error && <div style={{ color: '#ef4444', fontFamily: reading, fontSize: 14, marginBottom: 12 }}>{error}</div>}

      <button type="submit" disabled={submitting} style={{ width: '100%', padding: '14px', background: GOLD, color: '#1a1305', fontFamily: cinzel, fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', border: 'none', borderRadius: 2, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
        {submitting ? 'Submitting...' : 'Submit for Review →'}
      </button>
    </form>
  )
}

function MinistryHelpSection() {
  return (
    <section id="ministry-help" style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <div style={{ fontFamily: cinzel, fontSize: 'clamp(22px,4vw,32px)', color: GOLD, letterSpacing: '0.06em', marginBottom: 12 }}>Are You in Active Spiritual Warfare?</div>
        <div style={{ fontFamily: reading, fontSize: 16, color: 'var(--t-2)', maxWidth: 600, margin: '0 auto', lineHeight: 1.7, fontStyle: 'italic' }}>If you or someone you love is experiencing demonic oppression, torment, or spiritual attack — we want to help. Submit your situation below and Pastor Justin will personally review it.</div>
      </div>
      <MinistryIntakeForm />
    </section>
  )
}

// ── FIELD COMMANDERS ─────────────────────────────────────
function FieldCommandersSection() {
  const commanders = [
    {
      name: 'Pastor Justin Payne',
      role: 'Senior Pastor · Chief Investigator Officer · Chief Exorcist',
      sub: 'GENERAL',
      cls: 'I' as const,
      bio: 'I have spent over 30 years in active ministry, working in the gifts of the Spirit and personally expelling thousands of demonic entities. War Room Intel was born out of that work — a mission to give every deliverance minister the intelligence, tools, and community they need to fight and win.',
      badge: 'General',
    },
    {
      name: 'Ruby Payne',
      role: 'Ministry Co-Lead',
      sub: 'COMMANDER',
      cls: 'II' as const,
      bio: 'Co-minister and session coordinator. Specializes in inner healing, generational bondage, and preparing individuals for deliverance ministry.',
      badge: 'Commander',
    },
    {
      name: 'Dakota McAllister',
      role: 'Field Operations',
      sub: 'SOLDIER',
      cls: 'III' as const,
      bio: 'Field minister and community coordinator. Manages session scheduling, member follow-up, and front-line ministry operations.',
      badge: 'Soldier',
    },
  ]

  return (
    <section style={{ padding: '4rem 2rem', background: 'var(--bg-1)', borderTop: '1px solid var(--gold-line)', borderBottom: '1px solid var(--gold-line)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ marginBottom: 36, textAlign: 'center' }}>
          <SectionLabel style={{ justifyContent: 'center' }}>The Ministry Team</SectionLabel>
          <div style={{ fontFamily: cinzel, fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 700, color: 'var(--t-0)', marginTop: 12, marginBottom: 8 }}>
            Built by Ministers, <span style={{ color: G }}>For Ministers</span>
          </div>
          <p style={{ fontSize: 15, color: 'var(--t-3)', fontFamily: reading, fontStyle: 'italic' }}>Field-tested spiritual warfare intelligence from Staffordtown Church, Copperhill TN.</p>
        </div>
        <div className="wri-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {commanders.map(c => (
            <TacticalCard key={c.name} brackets style={{ display: 'flex', flexDirection: 'column' as const }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(201,168,76,0.2), rgba(201,168,76,0.05))', border: '1px solid var(--gold-line)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: cinzel, fontSize: 18, color: G }}>
                  {c.name.charAt(0)}
                </div>
                <ClassBadge level={c.cls} label={c.sub} />
              </div>
              <div style={{ fontFamily: cinzel, fontSize: 14, fontWeight: 600, color: 'var(--t-0)', marginBottom: 4 }}>{c.name}</div>
              <MonoTime size={10} color="var(--t-4)">{c.role}</MonoTime>
              <div style={{ height: 1, background: 'var(--gold-line)', margin: '14px 0' }} />
              <p style={{ fontSize: 13, color: 'var(--t-2)', lineHeight: 1.7, fontFamily: reading, fontStyle: 'italic', flex: 1, margin: 0 }}>{c.bio}</p>
            </TacticalCard>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <p style={{ fontSize: 14, color: 'var(--t-3)', fontFamily: reading, fontStyle: 'italic', marginBottom: 16 }}>
            A ministry of <a href="https://churchonfire.com" target="_blank" rel="noopener noreferrer" style={{ color: G, textDecoration: 'none' }}>Staffordtown Church</a> · Copperhill, TN
          </p>
        </div>
      </div>
    </section>
  )
}

// ── PRICING ───────────────────────────────────────────────
function PricingSection() {
  const { getToken } = useAuth()
  const { user } = useUser()
  const [foundingCount, setFoundingCount] = useState<number | null>(null)
  const userTier = (user?.publicMetadata?.tier as string) || ''
  const isFoundingMember = !!(user?.publicMetadata?.foundingMember) || userTier.startsWith('charter')
  useEffect(() => {
    fetch('/api/founding-general-count')
      .then(r => r.json())
      .then(d => setFoundingCount(d.count ?? 0))
      .catch(() => {})
  }, [])

  const tiers = [
    {
      name: 'Watchman', cls: 'IV' as const, price: '$0', period: 'forever', badge: null,
      features: ['General community discussion', 'Prayer requests board', 'Weekly devotional posts', 'Demon database — name, type, kingdom, function', 'Watchman protocol PDFs', '5 AI asks/day (Ask SOL, Bible AI)'],
      locked: ['Full database fields', 'Scripture & entry points', 'Deliverance protocols', 'Ministry calls'],
      btn: 'Join as Watchman', tier: null, featured: false, isSignup: true,
    },
    {
      name: 'Soldier', cls: 'III' as const, price: '$19', period: '/month', badge: null,
      features: ['Everything in Watchman', 'Full database access', 'Scripture & entry point fields', 'Manifestations, Strongman, Rank fields', 'Soldier protocol PDFs', 'Monthly group prayer call', '20 AI asks/day + Gateway & Dream Interpreter'],
      locked: ['Commander fields', 'Bi-weekly calls'],
      btn: 'Start Free Trial', tier: 'soldier', featured: false, isSignup: false,
    },
    {
      name: 'Commander', cls: 'II' as const, price: '$39', period: '/month', badge: 'Most Popular',
      features: ['Everything in Soldier', 'All database fields unlocked', 'Full protocol PDF library', 'Personal assessment response', 'Entry Points, Legal Rights, Protocol fields', 'Bi-weekly group call', '50 AI asks/day + Symptom Investigator + Session AI'],
      locked: ['Weekly intimate calls'],
      btn: 'Join Commander', tier: 'commander', featured: true, isSignup: false,
    },
    {
      name: "General's Table", cls: 'I' as const, price: '$97', period: '/month', badge: null,
      features: ["Everything in Commander", 'Leadership PDF library', 'Weekly intimate group call', 'Direct ministry access', 'Symptoms, Companion Spirits, Exorcist Notes', 'Ministry certification track', 'Priority assessment response', 'Unlimited AI across all tools'],
      locked: [],
      btn: "Join General's Table", tier: 'general', featured: false, isSignup: false,
    },
  ]

  return (
    <section id="pricing" style={{ padding: '4rem 2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <SectionLabel>Membership</SectionLabel>
        <div style={{ fontFamily: cinzel, fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 700, color: 'var(--t-0)', marginTop: 12, marginBottom: 8 }}>
          Join the <span style={{ color: G }}>War Room</span>
        </div>
        <p style={{ fontSize: 15, color: 'var(--t-3)', fontFamily: reading, fontStyle: 'italic' }}>Start free. All paid tiers include a 30-day free trial. Charter pricing locked for life for the first 100 members.</p>
      </div>

      {/* Live banner */}
      <TacticalCard style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <HUDChip active>⚔ COMMUNITY LIVE</HUDChip>
          <span style={{ fontSize: 13, color: 'var(--t-2)', fontFamily: reading, fontStyle: 'italic' }}>
            All plans include a 30-day free trial. Watchman requires no card.
          </span>
        </div>
        <a href={COMMUNITY_URL}
          style={{ fontFamily: cinzel, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', padding: '8px 18px', background: GOLD, color: '#1a1305', textDecoration: 'none', borderRadius: 2 }}>
          Enter Community →
        </a>
      </TacticalCard>

      {/* Charter callout */}
      <div style={{ background: 'linear-gradient(135deg, rgba(201,168,76,0.15) 0%, rgba(201,168,76,0.05) 100%)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, padding: '16px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 12, color: GOLD, letterSpacing: '0.12em', marginBottom: 4 }}>⚡ Charter Founding Member Slots Available — First 100 Only</div>
          <div style={{ fontFamily: reading, fontSize: 14, color: 'var(--t-2)' }}>Lock in your rate for life. Charter Soldier: $9/mo. Charter Commander: $20/mo.</div>
        </div>
        <a href="/membership" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: '#1a1305', background: GOLD, padding: '9px 20px', borderRadius: 2, textDecoration: 'none', whiteSpace: 'nowrap' as const }}>Claim Charter Access →</a>
      </div>

      <div className="wri-4col" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {tiers.map(tier => (
          <TacticalCard key={tier.name} brackets={tier.featured} glow={tier.featured} style={{ display: 'flex', flexDirection: 'column' as const, position: 'relative', border: tier.featured ? '1px solid var(--gold-line-hi)' : undefined }}>
            {tier.badge && (
              <div style={{ position: 'absolute', top: -1, left: '50%', transform: 'translateX(-50%)', background: GOLD, color: '#1a1305', fontFamily: cinzel, fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', padding: '3px 12px', borderRadius: '0 0 3px 3px', whiteSpace: 'nowrap' as const }}>
                {tier.badge}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', color: G }}>{tier.name}</span>
              <ClassBadge level={tier.cls} label={tier.cls === 'IV' ? 'FREE' : tier.cls === 'III' ? 'SOLD' : tier.cls === 'II' ? 'CMD' : 'GEN'} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <span style={{ fontFamily: cinzel, fontSize: 34, fontWeight: 700, color: 'var(--t-0)' }}>{tier.price}</span>
              <span style={{ fontSize: 13, color: 'var(--t-4)', marginLeft: 4 }}>{tier.period}</span>
            </div>
            <div style={{ height: 1, background: 'var(--gold-line)', marginBottom: 14 }} />
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 14px', display: 'flex', flexDirection: 'column' as const, gap: 7, flex: 1 }}>
              {tier.features.map(f => {
                return (
                  <li key={f} style={{ fontSize: 12, color: 'var(--t-2)', display: 'flex', gap: 7, alignItems: 'flex-start', lineHeight: 1.7 }}>
                    <span style={{ color: G, fontSize: 7, flexShrink: 0, marginTop: 5 }}>✦</span>
                    <span>{f.replace(' (Coming Soon)', '')}</span>
                  </li>
                )
              })}
              {tier.locked.map(f => (
                <li key={f} style={{ fontSize: 12, color: 'var(--t-4)', display: 'flex', gap: 7, alignItems: 'flex-start', lineHeight: 1.7, opacity: 0.4 }}>
                  <span style={{ fontSize: 7, flexShrink: 0, marginTop: 4 }}>○</span>
                  <span>{f.replace(' (Coming Soon)', '')}</span>
                </li>
              ))}
            </ul>
            {tier.isSignup ? (
              <SignUpButton mode="modal">
                <button style={{ width: '100%', padding: '11px', background: 'transparent', color: G, border: '1px solid var(--gold-line)', borderRadius: 2, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' as const, boxSizing: 'border-box' as const }}>
                  Join as Watchman ⚔
                </button>
              </SignUpButton>
            ) : (
              <button
                onClick={() => handleUpgrade(tier.tier!, getToken)}
                style={{ width: '100%', padding: '11px', fontFamily: cinzel, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', borderRadius: 2, border: tier.featured ? 'none' : '1px solid var(--gold-line-hi)', background: tier.featured ? 'linear-gradient(180deg, var(--gold) 0%, #b89538 100%)' : 'transparent', color: tier.featured ? '#1a1305' : G, textAlign: 'center' as const, boxSizing: 'border-box' as const, cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                {tier.btn} ⚔
              </button>
            )}
          </TacticalCard>
        ))}
      </div>

      {/* Founding General card */}
      {(() => {
        const spotsLeft = foundingCount !== null ? Math.max(0, 100 - foundingCount) : null
        const soldOut = spotsLeft !== null && spotsLeft <= 0
        return (
          <TacticalCard brackets style={{ marginTop: 20, background: 'linear-gradient(135deg, rgba(201,168,76,0.07) 0%, transparent 100%)', border: '1px solid rgba(201,168,76,0.45)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 24, alignItems: 'flex-start' }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.15em', color: G }}>⚜ FOUNDING GENERAL</span>
                  <ClassBadge level="I" label="LIFE" />
                  {soldOut
                    ? <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: '#e05c5c', background: 'rgba(224,92,92,0.12)', border: '1px solid rgba(224,92,92,0.3)', padding: '2px 8px', borderRadius: 10 }}>SOLD OUT</span>
                    : spotsLeft !== null && <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: G, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', padding: '2px 8px', borderRadius: 10 }}>{spotsLeft} of 100 remaining</span>}
                </div>
                <div>
                  <span style={{ fontFamily: cinzel, fontSize: 34, fontWeight: 700, color: 'var(--t-0)' }}>$1,000</span>
                  <span style={{ fontSize: 13, color: 'var(--t-4)', marginLeft: 8 }}>one-time · lifetime access</span>
                </div>
                <p style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: 'var(--t-3)', fontStyle: 'italic', marginTop: 8, marginBottom: 0, lineHeight: 1.6 }}>
                  Lock in every current and future feature at the General's Table — forever. Founding Generals receive a permanent badge, first access to new tools, and recognition in the War Room community.
                </p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, minWidth: 200 }}>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                  {["Everything in General's Table", 'Lifetime access — no monthly fees', '⚜ Founding General badge', 'First access to new features', 'Name in the War Room founders list', 'One-time payment, never charged again'].map(f => (
                    <li key={f} style={{ fontSize: 12, color: 'var(--t-2)', display: 'flex', gap: 7, alignItems: 'flex-start', lineHeight: 1.6 }}>
                      <span style={{ color: G, fontSize: 7, flexShrink: 0, marginTop: 4 }}>✦</span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  disabled={soldOut}
                  onClick={() => !soldOut && handleUpgrade('founding_general', getToken)}
                  style={{ width: '100%', padding: '11px', fontFamily: cinzel, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', borderRadius: 2, border: '1px solid var(--gold-line-hi)', background: soldOut ? 'transparent' : 'linear-gradient(180deg, var(--gold) 0%, #b89538 100%)', color: soldOut ? 'var(--t-4)' : '#1a1305', cursor: soldOut ? 'not-allowed' : 'pointer', opacity: soldOut ? 0.5 : 1, transition: 'opacity 0.2s', boxSizing: 'border-box' as const }}>
                  {soldOut ? 'Sold Out' : 'Secure Your Founding Seat ⚔'}
                </button>
                <p style={{ fontSize: 10, color: 'var(--t-4)', fontFamily: 'Georgia, serif', fontStyle: 'italic', margin: 0, textAlign: 'center' as const, lineHeight: 1.5 }}>
                  Limited to 100 founding members. Non-refundable. Does not include a subscription — this is a one-time lifetime access purchase.
                </p>
              </div>
            </div>
          </TacticalCard>
        )
      })()}

      {/* Founding Member recognition — shown only to charter members */}
      {isFoundingMember && (
        <TacticalCard style={{ marginTop: 20, background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.4)', textAlign: 'center' as const }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: 'var(--gold)', letterSpacing: '0.12em', marginBottom: 6 }}>⚜ Thank You for Being a Founding Member</div>
          <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: 'var(--t-2)', margin: 0, lineHeight: 1.6 }}>
            Your charter rate is locked for life. As a founding member you carry a permanent badge and early access to every new feature we build for the War Room.
          </p>
          <a href="/community" style={{ display: 'inline-block', marginTop: 14, padding: '8px 22px', background: 'var(--gold)', color: '#0D0B14', fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', borderRadius: 4, textDecoration: 'none' }}>Enter the War Room ⚔</a>
        </TacticalCard>
      )}

      {/* Charter callout — shown to non-founders */}
      {!isFoundingMember && (
        <TacticalCard style={{ marginTop: 20, textAlign: 'center' as const }}>
          <MonoTime size={10} color="var(--gold)">⚔ Founding Member Rates Available · Charter Soldier $9/mo · Charter Commander $20/mo · First 100 Only</MonoTime>
        </TacticalCard>
      )}

      <p style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: 'var(--t-4)', fontFamily: reading, fontStyle: 'italic' }}>
        Questions? Email{' '}
        <a href="mailto:exorcist@warroomintel.com" style={{ color: G, textDecoration: 'none' }}>exorcist@warroomintel.com</a>
      </p>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section id="faq" style={{ padding: '4rem 2rem', maxWidth: 860, margin: '0 auto' }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <SectionLabel style={{ justifyContent: 'center' }}>Intel Briefing · FAQ</SectionLabel>
        <div style={{ fontFamily: cinzel, fontSize: 'clamp(20px, 3vw, 32px)', fontWeight: 700, color: 'var(--t-0)', marginTop: 12 }}>
          Questions &amp; <span style={{ color: G }}>Answers</span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
        {FAQ.map((item, i) => (
          <TacticalCard key={i} style={{ padding: 0, overflow: 'hidden', border: open === i ? '1px solid var(--gold-line-hi)' : undefined, transition: 'border-color 0.2s' }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', gap: 16, textAlign: 'left' as const }}>
              <span style={{ fontFamily: cinzel, fontSize: 12, fontWeight: 600, color: open === i ? G : 'var(--t-0)', letterSpacing: '0.03em', lineHeight: 1.4 }}>{item.q}</span>
              <span style={{ color: G, fontSize: 18, opacity: 0.7, flexShrink: 0, transition: 'transform 0.2s', transform: open === i ? 'rotate(45deg)' : 'rotate(0)', display: 'inline-block' }}>+</span>
            </button>
            {open === i && (
              <div style={{ padding: '4px 20px 18px', borderTop: '1px solid var(--gold-line)' }}>
                <p style={{ fontSize: 14, color: 'var(--t-2)', lineHeight: 1.8, fontFamily: reading, margin: 0 }}>{item.a}</p>
              </div>
            )}
          </TacticalCard>
        ))}
      </div>
    </section>
  )
}

// ── FOOTER ────────────────────────────────────────────────
function TacticalFooter() {
  return (
    <footer style={{ borderTop: '1px solid var(--gold-line)', background: 'var(--bg-0)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '3rem 2rem' }}>
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <img src="/logo.png" alt="War Room Intel" style={{ height: 36, width: 36, objectFit: 'contain' }} />
              <div>
                <div style={{ fontFamily: cinzel, fontSize: 11, fontWeight: 600, color: G, letterSpacing: '0.12em' }}>WAR ROOM INTEL</div>
                <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.2em', color: 'var(--t-4)' }}>SPIRITUAL WARFARE</div>
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--t-4)', lineHeight: 1.7, maxWidth: 260, fontFamily: reading, fontStyle: 'italic', marginBottom: 10 }}>
              A spiritual warfare ministry resource. Not a substitute for professional medical or psychological care.
            </p>
            <p style={{ fontSize: 12, color: 'var(--t-4)', lineHeight: 1.6 }}>
              A ministry of <a href="https://churchonfire.com" target="_blank" rel="noopener noreferrer" style={{ color: G, textDecoration: 'none' }}>Staffordtown Church</a><br />
              Copperhill, TN · Tennessee, USA
            </p>
          </div>
          <div>
            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.2em', color: G, marginBottom: 12 }}>MINISTRY TOOLS</div>
            {[{ label: 'Demon Database', href: '#database' }, { label: 'Ministry Help', href: '#ministry-help' }, { label: 'Submit a Demon', href: '/submit-demon' }, { label: 'Donate', href: '/donate' }].map(({ label, href }) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <a href={href} style={{ fontSize: 12, color: 'var(--t-4)', textDecoration: 'none', transition: 'color 0.2s', fontFamily: reading }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-4)')}>
                  {label}
                </a>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.2em', color: G, marginBottom: 12 }}>MEMBERSHIP</div>
            {[
              { label: 'Watchman — Free', url: SIGNUP_URL },
              { label: 'Soldier — $19/mo', url: SOLDIER_URL },
              { label: 'Commander — $39/mo', url: COMMANDER_URL },
              { label: "General — $97/mo", url: GENERAL_URL },
            ].map(({ label, url }) => (
              <div key={label} style={{ marginBottom: 8 }}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--t-4)', textDecoration: 'none', fontFamily: reading, transition: 'color 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-4)')}>
                  {label}
                </a>
              </div>
            ))}
            <div style={{ marginTop: 8 }}>
              <a href={COMMUNITY_URL} style={{ fontSize: 10, color: G, textDecoration: 'none', fontFamily: cinzel, letterSpacing: '0.08em' }}>⚔ Community Login →</a>
            </div>
          </div>
          <div>
            <div style={{ fontFamily: mono, fontSize: 8, letterSpacing: '0.2em', color: G, marginBottom: 12 }}>CONTACT</div>
            <a href="mailto:exorcist@warroomintel.com" style={{ fontSize: 12, color: 'var(--t-4)', textDecoration: 'none', fontFamily: reading, display: 'block', marginBottom: 8, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-4)')}>
              exorcist@warroomintel.com
            </a>
            <a href="https://churchonfire.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--t-4)', textDecoration: 'none', fontFamily: reading, display: 'block', marginBottom: 16, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-4)')}>
              churchonfire.com
            </a>
            <div style={{ display: 'flex', gap: 14 }}>
              {[
                { l: '🎥 YouTube', h: 'https://www.youtube.com/@war_room_intel' },
                { l: '📘 Facebook', h: 'https://www.facebook.com/warroomintel' },
              ].map(({ l, h }) => (
                <a key={l} href={h} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: G, textDecoration: 'none', fontFamily: reading, transition: 'opacity 0.2s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid var(--gold-line)', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 }}>
          <MonoTime size={10} color="var(--t-4)">© {new Date().getFullYear()} WAR ROOM INTEL · A MINISTRY OF STAFFORDTOWN CHURCH · COPPERHILL, TN</MonoTime>
          <div style={{ display: 'flex', gap: 20 }}>
            {[{ l: 'Terms of Service', h: '/terms' }, { l: 'Privacy Policy', h: '/privacy' }, { l: 'Donate', h: '/donate' }].map(({ l, h }) => (
              <a key={l} href={h} style={{ fontSize: 11, color: 'var(--t-4)', textDecoration: 'none', fontFamily: reading, transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = GOLD)}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t-4)')}>
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ── VIDEO SECTION ────────────────────────────────────────
function VideoSection() {
  return (
    <section style={{ padding: '60px 24px', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontFamily: cinzel, fontSize: 'clamp(20px,3vw,28px)', color: GOLD, letterSpacing: '0.06em', marginBottom: 8 }}>Why I Built War Room Intel</div>
      <div style={{ fontFamily: reading, fontSize: 15, color: 'var(--t-3)', fontStyle: 'italic', marginBottom: 28 }}>A word from Pastor Justin Payne, Staffordtown Church</div>
      <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '60px 24px', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 16 }}>
        <div style={{ fontSize: 48 }}>▶</div>
        <div style={{ fontFamily: cinzel, fontSize: 14, color: 'var(--t-2)', letterSpacing: '0.06em' }}>Video Coming Soon</div>
        <a href="https://youtube.com/@warroomintel" target="_blank" rel="noopener noreferrer" style={{ fontFamily: reading, fontSize: 14, color: GOLD, textDecoration: 'none' }}>Subscribe to our YouTube channel to be notified when this releases →</a>
      </div>
    </section>
  )
}

// ── DATABASE GATE (signed-out view) ──────────────────────
function DatabaseGate() {
  return (
    <section id="database" style={{ padding: '80px 24px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, padding: '40px 48px', textAlign: 'center' }}>
        <div style={{ fontFamily: cinzel, fontSize: 'clamp(18px,3vw,26px)', color: GOLD, letterSpacing: '0.08em', marginBottom: 16 }}>⚔ Intel Archive — 322+ Spirit Dossiers</div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, maxWidth: 480, margin: '0 auto 28px', textAlign: 'left' }}>
          {['Full dossier per entity — names, aliases, rank, assignments, manifestations', 'AI-enhanced intelligence with ministry context', 'Body map of 131 anatomical manifestation hotspots', 'Spirit hierarchy — trace companion spirits and territorial networks'].map(f => (
            <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: reading, fontSize: 15, color: 'var(--t-2)' }}>
              <span style={{ color: GOLD, flexShrink: 0 }}>⚔</span>{f}
            </div>
          ))}
        </div>
        <SignUpButton mode="modal">
          <button style={{ padding: '14px 32px', background: GOLD, color: '#1a1305', fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', border: 'none', borderRadius: 2, cursor: 'pointer' }}>
            Access the Database — Free to Join →
          </button>
        </SignUpButton>
        <div style={{ marginTop: 12, fontFamily: reading, fontSize: 13, color: 'var(--t-4)', fontStyle: 'italic' }}>Creating an account is free. No credit card required.</div>
      </div>
    </section>
  )
}

// ── PAGE ─────────────────────────────────────────────────
function WarRoomHome() {
  return (
    <div style={{ background: 'var(--bg-0)', minHeight: '100vh', width: '100%', overflowX: 'hidden' }}>
      <style>{pageStyles}</style>
      <TacticalHero />
      <ClassifiedTicker />
      <MissionBriefing />
      <SignedIn>
        <DatabaseSection />
      </SignedIn>
      <SignedOut>
        <DatabaseGate />
      </SignedOut>
      <FeaturesSection />
      <VideoSection />
      <MinistryHelpSection />
      <FieldCommandersSection />
      <PricingSection />
      <FAQSection />
      <TacticalFooter />
    </div>
  )
}
