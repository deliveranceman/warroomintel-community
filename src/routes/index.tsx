import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'

export const Route = createFileRoute('/')({
  component: WarRoomHome,
})

// ── TYPES ────────────────────────────────────────────────
interface DemonEntry {
  id: string
  name: string
  aka: string
  type: string
  function: string
  manifestation?: string
  scripture?: string
  entryPoints?: string
  protocol?: string
}

// ── CONSTANTS ────────────────────────────────────────────
const DEMON_TYPES = ['All Types','Principality','Power','Strongman','Spirit','Fallen Angel','Duke of Hell','Prince of Hell','Female Demon','Spirit of Infirmity','Spirit of Rebellion','Spirit of Divination','Familiar Spirit','Unclean Spirit','Other']

const FEATURES = [
  { icon: '⚔', title: 'Master Demon Database', desc: '251+ documented spirits — names, aliases, types, functions, and manifestations. Free members see full entries. Locked fields unlock with membership.' },
  { icon: '📋', title: 'Ministry Assessment Tool', desc: 'A confidential 9-step intake wizard. Submit your situation and receive a personal response from our deliverance team.' },
  { icon: '📄', title: 'Protocol PDF Library', desc: 'Step-by-step deliverance protocols for every major strongman — Freemasonry, soul ties, occult doorways, lust, addiction and more.' },
  { icon: '🗣', title: 'Live Ministry Calls', desc: 'Monthly group calls for Soldier members. Bi-weekly Q&A for Commander. Weekly intimate sessions for General members.' },
  { icon: '✦', title: 'Scripture Arsenal', desc: 'Community-built warfare scripture library organized by battle category — fear, rejection, witchcraft, identity and more.' },
  { icon: '🗡', title: 'Community Submissions', desc: 'Submit new demon entries, suggest corrections, and contribute to the most comprehensive spiritual warfare database available.' },
]

const FAQ = [
  { q: 'Is this a replacement for professional mental health care?', a: 'No. War Room Intel is a spiritual ministry resource only. We are not licensed therapists or medical practitioners. If you are experiencing a mental health crisis please seek professional support. We encourage maintaining any current medical or therapeutic treatment alongside ministry.' },
  { q: 'How is my assessment information kept confidential?', a: 'All assessment information is seen only by our ministry team and is never published, shared, or sold. Anything posted to the public response board is fully anonymized with your permission.' },
  { q: 'What denominations or theological traditions does this represent?', a: 'War Room Intel is rooted in Scripture and Charismatic/Pentecostal ministry tradition. We operate under the pastoral oversight of Staffordtown Church, Copperhill TN. We welcome all Spirit-filled believers regardless of denomination.' },
  { q: 'When will paid membership be available?', a: 'We are currently building out the full membership platform. Sign up for our email list to be notified the moment we launch. In the meantime the database, assessment tool, and response board are fully available.' },
  { q: 'Can I submit a demon that is not in the database?', a: 'Yes! Use the Submit a Demon form in the Assessment menu. All submissions are reviewed by our ministry team before being added. We credit contributors where possible.' },
  { q: 'How do I get a personal ministry response?', a: 'Take the free assessment at warroomintel.com/assessment. Our ministry team personally reviews every submission and responds to the email address you provide.' },
]

// ── HELPERS ──────────────────────────────────────────────
const cinzel = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const gold = 'var(--gold)'
const deep = 'var(--deep)'
const surface = 'var(--surface)'
const surface2 = 'var(--surface2)'
const border = 'var(--border)'
const borderBright = 'var(--border-bright)'
const text = 'var(--text)'
const textDim = 'var(--text-dim)'
const muted = 'var(--muted)'

function typeColor(type: string) {
  const map: Record<string, string> = {
    'Principality': '#7C5CBF', 'Power': '#5C7CBF', 'Strongman': '#C9A84C',
    'Fallen Angel': '#8B5E3C', 'Spirit': '#4B8C6E', 'Duke of Hell': '#8C4B4B',
    'Female Demon': '#9B4B8C', 'Spirit of Divination': '#5B8C8C',
    'Familiar Spirit': '#6B7C8C', 'Spirit of Infirmity': '#7C6B4B',
  }
  return map[type] || '#6B6480'
}

// ── COMPONENTS ───────────────────────────────────────────

function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '0 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--border-bright), transparent)' }} />
      {label && <span style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.25em', color: muted, whiteSpace: 'nowrap' as const }}>{label}</span>}
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--border-bright), transparent)' }} />
    </div>
  )
}

// ── HERO ─────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ minHeight: '94vh', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '5rem 2rem 4rem', position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,168,76,0.07) 0%, transparent 65%), radial-gradient(ellipse 40% 30% at 80% 80%, rgba(138,80,255,0.04) 0%, transparent 60%)', pointerEvents: 'none' }} />
      {/* Grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(201,168,76,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(201,168,76,0.03) 1px, transparent 1px)', backgroundSize: '60px 60px', maskImage: 'radial-gradient(ellipse 80% 80% at 50% 50%, black 0%, transparent 100%)', pointerEvents: 'none' }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '820px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '28px', animation: 'fadeUp 0.8s 0s both' }}>
          <img src="/logo.png" alt="War Room Intel" style={{ height: '140px', width: '140px', objectFit: 'contain', filter: 'drop-shadow(0 0 40px rgba(201,168,76,0.3))' }} />
        </div>

        <p style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.35em', color: gold, marginBottom: '20px', animation: 'fadeUp 0.8s 0.1s both' }}>
          ✦ &nbsp; A Ministry of Staffordtown Church · Copperhill, TN &nbsp; ✦
        </p>

        <h1 style={{ fontFamily: cinzel, fontSize: 'clamp(36px, 7vw, 78px)', fontWeight: 700, lineHeight: 1.0, letterSpacing: '0.02em', marginBottom: '20px', animation: 'fadeUp 0.8s 0.2s both' }}>
          The <em style={{ color: gold, fontStyle: 'normal' }}>War Room</em><br />Intelligence
        </h1>

        <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: textDim, fontWeight: 300, fontStyle: 'italic', fontFamily: crimson, maxWidth: '600px', margin: '0 auto 36px', lineHeight: 1.7, animation: 'fadeUp 0.8s 0.3s both' }}>
          The most comprehensive spiritual warfare resource available — a searchable demon database, ministry assessment tool, deliverance protocols, and a growing community of warriors.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' as const, justifyContent: 'center', marginBottom: '20px', animation: 'fadeUp 0.8s 0.4s both' }}>
          <a href="#database" style={{ background: gold, color: deep, fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', padding: '14px 32px', borderRadius: '3px', textDecoration: 'none', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold-light)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.background = gold; e.currentTarget.style.transform = 'translateY(0)' }}>
            Search the Database ⚔
          </a>
          <a href="/assessment" style={{ background: 'transparent', color: gold, fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.1em', padding: '14px 32px', borderRadius: '3px', border: `1px solid ${borderBright}`, textDecoration: 'none', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.08)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
            Take the Assessment →
          </a>
        </div>

        <p style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.12em', color: muted, animation: 'fadeUp 0.8s 0.5s both' }}>
          Free to use · No account required · Membership coming soon
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '40px', justifyContent: 'center', marginTop: '52px', paddingTop: '40px', borderTop: `1px solid ${border}`, flexWrap: 'wrap' as const, animation: 'fadeUp 0.8s 0.55s both' }}>
          {[
            { n: '251+', l: 'Database Entries' },
            { n: 'Free', l: 'To Use' },
            { n: 'Personal', l: 'Ministry Response' },
            { n: 'Live', l: 'Community' },
          ].map(({ n, l }) => (
            <div key={l} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: cinzel, fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 700, color: gold }}>{n}</div>
              <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.18em', color: muted, marginTop: '4px' }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── WHAT YOU GET ─────────────────────────────────────────
function FeaturesSection() {
  return (
    <section style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <p style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.3em', color: gold, marginBottom: '12px' }}>✦ What's Inside</p>
        <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 700, color: text, marginBottom: '12px' }}>
          Built for Those Who Are <em style={{ color: gold, fontStyle: 'normal' }}>Serious About the Fight</em>
        </h2>
        <p style={{ fontSize: '17px', color: textDim, fontStyle: 'italic', fontFamily: crimson, maxWidth: '520px', margin: '0 auto' }}>
          Not theory. Not inspiration content. Real tools for real spiritual warfare.
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1px', background: border, border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
        {FEATURES.map(f => (
          <div key={f.title} style={{ background: surface, padding: '2rem', transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = surface2)}
            onMouseLeave={e => (e.currentTarget.style.background = surface)}>
            <div style={{ fontSize: '26px', marginBottom: '12px' }}>{f.icon}</div>
            <div style={{ fontFamily: cinzel, fontSize: '13px', fontWeight: 600, color: text, marginBottom: '10px' }}>{f.title}</div>
            <p style={{ fontSize: '14px', color: textDim, lineHeight: 1.7, fontWeight: 300 }}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── DATABASE ─────────────────────────────────────────────
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
      .then(data => {
        const demons = data.demons || []
        setEntries(demons)
        setFiltered(demons)
        setLoading(false)
      })
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
    <section id="database" style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '16px', marginBottom: '32px' }}>
        <div>
          <p style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.3em', color: gold, marginBottom: '10px' }}>✦ Master Database</p>
          <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 700, color: text, marginBottom: '8px' }}>
            The <em style={{ color: gold, fontStyle: 'normal' }}>Demon Database</em>
          </h2>
          <p style={{ fontSize: '15px', color: textDim, fontStyle: 'italic', fontFamily: crimson }}>
            {loading ? 'Loading...' : `${total} of ${entries.length} entries shown · Full search available · Detailed fields unlock with membership`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
          <a href="/submit-demon" style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', padding: '9px 18px', borderRadius: '3px', border: `1px solid ${borderBright}`, color: gold, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.08)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            🗡 Submit a Demon
          </a>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
        <div style={{ flex: 1, minWidth: '200px', position: 'relative' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: '14px' }}>⚔</span>
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, alias, or function..."
            style={{ width: '100%', background: surface, border: `1px solid ${border}`, borderRadius: '4px', padding: '11px 14px 11px 38px', fontFamily: crimson, fontSize: '15px', color: text, outline: 'none', boxSizing: 'border-box' as const, transition: 'border-color 0.2s' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)')}
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          style={{ background: surface, border: `1px solid ${border}`, borderRadius: '4px', padding: '11px 14px', fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.06em', color: textDim, outline: 'none', cursor: 'pointer', minWidth: '160px' }}>
          {DEMON_TYPES.map(t => <option key={t} value={t} style={{ background: '#13101E' }}>{t}</option>)}
        </select>
        {(search || typeFilter !== 'All Types') && (
          <button onClick={() => { setSearch(''); setTypeFilter('All Types') }}
            style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', padding: '9px 16px', background: 'transparent', border: `1px solid ${border}`, borderRadius: '4px', color: muted, cursor: 'pointer' }}>
            Clear ×
          </button>
        )}
      </div>

      {/* Membership Coming Soon Banner */}
      <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: '6px', padding: '12px 18px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '14px' }}>🔒</span>
          <span style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', color: gold }}>Detailed fields (Scripture, Entry Points, Protocols) unlock with membership</span>
        </div>
        <span style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.12em', color: muted, background: 'rgba(201,168,76,0.1)', padding: '4px 12px', borderRadius: '2px' }}>MEMBERSHIP COMING SOON</span>
      </div>

      {/* Database Table */}
      <div style={{ border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr 36px', gap: '0', background: surface2, padding: '10px 20px', borderBottom: `1px solid ${border}` }}>
          {['Name / Alias', 'Type', 'Function', ''].map(h => (
            <div key={h} style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.18em', color: muted }}>{h}</div>
          ))}
        </div>

        {loading && (
          <div style={{ padding: '4rem', textAlign: 'center', fontFamily: cinzel, fontSize: '11px', color: gold, letterSpacing: '0.1em' }}>Loading database...</div>
        )}

        {!loading && filtered.length === 0 && (
          <div style={{ padding: '4rem', textAlign: 'center' }}>
            <div style={{ fontFamily: cinzel, fontSize: '13px', color: gold, marginBottom: '8px' }}>No entries found</div>
            <p style={{ fontSize: '14px', color: textDim, fontStyle: 'italic' }}>Try a different search term or clear the filter.</p>
          </div>
        )}

        {pageEntries.map((entry, i) => (
          <div key={entry.id} style={{ borderBottom: i < pageEntries.length - 1 ? `1px solid ${border}` : 'none' }}>
            {/* Row */}
            <div
              onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr 36px', gap: '0', padding: '14px 20px', cursor: 'pointer', transition: 'background 0.15s', alignItems: 'start' }}
              onMouseEnter={e => (e.currentTarget.style.background = surface)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <div>
                <div style={{ fontFamily: cinzel, fontSize: '13px', color: text, fontWeight: 600, marginBottom: '3px' }}>{entry.name}</div>
                {entry.aka && <div style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>{entry.aka}</div>}
              </div>
              <div>
                <span style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.08em', padding: '3px 8px', borderRadius: '2px', background: typeColor(entry.type) + '22', color: typeColor(entry.type), border: `1px solid ${typeColor(entry.type)}44` }}>
                  {entry.type || '—'}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: textDim, lineHeight: 1.5, paddingRight: '8px' }}>
                {entry.function ? (entry.function.length > 120 ? entry.function.slice(0, 120) + '...' : entry.function) : '—'}
              </div>
              <div style={{ textAlign: 'center', color: gold, fontSize: '16px', transition: 'transform 0.2s', transform: expanded === entry.id ? 'rotate(45deg)' : 'rotate(0)' }}>+</div>
            </div>

            {/* Expanded detail */}
            {expanded === entry.id && (
              <div style={{ padding: '16px 20px 20px', borderTop: `1px solid ${border}`, background: 'rgba(13,11,20,0.4)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>

                  {/* Function — always visible */}
                  <div>
                    <div style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>FUNCTION</div>
                    <p style={{ fontSize: '13px', color: textDim, lineHeight: 1.7, fontFamily: crimson }}>{entry.function || 'Not documented'}</p>
                  </div>

                  {/* Manifestations — always visible */}
                  <div>
                    <div style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>MANIFESTATIONS</div>
                    <p style={{ fontSize: '13px', color: textDim, lineHeight: 1.7, fontFamily: crimson }}>{entry.manifestation || 'Not documented'}</p>
                  </div>

                  {/* Scripture — locked */}
                  <div>
                    <div style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>SCRIPTURE REFERENCES</div>
                    <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.15)`, borderRadius: '4px', padding: '10px 12px' }}>
                      <div style={{ fontFamily: cinzel, fontSize: '9px', color: muted, letterSpacing: '0.1em', marginBottom: '4px' }}>🔒 Membership Required</div>
                      <div style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Scripture refs unlock with Soldier tier</div>
                    </div>
                  </div>

                  {/* Entry Points — locked */}
                  <div>
                    <div style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>ENTRY POINTS</div>
                    <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.15)`, borderRadius: '4px', padding: '10px 12px' }}>
                      <div style={{ fontFamily: cinzel, fontSize: '9px', color: muted, letterSpacing: '0.1em', marginBottom: '4px' }}>🔒 Membership Required</div>
                      <div style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Entry points unlock with Soldier tier</div>
                    </div>
                  </div>

                  {/* Protocol — locked */}
                  <div style={{ gridColumn: 'span 2' }}>
                    <div style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.18em', color: gold, marginBottom: '8px' }}>DELIVERANCE PROTOCOL</div>
                    <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.15)`, borderRadius: '4px', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '12px' }}>
                      <div>
                        <div style={{ fontFamily: cinzel, fontSize: '9px', color: muted, letterSpacing: '0.1em', marginBottom: '4px' }}>🔒 Commander Tier Required</div>
                        <div style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Full deliverance protocol unlocks with Commander membership</div>
                      </div>
                      <span style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.1em', color: gold, background: 'rgba(201,168,76,0.1)', padding: '4px 12px', borderRadius: '2px', whiteSpace: 'nowrap' as const }}>COMING SOON</span>
                    </div>
                  </div>
                </div>

                {/* Submit correction */}
                <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: muted, fontStyle: 'italic' }}>Know more about this entry? Help us improve the database.</span>
                  <a href={`/submit-demon?suggest=${encodeURIComponent(entry.name)}`}
                    style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.08em', color: gold, textDecoration: 'none', border: `1px solid ${border}`, padding: '5px 14px', borderRadius: '3px', transition: 'border-color 0.2s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)')}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '20px', flexWrap: 'wrap' as const }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', padding: '8px 16px', background: 'transparent', border: `1px solid ${border}`, borderRadius: '3px', color: page === 1 ? muted : textDim, cursor: page === 1 ? 'default' : 'pointer' }}>
            ← Prev
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i
            return (
              <button key={p} onClick={() => setPage(p)}
                style={{ fontFamily: cinzel, fontSize: '10px', padding: '8px 14px', background: p === page ? gold : 'transparent', border: `1px solid ${p === page ? gold : border}`, borderRadius: '3px', color: p === page ? deep : textDim, cursor: 'pointer' }}>
                {p}
              </button>
            )
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', padding: '8px 16px', background: 'transparent', border: `1px solid ${border}`, borderRadius: '3px', color: page === totalPages ? muted : textDim, cursor: page === totalPages ? 'default' : 'pointer' }}>
            Next →
          </button>
          <span style={{ fontFamily: cinzel, fontSize: '9px', color: muted, marginLeft: '8px' }}>{total} entries · Page {page} of {totalPages}</span>
        </div>
      )}

      {/* Submit CTA */}
      <div style={{ marginTop: '32px', background: surface, border: `1px solid ${border}`, borderRadius: '8px', padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '16px' }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: '13px', color: text, fontWeight: 600, marginBottom: '6px' }}>Know a spirit that's not in the database?</div>
          <p style={{ fontSize: '14px', color: textDim, fontStyle: 'italic', fontFamily: crimson }}>Help us build the most complete spiritual warfare reference available. All submissions are reviewed by our ministry team.</p>
        </div>
        <a href="/submit-demon"
          style={{ fontFamily: cinzel, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', padding: '12px 24px', background: gold, color: deep, textDecoration: 'none', borderRadius: '3px', whiteSpace: 'nowrap' as const, transition: 'background 0.2s', flexShrink: 0 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-light)')}
          onMouseLeave={e => (e.currentTarget.style.background = gold)}>
          🗡 Submit a Demon
        </a>
      </div>
    </section>
  )
}

// ── ASSESSMENT CTA ────────────────────────────────────────
function AssessmentCTA() {
  return (
    <section style={{ padding: '2rem 2rem 5rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ background: surface, border: `1px solid ${borderBright}`, borderRadius: '8px', padding: 'clamp(2rem, 5vw, 3.5rem)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 80% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: '1fr auto', gap: '32px', alignItems: 'center' }}>
          <div>
            <p style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.3em', color: gold, marginBottom: '12px' }}>✦ Free Ministry Tool</p>
            <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(20px, 3vw, 34px)', fontWeight: 700, color: text, marginBottom: '12px', lineHeight: 1.2 }}>
              Take the Free <em style={{ color: gold, fontStyle: 'normal' }}>Ministry Assessment</em>
            </h2>
            <p style={{ fontSize: '16px', color: textDim, fontFamily: crimson, fontStyle: 'italic', lineHeight: 1.7, maxWidth: '500px', marginBottom: '20px' }}>
              A confidential 9-step intake. Our diagnostic engine maps your answers to likely spiritual strongholds. Receive a personal response from our ministry team — free, no account required.
            </p>
            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' as const }}>
              {['Completely confidential', 'Personal ministry response', 'No account required'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: muted }}>
                  <span style={{ color: gold, fontSize: '10px' }}>✦</span> {item}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '10px', flexShrink: 0 }}>
            <a href="/assessment"
              style={{ fontFamily: cinzel, fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', padding: '14px 28px', background: gold, color: deep, textDecoration: 'none', borderRadius: '3px', textAlign: 'center', transition: 'background 0.2s', whiteSpace: 'nowrap' as const }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-light)')}
              onMouseLeave={e => (e.currentTarget.style.background = gold)}>
              Take Assessment ⚔
            </a>
            <a href="/assessment-board"
              style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', padding: '11px 28px', background: 'transparent', color: gold, textDecoration: 'none', borderRadius: '3px', textAlign: 'center', border: `1px solid ${border}`, transition: 'border-color 0.2s', whiteSpace: 'nowrap' as const }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)')}>
              View Response Board →
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── PRICING ───────────────────────────────────────────────
function PricingSection() {
  const tiers = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      badge: null,
      features: ['General community discussion', 'Prayer requests board', 'Weekly devotional posts', '25 database entries visible', 'Basic name & type fields', 'Free protocol PDFs'],
      locked: ['Full 251 entry database', 'Scripture & entry points', 'Deliverance protocols', 'Ministry calls'],
      btn: 'Coming Soon',
      featured: false,
    },
    {
      name: 'Soldier',
      price: '$19',
      period: '/month',
      badge: null,
      features: ['Everything in Free', 'Full database — 251 entries', 'Scripture & entry point fields', 'Soldier protocol PDFs (5)', 'Case studies community space', 'Monthly group prayer call'],
      locked: ['All database fields', "Commander's Circle", 'Bi-weekly calls'],
      btn: 'Coming Soon',
      featured: false,
    },
    {
      name: 'Commander',
      price: '$39',
      period: '/month',
      badge: 'Most Popular',
      features: ['Everything in Soldier', 'All database fields unlocked', 'Full protocol PDF library', 'Personal assessment response', "Commander's Circle space", 'Bi-weekly group call', 'Freemasonry protocol PDF'],
      locked: ['Weekly intimate calls'],
      btn: 'Coming Soon',
      featured: true,
    },
    {
      name: 'General',
      price: '$97',
      period: '/month',
      badge: null,
      features: ['Everything in Commander', 'Leadership PDF library (17)', 'Weekly intimate group call', 'Direct ministry access', "General's Table space", 'Ministry certification track', 'Priority assessment response'],
      locked: [],
      btn: 'Coming Soon',
      featured: false,
    },
  ]

  return (
    <section id="pricing" style={{ padding: '5rem 2rem', background: 'var(--surface)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Coming soon banner */}
        <div style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: '6px', padding: '14px 20px', marginBottom: '40px', display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' as const }}>
          <span style={{ fontSize: '20px' }}>⚔</span>
          <div>
            <div style={{ fontFamily: cinzel, fontSize: '11px', fontWeight: 700, color: gold, letterSpacing: '0.1em', marginBottom: '4px' }}>MEMBERSHIP LAUNCHING SOON</div>
            <div style={{ fontSize: '14px', color: textDim, fontFamily: crimson, fontStyle: 'italic' }}>
              We are building out the full membership platform. The database, assessment, and response board are fully available now — free, no account needed.
              Email <a href="mailto:exorcist@warroomintel.com" style={{ color: gold, textDecoration: 'none' }}>exorcist@warroomintel.com</a> to be notified when we launch.
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <p style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.3em', color: gold, marginBottom: '12px' }}>✦ Membership</p>
          <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 700, color: text, marginBottom: '12px' }}>
            Choose Your <em style={{ color: gold, fontStyle: 'normal' }}>Level of Access</em>
          </h2>
          <p style={{ fontSize: '17px', color: textDim, fontFamily: crimson, fontStyle: 'italic' }}>30-day free trial on all paid tiers · Cancel anytime · No hidden fees</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0', border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
          {tiers.map((tier, i) => (
            <div key={tier.name} style={{ padding: '2rem 1.75rem', background: tier.featured ? surface2 : deep, borderRight: i < tiers.length - 1 ? `1px solid ${border}` : 'none', position: 'relative' }}>
              {tier.badge && (
                <div style={{ position: 'absolute', top: '-1px', left: '50%', transform: 'translateX(-50%)', background: gold, color: deep, fontFamily: cinzel, fontSize: '8px', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 14px', borderRadius: '0 0 4px 4px' }}>
                  {tier.badge}
                </div>
              )}
              {tier.featured && <div style={{ position: 'absolute', inset: 0, border: `2px solid ${gold}`, borderRadius: '0', pointerEvents: 'none' }} />}

              <div style={{ fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.12em', color: gold, marginBottom: '8px' }}>{tier.name}</div>
              <div style={{ marginBottom: '4px' }}>
                <span style={{ fontFamily: cinzel, fontSize: '38px', fontWeight: 700, color: text }}>{tier.price}</span>
                <span style={{ fontSize: '14px', color: muted, marginLeft: '4px' }}>{tier.period}</span>
              </div>
              <p style={{ fontSize: '12px', color: gold, fontStyle: 'italic', marginBottom: '20px', fontFamily: crimson }}>
                {tier.price === '$0' ? 'No card required' : '30 days free to start'}
              </p>

              <div style={{ height: '1px', background: border, margin: '0 0 16px' }} />

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
                {tier.features.map(f => (
                  <li key={f} style={{ fontSize: '13px', color: textDim, display: 'flex', gap: '8px', alignItems: 'flex-start', lineHeight: 1.4 }}>
                    <span style={{ color: gold, fontSize: '8px', flexShrink: 0, marginTop: '4px' }}>✦</span>{f}
                  </li>
                ))}
                {tier.locked.map(f => (
                  <li key={f} style={{ fontSize: '13px', color: muted, display: 'flex', gap: '8px', alignItems: 'flex-start', lineHeight: 1.4, opacity: 0.5 }}>
                    <span style={{ fontSize: '8px', flexShrink: 0, marginTop: '4px' }}>○</span>{f}
                  </li>
                ))}
              </ul>

              {/* Coming Soon button */}
              <div style={{ width: '100%', padding: '11px', fontFamily: cinzel, fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', borderRadius: '3px', border: `1px solid rgba(201,168,76,0.2)`, background: 'rgba(201,168,76,0.05)', color: 'rgba(201,168,76,0.4)', textAlign: 'center', boxSizing: 'border-box' as const, cursor: 'not-allowed' }}>
                ⚔ Coming Soon
              </div>
            </div>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: muted, fontFamily: crimson, fontStyle: 'italic' }}>
          Want to be notified when membership launches? Email{' '}
          <a href="mailto:exorcist@warroomintel.com" style={{ color: gold, textDecoration: 'none' }}>exorcist@warroomintel.com</a>
        </p>
      </div>
    </section>
  )
}

// ── FAQ ───────────────────────────────────────────────────
function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)
  return (
    <section id="faq" style={{ padding: '5rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '40px' }}>
        <p style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.3em', color: gold, marginBottom: '12px' }}>✦ Common Questions</p>
        <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(22px, 3vw, 36px)', fontWeight: 700, color: text }}>
          Questions & <em style={{ color: gold, fontStyle: 'normal' }}>Answers</em>
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px' }}>
        {FAQ.map((item, i) => (
          <div key={i} style={{ border: `1px solid ${open === i ? borderBright : border}`, borderRadius: '6px', overflow: 'hidden', transition: 'border-color 0.2s' }}>
            <button onClick={() => setOpen(open === i ? null : i)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', gap: '16px', textAlign: 'left' as const }}>
              <span style={{ fontFamily: cinzel, fontSize: '12px', fontWeight: 600, color: open === i ? gold : text, letterSpacing: '0.04em', lineHeight: 1.4 }}>{item.q}</span>
              <span style={{ color: gold, fontSize: '20px', opacity: 0.7, flexShrink: 0, transition: 'transform 0.2s', transform: open === i ? 'rotate(45deg)' : 'rotate(0)', display: 'inline-block' }}>+</span>
            </button>
            {open === i && (
              <div style={{ padding: '4px 20px 20px', borderTop: `1px solid ${border}` }}>
                <p style={{ fontSize: '15px', color: textDim, lineHeight: 1.8, fontFamily: crimson, margin: 0 }}>{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}

// ── ABOUT ─────────────────────────────────────────────────
function AboutSection() {
  return (
    <section style={{ padding: '5rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center' }}>
        <div>
          <p style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.3em', color: gold, marginBottom: '12px' }}>✦ About This Ministry</p>
          <h2 style={{ fontFamily: cinzel, fontSize: 'clamp(22px, 3vw, 38px)', fontWeight: 700, color: text, marginBottom: '20px', lineHeight: 1.15 }}>
            Built by Ministers,<br /><em style={{ color: gold, fontStyle: 'normal' }}>For Ministers</em>
          </h2>
          <p style={{ fontSize: '16px', color: textDim, fontFamily: crimson, fontStyle: 'italic', lineHeight: 1.8, marginBottom: '16px' }}>
            War Room Intel was born out of frustration with the lack of practical, organized spiritual warfare resources available to ministers on the front lines.
          </p>
          <p style={{ fontSize: '15px', color: textDim, lineHeight: 1.8, marginBottom: '20px' }}>
            We are a ministry of Staffordtown Church in Copperhill, Tennessee. Everything here — the database, the assessment tool, the protocols — was built from real ministry experience. We believe in naming what you're dealing with, commanding it by name, and walking in the freedom Christ purchased.
          </p>
          <p style={{ fontSize: '15px', color: textDim, lineHeight: 1.8, marginBottom: '28px' }}>
            This is not academic theology. This is field-tested spiritual warfare intelligence.
          </p>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' as const }}>
            <a href="/assessment" style={{ fontFamily: cinzel, fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', padding: '12px 24px', background: gold, color: deep, textDecoration: 'none', borderRadius: '3px', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-light)')}
              onMouseLeave={e => (e.currentTarget.style.background = gold)}>
              Take Assessment ⚔
            </a>
            <a href="https://churchonfire.com" target="_blank" rel="noopener noreferrer"
              style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.1em', padding: '12px 24px', background: 'transparent', color: gold, textDecoration: 'none', border: `1px solid ${border}`, borderRadius: '3px', transition: 'border-color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.18)')}>
              Staffordtown Church →
            </a>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {[
            { n: '251+', l: 'Documented Spirits', sub: 'And growing' },
            { n: '7', l: 'Assessment Categories', sub: 'Comprehensive intake' },
            { n: 'Free', l: 'Ministry Assessment', sub: 'No account needed' },
            { n: 'Personal', l: 'Ministry Response', sub: 'From our team' },
          ].map(({ n, l, sub }) => (
            <div key={l} style={{ background: surface, border: `1px solid ${border}`, borderRadius: '6px', padding: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontFamily: cinzel, fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, color: gold, marginBottom: '6px' }}>{n}</div>
              <div style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.08em', color: text, marginBottom: '4px' }}>{l}</div>
              <div style={{ fontSize: '12px', color: muted, fontStyle: 'italic', fontFamily: crimson }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── FOOTER ────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${border}`, padding: '3rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '2rem', marginBottom: '2rem', flexWrap: 'wrap' as const }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
            <img src="/logo.png" alt="War Room Intel" style={{ height: '40px', width: '40px', objectFit: 'contain' }} />
            <div>
              <div style={{ fontFamily: cinzel, fontSize: '12px', fontWeight: 600, color: gold, letterSpacing: '0.12em' }}>WAR ROOM INTEL</div>
              <div style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.2em', color: muted }}>SPIRITUAL WARFARE</div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: muted, lineHeight: 1.7, maxWidth: '260px', fontFamily: crimson, fontStyle: 'italic', marginBottom: '12px' }}>
            A spiritual warfare ministry resource. Not a substitute for professional medical or psychological care.
          </p>
          <p style={{ fontSize: '12px', color: muted, lineHeight: 1.6 }}>
            A ministry of <a href="https://churchonfire.com" target="_blank" rel="noopener noreferrer" style={{ color: gold, textDecoration: 'none' }}>Staffordtown Church</a><br />
            Copperhill, TN · Tennessee, USA
          </p>
        </div>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.2em', color: gold, marginBottom: '12px' }}>Ministry Tools</div>
          {[
            { label: 'Demon Database', href: '#database' },
            { label: 'Take Assessment', href: '/assessment' },
            { label: 'Response Board', href: '/assessment-board' },
            { label: 'Submit a Demon', href: '/submit-demon' },
            { label: 'Scripture Arsenal', href: '/arsenal' },
          ].map(({ label, href }) => (
            <div key={label} style={{ marginBottom: '8px' }}>
              <a href={href} style={{ fontSize: '13px', color: muted, textDecoration: 'none', transition: 'color 0.2s', fontFamily: crimson }}
                onMouseEnter={e => (e.currentTarget.style.color = gold)}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
                {label}
              </a>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.2em', color: gold, marginBottom: '12px' }}>Membership</div>
          {['Free Tier — Coming Soon', 'Soldier $19/mo — Coming Soon', 'Commander $39/mo — Coming Soon', 'General $97/mo — Coming Soon'].map(item => (
            <div key={item} style={{ marginBottom: '8px', fontSize: '13px', color: muted, fontFamily: crimson }}>{item}</div>
          ))}
        </div>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.2em', color: gold, marginBottom: '12px' }}>Contact</div>
          <div style={{ marginBottom: '8px' }}>
            <a href="mailto:exorcist@warroomintel.com" style={{ fontSize: '13px', color: muted, textDecoration: 'none', fontFamily: crimson, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = gold)}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
              exorcist@warroomintel.com
            </a>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <a href="https://churchonfire.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: muted, textDecoration: 'none', fontFamily: crimson, transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = gold)}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
              churchonfire.com
            </a>
          </div>
          <div style={{ marginTop: '16px', fontSize: '12px', color: muted, fontFamily: cinzel, letterSpacing: '0.06em' }}>
            Membership Inquiries:<br />
            <a href="mailto:exorcist@warroomintel.com" style={{ color: gold, textDecoration: 'none', fontSize: '11px' }}>
              exorcist@warroomintel.com
            </a>
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${border}`, paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '12px' }}>
        <p style={{ fontSize: '12px', color: muted, fontFamily: crimson, fontStyle: 'italic' }}>
          © {new Date().getFullYear()} War Room Intel · Staffordtown Church · All rights reserved
        </p>
        <p style={{ fontSize: '12px', color: muted, fontFamily: crimson, fontStyle: 'italic', maxWidth: '400px', textAlign: 'right' as const }}>
          War Room Intel is a spiritual ministry resource only and does not provide medical, psychological, or psychiatric services.
        </p>
      </div>
    </footer>
  )
}

// ── PAGE ─────────────────────────────────────────────────
function WarRoomHome() {
  return (
    <div>
      <Hero />
      <Divider label="✦ What's Inside ✦" />
      <FeaturesSection />
      <Divider label="✦ The Database ✦" />
      <DatabaseSection />
      <Divider label="✦ Ministry Assessment ✦" />
      <AssessmentCTA />
      <Divider label="✦ About ✦" />
      <AboutSection />
      <Divider label="✦ Membership ✦" />
      <PricingSection />
      <Divider label="✦ Questions ✦" />
      <FAQSection />
      <Footer />
    </div>
  )
}
