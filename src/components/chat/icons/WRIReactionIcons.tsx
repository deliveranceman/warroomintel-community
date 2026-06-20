import type { FC } from 'react'
import type { WRIReactionType } from '@/lib/wri-reactions'

// ── WRI reaction insignia ───────────────────────────────────────────────────
// Single-color, geometric military-badge style. Stroke uses currentColor so the
// render surface controls tint (default WRI gold). Tuned for 24px and 40px.

interface IconProps {
  size?: number
  color?: string
}

const base = (size: number, color: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: color,
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

export const StrikeIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M4 4l11 11" />
    <path d="M20 4L9 15" />
    <path d="M3 16l3 3" />
    <path d="M21 16l-3 3" />
    <path d="M6 17l1 1" />
    <path d="M18 17l-1 1" />
  </svg>
)

export const CoverIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M12 3l7 2.5v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9v-5L12 3z" />
  </svg>
)

export const BurnIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M12 3c1 3 4 4.5 4 8a4 4 0 01-8 0c0-1.7.8-2.8 1.6-3.8C10.5 8 11.5 6 12 3z" />
    <path d="M12 21a4 4 0 01-2-7.5" opacity="0.55" />
  </svg>
)

export const AmenIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <circle cx="12" cy="12" r="9" />
    <path d="M8.5 15v-4l1.5 2 1.5-2v4" strokeWidth="1.4" />
    <path d="M13.5 15v-4h2M13.5 13h1.6" strokeWidth="1.4" />
  </svg>
)

export const BloodIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M12 3c3 4 5 6.5 5 9.5a5 5 0 01-10 0C7 9.5 9 7 12 3z" />
  </svg>
)

export const WatchIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
    <path d="M6.5 12c1.8-2.6 3.8-3.8 5.5-3.8s3.7 1.2 5.5 3.8c-1.8 2.6-3.8 3.8-5.5 3.8s-3.7-1.2-5.5-3.8z" strokeWidth="1.4" />
    <circle cx="12" cy="12" r="1.6" />
  </svg>
)

export const SoundIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M4 14c0-2 1-3 3-3l11-5c1-.5 2 .2 2 1.3 0 5-3 9.7-8 11.2" />
    <path d="M4 14v3a2 2 0 002 2h1" />
  </svg>
)

export const AnchorIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <circle cx="12" cy="5" r="2" />
    <path d="M12 7v13" />
    <path d="M8 10h8" />
    <path d="M5 13c0 4 3 6.5 7 6.5s7-2.5 7-6.5" />
  </svg>
)

export const CrownIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M4 18h16" />
    <path d="M4 18l-1-9 5 4 4-7 4 7 5-4-1 9" />
  </svg>
)

export const BreakIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M9.5 8.5L8 7a3 3 0 00-4.2 4.2L6 13" />
    <path d="M14.5 15.5L16 17a3 3 0 004.2-4.2L18 11" />
    <path d="M10 14l1.5-1.5M14 10l-1.5 1.5" opacity="0.6" />
  </svg>
)

export const IntercedeIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M9 21v-6c0-1-.6-1.7-1.3-2.4L6 11c-.7-.7-.7-1.8 0-2.4.6-.5 1.4-.4 2 .2L10 11V4.5a1.2 1.2 0 012.4 0V11" />
    <path d="M12.4 11V5.2a1.2 1.2 0 012.4 0V12c0 4-1.5 6.5-1.8 9" />
  </svg>
)

export const SealIcon = ({ size = 24, color = 'currentColor' }: IconProps) => (
  <svg {...base(size, color)}>
    <path d="M12 3l2.2 1.6 2.7-.3 1 2.5 2.3 1.4-.6 2.7 1.3 2.4-1.8 2 .2 2.7-2.6.8-1.3 2.4-2.7-.5L12 22l-2.4-1.4-2.7.5-1.3-2.4-2.6-.8.2-2.7-1.8-2 1.3-2.4-.6-2.7 2.3-1.4 1-2.5 2.7.3L12 3z" strokeWidth="1.3" />
    <path d="M12 9v6M9 12h6" />
  </svg>
)

export const WRI_ICONS: Record<WRIReactionType, FC<IconProps>> = {
  wri_strike: StrikeIcon,
  wri_cover: CoverIcon,
  wri_burn: BurnIcon,
  wri_amen: AmenIcon,
  wri_blood: BloodIcon,
  wri_watch: WatchIcon,
  wri_sound: SoundIcon,
  wri_anchor: AnchorIcon,
  wri_crown: CrownIcon,
  wri_break: BreakIcon,
  wri_intercede: IntercedeIcon,
  wri_seal: SealIcon,
}
