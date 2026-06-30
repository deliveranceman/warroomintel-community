import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@clerk/tanstack-start'
import { useState, useEffect, useRef, useCallback } from 'react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { useIsDark } from '@/lib/use-is-dark'
import { ChevronDown, Shield, AlertTriangle, ExternalLink, Share2 } from 'lucide-react'

export const Route = createFileRoute('/community_/babel-files/$slug')({
  ssr: false,
  component: BabelDossierPage,
})

const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const G       = 'var(--gold)'

// ── Classification styling ─────────────────────────────────────────────────
const CLASS_META: Record<string, { label: string; color: string; bg: string }> = {
  unclassified:      { label: 'UNCLASSIFIED',  color: '#9ca3af', bg: 'rgba(156,163,175,0.1)' },
  unverified:        { label: 'UNVERIFIED',    color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  confirmed:         { label: 'CONFIRMED',     color: '#22c55e', bg: 'rgba(34,197,94,0.1)'   },
  intelligence_only: { label: 'INTEL ONLY',    color: '#a855f7', bg: 'rgba(168,85,247,0.1)'  },
  redacted:          { label: 'REDACTED',      color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  disputed:          { label: 'DISPUTED',      color: '#f97316', bg: 'rgba(249,115,22,0.1)'  },
}

const CAUTION_COLOR = ['', '#22c55e', '#84cc16', '#f59e0b', '#ef4444', '#dc2626']

const BRAND_ICON: Record<string, string> = {
  person: '🧑', movie: '🎬', tv_show: '📺', anime: '📺',
  symbol: '👁', practice: '👁', music: '🎵', game: '🎮',
  book: '📖', religion: '✝', mythology: '⚡',
  secret_society: '🏛', organization: '🏛', event: '📅',
}

function CautionMeter({ level, color }: { level: number; color: string }) {
  const filled = Math.min(5, Math.max(0, level || 0))
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1,2,3,4,5].map(i => (
        <div key={i} style={{ width: 8, height: 14, borderRadius: 2, background: i <= filled ? color : 'rgba(201,168,76,0.12)' }} />
      ))}
    </div>
  )
}

function CollapsibleSection({ title, id, children, isDark, defaultOpen = true }: {
  title: string; id: string; children: React.ReactNode; isDark: boolean; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const bdr = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(0,0,0,0.1)'

  return (
    <div id={id} style={{ borderBottom: `1px solid ${bdr}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          width: '100%', padding: '14px 20px', background: 'transparent', border: 'none',
          cursor: 'pointer', textAlign: 'left' as const,
        }}
      >
        <span style={{ fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.18em', color: G }}>
          {title}
        </span>
        <ChevronDown size={14} style={{ color: G, transition: 'transform 0.2s', transform: open ? 'none' : 'rotate(-90deg)' }} />
      </button>
      {open && <div style={{ paddingBottom: 16 }}>{children}</div>}
    </div>
  )
}

function UpgradeSection({ section, isDark }: { section: string; isDark: boolean }) {
  const surf = isDark ? 'rgba(201,168,76,0.05)' : 'rgba(201,168,76,0.04)'
  return (
    <div style={{
      margin: '0 20px 16px', padding: '16px 20px',
      background: surf, border: '1px solid rgba(201,168,76,0.2)',
      borderRadius: 6, display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <Shield size={14} style={{ color: G, flexShrink: 0 }} />
      <div>
        <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.08em', marginBottom: 4 }}>
          {section} · SOLDIER TIER REQUIRED
        </div>
        <a href="/membership" style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: G, textDecoration: 'underline', opacity: 0.7 }}>
          Upgrade to unlock full intelligence
        </a>
      </div>
    </div>
  )
}

function MediaItem({ item, isDark }: { item: any; isDark: boolean }) {
  const [revealed, setRevealed] = useState(false)
  const txt = isDark ? '#e8dcc8' : '#2D2924'
  const mut = isDark ? 'rgba(232,224,208,0.5)' : 'rgba(45,41,36,0.5)'
  const bdr = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(0,0,0,0.1)'

  if (item.intelligence_only && !revealed) {
    return (
      <div style={{ padding: '12px 20px' }}>
        <div style={{ border: `1px solid rgba(168,85,247,0.3)`, borderRadius: 6, padding: '14px 16px', background: 'rgba(168,85,247,0.05)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={12} style={{ color: '#a855f7', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: cinzel, fontSize: 10, color: '#a855f7', letterSpacing: '0.08em', marginBottom: 4 }}>
              {item.title || 'INTELLIGENCE-ONLY MEDIA'}
            </div>
            <div style={{ fontFamily: crimson, fontSize: 12, color: mut }}>This item is flagged for intelligence use only.</div>
          </div>
          <button onClick={() => setRevealed(true)} style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.4)', borderRadius: 4, padding: '4px 10px', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: '#a855f7', cursor: 'pointer', flexShrink: 0 }}>
            REVEAL
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '0 20px 16px' }}>
      {item.title && (
        <div style={{ fontFamily: cinzel, fontSize: 11, color: txt, letterSpacing: '0.06em', marginBottom: 8 }}>{item.title}</div>
      )}
      {item.media_type === 'youtube' && item.embed_id && (
        <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000', borderRadius: 6, overflow: 'hidden' }}>
          <iframe
            src={`https://www.youtube.com/embed/${item.embed_id}`}
            title={item.title || 'Video'}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
            allowFullScreen
          />
        </div>
      )}
      {(item.media_type === 'image') && item.url && (
        <img src={item.url} alt={item.title || ''} style={{ width: '100%', borderRadius: 6, display: 'block' }} />
      )}
      {(item.media_type === 'external_link') && item.url && (
        <a href={item.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.06em', textDecoration: 'none', border: `1px solid ${bdr}`, borderRadius: 4, padding: '6px 12px' }}>
          <ExternalLink size={11} />
          {item.url}
        </a>
      )}
    </div>
  )
}

function ScriptureCard({ s, isDark }: { s: any; isDark: boolean }) {
  const txt = isDark ? '#e8dcc8' : '#2D2924'
  const surf = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)'
  return (
    <div style={{ margin: '0 20px 10px', padding: '12px 14px', background: surf, borderLeft: '2px solid rgba(201,168,76,0.3)', borderRadius: '0 6px 6px 0' }}>
      {s.reference && <div style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.14em', color: G, marginBottom: 6 }}>{s.reference}</div>}
      {s.application && <p style={{ fontFamily: crimson, fontSize: 14, color: txt, margin: 0, lineHeight: 1.7, fontStyle: 'italic' }}>{s.application}</p>}
    </div>
  )
}

function BabelDossierPage() {
  const { slug }     = Route.useParams()
  const { getToken } = useAuth()
  const isDark       = useIsDark()

  // ── All hooks before any conditional return ────────────────────────────
  const [artifact, setArtifact]         = useState<any>(null)
  const [spirits, setSpirits]           = useState<any[]>([])
  const [scriptures, setScriptures]     = useState<any[]>([])
  const [media, setMedia]               = useState<any[]>([])
  const [relationships, setRelationships] = useState<any[]>([])
  const [lockedSections, setLockedSections] = useState<string[]>([])
  const [loading, setLoading]           = useState(true)
  const [fetchError, setFetchError]     = useState<string | null>(null)
  const [isMobile, setIsMobile]         = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )
  const [shareToast, setShareToast]     = useState(false)
  const [shareOpen, setShareOpen]       = useState(false)
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tier gating enforced server-side; lockedSections returned from API

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Inject og:image / og:title / og:description into document head (CSR-only route)
  useEffect(() => {
    if (!artifact) return
    const set = (prop: string, val: string) => {
      let el = document.querySelector(`meta[property="${prop}"]`) as HTMLMetaElement | null
      if (!el) { el = document.createElement('meta'); el.setAttribute('property', prop); document.head.appendChild(el) }
      el.setAttribute('content', val)
    }
    if (artifact.ogImageUrl)  set('og:image',       artifact.ogImageUrl)
    if (artifact.name)        set('og:title',        `${artifact.name} · Babel Files`)
    if (artifact.summary)     set('og:description',  artifact.summary.slice(0, 200))
    set('og:url', window.location.href)
  }, [artifact])

  const fetchDossier = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/babel?slug=${encodeURIComponent(slug)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (res.status === 404) {
        setFetchError('404')
        return
      }
      if (!res.ok) throw new Error(`${res.status}`)
      const json = await res.json()
      setArtifact(json.artifact ?? null)
      setSpirits(json.spirits ?? [])
      setScriptures(json.scriptures ?? [])
      setMedia(json.media ?? [])
      setRelationships(json.relationships ?? [])
      setLockedSections(json.lockedSections ?? [])
    } catch (e: any) {
      setFetchError(e.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [getToken, slug])

  useEffect(() => { void fetchDossier() }, [fetchDossier])

  const handleShare = useCallback(() => { setShareOpen(true) }, [])

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href).catch(() => {})
    setShareOpen(false)
    setShareToast(true)
    if (shareTimerRef.current) clearTimeout(shareTimerRef.current)
    shareTimerRef.current = setTimeout(() => setShareToast(false), 2000)
  }, [])

  const handleShareNative = useCallback((title: string) => {
    if (navigator.share) {
      navigator.share({ title, url: window.location.href }).catch(() => {})
    } else {
      navigator.clipboard.writeText(window.location.href).catch(() => {})
    }
    setShareOpen(false)
  }, [])

  // ── Theme tokens ───────────────────────────────────────────────────────
  const bg   = isDark ? '#0D0B14' : '#FAF8F5'
  const txt  = isDark ? '#e8dcc8' : '#2D2924'
  const mut  = isDark ? 'rgba(232,224,208,0.45)' : 'rgba(45,41,36,0.45)'
  const bdr  = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const surf = isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'

  // ── Loading / error states ─────────────────────────────────────────────
  if (loading) {
    return (
      <CommunitySidebarShell activeItem="Babel Files" fillViewport>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: bg }}>
          <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: mut }}>RETRIEVING DOSSIER…</span>
        </div>
      </CommunitySidebarShell>
    )
  }

  if (fetchError === '404' || (!loading && !artifact)) {
    return (
      <CommunitySidebarShell activeItem="Babel Files" fillViewport>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, background: bg, padding: 40 }}>
          <div style={{ fontSize: 40 }}>🗂</div>
          <div style={{ fontFamily: cinzel, fontSize: 16, color: txt, letterSpacing: '0.06em' }}>Dossier Not Found</div>
          <p style={{ fontFamily: crimson, fontSize: 14, color: mut, textAlign: 'center' as const, maxWidth: 360, margin: 0 }}>
            This file has not been added to the Babel Files database or is not yet published.
          </p>
          <a href="/community/babel-files" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: G, textDecoration: 'none', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, padding: '7px 16px' }}>
            ← RETURN TO BABEL FILES
          </a>
        </div>
      </CommunitySidebarShell>
    )
  }

  if (fetchError) {
    return (
      <CommunitySidebarShell activeItem="Babel Files" fillViewport>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: bg, padding: 40, color: '#ef4444' }}>
          <AlertTriangle size={14} />
          <span style={{ fontFamily: cinzel, fontSize: 11 }}>Error loading dossier: {fetchError}</span>
        </div>
      </CommunitySidebarShell>
    )
  }

  const cls = CLASS_META[artifact.classification] || CLASS_META['unclassified']
  const cautionColor = CAUTION_COLOR[artifact.cautionLevel] || G
  const icon = BRAND_ICON[artifact.artifactType] || '🗂'
  const bodyLocked = lockedSections.includes('body')
  const mediaLocked = lockedSections.includes('media')
  const relsLocked = lockedSections.includes('relationships')

  // ── DESKTOP CIA DOSSIER LAYOUT ─────────────────────────────────────────
  const DesktopLayout = () => (
    <div style={{ flex: 1, overflow: 'auto', background: bg }}>
      {/* Sticky classification header bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: cls.bg,
        borderBottom: `1px solid ${cls.color}40`,
        padding: `calc(env(safe-area-inset-top, 0px) + 6px) 24px 6px`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{ fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.22em', color: cls.color, fontWeight: 700 }}>
          {cls.label}
        </div>
        <div style={{ flex: 1, height: 1, background: `${cls.color}30` }} />
        <div style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.14em', color: cls.color, opacity: 0.7 }}>
          WAR ROOM INTELLIGENCE · BABEL FILES
        </div>
        <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cls.color, opacity: 0.7, display: 'flex', alignItems: 'center', gap: 4, fontFamily: cinzel, fontSize: 9 }}>
          <Share2 size={11} />
          SHARE
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* Hero row: image + identity */}
        <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
          {/* Subject image */}
          <div style={{ width: 240, flexShrink: 0 }}>
            <div style={{ width: 240, height: 300, background: isDark ? '#141018' : '#e8e3dc', borderRadius: 8, overflow: 'hidden', border: `1px solid ${bdr}`, position: 'relative' }}>
              {artifact.subjectImageUrl
                ? <img src={artifact.subjectImageUrl} alt={artifact.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
                : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, opacity: 0.3 }}>{icon}</div>
              }
              {/* Classification stamp — only for classified docs */}
              {['confirmed','intelligence_only','redacted'].includes(artifact.classification) && (
                <div style={{
                  position: 'absolute', bottom: 10, right: -8,
                  transform: 'rotate(6deg)',
                  border: `2px solid ${cls.color}`,
                  borderRadius: 3,
                  padding: '3px 8px',
                  fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.18em',
                  color: cls.color,
                  background: isDark ? 'rgba(13,11,20,0.85)' : 'rgba(250,248,245,0.85)',
                  backdropFilter: 'blur(4px)',
                }}>
                  {cls.label}
                </div>
              )}
            </div>
            {/* Caution level meter */}
            {artifact.cautionLevel > 0 && (
              <div style={{ marginTop: 16, padding: '10px 14px', background: surf, border: `1px solid ${bdr}`, borderRadius: 6 }}>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.14em', color: mut, marginBottom: 8 }}>THREAT ASSESSMENT</div>
                <CautionMeter level={artifact.cautionLevel} color={cautionColor} />
                {artifact.cautionNote && (
                  <p style={{ fontFamily: crimson, fontSize: 11, color: mut, margin: '8px 0 0', lineHeight: 1.5, fontStyle: 'italic' }}>
                    {artifact.cautionNote}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Identity block */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.2em', color: G, marginBottom: 8 }}>
              {icon} {artifact.artifactType?.replace(/_/g, ' ').toUpperCase() || 'ARTIFACT'}
            </div>
            <h1 style={{ fontFamily: cinzel, fontSize: 32, color: txt, margin: '0 0 12px', letterSpacing: '0.04em', lineHeight: 1.2, fontWeight: 600 }}>
              {artifact.name}
            </h1>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 16 }}>
              {artifact.status && (
                <span style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: 3, background: 'rgba(201,168,76,0.1)', color: G, border: '1px solid rgba(201,168,76,0.25)' }}>
                  {artifact.status.toUpperCase()}
                </span>
              )}
              {artifact.origin && (
                <span style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: 3, background: surf, color: mut, border: `1px solid ${bdr}` }}>
                  {artifact.origin}
                </span>
              )}
              {artifact.firstAppearance && (
                <span style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.12em', padding: '3px 8px', borderRadius: 3, background: surf, color: mut, border: `1px solid ${bdr}` }}>
                  {artifact.firstAppearance}
                </span>
              )}
            </div>
            <div style={{ height: 1, background: `rgba(201,168,76,0.2)`, marginBottom: 16 }} />
            {artifact.summary && (
              <p style={{ fontFamily: crimson, fontSize: 16, color: txt, margin: '0 0 16px', lineHeight: 1.75 }}>
                {artifact.summary}
              </p>
            )}
            {artifact.aliases && (
              <div style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.1em', color: mut, marginBottom: 8 }}>
                ALSO KNOWN AS · {artifact.aliases}
              </div>
            )}
            <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
              {artifact.compiledBy && (
                <div>
                  <div style={{ fontFamily: 'var(--font-label)', fontSize: 7, letterSpacing: '0.14em', color: mut, marginBottom: 3 }}>COMPILED BY</div>
                  <div style={{ fontFamily: cinzel, fontSize: 10, color: txt }}>{artifact.compiledBy}</div>
                </div>
              )}
              {artifact.createdAt && (
                <div>
                  <div style={{ fontFamily: 'var(--font-label)', fontSize: 7, letterSpacing: '0.14em', color: mut, marginBottom: 3 }}>FILED</div>
                  <div style={{ fontFamily: cinzel, fontSize: 10, color: txt }}>{new Date(artifact.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Two-column section grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          {/* Left: body + scriptures + spirits */}
          <div>
            {/* Body text */}
            <div id="history" style={{ marginBottom: 24, padding: '20px 24px', background: surf, border: `1px solid ${bdr}`, borderRadius: 8 }}>
              <div style={{ fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.18em', color: G, marginBottom: 12 }}>INTELLIGENCE BODY</div>
              {bodyLocked ? (
                <UpgradeSection section="BODY TEXT" isDark={isDark} />
              ) : artifact.body ? (
                <div style={{ fontFamily: crimson, fontSize: 15, color: txt, lineHeight: 1.85, whiteSpace: 'pre-wrap' as const }}>
                  {artifact.body}
                </div>
              ) : (
                <p style={{ fontFamily: crimson, fontSize: 14, color: mut, margin: 0, fontStyle: 'italic' }}>No body text filed.</p>
              )}
            </div>

            {/* Scriptures */}
            {scriptures.length > 0 && (
              <div id="scriptures" style={{ marginBottom: 24, padding: '20px 24px', background: surf, border: `1px solid ${bdr}`, borderRadius: 8 }}>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.18em', color: G, marginBottom: 12 }}>SCRIPTURE REFERENCES</div>
                {scriptures.map((s: any) => <ScriptureCard key={s.id} s={s} isDark={isDark} />)}
              </div>
            )}

            {/* Relationships */}
            {(relationships.length > 0 || relsLocked) && (
              <div id="affiliations" style={{ marginBottom: 24, padding: '20px 24px', background: surf, border: `1px solid ${bdr}`, borderRadius: 8 }}>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.18em', color: G, marginBottom: 12 }}>AFFILIATIONS</div>
                {relsLocked ? (
                  <UpgradeSection section="RELATIONSHIPS" isDark={isDark} />
                ) : (
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                    {relationships.map((r: any) => (
                      <div key={r.id} style={{ padding: '4px 10px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 4, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', color: mut }}>
                        {r.relationship_type?.replace(/_/g, ' ')}
                        {r.confidence ? ` · ${r.confidence}/5` : ''}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: media + spirits */}
          <div>
            {/* Media */}
            {(media.length > 0 || mediaLocked) && (
              <div id="media" style={{ marginBottom: 24, padding: '20px 24px', background: surf, border: `1px solid ${bdr}`, borderRadius: 8 }}>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.18em', color: G, marginBottom: 12 }}>ASSOCIATED MEDIA</div>
                {mediaLocked ? (
                  <UpgradeSection section="MEDIA" isDark={isDark} />
                ) : (
                  media.map((item: any) => <MediaItem key={item.id} item={item} isDark={isDark} />)
                )}
              </div>
            )}

            {/* Spirit links */}
            {spirits.length > 0 && (
              <div id="spirits" style={{ marginBottom: 24, padding: '20px 24px', background: surf, border: `1px solid ${bdr}`, borderRadius: 8 }}>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.18em', color: G, marginBottom: 12 }}>ASSOCIATED SPIRITS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                  {spirits.map((s: any) => (
                    <span key={s.id} style={{ padding: '3px 8px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 3, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', color: mut }}>
                      {s.spirit_id}
                      {s.confidence ? ` · ${s.confidence}/5` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back link */}
        <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${bdr}` }}>
          <a href="/community/babel-files" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: mut, textDecoration: 'none' }}>
            ← RETURN TO BABEL FILES
          </a>
        </div>
      </div>
    </div>
  )

  // ── MOBILE COLLAPSIBLE LAYOUT ──────────────────────────────────────────
  const MobileLayout = () => (
    <div style={{ flex: 1, overflow: 'auto', background: bg, paddingBottom: 'calc(80px + env(safe-area-inset-bottom, 0px))' }}>
      {/* Sticky classification bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: cls.bg,
        borderBottom: `1px solid ${cls.color}40`,
        padding: `calc(env(safe-area-inset-top, 0px) + 6px) 16px 6px`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.2em', color: cls.color, flex: 1 }}>
          {cls.label}
        </div>
        <button onClick={handleShare} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cls.color, opacity: 0.7 }}>
          <Share2 size={14} />
        </button>
        {shareToast && <span style={{ fontFamily: cinzel, fontSize: 8, color: cls.color, letterSpacing: '0.1em' }}>LINK COPIED</span>}
      </div>

      {/* Hero */}
      <div style={{ position: 'relative', height: 200, background: isDark ? '#141018' : '#e8e3dc', overflow: 'hidden' }}>
        {artifact.subjectImageUrl
          ? <img src={artifact.subjectImageUrl} alt={artifact.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, opacity: 0.3 }}>{icon}</div>
        }
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(13,11,20,0.8) 0%, transparent 60%)' }} />
        {['confirmed','intelligence_only','redacted'].includes(artifact.classification) && (
          <div style={{
            position: 'absolute', bottom: 12, right: 0,
            transform: 'rotate(6deg)',
            border: `1.5px solid ${cls.color}`,
            padding: '2px 6px', borderRadius: 2,
            fontFamily: 'var(--font-label)', fontSize: 7, letterSpacing: '0.18em',
            color: cls.color,
            background: 'rgba(13,11,20,0.8)',
          }}>
            {cls.label}
          </div>
        )}
      </div>

      {/* Identity */}
      <div style={{ padding: '16px' }}>
        <div style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.16em', color: G, marginBottom: 6 }}>
          {icon} {artifact.artifactType?.replace(/_/g, ' ').toUpperCase()}
        </div>
        <h1 style={{ fontFamily: cinzel, fontSize: 22, color: txt, margin: '0 0 10px', letterSpacing: '0.04em', lineHeight: 1.25, fontWeight: 600 }}>
          {artifact.name}
        </h1>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 10 }}>
          {artifact.status && <span style={{ fontFamily: 'var(--font-label)', fontSize: 7, letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 3, background: 'rgba(201,168,76,0.1)', color: G, border: '1px solid rgba(201,168,76,0.25)' }}>{artifact.status.toUpperCase()}</span>}
          {artifact.origin && <span style={{ fontFamily: 'var(--font-label)', fontSize: 7, letterSpacing: '0.1em', padding: '2px 6px', borderRadius: 3, background: surf, color: mut, border: `1px solid ${bdr}` }}>{artifact.origin}</span>}
        </div>
        {artifact.summary && (
          <p style={{ fontFamily: crimson, fontSize: 15, color: txt, margin: 0, lineHeight: 1.7 }}>{artifact.summary}</p>
        )}
        {artifact.cautionLevel > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12, padding: '8px 10px', background: surf, border: `1px solid ${bdr}`, borderRadius: 6 }}>
            <CautionMeter level={artifact.cautionLevel} color={cautionColor} />
            {artifact.cautionNote && <span style={{ fontFamily: crimson, fontSize: 11, color: mut, fontStyle: 'italic' }}>{artifact.cautionNote}</span>}
          </div>
        )}
      </div>

      <div style={{ height: 1, background: bdr }} />

      {/* Collapsible sections */}
      <CollapsibleSection title="INTELLIGENCE BODY" id="history" isDark={isDark}>
        {bodyLocked ? <UpgradeSection section="BODY TEXT" isDark={isDark} /> : (
          artifact.body
            ? <div style={{ padding: '0 20px', fontFamily: crimson, fontSize: 15, color: txt, lineHeight: 1.85, whiteSpace: 'pre-wrap' as const }}>{artifact.body}</div>
            : <p style={{ padding: '0 20px', fontFamily: crimson, fontSize: 14, color: mut, margin: 0, fontStyle: 'italic' }}>No body text filed.</p>
        )}
      </CollapsibleSection>

      {scriptures.length > 0 && (
        <CollapsibleSection title="SCRIPTURE REFERENCES" id="scriptures" isDark={isDark}>
          {scriptures.map((s: any) => <ScriptureCard key={s.id} s={s} isDark={isDark} />)}
        </CollapsibleSection>
      )}

      {(relationships.length > 0 || relsLocked) && (
        <CollapsibleSection title="AFFILIATIONS" id="affiliations" isDark={isDark}>
          {relsLocked ? <UpgradeSection section="RELATIONSHIPS" isDark={isDark} /> : (
            <div style={{ padding: '0 20px', display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
              {relationships.map((r: any) => (
                <div key={r.id} style={{ padding: '4px 10px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 4, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', color: mut }}>
                  {r.relationship_type?.replace(/_/g, ' ')}
                </div>
              ))}
            </div>
          )}
        </CollapsibleSection>
      )}

      {spirits.length > 0 && (
        <CollapsibleSection title="ASSOCIATED SPIRITS" id="spirits" isDark={isDark}>
          <div style={{ padding: '0 20px', display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
            {spirits.map((s: any) => (
              <span key={s.id} style={{ padding: '3px 8px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 3, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', color: mut }}>
                {s.spirit_id}
              </span>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {(media.length > 0 || mediaLocked) && (
        <CollapsibleSection title="ASSOCIATED MEDIA" id="media" isDark={isDark}>
          {mediaLocked ? <UpgradeSection section="MEDIA" isDark={isDark} /> : (
            media.map((item: any) => <MediaItem key={item.id} item={item} isDark={isDark} />)
          )}
        </CollapsibleSection>
      )}

      <div style={{ padding: '16px 20px' }}>
        <a href="/community/babel-files" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: mut, textDecoration: 'none' }}>
          ← RETURN TO BABEL FILES
        </a>
      </div>
    </div>
  )

  const shareUrl  = typeof window !== 'undefined' ? window.location.href : ''
  const shareTitle = artifact?.name ? `${artifact.name} · Babel Files` : 'Babel Files'

  return (
    <CommunitySidebarShell activeItem="Babel Files" fillViewport>
      {isMobile ? <MobileLayout /> : <DesktopLayout />}

      {/* Share bottom-sheet overlay */}
      {shareOpen && (
        <div
          onClick={() => setShareOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)',
            display: 'flex', alignItems: 'flex-end',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, margin: '0 auto',
              background: isDark ? '#1a1624' : '#faf8f5',
              borderRadius: '16px 16px 0 0',
              padding: '20px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
              border: `1px solid ${isDark ? 'rgba(201,168,76,0.2)' : 'rgba(0,0,0,0.1)'}`,
              borderBottom: 'none',
            }}
          >
            <div style={{ fontFamily: 'var(--font-label)', fontSize: 8, letterSpacing: '0.2em', color: G, marginBottom: 16, textAlign: 'center' as const }}>
              SHARE DOSSIER
            </div>

            <button onClick={handleCopyLink} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '14px 16px', marginBottom: 8,
              background: isDark ? 'rgba(201,168,76,0.06)' : 'rgba(201,168,76,0.05)',
              border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 8,
              cursor: 'pointer', textAlign: 'left' as const,
            }}>
              <Share2 size={14} style={{ color: G, flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: 10, letterSpacing: '0.1em', color: txt, marginBottom: 2 }}>COPY LINK</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: mut, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, maxWidth: 300 }}>{shareUrl}</div>
              </div>
            </button>

            <button onClick={() => handleShareNative(shareTitle)} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '14px 16px', marginBottom: 8,
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${bdr}`, borderRadius: 8,
              cursor: 'pointer', textAlign: 'left' as const,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>💬</span>
              <div>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: 10, letterSpacing: '0.1em', color: txt, marginBottom: 2 }}>SHARE TO DM</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: mut }}>Send via your device's share menu</div>
              </div>
            </button>

            <button onClick={() => handleShareNative(`[Babel Files] ${shareTitle}`)} style={{
              display: 'flex', alignItems: 'center', gap: 12, width: '100%',
              padding: '14px 16px', marginBottom: 16,
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${bdr}`, borderRadius: 8,
              cursor: 'pointer', textAlign: 'left' as const,
            }}>
              <span style={{ fontSize: 14, flexShrink: 0 }}>🎯</span>
              <div>
                <div style={{ fontFamily: 'var(--font-label)', fontSize: 10, letterSpacing: '0.1em', color: txt, marginBottom: 2 }}>SHARE TO FIELD TEAM</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: mut }}>Share to War Room Intelligence community</div>
              </div>
            </button>

            <button onClick={() => setShareOpen(false)} style={{
              width: '100%', padding: '10px', background: 'transparent',
              border: `1px solid ${bdr}`, borderRadius: 8,
              fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.1em',
              color: mut, cursor: 'pointer',
            }}>
              CANCEL
            </button>
          </div>
        </div>
      )}

      {/* Copy-link toast */}
      {shareToast && (
        <div style={{
          position: 'fixed', bottom: 'calc(24px + env(safe-area-inset-bottom, 0px))', left: '50%',
          transform: 'translateX(-50%)', zIndex: 300,
          background: isDark ? '#1a1624' : '#2D2924', color: isDark ? G : '#FAF8F5',
          fontFamily: 'var(--font-label)', fontSize: 9, letterSpacing: '0.14em',
          padding: '8px 20px', borderRadius: 24,
          border: `1px solid rgba(201,168,76,0.4)`,
          pointerEvents: 'none' as const,
        }}>
          LINK COPIED
        </div>
      )}
    </CommunitySidebarShell>
  )
}
