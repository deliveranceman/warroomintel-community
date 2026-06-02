import { useState, useCallback, useEffect, useRef } from 'react'

const cinzel = "'Cinzel', serif"
const inter  = 'Inter, system-ui, sans-serif'
const GC   = '#C9A84C'
const DIM  = '#4a3f5a'
const MUT  = '#2a2035'
const DARK = '#09070F'
const SURF = '#0f0b17'
const BDR  = '#1a1520'

// ── TYPES ─────────────────────────────────────────────────────────────────────

interface Demon {
  id: number
  name: string
  aka?: string
  kingdom?: string
  subKingdom?: string
  biblicalRank?: string
  hierarchyCategory?: string
  parentStrongman?: string
  companionSpirits?: string
  description?: string
  assignment?: string
  entryPoints?: string
  legalRights?: string
  deliveranceSequence?: string
  sessionIndicators?: string
  primaryBattlefield?: string
  isGenerational?: boolean
  isTerritorial?: boolean
  caseType?: string
  phonetic?: string
  scripture?: string
  wriNotes?: string
  prayerPoints?: string
}

export interface SpiritNetworkProps {
  demons: Demon[]
  isDark: boolean
  isMobile: boolean
  userTier?: string
  userId?: string
  onNavigateTo?: (section: string) => void
  getToken?: () => Promise<string | null>
}

// ── PDF EXPORT ────────────────────────────────────────────────────────────────

function exportToPDF(content: string, title: string) {
  const html = `<!DOCTYPE html><html><head>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600&family=Crimson+Pro:ital,wght@0,400;1,400&display=swap" rel="stylesheet">
  <style>
    body{font-family:'Crimson Pro',serif;padding:60px;max-width:800px;margin:0 auto;color:#1a1408}
    h1{font-family:'Cinzel',serif;color:#C9A84C;font-size:20px;letter-spacing:0.1em;border-bottom:2px solid #C9A84C;padding-bottom:12px}
    .header{display:flex;align-items:center;gap:16px;margin-bottom:32px}
    strong{color:#8B0000}p{line-height:1.9;margin-bottom:16px;font-size:16px}
    .footer{margin-top:48px;padding-top:16px;border-top:1px solid #C9A84C;font-family:'Cinzel',serif;font-size:9px;color:#6b5e45;letter-spacing:0.1em}
    @media print{body{padding:40px}}
  </style></head><body>
  <div class="header">
    <img src="https://warroomintel.com/logo.png" style="width:50px;opacity:0.8"/>
    <div><div style="font-family:Cinzel;font-size:16px;color:#C9A84C;letter-spacing:0.15em">WAR ROOM INTEL</div>
    <div style="font-size:11px;color:#6b5e45;font-family:Cinzel;letter-spacing:0.1em">MINISTRY USE ONLY</div></div>
  </div>
  <h1>${title}</h1>
  <div>${content.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/\n\n/g,'</p><p>').replace(/\n/g,'<br/>')}</div>
  <div class="footer">War Room Intel &middot; warroomintel.com &middot; A Ministry of Staffordtown Church &middot; Copperhill, TN &middot; Generated ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
  <script>window.onload=()=>window.print()</script>
  </body></html>`
  const w = window.open('', '_blank')
  if (w) { w.document.write(html); w.document.close() }
}

// ── SVG ORG CHART ─────────────────────────────────────────────────────────────

const NODE_W = 160
const NODE_H = 60

function OrgChartSVG({ selected, allDemons, onSelectParent, onSelectCompanion }: {
  selected: Demon
  allDemons: Demon[]
  onSelectParent: (d: Demon) => void
  onSelectCompanion: (d: Demon) => void
}) {
  const companions = selected.companionSpirits
    ? String(selected.companionSpirits).split(',').map(s => s.trim()).filter(Boolean)
    : []

  const parentDemon = selected.parentStrongman
    ? allDemons.find(d => d.name.toLowerCase() === (selected.parentStrongman || '').toLowerCase()) ?? null
    : null

  const parentLabel = (selected.parentStrongman || '').trim()
  const hasParent = !!parentLabel && parentLabel.toLowerCase() !== selected.name.toLowerCase()
  const compCount  = Math.min(companions.length, 6)

  const totalWidth   = Math.max(420, compCount * (NODE_W + 20) + 40)
  const cx           = totalWidth / 2

  const parentX = cx - NODE_W / 2
  const parentY = 10
  const selX    = cx - NODE_W / 2
  const selY    = hasParent ? parentY + NODE_H + 48 : 10
  const compSpacing  = NODE_W + 20
  const totalCompW   = Math.max(0, compCount * compSpacing - 20)
  const compStartX   = cx - totalCompW / 2
  const compY        = selY + NODE_H + 48
  const svgH         = compCount > 0 ? compY + NODE_H + 28 : selY + NODE_H + 24

  return (
    <div style={{ overflowX: 'auto', padding: '4px 0 8px' }}>
      <svg width={totalWidth} height={svgH} style={{ display: 'block', margin: '0 auto' }}>

        {/* ── PARENT NODE ── */}
        {hasParent && (() => {
          const startX = parentX + NODE_W / 2, startY = parentY + NODE_H
          const endX   = selX    + NODE_W / 2, endY   = selY
          const midY   = (startY + endY) / 2
          return (
            <g
              onClick={() => parentDemon && onSelectParent(parentDemon)}
              style={{ cursor: parentDemon ? 'pointer' : 'default' }}
            >
              <rect x={parentX} y={parentY} width={NODE_W} height={NODE_H} rx={6}
                fill="rgba(201,168,76,0.05)"
                stroke={parentDemon ? 'rgba(201,168,76,0.35)' : MUT}
                strokeWidth={1} />
              <text x={cx} y={parentY + NODE_H / 2 + 4} textAnchor="middle"
                fontFamily="Cinzel, serif" fontSize={9}
                fill={parentDemon ? GC : DIM} letterSpacing="0.04em">
                {parentLabel.length > 18 ? parentLabel.slice(0, 17) + '…' : parentLabel}
              </text>
              {parentDemon && (
                <text x={parentX + NODE_W - 10} y={parentY + 13} fontSize={8} fill={GC}>▲</text>
              )}
              <path
                d={`M ${startX} ${startY} C ${startX} ${midY} ${endX} ${midY} ${endX} ${endY}`}
                stroke="rgba(201,168,76,0.2)" strokeWidth={1.5} fill="none" strokeDasharray="4,4"
              />
            </g>
          )
        })()}

        {/* ── SELECTED NODE ── */}
        <rect x={selX} y={selY} width={NODE_W} height={NODE_H} rx={8}
          fill="rgba(201,168,76,0.12)" stroke={GC} strokeWidth={1.5} />
        <text x={cx} y={selY + NODE_H / 2 + 4} textAnchor="middle"
          fontFamily="Cinzel, serif" fontSize={10} fill={GC} fontWeight="bold" letterSpacing="0.05em">
          {selected.name.length > 16 ? selected.name.slice(0, 15) + '…' : selected.name}
        </text>

        {/* ── COMPANION NODES ── */}
        {companions.slice(0, 6).map((name, i) => {
          const demon  = allDemons.find(d => d.name.toLowerCase() === name.toLowerCase()) ?? null
          const compX  = compStartX + i * compSpacing
          const compCx = compX + NODE_W / 2
          const startX = selX  + NODE_W / 2, startY = selY + NODE_H
          const endX   = compCx,             endY   = compY
          const midY   = (startY + endY) / 2
          return (
            <g key={name} onClick={() => demon && onSelectCompanion(demon)} style={{ cursor: demon ? 'pointer' : 'default' }}>
              <path
                d={`M ${startX} ${startY} C ${startX} ${midY} ${endX} ${midY} ${endX} ${endY}`}
                stroke={demon ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.05)'}
                strokeWidth={1} fill="none"
              />
              <rect x={compX} y={compY} width={NODE_W} height={NODE_H} rx={6}
                fill={demon ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.01)'}
                stroke={demon ? 'rgba(201,168,76,0.35)' : MUT}
                strokeWidth={1} />
              <text x={compCx} y={compY + NODE_H / 2 + 4} textAnchor="middle"
                fontFamily="Cinzel, serif" fontSize={8}
                fill={demon ? GC : DIM} letterSpacing="0.03em">
                {name.length > 15 ? name.slice(0, 14) + '…' : name}
              </text>
            </g>
          )
        })}

        {companions.length > 6 && (
          <text x={cx} y={compY + NODE_H + 16} textAnchor="middle"
            fontFamily="Cinzel, serif" fontSize={8} fill={DIM}>
            +{companions.length - 6} more companions
          </text>
        )}
      </svg>
    </div>
  )
}

// ── EMPTY CANVAS ───────────────────────────────────────────────────────────────

function EmptyCanvas({ onSelectSpirit, demons, recentSpirits = [] }: {
  onSelectSpirit: (d: Demon) => void; demons: Demon[]; recentSpirits?: any[]
}) {
  const quickStart = ['Leviathan', 'Baal', 'Jezebel']
    .map(name => demons.find(d => d.name === name))
    .filter((d): d is Demon => !!d)

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', background: DARK, gap: 16 }}>
      <div style={{ fontSize: 48, color: GC, opacity: 0.25 }}>⚔</div>
      <div style={{ fontFamily: cinzel, fontSize: 14, color: GC, letterSpacing: '0.15em', textAlign: 'center' as const }}>
        SPIRIT NETWORK COMMAND CENTER
      </div>
      <div style={{ fontFamily: inter, fontSize: 13, color: DIM, textAlign: 'center' as const }}>
        Search for a spirit to begin investigation
      </div>
      {quickStart.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {quickStart.map(d => (
            <button key={d.id} onClick={() => onSelectSpirit(d)}
              style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontFamily: cinzel, fontSize: 10, color: GC, letterSpacing: '0.08em' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.6)')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)')}>
              {d.name}
            </button>
          ))}
        </div>
      )}
      {recentSpirits.length > 0 && (
        <div style={{ marginTop: 24, maxWidth: 480, textAlign: 'center' as const }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, color: '#4a3f2f', letterSpacing: '0.12em', marginBottom: 10 }}>
            RECENTLY VIEWED
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, justifyContent: 'center' }}>
            {recentSpirits.map(r => (
              <button key={r.name}
                onClick={() => { const d = demons.find(x => x.name === r.name); if (d) onSelectSpirit(d) }}
                style={{ padding: '6px 14px', background: 'rgba(201,168,76,0.04)', border: '1px solid #2a2218', borderRadius: 20, color: '#6b5e45', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = GC)}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2218')}>
                {r.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── DOSSIER MODE ───────────────────────────────────────────────────────────────

function DossierMode({ spirit, demons, resources, loadingResources, onSelectSpirit }: {
  spirit: Demon; demons: Demon[]; resources: any[]; loadingResources: boolean; onSelectSpirit: (d: Demon) => void
}) {
  const [prayer,          setPrayer]         = useState('')
  const [prayerLoading,   setPrayerLoading]  = useState(false)
  const [showPrayer,      setShowPrayer]     = useState(false)
  const [scriptures,      setScriptures]     = useState<any[]>([])
  const [scriptureLoading,setScriptureLoading] = useState(false)
  const [showScriptures,  setShowScriptures] = useState(false)

  useEffect(() => {
    setShowPrayer(false); setPrayer('')
    setShowScriptures(false); setScriptures([])
  }, [spirit.id])

  async function generatePrayer() {
    setPrayerLoading(true); setShowPrayer(true)
    try {
      const res = await fetch('/api/ai-assistant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Generate a targeted deliverance prayer for the spirit of ${spirit.name}.

Context:
- Kingdom: ${spirit.kingdom}
- Entry points: ${spirit.entryPoints || 'various'}
- Manifestations: ${spirit.sessionIndicators || 'various'}
- Deliverance sequence: ${spirit.deliveranceSequence || 'Repentance, Renunciation, Expulsion'}

Write a powerful, scripturally-grounded deliverance prayer that:
1. Breaks the legal grounds/entry points
2. Renounces the specific works of this spirit
3. Commands it to leave with authority
4. Invites the Holy Spirit to fill the vacated place

Write in first person as if the minister is leading the prayer.
Use **bold** for scripture references where relevant.
3-4 paragraphs, direct and authoritative tone.`,
          history: [],
        }),
      })
      const data = await res.json()
      setPrayer(data.response || '')
    } catch { setPrayer('Failed to generate prayer. Please try again.') }
    finally { setPrayerLoading(false) }
  }

  async function findScriptures() {
    setScriptureLoading(true); setShowScriptures(true)
    try {
      const res = await fetch('/api/ai-assistant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Find the 5 most relevant Bible scriptures for ministering deliverance from the spirit of ${spirit.name}.

For each scripture provide:
- The reference (book, chapter, verse)
- The full verse text (KJV)
- A brief explanation of why it is relevant for this spirit specifically

Format as a numbered list. Be specific to ${spirit.name}, not generic deliverance verses.`,
          history: [],
        }),
      })
      const data = await res.json()
      setScriptures([{ text: data.response || '' }])
    } catch { setScriptures([{ text: 'Failed to load scriptures.' }]) }
    finally { setScriptureLoading(false) }
  }

  const companions = spirit.companionSpirits
    ? String(spirit.companionSpirits).split(',').map(s => s.trim()).filter(Boolean)
    : []

  const rank = (spirit.biblicalRank || '').toLowerCase()
  const rankColor = rank.includes('principality') ? '#8B0000' : rank.includes('power') ? '#9b59b6' : rank.includes('strongman') ? GC : DIM

  const tacticalRows = [
    { label: 'Kingdom',         value: spirit.kingdom },
    { label: 'Sub-Kingdom',     value: spirit.subKingdom },
    { label: 'Biblical Rank',   value: spirit.biblicalRank },
    { label: 'Case Type',       value: spirit.caseType },
    { label: 'Battlefield',     value: spirit.primaryBattlefield },
    { label: 'Generational',    value: spirit.isGenerational === true ? 'Yes' : spirit.isGenerational === false ? 'No' : null },
    { label: 'Territorial',     value: spirit.isTerritorial === true ? 'Yes' : spirit.isTerritorial === false ? 'No' : null },
    { label: 'Parent Strongman',value: spirit.parentStrongman },
  ].filter(r => r.value)

  return (
    <div style={{ height: '100%', overflowY: 'auto' as const, background: DARK }}>
      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 40px' }}>
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: cinzel, fontSize: 32, color: GC, letterSpacing: '0.06em', lineHeight: 1.1, marginBottom: 6 }}>{spirit.name}</div>
              {spirit.phonetic && <div style={{ fontFamily: inter, fontSize: 13, color: DIM, fontStyle: 'italic', marginBottom: 4 }}>{spirit.phonetic}</div>}
              {spirit.aka && <div style={{ fontFamily: inter, fontSize: 13, color: DIM, fontStyle: 'italic' }}>Also known as: {spirit.aka}</div>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, flexShrink: 0 }}>
              {spirit.biblicalRank && (
                <span style={{ fontFamily: cinzel, fontSize: 9, color: rankColor, border: `1px solid ${rankColor}`, borderRadius: 4, padding: '3px 10px', letterSpacing: '0.1em', textAlign: 'center' as const }}>{spirit.biblicalRank}</span>
              )}
              {spirit.kingdom && (
                <span style={{ fontFamily: cinzel, fontSize: 9, color: GC, border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, padding: '3px 10px', letterSpacing: '0.1em', textAlign: 'center' as const }}>{spirit.kingdom}</span>
              )}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${BDR}` }} />
        </div>

        {spirit.description && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 14 }}>EXECUTIVE SUMMARY</div>
            <div style={{ fontFamily: inter, fontSize: 15, color: '#c8b99a', lineHeight: 1.85 }}>{spirit.description}</div>
          </section>
        )}

        {tacticalRows.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 14 }}>TACTICAL DATA</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              {tacticalRows.map(({ label, value }) => (
                <div key={label} style={{ borderLeft: `2px solid ${BDR}`, paddingLeft: 12 }}>
                  <div style={{ fontFamily: inter, fontSize: 10, color: DIM, textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontFamily: inter, fontSize: 14, color: '#c8b99a' }}>{value}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {companions.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 14 }}>COMPANION SPIRITS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8, width: '100%', maxWidth: '100%' }}>
              {companions.map(name => {
                const found = demons.find(d => d.name.toLowerCase() === name.toLowerCase())
                return (
                  <button key={name} onClick={() => found && onSelectSpirit(found)}
                    style={{ minWidth: 0, background: 'rgba(201,168,76,0.06)', border: `1px solid ${found ? 'rgba(201,168,76,0.5)' : 'rgba(201,168,76,0.18)'}`, borderRadius: 20, padding: '6px 14px', cursor: found ? 'pointer' : 'default', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', color: found ? GC : DIM }}
                    onMouseEnter={e => { if (found) e.currentTarget.style.background = 'rgba(201,168,76,0.14)' }}
                    onMouseLeave={e => { if (found) e.currentTarget.style.background = 'rgba(201,168,76,0.06)' }}>
                    {found ? '⚔ ' : ''}{name}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {(spirit.entryPoints || spirit.legalRights) && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 14 }}>ENTRY POINTS / LEGAL GROUNDS</div>
            {spirit.entryPoints && <div style={{ fontFamily: inter, fontSize: 14, color: '#c8b99a', lineHeight: 1.8, marginBottom: spirit.legalRights ? 10 : 0 }}>{spirit.entryPoints}</div>}
            {spirit.legalRights && <div style={{ fontFamily: inter, fontSize: 14, color: '#c8b99a', lineHeight: 1.8 }}>{spirit.legalRights}</div>}
          </section>
        )}

        {spirit.deliveranceSequence && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 14 }}>DELIVERANCE SEQUENCE</div>
            <div style={{ fontFamily: inter, fontSize: 14, color: '#c8b99a', lineHeight: 1.9 }}>{spirit.deliveranceSequence}</div>
          </section>
        )}

        {spirit.sessionIndicators && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 14 }}>SESSION INDICATORS</div>
            <div style={{ fontFamily: inter, fontSize: 14, color: '#c8b99a', lineHeight: 1.9 }}>{spirit.sessionIndicators}</div>
          </section>
        )}

        {(resources.length > 0 || loadingResources) && (
          <section style={{ marginBottom: 32 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 14 }}>RELATED RESOURCES</div>
            {loadingResources ? (
              <div style={{ fontFamily: inter, fontSize: 13, color: DIM, fontStyle: 'italic' }}>Loading resources…</div>
            ) : resources.map((r: any) => (
              <div key={r.id} style={{ borderLeft: '2px solid rgba(201,168,76,0.3)', paddingLeft: 12, marginBottom: 10 }}>
                <div style={{ fontFamily: cinzel, fontSize: 11, color: '#c8b99a', marginBottom: 2 }}>{r.title}</div>
                {r.topic && <div style={{ fontFamily: inter, fontSize: 11, color: DIM }}>{r.topic}</div>}
              </div>
            ))}
          </section>
        )}

        <button
          style={{ width: '100%', padding: 14, background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 8, color: GC, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', marginBottom: 16 }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,168,76,0.08)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          🚪 RUN GATEWAY ANALYSIS — {spirit.name.toUpperCase()}
        </button>

        {/* Quick actions */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <button onClick={generatePrayer}
            style={{ flex: 1, padding: '10px 16px', background: 'rgba(201,168,76,0.08)', border: '1px solid #C9A84C', borderRadius: 4, color: GC, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer' }}>
            🙏 GENERATE PRAYER
          </button>
          <button onClick={findScriptures}
            style={{ flex: 1, padding: '10px 16px', background: 'transparent', border: '1px solid #2a2218', borderRadius: 4, color: '#6b5e45', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer' }}>
            📖 FIND SCRIPTURES
          </button>
        </div>

        {showPrayer && (
          <div style={{ marginBottom: 24, padding: '20px 24px', background: '#0a0807', border: '1px solid #2a2218', borderTop: '2px solid #C9A84C', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: cinzel, fontSize: 10, color: GC, letterSpacing: '0.12em' }}>DELIVERANCE PRAYER</div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!prayerLoading && <button onClick={() => navigator.clipboard.writeText(prayer)}
                  style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #2a2218', borderRadius: 3, color: '#6b5e45', fontFamily: cinzel, fontSize: 8, cursor: 'pointer', letterSpacing: '0.08em' }}>COPY</button>}
                {!prayerLoading && <button onClick={() => exportToPDF(prayer, `${spirit.name} Deliverance Prayer`)}
                  style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #2a2218', borderRadius: 3, color: '#6b5e45', fontFamily: cinzel, fontSize: 8, cursor: 'pointer', letterSpacing: '0.08em' }}>PDF</button>}
                <button onClick={() => { setShowPrayer(false); setPrayer('') }}
                  style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: '#4a3f2f', cursor: 'pointer', fontSize: 16 }}>×</button>
              </div>
            </div>
            {prayerLoading ? (
              <div style={{ fontFamily: cinzel, fontSize: 10, color: '#6b5e45', letterSpacing: '0.1em' }}>GENERATING PRAYER...</div>
            ) : (
              <div style={{ fontFamily: inter, fontSize: 15, color: '#c8b99a', lineHeight: 1.9 }}
                dangerouslySetInnerHTML={{ __html: prayer.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#C9A84C">$1</strong>').replace(/\n/g, '<br/>') }} />
            )}
          </div>
        )}

        {showScriptures && (
          <div style={{ marginBottom: 40, padding: '16px 20px', background: '#0a0807', border: '1px solid #2a2218', borderLeft: '2px solid #C9A84C', borderRadius: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.1em' }}>RELEVANT SCRIPTURES</div>
              <button onClick={() => setShowScriptures(false)} style={{ background: 'none', border: 'none', color: '#4a3f2f', cursor: 'pointer', fontSize: 14 }}>×</button>
            </div>
            {scriptureLoading ? (
              <div style={{ fontFamily: cinzel, fontSize: 9, color: '#6b5e45', letterSpacing: '0.1em' }}>SEARCHING SCRIPTURES...</div>
            ) : (
              <div style={{ fontFamily: inter, fontSize: 14, color: '#a89878', lineHeight: 1.8 }}
                dangerouslySetInnerHTML={{ __html: (scriptures[0]?.text || '').replace(/\*\*(.+?)\*\*/g, '<strong style="color:#C9A84C">$1</strong>').replace(/\n/g, '<br/>') }} />
            )}
          </div>
        )}
        {!showPrayer && !showScriptures && <div style={{ marginBottom: 40 }} />}
      </div>
    </div>
  )
}

// ── BUILD ANCESTRY CHAIN ────────────────────────────────────────────────────────

function buildAncestryChain(spirit: Demon, allDemons: Demon[]): Demon[] {
  const chain: Demon[] = []
  const visited = new Set<number>()
  let current: Demon | undefined = spirit
  visited.add(current.id)
  while (current?.parentStrongman) {
    const parent = allDemons.find(d => d.name.toLowerCase() === current!.parentStrongman!.toLowerCase())
    if (!parent || visited.has(parent.id)) break
    visited.add(parent.id)
    chain.unshift(parent)
    current = parent
  }
  return chain
}

// ── MOBILE DOSSIER ─────────────────────────────────────────────────────────────

function MobileDossier({ spirit, demons, resources, loadingResources, onSelectSpirit, onBack, navChain }: {
  spirit: Demon; demons: Demon[]; resources: any[]; loadingResources: boolean
  onSelectSpirit: (d: Demon) => void; onBack: () => void; navChain: Demon[]
}) {
  const [prayer, setPrayer] = useState('')
  const [prayerLoading, setPrayerLoading] = useState(false)
  const [showPrayer, setShowPrayer] = useState(false)

  useEffect(() => { setShowPrayer(false); setPrayer('') }, [spirit.id])

  async function generatePrayer() {
    setPrayerLoading(true); setShowPrayer(true)
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: `Generate a targeted deliverance prayer for the spirit of ${spirit.name}. Kingdom: ${spirit.kingdom}. Entry points: ${spirit.entryPoints || 'various'}. Write in first person as if the minister is leading the prayer. 3-4 paragraphs, direct and authoritative.`, history: [] }),
      })
      const data = await res.json(); setPrayer(data.response || '')
    } catch { setPrayer('Failed to generate. Please try again.') }
    finally { setPrayerLoading(false) }
  }

  const companions = spirit.companionSpirits
    ? String(spirit.companionSpirits).split(',').map(s => s.trim()).filter(Boolean)
    : []

  const section = (label: string, content: React.ReactNode) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontFamily: cinzel, fontSize: 8, color: GC, letterSpacing: '0.14em', marginBottom: 8 }}>{label}</div>
      {content}
    </div>
  )

  return (
    <div>
      {/* Ancestry chain */}
      {navChain.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 4, marginBottom: 14 }}>
          {navChain.map(a => (
            <span key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button onClick={() => onSelectSpirit(a)}
                style={{ background: 'transparent', border: 'none', color: GC, fontFamily: cinzel, fontSize: 9, cursor: 'pointer', opacity: 0.7, padding: 0, textDecoration: 'underline' }}>
                {a.name}
              </button>
              <span style={{ color: DIM, fontSize: 10 }}>›</span>
            </span>
          ))}
          <span style={{ fontFamily: cinzel, fontSize: 9, color: '#8a7a60' }}>{spirit.name}</span>
        </div>
      )}

      <button onClick={onBack}
        style={{ background: 'transparent', border: `1px solid ${MUT}`, borderRadius: 6, color: DIM, fontFamily: cinzel, fontSize: 9, padding: '6px 14px', cursor: 'pointer', marginBottom: 16, letterSpacing: '0.08em' }}>
        ← BACK
      </button>

      {/* Name + badges */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: cinzel, fontSize: 22, color: GC, letterSpacing: '0.06em', marginBottom: 4 }}>{spirit.name}</div>
        {spirit.phonetic && <div style={{ fontFamily: inter, fontSize: 11, color: DIM, fontStyle: 'italic', marginBottom: 2 }}>{spirit.phonetic}</div>}
        {spirit.aka && <div style={{ fontFamily: inter, fontSize: 11, color: DIM, marginBottom: 6 }}>Also: {spirit.aka}</div>}
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
          {spirit.kingdom && <span style={{ fontFamily: cinzel, fontSize: 8, color: GC, border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, padding: '2px 8px', letterSpacing: '0.1em' }}>{spirit.kingdom}</span>}
          {spirit.biblicalRank && <span style={{ fontFamily: cinzel, fontSize: 8, color: '#8B0000', border: '1px solid rgba(139,0,0,0.4)', borderRadius: 4, padding: '2px 8px', letterSpacing: '0.1em' }}>{spirit.biblicalRank}</span>}
          {spirit.isGenerational && <span style={{ fontFamily: cinzel, fontSize: 8, color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 4, padding: '2px 8px', letterSpacing: '0.08em' }}>GENERATIONAL</span>}
          {spirit.isTerritorial && <span style={{ fontFamily: cinzel, fontSize: 8, color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, padding: '2px 8px', letterSpacing: '0.08em' }}>TERRITORIAL</span>}
        </div>
      </div>

      {spirit.description && section('EXECUTIVE SUMMARY',
        <div style={{ fontFamily: inter, fontSize: 14, color: '#c8b99a', lineHeight: 1.7 }}>{spirit.description}</div>
      )}

      {(spirit.entryPoints || spirit.legalRights) && section('ENTRY POINTS / LEGAL GROUNDS',
        <>
          {spirit.entryPoints && <div style={{ fontFamily: inter, fontSize: 13, color: '#c8b99a', lineHeight: 1.7, marginBottom: spirit.legalRights ? 8 : 0 }}>{spirit.entryPoints}</div>}
          {spirit.legalRights && <div style={{ fontFamily: inter, fontSize: 13, color: '#c8b99a', lineHeight: 1.7 }}>{spirit.legalRights}</div>}
        </>
      )}

      {companions.length > 0 && section('COMPANION SPIRITS',
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6, width: '100%', maxWidth: '100%' }}>
          {companions.map(name => {
            const found = demons.find(d => d.name.toLowerCase() === name.toLowerCase())
            return (
              <button key={name} onClick={() => found && onSelectSpirit(found)}
                style={{ minWidth: 0, background: 'rgba(201,168,76,0.06)', border: `1px solid ${found ? 'rgba(201,168,76,0.5)' : MUT}`, borderRadius: 20, padding: '5px 12px', cursor: found ? 'pointer' : 'default', fontFamily: cinzel, fontSize: 9, color: found ? GC : DIM }}>
                {found ? '⚔ ' : ''}{name}
              </button>
            )
          })}
        </div>
      )}

      {spirit.deliveranceSequence && section('DELIVERANCE SEQUENCE',
        <div style={{ fontFamily: inter, fontSize: 13, color: '#c8b99a', lineHeight: 1.7 }}>{spirit.deliveranceSequence}</div>
      )}

      {spirit.sessionIndicators && section('SESSION INDICATORS',
        <div style={{ fontFamily: inter, fontSize: 13, color: '#c8b99a', lineHeight: 1.7 }}>{spirit.sessionIndicators}</div>
      )}

      {spirit.prayerPoints && section('PRAYER POINTS',
        <div style={{ fontFamily: inter, fontSize: 13, color: '#c8b99a', lineHeight: 1.7 }}>{spirit.prayerPoints}</div>
      )}

      {spirit.wriNotes && section('WRI FIELD NOTES',
        <div style={{ fontFamily: inter, fontSize: 13, color: '#c8b99a', lineHeight: 1.7, background: 'rgba(201,168,76,0.04)', border: `1px solid ${BDR}`, borderLeft: `2px solid ${GC}`, borderRadius: 4, padding: '10px 12px' }}>{spirit.wriNotes}</div>
      )}

      {(resources.length > 0 || loadingResources) && section('RESOURCES',
        loadingResources
          ? <div style={{ fontFamily: inter, fontSize: 12, color: DIM }}>Loading…</div>
          : <div>{resources.map((r: any) => (
              <div key={r.id} style={{ borderLeft: '2px solid rgba(201,168,76,0.3)', paddingLeft: 10, marginBottom: 8 }}>
                <div style={{ fontFamily: cinzel, fontSize: 10, color: '#c8b99a', marginBottom: 2 }}>{r.title}</div>
                {r.file_url && <a href={r.file_url} target="_blank" rel="noopener noreferrer" style={{ fontFamily: cinzel, fontSize: 8, color: GC, letterSpacing: '0.08em', textDecoration: 'none' }}>↗ VIEW</a>}
              </div>
            ))}</div>
      )}

      {/* Generate Prayer */}
      <div style={{ marginTop: 8, marginBottom: 40 }}>
        <button onClick={generatePrayer}
          style={{ width: '100%', padding: '12px 16px', background: 'rgba(201,168,76,0.08)', border: `1px solid ${GC}`, borderRadius: 6, color: GC, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', marginBottom: 10 }}>
          🙏 GENERATE DELIVERANCE PRAYER
        </button>
        {showPrayer && (
          <div style={{ padding: '14px 16px', background: '#0a0807', border: '1px solid #2a2218', borderTop: `2px solid ${GC}`, borderRadius: 6 }}>
            {prayerLoading
              ? <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.1em' }}>GENERATING…</div>
              : <div style={{ fontFamily: inter, fontSize: 14, color: '#c8b99a', lineHeight: 1.8 }}
                  dangerouslySetInnerHTML={{ __html: prayer.replace(/\*\*(.+?)\*\*/g, '<strong style="color:#C9A84C">$1</strong>').replace(/\n/g, '<br/>') }} />
            }
          </div>
        )}
      </div>
    </div>
  )
}

// ── MOBILE EXPLORER ────────────────────────────────────────────────────────────

function MobileExplorer({ demons, kingdoms, groupedByKingdom, onSelect }: {
  demons: Demon[]; kingdoms: string[]; groupedByKingdom: Record<string, Demon[]>; onSelect: (d: Demon) => void
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  return (
    <div>
      <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 12 }}>
        {demons.length} SPIRITS IN DATABASE
      </div>
      {kingdoms.map(k => {
        const spirits = groupedByKingdom[k] || []
        const isOpen  = !collapsed.has(k)
        return (
          <div key={k} style={{ marginBottom: 4 }}>
            <button
              onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n })}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 0', background: 'transparent', border: 'none', borderBottom: `1px solid ${BDR}`, cursor: 'pointer', textAlign: 'left' as const }}>
              <span style={{ fontFamily: cinzel, fontSize: 10, color: GC, letterSpacing: '0.1em', flex: 1, textTransform: 'uppercase' as const }}>{k}</span>
              <span style={{ fontFamily: inter, fontSize: 10, color: DIM }}>{spirits.length}</span>
              <span style={{ fontSize: 12, color: DIM, display: 'inline-block', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>›</span>
            </button>
            {isOpen && (
              <div style={{ paddingTop: 4 }}>
                {spirits.map(d => (
                  <button key={d.id} onClick={() => onSelect(d)}
                    style={{ display: 'block', width: '100%', padding: '8px 0 8px 12px', background: 'transparent', border: 'none', borderLeft: '2px solid transparent', cursor: 'pointer', textAlign: 'left' as const }}
                    onMouseEnter={e => (e.currentTarget.style.borderLeftColor = GC)}
                    onMouseLeave={e => (e.currentTarget.style.borderLeftColor = 'transparent')}>
                    <span style={{ fontFamily: inter, fontSize: 13, color: '#8a7a6a' }}>{d.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── CONSTANTS ──────────────────────────────────────────────────────────────────

const KINGDOM_ORDER = ['Hell', 'Darkness', 'Air', 'Water', 'Earth', 'Witchcraft', 'Occult']

// ── MAIN COMPONENT ─────────────────────────────────────────────────────────────

export function SpiritNetwork({ demons, isMobile, getToken: _getToken }: SpiritNetworkProps) {
  const [mounted,          setMounted]          = useState(false)
  const [selectedSpirit,   setSelectedSpirit]   = useState<Demon | null>(null)
  const [mode,             setMode]             = useState<'network' | 'dossier'>('network')
  const [activeDrawer,     setActiveDrawer]     = useState<'scriptures' | 'gateway' | 'documents' | 'library' | null>(null)
  const [dossierExpanded,  setDossierExpanded]  = useState(false)
  const [searchQuery,      setSearchQuery]      = useState('')
  const [resources,        setResources]        = useState<any[]>([])
  const [loadingResources, setLoadingResources] = useState(false)
  const [navStack,         setNavStack]         = useState<Demon[]>([])
  const [libraryHits,      setLibraryHits]      = useState<any[]>([])
  const [loadingLibrary,   setLoadingLibrary]   = useState(false)
  const [recentSpirits,    setRecentSpirits]    = useState<any[]>([])
  const [compareMode,      setCompareMode]      = useState(false)
  const [compareQuery,     setCompareQuery]     = useState('')
  const [comparison,       setComparison]       = useState<{ text: string; spirit1: string; spirit2: string } | null>(null)
  const [comparingLoading, setComparingLoading] = useState(false)
  const _touchStartX = useRef(0)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    try {
      const stored = JSON.parse(localStorage.getItem('wri_recent_spirits') || '[]')
      setRecentSpirits(stored)
    } catch {}
    // Auto-select spirit prefilled from Body Map
    try {
      const prefill = localStorage.getItem('wri_prefill_spirit')
      if (prefill) {
        localStorage.removeItem('wri_prefill_spirit')
        if (demons.length > 0) {
          const match = demons.find((d: Demon) => d.name.toLowerCase() === prefill.toLowerCase())
          if (match) {
            setSelectedSpirit(match)
            fetchResources(match)
            fetchLibraryIntel(match)
            trackRecentSpirit(match)
          }
        }
      }
    } catch {}
  }, [demons, mounted])

  async function runComparison(spirit1: Demon, spirit2: Demon) {
    setComparingLoading(true)
    try {
      const res = await fetch('/api/ai-assistant', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Compare these two demonic spirits for a deliverance minister:

SPIRIT 1: ${spirit1.name}
Kingdom: ${spirit1.kingdom}
Description: ${spirit1.description}
Manifestations: ${spirit1.sessionIndicators}
Entry Points: ${spirit1.entryPoints || 'not specified'}

SPIRIT 2: ${spirit2.name}
Kingdom: ${spirit2.kingdom}
Description: ${spirit2.description}
Manifestations: ${spirit2.sessionIndicators}
Entry Points: ${spirit2.entryPoints || 'not specified'}

Provide a practical comparison covering:
1. **KEY DIFFERENCES** -- How to distinguish them in a session
2. **SIMILARITIES** -- Where they overlap or work together
3. **WHEN TO SUSPECT EACH** -- Different presenting patterns
4. **DELIVERANCE APPROACH** -- Any differences in how to address each
5. **OFTEN CONFUSED BECAUSE** -- Why ministers mix these up

Be direct and practical. This is for active ministry use.`,
          history: [],
        }),
      })
      const data = await res.json()
      setComparison({ text: data.response || '', spirit1: spirit1.name, spirit2: spirit2.name })
    } catch { setComparison(null) }
    finally { setComparingLoading(false) }
  }

  const searchResults = searchQuery.length > 1
    ? demons.filter(d => d.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
    : []

  const fetchResources = useCallback((demon: Demon) => {
    setResources([])
    setLoadingResources(true)
    fetch(`/api/spirit-resources?spirit=${encodeURIComponent(demon.name)}`)
      .then(r => r.json())
      .then(d => { setResources(d.resources || []); setLoadingResources(false) })
      .catch(() => { setResources([]); setLoadingResources(false) })
  }, [])

  const fetchLibraryIntel = useCallback((demon: Demon) => {
    setLibraryHits([])
    setLoadingLibrary(true)
    fetch('/api/library-search', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        query: `${demon.name} spirit demon manifestations entry points deliverance`,
        limit: 6,
      }),
    })
      .then(r => r.json())
      .then(d => { setLibraryHits(d.chunks || []); setLoadingLibrary(false) })
      .catch(() => { setLibraryHits([]); setLoadingLibrary(false) })
  }, [])

  function trackRecentSpirit(demon: Demon) {
    try {
      const recent = JSON.parse(localStorage.getItem('wri_recent_spirits') || '[]')
      const updated = [
        { name: demon.name, kingdom: demon.kingdom, id: demon.id },
        ...recent.filter((r: any) => r.name !== demon.name),
      ].slice(0, 8)
      localStorage.setItem('wri_recent_spirits', JSON.stringify(updated))
      setRecentSpirits(updated)
    } catch {}
  }

  // Navigate to a spirit — pushes current to history stack
  const selectSpirit = useCallback((demon: Demon) => {
    setSelectedSpirit(prev => {
      if (prev) setNavStack(stack => [...stack, prev])
      return demon
    })
    setDossierExpanded(false)
    setComparison(null)
    fetchResources(demon)
    fetchLibraryIntel(demon)
    trackRecentSpirit(demon)
    if (_getToken) {
      _getToken().then(token => {
        if (!token) return
        fetch('/api/ai-history', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: 'spirit-network', query: demon.name, context: { spiritName: demon.name, kingdom: demon.kingdom } }),
        }).catch(() => {})
      })
    }
  }, [fetchResources, fetchLibraryIntel, _getToken])

  // Navigate to parent — pops history if parent is in stack, else resets
  const selectParent = useCallback((demon: Demon) => {
    setNavStack(prev => {
      const idx = prev.findIndex(d => d.id === demon.id)
      return idx >= 0 ? prev.slice(0, idx) : []
    })
    setSelectedSpirit(demon)
    setDossierExpanded(false)
    fetchResources(demon)
    fetchLibraryIntel(demon)
  }, [fetchResources, fetchLibraryIntel])

  // Navigate to a breadcrumb item at a given stack index
  const navigateToHistory = useCallback((index: number, demon: Demon) => {
    setNavStack(prev => prev.slice(0, index))
    setSelectedSpirit(demon)
    fetchResources(demon)
    fetchLibraryIntel(demon)
  }, [fetchResources, fetchLibraryIntel])

  // Search select — clears history
  const searchSelect = useCallback((demon: Demon) => {
    setNavStack([])
    setSelectedSpirit(demon)
    setSearchQuery('')
    setDossierExpanded(false)
    setComparison(null)
    fetchResources(demon)
    fetchLibraryIntel(demon)
    trackRecentSpirit(demon)
    if (_getToken) {
      _getToken().then(token => {
        if (!token) return
        fetch('/api/ai-history', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ tool: 'spirit-network', query: demon.name, context: { spiritName: demon.name, kingdom: demon.kingdom } }),
        }).catch(() => {})
      })
    }
  }, [fetchResources, fetchLibraryIntel, _getToken])

  const groupedByKingdom = demons.reduce((acc: Record<string, Demon[]>, d) => {
    const k = d.kingdom || 'Other'; if (!acc[k]) acc[k] = []; acc[k].push(d); return acc
  }, {})

  const kingdoms = Object.keys(groupedByKingdom).sort((a, b) => {
    const ai = KINGDOM_ORDER.indexOf(a), bi = KINGDOM_ORDER.indexOf(b)
    if (ai === -1 && bi === -1) return a.localeCompare(b)
    if (ai === -1) return 1; if (bi === -1) return -1
    return ai - bi
  })

  const companionNames = selectedSpirit
    ? String(selectedSpirit.companionSpirits || '').split(',').map(s => s.trim()).filter(Boolean)
    : []

  // Full ancestry chain from root to selected spirit's parent
  const navChain = selectedSpirit ? buildAncestryChain(selectedSpirit, demons) : []

  // FIX 3 — prevent hydration mismatch: don't render isMobile-dependent content until after mount
  if (!mounted) return <div style={{ flex: 1, background: DARK }} />

  // ── MOBILE ─────────────────────────────────────────────────────────────────
  if (isMobile) {
    const mobileTab = selectedSpirit ? mode : 'network'
    const visibleDemons = searchQuery.length > 1 ? searchResults : demons

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, background: DARK, overflow: 'hidden' }}>
        {/* Search bar */}
        <div style={{ padding: '12px 16px 8px', flexShrink: 0 }}>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search ${demons.length} spirits…`}
            style={{ width: '100%', padding: '10px 14px', background: SURF, border: `1px solid ${MUT}`, borderRadius: 6, color: '#c8b99a', fontFamily: inter, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const }} />
        </div>

        {/* NETWORK / DOSSIER tabs */}
        <div style={{ display: 'flex', padding: '0 16px', borderBottom: `1px solid ${BDR}`, flexShrink: 0 }}>
          {(['network', 'dossier'] as const).map(m => (
            <button key={m} onClick={() => { if (m === 'dossier' && !selectedSpirit) return; setMode(m) }}
              style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: mobileTab === m ? `2px solid ${GC}` : '2px solid transparent', color: mobileTab === m ? GC : (m === 'dossier' && !selectedSpirit ? '#2a2035' : DIM), fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: m === 'dossier' && !selectedSpirit ? 'default' : 'pointer', marginBottom: -1 }}>
              {m.toUpperCase()}
            </button>
          ))}
          {selectedSpirit && (
            <span style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.06em', alignSelf: 'center', marginLeft: 8, opacity: 0.8, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
              — {selectedSpirit.name}
            </span>
          )}
        </div>

        {/* NETWORK tab: CSS org chart when spirit selected, card list otherwise */}
        {mobileTab === 'network' && (
          <div style={{ flex: 1, overflowY: 'auto' as const, padding: '12px 16px' }}>
            {selectedSpirit ? (
              // ── CSS vertical org chart ──
              <div>
                {/* Ancestry chain breadcrumb */}
                {navChain.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, alignItems: 'center', gap: 4, marginBottom: 16 }}>
                    {navChain.map((a, i) => (
                      <span key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button onClick={() => { selectSpirit(a); setMode('network') }}
                          style={{ background: 'transparent', border: 'none', color: GC, fontFamily: cinzel, fontSize: 9, cursor: 'pointer', opacity: 0.7, padding: 0, textDecoration: 'underline', letterSpacing: '0.06em' }}>
                          {a.name}
                        </button>
                        <span style={{ color: DIM, fontSize: 10 }}>›</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Vertical hierarchy nodes */}
                <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 0 }}>
                  {/* Parent node */}
                  {selectedSpirit.parentStrongman && (() => {
                    const parent = demons.find(d => d.name.toLowerCase() === (selectedSpirit.parentStrongman || '').toLowerCase())
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
                        <div onClick={() => parent && selectSpirit(parent)}
                          style={{ padding: '10px 20px', background: 'rgba(201,168,76,0.04)', border: `1px solid ${parent ? 'rgba(201,168,76,0.3)' : MUT}`, borderRadius: 8, cursor: parent ? 'pointer' : 'default', textAlign: 'center' as const, minWidth: 160, maxWidth: 240 }}>
                          <div style={{ fontFamily: cinzel, fontSize: 10, color: parent ? GC : DIM, letterSpacing: '0.04em' }}>{selectedSpirit.parentStrongman}</div>
                          {parent?.kingdom && <div style={{ fontFamily: inter, fontSize: 9, color: DIM, marginTop: 2 }}>{parent.kingdom}</div>}
                          {parent && <div style={{ fontFamily: cinzel, fontSize: 8, color: GC, marginTop: 4, opacity: 0.6 }}>↑ tap to navigate</div>}
                        </div>
                        {/* Connector */}
                        <div style={{ width: 1, height: 24, background: 'rgba(201,168,76,0.2)' }} />
                      </div>
                    )
                  })()}

                  {/* Selected spirit node */}
                  <div style={{ padding: '14px 24px', background: 'rgba(201,168,76,0.12)', border: `2px solid ${GC}`, borderRadius: 10, textAlign: 'center' as const, minWidth: 200, maxWidth: 280, position: 'relative' as const }}>
                    <div style={{ fontFamily: cinzel, fontSize: 15, color: GC, letterSpacing: '0.06em', marginBottom: 4 }}>{selectedSpirit.name}</div>
                    {selectedSpirit.kingdom && <div style={{ fontFamily: inter, fontSize: 10, color: DIM }}>{selectedSpirit.kingdom}</div>}
                    {selectedSpirit.biblicalRank && <div style={{ fontFamily: cinzel, fontSize: 8, color: '#8B0000', marginTop: 4, letterSpacing: '0.08em' }}>{selectedSpirit.biblicalRank}</div>}
                  </div>

                  {/* Companion spirits */}
                  {companionNames.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center' }}>
                      <div style={{ width: 1, height: 24, background: 'rgba(201,168,76,0.2)' }} />
                      <div style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.1em', marginBottom: 10 }}>COMPANION SPIRITS</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, justifyContent: 'center' as const, maxWidth: 300 }}>
                        {companionNames.slice(0, 8).map(name => {
                          const found = demons.find(d => d.name.toLowerCase() === name.toLowerCase())
                          return (
                            <button key={name} onClick={() => found && selectSpirit(found)}
                              style={{ padding: '8px 14px', background: found ? 'rgba(201,168,76,0.06)' : 'rgba(255,255,255,0.02)', border: `1px solid ${found ? 'rgba(201,168,76,0.35)' : MUT}`, borderRadius: 8, cursor: found ? 'pointer' : 'default', fontFamily: cinzel, fontSize: 9, color: found ? GC : DIM, letterSpacing: '0.04em' }}>
                              {name}
                            </button>
                          )
                        })}
                        {companionNames.length > 8 && (
                          <span style={{ fontFamily: inter, fontSize: 10, color: DIM, alignSelf: 'center' }}>+{companionNames.length - 8} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Subordinate Spirits — mobile */}
                {(() => {
                  const children = demons.filter(d =>
                    d.parentStrongman?.toLowerCase() === selectedSpirit.name.toLowerCase() && d.id !== selectedSpirit.id
                  )
                  if (children.length === 0) return null
                  return (
                    <div style={{ marginTop: 20 }}>
                      <div style={{ width: 1, height: 20, background: 'rgba(201,168,76,0.2)', margin: '0 auto' }} />
                      <div style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.1em', marginBottom: 10, textAlign: 'center' as const }}>
                        SUBORDINATE SPIRITS ({children.length})
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, justifyContent: 'center' as const }}>
                        {children.map(child => (
                          <button key={child.id} onClick={() => selectSpirit(child)}
                            style={{ padding: '8px 14px', background: 'rgba(201,168,76,0.04)', border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 8, cursor: 'pointer', fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.04em', textAlign: 'left' as const }}>
                            <div>{child.name}</div>
                            {child.kingdom && <div style={{ fontFamily: inter, fontSize: 8, color: DIM, marginTop: 2 }}>{child.kingdom}</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* View dossier button */}
                <button onClick={() => setMode('dossier')}
                  style={{ display: 'block', width: '100%', marginTop: 24, padding: '12px 16px', background: 'transparent', border: `1px solid ${GC}`, borderRadius: 8, color: GC, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
                  VIEW FULL DOSSIER →
                </button>
                <button onClick={() => { setSelectedSpirit(null); setNavStack([]) }}
                  style={{ display: 'block', width: '100%', marginTop: 8, padding: '10px 16px', background: 'transparent', border: `1px solid ${MUT}`, borderRadius: 8, color: DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
                  ← BACK TO NETWORK
                </button>
              </div>
            ) : (
              // ── Spirit card list ──
              <>
                {visibleDemons.length === 0 && (
                  <div style={{ fontFamily: inter, fontSize: 13, color: DIM, textAlign: 'center' as const, paddingTop: 40 }}>No spirits found</div>
                )}
                {visibleDemons.map(d => {
                  const comps = d.companionSpirits
                    ? String(d.companionSpirits).split(',').map(s => s.trim()).filter(Boolean).slice(0, 3)
                    : []
                  const isActive = selectedSpirit?.id === d.id
                  return (
                    <div key={d.id} onClick={() => { searchSelect(d); setMode('network') }}
                      style={{ marginBottom: 10, padding: '12px 14px', background: isActive ? 'rgba(201,168,76,0.08)' : SURF, border: `1px solid ${isActive ? 'rgba(201,168,76,0.4)' : BDR}`, borderRadius: 8, cursor: 'pointer', borderLeft: `3px solid ${isActive ? GC : 'transparent'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: comps.length > 0 || d.parentStrongman ? 6 : 0 }}>
                        <span style={{ fontFamily: cinzel, fontSize: 14, color: GC, letterSpacing: '0.04em', flex: 1 }}>{d.name}</span>
                        {d.kingdom && (
                          <span style={{ fontFamily: inter, fontSize: 9, color: GC, background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 10, padding: '2px 8px', flexShrink: 0 }}>
                            {d.kingdom}
                          </span>
                        )}
                      </div>
                      {d.parentStrongman && (
                        <div style={{ fontFamily: inter, fontSize: 10, color: DIM, marginBottom: comps.length > 0 ? 5 : 0 }}>
                          Under: <span style={{ color: '#6a5a4a' }}>{d.parentStrongman}</span>
                        </div>
                      )}
                      {comps.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                          {comps.map(name => (
                            <span key={name} style={{ fontFamily: inter, fontSize: 9, color: '#5a4f3a', background: '#1a1520', border: `1px solid ${BDR}`, borderRadius: 10, padding: '2px 7px' }}>
                              {name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

        {/* DOSSIER tab */}
        {mobileTab === 'dossier' && selectedSpirit && (
          <div style={{ flex: 1, overflowY: 'auto' as const, padding: '12px 16px' }}>
            <MobileDossier spirit={selectedSpirit} demons={demons} resources={resources} loadingResources={loadingResources}
              onSelectSpirit={d => { selectSpirit(d); setMode('dossier') }} onBack={() => { setSelectedSpirit(null); setNavStack([]); setMode('network') }}
              navChain={navChain} />
          </div>
        )}
      </div>
    )
  }

  // ── DESKTOP ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column' as const, height: '100%', background: DARK, overflow: 'hidden' }}>

      {/* TOP BAR */}
      <div style={{ height: 56, display: 'flex', alignItems: 'center', gap: 16, padding: '0 20px', borderBottom: `1px solid ${BDR}`, background: DARK, flexShrink: 0, zIndex: 10 }}>
        <span style={{ fontFamily: cinzel, fontSize: 13, color: GC, letterSpacing: '0.15em', flexShrink: 0 }}>
          SPIRIT NETWORK
        </span>

        {/* Search bar — primary navigation */}
        <div style={{ position: 'relative' as const, width: 320 }}>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search ${demons.length} spirits...`}
            style={{ width: '100%', padding: '8px 12px 8px 34px', background: SURF, border: `1px solid ${MUT}`, borderRadius: 6, color: '#c8b99a', fontFamily: inter, fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
            onFocus={e => (e.target.style.borderColor = GC)}
            onBlur={e => (e.target.style.borderColor = MUT)}
          />
          <span style={{ position: 'absolute' as const, left: 11, top: '50%', transform: 'translateY(-50%)', color: DIM, fontSize: 13, pointerEvents: 'none' as const }}>🔍</span>
          {searchQuery && searchResults.length > 0 && (
            <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, background: SURF, border: `1px solid ${MUT}`, borderRadius: 6, marginTop: 4, zIndex: 100, maxHeight: 280, overflowY: 'auto' as const }}>
              {searchResults.map(d => (
                <div key={d.id} onClick={() => searchSelect(d)}
                  style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', gap: 10 }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#1a1528')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <span style={{ fontFamily: inter, fontSize: 13, color: '#c8b99a', flex: 1 }}>{d.name}</span>
                  <span style={{ fontFamily: inter, fontSize: 10, color: DIM, background: BDR, padding: '2px 8px', borderRadius: 10 }}>{d.kingdom}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, background: SURF, border: `1px solid ${MUT}`, borderRadius: 6, padding: 3, flexShrink: 0 }}>
          {(['network', 'dossier'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              style={{ padding: '5px 14px', borderRadius: 4, border: 'none', background: mode === m ? 'rgba(201,168,76,0.15)' : 'transparent', color: mode === m ? GC : DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' as const }}>
              {m}
            </button>
          ))}
        </div>

        {/* Compare mode toggle */}
        <button onClick={() => { setCompareMode(m => !m); setComparison(null); setCompareQuery('') }}
          style={{ padding: '5px 12px', background: compareMode ? 'rgba(201,168,76,0.15)' : 'transparent', border: `1px solid ${compareMode ? GC : MUT}`, borderRadius: 4, color: compareMode ? GC : DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', flexShrink: 0 }}>
          ⚖ COMPARE
        </button>

        {/* Compare search input */}
        {compareMode && selectedSpirit && (
          <div style={{ position: 'relative' as const, width: 220 }}>
            <input
              value={compareQuery}
              onChange={e => setCompareQuery(e.target.value)}
              placeholder="Compare with..."
              style={{ width: '100%', padding: '8px 12px', background: SURF, border: `1px solid ${MUT}`, borderRadius: 6, color: '#c8b99a', fontFamily: inter, fontSize: 12, outline: 'none', boxSizing: 'border-box' as const }}
            />
            {compareQuery.length > 1 && (() => {
              const compareResults = demons.filter(d =>
                d.name.toLowerCase().includes(compareQuery.toLowerCase()) && d.id !== selectedSpirit.id
              ).slice(0, 5)
              return compareResults.length > 0 ? (
                <div style={{ position: 'absolute' as const, top: '100%', left: 0, right: 0, background: SURF, border: `1px solid ${MUT}`, borderRadius: 6, marginTop: 4, zIndex: 100 }}>
                  {compareResults.map(d => (
                    <div key={d.id}
                      onClick={() => { setCompareQuery(''); runComparison(selectedSpirit, d) }}
                      style={{ padding: '8px 12px', cursor: 'pointer', borderBottom: `1px solid ${BDR}`, fontFamily: inter, fontSize: 12, color: '#c8b99a' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#1a1528')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      {d.name}
                    </div>
                  ))}
                </div>
              ) : null
            })()}
          </div>
        )}

        {selectedSpirit && (
          <div style={{ fontFamily: cinzel, fontSize: 11, color: GC, letterSpacing: '0.06em', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
            {selectedSpirit.name}
            {selectedSpirit.kingdom && <span style={{ color: DIM, fontFamily: inter, fontSize: 10, marginLeft: 8 }}>{selectedSpirit.kingdom}</span>}
          </div>
        )}
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* CENTER — full-width canvas, position relative for flyout */}
        <div style={{ flex: 1, position: 'relative' as const, overflow: 'hidden', minWidth: 0 }}
          onClick={() => setActiveDrawer(null)}>
          {mode === 'network' ? (
            selectedSpirit ? (
              <div style={{ height: '100%', overflowY: 'auto' as const, padding: '20px 28px 20px 28px', background: DARK }}>

                {/* Comparison display */}
                {(comparison || comparingLoading) && (
                  <div style={{ marginBottom: 24, padding: '20px 24px', background: '#0a0807', border: '1px solid #2a2218', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 12, color: GC, letterSpacing: '0.1em' }}>
                        {comparison ? `${comparison.spirit1} vs ${comparison.spirit2}` : 'COMPARING...'}
                      </div>
                      {comparison && (
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => navigator.clipboard.writeText(comparison.text)}
                            style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #2a2218', borderRadius: 3, color: '#6b5e45', fontFamily: cinzel, fontSize: 8, cursor: 'pointer', letterSpacing: '0.08em' }}>COPY</button>
                          <button onClick={() => exportToPDF(comparison.text, `${comparison.spirit1} vs ${comparison.spirit2}`)}
                            style={{ padding: '4px 10px', background: 'transparent', border: '1px solid #2a2218', borderRadius: 3, color: '#6b5e45', fontFamily: cinzel, fontSize: 8, cursor: 'pointer', letterSpacing: '0.08em' }}>PDF</button>
                          <button onClick={() => setComparison(null)}
                            style={{ padding: '4px 8px', background: 'transparent', border: 'none', color: '#4a3f2f', cursor: 'pointer', fontSize: 16 }}>×</button>
                        </div>
                      )}
                    </div>
                    {comparingLoading ? (
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: '#6b5e45', letterSpacing: '0.1em' }}>GENERATING COMPARISON...</div>
                    ) : comparison && (
                      <div style={{ fontFamily: inter, fontSize: 14, color: '#a89878', lineHeight: 1.8 }}
                        dangerouslySetInnerHTML={{ __html: comparison.text
                          .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#C9A84C">$1</strong>')
                          .replace(/^## (.+)$/gm, '<div style="font-family:Cinzel,serif;font-size:11px;color:#C9A84C;letter-spacing:0.1em;margin:20px 0 8px">$1</div>')
                          .replace(/^### (.+)$/gm, '<div style="font-family:Cinzel,serif;font-size:10px;color:#8a7a60;letter-spacing:0.08em;margin:14px 0 6px">$1</div>')
                          .replace(/\n/g, '<br/>') }} />
                    )}
                  </div>
                )}

                {/* Ancestry breadcrumb — walks up parentStrongman chain from root to current */}
                {navChain.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12, flexWrap: 'wrap' as const }}>
                    {navChain.map(a => (
                      <span key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span onClick={e => { e.stopPropagation(); selectSpirit(a) }}
                          style={{ fontFamily: cinzel, fontSize: 10, color: GC, cursor: 'pointer', opacity: 0.5, letterSpacing: '0.06em' }}
                          onMouseEnter={e => (e.currentTarget.style.opacity = '0.8')}
                          onMouseLeave={e => (e.currentTarget.style.opacity = '0.5')}>
                          {a.name}
                        </span>
                        <span style={{ color: MUT, fontSize: 10 }}>→</span>
                      </span>
                    ))}
                    <span style={{ fontFamily: cinzel, fontSize: 10, color: GC, letterSpacing: '0.06em' }}>{selectedSpirit.name}</span>
                  </div>
                )}

                {/* SVG Org Chart */}
                <OrgChartSVG
                  selected={selectedSpirit}
                  allDemons={demons}
                  onSelectParent={selectParent}
                  onSelectCompanion={selectSpirit}
                />

                {/* Quick summary below chart */}
                {selectedSpirit.description && (
                  <div style={{ marginTop: 20, padding: '16px 0', borderTop: `1px solid ${BDR}` }}>
                    <div style={{ fontFamily: cinzel, fontSize: 8, color: GC, letterSpacing: '0.14em', marginBottom: 10 }}>EXECUTIVE SUMMARY</div>
                    <div style={{ fontFamily: inter, fontSize: 14, color: '#c8b99a', lineHeight: 1.8, maxWidth: 680 }}>
                      {selectedSpirit.description}
                    </div>
                  </div>
                )}

                {/* Companion chips */}
                {companionNames.length > 0 && (
                  <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BDR}` }}>
                    <div style={{ fontFamily: cinzel, fontSize: 8, color: GC, letterSpacing: '0.14em', marginBottom: 10 }}>COMPANION SPIRITS</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
                      {companionNames.map(name => {
                        const found = demons.find(d => d.name.toLowerCase() === name.toLowerCase())
                        return (
                          <button key={name} onClick={e => { e.stopPropagation(); found && selectSpirit(found) }}
                            style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${found ? 'rgba(201,168,76,0.4)' : MUT}`, borderRadius: 20, padding: '5px 12px', cursor: found ? 'pointer' : 'default', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.05em', color: found ? GC : DIM }}
                            onMouseEnter={e => { if (found) e.currentTarget.style.background = 'rgba(201,168,76,0.14)' }}
                            onMouseLeave={e => { if (found) e.currentTarget.style.background = 'rgba(201,168,76,0.06)' }}>
                            {found ? '⚔ ' : ''}{name}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* Subordinate Spirits — spirits who report to this one */}
                {(() => {
                  const children = demons.filter(d =>
                    d.parentStrongman?.toLowerCase() === selectedSpirit.name.toLowerCase() && d.id !== selectedSpirit.id
                  )
                  if (children.length === 0) return null
                  return (
                    <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${BDR}` }}>
                      <div style={{ fontFamily: cinzel, fontSize: 8, color: GC, letterSpacing: '0.14em', marginBottom: 12 }}>
                        SUBORDINATE SPIRITS ({children.length})
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
                        {children.map(child => (
                          <button key={child.id} onClick={e => { e.stopPropagation(); selectSpirit(child) }}
                            style={{ background: 'rgba(201,168,76,0.04)', border: `1px solid ${BDR}`, borderLeft: `2px solid rgba(201,168,76,0.3)`, borderRadius: 6, padding: '10px 12px', cursor: 'pointer', textAlign: 'left' as const, transition: 'all 0.12s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.09)'; e.currentTarget.style.borderLeftColor = GC }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(201,168,76,0.04)'; e.currentTarget.style.borderLeftColor = 'rgba(201,168,76,0.3)' }}>
                            <div style={{ fontFamily: cinzel, fontSize: 10, color: GC, letterSpacing: '0.05em', marginBottom: 3 }}>{child.name}</div>
                            {child.kingdom && <div style={{ fontFamily: inter, fontSize: 9, color: DIM }}>{child.kingdom}</div>}
                            {child.biblicalRank && <div style={{ fontFamily: cinzel, fontSize: 8, color: '#6b5e45', letterSpacing: '0.04em', marginTop: 2 }}>{child.biblicalRank}</div>}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })()}
              </div>
            ) : (
              <EmptyCanvas onSelectSpirit={searchSelect} demons={demons} recentSpirits={recentSpirits} />
            )
          ) : selectedSpirit ? (
            <DossierMode spirit={selectedSpirit} demons={demons} resources={resources} loadingResources={loadingResources} onSelectSpirit={selectSpirit} />
          ) : (
            <EmptyCanvas onSelectSpirit={searchSelect} demons={demons} />
          )}

          {/* FLYOUT TAB HANDLES — only when a spirit is selected */}
          {selectedSpirit && (
            <div style={{ position: 'absolute' as const, right: 0, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column' as const, gap: 6, zIndex: 20 }}>
              {[
                { key: 'scriptures' as const, icon: '📖', label: 'SCRIPTURES', show: !!selectedSpirit.scripture },
                { key: 'gateway'    as const, icon: '🧠', label: 'GATEWAY',    show: true },
                { key: 'documents'  as const, icon: '📂', label: 'DOCUMENTS',  show: true },
                { key: 'library'    as const, icon: '📚', label: 'LIBRARY',    show: true },
              ].filter(t => t.show).map(tab => (
                <button key={tab.key}
                  onClick={e => { e.stopPropagation(); setActiveDrawer(activeDrawer === tab.key ? null : tab.key) }}
                  style={{ writingMode: 'vertical-rl' as const, textOrientation: 'mixed' as const, padding: '12px 7px', background: activeDrawer === tab.key ? 'rgba(201,168,76,0.15)' : '#0d0a14', border: `1px solid ${activeDrawer === tab.key ? GC : MUT}`, borderRight: 'none', borderRadius: '6px 0 0 6px', color: activeDrawer === tab.key ? GC : DIM, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* FLYOUT PANEL — slides in from right edge */}
          {selectedSpirit && (
            <div onClick={e => e.stopPropagation()}
              style={{ position: 'absolute' as const, right: 32, top: 0, bottom: 0, width: 272, background: '#09070F', borderLeft: `1px solid ${BDR}`, transform: activeDrawer ? 'translateX(0)' : 'translateX(110%)', transition: 'transform 200ms ease', zIndex: 19, overflowY: 'auto' as const, padding: 20 }}>
              <button onClick={() => setActiveDrawer(null)} style={{ position: 'absolute' as const, top: 10, right: 12, background: 'transparent', border: 'none', color: DIM, fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>

              {activeDrawer === 'scriptures' && (
                <>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 12, paddingRight: 20 }}>📖 SCRIPTURES</div>
                  <div style={{ fontFamily: inter, fontSize: 13, color: '#8a7a6a', lineHeight: 1.7 }}>{selectedSpirit.scripture || 'No scriptures on record.'}</div>
                </>
              )}

              {activeDrawer === 'gateway' && (
                <>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 12, paddingRight: 20 }}>🧠 GATEWAY INTEL</div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: inter, fontSize: 11, color: DIM, flexShrink: 0 }}>Generational:</span>
                      <span style={{ fontFamily: inter, fontSize: 10, padding: '1px 8px', borderRadius: 10, background: selectedSpirit.isGenerational ? 'rgba(248,113,113,0.1)' : 'rgba(255,255,255,0.03)', color: selectedSpirit.isGenerational ? '#f87171' : DIM, border: `1px solid ${selectedSpirit.isGenerational ? 'rgba(248,113,113,0.3)' : MUT}` }}>
                        {selectedSpirit.isGenerational ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: inter, fontSize: 11, color: DIM, flexShrink: 0 }}>Territorial:</span>
                      <span style={{ fontFamily: inter, fontSize: 10, padding: '1px 8px', borderRadius: 10, background: selectedSpirit.isTerritorial ? 'rgba(251,191,36,0.1)' : 'rgba(255,255,255,0.03)', color: selectedSpirit.isTerritorial ? '#fbbf24' : DIM, border: `1px solid ${selectedSpirit.isTerritorial ? 'rgba(251,191,36,0.3)' : MUT}` }}>
                        {selectedSpirit.isTerritorial ? 'Yes' : 'No'}
                      </span>
                    </div>
                    {selectedSpirit.primaryBattlefield && (
                      <div>
                        <div style={{ fontFamily: inter, fontSize: 10, color: DIM, marginBottom: 3 }}>Battlefield</div>
                        <div style={{ fontFamily: inter, fontSize: 12, color: '#8a7a6a' }}>{selectedSpirit.primaryBattlefield}</div>
                      </div>
                    )}
                    {selectedSpirit.entryPoints && (
                      <div>
                        <div style={{ fontFamily: inter, fontSize: 10, color: DIM, marginBottom: 3 }}>Entry Points</div>
                        <div style={{ fontFamily: inter, fontSize: 12, color: '#8a7a6a', lineHeight: 1.6 }}>{selectedSpirit.entryPoints}</div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {activeDrawer === 'documents' && (
                <>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 12, paddingRight: 20 }}>
                    📂 RECOMMENDED RESOURCES{resources.length > 0 ? ` (${resources.length})` : ''}
                  </div>
                  {loadingResources ? (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      {[80, 60, 70].map((w, i) => (
                        <div key={i} style={{ height: 12, background: BDR, borderRadius: 4, width: `${w}%` }} />
                      ))}
                    </div>
                  ) : resources.length === 0 ? (
                    <div style={{ fontFamily: inter, fontSize: 12, color: DIM, fontStyle: 'italic' }}>No documents tagged for this spirit.</div>
                  ) : resources.map((r: any) => (
                    <div key={r.id} style={{ padding: '10px 12px', marginBottom: 8, background: '#0a0807', border: '1px solid #2a2218', borderLeft: '2px solid #C9A84C', borderRadius: 4 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: GC, letterSpacing: '0.04em', marginBottom: 4 }}>{r.title}</div>
                      {r.description && (
                        <div style={{ fontFamily: inter, fontSize: 12, color: '#6b5e45', marginBottom: 6, lineHeight: 1.5 }}>
                          {r.description.slice(0, 80)}{r.description.length > 80 ? '...' : ''}
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        {r.tier && (
                          <span style={{ fontFamily: cinzel, fontSize: 7, color: '#4a3f2f', padding: '1px 6px', border: '1px solid #2a2218', borderRadius: 10 }}>
                            {r.tier.toUpperCase()}
                          </span>
                        )}
                        {r.file_url && (
                          <a href={r.file_url} target="_blank" rel="noopener noreferrer"
                            style={{ fontFamily: cinzel, fontSize: 8, color: GC, letterSpacing: '0.08em', textDecoration: 'none' }}>
                            ↗ VIEW
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}

              {activeDrawer === 'library' && (
                <>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.14em', marginBottom: 12, paddingRight: 20 }}>📚 LIBRARY INTEL</div>
                  {loadingLibrary ? (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
                      {[90, 70, 80, 60].map((w, i) => (
                        <div key={i} style={{ height: 10, background: BDR, borderRadius: 4, width: `${w}%`, marginBottom: 4 }} />
                      ))}
                    </div>
                  ) : libraryHits.length === 0 ? (
                    <div style={{ fontFamily: inter, fontSize: 12, color: DIM, fontStyle: 'italic', lineHeight: 1.6 }}>
                      No passages found in your ministry library for this spirit.
                      <br /><br />
                      <span style={{ fontSize: 11 }}>Upload and index books in the Admin → Ministry Library tab to enable this feature.</span>
                    </div>
                  ) : libraryHits.map((hit: any, i: number) => (
                    <div key={i} style={{ marginBottom: 20 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, color: GC, letterSpacing: '0.1em', marginBottom: 6 }}>
                        📚 {hit.book_title || hit.source}
                        {hit.similarity && (
                          <span style={{ color: '#4a3f2f', marginLeft: 8 }}>
                            {Math.round((hit.similarity || 0) * 100)}% match
                          </span>
                        )}
                      </div>
                      <div style={{ fontFamily: inter, fontSize: 14, color: '#8a7a60', lineHeight: 1.7, borderLeft: '2px solid #2a2218', paddingLeft: 12, fontStyle: 'italic' }}>
                        "...{(hit.chunk_text || hit.passage || '').slice(0, 300)}..."
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM DOSSIER PANEL */}
      {selectedSpirit && (
        <div style={{ height: dossierExpanded ? 320 : 48, flexShrink: 0, transition: 'height 250ms ease', background: DARK, borderTop: `1px solid ${MUT}`, overflow: 'hidden', zIndex: 5 }}>
          <div onClick={() => setDossierExpanded(e => !e)}
            style={{ height: 48, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px', cursor: 'pointer', borderBottom: dossierExpanded ? `1px solid ${BDR}` : 'none' }}>
            <span style={{ fontFamily: cinzel, fontSize: 12, color: GC, letterSpacing: '0.1em', flex: 1 }}>{selectedSpirit.name}</span>
            {selectedSpirit.kingdom && <span style={{ fontFamily: inter, fontSize: 10, color: DIM }}>{selectedSpirit.kingdom}</span>}
            <span style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.1em' }}>{dossierExpanded ? '▼ CLOSE' : '▲ DOSSIER'}</span>
          </div>
          {dossierExpanded && (
            <div style={{ padding: '12px 20px 16px', overflowY: 'auto' as const, height: 272 }}>
              {selectedSpirit.description && (
                <div style={{ fontFamily: inter, fontSize: 13, color: '#c8b99a', lineHeight: 1.7, marginBottom: 14 }}>{selectedSpirit.description}</div>
              )}
              {companionNames.length > 0 && (
                <div>
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: GC, letterSpacing: '0.14em', marginBottom: 8 }}>COMPANION SPIRITS</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                    {companionNames.map(name => {
                      const found = demons.find(d => d.name.toLowerCase() === name.toLowerCase())
                      return (
                        <button key={name} onClick={() => found && selectSpirit(found)}
                          style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${found ? 'rgba(201,168,76,0.5)' : MUT}`, borderRadius: 20, padding: '4px 12px', cursor: found ? 'pointer' : 'default', fontFamily: cinzel, fontSize: 9, color: found ? GC : DIM }}>
                          {found ? '⚔ ' : ''}{name}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
