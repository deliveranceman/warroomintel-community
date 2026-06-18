import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useEffect, useRef } from 'react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'
import { UpgradeGate } from '@/components/UpgradeGate'
import { FlagButton } from '@/components/FlagButton'
import { getAccessLevel } from '@/lib/access'

export const Route = createFileRoute('/community_/spirits/$spiritId')({
  ssr: false,
  component: SpiritDossierPage,
})

const G       = 'var(--gold)'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

// ── Accent color by biblical rank keyword ───────────────────────────────────
const CLASS_COLOR: Record<string, string> = {
  Strongman:    '#C9A84C',
  Familiar:     '#4a9eff',
  Marine:       '#a855f7',
  Rejection:    '#ff6b6b',
  Generational: '#22c55e',
  Religious:    '#f97316',
  Sexual:       '#ec4899',
}

function getColor(cls: string): string {
  for (const [key, val] of Object.entries(CLASS_COLOR)) {
    if (cls?.toLowerCase().includes(key.toLowerCase())) return val
  }
  return '#C9A84C'
}

// ── Hierarchy category color palettes ──────────────────────────────────────
const HIERARCHY_COLORS_DARK: Record<string, { bg: string; text: string; border: string }> = {
  'Fear / Rejection':    { bg: '#1a0f2e', text: '#c084fc', border: '#7c3aed' },
  'Marine Kingdom':      { bg: '#0a1628', text: '#38bdf8', border: '#0284c7' },
  'Occult / Witchcraft': { bg: '#1a0a0a', text: '#f87171', border: '#dc2626' },
  'Freemasonry':         { bg: '#0d1117', text: '#d4a017', border: '#92400e' },
  'Perversion':          { bg: '#1a0a1a', text: '#f472b6', border: '#9d174d' },
  'Death / Destruction': { bg: '#0a0a0a', text: '#9ca3af', border: '#374151' },
  'Religious':           { bg: '#0f1a0a', text: '#86efac', border: '#15803d' },
  'General Oppression':  { bg: '#0f0f1a', text: '#a5b4fc', border: '#4338ca' },
}

function getHierarchyColors(cat: string) {
  return HIERARCHY_COLORS_DARK[cat] || HIERARCHY_COLORS_DARK['General Oppression']
}

// ── Spirit name parser (for cluster/companion pills) ───────────────────────
const STOP_WORDS = new Set([
  'and','the','with','through','by','of','in','a','an','all','its','their','this','that',
  'these','those','maintains','control','operates','functions','works','also','known','as',
  'or','but','for','on','at','to','from','into','over','under','both','often','may','can',
])

function parseSpiritNames(text: string): string[] {
  if (!text) return []
  let raw = text
  const subMatch = raw.match(/[Ss]ubordinates?[:\s]+(.+)/s)
  if (subMatch) raw = subMatch[1]
  raw = raw.replace(/[Bb]oss[:\s]+[^.]+\.\s*/g, '')
  const parts = raw.split(/[,;]|\band\b/)
  return parts
    .map(p => p.trim().replace(/^[-•*\d.]+\s*/, '').replace(/[.!?]$/, '').trim())
    .filter(p => p.length > 1 && p.length <= 40)
    .filter(p => !STOP_WORDS.has(p.toLowerCase()))
    .filter((p, i, arr) => arr.indexOf(p) === i)
}

// ── Tier ladder ────────────────────────────────────────────────────────────
const TIER_LEVEL: Record<string, number> = {
  watchman: 0, free: 0,
  soldier: 1, charter_soldier: 1,
  commander: 2, charter_commander: 2,
  general: 3, founding_general: 3,
  minister: 4, commandant: 5,
}

// ── PDF export ─────────────────────────────────────────────────────────────
function formatSpiritDossierForExport(spirit: any): string {
  const lines: string[] = []
  lines.push(`# ${spirit.name || 'Unknown Spirit'}`)
  if (spirit.aka) lines.push(`*Also known as: ${spirit.aka}*`)
  if (spirit.equivalents) lines.push(`*Cross-cultural equivalents: ${spirit.equivalents}*`)
  if (spirit.phonetic) lines.push(`*Pronunciation: /${spirit.phonetic}/*`)
  const meta: string[] = []
  if (spirit.kingdom) meta.push(`Kingdom: ${spirit.kingdom}`)
  if (spirit.biblicalRank) meta.push(`Rank: ${spirit.biblicalRank}`)
  if (spirit.typeRank) meta.push(`Type: ${spirit.typeRank}`)
  if (spirit.isGenerational) meta.push('Generational')
  if (spirit.isTerritorial) meta.push('Territorial')
  if (meta.length) lines.push(`\n${meta.join(' · ')}`)
  lines.push('')
  const section = (label: string, value: string | string[] | null | undefined) => {
    if (!value || (Array.isArray(value) && !value.length) || (typeof value === 'string' && !value.trim())) return
    lines.push(`## ${label}`)
    if (Array.isArray(value)) { value.forEach(v => { if (v) lines.push(`- ${v}`) }) }
    else { lines.push(value) }
    lines.push('')
  }
  section('Overview', spirit.description)
  section('Assignment', spirit.assignment)
  section('Etymology', spirit.etymologyNotes)
  section('Cultural Presence', spirit.culturalPresence)
  section('Manifestations', spirit.manifestation)
  section('Entry Points & Gateways', spirit.entryPoints)
  section('Legal Rights', spirit.legalRights)
  section('Scripture References', spirit.scripture)
  section('Scripture Context', spirit.scriptureContext)
  section('Counter-Scriptures', spirit.counterScriptures)
  section('Prayer Points', spirit.prayerPoints)
  section('Session Indicators', spirit.sessionIndicators)
  section('Resistance Signature', spirit.resistanceSignature)
  section('Transmission Vectors', spirit.transmissionVectors)
  section('Companion Spirits', spirit.companionSpirits)
  section('Hierarchical Position', [spirit.hierarchyCategory, spirit.parentStrongman ? `Under: ${spirit.parentStrongman}` : ''].filter(Boolean).join(' · ') || null)
  section('Deliverance Sequence', spirit.deliveranceSequence)
  section('Primary Battlefield', spirit.primaryBattlefield)
  section('Demonic Agreements', spirit.demonicAgreements)
  section('Institutional Expression', spirit.institutionalExpression)
  section('Symptoms', spirit.symptoms)
  section('Aftercare Notes', spirit.aftercareNotes)
  section('Operational Notes', spirit.operationalNotes)
  section('WRI Exorcist Notes', spirit.wriNotes)
  section('Archaeology Notes', spirit.archaeologyNotes)
  section('Source & Origin', spirit.sourceOrigin)
  return lines.join('\n')
}

function exportSpiritToPDF(spirit: any) {
  const content = formatSpiritDossierForExport(spirit)
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const bodyHtml = content
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>')
  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>War Room Intel — ${spirit.name || 'Spirit Dossier'}</title>
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet"/>
<style>
  body { margin: 0; background: #fff; color: #1a1408; font-family: 'Crimson Text', Georgia, serif; font-size: 15px; line-height: 1.7; }
  .page { max-width: 720px; margin: 0 auto; padding: 48px 48px 64px; }
  .header { border-bottom: 2px solid #C9A84C; padding-bottom: 20px; margin-bottom: 32px; display: flex; justify-content: space-between; align-items: flex-end; }
  .brand { font-family: 'Cinzel', serif; font-size: 22px; font-weight: 700; color: #1a1408; letter-spacing: 0.08em; }
  .brand span { color: #C9A84C; }
  .classification { font-family: 'Cinzel', serif; font-size: 9px; letter-spacing: 0.25em; color: #C9A84C; text-transform: uppercase; border: 1px solid #C9A84C; padding: 3px 8px; }
  .date { font-family: 'Cinzel', serif; font-size: 10px; color: #8a7a60; letter-spacing: 0.1em; margin-top: 6px; }
  h1 { font-family: 'Cinzel', serif; font-size: 16px; font-weight: 700; color: #1a1408; letter-spacing: 0.08em; margin: 24px 0 12px; }
  h2 { font-family: 'Cinzel', serif; font-size: 14px; font-weight: 600; color: #3a2a10; letter-spacing: 0.06em; margin: 20px 0 10px; }
  h3 { font-family: 'Cinzel', serif; font-size: 12px; font-weight: 600; color: #5a4a30; letter-spacing: 0.06em; margin: 16px 0 8px; }
  p { margin: 0 0 12px; }
  ul { padding-left: 0; list-style: none; margin: 8px 0 12px; }
  li::before { content: '⚔ '; color: #C9A84C; }
  li { margin: 4px 0; padding-left: 16px; text-indent: -16px; }
  strong { color: #1a1408; font-weight: 600; }
  em { color: #5a4a30; }
  .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid #d4b896; display: flex; justify-content: space-between; font-family: 'Cinzel', serif; font-size: 9px; color: #8a7a60; letter-spacing: 0.1em; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <div class="brand">WAR ROOM <span>INTEL</span></div>
      <div class="date">${date}</div>
    </div>
    <div class="classification">SPIRIT DOSSIER</div>
  </div>
  <div>${bodyHtml}</div>
  <div class="footer">
    <span>War Room Intel · A Ministry of Staffordtown Church · Copperhill, TN</span>
    <span>warroomintel.com</span>
  </div>
</div>
<script>window.onload = () => window.print()</script>
</body>
</html>`
  const win = window.open('', '_blank')
  if (win) { win.document.write(html); win.document.close() }
}

// ── Component ───────────────────────────────────────────────────────────────
function SpiritDossierPage() {
  const { spiritId } = Route.useParams()
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()

  const [demon, setDemon] = useState<any>(null)
  const [allDemons, setAllDemons] = useState<any[]>([])
  const [spiritResources, setSpiritResources] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')

  const [tab, setTab] = useState<'overview' | 'intelligence' | 'warfare' | 'scholarly' | 'protocol'>('overview')

  // Protocol state
  const [protocolMode, setProtocolMode] = useState<'spirit' | 'manifestation'>('spirit')
  const [manifestationInput, setManifestationInput] = useState('')
  const [includeCluster, setIncludeCluster] = useState(false)
  const [protocolLoading, setProtocolLoading] = useState(false)
  const [protocolError, setProtocolError] = useState('')
  const [protocolResult, setProtocolResult] = useState<any>(null)
  const [protocolPrintMode, setProtocolPrintMode] = useState(false)
  const [activeProtocolSection, setActiveProtocolSection] = useState(0)
  const [checkedGrounds, setCheckedGrounds] = useState<Record<number, boolean>>({})
  const protocolPollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Derived from user
  const userTier = ((user?.publicMetadata?.tier as string) || '').toLowerCase()
  const userRole = ((user?.publicMetadata?.role as string) || '').toLowerCase()
  const userName = user?.firstName || user?.username || ''
  const userTierLabel = userTier === 'watchman' || userTier === 'free' || !userTier ? 'WATCHMAN' : userTier.toUpperCase()
  const accessLevel = getAccessLevel({ tier: userTier, role: userRole })
  const atLeast = (required: string) => accessLevel >= (TIER_LEVEL[required] ?? 0)

  // All hooks above this line; conditional returns below
  useEffect(() => {
    if (!isLoaded) return
    let cancelled = false

    async function fetchSpirit() {
      try {
        const token = await getToken()
        const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {}

        // Fetch the primary spirit and full list in parallel
        const [singleRes, listRes] = await Promise.all([
          fetch(`/api/demons?slug=${encodeURIComponent(spiritId)}`, { headers }),
          fetch('/api/demons', { headers }),
        ])

        if (cancelled) return

        if (singleRes.status === 404) { setNotFound(true); setLoading(false); return }
        if (!singleRes.ok) { setError('Failed to load spirit dossier.'); setLoading(false); return }

        const singleData = await singleRes.json()
        if (cancelled) return
        setDemon(singleData.demon)

        if (listRes.ok) {
          const listData = await listRes.json()
          if (!cancelled) setAllDemons(listData.demons || [])
        }
        setLoading(false)
      } catch (e: any) {
        if (!cancelled) { setError(e.message || 'Network error'); setLoading(false) }
      }
    }

    fetchSpirit()
    return () => { cancelled = true }
  }, [spiritId, isLoaded])

  // Resources fetch — runs after demon is known
  useEffect(() => {
    if (!demon) return
    let cancelled = false
    async function fetchResources() {
      try {
        const token = await getToken()
        const params = new URLSearchParams({ spirit: demon.name })
        if (demon.hierarchyCategory) params.set('category', demon.hierarchyCategory)
        const res = await fetch(`/api/spirit-resources?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        if (res.ok && !cancelled) {
          const d = await res.json()
          setSpiritResources(d.resources?.slice(0, 5) || [])
        }
      } catch { /* non-critical */ }
    }
    fetchResources()
    return () => { cancelled = true }
  }, [demon?.name])

  // Protocol cleanup
  useEffect(() => () => { if (protocolPollRef.current) clearInterval(protocolPollRef.current) }, [])

  if (!isLoaded || loading) {
    return (
      <CommunitySidebarShell activeItem="Intel Archive" userName={userName} userTierLabel={userTierLabel}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--deep)' }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.2em' }}>LOADING DOSSIER…</div>
        </div>
      </CommunitySidebarShell>
    )
  }

  if (notFound) {
    return (
      <CommunitySidebarShell activeItem="Intel Archive" userName={userName} userTierLabel={userTierLabel}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--deep)', gap: 16 }}>
          <div style={{ fontFamily: cinzel, fontSize: 14, color: G }}>SPIRIT NOT FOUND</div>
          <div style={{ fontFamily: crimson, fontSize: 15, color: 'var(--muted)' }}>No dossier exists for "{spiritId}".</div>
          <button onClick={() => navigate({ to: '/community' })}
            style={{ padding: '8px 20px', background: 'rgba(201,168,76,0.1)', border: '1px solid var(--border)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
            ← RETURN TO ARCHIVE
          </button>
        </div>
      </CommunitySidebarShell>
    )
  }

  if (error) {
    return (
      <CommunitySidebarShell activeItem="Intel Archive" userName={userName} userTierLabel={userTierLabel}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'var(--deep)', gap: 16 }}>
          <div style={{ fontFamily: cinzel, fontSize: 14, color: '#f87171' }}>ERROR</div>
          <div style={{ fontFamily: crimson, fontSize: 15, color: 'var(--muted)' }}>{error}</div>
          <button onClick={() => navigate({ to: '/community' })}
            style={{ padding: '8px 20px', background: 'rgba(201,168,76,0.1)', border: '1px solid var(--border)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
            ← RETURN TO ARCHIVE
          </button>
        </div>
      </CommunitySidebarShell>
    )
  }

  const entry = demon!
  const name  = entry.name || 'Unknown'
  const cls   = entry.biblicalRank || ''
  const color = getColor(cls)

  // ── Sub-components scoped to entry ────────────────────────────────────────
  const FieldBlock = ({ label, value, accent }: { label: string; value: string | null | undefined; accent?: string }) => {
    if (!value) {
      if (!atLeast('general')) return null
      return (
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: accent || G, marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.65 }}>No data on file.</div>
        </div>
      )
    }
    return (
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: accent || G, marginBottom: 6, textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontFamily: crimson, fontSize: 14, color: 'var(--text)', lineHeight: 1.65 }}>{value}</div>
      </div>
    )
  }

  const SpiritPill = ({ name: n }: { name: string }) => {
    const matched = allDemons.find(d => d.name?.toLowerCase() === n.toLowerCase())
    if (matched?.slug) {
      return (
        <span
          onClick={() => navigate({ to: '/community/spirits/$spiritId', params: { spiritId: matched.slug } })}
          style={{ display: 'inline-block', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, padding: '2px 8px', marginRight: 6, marginBottom: 6, fontFamily: 'inherit', fontSize: 13, color: G, cursor: 'pointer', transition: 'background 0.15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.22)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.12)' }}
          title={`Open dossier: ${matched.name}`}
        >{n}</span>
      )
    }
    return (
      <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '2px 8px', marginRight: 6, marginBottom: 6, fontFamily: 'inherit', fontSize: 13, color: 'var(--muted)' }}>
        {n}
      </span>
    )
  }

  const linkifySpirits = (text: string): React.ReactNode => {
    if (!text || !allDemons.length) return text
    const matchList: { start: number; end: number; name: string; slug: string }[] = []
    for (const d of allDemons) {
      if (!d.name || !d.slug) continue
      const lower = text.toLowerCase()
      const nameLower = d.name.toLowerCase()
      let idx = 0
      while (idx < lower.length) {
        const found = lower.indexOf(nameLower, idx)
        if (found === -1) break
        matchList.push({ start: found, end: found + d.name.length, name: d.name, slug: d.slug })
        idx = found + d.name.length
      }
    }
    if (!matchList.length) return text
    matchList.sort((a, b) => a.start - b.start || b.end - a.end)
    const filtered: typeof matchList = []
    let lastEnd = 0
    for (const m of matchList) {
      if (m.start >= lastEnd) { filtered.push(m); lastEnd = m.end }
    }
    const parts: React.ReactNode[] = []
    let pos = 0
    for (const m of filtered) {
      if (m.start > pos) parts.push(text.slice(pos, m.start))
      parts.push(
        <span key={`${m.name}-${m.start}`}
          onClick={() => navigate({ to: '/community/spirits/$spiritId', params: { spiritId: m.slug } })}
          style={{ color: G, cursor: 'pointer', textDecoration: 'underline dotted', fontWeight: 600 }}>
          {text.slice(m.start, m.end)}
        </span>
      )
      pos = m.end
    }
    if (pos < text.length) parts.push(text.slice(pos))
    return <>{parts}</>
  }

  async function handleGenerateProtocol(mode: 'spirit' | 'manifestation') {
    setProtocolLoading(true); setProtocolError(''); setProtocolResult(null)
    try {
      const token = await getToken()
      const clusterNames = parseSpiritNames(entry.clusterSpirits || '').slice(0, 10)
      const body = {
        mode,
        spiritData: entry,
        spiritNames: clusterNames,
        includeCluster,
        manifestationDescription: manifestationInput,
        manifestationCandidates: [],
      }
      const res = await fetch('/api/deliverance-protocol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Protocol generation failed')

      const jobId: string = data.jobId
      if (protocolPollRef.current) clearInterval(protocolPollRef.current)
      protocolPollRef.current = setInterval(async () => {
        try {
          const pollToken = await getToken()
          const pollRes = await fetch(`/api/job-status?jobId=${jobId}`, { headers: { Authorization: `Bearer ${pollToken}` } })
          if (!pollRes.ok) return
          const job = await pollRes.json()
          if (job.status === 'complete') {
            clearInterval(protocolPollRef.current!); protocolPollRef.current = null
            const result = job.result_json
            if (result?.protocol) { setProtocolResult(result); setActiveProtocolSection(0); setCheckedGrounds({}) }
            else setProtocolError('Protocol generation returned no result')
            setProtocolLoading(false)
          } else if (job.status === 'failed') {
            clearInterval(protocolPollRef.current!); protocolPollRef.current = null
            setProtocolError(job.error_message || 'Protocol generation failed')
            setProtocolLoading(false)
          }
        } catch { /* network hiccup — keep polling */ }
      }, 3000)
    } catch (e: any) {
      setProtocolError(e.message || 'Protocol generation failed')
      setProtocolLoading(false)
    }
  }

  return (
    <CommunitySidebarShell activeItem="Intel Archive" userName={userName} userTierLabel={userTierLabel}>
      <div style={{ background: 'var(--deep)', color: 'var(--text)', minHeight: '100dvh', paddingBottom: 40 }}>

        {/* ── Page Header ── */}
        <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 24px', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 760, margin: '0 auto' }}>
            <div style={{ fontFamily: cinzel, fontSize: 20, color, fontWeight: 700, letterSpacing: '0.05em' }}>{name}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => exportSpiritToPDF(entry)}
                style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 6, padding: '5px 10px', color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
                ↓ PDF
              </button>
              <FlagButton contentType="intel-archive" contentId={String(entry.id || entry.name)} contentTitle={name} />
            </div>
          </div>
        </div>

        {/* ── Name/badges strip ── */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', maxWidth: 760, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
          {entry.phonetic && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontFamily: crimson, fontSize: 14, color: 'var(--muted)', fontStyle: 'italic' }}>/{entry.phonetic}/</span>
              <button onClick={() => {
                if ('speechSynthesis' in window) {
                  window.speechSynthesis.cancel()
                  const u = new SpeechSynthesisUtterance(entry.phonetic)
                  u.rate = 0.75; u.pitch = 0.9
                  window.speechSynthesis.speak(u)
                }
              }} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 20, padding: '2px 10px', color: G, fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>
                🔊 Hear
              </button>
            </div>
          )}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {entry.biblicalRank && <span style={{ fontFamily: cinzel, fontSize: 8, background: 'rgba(201,168,76,0.15)', color: G, border: '1px solid rgba(201,168,76,0.35)', padding: '3px 10px', borderRadius: 4 }}>⚔ {entry.biblicalRank}</span>}
            {entry.caseType && <span style={{ fontFamily: cinzel, fontSize: 8, background: 'rgba(99,102,241,0.12)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.3)', padding: '3px 10px', borderRadius: 4 }}>{entry.caseType}</span>}
            {entry.isGenerational && <span style={{ fontFamily: cinzel, fontSize: 8, background: 'rgba(122,158,126,0.12)', color: '#7a9e7e', border: '1px solid rgba(122,158,126,0.3)', padding: '3px 10px', borderRadius: 4 }}>🧬 Generational</span>}
            {entry.isTerritorial && <span style={{ fontFamily: cinzel, fontSize: 8, background: 'rgba(139,157,202,0.12)', color: '#8B9DCA', border: '1px solid rgba(139,157,202,0.3)', padding: '3px 10px', borderRadius: 4 }}>🗺 Territorial</span>}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', overflowX: 'auto', scrollbarWidth: 'none', background: 'var(--surface)', maxWidth: 760, margin: '0 auto', width: '100%', boxSizing: 'border-box' } as React.CSSProperties}>
          {([
            { key: 'overview',      label: '📖 Overview' },
            { key: 'intelligence',  label: '🔍 Intel' },
            { key: 'warfare',       label: '⚔ Warfare' },
            { key: 'scholarly',     label: '📚 Research' },
          ] as const).map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: tab === t.key ? `2px solid ${G}` : '2px solid transparent', color: tab === t.key ? G : 'var(--muted)', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1, flexShrink: 0 }}>
              {t.label}
            </button>
          ))}
          {atLeast('commander') && (
            <button onClick={() => setTab('protocol')}
              style={{ padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: tab === 'protocol' ? `2px solid ${G}` : '2px solid transparent', color: tab === 'protocol' ? G : 'var(--muted)', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: -1, flexShrink: 0 }}>
              ⚔ PROTOCOL
            </button>
          )}
        </div>

        {/* ── Tab content ── */}
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 24px 48px', boxSizing: 'border-box' }}>

          {/* TAB 1: OVERVIEW */}
          {tab === 'overview' && (
            <div>
              {(() => {
                const imgArr = Array.isArray(entry.images) ? entry.images : String(entry.images || '').split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean)
                const url = imgArr[0]
                if (!url || !url.startsWith('http')) return null
                return (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Historical Depiction</div>
                    <img src={url} alt={entry.name}
                      style={{ maxWidth: '100%', maxHeight: 250, borderRadius: 8, border: '1px solid rgba(201,168,76,0.15)', objectFit: 'contain', display: 'block', margin: '0 auto', cursor: 'pointer' }}
                      onClick={() => window.open(url, '_blank')}
                      onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none' }}
                    />
                  </div>
                )
              })()}
              {entry.aka && <div style={{ fontFamily: crimson, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 14 }}>aka {entry.aka}</div>}
              <FieldBlock label="Type / Rank" value={entry.typeRank} />
              <FieldBlock label="Description" value={entry.description} />
              <FieldBlock label="Kingdom" value={entry.kingdom} />
              {entry.strongman ? (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 6, textTransform: 'uppercase' }}>Strongman</div>
                  {(() => {
                    const linked = allDemons.find(d => d.name?.toLowerCase() === entry.strongman?.toLowerCase())
                    return linked?.slug ? (
                      <span onClick={() => navigate({ to: '/community/spirits/$spiritId', params: { spiritId: linked.slug } })}
                        style={{ color: G, cursor: 'pointer', textDecoration: 'underline dotted', fontFamily: crimson, fontSize: 14, fontWeight: 600 }}
                        title={`View ${entry.strongman} dossier`}>{entry.strongman}</span>
                    ) : <span style={{ fontFamily: crimson, fontSize: 14, color: 'var(--text)' }}>{entry.strongman}</span>
                  })()}
                </div>
              ) : null}
              {entry.subKingdom && entry.subKingdom !== 'None' && (
                <div style={{ marginBottom: 14, marginTop: -8 }}>
                  <span style={{ display: 'inline-block', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', background: 'rgba(201,168,76,0.08)', color: 'rgba(201,168,76,0.65)', border: '1px solid rgba(201,168,76,0.22)', borderRadius: 3, padding: '3px 9px' }}>
                    ◈ {entry.subKingdom}
                  </span>
                </div>
              )}
              {entry.isTerritorial && entry.region && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 6, textTransform: 'uppercase' }}>🗺 Territorial Region</div>
                  <div style={{ fontFamily: crimson, fontSize: 14, color: 'var(--text)' }}>{entry.region}</div>
                </div>
              )}
              {spiritResources.length > 0 && (
                <div style={{ marginTop: 20, borderTop: '1px solid rgba(201,168,76,0.15)', paddingTop: 16 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Related Resources</div>
                  {spiritResources.map((r: any) => (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(201,168,76,0.08)', cursor: 'pointer' }}
                      onClick={() => window.open('/community#arsenal', '_blank')}>
                      <span style={{ fontSize: 16, flexShrink: 0 }}>📄</span>
                      <div>
                        <div style={{ fontFamily: cinzel, fontSize: 11, color: G }}>{r.title}</div>
                        <div style={{ fontFamily: crimson, fontSize: 12, color: 'var(--muted)' }}>{r.topic}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTELLIGENCE — Soldier+ */}
          {tab === 'intelligence' && (
            <UpgradeGate variant="overlay" requiredTier="soldier" featureName="Soldier Intel" isDark>
              <FieldBlock label="Manifestations & Symptoms" value={entry.manifestation || entry.symptoms} />
              <FieldBlock label="Entry Points" value={entry.entryPoints} />
              <FieldBlock label="Scripture Reference" value={entry.scripture} accent={G} />
              <FieldBlock label="Source & Origin" value={entry.sourceOrigin} />
              {entry.parentStrongman && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 8, textTransform: 'uppercase' }}>Parent Strongman</div>
                  {(() => {
                    const linked = allDemons.find(d => d.name?.toLowerCase() === entry.parentStrongman?.toLowerCase())
                    return linked?.slug ? (
                      <button onClick={() => navigate({ to: '/community/spirits/$spiritId', params: { spiritId: linked.slug } })}
                        style={{ background: 'none', border: 'none', color: G, fontFamily: crimson, fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                        {entry.parentStrongman}
                      </button>
                    ) : <span style={{ fontFamily: crimson, fontSize: 13, color: 'var(--text)' }}>{entry.parentStrongman}</span>
                  })()}
                </div>
              )}
              {entry.companionSpirits && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 8, textTransform: 'uppercase' }}>Companion Spirits</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {String(entry.companionSpirits).split(',').map((s: string) => s.trim()).filter(Boolean).map((n: string) => {
                      const baseName = n.replace(/\s*\(.*\)/g, '').trim()
                      const tokens = baseName.split('/').map((t: string) => t.trim()).filter(Boolean)
                      const linked = allDemons.find(d => tokens.some((t: string) => d.name?.toLowerCase() === t.toLowerCase()))
                      return (
                        <button key={n} onClick={() => linked?.slug && navigate({ to: '/community/spirits/$spiritId', params: { spiritId: linked.slug } })}
                          style={{ padding: '3px 12px', background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 20, color: linked ? G : 'var(--muted)', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: linked?.slug ? 'pointer' : 'default', textTransform: 'uppercase' }}>
                          {n}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
              <FieldBlock label="Counter Scriptures" value={entry.counterScriptures} accent={G} />
              {entry.deliveranceSequence && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 8, textTransform: 'uppercase' }}>Deliverance Sequence</div>
                  <div style={{ background: 'rgba(13,11,20,0.8)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 6, padding: '10px 14px', fontSize: 13, lineHeight: 1.6 }}>
                    {entry.deliveranceSequence.split('→').map((step: string, i: number, arr: string[]) => (
                      <span key={i}><span style={{ color: 'var(--text)' }}>{step.trim()}</span>{i < arr.length - 1 && <span style={{ color: G, margin: '0 6px' }}>→</span>}</span>
                    ))}
                  </div>
                </div>
              )}
              {entry.hierarchyCategory && (() => {
                const cat = entry.hierarchyCategory
                const colors = getHierarchyColors(cat)
                return (
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 6, textTransform: 'uppercase' }}>Kingdom Category</div>
                    <span style={{ padding: '5px 14px', borderRadius: 999, fontSize: 12, fontFamily: cinzel, backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}`, letterSpacing: '0.05em', display: 'inline-block' }}>{cat}</span>
                  </div>
                )
              })()}
            </UpgradeGate>
          )}

          {/* TAB 3: WARFARE — Commander+ */}
          {tab === 'warfare' && (
            <UpgradeGate variant="overlay" requiredTier="commander" featureName="Commander Intel" isDark>
              <FieldBlock label="Session Indicators" value={entry.sessionIndicators} />
              <FieldBlock label="Resistance Signature" value={entry.resistanceSignature} />
              {entry.clusterSpirits && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 8, textTransform: 'uppercase' }}>Cluster Spirits</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {parseSpiritNames(String(entry.clusterSpirits)).map((n, i) => <SpiritPill key={i} name={n} />)}
                  </div>
                  {parseSpiritNames(String(entry.clusterSpirits)).length === 0 && (
                    <div style={{ fontFamily: crimson, fontSize: 14, color: 'var(--text)', lineHeight: 1.7 }}>{linkifySpirits(String(entry.clusterSpirits))}</div>
                  )}
                </div>
              )}
              <FieldBlock label="Transmission Vectors" value={entry.transmissionVectors} />
              <FieldBlock label="Legal Rights" value={entry.legalRights} />
              <FieldBlock label="Legal Rights Framework" value={entry.legalRightsFramework} />
              <FieldBlock label="Demonic Agreements & Lies" value={entry.demonicAgreements} />
              <FieldBlock label="Assignment" value={entry.assignment} />
              <FieldBlock label="WRI Exorcist Notes" value={entry.wriNotes} />
              <FieldBlock label="Operational Notes" value={entry.operationalNotes} />
              {entry.prayerPoints && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 8, textTransform: 'uppercase' }}>Prayer Points</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {String(entry.prayerPoints).split(/\n|\d+\./).filter((s: string) => s.trim()).map((p: string, i: number) => (
                      <div key={i} style={{ background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, padding: '10px 14px', fontFamily: crimson, fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>
                        {p.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <FieldBlock label="Aftercare Notes" value={entry.aftercareNotes} />
              {((Array.isArray(entry.culturalPresence) && entry.culturalPresence.length > 0) || entry.sessionTriggerQuestions) && (
                <div style={{ marginTop: 8, marginBottom: 18, paddingTop: 16, borderTop: '1px solid rgba(201,168,76,0.12)' }}>
                  <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.1em', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span>⚡</span><span>Session Intel</span>
                  </div>
                  {Array.isArray(entry.culturalPresence) && entry.culturalPresence.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 8, textTransform: 'uppercase' }}>Cultural Presence</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {entry.culturalPresence.map((cat: string) => (
                          <span key={cat} style={{ fontFamily: cinzel, fontSize: 9, color: G, border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, padding: '4px 10px', letterSpacing: '0.06em', background: 'rgba(201,168,76,0.05)' }}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {entry.sessionTriggerQuestions && (
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 8, textTransform: 'uppercase' }}>Session Trigger Questions</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {String(entry.sessionTriggerQuestions).split('\n').filter((l: string) => l.trim()).map((line: string, i: number) => (
                          <div key={i} style={{ fontFamily: crimson, fontSize: 13, color: 'var(--text)', lineHeight: 1.65, fontStyle: 'italic', paddingLeft: 10, borderLeft: '2px solid rgba(201,168,76,0.2)' }}>
                            {line.replace(/^\d+\.\s*/, '')}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {spiritResources.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 8, textTransform: 'uppercase' }}>📎 Related Resources</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {spiritResources.map((r: any) => (
                      <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 16 }}>📄</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: cinzel, fontSize: 11, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</div>
                          <div style={{ fontSize: 10, color: 'var(--muted)' }}>{r.topic || r.category}</div>
                        </div>
                        {r.file_url
                          ? <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: G, background: 'transparent', border: `1px solid ${G}`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: cinzel, textDecoration: 'none' }}>↗ View</a>
                          : <button onClick={async () => {
                              const token = await getToken()
                              const res = await fetch(`/api/arsenal-resources?id=${r.id}&action=download`, { headers: { Authorization: `Bearer ${token}` } })
                              if (res.ok) { const d = await res.json(); if (d.url) window.open(d.url, '_blank') }
                            }} style={{ fontSize: 9, color: G, background: 'transparent', border: `1px solid ${G}`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer', fontFamily: cinzel }}>↗ View</button>
                        }
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </UpgradeGate>
          )}

          {/* TAB 4: RESEARCH — General+ */}
          {tab === 'scholarly' && (
            <UpgradeGate variant="overlay" requiredTier="general" featureName="General Intel" isDark>
              <FieldBlock label="Etymology & Name Analysis" value={entry.etymologyNotes} />
              <FieldBlock label="Archaeological & ANE Context" value={entry.archaeologyNotes} />
              <FieldBlock label="Scripture Context" value={entry.scriptureContext} />
              <FieldBlock label="Institutional Expression" value={entry.institutionalExpression} />
              <FieldBlock label="Primary Battlefield" value={entry.primaryBattlefield} />
              <FieldBlock label="Personality Presentation" value={entry.personalityPresentation} />
              <FieldBlock label="Case Type" value={entry.caseType} />
              <FieldBlock label="Biblical Rank" value={entry.biblicalRank} />
              <FieldBlock label="Sub-Kingdom" value={entry.subKingdom && entry.subKingdom !== 'None' ? entry.subKingdom : undefined} />
              {entry.relatedSpirits && (
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.15em', color: G, marginBottom: 8, textTransform: 'uppercase' }}>Related Spirits</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                    {String(entry.relatedSpirits).split(/[,;]/).map(s => s.trim()).filter(Boolean).map((n, i) => <SpiritPill key={i} name={n} />)}
                  </div>
                </div>
              )}
              <FieldBlock label="WRI Exorcist Notes" value={entry.wriNotes} />
            </UpgradeGate>
          )}

          {/* TAB 5: PROTOCOL ENGINE — Commander+ */}
          {tab === 'protocol' && (
            <div>
              {!atLeast('commander') ? (
                <UpgradeGate variant="banner" featureName="Commander tier" requiredTier="commander" isDark />
              ) : !protocolResult ? (
                <div>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em', marginBottom: 6 }}>⚔ PROTOCOL ENGINE</div>
                    <div style={{ fontFamily: crimson, fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
                      Generate a complete deliverance session protocol — legal ground checklist, renunciation prayers, command prayers, and aftercare.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
                    <button onClick={() => setProtocolMode('spirit')}
                      style={{ flex: 1, padding: '8px 12px', background: protocolMode === 'spirit' ? 'rgba(201,168,76,0.15)' : 'transparent', border: `1px solid ${protocolMode === 'spirit' ? G : 'var(--border)'}`, borderRadius: 6, color: protocolMode === 'spirit' ? G : 'var(--muted)', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
                      ⚔ SPIRIT NAME
                    </button>
                    <button onClick={() => setProtocolMode('manifestation')}
                      style={{ flex: 1, padding: '8px 12px', background: protocolMode === 'manifestation' ? 'rgba(201,168,76,0.15)' : 'transparent', border: `1px solid ${protocolMode === 'manifestation' ? G : 'var(--border)'}`, borderRadius: 6, color: protocolMode === 'manifestation' ? G : 'var(--muted)', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
                      👁 MANIFESTATION
                    </button>
                  </div>
                  {protocolMode === 'spirit' && (
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.08em', marginBottom: 10, padding: '8px 12px', background: 'rgba(201,168,76,0.06)', border: '1px solid var(--border)', borderRadius: 6 }}>
                        {entry.name}
                        {entry.biblicalRank && <span style={{ color: 'var(--muted)', fontFamily: cinzel, fontSize: 8, marginLeft: 8 }}>— {entry.biblicalRank}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: cinzel, fontSize: 10, color: 'var(--muted)', letterSpacing: '0.06em' }}>
                          <input type="checkbox" checked={includeCluster} onChange={e => setIncludeCluster(e.target.checked)} style={{ accentColor: '#C9A84C', width: 14, height: 14 }} />
                          Include cluster spirits
                        </label>
                      </div>
                      {includeCluster && parseSpiritNames(entry.clusterSpirits || '').length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 14 }}>
                          {parseSpiritNames(entry.clusterSpirits || '').slice(0, 5).map((n: string, i: number) => (
                            <span key={i} style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.05em', padding: '2px 8px', borderRadius: 10, background: 'rgba(201,168,76,0.08)', border: '1px solid var(--border)', color: 'var(--muted)' }}>{n}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {protocolMode === 'manifestation' && (
                    <div style={{ marginBottom: 16 }}>
                      <textarea
                        value={manifestationInput}
                        onChange={e => setManifestationInput(e.target.value)}
                        placeholder="Describe what you are observing — physical manifestations, behavioral patterns, emotional responses, words spoken during session..."
                        rows={4}
                        style={{ width: '100%', minHeight: 100, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px', fontFamily: crimson, fontSize: 14, color: 'var(--text)', resize: 'vertical', boxSizing: 'border-box', outline: 'none' }}
                      />
                    </div>
                  )}
                  {protocolError && (
                    <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 6, padding: '10px 14px', color: '#f87171', fontFamily: crimson, fontSize: 13, marginBottom: 16 }}>
                      {protocolError}
                    </div>
                  )}
                  <button onClick={() => handleGenerateProtocol(protocolMode)} disabled={protocolLoading}
                    style={{ width: '100%', padding: '14px', background: protocolLoading ? 'rgba(201,168,76,0.3)' : '#C9A84C', border: 'none', borderRadius: 8, color: '#0D0B14', fontFamily: cinzel, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', cursor: protocolLoading ? 'not-allowed' : 'pointer', textTransform: 'uppercase' }}>
                    {protocolLoading ? '⏳ GENERATING PROTOCOL...' : '⚔ GENERATE SESSION PROTOCOL'}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em', marginBottom: 4 }}>⚔ SESSION PROTOCOL</div>
                      <div style={{ fontFamily: cinzel, fontSize: 9, color: 'var(--muted)', letterSpacing: '0.08em' }}>{entry.name}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setProtocolPrintMode(!protocolPrintMode)}
                        style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, color: G + '99', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', cursor: 'pointer', padding: '4px 10px' }}>
                        🖨 PRINT
                      </button>
                      <button onClick={() => { setProtocolResult(null); setCheckedGrounds({}) }}
                        style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 4, color: 'var(--muted)', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', cursor: 'pointer', padding: '4px 10px' }}>
                        ↺ REGENERATE
                      </button>
                    </div>
                  </div>

                  {/* Section nav pills */}
                  {!protocolPrintMode && (
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 20 }}>
                      {['Pre-Session Intel', 'Legal Grounds', 'Renunciation', 'Intercession', 'Command Prayers', 'Aftercare', 'Resources'].map((sec, i) => (
                        <button key={i} onClick={() => setActiveProtocolSection(i)}
                          style={{ padding: '4px 10px', borderRadius: 20, fontSize: 9, fontFamily: cinzel, letterSpacing: '0.04em', cursor: 'pointer', border: `1px solid ${activeProtocolSection === i ? G : 'var(--border)'}`, background: activeProtocolSection === i ? 'rgba(201,168,76,0.15)' : 'transparent', color: activeProtocolSection === i ? G : 'var(--muted)' }}>
                          {sec}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Section 0: Pre-Session Intel */}
                  {(protocolPrintMode || activeProtocolSection === 0) && protocolResult.protocol?.preSessionIntel && (() => {
                    const intel = protocolResult.protocol.preSessionIntel
                    return (
                      <div>
                        <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>PRE-SESSION INTEL</div>
                        <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderLeft: `3px solid ${G}`, borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
                          <div style={{ fontFamily: crimson, fontSize: 15, color: 'var(--text)', lineHeight: 1.7 }}>{intel.summary}</div>
                        </div>
                        {intel.keyLegalGrounds?.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Key Legal Grounds</div>
                            {intel.keyLegalGrounds.map((g: string, i: number) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                                <span style={{ color: G, flexShrink: 0, fontSize: 10, marginTop: 2 }}>▸</span>
                                <span style={{ fontFamily: crimson, fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{g}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {intel.keyScriptures?.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Key Scriptures</div>
                            {intel.keyScriptures.map((s: string, i: number) => (
                              <div key={i} style={{ fontFamily: crimson, fontSize: 13, color: G, fontStyle: 'italic', marginBottom: 5, paddingLeft: 10, borderLeft: '2px solid rgba(201,168,76,0.2)' }}>{s}</div>
                            ))}
                          </div>
                        )}
                        {intel.warningFlags?.length > 0 && (
                          <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.18)', borderRadius: 8, padding: '12px 16px' }}>
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: '#f87171', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>⚠ Warning Flags</div>
                            {intel.warningFlags.map((w: string, i: number) => (
                              <div key={i} style={{ fontFamily: crimson, fontSize: 13, color: '#f87171', marginBottom: 4 }}>• {w}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Section 1: Legal Ground Checklist */}
                  {(protocolPrintMode || activeProtocolSection === 1) && (
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>LEGAL GROUND CHECKLIST</div>
                      <div style={{ fontFamily: crimson, fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
                        Go through each ground with the person. Check off what applies — this forms the basis for renunciation.
                      </div>
                      {(protocolResult.protocol?.legalGroundChecklist || []).map((item: any, i: number) => (
                        <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: checkedGrounds[i] ? 'rgba(201,168,76,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${checkedGrounds[i] ? 'rgba(201,168,76,0.3)' : 'var(--border)'}`, borderRadius: 8, marginBottom: 8, cursor: 'pointer' }}
                          onClick={() => setCheckedGrounds(prev => ({ ...prev, [i]: !prev[i] }))}>
                          <div style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 4, border: `2px solid ${checkedGrounds[i] ? G : 'var(--border)'}`, background: checkedGrounds[i] ? '#C9A84C' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}>
                            {checkedGrounds[i] && <span style={{ color: '#0D0B14', fontSize: 11, fontWeight: 700 }}>✓</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontFamily: cinzel, fontSize: 10, color: checkedGrounds[i] ? G : 'var(--text)', letterSpacing: '0.06em', marginBottom: 4 }}>{item.ground}</div>
                            <div style={{ fontFamily: crimson, fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 4 }}>"{item.question}"</div>
                            {item.scripture && <div style={{ fontFamily: cinzel, fontSize: 9, color: G + '99', letterSpacing: '0.04em' }}>{item.scripture}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Section 2: Renunciation Prayers */}
                  {(protocolPrintMode || activeProtocolSection === 2) && (
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>RENUNCIATION PRAYERS</div>
                      {(protocolResult.protocol?.renunciationPrayers || []).map((prayer: any, i: number) => (
                        <div key={i} style={{ marginBottom: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
                          <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.08em', marginBottom: 10 }}>{prayer.title}</div>
                          <div style={{ fontFamily: crimson, fontSize: 15, color: 'var(--text)', lineHeight: 1.8, fontStyle: 'italic', marginBottom: 10, paddingLeft: 14, borderLeft: '3px solid rgba(201,168,76,0.3)' }}>
                            {prayer.prayer}
                          </div>
                          {prayer.notes && (
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: 'var(--muted)', letterSpacing: '0.04em', background: 'rgba(201,168,76,0.05)', borderRadius: 4, padding: '6px 10px' }}>
                              📋 {prayer.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Section 3: Intercession */}
                  {(protocolPrintMode || activeProtocolSection === 3) && protocolResult.protocol?.intercession && (() => {
                    const ic = protocolResult.protocol.intercession
                    return (
                      <div>
                        <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>INTERCESSION</div>
                        {ic.opening && (
                          <div style={{ marginBottom: 20 }}>
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Opening Intercession</div>
                            <div style={{ fontFamily: crimson, fontSize: 15, color: 'var(--text)', lineHeight: 1.8, fontStyle: 'italic', paddingLeft: 14, borderLeft: '3px solid rgba(201,168,76,0.3)' }}>{ic.opening}</div>
                          </div>
                        )}
                        {ic.declarations?.length > 0 && (
                          <div style={{ marginBottom: 20 }}>
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Declarations</div>
                            {ic.declarations.map((d: string, i: number) => (
                              <div key={i} style={{ fontFamily: crimson, fontSize: 14, color: 'var(--text)', lineHeight: 1.6, marginBottom: 8, paddingLeft: 12, borderLeft: '2px solid rgba(201,168,76,0.2)' }}>{d}</div>
                            ))}
                          </div>
                        )}
                        {ic.binding && (
                          <div>
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Binding Prayer</div>
                            <div style={{ fontFamily: crimson, fontSize: 15, color: 'var(--text)', lineHeight: 1.8, fontStyle: 'italic', paddingLeft: 14, borderLeft: '3px solid rgba(220,38,38,0.4)' }}>{ic.binding}</div>
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Section 4: Command Prayers */}
                  {(protocolPrintMode || activeProtocolSection === 4) && (
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>COMMAND PRAYERS</div>
                      {(protocolResult.protocol?.commandPrayers || []).map((prayer: any, i: number) => (
                        <div key={i} style={{ marginBottom: 20, background: 'rgba(220,38,38,0.04)', border: '1px solid rgba(220,38,38,0.15)', borderLeft: '3px solid rgba(220,38,38,0.5)', borderRadius: 10, padding: '16px 18px' }}>
                          <div style={{ fontFamily: cinzel, fontSize: 10, color: '#f87171', letterSpacing: '0.08em', marginBottom: 10 }}>TARGET: {prayer.target}</div>
                          <div style={{ fontFamily: crimson, fontSize: 15, color: 'var(--text)', lineHeight: 1.8, fontStyle: 'italic', marginBottom: 10 }}>
                            {prayer.command}
                          </div>
                          {prayer.authority && (
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: G + '99', letterSpacing: '0.04em' }}>⚔ Authority: {prayer.authority}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Section 5: Aftercare */}
                  {(protocolPrintMode || activeProtocolSection === 5) && protocolResult.protocol?.aftercare && (() => {
                    const ac = protocolResult.protocol.aftercare
                    return (
                      <div>
                        <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>AFTERCARE</div>
                        {ac.initialSteps?.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Immediate Steps</div>
                            {ac.initialSteps.map((s: string, i: number) => (
                              <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                                <span style={{ color: G, flexShrink: 0, fontFamily: cinzel, fontSize: 11, marginTop: 1 }}>{i + 1}.</span>
                                <span style={{ fontFamily: crimson, fontSize: 14, color: 'var(--text)', lineHeight: 1.5 }}>{s}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {ac.dailyPractices?.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Daily Practices</div>
                            {ac.dailyPractices.map((p: string, i: number) => (
                              <div key={i} style={{ fontFamily: crimson, fontSize: 14, color: 'var(--text)', lineHeight: 1.5, marginBottom: 6, paddingLeft: 10, borderLeft: '2px solid rgba(201,168,76,0.15)' }}>• {p}</div>
                            ))}
                          </div>
                        )}
                        {ac.warningSignsToWatch?.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: '#f87171', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>⚠ Warning Signs to Watch</div>
                            {ac.warningSignsToWatch.map((w: string, i: number) => (
                              <div key={i} style={{ fontFamily: crimson, fontSize: 13, color: '#f87171', marginBottom: 5 }}>• {w}</div>
                            ))}
                          </div>
                        )}
                        {ac.followUpQuestions?.length > 0 && (
                          <div>
                            <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>Follow-Up Questions</div>
                            {ac.followUpQuestions.map((q: string, i: number) => (
                              <div key={i} style={{ fontFamily: crimson, fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 6 }}>• {q}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  {/* Section 6: Arsenal Resources */}
                  {(protocolPrintMode || activeProtocolSection === 6) && (
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid rgba(201,168,76,0.2)' }}>ARSENAL RESOURCES</div>
                      {protocolResult.arsenalResources?.length > 0 ? (
                        <div>
                          <div style={{ fontFamily: crimson, fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 16 }}>
                            Resources matched to this protocol based on spirit domain and legal grounds.
                          </div>
                          {protocolResult.arsenalResources.map((r: any, i: number) => (
                            <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8 }}>
                              <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>📄</span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontFamily: cinzel, fontSize: 11, color: 'var(--text)', marginBottom: 3 }}>{r.title}</div>
                                {r.relevance && <div style={{ fontFamily: crimson, fontSize: 12, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 4 }}>{r.relevance}</div>}
                                <div style={{ fontFamily: cinzel, fontSize: 9, color: G + '80', letterSpacing: '0.04em' }}>{r.category || 'Resource'}</div>
                              </div>
                              {r.file_path && (
                                <a href={r.file_path} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize: 9, color: G, background: 'transparent', border: `1px solid ${G}`, borderRadius: 4, padding: '4px 10px', cursor: 'pointer', fontFamily: cinzel, textDecoration: 'none', alignSelf: 'flex-start', flexShrink: 0 }}>
                                  ↗ VIEW
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', color: 'var(--muted)', fontFamily: crimson, fontSize: 14, padding: '32px 0' }}>
                          No matched arsenal resources for this spirit.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </CommunitySidebarShell>
  )
}
