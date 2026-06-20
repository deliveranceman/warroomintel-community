import { useEffect, useRef, useState } from 'react'
import type { GiphyHit } from '@/lib/giphy-types'

interface GiphyPickerProps {
  token: string
  onSelect: (hit: GiphyHit) => void
  onDismiss: () => void
  anchorRect?: DOMRect
  isDark?: boolean
}

const WRI_GOLD = '#C9A84C'
const DEBOUNCE_MS = 300

export function GiphyPicker({ token, onSelect, onDismiss, anchorRect, isDark = true }: GiphyPickerProps) {
  const [query, setQuery]   = useState('')
  const [hits,  setHits]    = useState<GiphyHit[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef  = useRef<HTMLInputElement>(null)
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMobile  = typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss() }
    window.addEventListener('keydown', onKey)
    setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!query.trim()) { setHits([]); setLoading(false); return }
    setLoading(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/giphy-search?q=${encodeURIComponent(query.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        setHits(Array.isArray(data.hits) ? data.hits : [])
      } catch {
        setHits([])
      } finally {
        setLoading(false)
      }
    }, DEBOUNCE_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [query, token])

  const surf = isDark ? '#1a1714' : '#FFFFFF'
  const bdr  = isDark ? 'rgba(201,168,76,0.3)' : 'rgba(139,105,20,0.3)'
  const txt  = isDark ? '#f0e8d8' : '#2D2924'
  const mut  = isDark ? '#9a8c74' : '#5C5248'

  let panelStyle: React.CSSProperties
  if (isMobile || !anchorRect) {
    panelStyle = {
      position: 'fixed',
      left: 0, right: 0, bottom: 0,
      width: '100%',
      borderRadius: '16px 16px 0 0',
      padding: '16px 16px max(16px, env(safe-area-inset-bottom))',
      maxHeight: '70dvh',
    }
  } else {
    const PANEL_W = 320
    const PANEL_H = 400
    const spaceAbove = anchorRect.top
    const placeBelow = spaceAbove < PANEL_H + 16
    const top    = placeBelow ? anchorRect.bottom + 8 : undefined
    const bottom = placeBelow ? undefined : window.innerHeight - anchorRect.top + 8
    let left = anchorRect.left
    if (left + PANEL_W > window.innerWidth - 8) left = window.innerWidth - PANEL_W - 8
    if (left < 8) left = 8
    panelStyle = {
      position: 'fixed',
      left, top, bottom,
      width: PANEL_W,
      borderRadius: 14,
      padding: 12,
      maxHeight: PANEL_H,
    }
  }

  const cols = isMobile ? 2 : 3

  return (
    <>
      <div
        onClick={onDismiss}
        style={{
          position: 'fixed', inset: 0, zIndex: 10000,
          background: isMobile ? 'rgba(0,0,0,0.4)' : 'transparent',
        }}
      />
      <div
        role="dialog"
        aria-label="Search GIFs"
        onClick={e => e.stopPropagation()}
        style={{
          ...panelStyle,
          zIndex: 10001,
          background: surf,
          border: `1px solid ${bdr}`,
          boxShadow: '0 8px 28px rgba(0,0,0,0.45)',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          overflow: 'hidden',
        }}
      >
        {/* Search input */}
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          style={{
            width: '100%',
            background: isDark ? 'rgba(255,255,255,0.07)' : '#F5F2E8',
            border: `1px solid ${bdr}`,
            borderRadius: 8,
            padding: '8px 12px',
            color: txt,
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
            flexShrink: 0,
          }}
        />

        {/* Grid */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '20px', color: mut, fontSize: 12 }}>Loading…</div>
          )}
          {!loading && query.trim() && hits.length === 0 && (
            <div style={{ textAlign: 'center', padding: '20px', color: mut, fontSize: 12 }}>No results</div>
          )}
          {!loading && !query.trim() && (
            <div style={{ textAlign: 'center', padding: '20px', color: mut, fontSize: 12 }}>Type to search GIFs</div>
          )}
          {!loading && hits.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 6 }}>
              {hits.map(hit => (
                <button
                  key={hit.id}
                  onClick={() => onSelect(hit)}
                  title={hit.title}
                  style={{
                    padding: 0,
                    border: `1px solid ${bdr}`,
                    borderRadius: 8,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    background: isDark ? 'rgba(255,255,255,0.04)' : '#F0EDE4',
                    aspectRatio: '1 / 1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <img
                    src={hit.previewUrl}
                    alt={hit.title}
                    loading="lazy"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GIPHY attribution — required by GIPHY API Terms */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          flexShrink: 0, paddingTop: 4, borderTop: `1px solid ${bdr}`,
        }}>
          <span style={{ fontSize: 9, color: mut, fontFamily: 'sans-serif', letterSpacing: '0.05em', opacity: 0.8 }}>
            Powered by{' '}
            <span style={{ color: WRI_GOLD, fontWeight: 700 }}>GIPHY</span>
          </span>
        </div>

        {isMobile && (
          <button
            onClick={onDismiss}
            style={{
              marginTop: 2, padding: '10px',
              background: 'transparent', border: `1px solid ${bdr}`,
              borderRadius: 10, color: txt,
              fontFamily: "'Cinzel', serif", fontSize: 12,
              letterSpacing: '0.06em', cursor: 'pointer', flexShrink: 0,
            }}
          >
            Cancel
          </button>
        )}
      </div>
    </>
  )
}
