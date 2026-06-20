// STYLE RULE: No em dashes in any UI text. Ever.
import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@clerk/tanstack-start'
import { useEffect, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/admin/dashboard')({
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

// ── Mock data (replaced by /api/admin-dashboard-stats in Commit 2) ────────────
const MOCK: DashboardStats = {
  // Active Workflows
  lesPending:         142,
  lesApplied:         389,
  lesRejected:         47,
  lesNeedsRetrofit:    91,
  candidatesPending:   58,
  candidatesApproved: 1204,

  // Intel Depth
  spiritsTotal:       1204,
  spiritsWithLayer2:   817,
  layer2Substantial:   502,
  layer2Partial:       219,
  layer2Minimal:        96,
  avgScriptureRefs:    6.4,
  attestedTrue:        731,
  attestedFalse:        86,

  // Sources & Ingestion
  resourcesTotal:      148,
  resourcesEmbedded:   134,
  chunksTotal:       42871,
  sourceMinistry:       89,
  sourceIntelligence:   59,
  lastIngestedAt:    '2026-06-19T14:22:00Z',

  // Health & Ops
  jobsLast7d:          312,
  costLast7d:         18.74,
  errorRatePct:         2.1,
  avgExtractionMs:    4820,
  retrofitQueue:        91,
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface DashboardStats {
  lesPending:         number
  lesApplied:         number
  lesRejected:        number
  lesNeedsRetrofit:   number
  candidatesPending:  number
  candidatesApproved: number
  spiritsTotal:       number
  spiritsWithLayer2:  number
  layer2Substantial:  number
  layer2Partial:      number
  layer2Minimal:      number
  avgScriptureRefs:   number
  attestedTrue:       number
  attestedFalse:      number
  resourcesTotal:     number
  resourcesEmbedded:  number
  chunksTotal:        number
  sourceMinistry:     number
  sourceIntelligence: number
  lastIngestedAt:     string
  jobsLast7d:         number
  costLast7d:         number
  errorRatePct:       number
  avgExtractionMs:    number
  retrofitQueue:      number
}

// ── Sub-components ────────────────────────────────────────────────────────────

interface StatCardProps {
  label:     string
  value:     string | number
  sub?:      string
  accent?:   string
  wide?:     boolean
  bar?:      { value: number; max: number; color?: string }
}

function StatCard({ label, value, sub, accent, wide, bar }: StatCardProps) {
  const pct = bar ? Math.round((bar.value / bar.max) * 100) : 0

  return (
    <div style={{
      background:   CARD_BG,
      border:       `1px solid ${BDR}`,
      borderRadius: 8,
      padding:      '16px 20px',
      gridColumn:   wide ? 'span 2' : undefined,
      display:      'flex',
      flexDirection:'column',
      gap:          4,
      minWidth:     0,
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
  const { isLoaded, userId } = useAuth()
  const navigate             = useNavigate()
  const [stats]              = useState<DashboardStats>(MOCK)

  useEffect(() => {
    if (isLoaded && !userId) navigate({ to: '/admin/login' })
  }, [isLoaded, userId, navigate])

  if (!isLoaded || !userId) return null

  const layer2Coverage = stats.spiritsWithLayer2 / Math.max(stats.spiritsTotal, 1)
  const l2Total        = stats.layer2Substantial + stats.layer2Partial + stats.layer2Minimal
  const lastIngested   = stats.lastIngestedAt
    ? new Date(stats.lastIngestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'never'

  return (
    <div style={{
      minHeight:   '100vh',
      background:  PAGE_BG,
      padding:     '32px 24px',
      boxSizing:   'border-box',
    }}>
      {/* Header */}
      <div style={{ marginBottom: 32, borderBottom: `1px solid ${BDR}`, paddingBottom: 20 }}>
        <h1 style={{ fontFamily: cinzel, fontSize: 22, fontWeight: 700, color: DEEP, letterSpacing: '0.06em', margin: 0 }}>
          Intel Dashboard
        </h1>
        <p style={{ fontFamily: crimson, fontSize: 14, color: MUTED, margin: '6px 0 0' }}>
          Live view of WRI enrichment workflows, spirit coverage, and system health.
          {' '}<span style={{ color: '#b08020', fontStyle: 'italic' }}>(Mock data -- connect stats endpoint in Commit 2)</span>
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
        <StatCard label="LES Pending"         value={stats.lesPending}         sub="awaiting review" accent={GOLD} />
        <StatCard label="LES Applied"         value={stats.lesApplied}         sub="approved to spirit" />
        <StatCard label="LES Rejected"        value={stats.lesRejected}        sub="not attested" />
        <StatCard label="Needs Retrofit"      value={stats.lesNeedsRetrofit}   sub="legacy / no _meta" accent="#b08020" />
        <StatCard label="Candidates Pending"  value={stats.candidatesPending}  sub="new spirits to review" accent={GOLD} />
        <StatCard label="Candidates Approved" value={stats.candidatesApproved} sub="in spirits table" />
      </DashboardRow>

      {/* Row 2: Intel Depth */}
      <DashboardRow title="Intel Depth">
        <StatCard
          label="Layer 2 Coverage"
          value={`${Math.round(layer2Coverage * 100)}%`}
          sub={`${stats.spiritsWithLayer2} of ${stats.spiritsTotal} spirits`}
          bar={{ value: stats.spiritsWithLayer2, max: stats.spiritsTotal, color: GOLD }}
          wide
        />
        <StatCard label="Substantial"   value={stats.layer2Substantial} sub={`${Math.round(stats.layer2Substantial / Math.max(l2Total, 1) * 100)}% of retrofitted`} accent="#2d7a3a" />
        <StatCard label="Partial"       value={stats.layer2Partial}     sub="needs read"  accent="#b08020" />
        <StatCard label="Minimal"       value={stats.layer2Minimal}     sub="low coverage" accent="#b04020" />
        <StatCard label="Avg Scripture Refs"  value={stats.avgScriptureRefs.toFixed(1)} sub="per retrofitted LES" />
        <StatCard label="Attested True"       value={stats.attestedTrue}  sub="spirit confirmed in source" accent="#2d7a3a" />
        <StatCard label="Attested False"      value={stats.attestedFalse} sub="reject candidates" accent="#b04020" />
      </DashboardRow>

      {/* Row 3: Sources & Ingestion */}
      <DashboardRow title="Sources and Ingestion">
        <StatCard
          label="Embedded Resources"
          value={`${stats.resourcesEmbedded}/${stats.resourcesTotal}`}
          sub="sources with vector chunks"
          bar={{ value: stats.resourcesEmbedded, max: stats.resourcesTotal, color: '#5C7CBF' }}
          wide
        />
        <StatCard label="Total Chunks"      value={stats.chunksTotal.toLocaleString()} sub="library_chunks indexed" />
        <StatCard label="Ministry Sources"  value={stats.sourceMinistry}     sub="is_adversarial=false" accent="#2d7a3a" />
        <StatCard label="Intel Sources"     value={stats.sourceIntelligence} sub="is_adversarial=true"  accent="#7C5CBF" />
        <StatCard label="Last Ingested"     value={lastIngested}             sub="most recent embedding" />
      </DashboardRow>

      {/* Row 4: Health & Ops */}
      <DashboardRow title="Health and Ops">
        <StatCard label="AI Jobs (7d)"        value={stats.jobsLast7d}                   sub="extractions + retrofits" />
        <StatCard label="Cost (7d)"           value={`$${stats.costLast7d.toFixed(2)}`}  sub="OpenAI + Anthropic" accent={GOLD} />
        <StatCard label="Error Rate"          value={`${stats.errorRatePct.toFixed(1)}%`} sub="extraction failures"  accent={stats.errorRatePct > 5 ? '#b04020' : MUTED} />
        <StatCard label="Avg Extraction Time" value={`${(stats.avgExtractionMs / 1000).toFixed(1)}s`} sub="p50 wall time" />
        <StatCard label="Retrofit Queue"      value={stats.retrofitQueue} sub="legacy LES ready for L2" accent="#b08020" />
      </DashboardRow>

      <p style={{ fontFamily: crimson, fontSize: 11, color: MUTED, textAlign: 'center', marginTop: 8 }}>
        Mock data -- wire /api/admin-dashboard-stats in Commit 2 to see live counts.
      </p>
    </div>
  )
}
