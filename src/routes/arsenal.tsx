import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect, useCallback } from 'react'
import { useAuth, useUser, SignInButton, SignUpButton } from '@clerk/tanstack-start'
import { Search } from 'lucide-react'
import { TacticalCard, ClassBadge, HUDChip, GoldButton, SectionLabel, MonoTime } from '@/components/primitives'
import type { ClassLevel } from '@/components/primitives'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { UpgradeGate } from '@/components/UpgradeGate'

export const Route = createFileRoute('/arsenal')({
  component: ArsenalPage,
})

// ─── MOBILE STYLES ────────────────────────────────────────────────────────────
const resourcesMobileStyles = `
  @media (max-width: 640px) {
    .res-hero { padding: 16px !important; }
    .res-search-bar { padding: 14px 16px 0 !important; }
    .res-filters { padding: 10px 16px 0 !important; }
    .res-tabs { padding: 0 16px !important; }
    .res-grid {
      grid-template-columns: 1fr !important;
      padding: 20px 16px !important;
    }
    .res-footer { padding: 20px 16px !important; }
    .res-section-header { padding: 0 16px 10px !important; }
  }
  @media (min-width: 641px) and (max-width: 900px) {
    .res-hero { padding: 16px 20px !important; }
    .res-search-bar { padding: 14px 20px 0 !important; }
    .res-filters { padding: 10px 20px 0 !important; }
    .res-tabs { padding: 0 20px !important; }
    .res-grid { padding: 20px 20px !important; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important; }
  }
`

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Resource {
  id: string
  title: string
  description: string | null
  tier: 'Free' | 'Soldier' | 'Commander' | 'General'
  category: string
  // Supabase fields
  file_path?: string
  file_type?: string
  file_size?: number
  created_at?: string
  // Legacy Airtable fields (kept for compatibility)
  filePath?: string
  pageCount?: number | null
  fileSize?: string
  // Locked stub fields (above-tier items returned as metadata-only teasers)
  locked?: boolean
  lockedPreview?: string
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const TIERS = ['All', 'Free', 'Soldier', 'Commander', 'General'] as const
const CATEGORIES = ['All', 'Session Tools', 'Teaching', 'Protocol', 'Reference', 'Renunciation', 'Worksheet', 'Foundational', 'Session', 'Prayer', 'Ministry', 'Occult']

const TIER_ORDER: Record<string, number> = {
  free: 0, watchman: 0, soldier: 1, commander: 2, general: 3, minister: 4, commandant: 5,
}

const TIER_ICONS: Record<string, string> = {
  Free:      '✦',
  Soldier:   '⚔',
  Commander: '🛡',
  General:   '👑',
}

const TIER_CLASS: Record<string, ClassLevel> = {
  Free:      'IV',
  Soldier:   'III',
  Commander: 'II',
  General:   'I',
}

const COMMUNITY_URL = '/community'

const NEXT_TIER: Record<string, string> = {
  watchman: 'soldier', free: 'soldier', soldier: 'commander', commander: 'general',
  general: '', minister: '', commandant: '',
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function getTierLevel(tier: string) { return TIER_ORDER[(tier ?? '').toLowerCase()] ?? 0 }

function normalizeTier(t: string): 'Free' | 'Soldier' | 'Commander' | 'General' {
  const map: Record<string, 'Free' | 'Soldier' | 'Commander' | 'General'> = {
    free: 'Free', Free: 'Free', watchman: 'Free', Watchman: 'Free',
    soldier: 'Soldier', Soldier: 'Soldier',
    commander: 'Commander', Commander: 'Commander',
    general: 'General', General: 'General',
    minister: 'General', Minister: 'General',
    commandant: 'General', Commandant: 'General',
  }
  return map[t] ?? 'Free'
}

function groupByTier(resources: Resource[]) {
  const groups: Record<string, Resource[]> = { Free: [], Soldier: [], Commander: [], General: [] }
  resources.forEach(r => { groups[normalizeTier(r.tier)]?.push(r) })
  return groups
}

async function callUpgrade(tier: string, getToken: () => Promise<string | null>): Promise<void> {
  try {
    const token = await getToken()
    if (!token) { window.location.href = '/sign-in'; return }
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tier }),
    })
    if (!res.ok) throw new Error('Checkout failed')
    const data = await res.json()
    if (data.error === 'sold_out') { alert('Founding General spots are sold out.'); return }
    if (data.url) window.open(data.url, '_blank', 'noopener,noreferrer')
  } catch (err) { console.error('Upgrade error:', err) }
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

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
  const isLocked      = resource.locked === true
  const memberLevel   = getTierLevel(memberTier)
  const fileLevel     = getTierLevel(resource.tier)
  const hasAccess     = !isLocked && memberLevel >= fileLevel
  const isDownloading = downloading === resource.id

  const fileTypeName = resource.file_type?.split('/').pop()?.toUpperCase()
    || (resource.file_path?.split('.').pop()?.toUpperCase())
    || 'PDF'

  if (isLocked) {
    return (
      <TacticalCard brackets padding="16px" style={{ opacity: 0.78 }}>
        {/* Header: locked badge + tier */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap' as const, gap: 6 }}>
          <HUDChip>🔒 LOCKED</HUDChip>
          <ClassBadge level={TIER_CLASS[normalizeTier(resource.tier)] || 'IV'} label={resource.tier.toUpperCase()} />
        </div>

        {/* Title */}
        <div style={{ fontFamily: cinzel, fontSize: 15, color: 'var(--t-2)', lineHeight: 1.4, marginBottom: 4, letterSpacing: '0.03em' }}>
          {resource.title}
        </div>

        {/* Category */}
        {resource.category && (
          <div style={{ marginBottom: 8 }}>
            <MonoTime color="var(--t-4)" size={10}>{resource.category.toUpperCase()}</MonoTime>
          </div>
        )}

        {/* Teaser — first line only, never the full body */}
        {resource.lockedPreview && (
          <div style={{ fontFamily: 'Georgia, serif', fontSize: 13, color: 'var(--t-4)', lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic' }}>
            {resource.lockedPreview}…
          </div>
        )}

        {/* Upgrade CTA via Stripe */}
        <UpgradeGate
          variant="banner"
          featureName={`${normalizeTier(resource.tier)} resource`}
          requiredTier={normalizeTier(resource.tier).toLowerCase()}
        />
      </TacticalCard>
    )
  }

  return (
    <TacticalCard brackets padding="16px">
      {/* Header: file type + tier */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap' as const, gap: 6 }}>
        <HUDChip>{fileTypeName}</HUDChip>
        <ClassBadge level={TIER_CLASS[resource.tier] || 'IV'} label={resource.tier.toUpperCase()} />
      </div>

      {/* Title */}
      <div style={{
        fontFamily: cinzel,
        fontSize: 15,
        color: 'var(--t-0)',
        lineHeight: 1.4,
        marginBottom: 8,
        letterSpacing: '0.03em',
      }}>
        {resource.title}
      </div>

      {/* Description */}
      {resource.description && (
        <div style={{ fontFamily: 'Georgia, serif', fontSize: 14, color: 'var(--t-2)', lineHeight: 1.6, marginBottom: 10 }}>
          {resource.description}
        </div>
      )}

      {/* Meta row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' as const }}>
        {resource.category && (
          <MonoTime color="var(--t-4)" size={10}>{resource.category.toUpperCase()}</MonoTime>
        )}
        {(resource.file_size || resource.fileSize) && (
          <MonoTime color="var(--t-3)" size={11}>
            {resource.file_size ? `${(resource.file_size / 1024 / 1024).toFixed(1)} MB` : resource.fileSize}
          </MonoTime>
        )}
        {resource.pageCount && (
          <MonoTime color="var(--t-4)" size={10}>{resource.pageCount} pg</MonoTime>
        )}
      </div>

      {/* Action */}
      {hasAccess ? (
        <GoldButton sm onClick={() => onDownload(resource)} disabled={isDownloading} full>
          {isDownloading ? '↓ Downloading…' : '↓ Download'}
        </GoldButton>
      ) : (
        <UpgradeGate
          variant="banner"
          featureName={`${resource.tier} resource`}
          requiredTier={resource.tier.toLowerCase()}
        />
      )}
    </TacticalCard>
  )
}

function SectionHeader({ tier }: { tier: string }) {
  const label = tier === 'Free'      ? 'General Intelligence' :
                tier === 'Soldier'   ? 'Field Protocols' :
                tier === 'Commander' ? 'Advanced Intelligence' :
                                       'Command-Level Resources'
  const display = tier === 'Free' ? 'WATCHMAN' : tier.toUpperCase()
  return (
    <SectionLabel style={{ marginBottom: 16 }}>
      {TIER_ICONS[tier]} {display} — {label}
    </SectionLabel>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
function ArsenalPage() {
  const { isLoaded, isSignedIn } = useAuth()
  const { user } = useUser()

  const [resources, setResources]     = useState<Resource[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [activeTab, setActiveTab]     = useState('All')
  const [activeCategory, setActiveCategory] = useState('All')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [activeQuickFilter, setActiveQuickFilter] = useState('All')
  const [search, setSearch]           = useState('')
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const memberTier = (user?.publicMetadata?.tier as string) || 'Free'
  const { getToken } = useAuth()

  // Fetch resources from Supabase via authenticated endpoint
  useEffect(() => {
    if (!isSignedIn) return
    let cancelled = false
    getToken().then(token => {
      if (cancelled) return
      return fetch('/api/arsenal-resources', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
    }).then(r => r?.json()).then(data => {
      if (cancelled) return
      if (data?.error) throw new Error(data.error)
      const raw: any[] = data?.resources || []
      const normalised = raw.map(r => ({
        ...r,
        tier: normalizeTier(r.tier ?? 'free'),
      })) as Resource[]
      setResources(normalised)
    }).catch(err => { if (!cancelled) setError(err.message) })
    .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isSignedIn])

  // Handle download — calls /api/download to get a Supabase signed URL
  const handleDownload = useCallback(async (resource: Resource) => {
    setDownloading(resource.id)
    setDownloadError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/download?id=${resource.id}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        throw new Error(data.error || 'Could not generate download link')
      }
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err: any) {
      setDownloadError(err.message)
    } finally {
      setDownloading(null)
    }
  }, [getToken])

  if (!isLoaded) return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'var(--gold)',
      fontFamily: cinzel,
      letterSpacing: '0.1em',
      fontSize: '12px',
    }}>
      LOADING...
    </div>
  )

  if (!isSignedIn) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <TacticalCard brackets glow padding="48px" style={{ maxWidth: 420, width: '100%', textAlign: 'center' }}>
        <img src="/logo.png" alt="War Room Intel" style={{ width: '80px', marginBottom: '24px' }} />
        <div style={{ fontFamily: cinzel, color: 'var(--gold)', fontSize: '10px', letterSpacing: '0.15em', marginBottom: '12px' }}>
          WAR ROOM INTEL
        </div>
        <div style={{ fontFamily: cinzel, color: 'var(--t-0)', fontSize: '20px', marginBottom: '8px' }}>
          Resource Arsenal
        </div>
        <div style={{ color: 'var(--t-2)', fontSize: '13px', marginBottom: '32px', lineHeight: 1.6, fontFamily: crimson }}>
          Sign in to access your tier resources
        </div>
        <SignInButton mode="modal">
          <GoldButton full>SIGN IN ⚔</GoldButton>
        </SignInButton>
        <div style={{ marginTop: 12 }}>
          <SignUpButton mode="modal">
            <GoldButton full ghost>CREATE FREE ACCOUNT ⚔</GoldButton>
          </SignUpButton>
        </div>
      </TacticalCard>
    </div>
  )

  const QUICK_FILTER_MAP: Record<string, (r: Resource) => boolean> = {
    'All': () => true,
    'Deliverance': r => ['Session Tools', 'Protocol', 'Worksheet', 'Session', 'Renunciation', 'Occult'].includes(r.category ?? ''),
    'Prayer': r => ['Prayer', 'Renunciation'].includes(r.category ?? ''),
    'Reference': r => ['Reference', 'Foundational'].includes(r.category ?? ''),
    'Training': r => ['Teaching', 'Ministry'].includes(r.category ?? ''),
    'Watchman Only': r => r.tier === 'Free',
  }

  // Recently Added — first 5 (backend orders by created_at DESC)
  const showRecent = !search && activeCategory === 'All' && activeTab === 'All' && activeQuickFilter === 'All'
  const recentlyAdded = showRecent ? resources.slice(0, 5) : []
  const recentIds = new Set(recentlyAdded.map(r => r.id))

  // Filter resources
  const filtered = resources.filter(r => {
    if (showRecent && recentIds.has(r.id)) return false
    if (activeTab !== 'All' && r.tier !== activeTab) return false
    if (activeCategory !== 'All' && r.category !== activeCategory && (r as any).topic !== activeCategory) return false
    if (!(QUICK_FILTER_MAP[activeQuickFilter]?.(r) ?? true)) return false
    if (search) {
      const q = search.toLowerCase()
      return r.title.toLowerCase().includes(q)
        || (r.description ?? r.lockedPreview ?? '').toLowerCase().includes(q)
        || (r.category ?? '').toLowerCase().includes(q)
    }
    return true
  })

  const grouped = groupByTier(filtered)
  const tierCounts: Record<string, number> = {}
  resources.forEach(r => { tierCounts[r.tier] = (tierCounts[r.tier] || 0) + 1 })

  const userName      = user?.firstName || user?.username || ''
  const userTierLabel = memberTier === 'Free' ? 'WATCHMAN' : memberTier.toUpperCase()

  return (
    <CommunitySidebarShell activeItem="Arsenal" userName={userName} userTierLabel={userTierLabel}>
      <style>{resourcesMobileStyles}</style>
      <div style={{ color: 'var(--t-1)', fontFamily: crimson }}>

      {/* ── Hero ── */}
      <div className="res-hero" style={{ padding: '14px 32px', borderBottom: '1px solid var(--gold-line)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontFamily: cinzel, fontSize: 24, color: 'var(--gold)', letterSpacing: '2px' }}>
            ARSENAL
          </div>
          <HUDChip>{resources.length} Resources</HUDChip>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--t-3)', letterSpacing: '3px', textTransform: 'uppercase' as const }}>
          PDF · AUDIO · REFERENCE · TRAINING · MINISTRY TOOLS
        </div>
      </div>

      {/* ── Search ── */}
      <div className="res-search-bar" style={{ padding: '20px 32px 0' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'var(--bg-3)', border: '1px solid var(--gold-line)',
          padding: '10px 14px',
        }}>
          <Search size={14} color="var(--t-3)" strokeWidth={1.5} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search resources: soul ties, Freemasonry, session flow..."
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: 'var(--t-1)', fontSize: '13px', width: '100%',
              fontFamily: crimson,
            }}
          />
          {search && (
            <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', color: 'var(--t-3)', cursor: 'pointer', fontSize: '14px' }}>✕</button>
          )}
        </div>
      </div>

      {/* ── Category filter (collapsible) ── */}
      <div className="res-filters" style={{ padding: '12px 32px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' as const }}>
          <button
            onClick={() => setIsFilterOpen(o => !o)}
            style={{
              background: 'none', border: '1px solid var(--gold-line)',
              color: 'var(--t-3)', fontFamily: cinzel, fontSize: '9px',
              letterSpacing: '0.12em', textTransform: 'uppercase' as const,
              padding: '5px 14px', borderRadius: '20px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            {isFilterOpen ? '▲' : '▼'} Filter by Category ({CATEGORIES.length - 1} categories)
          </button>
          {!isFilterOpen && activeCategory !== 'All' && (
            <button
              onClick={() => setActiveCategory('All')}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <HUDChip active>{activeCategory} ✕</HUDChip>
            </button>
          )}
        </div>
        {isFilterOpen && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginTop: '10px' }}>
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
              >
                <HUDChip active={activeCategory === cat}>{cat}</HUDChip>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tier tabs ── */}
      <div className="res-tabs" style={{ display: 'flex', padding: '0 32px', borderBottom: '1px solid var(--gold-line)', marginTop: '16px' }}>
        {TIERS.map(t => {
          const count = t === 'All' ? resources.length : (tierCounts[t] || 0)
          const active = activeTab === t
          return (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              padding: '14px 20px',
              background: 'none', border: 'none', borderBottom: `2px solid ${active ? 'var(--gold)' : 'transparent'}`,
              color: active ? 'var(--gold)' : 'var(--t-3)',
              cursor: 'pointer', marginBottom: '-1px', transition: 'all 0.15s',
            }}>
              {t === 'Free' ? 'Watchman' : t}
              <span style={{
                marginLeft: '6px', fontSize: '9px',
                background: active ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                color: active ? 'var(--gold)' : 'var(--t-4)',
                padding: '1px 6px', borderRadius: '2px',
              }}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* ── Content ── */}
      <div className="res-grid" style={{ padding: '28px 32px', maxWidth: '1200px' }}>

        {/* Quick filter chips */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const, marginBottom: '20px' }}>
          {(['All', 'Deliverance', 'Prayer', 'Reference', 'Training', 'Watchman Only'] as const).map(qf => (
            <button
              key={qf}
              onClick={() => setActiveQuickFilter(qf)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
            >
              <HUDChip active={activeQuickFilter === qf}>{qf}</HUDChip>
            </button>
          ))}
        </div>

        {/* Download error */}
        {downloadError && (
          <div style={{
            background: 'var(--crit-bg)', border: '1px solid rgba(200,74,74,0.4)',
            padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--crit)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span>⚠ {downloadError}</span>
            <button onClick={() => setDownloadError(null)} style={{ background: 'none', border: 'none', color: 'var(--crit)', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t-3)', fontFamily: cinzel, fontSize: '11px', letterSpacing: '0.2em' }}>
            LOADING ARSENAL...
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--crit)', fontFamily: crimson }}>
            Failed to load resources: {error}
          </div>
        )}

        {/* Empty */}
        {!loading && !error && filtered.length === 0 && recentlyAdded.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px', color: 'var(--t-3)', fontFamily: crimson, fontStyle: 'italic' }}>
            No resources found. Try adjusting your search or filters.
          </div>
        )}

        {/* Recently Added */}
        {!loading && !error && recentlyAdded.length > 0 && (
          <div style={{ marginBottom: '36px' }}>
            <SectionLabel style={{ marginBottom: 16 }}>✦ Recently Added</SectionLabel>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
              {recentlyAdded.map(resource => (
                <FileCard
                  key={`recent-${resource.id}`}
                  resource={resource}
                  memberTier={memberTier}
                  onDownload={handleDownload}
                  downloading={downloading}
                />
              ))}
            </div>
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

        {/* Upgrade summary — next tier up, count of locked stubs, hidden when 0 */}
        {!loading && !error && (() => {
          const nextTierUp = NEXT_TIER[(memberTier ?? '').toLowerCase()] ?? ''
          if (!nextTierUp) return null
          const lockedCount = resources.filter(r => r.locked === true).length
          if (lockedCount === 0) return null
          const upgradeLabel = nextTierUp.charAt(0).toUpperCase() + nextTierUp.slice(1)
          return (
            <div style={{ marginTop: 8, padding: '16px', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, background: 'rgba(201,168,76,0.04)', textAlign: 'center' as const }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: 'rgba(201,168,76,0.6)', marginBottom: 6 }}>
                🔒 {lockedCount} MORE RESOURCE{lockedCount !== 1 ? 'S' : ''} AVAILABLE
              </div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: 'var(--t-3)', marginBottom: 12, lineHeight: 1.5 }}>
                Upgrade to {upgradeLabel} to unlock more of the Arsenal library.
              </div>
              <button
                onClick={() => callUpgrade(nextTierUp, getToken)}
                style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', padding: '8px 18px', background: 'rgba(201,168,76,0.15)', border: '1px solid #C9A84C', color: '#C9A84C', borderRadius: 4, cursor: 'pointer' }}
              >
                UPGRADE TO {upgradeLabel.toUpperCase()} →
              </button>
            </div>
          )
        })()}
      </div>

      {/* ── Footer note ── */}
      <div className="res-footer" style={{ borderTop: '1px solid var(--gold-line)', padding: '24px 32px', textAlign: 'center' as const }}>
        <p style={{ fontFamily: crimson, fontStyle: 'italic', fontSize: '13px', color: 'var(--t-3)' }}>
          Download links expire after 4 hours for security. Refresh the page to generate a new link.
        </p>
        <a href={COMMUNITY_URL} target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.12em', color: 'var(--gold)', textDecoration: 'none', marginTop: '8px', display: 'inline-block' }}>
          ⚔ Manage Membership →
        </a>
      </div>
      </div>
    </CommunitySidebarShell>
  )
}
