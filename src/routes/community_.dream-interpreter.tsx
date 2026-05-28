import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState } from 'react'

export const Route = createFileRoute('/community_/dream-interpreter')({
  ssr: false,
  component: DreamInterpreterPage,
})

const G      = '#C9A84C'
const BG     = '#0D0B14'
const SURF   = '#12101e'
const SURF2  = '#1a1726'
const BDR    = 'rgba(201,168,76,0.22)'
const TXT    = '#e8dcc8'
const DIM    = '#a09080'
const MUT    = '#6b5e45'
const cinzel = "'Cinzel', serif"
const mono   = "'JetBrains Mono', monospace"
const crimson = "'Crimson Pro', serif"

const TIER_LEVELS: Record<string, number> = { watchman: 0, free: 0, soldier: 1, commander: 2, general: 3, minister: 99 }

interface DreamReport {
  verdict: 'prophetic' | 'warning' | 'deliverance' | 'trauma' | 'mixed'
  summary: string
  sections: { title: string; items: string[] }[]
}

const VERDICT_META: Record<string, { color: string; bg: string; label: string }> = {
  prophetic:   { color: '#7fa8c7', bg: 'rgba(127,168,199,0.08)', label: 'PROPHETIC' },
  warning:     { color: '#e8b658', bg: 'rgba(232,182,88,0.08)',  label: 'WARNING' },
  deliverance: { color: '#e07070', bg: 'rgba(224,112,112,0.08)', label: 'DELIVERANCE NEEDED' },
  trauma:      { color: '#a09080', bg: 'rgba(160,144,128,0.08)', label: 'SOULICAL / TRAUMA' },
  mixed:       { color: G,         bg: 'rgba(201,168,76,0.08)',  label: 'MIXED ANALYSIS' },
}

function DreamInterpreterPage() {
  const { getToken }    = useAuth()
  const { user, isLoaded } = useUser()

  const [dream, setDream]     = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [report, setReport]   = useState<DreamReport | null>(null)

  const tier     = ((user?.publicMetadata?.tier as string) || '').toLowerCase()
  const role     = (user?.publicMetadata?.role as string) || ''
  const tierLvl  = TIER_LEVELS[tier] ?? 0
  const hasAccess = tierLvl >= 1 || role === 'minister'

  async function interpret() {
    if (!dream.trim() || loading) return
    setLoading(true)
    setError(null)
    setReport(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/dream-interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dreamDescription: dream.trim(), dreamerContext: context.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Interpretation failed'); return }
      setReport(data)
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const, background: SURF2,
    border: `1px solid ${BDR}`, borderRadius: 4, padding: '10px 12px',
    color: TXT, fontFamily: crimson, fontSize: 15, outline: 'none', lineHeight: 1.5,
  }

  const labelSt: React.CSSProperties = {
    display: 'block', fontFamily: mono, fontSize: 10, color: MUT,
    letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 6,
  }

  if (!isLoaded) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: cinzel, color: MUT, fontSize: 11, letterSpacing: '0.18em' }}>LOADING…</div>
    </div>
  )

  if (!hasAccess) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' as const }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, color: MUT, letterSpacing: '0.18em', marginBottom: 16 }}>RESTRICTED ACCESS</div>
        <h1 style={{ fontFamily: cinzel, fontSize: 24, color: G, fontWeight: 700, margin: '0 0 12px' }}>Dream Interpreter</h1>
        <p style={{ fontFamily: crimson, fontSize: 16, color: DIM, lineHeight: 1.6, margin: '0 0 24px' }}>
          Prophetic and spiritual dream analysis is available to Soldier tier and above.
        </p>
        <a href="/community" style={{ display: 'inline-block', background: G, color: '#1a1305', padding: '9px 20px', fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', borderRadius: 2 }}>
          ← Return to Community
        </a>
      </div>
    </div>
  )

  const v = report ? (VERDICT_META[report.verdict] ?? VERDICT_META.mixed) : null

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TXT }}>
      {/* breadcrumb */}
      <div style={{ borderBottom: `1px solid ${BDR}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <a href="/community" style={{ color: MUT, fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', textDecoration: 'none' }}>← COMMUNITY</a>
        <span style={{ color: MUT, opacity: 0.4, fontSize: 12 }}>›</span>
        <span style={{ fontFamily: mono, fontSize: 10, color: G, letterSpacing: '0.1em' }}>DREAM INTERPRETER</span>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 80px' }}>
        {/* page title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: MUT, letterSpacing: '0.18em', marginBottom: 8 }}>INTELLIGENCE TOOL</div>
          <h1 style={{ fontFamily: cinzel, fontSize: 28, color: G, fontWeight: 700, margin: '0 0 8px' }}>Dream Interpreter</h1>
          <p style={{ fontFamily: crimson, fontSize: 16, color: DIM, lineHeight: 1.6, margin: 0 }}>
            Prophetic and spiritual dream analysis — symbols, warfare indicators, and prayer response.
          </p>
        </div>

        {/* input form */}
        {!report && (
          <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, padding: 24, marginBottom: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <label style={labelSt}>Dream Description *</label>
              <textarea
                value={dream}
                onChange={e => setDream(e.target.value)}
                rows={7}
                placeholder="Describe the dream in detail — what you saw, felt, heard, and any symbols or people that appeared…"
                style={{ ...inp, resize: 'vertical' as const }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={labelSt}>Dreamer Context (optional)</label>
              <input
                value={context}
                onChange={e => setContext(e.target.value)}
                placeholder="e.g. recurring dream, current spiritual battle, recent events or open doors…"
                style={inp}
              />
            </div>

            {error && (
              <div style={{ background: 'rgba(200,74,74,0.1)', border: '1px solid rgba(200,74,74,0.3)', borderRadius: 4, padding: '10px 14px', marginBottom: 16, color: '#e07070', fontFamily: mono, fontSize: 11, letterSpacing: '0.04em' }}>
                {error}
              </div>
            )}

            <button
              onClick={interpret}
              disabled={!dream.trim() || loading}
              style={{
                background: !dream.trim() || loading ? 'rgba(201,168,76,0.25)' : G,
                color: '#1a1305', border: 'none', borderRadius: 2,
                padding: '10px 24px', fontFamily: cinzel, fontSize: 13,
                fontWeight: 700, letterSpacing: '0.1em',
                cursor: !dream.trim() || loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '🌙 Interpreting…' : '🌙 Interpret Dream'}
            </button>
          </div>
        )}

        {/* report */}
        {report && v && (
          <div>
            <button
              onClick={() => { setReport(null); setDream(''); setContext('') }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, color: MUT, letterSpacing: '0.1em', marginBottom: 20, padding: 0 }}
            >
              ← NEW INTERPRETATION
            </button>

            {/* verdict + summary */}
            <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, padding: 24, marginBottom: 16 }}>
              <div style={{ marginBottom: 16 }}>
                <span style={{ background: v.bg, border: `1px solid ${v.color}55`, borderRadius: 2, padding: '4px 10px', fontFamily: mono, fontSize: 10, fontWeight: 600, letterSpacing: '0.12em', color: v.color }}>
                  {v.label}
                </span>
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: MUT, letterSpacing: '0.18em', marginBottom: 10 }}>SUMMARY</div>
              <p style={{ fontFamily: crimson, fontSize: 16, color: TXT, lineHeight: 1.7, margin: 0 }}>{report.summary}</p>
            </div>

            {/* sections */}
            {report.sections.map((sec, si) => (
              <div key={si} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, padding: 20, marginBottom: 10 }}>
                <div style={{ fontFamily: mono, fontSize: 10, color: G, letterSpacing: '0.15em', marginBottom: 12 }}>{sec.title.toUpperCase()}</div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                  {sec.items.map((item, ii) => (
                    <li key={ii} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: ii < sec.items.length - 1 ? `1px solid rgba(201,168,76,0.1)` : 'none' }}>
                      <span style={{ color: G, flexShrink: 0, fontFamily: mono, fontSize: 12, marginTop: 2 }}>›</span>
                      <span style={{ fontFamily: crimson, fontSize: 15, color: TXT, lineHeight: 1.6 }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <button
              onClick={() => setReport(null)}
              style={{ marginTop: 8, background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 2, padding: '8px 18px', fontFamily: cinzel, fontSize: 11, color: DIM, letterSpacing: '0.1em', cursor: 'pointer' }}
            >
              Interpret Another Dream
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
