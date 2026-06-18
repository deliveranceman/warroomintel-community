import { createFileRoute } from '@tanstack/react-router'
import { useAuth } from '@clerk/tanstack-start'
import { useState, useEffect, useRef, useCallback } from 'react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { Search } from 'lucide-react'

export const Route = createFileRoute('/community_/search')({
  ssr: false,
  component: SearchPage,
})

// ── Types (mirror api.search.ts exactly) ────────────────────────────────────
type SourceType = 'spirit' | 'library' | 'resource'

interface SearchHit {
  id: string
  type: SourceType
  title: string
  snippet: string
  meta?: string
  rank: number
  cite: { author?: string; source?: string; year?: string; tier?: string }
  locked?: true
  requiredTier?: number
}

interface SearchGroup {
  type: SourceType
  label: string
  count: number
  items: SearchHit[]
}

interface SearchResponse {
  query: string
  userTier: number
  total: number
  timingMs: number
  groups: SearchGroup[]
}

// ── Constants ────────────────────────────────────────────────────────────────
const SUGGESTED = ['Baal', 'Lust', 'Freemasonry', 'Jezebel']

const TIER_NAMES: Record<number, string> = {
  0: 'Watchman', 1: 'Soldier', 2: 'Commander', 3: 'General', 4: 'Minister', 5: 'Commandant',
}

const SOURCE_STRIPE: Record<SourceType, string> = {
  spirit:   'var(--gold)',
  library:  'var(--info)',
  resource: 'var(--ok)',
}

const SOURCE_BADGE_BG: Record<SourceType, string> = {
  spirit:   'var(--gold-dim)',
  library:  'var(--info-bg)',
  resource: 'var(--ok-bg)',
}

const SOURCE_BADGE_COLOR: Record<SourceType, string> = {
  spirit:   'var(--gold)',
  library:  'var(--info)',
  resource: 'var(--ok)',
}

const SOURCE_LABEL: Record<SourceType, string> = {
  spirit:   'SPIRIT',
  library:  'LIBRARY',
  resource: 'ARSENAL',
}

const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const mono    = "'JetBrains Mono', 'SF Mono', ui-monospace, monospace"

// Strip every HTML tag except <mark> and </mark> — XSS belt-and-suspenders.
// ts_headline escapes < and > in source text, but defense in depth is warranted
// because the content originates from uploaded/scraped documents.
function safeSnippet(raw: string): string {
  return raw.replace(/<(?!\/?mark\b)[^>]*>/gi, '')
}

// ── Page component ────────────────────────────────────────────────────────────
function SearchPage() {
  const { getToken } = useAuth()

  const initialQ =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search).get('q') || ''
      : ''

  const [inputVal, setInputVal]   = useState(initialQ)
  const [results,  setResults]    = useState<SearchResponse | null>(null)
  const [loading,  setLoading]    = useState(false)
  const [error,    setError]      = useState<string | null>(null)

  const abortRef  = useRef<AbortController | null>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const firstRun  = useRef(true)

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (abortRef.current) abortRef.current.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: ctrl.signal,
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        // 400 query_too_short is a silent clear, not an error banner
        if (body.error === 'query_too_short') { setResults(null); setError(null); return }
        setError('Search is temporarily unavailable. Please try again.')
        setResults(null)
        return
      }
      const data: SearchResponse = await res.json()
      setResults(data)
      setError(null)
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError('Search is temporarily unavailable. Please try again.')
    } finally {
      if (!ctrl.signal.aborted) setLoading(false)
    }
  }, [getToken])

  // ── Debounced URL-sync + fetch on inputVal change ──────────────────────────
  useEffect(() => {
    const q = inputVal.trim()

    // URL sync (replaceState — no history entry)
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (q) url.searchParams.set('q', q)
      else   url.searchParams.delete('q')
      window.history.replaceState({}, '', url.toString())
    }

    if (!q || q.length < 2) {
      if (abortRef.current) abortRef.current.abort()
      setResults(null)
      setError(null)
      setLoading(false)
      return
    }

    // Fire immediately on first render (page loaded with ?q=…); debounce after
    const delay = firstRun.current ? 0 : 250
    firstRun.current = false

    const timer = setTimeout(() => doSearch(q), delay)
    return () => clearTimeout(timer)
  }, [inputVal, doSearch])

  // ── Derived flags ──────────────────────────────────────────────────────────
  const noResults  = results !== null && results.total === 0 && !loading
  const hasResults = results !== null && results.total > 0

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <CommunitySidebarShell activeItem="Search">
      <style>{`
        .wri-search-mark mark {
          background: transparent;
          color: var(--gold);
          font-weight: 600;
          text-decoration: underline;
          text-decoration-color: var(--gold);
          text-underline-offset: 2px;
          text-decoration-thickness: 1px;
        }
      `}</style>

      <div style={{ background: 'var(--deep)', color: 'var(--text)', minHeight: '100%', paddingBottom: 48 }}>

        {/* ── Page header ── */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: '20px 24px 16px' }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, color: 'var(--gold)', letterSpacing: '0.2em', marginBottom: 14 }}>
            ⚔ ARCHIVE SEARCH
          </div>

          <form
            onSubmit={e => {
              e.preventDefault()
              const q = inputVal.trim()
              if (q.length >= 2) doSearch(q)
            }}
            style={{ position: 'relative', maxWidth: 620 }}
          >
            <Search
              size={16}
              strokeWidth={1.6}
              style={{
                position: 'absolute', left: 14, top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--muted)', pointerEvents: 'none',
              }}
            />
            <input
              ref={inputRef}
              type="text"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Search spirits, library, arsenal…"
              autoComplete="off"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8, padding: '12px 16px 12px 44px',
                fontFamily: crimson, fontSize: 16,
                color: 'var(--text)', outline: 'none',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { (e.target as HTMLInputElement).style.borderColor = 'var(--gold)' }}
              onBlur={e =>  { (e.target as HTMLInputElement).style.borderColor = 'var(--border)' }}
            />
          </form>

          {/* Meta row */}
          <div style={{ marginTop: 8, height: 18, fontFamily: mono, fontSize: 11, color: 'var(--muted)' }}>
            {loading && inputVal.trim().length >= 2 ? (
              'searching…'
            ) : results ? (
              `${results.timingMs}ms · ${results.total} result${results.total !== 1 ? 's' : ''}`
            ) : null}
          </div>
        </div>

        {/* ── Content area ── */}
        <div style={{ padding: '24px', maxWidth: 760 }}>

          {/* Empty state */}
          {!inputVal.trim() && !results && (
            <>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: 'var(--muted)', letterSpacing: '0.18em', marginBottom: 12 }}>
                SUGGESTED
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 32 }}>
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => setInputVal(q)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 20, padding: '8px 18px',
                      fontFamily: crimson, fontSize: 14,
                      color: 'var(--muted)', cursor: 'pointer',
                      transition: 'border-color 0.15s, color 0.15s',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget; el.style.borderColor = 'var(--gold)'; el.style.color = 'var(--gold)' }}
                    onMouseLeave={e => { const el = e.currentTarget; el.style.borderColor = 'var(--border)'; el.style.color = 'var(--muted)' }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: 'var(--muted)', letterSpacing: '0.12em', opacity: 0.6 }}>
                Press{' '}
                <kbd style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 3, padding: '1px 5px',
                  fontFamily: mono, fontSize: 10,
                }}>
                  /
                </kbd>
                {' '}anywhere to open search
              </div>
            </>
          )}

          {/* Error banner */}
          {error && (
            <div style={{
              padding: '10px 14px', marginBottom: 16,
              background: 'var(--crit-bg)',
              border: '1px solid rgba(200,74,74,0.25)',
              borderRadius: 8,
            }}>
              <span style={{ fontFamily: crimson, fontSize: 14, color: 'var(--crit)' }}>{error}</span>
            </div>
          )}

          {/* Results — stale fade while new query in flight */}
          {(hasResults || noResults) && (
            <div style={{ opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s' }}>

              {/* Group sections */}
              {results!.groups.map(group =>
                group.items.length === 0 ? null : (
                  <div key={group.type} style={{ marginBottom: 36 }}>
                    <div style={{
                      display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}>
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: 'var(--muted)', letterSpacing: '0.15em' }}>
                        FROM THE {group.label.toUpperCase()}
                      </div>
                      {/* Phase 2: facet drill-down. href="#" is intentional placeholder. */}
                      <a
                        href="#"
                        onClick={e => e.preventDefault()}
                        style={{ fontFamily: cinzel, fontSize: 9, color: 'var(--gold)', letterSpacing: '0.1em', textDecoration: 'none', opacity: 0.7 }}
                      >
                        See all {group.count} →
                      </a>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 14 }}>
                      {group.items.map(hit => (
                        <HitCard key={hit.id} hit={hit} />
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* No results */}
              {noResults && (
                <div style={{
                  padding: '32px 24px', textAlign: 'center' as const,
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 10,
                }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>⚔</div>
                  <div style={{ fontFamily: cinzel, fontSize: 13, color: 'var(--muted)', letterSpacing: '0.1em', marginBottom: 8 }}>
                    NOTHING IN THE ARCHIVE
                  </div>
                  <div style={{ fontFamily: crimson, fontSize: 14, color: 'var(--muted)', opacity: 0.7 }}>
                    No results for "{results?.query}". Try a different term.
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </CommunitySidebarShell>
  )
}

// ── Hit card ──────────────────────────────────────────────────────────────────
function HitCard({ hit }: { hit: SearchHit }) {
  const stripeColor  = SOURCE_STRIPE[hit.type]
  const badgeBg      = SOURCE_BADGE_BG[hit.type]
  const badgeColor   = SOURCE_BADGE_COLOR[hit.type]
  const typeLabel    = SOURCE_LABEL[hit.type]
  const tierName     = hit.requiredTier !== undefined ? (TIER_NAMES[hit.requiredTier] ?? 'Higher') : ''

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 8,
      borderLeft: `3px solid ${stripeColor}`,
      padding: '14px 16px',
      overflow: 'hidden',
    }}>
      {/* Badge + title row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{
          background: badgeBg, color: badgeColor,
          fontFamily: cinzel, fontSize: 8, letterSpacing: '0.12em',
          padding: '3px 8px', borderRadius: 3,
          flexShrink: 0, marginTop: 2, whiteSpace: 'nowrap' as const,
        }}>
          {typeLabel}
        </div>
        <div style={{ fontFamily: cinzel, fontSize: 13, color: 'var(--text)', letterSpacing: '0.04em', flex: 1, lineHeight: 1.4 }}>
          {/* Title uses React's default escaping — NOT dangerouslySetInnerHTML */}
          {hit.title}
        </div>
      </div>

      {/* Meta row */}
      {(hit.meta || hit.cite.author || hit.cite.source || hit.cite.tier) && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, alignItems: 'center', marginBottom: 8 }}>
          {hit.cite.author && (
            <span style={{ fontFamily: cinzel, fontSize: 9, color: 'var(--muted)', letterSpacing: '0.06em' }}>
              {hit.cite.author}
            </span>
          )}
          {hit.meta && (
            <span style={{ fontFamily: mono, fontSize: 9, color: 'var(--muted)', opacity: 0.7 }}>
              {hit.meta}
            </span>
          )}
          {hit.cite.tier && !hit.locked && (
            <span style={{
              fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
              background: badgeBg, color: badgeColor,
              padding: '1px 6px', borderRadius: 2,
            }}>
              {hit.cite.tier.toUpperCase()}
            </span>
          )}
        </div>
      )}

      {/* Snippet or locked overlay */}
      {hit.locked ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 12px', marginTop: 4,
          background: 'var(--surface3)',
          borderRadius: 5,
        }}>
          <span style={{ color: 'var(--gold)', fontSize: 14, flexShrink: 0 }}>⚔</span>
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: 'var(--gold)', letterSpacing: '0.12em' }}>
              {tierName.toUpperCase()} TIER REQUIRED
            </div>
            <div style={{ fontFamily: crimson, fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Upgrade to {tierName} to view this intelligence.
            </div>
          </div>
        </div>
      ) : hit.snippet ? (
        // dangerouslySetInnerHTML ONLY on snippet, after safeSnippet() strips non-mark tags.
        // Title and all other fields use React's default escaping above.
        <div
          className="wri-search-mark"
          dangerouslySetInnerHTML={{ __html: safeSnippet(hit.snippet) }}
          style={{ fontFamily: crimson, fontSize: 14, color: 'var(--muted)', lineHeight: 1.65 }}
        />
      ) : null}
    </div>
  )
}
