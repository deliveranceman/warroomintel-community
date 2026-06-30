import { createFileRoute, useSearch, useRouterState, Outlet, Link } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useEffect, useCallback, useRef } from 'react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { useIsDark } from '@/lib/use-is-dark'
import { getAccessLevel } from '@/lib/access'
import { Search, AlertTriangle, Shield } from 'lucide-react'

export const Route = createFileRoute('/community_/babel-files')({
  ssr: false,
  component: BabelFilesPage,
})

// ── Sub-brand labels ───────────────────────────────────────────────────────
const BRAND: Record<string, { label: string; icon: string; live: boolean }> = {
  person:         { label: 'Babel Figures',    icon: '🧑', live: true },
  movie:          { label: 'Babel Cinema',     icon: '🎬', live: true },
  symbol:         { label: 'Babel Symbols',    icon: '👁', live: true },
  practice:       { label: 'Babel Symbols',    icon: '👁', live: true },
  tv_show:        { label: 'Babel Broadcast',  icon: '📺', live: false },
  anime:          { label: 'Babel Broadcast',  icon: '📺', live: false },
  music:          { label: 'Babel Beats',      icon: '🎵', live: false },
  game:           { label: 'Babel Games',      icon: '🎮', live: false },
  book:           { label: 'Babel Codex',      icon: '📖', live: false },
  religion:       { label: 'Babel Beliefs',    icon: '✝',  live: false },
  mythology:      { label: 'Babel Mythos',     icon: '⚡', live: false },
  secret_society: { label: 'Babel Societies',  icon: '🏛', live: false },
  organization:   { label: 'Babel Societies',  icon: '🏛', live: false },
  event:          { label: 'Babel Current',    icon: '📅', live: false },
}

const CAUTION_COLOR = ['', '#22c55e', '#84cc16', '#f59e0b', '#ef4444', '#dc2626']

const CLASS_LABEL: Record<string, { label: string; color: string }> = {
  unclassified:       { label: 'UNCLASSIFIED',  color: '#9ca3af' },
  unverified:         { label: 'UNVERIFIED',    color: '#f59e0b' },
  confirmed:          { label: 'CONFIRMED',     color: '#22c55e' },
  intelligence_only:  { label: 'INTEL ONLY',    color: '#a855f7' },
  redacted:           { label: 'REDACTED',      color: '#ef4444' },
  disputed:           { label: 'DISPUTED',      color: '#f97316' },
}

const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const G       = 'var(--gold)'

function CautionMeter({ level }: { level: number }) {
  const filled = Math.min(5, Math.max(0, level || 0))
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{
          width: 6, height: 10, borderRadius: 1,
          background: i <= filled ? (CAUTION_COLOR[filled] || G) : 'rgba(201,168,76,0.15)',
        }} />
      ))}
    </div>
  )
}

interface Artifact {
  id: string; slug: string; name: string; artifactType: string; status: string
  classification: string; intelligenceOnly: boolean; cautionLevel: number
  subjectImageUrl: string; summary: string; firstAppearance: string; origin: string
  compiledBy: string; createdAt: string; cautionNote: string
}

function ArtifactCard({ a, isDark }: { a: Artifact; isDark: boolean }) {
  const cls = CLASS_LABEL[a.classification] || CLASS_LABEL['unclassified']
  const brd = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(0,0,0,0.1)'
  const surf = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
  const txt = isDark ? '#e8dcc8' : '#2D2924'
  const mut = isDark ? 'rgba(232,224,208,0.5)' : 'rgba(45,41,36,0.5)'

  return (
    <Link
      to="/community/babel-files/$slug"
      params={{ slug: a.slug }}
      style={{
        display: 'flex', flexDirection: 'column',
        background: surf, border: `1px solid ${brd}`,
        borderRadius: 8, overflow: 'hidden',
        textDecoration: 'none', color: 'inherit',
        transition: 'border-color 0.15s, background 0.15s',
        cursor: 'pointer',
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = 'rgba(201,168,76,0.45)'
        el.style.background = isDark ? 'rgba(201,168,76,0.04)' : 'rgba(201,168,76,0.06)'
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
        const el = e.currentTarget as HTMLElement
        el.style.borderColor = brd
        el.style.background = surf
      }}
    >
      {/* Image strip */}
      <div style={{ height: 120, background: isDark ? '#141018' : '#f0ebe4', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
        {a.subjectImageUrl ? (
          <img src={a.subjectImageUrl} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, opacity: 0.3 }}>
            {BRAND[a.artifactType]?.icon || '🗂'}
          </div>
        )}
        {/* Classification stamp */}
        <div style={{
          position: 'absolute', top: 6, right: 6,
          background: 'rgba(0,0,0,0.75)', borderRadius: 3,
          padding: '2px 6px', fontFamily: 'var(--font-label)',
          fontSize: 8, letterSpacing: '0.12em', color: cls.color,
        }}>
          {cls.label}
        </div>
      </div>

      {/* Card body */}
      <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontFamily: cinzel, fontSize: 13, color: txt, fontWeight: 600, lineHeight: 1.3, flex: 1 }}>
            {a.name}
          </span>
          {a.cautionLevel >= 3 && <CautionMeter level={a.cautionLevel} />}
        </div>
        {a.artifactType && (
          <span style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.14em', color: G }}>
            {a.artifactType.replace(/_/g, ' ').toUpperCase()}
            {a.origin ? ` · ${a.origin}` : ''}
          </span>
        )}
        {a.summary && (
          <p style={{
            fontFamily: crimson, fontSize: 13, color: mut, margin: 0, lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {a.summary}
          </p>
        )}
      </div>
    </Link>
  )
}

function ArtifactCardMobile({ a, isDark }: { a: Artifact; isDark: boolean }) {
  const cls = CLASS_LABEL[a.classification] || CLASS_LABEL['unclassified']
  const brd = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(0,0,0,0.1)'
  const txt = isDark ? '#e8dcc8' : '#2D2924'
  const mut = isDark ? 'rgba(232,224,208,0.5)' : 'rgba(45,41,36,0.5)'

  return (
    <Link
      to="/community/babel-files/$slug"
      params={{ slug: a.slug }}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', background: 'transparent',
        borderBottom: `1px solid ${brd}`, textDecoration: 'none', color: 'inherit',
      }}
    >
      {/* Thumbnail */}
      <div style={{ width: 52, height: 52, borderRadius: 6, overflow: 'hidden', flexShrink: 0, background: isDark ? '#141018' : '#f0ebe4' }}>
        {a.subjectImageUrl
          ? <img src={a.subjectImageUrl} alt={a.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, opacity: 0.4 }}>{BRAND[a.artifactType]?.icon || '🗂'}</div>
        }
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontFamily: cinzel, fontSize: 13, color: txt, fontWeight: 600 }}>{a.name}</span>
          <span style={{ fontSize: 8, fontFamily: 'var(--font-label)', letterSpacing: '0.1em', color: cls.color, flexShrink: 0 }}>{cls.label}</span>
        </div>
        {a.artifactType && (
          <div style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.12em', color: G, marginBottom: 3 }}>
            {a.artifactType.replace(/_/g, ' ').toUpperCase()}
          </div>
        )}
        {a.summary && (
          <p style={{ fontFamily: crimson, fontSize: 13, color: mut, margin: 0, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {a.summary}
          </p>
        )}
      </div>
      {a.cautionLevel >= 3 && <CautionMeter level={a.cautionLevel} />}
    </Link>
  )
}

function BabelFilesPage() {
  const { getToken } = useAuth()
  const { user }     = useUser()
  const isDark       = useIsDark()
  const search       = useSearch({ from: '/community_/babel-files' })
  const typeFilter   = (search as any).type || ''

  // ── All hooks before any conditional return ────────────────────────────
  const [artifacts, setArtifacts]   = useState<Artifact[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [query, setQuery]           = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [isMobile, setIsMobile]     = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const tier     = ((user?.publicMetadata?.tier as string) || 'watchman').toLowerCase()
  const role     = ((user?.publicMetadata?.role as string) || '').toLowerCase()
  const level    = getAccessLevel({ tier, role })

  const brand = BRAND[typeFilter]
  const pageTitle = brand ? brand.label : 'Babel Files'
  const pageIcon  = brand ? brand.icon : '🗂'

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => setDebouncedQ(query), 350)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query])

  // Responsive breakpoint
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const fetchArtifacts = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const token = await getToken()
      const params = new URLSearchParams()
      if (typeFilter) params.set('type', typeFilter)
      if (debouncedQ) params.set('search', debouncedQ)
      const res = await fetch(`/api/babel?${params}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      setArtifacts(json.artifacts ?? [])
      setTotal(json.total ?? 0)
    } catch (e: any) {
      setFetchError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [getToken, typeFilter, debouncedQ])

  useEffect(() => { void fetchArtifacts() }, [fetchArtifacts])

  // Detect when the $slug child route is active — defer rendering to its component.
  const hasChildRoute = useRouterState({
    select: (s) => s.matches.some(m => m.routeId === '/community_/babel-files/$slug'),
  })

  // ── Theme tokens ───────────────────────────────────────────────────────
  const bg   = isDark ? '#0D0B14' : '#FAF8F5'
  const txt  = isDark ? '#e8dcc8' : '#2D2924'
  const mut  = isDark ? 'rgba(232,224,208,0.45)' : 'rgba(45,41,36,0.45)'
  const bdr  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const surf = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'

  // ── Empty state ────────────────────────────────────────────────────────
  const EmptyState = () => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: '80px 24px', textAlign: 'center' }}>
      <div style={{ fontSize: 48, lineHeight: 1 }}>{pageIcon}</div>
      <div style={{ fontFamily: cinzel, fontSize: 16, color: txt, letterSpacing: '0.08em' }}>
        {pageTitle} · No dossiers filed yet
      </div>
      <p style={{ fontFamily: crimson, fontSize: 15, color: mut, maxWidth: 380, margin: 0, lineHeight: 1.6 }}>
        {typeFilter
          ? `No published artifacts for this category. Check back as the database grows.`
          : `The Babel Files database is being populated. Intelligence entries will appear here once published.`}
      </p>
      {level === 0 && (
        <a href="/membership" style={{ display: 'inline-block', marginTop: 8, padding: '8px 20px', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 6, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', color: G, textDecoration: 'none' }}>
          UPGRADE FOR FULL DOSSIERS
        </a>
      )}
    </div>
  )

  if (hasChildRoute) return <Outlet />

  return (
    <CommunitySidebarShell activeItem="Babel Files" fillViewport>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: bg, minHeight: 0, overflow: 'hidden' }}>

        {/* ── Classification bar ── */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          background: isDark ? 'rgba(13,11,20,0.95)' : 'rgba(250,248,245,0.95)',
          backdropFilter: 'blur(8px)',
          borderBottom: `1px solid ${bdr}`,
          padding: `calc(env(safe-area-inset-top, 0px) + 8px) 20px 8px`,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>{pageIcon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: cinzel, fontSize: 16, color: txt, letterSpacing: '0.06em', fontWeight: 600 }}>{pageTitle}</div>
            <div style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.18em', color: G }}>
              CIA-STYLE CULTURAL INTELLIGENCE · WAR ROOM INTEL
            </div>
          </div>
          {/* Search */}
          <div style={{ position: 'relative', width: isMobile ? 140 : 220 }}>
            <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: mut, pointerEvents: 'none' }} />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search dossiers…"
              style={{
                width: '100%', boxSizing: 'border-box' as const,
                background: surf, border: `1px solid ${bdr}`,
                borderRadius: 5, padding: '6px 8px 6px 28px',
                fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em',
                color: txt, outline: 'none',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = G }}
              onBlur={e => { (e.target as HTMLInputElement).style.borderColor = bdr }}
            />
          </div>
          {!loading && total > 0 && (
            <span style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.1em', color: mut, flexShrink: 0 }}>
              {total} {total === 1 ? 'FILE' : 'FILES'}
            </span>
          )}
        </div>

        {/* ── Type filter chips ── */}
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${bdr}`, display: 'flex', gap: 6, overflowX: 'auto', flexShrink: 0 }}>
          {[
            { type: '', label: 'All Files', icon: '🗂' },
            { type: 'person', label: 'Figures', icon: '🧑' },
            { type: 'movie', label: 'Cinema', icon: '🎬' },
            { type: 'symbol', label: 'Symbols', icon: '👁' },
            { type: 'secret_society', label: 'Societies', icon: '🏛' },
            { type: 'tv_show', label: 'Broadcast', icon: '📺' },
            { type: 'music', label: 'Beats', icon: '🎵' },
            { type: 'book', label: 'Codex', icon: '📖' },
            { type: 'religion', label: 'Beliefs', icon: '✝' },
            { type: 'mythology', label: 'Mythos', icon: '⚡' },
            { type: 'event', label: 'Current', icon: '📅' },
          ].map(({ type, label, icon }) => {
            const active = typeFilter === type
            return (
              <a
                key={type || 'all'}
                href={type ? `/community/babel-files?type=${type}` : '/community/babel-files'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '4px 10px', borderRadius: 20, flexShrink: 0,
                  background: active ? 'rgba(201,168,76,0.15)' : surf,
                  border: `1px solid ${active ? 'rgba(201,168,76,0.5)' : bdr}`,
                  fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em',
                  color: active ? G : mut, textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
                onMouseEnter={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.borderColor = 'rgba(201,168,76,0.3)'; el.style.color = G } }}
                onMouseLeave={e => { if (!active) { const el = e.currentTarget as HTMLElement; el.style.borderColor = bdr; el.style.color = mut } }}
              >
                <span>{icon}</span>
                {label}
              </a>
            )
          })}
        </div>

        {/* ── Tier 0 note ── */}
        {level === 0 && (
          <div style={{ padding: '8px 20px', background: 'rgba(201,168,76,0.05)', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Shield size={12} style={{ color: G, flexShrink: 0 }} />
            <span style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', color: mut }}>
              Viewing summaries only · <a href="/membership" style={{ color: G, textDecoration: 'none' }}>Upgrade to Soldier</a> to unlock full body text, media, and relationships
            </span>
          </div>
        )}

        {/* ── Main content area ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 0 : '20px 20px' }}>
          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: mut }}>LOADING INTELLIGENCE…</div>
            </div>
          )}
          {fetchError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px', color: '#ef4444' }}>
              <AlertTriangle size={14} />
              <span style={{ fontFamily: cinzel, fontSize: 11 }}>Failed to load: {fetchError}</span>
            </div>
          )}
          {!loading && !fetchError && artifacts.length === 0 && <EmptyState />}
          {!loading && !fetchError && artifacts.length > 0 && (
            isMobile ? (
              <div>
                {artifacts.map(a => <ArtifactCardMobile key={a.id} a={a} isDark={isDark} />)}
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 16,
              }}>
                {artifacts.map(a => <ArtifactCard key={a.id} a={a} isDark={isDark} />)}
              </div>
            )
          )}
        </div>
      </div>
    </CommunitySidebarShell>
  )
}
