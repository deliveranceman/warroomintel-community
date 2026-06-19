import { useIsDark } from '@/lib/use-is-dark'

export function InvestigationViewBar() {
  const isDark = useIsDark()

  // Only render when the user is in global light mode.
  // In dark mode there is no transition to signal, so no bar.
  if (isDark) return null

  return (
    <div
      style={{
        background: '#09070F',
        borderBottom: '1px solid rgba(201, 168, 76, 0.2)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        fontFamily: 'inherit',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: 11,
          letterSpacing: '1.5px',
          textTransform: 'uppercase',
          color: '#C9A84C',
          fontWeight: 600,
        }}
      >
        ⚔ Investigation View
      </span>
      <span
        style={{
          color: 'rgba(139, 115, 85, 0.7)',
          fontSize: 11,
          letterSpacing: '0.5px',
        }}
      >
        ·
      </span>
      <span
        style={{
          fontSize: 11,
          color: '#8B7355',
          letterSpacing: '0.3px',
        }}
      >
        This tool stays dark by design
      </span>
    </div>
  )
}
