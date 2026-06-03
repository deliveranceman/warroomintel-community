interface SolIconProps {
  size?: number
  className?: string
  showLabel?: boolean
  variant?: 'icon' | 'hero' | 'banner'
}

const G = '#C9A84C'
const cinzel = "'Cinzel', serif"

export function SolIcon({ size = 20, className = '', showLabel = false, variant = 'icon' }: SolIconProps) {
  const imageSrc = variant === 'hero'
    ? '/images/sol/sol-hero.png'
    : variant === 'banner'
    ? '/images/sol/sol-banner.png'
    : '/images/sol/sol-icon.png'

  return (
    <div className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: showLabel ? '8px' : '0' }}>
      <img
        src={imageSrc}
        alt="SOL"
        width={size}
        height={size}
        style={{
          objectFit: 'contain',
          filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.4))',
          display: 'block',
        }}
      />
      {showLabel && (
        <span style={{
          fontFamily: cinzel,
          fontSize: '11px',
          letterSpacing: '0.15em',
          color: G,
          fontWeight: 600,
        }}>
          ASK SOL
        </span>
      )}
    </div>
  )
}

export default SolIcon
