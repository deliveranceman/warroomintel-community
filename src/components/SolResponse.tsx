import { SolIcon } from './SolIcon'

const G      = '#C9A84C'
const SURF   = '#0f0c07'
const BDR    = '#2a2010'
const TXT    = '#a89878'
const cinzel = "'Cinzel', serif"

interface SolResponseProps {
  children: React.ReactNode
  loading?: boolean
  className?: string
}

export function SolResponse({ children, loading = false, className }: SolResponseProps) {
  return (
    <div
      className={className}
      style={{
        background: SURF,
        border: `1px solid ${BDR}`,
        borderLeft: `3px solid ${G}`,
        borderRadius: '0 10px 10px 0',
        padding: '10px 14px',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <SolIcon size={12} />
        <span style={{ fontFamily: cinzel, fontSize: 8, color: G, letterSpacing: '0.18em', opacity: 0.85 }}>
          SOL
        </span>
      </div>
      <div style={{ color: TXT, opacity: loading ? 0.6 : 1 }}>
        {loading ? (
          <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: '#6b5e45', fontStyle: 'italic' }}>
            Analyzing…
          </span>
        ) : children}
      </div>
    </div>
  )
}

export default SolResponse
