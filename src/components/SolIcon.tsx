const G = '#C9A84C'

interface SolIconProps {
  size?: number
  color?: string
  className?: string
}

export function SolIcon({ size = 20, color = G, className }: SolIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-label="SOL"
    >
      {/* Eye of discernment */}
      <ellipse cx="12" cy="12" rx="9" ry="5.5" />
      <circle cx="12" cy="12" r="2.5" fill={color} stroke="none" />
      {/* Ray points — sentinel crown */}
      <line x1="12" y1="2" x2="12" y2="4.5" />
      <line x1="19.07" y1="4.93" x2="17.36" y2="6.64" />
      <line x1="22" y1="12" x2="19.5" y2="12" />
      <line x1="19.07" y1="19.07" x2="17.36" y2="17.36" />
      <line x1="12" y1="22" x2="12" y2="19.5" />
      <line x1="4.93" y1="19.07" x2="6.64" y2="17.36" />
      <line x1="2" y1="12" x2="4.5" y2="12" />
      <line x1="4.93" y1="4.93" x2="6.64" y2="6.64" />
    </svg>
  )
}

export default SolIcon
