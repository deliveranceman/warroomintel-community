// STYLE RULE: No em dashes in any UI text. Ever.
import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useEffect, useState } from 'react'
import { getAccessLevel } from '@/lib/access'

export const Route = createFileRoute('/admin_/dashboard')({
  component: IntelDashboardPage,
})

// ── Palette ──────────────────────────────────────────────────────────────────
const PAGE_BG  = '#EDEBE2'
const CARD_BG  = '#FFFFFF'
const BDR      = '#E5E0D5'
const GOLD     = '#8B6914'
const DEEP     = '#604408'
const TEXT     = '#1a1a1a'
const MUTED    = '#6b6b6b'
const cinzel   = "'Cinzel', serif"
const crimson  = "'Crimson Pro', serif"

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  label:      string
  value:      string | number
  sub?:       string
  breakdown?: string | null
  accent?:    string
  wide?:      boolean
  bar?:       { value: number; max: number; color?: string }
}

function StatCard({ label, value, sub, breakdown, accent, wide, bar }: StatCardProps) {
  const pct = bar ? Math.round((bar.value / bar.max) * 100) : 0

  return (
    <div style={{
      background:    CARD_BG,
      border:        `1px solid ${BDR}`,
      borderRadius:  8,
      padding:       '16px 20px',
      gridColumn:    wide ? 'span 2' : undefined,
      display:       'flex',
      flexDirection: 'column',
      gap:           4,
      minWidth:      0,
    }}>
      <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: MUTED, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontFamily: cinzel, fontSize: 26, fontWeight: 700, color: accent ?? TEXT, lineHeight: 1.1 }}>
        {value}
      </span>
      {sub && (
        <span style={{ fontFamily: crimson, fontSize: 13, color: MUTED, marginTop: 2 }}>
          {sub}
        </span>
      )}
      {breakdown && (
        <span style={{ fontFamily: crimson, fontSize: 12, color: MUTED, marginTop: 1, opacity: 0.8 }}>
          {breakdown}
        </span>
      )}
      {bar && (
        <div style={{ marginTop: 8 }}>
          <div style={{ height: 4, borderRadius: 2, background: BDR, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: bar.color ?? GOLD, borderRadius: 2, transition: 'width 0.4s ease' }} />
          </div>
          <span style={{ fontFamily: crimson, fontSize: 11, color: MUTED, marginTop: 3, display: 'block' }}>
            {pct}% of {bar.max.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}

interface DashboardRowProps {
  title:    string
  children: React.ReactNode
}

function DashboardRow({ title, children }: DashboardRowProps) {
  return (
    <section style={{ marginBottom: 32 }}>
      <h2 style={{
        fontFamily:    cinzel,
        fontSize:      11,
        letterSpacing: '0.15em',
        color:         GOLD,
        textTransform: 'uppercase',
        marginBottom:  12,
        fontWeight:    700,
      }}>
        {title}
      </h2>
      <div style={{
        display:             'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap:                 12,
      }}>
        {children}
      </div>
    </section>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

function IntelDashboardPage() {
  // All hooks must fire unconditionally before any early return (React rule)
  const { isLoaded, isSignedIn, user } = useUser()
  const { getToken }          = useAuth()
  const [stats, setStats]     = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const tier    = (user?.publicMetadata as any)?.tier as string | undefined
  const role    = (user?.publicMetadata as any)?.role as string | undefined
  const isAdmin = getAccessLevel({ tier, role }) >= 4

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        setLoading(true)
        const token = await getToken()
        const resp = await fetch('/api/admin-dashboard-stats', {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!resp.ok) throw new Error(`Stats endpoint returned ${resp.status}`)
        const data = await resp.json()
        if (!cancelled) { setStats(data); setError(null) }
      } catch (err: any) {
        if (!cancelled) setError(String(err?.message ?? err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  // Gate: Clerk resolving
  if (!isLoaded) {
    return (
      <div style={{
        minHeight:   '100vh',
        background:  '#EDEBE2',
        display:     'flex',
        alignItems:  'center',
        justifyContent: 'center',
        fontFamily:  '"Crimson Pro", serif',
        color:       '#6b6b6b',
        fontSize:    14,
      }}>
        Verifying access...
      </div>
    )
  }

  // Gate: not signed in or insufficient tier
  if (!isSignedIn || !isAdmin) {
    return (
      <div style={{
        minHeight:      '100vh',
        background:     '#EDEBE2',
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        24,
      }}>
        <div style={{
          maxWidth:    420,
          background:  '#FFFFFF',
          border:      '1px solid #E5E0D5',
          borderRadius: 6,
          padding:     32,
          textAlign:   'center',
        }}>
          <div style={{
            fontFamily:    'Cinzel, serif',
            fontSize:      14,
            fontWeight:    600,
            color:         '#604408',
            letterSpacing: '0.15em',
            marginBottom:  12,
          }}>
            ACCESS DENIED
          </div>
          <p style={{
            fontFamily: '"Crimson Pro", serif',
            fontSize:   15,
            color:      '#1a1a1a',
            margin:     '0 0 20px 0',
            lineHeight: 1.5,
          }}>
            This area is restricted to authorized personnel.
          </p>
          <a href="/community" style={{
            fontFamily:    'Cinzel, serif',
            fontSize:      12,
            color:         '#8B6914',
            textDecoration: 'none',
            letterSpacing: '0.1em',
          }}>
            Return to Community
          </a>
        </div>
      </div>
    )
  }

  const fmt = (n: number | null | undefined) =>
    loading ? '—' : (n ?? 0).toLocaleString()

  const fmtMoney = (n: number | null | undefined) =>
    loading ? '—' : `$${(n ?? 0).toFixed(2)}`

  return (
    <div style={{
      minHeight:  '100vh',
      background: PAGE_BG,
      padding:    '32px 24px',
      boxSizing:  'border-box',
    }}>
      {/* Error banner */}
      {error && (
        <div style={{
          background:   '#FEE2E2',
          border:       '1px solid #FCA5A5',
          borderRadius: 4,
          padding:      '8px 12px',
          marginBottom: 16,
          fontFamily:   crimson,
          fontSize:     13,
          color:        '#991B1B',
        }}>
          Stats unavailable: {error}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: 32, borderBottom: `1px solid ${BDR}`, paddingBottom: 20 }}>
        <a href="/admin" style={{
          fontFamily:    'Cinzel, serif',
          fontSize:      11,
          color:         '#8B6914',
          textDecoration: 'none',
          letterSpacing: '0.12em',
          display:       'inline-block',
          marginBottom:  8,
        }}>
          &larr; ADMIN
        </a>
        <h1 style={{ fontFamily: cinzel, fontSize: 22, fontWeight: 700, color: DEEP, letterSpacing: '0.06em', margin: 0 }}>
          Intel Dashboard
        </h1>
        <p style={{ fontFamily: crimson, fontSize: 14, color: MUTED, margin: '6px 0 0' }}>
          Live view of WRI enrichment workflows, spirit coverage, and system health.
        </p>
        <nav style={{ marginTop: 16, display: 'flex', gap: 12 }}>
          {[
            { label: 'Enrichment Queue', href: '/admin#enrichment' },
            { label: 'Candidates',       href: '/admin#candidates' },
            { label: 'Resources',        href: '/admin#resources' },
          ].map(({ label, href }) => (
            <a key={href} href={href} style={{
              fontFamily:     cinzel,
              fontSize:       10,
              letterSpacing:  '0.1em',
              color:          GOLD,
              textDecoration: 'none',
              border:         `1px solid ${BDR}`,
              borderRadius:   4,
              padding:        '4px 10px',
            }}>
              {label}
            </a>
          ))}
        </nav>
      </div>

      {/* Row 1: Active Workflows */}
      <DashboardRow title="Active Workflows">
        <StatCard
          label="Spirits"
          value={fmt(stats?.row1?.spirits?.count)}
          sub="active in archive"
        />
        <StatCard
          label="Enrichment Queue"
          value={fmt(stats?.row1?.enrichment?.count)}
          sub="pending review"
          accent={GOLD}
          breakdown={
            stats?.row1?.enrichment?.triage
              ? `🟢 ${stats.row1.enrichment.triage.ready} · 🟡 ${stats.row1.enrichment.triage.needsRead} · 🔴 ${stats.row1.enrichment.triage.reject} · ⚪ ${stats.row1.enrichment.triage.legacy}`
              : null
          }
        />
        <StatCard
          label="Candidates"
          value={fmt(stats?.row1?.candidates?.count)}
          sub="awaiting triage"
          breakdown={
            stats?.row1?.candidates?.byConfidence
              ? `HIGH: ${stats.row1.candidates.byConfidence.HIGH} · MID: ${stats.row1.candidates.byConfidence.MID} · LOW: ${stats.row1.candidates.byConfidence.LOW}`
              : null
          }
        />
        <StatCard
          label="Approved Today"
          value={fmt(stats?.row1?.today?.spiritsApproved)}
          sub="spirits approved 24h"
          breakdown={stats ? `${stats.row1.today.retrofitted} retrofitted` : null}
        />
      </DashboardRow>

      {/* Row 2: Intel Depth */}
      <DashboardRow title="Intel Depth">
        <StatCard
          label="Body Map"
          value={
            loading
              ? '—'
              : `${stats?.row2?.bodyMap?.mapped ?? 0} / ${stats?.row2?.bodyMap?.total ?? 80}`
          }
          sub="regions mapped"
          breakdown={
            stats
              ? `${((stats.row2.bodyMap.mapped / stats.row2.bodyMap.total) * 100).toFixed(1)}% coverage`
              : null
          }
        />
        <StatCard
          label="Gateways"
          value={fmt(stats?.row2?.gateways?.count)}
          sub="mapped"
          breakdown={stats ? `across ${stats.row2.gateways.spirits} spirits` : null}
        />
        <StatCard
          label="Scriptures"
          value={fmt(stats?.row2?.scriptures?.count)}
          sub="mapped"
          breakdown={stats ? `across ${stats.row2.scriptures.spirits} spirits` : null}
        />
        <StatCard
          label="Network"
          value={fmt(
            (stats?.row2?.network?.hierarchy ?? 0) +
            (stats?.row2?.network?.companions ?? 0)
          )}
          sub="relationships"
          breakdown={
            stats
              ? `${stats.row2.network.hierarchy} hierarchy · ${stats.row2.network.companions} companions`
              : null
          }
        />
      </DashboardRow>

      {/* Row 3: Sources and Ingestion */}
      <DashboardRow title="Sources and Ingestion">
        <StatCard
          label="Library"
          value={fmt(stats?.row3?.libraryChunks?.count)}
          sub="chunks indexed"
          breakdown={stats ? `${stats.row3.resources.count} resources` : null}
        />
        <StatCard
          label="Resources"
          value={fmt(stats?.row3?.resources?.count)}
          sub="resources indexed"
          breakdown={
            stats?.row3?.resources?.recentDaysAgo !== null &&
            stats?.row3?.resources?.recentDaysAgo !== undefined
              ? `last added: ${stats.row3.resources.recentDaysAgo}d ago`
              : null
          }
        />
        <StatCard
          label="Recent Extractions"
          value={fmt(stats?.row3?.recentExtractions?.successesLastHour)}
          sub="last hour"
          breakdown={
            stats
              ? `${stats.row3.recentExtractions.failuresLast24h} failures 24h`
              : null
          }
        />
      </DashboardRow>

      {/* Row 4: Health and Ops */}
      <DashboardRow title="Health and Ops">
        <StatCard
          label="Failures"
          value={fmt(stats?.row4?.failures24h)}
          sub="last 24h"
          accent={!loading && (stats?.row4?.failures24h ?? 0) > 5 ? '#b04020' : MUTED}
        />
        <StatCard
          label="AI Spend"
          value={fmtMoney(stats?.row4?.aiSpendToday)}
          sub="today"
          accent={GOLD}
          breakdown={stats ? `${fmtMoney(stats.row4.aiSpend7d)} trailing 7d` : null}
        />
        <StatCard
          label="Active Members"
          value={fmt(stats?.row4?.membersActive7d)}
          sub="active 7d"
        />
      </DashboardRow>
    </div>
  )
}
