import { useNavigate } from '@tanstack/react-router'

const G       = 'var(--gold)'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const TIER_COLORS: Record<string, { dark: string; light: string }> = {
  free:       { dark: '#94A3B8', light: '#475569' },
  watchman:   { dark: '#94A3B8', light: '#475569' },
  soldier:    { dark: '#C9A84C', light: '#604408' },
  commander:  { dark: '#FB923C', light: '#9A3412' },
  general:    { dark: '#A78BFA', light: '#5E3E8C' },
  minister:   { dark: '#F87171', light: '#9C2828' },
  commandant: { dark: '#FBBF24', light: '#8B5A00' },
}

const FILE_ICONS: Record<string, string> = {
  'application/pdf': '📄',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'audio/mpeg': '🎵',
  'image/png': '🖼',
  'image/jpeg': '🖼',
}

function fmtBytes(n: number): string {
  if (!n) return ''
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function ResourceViewer({ resource, isDark, onUpgrade }: { resource: any; isDark: boolean; onUpgrade?: (tier: string) => void }) {
  const navigate = useNavigate()

  function beginUpgrade(tier: string) {
    if (onUpgrade) { onUpgrade(tier); return }
    navigate({ to: '/membership' })
  }

  const tierKey   = (resource.tier || '').toLowerCase()
  const tc        = (TIER_COLORS[tierKey] || TIER_COLORS.soldier)[isDark ? 'dark' : 'light']
  const tierLabel = (tierKey === 'free' || tierKey === 'watchman') ? 'Watchman' : resource.tier || ''
  const fileIcon  = FILE_ICONS[resource.file_type] || '📄'

  const bg     = isDark ? '#0D0B14' : '#EDEBE2'
  const text   = isDark ? '#E8D5B0' : '#1F1B12'
  const muted  = isDark ? '#8B7355' : '#574B33'
  const border = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)'

  const backBar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${border}`, background: isDark ? 'rgba(13,11,20,0.9)' : 'rgba(237,235,226,0.9)', position: 'sticky', top: 0, zIndex: 10 }}>
      <button
        onClick={() => navigate({ to: '/community', search: { section: 'arsenal' } as any })}
        style={{ background: 'transparent', border: 'none', color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← ARSENAL
      </button>
      <span style={{ color: border, fontSize: 12 }}>|</span>
      <span style={{ fontFamily: cinzel, fontSize: 10, color: muted, letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, flex: 1 }}>
        {resource.title}
      </span>
      <span style={{ fontFamily: cinzel, fontSize: 8, padding: '2px 7px', borderRadius: 20, background: `${tc}22`, color: tc, border: `1px solid ${tc}44`, letterSpacing: '0.06em', textTransform: 'uppercase' as const, flexShrink: 0 }}>
        {tierLabel}
      </span>
    </div>
  )

  // ── Branch 1: Locked ───────────────────────────────────────────────────────
  if (resource.locked) {
    return (
      <div style={{ background: bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {backBar}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', gap: 20 }}>
          <div style={{ fontSize: 40 }}>🔒</div>
          <div style={{ fontFamily: cinzel, fontSize: 16, color: tc, letterSpacing: '0.1em' }}>{resource.title}</div>
          {resource.lockedPreview && (
            <div style={{ fontFamily: crimson, fontSize: 15, color: muted, maxWidth: 480, lineHeight: 1.6 }}>
              {resource.lockedPreview}…
            </div>
          )}
          <div style={{ fontFamily: crimson, fontSize: 14, color: muted }}>
            This resource requires <strong style={{ color: tc }}>{tierLabel}</strong> access.
          </div>
          <button
            onClick={() => beginUpgrade(resource.tier || 'soldier')}
            style={{ padding: '10px 28px', background: `${tc}22`, border: `1px solid ${tc}`, borderRadius: 6, color: tc, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', cursor: 'pointer' }}
          >
            UPGRADE TO {tierLabel.toUpperCase()}
          </button>
        </div>
      </div>
    )
  }

  // ── Branch 2: Has extracted text ───────────────────────────────────────────
  if (resource.extracted_text) {
    return (
      <div style={{ background: bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
        {backBar}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', padding: '8px 20px', borderBottom: `1px solid ${border}`, gap: 10 }}>
          <span style={{ fontFamily: crimson, fontSize: 12, color: muted }}>
            {fileIcon} {resource.file_type?.split('/')[1]?.toUpperCase() || 'FILE'} · {fmtBytes(resource.file_size)}
          </span>
          {resource.file_url && (
            <a
              href={resource.file_url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontFamily: cinzel, fontSize: 9, padding: '4px 12px', background: `${tc}18`, border: `1px solid ${tc}55`, borderRadius: 4, color: tc, letterSpacing: '0.08em', textDecoration: 'none', whiteSpace: 'nowrap' as const }}
            >
              ↗ OPEN ORIGINAL
            </a>
          )}
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '24px 28px', maxWidth: 760, margin: '0 auto', width: '100%', boxSizing: 'border-box' as const }}>
          <pre style={{ fontFamily: crimson, fontSize: 15, color: text, lineHeight: 1.75, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const, margin: 0 }}>
            {resource.extracted_text}
          </pre>
        </div>
      </div>
    )
  }

  // ── Branch 3: Download-only ────────────────────────────────────────────────
  return (
    <div style={{ background: bg, minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {backBar}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', gap: 20 }}>
        <div style={{ fontSize: 48 }}>{fileIcon}</div>
        <div style={{ fontFamily: cinzel, fontSize: 15, color: text, letterSpacing: '0.08em', maxWidth: 480 }}>{resource.title}</div>
        {resource.description && (
          <div style={{ fontFamily: crimson, fontSize: 15, color: muted, maxWidth: 480, lineHeight: 1.6 }}>
            {resource.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const, justifyContent: 'center' }}>
          {resource.category && (
            <span style={{ fontFamily: cinzel, fontSize: 8, padding: '2px 8px', borderRadius: 20, border: `1px solid ${border}`, color: muted, letterSpacing: '0.06em' }}>
              {resource.category}
            </span>
          )}
          {resource.file_type && (
            <span style={{ fontFamily: cinzel, fontSize: 8, padding: '2px 8px', borderRadius: 20, border: `1px solid ${border}`, color: muted, letterSpacing: '0.06em' }}>
              {resource.file_type.split('/')[1]?.toUpperCase() || resource.file_type}
            </span>
          )}
          {resource.file_size > 0 && (
            <span style={{ fontFamily: cinzel, fontSize: 8, padding: '2px 8px', borderRadius: 20, border: `1px solid ${border}`, color: muted, letterSpacing: '0.06em' }}>
              {fmtBytes(resource.file_size)}
            </span>
          )}
        </div>
        {resource.file_url ? (
          <a
            href={resource.file_url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ padding: '11px 32px', background: `${tc}18`, border: `1px solid ${tc}`, borderRadius: 6, color: tc, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', textDecoration: 'none' }}
          >
            ↗ OPEN RESOURCE
          </a>
        ) : (
          <div style={{ fontFamily: crimson, fontSize: 13, color: muted }}>File is being processed.</div>
        )}
      </div>
    </div>
  )
}
