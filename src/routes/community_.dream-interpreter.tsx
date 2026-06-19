import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { callCheckoutApi } from '@/lib/upgrade'
import { useIsDark } from '@/lib/use-is-dark'
import { getAccessLevel } from '@/lib/access'

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

// Light-mode equivalents — darker values for WCAG AA compliance on parchment backgrounds
const VERDICT_META_LIGHT: Record<string, { color: string; bg: string; label: string }> = {
  prophetic:   { color: '#2A6A96', bg: 'rgba(42,106,150,0.08)',   label: 'PROPHETIC' },
  warning:     { color: '#8B6914', bg: 'rgba(139,105,20,0.08)',   label: 'WARNING' },
  deliverance: { color: '#B03030', bg: 'rgba(176,48,48,0.08)',    label: 'DELIVERANCE NEEDED' },
  trauma:      { color: '#574B33', bg: 'rgba(87,75,51,0.08)',     label: 'SOULICAL / TRAUMA' },
  mixed:       { color: '#8B6914', bg: 'rgba(139,105,20,0.08)',   label: 'MIXED ANALYSIS' },
}

// Sections where items should render with prayer-directive styling
const PRAYER_SECTIONS = ['prayer response', 'prayer directive']

// Sections where items have "Symbol — meaning" format
const SYMBOL_SECTIONS = ['key symbols', 'symbols']

function exportToPrint(dreamText: string, report: DreamReport, v: { label: string }) {
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const sectionsHtml = report.sections.map(sec => `
    <div class="wri-section">
      <div class="wri-section-label">${sec.title.toUpperCase()}</div>
      <ul>${sec.items.map(item => `<li>${item}</li>`).join('')}</ul>
    </div>
  `).join('')

  const css = `
@media print {
  body * { visibility: hidden !important; }
  #wri-print-root, #wri-print-root * { visibility: visible !important; }
  #wri-print-root { position: absolute; left: 0; top: 0; width: 100%; }
}
#wri-print-root {
  display: none;
  font-family: Georgia, serif;
  color: #111;
  background: #fff;
  padding: 40px;
  max-width: 800px;
  margin: 0 auto;
}
@media print {
  #wri-print-root { display: block !important; }
}
#wri-print-root .wri-header { border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
#wri-print-root .wri-header h1 { font-family: Georgia, serif; font-size: 16px; font-weight: bold; letter-spacing: 0.1em; margin: 0 0 4px; text-transform: uppercase; }
#wri-print-root .wri-header .wri-date { font-size: 12px; color: #555; font-family: monospace; }
#wri-print-root .wri-verdict { display: inline-block; border: 1px solid #999; padding: 3px 10px; font-family: monospace; font-size: 11px; font-weight: bold; letter-spacing: 0.1em; margin-bottom: 20px; }
#wri-print-root .wri-dream-block { border-left: 3px solid #bbb; padding: 12px 16px; margin-bottom: 24px; background: #f9f9f9; }
#wri-print-root .wri-dream-block .wri-section-label { font-family: monospace; font-size: 10px; font-weight: bold; letter-spacing: 0.14em; text-transform: uppercase; color: #555; margin-bottom: 8px; }
#wri-print-root .wri-dream-block p { font-size: 15px; line-height: 1.7; margin: 0; color: #111; }
#wri-print-root .wri-summary-block { margin-bottom: 24px; }
#wri-print-root .wri-summary-block .wri-section-label { font-family: monospace; font-size: 10px; font-weight: bold; letter-spacing: 0.14em; text-transform: uppercase; color: #555; margin-bottom: 8px; }
#wri-print-root .wri-summary-block p { font-size: 15px; line-height: 1.7; margin: 0; }
#wri-print-root .wri-section { margin-bottom: 20px; page-break-inside: avoid; }
#wri-print-root .wri-section-label { font-family: monospace; font-size: 10px; font-weight: bold; letter-spacing: 0.14em; text-transform: uppercase; color: #333; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
#wri-print-root .wri-section ul { margin: 0; padding-left: 20px; }
#wri-print-root .wri-section ul li { font-size: 14px; line-height: 1.6; margin-bottom: 4px; }
#wri-print-root .wri-footer { border-top: 1px solid #ccc; margin-top: 32px; padding-top: 12px; font-family: monospace; font-size: 10px; color: #888; text-align: center; letter-spacing: 0.08em; }
  `

  const styleEl = document.createElement('style')
  styleEl.id = 'wri-print-styles'
  styleEl.textContent = css
  document.head.appendChild(styleEl)

  let rootEl = document.getElementById('wri-print-root')
  if (!rootEl) {
    rootEl = document.createElement('div')
    rootEl.id = 'wri-print-root'
    document.body.appendChild(rootEl)
  }

  rootEl.innerHTML = `
    <div class="wri-header">
      <h1>War Room Intel — Dream Analysis Report</h1>
      <div class="wri-date">${date}</div>
    </div>
    <div class="wri-verdict">${v.label}</div>
    <div class="wri-dream-block">
      <div class="wri-section-label">Dream Description</div>
      <p>${dreamText.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')}</p>
    </div>
    <div class="wri-summary-block">
      <div class="wri-section-label">Summary</div>
      <p>${report.summary.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
    </div>
    ${sectionsHtml}
    <div class="wri-footer">War Room Intel · warroomintel.com · Intelligence for the Fight</div>
  `

  window.print()

  window.addEventListener('afterprint', () => {
    styleEl.remove()
    rootEl?.remove()
  }, { once: true })
}

// Renders a single section item with section-aware typography
function SectionItem({ item, sectionKey, gold }: { item: string; sectionKey: string; gold: string }) {
  const isPrayer  = PRAYER_SECTIONS.includes(sectionKey)
  const isSymbol  = SYMBOL_SECTIONS.includes(sectionKey)

  // Split on em-dash for symbol sections: "Symbol — meaning"
  const emDashIdx = isSymbol ? item.indexOf(' — ') : -1
  const hasDash   = emDashIdx !== -1

  // Detect scripture pattern: "Book Chapter:Verse — quote" at end of any item
  const scriptureMatch = item.match(/([1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s\d+:\d+[-\d]*)\s*[—–-]\s*(.+)$/)

  if (isPrayer) {
    return (
      <li style={{ listStyle: 'none', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
        <div style={{
          borderLeft: `3px solid ${gold}`,
          paddingLeft: 16,
          fontFamily: 'Georgia, serif',
          fontSize: 17,
          color: 'var(--t-0)',
          lineHeight: 1.75,
        }}>
          {item}
        </div>
      </li>
    )
  }

  if (isSymbol && hasDash) {
    const symbolName = item.slice(0, emDashIdx).trim()
    const meaning    = item.slice(emDashIdx + 3).trim()

    // Check if meaning itself contains a scripture reference
    const scriptureSplit = meaning.match(/^(.+?)\s*[—–|]\s*((?:[1-3]?\s?[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s\d+:\d+.*)(?:\s*[—–-]\s*.+)?)$/)

    return (
      <li style={{ listStyle: 'none', marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
        <span style={{ fontFamily: mono, fontSize: 12, color: gold, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          {symbolName}
        </span>
        {scriptureSplit ? (
          <>
            <span style={{ color: 'var(--t-1)', fontSize: 15, lineHeight: 1.65, display: 'block' }}>
              {scriptureSplit[1].trim()}
            </span>
            <span style={{ fontStyle: 'italic', color: 'var(--gold-hi, #e5c572)', fontSize: 13, marginTop: 4, display: 'block' }}>
              {scriptureSplit[2].trim()}
            </span>
          </>
        ) : (
          <span style={{ color: 'var(--t-1)', fontSize: 15, lineHeight: 1.65, display: 'block' }}>
            {meaning}
          </span>
        )}
      </li>
    )
  }

  // Default item — scripture detection for prophetic/warfare sections
  if (scriptureMatch && !isSymbol) {
    const beforeRef = item.slice(0, item.indexOf(scriptureMatch[0])).trim()
    return (
      <li style={{ listStyle: 'none', marginBottom: 14, paddingBottom: 14, borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 6, height: 6, background: gold, flexShrink: 0, marginTop: 7 }} />
          <div>
            {beforeRef && (
              <span style={{ color: 'var(--t-1)', fontSize: 15, lineHeight: 1.65, display: 'block' }}>
                {beforeRef}
              </span>
            )}
            <span style={{ fontStyle: 'italic', color: 'var(--gold-hi, #e5c572)', fontSize: 13, marginTop: 4, display: 'block' }}>
              {scriptureMatch[0].trim()}
            </span>
          </div>
        </div>
      </li>
    )
  }

  return (
    <li style={{ listStyle: 'none', marginBottom: 10, paddingBottom: 10, borderBottom: '1px solid rgba(201,168,76,0.08)' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ width: 6, height: 6, background: gold, flexShrink: 0, marginTop: 7 }} />
        <span style={{ color: 'var(--t-1)', fontSize: 15, lineHeight: 1.65 }}>{item}</span>
      </div>
    </li>
  )
}

function DreamInterpreterPage() {
  const { getToken }    = useAuth()
  const { user, isLoaded } = useUser()

  const [dream, setDream]     = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [report, setReport]   = useState<DreamReport | null>(null)
  const [submittedDream, setSubmittedDream] = useState('')
  const [progress, setProgress] = useState(0)
  const [stage, setStage]       = useState('')
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // collapsible state: keyed by section index, default true (open)
  const [openSections, setOpenSections] = useState<Record<number, boolean>>({})

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  // Theme — must be called before any conditional return
  const isDark = useIsDark()

  const bg    = isDark ? BG    : '#FAF8F5'
  const surf  = isDark ? SURF  : '#FFFFFF'
  const surf2 = isDark ? SURF2 : '#F0EBE0'
  const bdr   = isDark ? BDR   : '#D8D1BE'
  const txt   = isDark ? TXT   : '#1F1B12'
  const dim   = isDark ? DIM   : '#574B33'
  const mut   = isDark ? MUT   : '#8B7355'
  const gold  = isDark ? G     : '#8B6914'
  const VERDICT = isDark ? VERDICT_META : VERDICT_META_LIGHT

  const tier     = ((user?.publicMetadata?.tier as string) || '').toLowerCase()
  const role     = (user?.publicMetadata?.role as string) || ''
  const hasAccess = getAccessLevel({ tier, role }) >= 1
  const dreUserName      = user?.firstName || user?.username || ''
  const dreUserTierLabel = tier === 'watchman' || tier === 'free' || !tier ? 'WATCHMAN' : tier.toUpperCase()

  function toggleSection(idx: number) {
    setOpenSections(prev => ({ ...prev, [idx]: !(prev[idx] ?? true) }))
  }

  function isSectionOpen(idx: number) {
    return openSections[idx] ?? true
  }

  async function interpret() {
    if (!dream.trim() || loading) return
    setLoading(true)
    setError(null)
    setReport(null)
    setProgress(0)
    setStage('queuing')
    setOpenSections({})
    const capturedDream = dream.trim()

    try {
      const token = await getToken()
      const res = await fetch('/api/dream-interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ dreamDescription: capturedDream, dreamerContext: context.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Interpretation failed'); setLoading(false); return }

      const jobId: string = data.jobId
      setSubmittedDream(capturedDream)

      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        try {
          const pollToken = await getToken()
          const pollRes = await fetch(`/api/job-status?jobId=${jobId}`, {
            headers: { Authorization: `Bearer ${pollToken}` },
          })
          if (!pollRes.ok) return
          const job = await pollRes.json()
          setProgress(job.progress ?? 0)
          setStage(job.stage ?? '')

          if (job.status === 'complete') {
            clearInterval(pollRef.current!)
            pollRef.current = null
            const rpt = job.result_json?.report
            if (rpt) { setReport(rpt) } else { setError('Interpretation returned no report') }
            setLoading(false)
          } else if (job.status === 'failed') {
            clearInterval(pollRef.current!)
            pollRef.current = null
            setError(job.error_message || 'Interpretation failed')
            setLoading(false)
          }
        } catch { /* network hiccup — keep polling */ }
      }, 3000)
    } catch (e: any) {
      setError(e.message || 'Network error')
      setLoading(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const, background: surf2,
    border: `1px solid ${bdr}`, borderRadius: 4, padding: '10px 12px',
    color: txt, fontFamily: crimson, fontSize: 15, outline: 'none', lineHeight: 1.5,
  }

  const labelSt: React.CSSProperties = {
    display: 'block', fontFamily: mono, fontSize: 10, color: mut,
    letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 6,
  }

  if (!isLoaded) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: cinzel, color: mut, fontSize: 11, letterSpacing: '0.18em' }}>LOADING…</div>
    </div>
  )

  if (!hasAccess) return (
    <div style={{ minHeight: '100vh', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' as const }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, color: mut, letterSpacing: '0.18em', marginBottom: 16 }}>RESTRICTED ACCESS</div>
        <h1 style={{ fontFamily: cinzel, fontSize: 24, color: gold, fontWeight: 700, margin: '0 0 12px' }}>Dream Interpreter</h1>
        <p style={{ fontFamily: crimson, fontSize: 16, color: dim, lineHeight: 1.6, margin: '0 0 24px' }}>
          Prophetic and spiritual dream analysis is available to Soldier tier and above.
        </p>
        <button onClick={() => { callCheckoutApi('soldier', getToken) }} style={{ display: 'inline-block', background: G, color: '#1a1305', padding: '9px 20px', fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', border: 'none', cursor: 'pointer', borderRadius: 2, marginRight: 12 }}>
          UPGRADE MEMBERSHIP
        </button>
        <a href="/community" style={{ display: 'inline-block', background: 'transparent', border: `1px solid ${bdr}`, color: dim, padding: '8px 18px', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', textDecoration: 'none', borderRadius: 2 }}>
          ← Return to Community
        </a>
      </div>
    </div>
  )

  const v = report ? (VERDICT[report.verdict] ?? VERDICT.mixed) : null

  return (
    <CommunitySidebarShell activeItem="Dream Interpreter" userName={dreUserName} userTierLabel={dreUserTierLabel}>
    <div style={{ color: txt }}>
      <div style={{ maxWidth: 820, margin: '0 auto', padding: '40px 24px 100px' }}>
        {/* page title */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: mono, fontSize: 11, color: mut, letterSpacing: '0.18em', marginBottom: 8 }}>INTELLIGENCE TOOL</div>
          <h1 style={{ fontFamily: cinzel, fontSize: 28, color: gold, fontWeight: 700, margin: '0 0 8px' }}>Dream Interpreter</h1>
          <p style={{ fontFamily: crimson, fontSize: 16, color: dim, lineHeight: 1.6, margin: 0 }}>
            Prophetic and spiritual dream analysis — symbols, warfare indicators, and prayer response.
          </p>
        </div>

        {/* input form */}
        {!report && (
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 4, padding: 24, marginBottom: 24, boxShadow: isDark ? 'none' : '0 2px 12px rgba(45,41,36,0.06)' }}>
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
              {loading
                ? `🌙 ${stage === 'assembling_context' ? 'Gathering Intel…' : stage === 'generating' ? `Interpreting… ${progress}%` : 'Queuing…'}`
                : '🌙 Interpret Dream'}
            </button>
          </div>
        )}

        {/* report */}
        {report && v && (
          <div>
            <button
              onClick={() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } setReport(null); setDream(''); setContext(''); setSubmittedDream(''); setOpenSections({}); setProgress(0); setStage('') }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, color: mut, letterSpacing: '0.1em', marginBottom: 20, padding: 0 }}
            >
              ← NEW INTERPRETATION
            </button>

            {/* dream description */}
            <div style={{ background: surf, border: `1px solid ${bdr}`, borderLeft: `3px solid rgba(201,168,76,0.4)`, borderRadius: 4, padding: 20, marginBottom: 12, boxShadow: isDark ? 'none' : '0 1px 4px rgba(45,41,36,0.05)' }}>
              <div style={{ fontFamily: mono, fontSize: 10, color: mut, letterSpacing: '0.15em', marginBottom: 10 }}>DREAM DESCRIPTION</div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--t-0)', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' as const }}>
                {submittedDream}
              </p>
            </div>

            {/* verdict + summary — NOT collapsible */}
            <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 4, padding: 24, marginBottom: 12, boxShadow: isDark ? 'none' : '0 2px 12px rgba(45,41,36,0.06)' }}>
              {/* source classification badge */}
              <div style={{ marginBottom: 16 }}>
                <span style={{
                  background: v.bg,
                  border: `1px solid ${v.color}55`,
                  borderRadius: 2,
                  padding: '4px 12px',
                  fontFamily: mono,
                  fontSize: 22,
                  fontWeight: 700,
                  letterSpacing: 3,
                  color: v.color,
                  display: 'inline-block',
                }}>
                  {v.label}
                </span>
              </div>
              <div style={{ fontFamily: mono, fontSize: 9, color: mut, letterSpacing: '0.18em', marginBottom: 10 }}>SUMMARY</div>
              <p style={{ fontFamily: 'Georgia, serif', fontSize: 16, color: 'var(--t-0)', lineHeight: 1.7, margin: 0 }}>{report.summary}</p>
            </div>

            {/* collapsible sections */}
            {report.sections.map((sec, si) => {
              const open = isSectionOpen(si)
              const sectionKey = sec.title.toLowerCase()
              return (
                <div key={si} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 4, padding: 20, marginBottom: 10, boxShadow: isDark ? 'none' : '0 1px 4px rgba(45,41,36,0.04)' }}>
                  {/* clickable header row */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleSection(si)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && toggleSection(si)}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      cursor: 'pointer',
                      paddingBottom: open ? 12 : 0,
                      userSelect: 'none' as const,
                    }}
                  >
                    <span style={{
                      fontFamily: mono,
                      fontSize: 11,
                      color: gold,
                      letterSpacing: 1.6,
                      fontWeight: 700,
                      textTransform: 'uppercase' as const,
                    }}>
                      {sec.title.toUpperCase()}
                    </span>
                    {open
                      ? <ChevronUp size={16} color={gold} />
                      : <ChevronDown size={16} color={gold} />
                    }
                  </div>

                  {/* content — hidden when collapsed */}
                  {open && (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                      {sec.items.map((item, ii) => (
                        <SectionItem key={ii} item={item} sectionKey={sectionKey} gold={gold} />
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}

            {/* export + reset */}
            <button
              onClick={() => exportToPrint(submittedDream, report, v)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', height: 40, marginTop: 16,
                background: 'transparent', border: `1px solid rgba(201,168,76,0.45)`,
                borderRadius: 2, cursor: 'pointer',
                fontFamily: cinzel, fontSize: 12, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                color: gold,
              }}
            >
              Export Report (Print / PDF)
            </button>

            <button
              onClick={() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } setReport(null); setSubmittedDream(''); setOpenSections({}); setProgress(0); setStage('') }}
              style={{ marginTop: 10, background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 2, padding: '8px 18px', fontFamily: cinzel, fontSize: 11, color: dim, letterSpacing: '0.1em', cursor: 'pointer', width: '100%' }}
            >
              Interpret Another Dream
            </button>
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      <style>{`@media(max-width:640px){.wri-subnav{display:flex!important}}`}</style>
      <nav className="wri-subnav" style={{ display:'none', position:'fixed', bottom:0, left:0, right:0, height:'calc(var(--bottom-nav-h) + env(safe-area-inset-bottom, 0px))', background: bg, borderTop:'1px solid rgba(201,168,76,0.25)', zIndex:200, alignItems:'center', justifyContent:'space-around', paddingLeft:'4px', paddingRight:'4px', paddingBottom:'env(safe-area-inset-bottom, 0px)' }}>
        <a href="/community" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color: mut, textDecoration:'none', fontSize:9, fontFamily:'var(--font-label)', letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
          HOME
        </a>
        <a href="/community#database" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color: mut, textDecoration:'none', fontSize:9, fontFamily:'var(--font-label)', letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          INTEL
        </a>
        <div style={{ width:44, height:44, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
          <a href="/community" style={{ color:'#0d0b14', fontSize:18, lineHeight:1, textDecoration:'none', fontFamily:"'Cinzel',serif" }}>⚔</a>
        </div>
        <a href="/community#forum" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color: mut, textDecoration:'none', fontSize:9, fontFamily:'var(--font-label)', letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="2" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
          OPS
        </a>
        <a href="/community" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color: mut, textDecoration:'none', fontSize:9, fontFamily:'var(--font-label)', letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          AI
        </a>
      </nav>
    </div>
    </CommunitySidebarShell>
  )
}
