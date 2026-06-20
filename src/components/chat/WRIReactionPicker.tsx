import { useEffect, useRef, useState } from 'react'
import { WRI_REACTIONS, WRI_GOLD, type WRIReactionType } from '@/lib/wri-reactions'
import { WRI_ICONS } from '@/components/chat/icons/WRIReactionIcons'

interface WRIReactionPickerProps {
  onSelect: (type: WRIReactionType) => void
  onDismiss: () => void
  anchorRect?: DOMRect
  isDark?: boolean
}

const LONG_PRESS_MS = 350

export function WRIReactionPicker({ onSelect, onDismiss, anchorRect, isDark = true }: WRIReactionPickerProps) {
  const [hovered, setHovered] = useState<WRIReactionType | null>(null)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  const clearLongPress = () => {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null }
  }

  const surf = isDark ? '#1a1714' : '#FFFFFF'
  const bdr = isDark ? 'rgba(201,168,76,0.3)' : 'rgba(139,105,20,0.3)'
  const txt = isDark ? '#f0e8d8' : '#2D2924'

  // Panel positioning. Desktop: anchored above the message (or below if no room).
  // Mobile: bottom sheet spanning the viewport width (use 100%, never 100vw).
  let panelStyle: React.CSSProperties
  if (isMobile || !anchorRect) {
    panelStyle = {
      position: 'fixed',
      left: 0, right: 0, bottom: 0,
      width: '100%',
      borderRadius: '16px 16px 0 0',
      padding: '16px 16px max(16px, env(safe-area-inset-bottom))',
    }
  } else {
    const spaceAbove = anchorRect.top
    const placeBelow = spaceAbove < 220
    const top = placeBelow ? anchorRect.bottom + 8 : undefined
    const bottom = placeBelow ? undefined : window.innerHeight - anchorRect.top + 8
    let left = anchorRect.left
    const PANEL_W = 232
    if (left + PANEL_W > window.innerWidth - 8) left = window.innerWidth - PANEL_W - 8
    if (left < 8) left = 8
    panelStyle = {
      position: 'fixed',
      left,
      top,
      bottom,
      width: PANEL_W,
      borderRadius: 14,
      padding: 12,
    }
  }

  return (
    <>
      {/* Backdrop — click dismisses */}
      <div
        onClick={onDismiss}
        style={{ position: 'fixed', inset: 0, zIndex: 10000, background: isMobile ? 'rgba(0,0,0,0.4)' : 'transparent' }}
      />
      <div
        role="menu"
        aria-label="Reactions"
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
        }}
      >
        {hovered && (
          <div style={{ textAlign: 'center', fontFamily: "'Cinzel', serif", fontSize: 11, letterSpacing: '0.08em', color: WRI_GOLD, minHeight: 14 }}>
            {WRI_REACTIONS.find(r => r.type === hovered)?.label}
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: isMobile ? 10 : 6, justifyItems: 'center' }}>
          {WRI_REACTIONS.map(({ type, label, color }) => {
            const Icon = WRI_ICONS[type]
            return (
              <button
                key={type}
                title={label}
                aria-label={label}
                onClick={() => onSelect(type)}
                onMouseEnter={() => !isMobile && setHovered(type)}
                onMouseLeave={() => !isMobile && setHovered(null)}
                onTouchStart={() => { clearLongPress(); longPressTimer.current = setTimeout(() => setHovered(type), LONG_PRESS_MS) }}
                onTouchEnd={clearLongPress}
                onTouchMove={clearLongPress}
                style={{
                  width: 44, height: 44,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'rgba(201,168,76,0.08)',
                  border: `1px solid ${bdr}`,
                  borderRadius: 10,
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'transform 0.1s, background 0.1s',
                }}
                onMouseDown={e => (e.currentTarget as HTMLElement).style.transform = 'scale(0.92)'}
                onMouseUp={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1)'}
              >
                <Icon size={24} color={color} />
              </button>
            )
          })}
        </div>
        {isMobile && (
          <button
            onClick={onDismiss}
            style={{ marginTop: 4, padding: '10px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 10, color: txt, fontFamily: "'Cinzel', serif", fontSize: 12, letterSpacing: '0.06em', cursor: 'pointer' }}
          >
            Cancel
          </button>
        )}
      </div>
    </>
  )
}
