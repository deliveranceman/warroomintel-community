import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useUser, useAuth } from '@clerk/tanstack-start'

export const Route = createFileRoute('/investigate')({
  component: InvestigatePage,
})

const tierLevel = (t: string) => ({ free: 0, soldier: 1, commander: 2, general: 3 }[t?.toLowerCase()] ?? 0)
const atLeast = (userTier: string, required: string) => tierLevel(userTier) >= tierLevel(required)

function InvestigatePage() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<InvestigationResult | null>(null)
  const [error, setError] = useState('')

  const userTier = (user?.publicMetadata?.tier as string) || 'free'

  if (!atLeast(userTier, 'commander')) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#0D0B14', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>🔒</div>
          <h2 style={{ fontFamily: 'Cinzel, serif', color: '#C9A84C', fontSize: '22px', marginBottom: '12px' }}>
            Commander Tier Required
          </h2>
          <p style={{ color: '#8B7355', fontSize: '16px', lineHeight: '1.7', marginBottom: '28px', fontFamily: 'Crimson Pro, serif' }}>
            The Symptom Investigator is an AI-powered operational intelligence tool available to Commander and General members.
            Upgrade to access real-time spirit analysis, deliverance sequencing, and session support.
          </p>
          <a href="https://buy.stripe.com/6oU8wI1Sg4Xt1ZrgphfrW01" style={{
            display: 'inline-block',
            background: '#C9A84C',
            color: '#0D0B14',
            fontFamily: 'Cinzel, serif',
            fontSize: '13px',
            fontWeight: '700',
            letterSpacing: '0.08em',
            padding: '12px 32px',
            borderRadius: '6px',
            textDecoration: 'none',
          }}>
            Upgrade to Commander — $39/mo
          </a>
        </div>
      </div>
    )
  }

  async function handleInvestigate() {
    if (!input.trim()) return
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ symptoms: input }),
      })
      if (!res.ok) throw new Error('Investigation failed')
      const data = await res.json()
      setResult(data)
    } catch {
      setError('Investigation failed. Check connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0D0B14',
      padding: '40px 20px',
      fontFamily: 'Crimson Pro, serif',
    }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '11px', color: '#C9A84C', letterSpacing: '0.2em', textTransform: 'uppercase' as const, marginBottom: '12px' }}>
            ⚔ War Room Intel
          </div>
          <h1 style={{ fontFamily: 'Cinzel, serif', color: '#E8D5B0', fontSize: '28px', fontWeight: '700', marginBottom: '8px' }}>
            Symptom Investigator
          </h1>
          <p style={{ color: '#8B7355', fontSize: '16px', lineHeight: '1.6' }}>
            Describe what you are observing — symptoms, manifestations, dreams, emotional patterns, physical reactions.
            The system will identify probable spirits and suggest a deliverance sequence.
          </p>
        </div>

        {/* Input area */}
        <div style={{
          background: 'rgba(201,168,76,0.04)',
          border: '1px solid rgba(201,168,76,0.2)',
          borderRadius: '10px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <label style={{ display: 'block', fontSize: '11px', color: '#8B7355', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '10px' }}>
            Observed Symptoms / Manifestations
          </label>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Example: Recurring nightmares, pressure on chest, irrational fear of abandonment, history of sexual abuse, difficulty feeling God's presence, chronic migraines..."
            rows={6}
            style={{
              width: '100%',
              background: 'rgba(13,11,20,0.8)',
              border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '6px',
              color: '#E8D5B0',
              fontSize: '15px',
              padding: '14px',
              fontFamily: 'Crimson Pro, serif',
              lineHeight: '1.6',
              resize: 'vertical' as const,
              outline: 'none',
              boxSizing: 'border-box' as const,
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
            <span style={{ fontSize: '12px', color: '#5a4f3a' }}>
              Be specific — the more detail, the more accurate the intelligence.
            </span>
            <button
              onClick={handleInvestigate}
              disabled={loading || !input.trim()}
              style={{
                background: loading ? 'rgba(201,168,76,0.3)' : '#C9A84C',
                color: loading ? '#8B7355' : '#0D0B14',
                border: 'none',
                borderRadius: '6px',
                padding: '10px 28px',
                fontSize: '13px',
                fontFamily: 'Cinzel, serif',
                fontWeight: '700',
                letterSpacing: '0.08em',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {loading ? '⚔ Analyzing...' : '⚔ Investigate'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: '6px', padding: '12px 16px', color: '#f87171', marginBottom: '24px' }}>
            {error}
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#8B7355' }}>
            <div style={{ fontSize: '28px', marginBottom: '12px' }}>⚔</div>
            <div style={{ fontFamily: 'Cinzel, serif', fontSize: '14px', letterSpacing: '0.1em' }}>
              Running intelligence analysis...
            </div>
          </div>
        )}

        {/* Results */}
        {result && !loading && <InvestigationResults result={result} />}

      </div>
    </div>
  )
}

interface InvestigationResult {
  summary: string
  probableSpirits: Array<{ name: string; confidence: 'High' | 'Medium' | 'Low'; reason: string; category: string }>
  entryPoints: string[]
  deliveranceSequence: string[]
  counterScriptures: string[]
  warningFlags: string[]
}

const CONFIDENCE_COLORS = {
  High:   { bg: 'rgba(220,38,38,0.15)', text: '#f87171', border: 'rgba(220,38,38,0.3)' },
  Medium: { bg: 'rgba(201,168,76,0.1)', text: '#C9A84C', border: 'rgba(201,168,76,0.25)' },
  Low:    { bg: 'rgba(99,102,241,0.1)', text: '#a5b4fc', border: 'rgba(99,102,241,0.25)' },
}

const HIERARCHY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  'Fear / Rejection':    { bg: '#1a0f2e', text: '#c084fc', border: '#7c3aed' },
  'Marine Kingdom':      { bg: '#0a1628', text: '#38bdf8', border: '#0284c7' },
  'Occult / Witchcraft': { bg: '#1a0a0a', text: '#f87171', border: '#dc2626' },
  'Freemasonry':         { bg: '#0d1117', text: '#d4a017', border: '#92400e' },
  'Perversion':          { bg: '#1a0a1a', text: '#f472b6', border: '#9d174d' },
  'Death / Destruction': { bg: '#0a0a0a', text: '#9ca3af', border: '#374151' },
  'Religious':           { bg: '#0f1a0a', text: '#86efac', border: '#15803d' },
  'General Oppression':  { bg: '#0f0f1a', text: '#a5b4fc', border: '#4338ca' },
}

function InvestigationResults({ result }: { result: InvestigationResult }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Intel Summary */}
      <section style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '20px 24px' }}>
        <div style={{ fontSize: '10px', color: '#8B7355', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '10px' }}>Intelligence Summary</div>
        <p style={{ color: '#E8D5B0', fontSize: '16px', lineHeight: '1.7', margin: 0 }}>{result.summary}</p>
      </section>

      {/* Probable Spirits */}
      {result.probableSpirits?.length > 0 && (
        <section>
          <div style={{ fontSize: '10px', color: '#8B7355', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '12px' }}>
            Probable Entities ({result.probableSpirits.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {result.probableSpirits.map((spirit, i) => {
              const conf = CONFIDENCE_COLORS[spirit.confidence] || CONFIDENCE_COLORS.Low
              const cat = HIERARCHY_COLORS[spirit.category] || HIERARCHY_COLORS['General Oppression']
              return (
                <div key={i} style={{
                  background: 'rgba(13,11,20,0.8)',
                  border: `1px solid ${conf.border}`,
                  borderLeft: `3px solid ${conf.border}`,
                  borderRadius: '8px',
                  padding: '14px 18px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: '12px',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' as const }}>
                      <span style={{ fontFamily: 'Cinzel, serif', color: '#E8D5B0', fontSize: '15px', fontWeight: '600' }}>
                        {spirit.name}
                      </span>
                      <span style={{
                        fontSize: '10px', padding: '2px 8px', borderRadius: '999px',
                        backgroundColor: cat.bg, color: cat.text, border: `1px solid ${cat.border}`,
                        fontFamily: 'Cinzel, serif', letterSpacing: '0.04em',
                      }}>
                        {spirit.category}
                      </span>
                    </div>
                    <p style={{ color: '#8B7355', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>{spirit.reason}</p>
                  </div>
                  <span style={{
                    fontSize: '11px', padding: '3px 10px', borderRadius: '999px', whiteSpace: 'nowrap' as const,
                    backgroundColor: conf.bg, color: conf.text, border: `1px solid ${conf.border}`,
                    fontFamily: 'Cinzel, serif',
                  }}>
                    {spirit.confidence}
                  </span>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Entry Points */}
      {result.entryPoints?.length > 0 && (
        <section style={{ background: 'rgba(13,11,20,0.6)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ fontSize: '10px', color: '#8B7355', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '12px' }}>Likely Entry Points</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '8px' }}>
            {result.entryPoints.map((ep, i) => (
              <span key={i} style={{
                fontSize: '13px', padding: '4px 12px', borderRadius: '999px',
                background: 'rgba(201,168,76,0.08)', color: '#C9A84C',
                border: '1px solid rgba(201,168,76,0.2)',
              }}>
                {ep}
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Deliverance Sequence */}
      {result.deliveranceSequence?.length > 0 && (
        <section style={{ background: 'rgba(13,11,20,0.6)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ fontSize: '10px', color: '#8B7355', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '14px' }}>Suggested Deliverance Sequence</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {result.deliveranceSequence.map((step, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <span style={{
                  minWidth: '24px', height: '24px', borderRadius: '50%',
                  background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
                  color: '#C9A84C', fontSize: '11px', fontFamily: 'Cinzel, serif', fontWeight: '700',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {i + 1}
                </span>
                <span style={{ color: '#E8D5B0', fontSize: '14px', lineHeight: '1.6', paddingTop: '2px' }}>{step}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Counter Scriptures */}
      {result.counterScriptures?.length > 0 && (
        <section style={{ background: 'rgba(0,30,10,0.4)', border: '1px solid rgba(134,239,172,0.2)', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ fontSize: '10px', color: '#86efac', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '12px' }}>📖 Counter Scriptures</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {result.counterScriptures.map((s, i) => (
              <div key={i} style={{ color: '#86efac', fontSize: '14px', fontFamily: 'Crimson Pro, serif', lineHeight: '1.5' }}>
                {s}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Warning Flags */}
      {result.warningFlags?.length > 0 && (
        <section style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '10px', padding: '20px 24px' }}>
          <div style={{ fontSize: '10px', color: '#f87171', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '12px' }}>⚠ Warning Flags</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {result.warningFlags.map((w, i) => (
              <div key={i} style={{ color: '#f87171', fontSize: '14px', lineHeight: '1.5' }}>• {w}</div>
            ))}
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <p style={{ fontSize: '12px', color: '#3a3228', textAlign: 'center' as const, lineHeight: '1.6', marginTop: '8px' }}>
        This analysis is an intelligence aid for trained ministers. Always lead with prayer, discernment, and the Holy Spirit.
        This tool does not replace ministerial judgment.
      </p>

    </div>
  )
}
