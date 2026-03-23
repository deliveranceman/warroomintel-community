import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'
import { features, plans, demonDatabase, faqItems, type DemonEntry } from '@/data/warroom'

export const Route = createFileRoute('/')({
  component: WarRoomHome,
})

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
    <section
      id="hero"
      style={{
        minHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '5rem 2rem 4rem',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Background gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(138,80,255,0.09) 0%, transparent 65%), radial-gradient(ellipse 40% 30% at 50% 100%, rgba(201,168,76,0.05) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <p
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '11px',
          letterSpacing: '0.3em',
          color: 'var(--gold)',
          marginBottom: '1.75rem',
          animation: 'fadeUp 0.8s 0.1s both',
        }}
      >
        ✦ &nbsp; Staffordtown Deliverance Ministry &nbsp; ✦
      </p>

      <h1
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: 'clamp(38px, 7vw, 72px)',
          fontWeight: 700,
          lineHeight: 1.0,
          letterSpacing: '0.02em',
          marginBottom: '1rem',
          animation: 'fadeUp 0.8s 0.25s both',
        }}
      >
        The{' '}
        <em style={{ color: 'var(--gold)', fontStyle: 'normal', display: 'block' }}>
          War Room
        </em>{' '}
        Community
      </h1>

      <p
        style={{
          fontSize: 'clamp(17px, 2.2vw, 21px)',
          color: 'var(--text-dim)',
          fontWeight: 300,
          fontStyle: 'italic',
          maxWidth: '580px',
          margin: '0 auto 2.5rem',
          animation: 'fadeUp 0.8s 0.4s both',
        }}
      >
        A members-only arsenal for deliverance ministers — searchable demon database, prayer strategies, Scripture-anchored resources, and live training calls.
      </p>

      <div
        style={{
          display: 'flex',
          gap: '14px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          marginBottom: '1.5rem',
          animation: 'fadeUp 0.8s 0.55s both',
        }}
      >
        <a
          href="#pricing"
          style={{
            background: 'var(--gold)',
            color: 'var(--deep)',
            fontFamily: "'Cinzel', serif",
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            border: 'none',
            padding: '14px 34px',
            borderRadius: '3px',
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'background 0.2s, transform 0.15s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.background = 'var(--gold-light)'
            el.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.background = 'var(--gold)'
            el.style.transform = 'translateY(0)'
          }}
        >
          Start 30-Day Free Trial
        </a>
        <a
          href="#database"
          style={{
            background: 'transparent',
            color: 'var(--gold)',
            fontFamily: "'Cinzel', serif",
            fontSize: '12px',
            letterSpacing: '0.08em',
            border: '1px solid var(--border-bright)',
            padding: '14px 34px',
            borderRadius: '3px',
            cursor: 'pointer',
            textDecoration: 'none',
            display: 'inline-block',
            transition: 'border-color 0.2s, color 0.2s, transform 0.15s',
          }}
          onMouseEnter={(e) => {
            const el = e.currentTarget
            el.style.borderColor = 'var(--gold-light)'
            el.style.color = 'var(--gold-light)'
            el.style.transform = 'translateY(-1px)'
          }}
          onMouseLeave={(e) => {
            const el = e.currentTarget
            el.style.borderColor = 'var(--border-bright)'
            el.style.color = 'var(--gold)'
            el.style.transform = 'translateY(0)'
          }}
        >
          Explore the Database
        </a>
      </div>

      <p
        style={{
          fontSize: '13px',
          color: 'var(--muted)',
          letterSpacing: '0.04em',
          animation: 'fadeUp 0.8s 0.7s both',
        }}
      >
        30 days free &nbsp;·&nbsp;{' '}
        <span style={{ color: 'var(--gold)' }}>then from $19/month</span>{' '}
        &nbsp;·&nbsp; cancel anytime
      </p>
    </section>
  )
}

/* ── Features ── */
function FeaturesSection() {
  return (
    <section id="features" style={{ padding: '0 2.5rem 4rem' }}>
      <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textAlign: 'center', marginBottom: '0.5rem' }}>
        The Arsenal
      </p>
      <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, textAlign: 'center', marginBottom: '0.5rem' }}>
        Everything You Need for Deliverance Ministry
      </h2>
      <p style={{ fontSize: '17px', color: 'var(--text-dim)', fontWeight: 300, fontStyle: 'italic', textAlign: 'center', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
        One place for every resource, protocol, and community connection.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '1px',
          background: 'var(--border)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          overflow: 'hidden',
          maxWidth: '1100px',
          margin: '0 auto',
        }}
      >
        {features.map((f) => (
          <FeatureCard key={f.name} {...f} />
        ))}
      </div>
    </section>
  )
}

function FeatureCard({ icon, name, description }: { icon: string; name: string; description: string }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--surface2)' : 'var(--surface)',
        padding: '2rem 1.75rem',
        transition: 'background 0.2s',
        cursor: 'default',
      }}
    >
      <div style={{ fontSize: '22px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '14px', fontWeight: 600, color: 'var(--gold)', letterSpacing: '0.06em', marginBottom: '8px' }}>
        {name}
      </div>
      <div style={{ fontSize: '15px', color: 'var(--text-dim)', fontWeight: 300, lineHeight: 1.6 }}>
        {description}
      </div>
    </div>
  )
}

/* ── Database ── */
const typeLabels: Record<DemonEntry['type'], string> = {
  spirit: 'Spirit',
  principality: 'Principality',
  stronghold: 'Stronghold',
}

const tagStyles: Record<DemonEntry['type'], React.CSSProperties> = {
  spirit: { background: 'rgba(138,80,255,0.15)', color: '#B08CF0', border: '1px solid rgba(138,80,255,0.3)' },
  principality: { background: 'rgba(200,60,60,0.15)', color: '#E08080', border: '1px solid rgba(200,60,60,0.3)' },
  stronghold: { background: 'rgba(201,140,76,0.15)', color: '#E8A860', border: '1px solid rgba(201,140,76,0.3)' },
}

function DatabaseSection() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | DemonEntry['type']>('all')

  const filtered = demonDatabase.filter((entry) => {
    const q = search.toLowerCase()
    const matchText =
      entry.name.toLowerCase().includes(q) ||
      entry.function.toLowerCase().includes(q) ||
      entry.reference.toLowerCase().includes(q)
    const matchFilter = filter === 'all' || entry.type === filter
    return matchText && matchFilter
  })

  return (
    <section
      id="database"
      style={{
        padding: '4rem 2.5rem',
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textAlign: 'center', marginBottom: '0.5rem' }}>
          Master Database
        </p>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, textAlign: 'center', marginBottom: '0.5rem' }}>
          The Demon Index
        </h2>
        <p style={{ fontSize: '17px', color: 'var(--text-dim)', fontWeight: 300, fontStyle: 'italic', textAlign: 'center', maxWidth: '500px', margin: '0 auto 2rem' }}>
          Every entry includes biblical references, manifestation patterns, entry points, and complete deliverance protocols. Members get full access.
        </p>

        <div style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
          {/* Toolbar */}
          <div style={{ background: 'var(--surface2)', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, function, or Scripture..."
              style={{
                flex: 1,
                minWidth: '160px',
                background: 'var(--deep)',
                border: '1px solid var(--border)',
                borderRadius: '3px',
                padding: '7px 12px',
                fontFamily: "'Crimson Pro', serif",
                fontSize: '14px',
                color: 'var(--text-dim)',
                outline: 'none',
              }}
            />
            {(['all', 'spirit', 'principality', 'stronghold'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  fontFamily: "'Cinzel', serif",
                  fontSize: '10px',
                  letterSpacing: '0.1em',
                  padding: '5px 12px',
                  borderRadius: '3px',
                  border: filter === f ? '1px solid var(--gold)' : '1px solid var(--border)',
                  color: filter === f ? 'var(--gold)' : 'var(--text-dim)',
                  background: filter === f ? 'var(--gold-dim)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  textTransform: 'capitalize',
                }}
              >
                {f === 'all' ? 'All' : f === 'spirit' ? 'Spirits' : f === 'principality' ? 'Principalities' : 'Strongholds'}
              </button>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((entry) => (
            <DatabaseRow key={entry.id} entry={entry} />
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--muted)', fontStyle: 'italic', fontSize: '14px' }}>
              No entries match your search.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function DatabaseRow({ entry }: { entry: DemonEntry }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        fontSize: '14px',
        transition: 'background 0.15s',
        cursor: entry.locked ? 'default' : 'pointer',
        background: hovered && !entry.locked ? 'var(--surface2)' : 'transparent',
        opacity: entry.locked ? 0.4 : 1,
      }}
    >
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '13px', color: 'var(--text)', minWidth: '130px' }}>
        {entry.name}
      </div>
      <span
        style={{
          fontSize: '10px',
          letterSpacing: '0.08em',
          padding: '3px 9px',
          borderRadius: '3px',
          whiteSpace: 'nowrap',
          ...tagStyles[entry.type],
        }}
      >
        {typeLabels[entry.type]}
      </span>
      <div style={{ flex: 1, color: 'var(--text-dim)', fontSize: '13px' }}>{entry.function}</div>
      <div style={{ fontSize: '12px', color: 'var(--muted)', fontStyle: 'italic', whiteSpace: 'nowrap' }}>{entry.reference}</div>
      {entry.locked && <div style={{ fontSize: '12px', color: 'var(--muted)' }}>🔒 Members only</div>}
    </div>
  )
}

/* ── About ── */
function AboutSection() {
  return (
    <section style={{ padding: '5rem 2.5rem', background: 'var(--surface)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', marginBottom: '0.5rem' }}>
          Why This Community
        </p>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, marginBottom: '1.5rem' }}>
          Built from the Field
        </h2>
        <blockquote
          style={{
            fontSize: 'clamp(19px, 2.5vw, 26px)',
            fontStyle: 'italic',
            fontWeight: 300,
            color: 'var(--text-dim)',
            lineHeight: 1.6,
            margin: '1.5rem 0',
            borderLeft: '3px solid var(--gold)',
            paddingLeft: '1.5rem',
            textAlign: 'left',
          }}
        >
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
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textAlign: 'center', marginBottom: '0.5rem' }}>
          Membership
        </p>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, textAlign: 'center', marginBottom: '0.5rem' }}>
          Join the War Room
        </h2>
        <p style={{ fontSize: '17px', color: 'var(--text-dim)', fontWeight: 300, fontStyle: 'italic', textAlign: 'center', maxWidth: '500px', margin: '0 auto 2.5rem' }}>
          All plans include a full 30-day free trial. No charge until day 31.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
          }}
        >
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  )
}

function PlanCard({ plan }: { plan: typeof plans[0] }) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        border: plan.featured ? '1px solid var(--gold)' : hovered ? '1px solid rgba(201,168,76,0.35)' : '1px solid var(--border)',
        borderRadius: '6px',
        padding: '2rem 1.75rem',
        background: plan.featured ? 'var(--surface2)' : 'var(--surface)',
        position: 'relative',
        transition: 'border-color 0.2s',
      }}
    >
      {plan.featured && (
        <div
          style={{
            position: 'absolute',
            top: '-13px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--gold)',
            color: 'var(--deep)',
            fontFamily: "'Cinzel', serif",
            fontSize: '9px',
            fontWeight: 700,
            letterSpacing: '0.12em',
            padding: '4px 14px',
            borderRadius: '2px',
            whiteSpace: 'nowrap',
          }}
        >
          Most Popular
        </div>
      )}

      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '12px', letterSpacing: '0.1em', color: 'var(--gold)', marginBottom: '12px' }}>
        {plan.tier}
      </div>
      <div style={{ fontSize: '44px', fontWeight: 300, lineHeight: 1, color: 'var(--text)' }}>
        <sup style={{ fontSize: '20px', verticalAlign: 'super', fontWeight: 400 }}>$</sup>
        {plan.price}
        <sub style={{ fontSize: '15px', color: 'var(--text-dim)' }}>/mo</sub>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--gold)', fontStyle: 'italic', margin: '8px 0 18px' }}>
        30 days free to start
      </p>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem' }}>
        {plan.features.map((f) => (
          <li
            key={f}
            style={{
              fontSize: '14px',
              color: 'var(--text-dim)',
              padding: '6px 0',
              borderBottom: '1px solid rgba(201,168,76,0.08)',
              display: 'flex',
              gap: '10px',
              alignItems: 'flex-start',
            }}
          >
            <span style={{ content: '✦', fontSize: '8px', color: 'var(--gold)', marginTop: '5px', flexShrink: 0 }}>✦</span>
            {f}
          </li>
        ))}
      </ul>
      <a
        href="#"
        style={{
          width: '100%',
          padding: '12px',
          fontFamily: "'Cinzel', serif",
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.1em',
          cursor: 'pointer',
          borderRadius: '3px',
          border: plan.featured ? 'none' : '1px solid var(--border-bright)',
          background: plan.featured ? 'var(--gold)' : 'transparent',
          color: plan.featured ? 'var(--deep)' : 'var(--gold)',
          transition: 'all 0.2s',
          textDecoration: 'none',
          display: 'block',
          textAlign: 'center',
          boxSizing: 'border-box',
        }}
        onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = '0.8')}
        onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.opacity = '1')}
      >
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
        <p style={{ fontFamily: "'Cinzel', serif", fontSize: '10px', letterSpacing: '0.25em', color: 'var(--gold)', textAlign: 'center', marginBottom: '0.5rem' }}>
          Questions
        </p>
        <h2 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(22px, 3vw, 32px)', fontWeight: 600, textAlign: 'center', marginBottom: '2rem' }}>
          Common Questions
        </h2>

        {faqItems.map((item, i) => (
          <div key={i} style={{ borderBottom: '1px solid var(--border)' }}>
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                textAlign: 'left',
                padding: '1.25rem 0',
                fontFamily: "'Cinzel', serif",
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                letterSpacing: '0.03em',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--gold)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = 'var(--text)')}
            >
              {item.q}
              <span
                style={{
                  color: 'var(--gold)',
                  fontSize: '18px',
                  flexShrink: 0,
                  transition: 'transform 0.2s',
                  transform: openIdx === i ? 'rotate(45deg)' : 'rotate(0)',
                  display: 'inline-block',
                }}
              >
                +
              </span>
            </button>
            <div
              style={{
                fontSize: '15px',
                color: 'var(--text-dim)',
                fontWeight: 300,
                lineHeight: 1.7,
                maxHeight: openIdx === i ? '300px' : '0',
                overflow: 'hidden',
                transition: 'max-height 0.3s ease, padding 0.3s',
                paddingBottom: openIdx === i ? '1.25rem' : '0',
              }}
            >
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
    <footer
      style={{
        borderTop: '1px solid var(--border)',
        padding: '2.5rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1rem',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: '14px',
          fontWeight: 600,
          letterSpacing: '0.15em',
          color: 'var(--gold)',
        }}
      >
        ⚔ The War Room Community
      </div>
      <nav style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        {['Arsenal', 'Database', 'Membership', 'FAQ', 'Privacy', 'Terms', 'Contact'].map((label) => (
          <a
            key={label}
            href={`#${label.toLowerCase()}`}
            style={{
              fontFamily: "'Cinzel', serif",
              fontSize: '10px',
              letterSpacing: '0.1em',
              color: 'var(--muted)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--gold)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = 'var(--muted)')}
          >
            {label}
          </a>
        ))}
      </nav>
      <p style={{ fontSize: '12px', color: 'var(--muted)' }}>
        © 2025 The War Room Community · Staffordtown Church · Built for Deliverance Ministry
      </p>
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
