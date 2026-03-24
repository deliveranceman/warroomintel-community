import { createFileRoute } from '@tanstack/react-router'
import { useState, useMemo, useEffect } from 'react'
import { features, plans, faqItems } from '@/data/warroom'

export const Route = createFileRoute('/')(({
  component: WarRoomHome,
}))

interface DemonEntry {
  id: number
  name: string
  aka: string
  type: string
  function: string
}

/* ── Ornament ── */
function Ornament() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '2.5rem 2.5rem' }}>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--border-bright), transparent)' }} />
      <span style={{ fontFamily: "'Cinzel', serif", fontSize: '20px', color: 'var(--gold)', opacity: 0.6 }}>✦</span>
      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--border-bright), transparent)' }} />
    </div>
  )
}

/* ── Hero ── */
function Hero() {
  return (
    <section id="hero" style={{ minHeight: '92vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '5rem 2rem 4rem', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(138,80,255,0.09) 0%, transparent 65%), radial-gradient(ellipse 40% 30% at 50% 100%, rgba(201,168,76,0.05) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.3em', color: 'var(--gold)', marginBottom: '1.75rem', animation: 'fadeUp 0.8s 0.1s both' }}>
        ✦ &nbsp; Staffordtown Deliverance Ministry &nbsp; ✦
      </p>
      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(38px, 7vw, 72px)', fontWeight: 700, lineHeight: 1.0, letterSpacing: '0.02em', marginBottom: '1rem', animation: 'fadeUp 0.8s 0.25s both' }}>
        The{' '}<em style={{ color: 'var(--gold)', fontStyle: 'normal', display: 'block' }}>War Room</em>{' '}Community
      </h1>
      <p style={{ fontSize: 'clamp(17px, 2.2vw, 21px)', color: 'var(--text-dim)', fontWeight: 300, fontStyle: 'italic', maxWidth: '580px', margin: '0 auto 2.5rem', animation: 'fadeUp 0.8s 0.4s both' }}>
        A members-only arsenal for deliverance ministers — searchable demon database, prayer strategies, Scripture-anchored resources, and live training calls.
      </p>
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '1.5rem', animation: 'fadeUp 0.8s 0.55s both' }}>
        <a href="#pricing" style={{ background: 'var(--gold)', color: 'var(--deep)', fontFamily: "'Cinzel', serif", fontSize: '12px', fontWeight: 700, letterSpacing: '0.1em', border: 'none', padding: '14px 34px', borderRadius: '3px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s, transform 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold-light)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(0)' }}>
          Start 30-Day Free Trial
        </a>
        <a href="#database" style={{ background: 'transparent', color: 'var(--gold)', fontFamily: "'Cinzel', serif", fontSize: '12px', letterSpacing: '0.08em', border: '1px solid var(--border-bright)', padding: '14px 34px', borderRadius: '3px', cursor: 'pointer', textDecoration: 'none', display: 'inline-block', transition: 'border-color 0.2s, color 0.2s, transform 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold-light)'; e.currentTarget.style.color = 'var(--gold-light)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--gold)'; e.currentTarget.style.transform = 'translateY(0)' }}>
          Explore the Database
        </a>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--muted)', letterSpacing: '0.04em', animation: 'fadeUp 0.8s 0.7s both' }}>
        30 days free &nbsp;·&nbsp; <span style={{ color: 'var(--gold)' }}>then from $19/month</span> &nbsp;·&nbsp; cancel anytime
      </p>
    </section>
  )
}

/* ── Features ── */
function FeaturesSection() {
  return (
    <section id="features" style={{ padding: '0 2.5rem 4rem' }}>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textAlign: 'center', marginBottom: '0.5rem' }}>The Arsenal</p>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, textAlign: 'center', marginBottom: '0.5rem' }}>Everything You Need for Deliverance Ministry</h2>
      <p style={{ fontSize: '17px', color: 'var(--text-dim)', fontWeight: 300, fontStyle: 'italic', textAlign: 'center', maxWidth: '500px', margin: '0 auto 2.5rem' }}>One place for every resource, protocol, and community connection.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1px', background: 'var(--border)', border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden', maxWidth: '1100px', margin: '0 auto' }}>
        {features.map((f) => <FeatureCard key={f.name} {...f} />)}
      </div>
    </section>
  )
}

function FeatureCard({ icon, name, description }: { icon: string; name: string; description: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ background: hovered ? 'var(--surface2)' : 'var(--surface)', padding: '2rem 1.75rem', transition: 'background 0.2s', cursor: 'default' }}>
      <div style={{ fontSize: '22px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.06em', marginBottom: '8px' }}>{name}</div>
      <div style={{ fontSize: '15px', color: 'var(--text-dim)', fontWeight: 300, lineHeight: 1.6 }}>{description}</div>
    </div>
  )
}

/* ── Database ── */
const TYPE_GROUPS: Record<string, { label: string; color: string; bg: string; border: string }> = {
  'Principality':   { label: 'Principality',  color: '#E08080', bg: 'rgba(200,60,60,0.15)',   border: 'rgba(200,60,60,0.35)' },
  'Spirit':         { label: 'Spirit',         color: '#B08CF0', bg: 'rgba(138,80,255,0.15)',  border: 'rgba(138,80,255,0.35)' },
  'Fallen Angel':   { label: 'Fallen Angel',   color: '#93C5FD', bg: 'rgba(59,130,246,0.15)',  border: 'rgba(59,130,246,0.35)' },
  'Duke of Hell':   { label: 'Duke of Hell',   color: '#F97316', bg: 'rgba(249,115,22,0.13)',  border: 'rgba(249,115,22,0.35)' },
  'King of Hell':   { label: 'King of Hell',   color: '#F43F5E', bg: 'rgba(244,63,94,0.13)',   border: 'rgba(244,63,94,0.35)' },
  'Prince of Hell': { label: 'Prince of Hell', color: '#C084FC', bg: 'rgba(192,132,252,0.13)', border: 'rgba(192,132,252,0.35)' },
}

function getTypeStyle(type: string) {
  for (const key of Object.keys(TYPE_GROUPS)) {
    if (type.toLowerCase().includes(key.toLowerCase())) return TYPE_GROUPS[key]
  }
  return { label: type, color: '#E8A860', bg: 'rgba(201,140,76,0.13)', border: 'rgba(201,140,76,0.35)' }
}

function DatabaseSection() {
  const [demons, setDemons] = useState<DemonEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')
  const [expanded, setExpanded] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 50

  useEffect(() => {
    fetch('/api/demons')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setDemons(data.demons)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  const filterGroups = ['All', 'Principality', 'Spirit', 'Fallen Angel', 'Duke of Hell', 'King of Hell', 'Prince of Hell', 'Other']

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return demons.filter(entry => {
      const matchText = !q ||
        entry.name.toLowerCase().includes(q) ||
        entry.aka.toLowerCase().includes(q) ||
        entry.function.toLowerCase().includes(q) ||
        entry.type.toLowerCase().includes(q)
      let matchFilter = true
      if (activeFilter !== 'All') {
        if (activeFilter === 'Other') {
          matchFilter = !Object.keys(TYPE_GROUPS).some(k => entry.type.toLowerCase().includes(k.toLowerCase()))
        } else {
          matchFilter = entry.type.toLowerCase().includes(activeFilter.toLowerCase())
        }
      }
      return matchText && matchFilter
    })
  }, [demons, search, activeFilter])

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const handleSearch = (val: string) => { setSearch(val); setPage(0); setExpanded(null) }
  const handleFilter = (f: string) => { setActiveFilter(f); setPage(0); setExpanded(null) }

  return (
    <section id="database" style={{ padding: '4rem 2.5rem', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textAlign: 'center', marginBottom: '0.5rem' }}>Master Database</p>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, textAlign: 'center', marginBottom: '0.5rem' }}>The Demon Index</h2>
        <p style={{ fontSize: '17px', color: 'var(--text-dim)', fontWeight: 300, fontStyle: 'italic', textAlign: 'center', maxWidth: '560px', margin: '0 auto 0.75rem' }}>
          {loading ? 'Loading live database…' : error ? 'Database unavailable' : `${demons.length} entries — live from Airtable. Search by name, alias, type, or function.`}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', marginBottom: '2rem' }}>
          Members unlock biblical references, entry points, manifestation patterns & full deliverance protocols.
        </p>

        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ background: 'var(--surface2)', padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search by name, alias, type, or function…"
              disabled={loading}
              style={{ width: '100%', background: 'var(--deep)', border: '1px solid var(--border)', borderRadius: '4px', padding: '9px 14px', fontFamily: "'Crimson Pro', serif", fontSize: '15px', color: 'var(--text-dim)', outline: 'none', boxSizing: 'border-box', opacity: loading ? 0.5 : 1 }}
            />
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {filterGroups.map(f => (
                <button key={f} onClick={() => handleFilter(f)} disabled={loading}
                  style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.08em', padding: '5px 12px', borderRadius: '3px', border: activeFilter === f ? '1px solid var(--gold)' : '1px solid var(--border)', color: activeFilter === f ? 'var(--gold)' : 'var(--text-dim)', background: activeFilter === f ? 'var(--gold-dim)' : 'transparent', cursor: loading ? 'default' : 'pointer', transition: 'all 0.15s' }}>
                  {f}
                </button>
              ))}
              {!loading && !error && (
                <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--muted)', alignSelf: 'center' }}>
                  {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'}
                </span>
              )}
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr 28px', gap: '0 12px', padding: '8px 16px', background: 'var(--surface2)', borderBottom: '1px solid var(--border)', fontSize: '10px', fontFamily: "'Cinzel', serif", letterSpacing: '0.1em', color: 'var(--muted)' }}>
            <span>Name / Also Known As</span><span>Type</span><span>Function / Role</span><span></span>
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', color: 'var(--gold)', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                ⚔ Loading Intelligence Database…
              </div>
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--gold)', opacity: 0.4, animation: `pulse 1.2s ${i * 0.2}s ease-in-out infinite` }} />
                ))}
              </div>
              <style>{`@keyframes pulse { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
            </div>
          )}

          {/* Error state */}
          {error && !loading && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontSize: '14px' }}>
              <div style={{ color: '#E08080', marginBottom: '8px' }}>⚠ Could not load database</div>
              <div style={{ fontStyle: 'italic', fontSize: '13px' }}>{error}</div>
            </div>
          )}

          {/* Empty search */}
          {!loading && !error && paginated.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', fontSize: '14px' }}>No entries match your search.</div>
          )}

          {/* Rows */}
          {!loading && !error && paginated.map(entry => (
            <DatabaseRow key={entry.id} entry={entry} isExpanded={expanded === entry.id} onToggle={() => setExpanded(expanded === entry.id ? null : entry.id)} />
          ))}

          {/* Pagination */}
          {!loading && !error && totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '14px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface2)' }}>
              <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.08em', padding: '5px 14px', borderRadius: '3px', border: '1px solid var(--border)', color: page === 0 ? 'var(--muted)' : 'var(--gold)', background: 'transparent', cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}>
                ← Prev
              </button>
              <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: "'Cinzel', serif" }}>{page + 1} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1}
                style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.08em', padding: '5px 14px', borderRadius: '3px', border: '1px solid var(--border)', color: page === totalPages - 1 ? 'var(--muted)' : 'var(--gold)', background: 'transparent', cursor: page === totalPages - 1 ? 'default' : 'pointer', opacity: page === totalPages - 1 ? 0.4 : 1 }}>
                Next →
              </button>
            </div>
          )}

          {/* CTA banner */}
          <div style={{ padding: '1.5rem 2rem', borderTop: '1px solid var(--border)', background: 'linear-gradient(90deg, rgba(201,168,76,0.06), rgba(138,80,255,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', color: 'var(--gold)', fontWeight: 600, marginBottom: '4px' }}>Unlock the Full Intelligence File</div>
              <div style={{ fontSize: '14px', color: 'var(--text-dim)', fontWeight: 300 }}>Members get Scripture references, entry points, manifestation patterns & deliverance protocols for every entry.</div>
            </div>
            <a href="#pricing" style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', padding: '11px 26px', borderRadius: '3px', background: 'var(--gold)', color: 'var(--deep)', textDecoration: 'none', whiteSpace: 'nowrap', transition: 'background 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--gold-light)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--gold)')}>
              Join — 30 Days Free
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function DatabaseRow({ entry, isExpanded, onToggle }: { entry: DemonEntry; isExpanded: boolean; onToggle: () => void }) {
  const [hovered, setHovered] = useState(false)
  const ts = getTypeStyle(entry.type)
  return (
    <div style={{ borderBottom: '1px solid var(--border)' }}>
      <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onToggle}
        style={{ display: 'grid', gridTemplateColumns: '1fr 160px 1fr 28px', gap: '0 12px', padding: '11px 16px', fontSize: '14px', transition: 'background 0.15s', cursor: 'pointer', background: isExpanded ? 'var(--surface2)' : hovered ? 'rgba(201,168,76,0.04)' : 'transparent', alignItems: 'center' }}>
        <div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>{entry.name}</div>
          {entry.aka && <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px', fontStyle: 'italic' }}>{entry.aka}</div>}
        </div>
        <span style={{ fontSize: '10px', letterSpacing: '0.06em', padding: '3px 8px', borderRadius: '3px', border: `1px solid ${ts.border}`, color: ts.color, background: ts.bg, whiteSpace: 'normal', lineHeight: 1.4, display: 'inline-block' }}>
          {entry.type}
        </span>
        <div style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.5 }}>{entry.function}</div>
        <div style={{ color: 'var(--gold)', fontSize: '16px', textAlign: 'center', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(45deg)' : 'rotate(0)', opacity: 0.7 }}>+</div>
      </div>
      {isExpanded && (
        <div style={{ padding: '12px 16px 16px', background: 'var(--surface2)', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {['Biblical References', 'Entry Points', 'Manifestation Patterns', 'Deliverance Protocol'].map(label => (
              <div key={label} style={{ background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: '4px', padding: '10px 12px' }}>
                <div style={{ fontSize: '10px', fontFamily: "'Cinzel', serif", letterSpacing: '0.08em', color: 'var(--muted)', marginBottom: '6px' }}>{label}</div>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {[40, 60, 50, 70].map((w, i) => <div key={i} style={{ height: '8px', width: `${w}%`, background: 'rgba(201,168,76,0.12)', borderRadius: '2px', filter: 'blur(1px)' }} />)}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic' }}>🔒 Full intelligence file available to members</span>
            <a href="#pricing" style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.08em', padding: '5px 14px', borderRadius: '3px', border: '1px solid var(--gold)', color: 'var(--gold)', textDecoration: 'none', transition: 'background 0.2s, color 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--gold)'; e.currentTarget.style.color = 'var(--deep)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--gold)' }}>
              Unlock Access
            </a>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── About ── */
function AboutSection() {
  return (
    <section style={{ padding: '5rem 2.5rem', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', marginBottom: '0.5rem' }}>Why This Community</p>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, marginBottom: '1.5rem' }}>Built from the Field</h2>
        <blockquote style={{ fontSize: 'clamp(19px, 2.5vw, 26px)', fontStyle: 'italic', fontWeight: 300, color: 'var(--text-dim)', lineHeight: 1.6, margin: '1.5rem 0', borderLeft: '3px solid var(--gold)', paddingLeft: '1.5rem', textAlign: 'left' }}>
          "The Church has the authority. What it's often lacked is the organized intelligence to deploy it."
        </blockquote>
        <p style={{ fontSize: '16px', color: 'var(--text-dim)', fontWeight: 300, lineHeight: 1.7, marginBottom: '1rem' }}>
          The War Room Community was built by a practicing deliverance minister — not a theorist. Every database entry, prayer strategy, and protocol comes from real ministry experience and is anchored in Scripture.
        </p>
        <p style={{ fontSize: '16px', color: 'var(--text-dim)', fontWeight: 300, lineHeight: 1.7 }}>
          This is the resource we wished existed when we started. A living database that grows with every member, every session, every breakthrough.
        </p>
      </div>
    </section>
  )
}

/* ── Pricing ── */
function PricingSection() {
  return (
    <section id="pricing" style={{ padding: '5rem 2.5rem' }}>
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textAlign: 'center', marginBottom: '0.5rem' }}>Membership</p>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, textAlign: 'center', marginBottom: '0.5rem' }}>Join the War Room</h2>
        <p style={{ fontSize: '17px', color: 'var(--text-dim)', fontWeight: 300, fontStyle: 'italic', textAlign: 'center', maxWidth: '500px', margin: '0 auto 2.5rem' }}>All plans include a full 30-day free trial. No charge until day 31.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          {plans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
        </div>
      </div>
    </section>
  )
}

function PlanCard({ plan }: { plan: typeof plans[0] }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      style={{ border: plan.featured ? '1px solid var(--gold)' : hovered ? '1px solid rgba(201,168,76,0.35)' : '1px solid var(--border)', borderRadius: '6px', padding: '2rem 1.75rem', background: plan.featured ? 'var(--surface2)' : 'var(--surface)', position: 'relative', transition: 'border-color 0.2s' }}>
      {plan.featured && <div style={{ position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)', background: 'var(--gold)', color: 'var(--deep)', fontFamily: "'Cinzel', serif", fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', padding: '4px 14px', borderRadius: '2px', whiteSpace: 'nowrap' }}>Most Popular</div>}
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '12px', letterSpacing: '0.1em', color: 'var(--gold)', marginBottom: '12px' }}>{plan.tier}</div>
      <div style={{ fontSize: '44px', fontWeight: 300, lineHeight: 1, color: 'var(--text)' }}>
        <sup style={{ fontSize: '20px', verticalAlign: 'super', fontWeight: 400 }}>$</sup>{plan.price}<sub style={{ fontSize: '15px', color: 'var(--text-dim)' }}>/mo</sub>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--gold)', fontStyle: 'italic', margin: '8px 0 18px' }}>30 days free to start</p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem' }}>
        {plan.features.map(f => (
          <li key={f} style={{ fontSize: '14px', color: 'var(--text-dim)', padding: '6px 0', borderBottom: '1px solid rgba(201,168,76,0.08)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '8px', color: 'var(--gold)', marginTop: '5px', flexShrink: 0 }}>✦</span>{f}
          </li>
        ))}
      </ul>
      <a href="#" style={{ width: '100%', padding: '12px', fontFamily: "'Cinzel', serif", fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: '3px', border: plan.featured ? 'none' : '1px solid var(--border-bright)', background: plan.featured ? 'var(--gold)' : 'transparent', color: plan.featured ? 'var(--deep)' : 'var(--gold)', transition: 'all 0.2s', textDecoration: 'none', display: 'block', textAlign: 'center', boxSizing: 'border-box' }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}>
        Start Free Trial
      </a>
    </div>
  )
}

/* ── FAQ ── */
function FAQSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)
  return (
    <section id="faq" style={{ padding: '5rem 2.5rem' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textAlign: 'center', marginBottom: '0.5rem' }}>Questions</p>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, textAlign: 'center', marginBottom: '2rem' }}>Common Questions</h2>
        {faqItems.map((item, i) => (
          <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
            <button onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{ width: '100%', background: 'none', border: 'none', textAlign: 'left', padding: '1.25rem 0', fontFamily: "'Cinzel', serif", fontSize: '14px', fontWeight: 600, color: 'var(--text)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', letterSpacing: '0.03em' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text)')}>
              {item.q}
              <span style={{ color: 'var(--gold)', fontSize: '18px', flexShrink: 0, transition: 'transform 0.2s', transform: openIdx === i ? 'rotate(45deg)' : 'rotate(0)', display: 'inline-block' }}>+</span>
            </button>
            <div style={{ fontSize: '15px', color: 'var(--text-dim)', fontWeight: 300, lineHeight: 1.7, maxHeight: openIdx === i ? '300px' : '0', overflow: 'hidden', transition: 'max-height 0.3s ease, padding 0.3s', paddingBottom: openIdx === i ? '1.25rem' : '0' }}>
              {item.a}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ── Footer ── */
function Footer() {
  return (
    <footer style={{ borderTop: '1px solid var(--border)', padding: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', textAlign: 'center' }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', fontWeight: 600, letterSpacing: '0.15em', color: 'var(--gold)' }}>⚔ The War Room Community</div>
      <nav style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {['Arsenal', 'Database', 'Membership', 'FAQ', 'Privacy', 'Terms', 'Contact'].map(label => (
          <a key={label} href={`#${label.toLowerCase()}`}
            style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.1em', color: 'var(--muted)', textDecoration: 'none', transition: 'color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}>
            {label}
          </a>
        ))}
      </nav>
      <p style={{ fontSize: '12px', color: 'var(--muted)' }}>© 2025 The War Room Community · Staffordtown Church · Built for Deliverance Ministry</p>
    </footer>
  )
}

/* ── Page ── */
function WarRoomHome() {
  return (
    <div>
      <Hero />
      <Ornament />
      <FeaturesSection />
      <Ornament />
      <DatabaseSection />
      <Ornament />
      <AboutSection />
      <Ornament />
      <PricingSection />
      <Ornament />
      <FAQSection />
      <Footer />
    </div>
  )
}
