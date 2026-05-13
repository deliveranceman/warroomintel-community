import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'

export const Route = createFileRoute('/resources')({
  component: ResourcesPage,
})

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Resource {
  id: string
  title: string
  description: string
  tier: 'Free' | 'Soldier' | 'Commander' | 'General'
  category: string
  filePath: string
  pageCount: number | null
  fileSize: string
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const cinzel   = "'Cinzel', serif"
const crimson  = "'Crimson Pro', serif"
const gold     = '#C9A84C'
const deep     = '#0D0B14'
const surface  = '#110f1c'
const surface2 = '#1a1625'
const border   = '#2a2440'
const borderBright = '#3d3460'
const textDim  = '#9d94b8'
const muted    = '#6a6080'

const TIERS = ['All', 'Free', 'Soldier', 'Commander', 'General'] as const
const CATEGORIES = ['All', 'Foundational', 'Session', 'Worksheet', 'Protocol', 'Prayer', 'Ministry', 'Occult']

const TIER_ORDER: Record<string, number> = { Free: 0, Soldier: 1, Commander: 2, General: 3 }

const TIER_COLORS: Record<string, string> = {
  Free:      '#6a6080',
  Soldier:   '#5C7CBF',
  Commander: '#7C5CBF',
  General:   '#C9A84C',
}

const TIER_ICONS: Record<string, string> = {
  Free:      '✦',
  Soldier:   '⚔',
  Commander: '🛡',
  General:   '👑',
}

const MN_LOGIN_URL = 'https://community.warroomintel.com'

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getTierLevel(tier: string) { return TIER_ORDER[tier] ?? 0 }

function groupByTier(resources: Resource[]) {
  const groups: Record<string, Resource[]> = { Free: [], Soldier: [], Commander: [], General: [] }
  resources.forEach(r => { if (groups[r.tier]) groups[r.tier].push(r) })
  return groups
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: string }) {
  return (
    <span style={{
      fontFamily: cinzel,
      fontSize: '9px',
      letterSpacing: '0.12em',
      color: TIER_COLORS[tier] || muted,
      border: `1px solid ${TIER_COLORS[tier]}44`,
      padding: '2px 8px',
      borderRadius: '20px',
      textTransform: 'uppercase' as const,
    }}>
      {TIER_ICONS[tier]} {tier}
    </span>
  )
}

function FileCard({
  resource,
  memberTier,
  onDownload,
  downloading,
}: {
  resource: Resource
  memberTier: string
  onDownload: (r: Resource) => void
  downloading: string | null
}) {
  const memberLevel = getTierLevel(memberTier)
  const fileLevel   = getTierLevel(resource.tier)
  const hasAccess   = memberLevel >= fileLevel
  const isDownloading = downloading === resource.id

  return (
    <div style={{
      background: surface,
      border: `1px solid ${hasAccess ? border : border}`,
      borderRadius: '8px',
      padding: '16px',
      position: 'relative',
      opacity: hasAccess ? 1 : 0.55,
      transition: 'border-color 0.2s',
      cursor: hasAccess ? 'default' : 'not-allowed',
    }}
      onMouseEnter={e => { if (hasAccess) (e.currentTarget as HTMLElement).style.borderColor = `${gold}55` }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = border }}
    >
      {/* Lock or Download button */}
      {hasAccess ? (
        <button
          onClick={() => onDownload(resource)}
          disabled={isDownloading}
          style={{
            position: 'absolute', top: '12px', right: '12px',
            width: '28px', height: '28px',
            background: 'transparent',
            border: `1px solid ${border}`,
            borderRadius: '5px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '13px', color: muted,
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget
            el.style.borderColor = `${gold}66`
            el.style.color = gold
          }}
          onMouseLeave={e => {
            const el = e.currentTarget
            el.style.borderColor = border
            el.style.color = muted
          }}
          title="Download"
        >
          {isDownloading ? '⏳' : '↓'}
        </button>
      ) : (
        <div style={{
          position: 'absolute', top: '12px', right: '12px',
          width: '28px', height: '28px',
          background: surface2,
          border: `1px solid ${border}`,
          borderRadius: '5px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', color: muted,
        }}>
          🔒
        </div>
      )}

      {/* File type row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
        <span style={{ fontSize: '12px', color: gold }}>📄</span>
        <span style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.14em', color: `${gold}88`, textTransform: 'uppercase' as const }}>
          PDF{resource.pageCount ? ` · ${resource.pageCount} pages` : ''}
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontFamily: crimson,
        fontSize: '14px',
        color: hasAccess ? '#e8e0d0' : textDim,
        lineHeight: 1.4,
        marginBottom: '10px',
        paddingRight: '36px',
      }}>
        {resource.title}
      </div>

      {/* Description */}
      {resource.description && (
        <div style={{ fontFamily: crimson, fontStyle: 'italic', fontSize: '12px', color: muted, lineHeight: 1.5, marginBottom: '10px' }}>
          {resource.description}
        </div>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
        <TierBadge tier={resource.tier} />
        {resource.category && (
          <span style={{ fontFamily: cinzel, fontSize: '9px', color: muted, letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>
            {resource.category}
          </span>
        )}
        {resource.fileSize && (
          <>
            <span style={{ color: border, fontSize: '10px' }}>·</span>
            <span style={{ fontSize: '11px', color: muted }}>{resource.fileSize}</span>
          </>
        )}
      </div>

      {/* Upgrade nudge on locked cards */}
      {!hasAccess && (
        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: `1px solid ${border}` }}>
          <a href={MN_LOGIN_URL} target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.1em', color: TIER_COLORS[resource.tier] || muted, textDecoration: 'none' }}>
            Upgrade to {resource.tier} to unlock →
          </a>
        </div>
      )}
    </div>
  )
}

function SectionHeader({ tier }: { tier: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <div style={{
        width: '30px', height: '30px',
        border: `1px solid ${TIER_COLORS[tier]}44`,
        borderRadius: '6px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '14px',
      }}>
        {TIER_ICONS[tier]}
      </div>
      <div style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.18em', color: TIER_COLORS[tier], textTransform: 'uppercase' as const }}>
        {tier === 'Free' ? 'Free — General Intelligence' :
         tier === 'Soldier' ? 'Soldier — Field Protocols' :
         tier === 'Commander' ? 'Commander — Advanced Intelligence' :
         'General — Command-Level Resources'}
      </div>
      <div style={{ flex: 1, height: '1px', background: border }} />
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
function ResourcesPage() {
  const [resources, setResources]     = useState<Resource[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [memberTier, setMemberTier]   = useState('Free')
  const [activeTab, setActiveTab]     = useState('All')
  const [activeCategory, setActiveCategory] = useState('All')
  const [search, setSearch]           = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  // Fetch all resources on mount
  useEffect(() => {
    fetch('/api/resources')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setResources(data.resources || [])
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  // Handle download — calls /api/resource-download to get a signed URL
  const handleDownload = useCallback(async (resource: Resource) => {
    setDownloading(resource.id)
    setDownloadError(null)
    try {
      const res = await fetch('/api/resource-download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filePath:   resource.filePath,
          fileTier:   resource.tier,
          memberTier: memberTier,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.signedUrl) {
        throw new Error(data.error || 'Could not generate download link')
      }
      // Open the signed URL in a new tab — browser will download
      window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      setDownloadError(err.message)
    } finally {
      setDownloading(null)
    }
  }, [memberTier])

  // Filter resources
  const filtered = resources.filter(r => {
    if (activeTab !== 'All' && r.tier !== activeTab) return false
    if (activeCategory !== 'All' && r.category !== activeCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.category.toLowerCase().includes(q)
    }
    return true
  })

  const grouped = groupByTier(filtered)
  const tierCounts: Record<string, number> = {}
  resources.forEach(r => { tierCounts[r.tier] = (tierCounts[r.tier] || 0) + 1 })

  return (
    <div style={{ background: deep, minHeight: '100vh', color: '#e8e0d0', fontFamily: crimson }}>

      {/* ── Topbar ── */}
      <div style={{ background: deep, borderBottom: `1px solid ${border}`, padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <a href="/" style={{ fontFamily: cinzel, fontSize: '13px', letterSpacing: '0.18em', color: gold, textDecoration: 'none', textTransform: 'uppercase' as const }}>
          War Room Intel
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
          {(['/', '/assessment', '/arsenal'] as const).map((href, i) => (
            <a key={href} href={href} style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: muted, textDecoration: 'none' }}>
              {['Home', 'Assessment', 'Arsenal'][i]}
            </a>
          ))}
          <span style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase' as const, color: gold }}>
            Resources
          </span>
        </div>
        {/* Tier selector — in production this comes from your auth/token system */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.1em', color: muted }}>YOUR TIER:</span>
          <select
            value={memberTier}
            onChange={e => setMemberTier(e.target.value)}
            style={{
              background: surface2, border: `1px solid ${gold}44`, color: gold,
              fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.1em',
              padding: '4px 10px', borderRadius: '20px', cursor: 'pointer', outline: 'none',
            }}
          >
            {['Free', 'Soldier', 'Commander', 'General'].map(t => (
              <option key={t} value={t}>{TIER_ICONS[t]} {t}</option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Hero ── */}
      <div style={{ padding: '40px 32px 24px', borderBottom: `1px solid ${border}` }}>
        <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.22em', color: muted, marginBottom: '8px', textTransform: 'uppercase' as const }}>
          Ministry Library
        </div>
        <h1 style={{ fontFamily: cinzel, fontSize: '28px', fontWeight: 400, color: gold, letterSpacing: '0.06em', marginBottom: '8px', margin: '0 0 8px' }}>
          Resource Arsenal
        </h1>
        <p style={{ fontFamily: crimson, fontStyle: 'italic', fontSize: '15px', color: textDim, margin: 0 }}>
          Protocols, worksheets, and field manuals — organized by tier and category.
        </p>
      </div>

      {/* ── Search ── */}
      <div style={{ padding: '20px 32px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: surface, border: `1px solid ${border}`,
          borderRadius: '7px', padding: '10px 14px',
        }}>
          <span style={{ color: muted, fontSize: '14px' }}>🔍</span>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search resources — soul ties, Freemasonry, session flow..."
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: '#e8e0d0', fontSize: '13px', width: '100%',
              fontFamily: crimson,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '14px' }}>✕</button>
          )}
        </div>
      </div>

      {/* ── Category filter ── */}
      <div style={{ padding: '12px 32px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setActiveCategory(cat)} style={{
            fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.1em',
            textTransform: 'uppercase' as const,
            background: activeCategory === cat ? `${gold}22` : 'transparent',
            border: `1px solid ${activeCategory === cat ? `${gold}66` : border}`,
            color: activeCategory === cat ? gold : muted,
            padding: '4px 12px', borderRadius: '20px', cursor: 'pointer',
            transition: 'all 0.15s',
          }}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── Tier tabs ── */}
      <div style={{ display: 'flex', padding: '0 32px', borderBottom: `1px solid ${border}`, marginTop: '16px' }}>
        {TIERS.map(t => {
          const count = t === 'All' ? resources.length : (tierCounts[t] || 0)
          return (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              padding: '14px 20px',
              background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t ? gold : 'transparent'}`,
              color: activeTab === t ? gold : muted,
              cursor: 'pointer', marginBottom: '-1px', transition: 'all 0.15s',
            }}>
              {t}
              <span style={{
                marginLeft: '6px', fontSize: '9px',
                background: activeTab === t ? `${gold}22` : surface2,
                color: activeTab === t ? gold : muted,
                padding: '1px 6px', borderRadius: '10px',
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '28px 32px', maxWidth: '1200px' }}>

        {/* Download error */}
        {downloadError && (
          <div style={{
            background: '#2a1010', border: '1px solid #5a2020', borderRadius: '8px',
            padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: '#e09090',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>⚠ {downloadError}</span>
            <button onClick={() => setDownloadError(null)} style={{ background: 'none', border: 'none', color: '#e09090', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: muted, fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.2em' }}>
            LOADING ARSENAL...
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ textAlign: 'center', padding: '60px', color: '#e09090', fontFamily: crimson }}>
            Failed to load resources: {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: muted, fontFamily: crimson, fontStyle: 'italic' }}>
            No resources found. Try adjusting your search or filters.
          </div>
        )}

        {/* Render by tier sections */}
        {!loading && !error && filtered.length > 0 && (
          <>
            {(['Free', 'Soldier', 'Commander', 'General'] as const).map(tier => {
              const items = grouped[tier]
              if (!items || items.length === 0) return null
              return (
                <div key={tier} style={{ marginBottom: '36px' }}>
                  <SectionHeader tier={tier} />
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: '12px',
                  }}>
                    {items.map(resource => (
                      <FileCard
                        key={resource.id}
                        resource={resource}
                        memberTier={memberTier}
                        onDownload={handleDownload}
                        downloading={downloading}
                      />
                    ))}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* ── Footer note ── */}
      <div style={{ borderTop: `1px solid ${border}`, padding: '24px 32px', textAlign: 'center' as const }}>
        <p style={{ fontFamily: crimson, fontStyle: 'italic', fontSize: '13px', color: muted }}>
          Download links expire after 4 hours for security. Refresh the page to generate a new link.
        </p>
        <a href={MN_LOGIN_URL} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.12em', color: gold, textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>
          ⚔ Manage Membership →
        </a>
      </div>
    </div>
  )
}
