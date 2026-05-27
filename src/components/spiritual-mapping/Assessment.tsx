// STYLE RULE: No em dashes (—) in any UI text. Ever. Rewrite the phrase naturally.
import { useState, useEffect, useCallback, useRef } from 'react'

const G = '#C9A84C'
const BG = '#0D0B14'
const SURF = '#12101e'
const SURF2 = '#1a1726'
const BDR = 'rgba(201,168,76,0.22)'
const TXT = '#e8dcc8'
const DIM = '#a09080'
const MUT = '#6b5e45'
const cinzel = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const TIER_LEVELS: Record<string, number> = {
  watchman: 0, free: 0, soldier: 1, commander: 2, general: 3,
}

interface Site { name: string; lat: string; lng: string; category: string; discernment: string; status: string }
interface Principality { spirit_name: string; tier_level: number; identified_by: string; confidence: string; legal_rights: string; regional_notes: string }
interface Region { id: string; name: string }

const SECTION_LABELS = [
  'Regional Identity', 'Historical', 'Current', 'Discernment',
  'Sites', 'Legal Ground', 'Principalities', 'Redemptive Gift', 'Team & Dossier',
]

const inputStyle: React.CSSProperties = {
  width: '100%', background: BG, border: `1px solid ${BDR}`,
  borderRadius: 6, padding: '8px 12px', color: TXT,
  fontFamily: crimson, fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const taStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: 80 }
const labelStyle: React.CSSProperties = {
  fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: MUT,
  display: 'block', marginBottom: 5,
}

function Field({ label, value, onChange, rows = 3 }: { label: string; value: string; onChange: (v: string) => void; rows?: number }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={labelStyle}>{label}</label>
      <textarea style={{ ...taStyle, minHeight: rows * 24 }} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

function AIResearchButton({ label, loading, onClick }: { label: string; loading: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={loading} style={{
      fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em',
      color: loading ? MUT : BG, background: loading ? 'transparent' : G,
      border: `1px solid ${loading ? MUT : G}`, borderRadius: 4,
      padding: '8px 14px', cursor: loading ? 'wait' : 'pointer', marginBottom: 10,
    }}>
      {loading ? '⏳ Researching...' : label}
    </button>
  )
}

function ResearchResult({ text }: { text: string }) {
  if (!text) return null
  return (
    <div style={{ background: 'rgba(201,168,76,0.05)', border: `1px solid ${BDR}`, borderRadius: 6, padding: '12px 14px', marginBottom: 14, maxHeight: 200, overflowY: 'auto' }}>
      <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.14em', color: MUT, marginBottom: 6 }}>🤖 AI RESEARCH RESULT</div>
      <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{text}</div>
    </div>
  )
}

interface Props {
  userTier: string
  userId: string
  userName: string
}

export function Assessment({ userTier, userId, userName }: Props) {
  const userLevel = TIER_LEVELS[userTier?.toLowerCase()] ?? 0
  const hasAccess = userLevel >= 2

  const [regions, setRegions] = useState<Region[]>([])
  const [selectedRegionId, setSelectedRegionId] = useState('')
  const [regionName, setRegionName] = useState('')
  const [assessmentId, setAssessmentId] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [showNewRegion, setShowNewRegion] = useState(false)
  const [newRegion, setNewRegion] = useState({ name: '', lat: '', lng: '', radius: '40', tier: 'local' })
  const saveTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  // Research state
  const [research, setResearch] = useState<Record<string, string>>({})
  const [researching, setResearching] = useState<Record<string, boolean>>({})

  // Dossier
  const [dossier, setDossier] = useState<any>(null)
  const [generatingDossier, setGeneratingDossier] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Section 1
  const [s1_description, setS1Desc] = useState('')
  const [s1_population, setS1Pop] = useState('')
  const [s1_church_unity, setS1Unity] = useState('')

  // Section 2
  const [s2_ancient_peoples, setS2Ancient] = useState('')
  const [s2_bloodshed_events, setS2Blood] = useState('')
  const [s2_masonic_history, setS2Masonic] = useState('')
  const [s2_founding_covenants, setS2Found] = useState('')
  const [s2_environmental_devastation, setS2Env] = useState('')
  const [s2_broken_treaties, setS2Treaties] = useState('')
  const [s2_false_religion_history, setS2Religion] = useState('')
  const [s2_land_dedications, setS2Land] = useState('')

  // Section 3
  const [s3_addiction_patterns, setS3Add] = useState('')
  const [s3_poverty_indicators, setS3Poverty] = useState('')
  const [s3_crime_patterns, setS3Crime] = useState('')
  const [s3_occult_activity, setS3Occult] = useState('')
  const [s3_dominant_idols, setS3Idols] = useState('')
  const [s3_church_division_notes, setS3Church] = useState('')

  // Section 4
  const [s4_prophetic_words, setS4Prophet] = useState('')
  const [s4_field_discernment, setS4Field] = useState('')
  const [s4_dreams_visions, setS4Dreams] = useState('')
  const [s4_physical_manifestations, setS4Physical] = useState('')
  const [s4_spiritual_atmosphere, setS4Atmo] = useState('')

  // Section 5
  const [s5_sites, setS5Sites] = useState<Site[]>([])

  // Section 6
  const [s6_bloodshed_confirmed, setS6Blood] = useState(false)
  const [s6_bloodshed_details, setS6BloodD] = useState('')
  const [s6_idolatry_confirmed, setS6Idol] = useState(false)
  const [s6_idolatry_details, setS6IdolD] = useState('')
  const [s6_broken_covenants_confirmed, setS6Cov] = useState(false)
  const [s6_broken_covenants_details, setS6CovD] = useState('')
  const [s6_sexual_perversion_confirmed, setS6Sex] = useState(false)
  const [s6_sexual_perversion_details, setS6SexD] = useState('')
  const [s6_additional_legal_ground, setS6Extra] = useState('')

  // Section 7
  const [s7_principalities, setS7] = useState<Principality[]>([])

  // Section 8
  const [s8_redemptive_gift, setS8Gift] = useState('')
  const [s8_gift_perversion, setS8Perv] = useState('')
  const [s8_signs_of_hope, setS8Hope] = useState('')
  const [s8_gods_original_design, setS8Design] = useState('')
  const [s8_scripture_promise, setS8Scr] = useState('')

  // Section 9
  const [s9_apostolic_covering, setS9Apos] = useState('')
  const [s9_team_size, setS9Size] = useState('')
  const [s9_team_composition, setS9Comp] = useState('')
  const [s9_operation_date, setS9Date] = useState('')
  const [s9_prayer_cover_confirmed, setS9Prayer] = useState(false)
  const [s9_personal_deliverance_confirmed, setS9Deliv] = useState(false)

  useEffect(() => {
    fetch('/api/sm-regions')
      .then(r => r.json())
      .then(d => setRegions(d.regions || []))
      .catch(() => {})
  }, [])

  const buildPayload = useCallback(() => ({
    region_id: selectedRegionId,
    s1_description, s1_population, s1_church_unity,
    s2_ancient_peoples, s2_bloodshed_events, s2_masonic_history,
    s2_founding_covenants, s2_environmental_devastation,
    s2_broken_treaties, s2_false_religion_history, s2_land_dedications,
    s3_addiction_patterns, s3_poverty_indicators, s3_crime_patterns,
    s3_occult_activity, s3_dominant_idols, s3_church_division_notes,
    s4_prophetic_words, s4_field_discernment, s4_dreams_visions,
    s4_physical_manifestations, s4_spiritual_atmosphere,
    s5_sites,
    s6_bloodshed_confirmed, s6_bloodshed_details,
    s6_idolatry_confirmed, s6_idolatry_details,
    s6_broken_covenants_confirmed, s6_broken_covenants_details,
    s6_sexual_perversion_confirmed, s6_sexual_perversion_details,
    s6_additional_legal_ground,
    s7_principalities,
    s8_redemptive_gift, s8_gift_perversion, s8_signs_of_hope,
    s8_gods_original_design, s8_scripture_promise,
    s9_team_size: parseInt(s9_team_size) || null,
    s9_apostolic_covering, s9_team_composition, s9_operation_date,
    s9_prayer_cover_confirmed, s9_personal_deliverance_confirmed,
  }), [s1_description, s1_population, s1_church_unity, s2_ancient_peoples, s2_bloodshed_events, s2_masonic_history, s2_founding_covenants, s2_environmental_devastation, s2_broken_treaties, s2_false_religion_history, s2_land_dedications, s3_addiction_patterns, s3_poverty_indicators, s3_crime_patterns, s3_occult_activity, s3_dominant_idols, s3_church_division_notes, s4_prophetic_words, s4_field_discernment, s4_dreams_visions, s4_physical_manifestations, s4_spiritual_atmosphere, s5_sites, s6_bloodshed_confirmed, s6_bloodshed_details, s6_idolatry_confirmed, s6_idolatry_details, s6_broken_covenants_confirmed, s6_broken_covenants_details, s6_sexual_perversion_confirmed, s6_sexual_perversion_details, s6_additional_legal_ground, s7_principalities, s8_redemptive_gift, s8_gift_perversion, s8_signs_of_hope, s8_gods_original_design, s8_scripture_promise, s9_team_size, s9_apostolic_covering, s9_team_composition, s9_operation_date, s9_prayer_cover_confirmed, s9_personal_deliverance_confirmed, selectedRegionId])

  const saveDraft = useCallback(async () => {
    if (!selectedRegionId) return
    setSaving(true)
    try {
      const payload = buildPayload()
      const url = assessmentId ? `/api/sm-assessment?id=${assessmentId}` : '/api/sm-assessment'
      const method = assessmentId ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.id && !assessmentId) setAssessmentId(data.id)
      setSaveMsg('Draft saved')
      setTimeout(() => setSaveMsg(''), 2000)
    } catch {
      setSaveMsg('Save failed')
    } finally {
      setSaving(false)
    }
  }, [buildPayload, selectedRegionId, assessmentId])

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!selectedRegionId) return
    saveTimer.current = setInterval(saveDraft, 30000)
    return () => { if (saveTimer.current) clearInterval(saveTimer.current) }
  }, [selectedRegionId, saveDraft])

  async function doResearch(category: string) {
    if (!selectedRegionId || !regionName) return
    setResearching(r => ({ ...r, [category]: true }))
    try {
      const res = await fetch('/api/sm-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionId: selectedRegionId, regionName, radiusMiles: 40, categories: [category] }),
      })
      const data = await res.json()
      if (data.results?.[category]) {
        setResearch(r => ({ ...r, [category]: data.results[category] }))
      }
    } catch {}
    setResearching(r => ({ ...r, [category]: false }))
  }

  async function generateDossier() {
    if (!selectedRegionId || !assessmentId) return
    setGeneratingDossier(true)
    try {
      await saveDraft()
      const res = await fetch('/api/sm-generate-dossier', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionId: selectedRegionId, assessmentId }),
      })
      const data = await res.json()
      if (data.dossier) setDossier(data.dossier)
    } catch {}
    setGeneratingDossier(false)
  }

  async function submitToMap() {
    if (!selectedRegionId || !assessmentId) return
    setSubmitting(true)
    try {
      await fetch('/api/sm-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regionId: selectedRegionId, assessmentId, submitted_by: userId, submitted_by_name: userName }),
      })
      setSubmitted(true)
    } catch {}
    setSubmitting(false)
  }

  function downloadDossier() {
    if (!dossier) return
    const text = `${dossier.classification}\n${dossier.title}\n${dossier.operation_name}\n\n${dossier.executive_summary}\n\n${dossier.sections?.map((s: any) => `## ${s.heading}\n${s.content}`).join('\n\n')}\n\nDECLARATIONS:\n${dossier.declarations}\n\nPrepared by: ${dossier.prepared_by}\nDate: ${dossier.date}`
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${regionName || 'region'}-dossier.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function createRegion() {
    if (!newRegion.name) return
    try {
      const res = await fetch('/api/sm-regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newRegion.name, anchor_lat: parseFloat(newRegion.lat), anchor_lng: parseFloat(newRegion.lng), radius_miles: parseInt(newRegion.radius), tier: newRegion.tier, submitted_by: userId, submitted_by_name: userName }),
      })
      const data = await res.json()
      if (data.region) {
        setRegions(r => [...r, data.region])
        setSelectedRegionId(data.region.id)
        setRegionName(data.region.name)
        setShowNewRegion(false)
      }
    } catch {}
  }

  function selectRegion(id: string) {
    const region = regions.find(r => r.id === id)
    setSelectedRegionId(id)
    setRegionName(region?.name || '')
    setAssessmentId(null)
    setCurrentSection(0)
  }

  const completedSections = SECTION_LABELS.filter((_, i) => {
    if (i === 0) return s1_description.length > 0
    if (i === 1) return s2_ancient_peoples.length > 0
    if (i === 2) return s3_addiction_patterns.length > 0
    if (i === 3) return s4_prophetic_words.length > 0
    if (i === 4) return s5_sites.length > 0
    if (i === 5) return s6_bloodshed_confirmed || s6_idolatry_confirmed
    if (i === 6) return s7_principalities.length > 0
    if (i === 7) return s8_redemptive_gift.length > 0
    if (i === 8) return s9_apostolic_covering.length > 0
    return false
  })
  const pct = Math.round((completedSections.length / SECTION_LABELS.length) * 100)

  if (!hasAccess) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: BG, gap: 16 }}>
        <div style={{ fontSize: 40 }}>🗂</div>
        <div style={{ fontFamily: cinzel, fontSize: 18, color: G }}>Field Assessment</div>
        <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: MUT }}>COMMANDER+ ACCESS REQUIRED</div>
        <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', maxWidth: 380, textAlign: 'center', lineHeight: 1.6 }}>
          The 9-section Field Assessment form, AI research integration, and Field Intelligence Dossier generation are available to Commander members and above.
        </div>
        <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, maxWidth: 380, textAlign: 'center' }}>
          Features: AI-powered historical research, principality identification, dossier generation, global map submission.
        </div>
        <a href="/membership" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.14em', color: BG, background: G, padding: '12px 28px', borderRadius: 4, textDecoration: 'none', marginTop: 8 }}>
          UPGRADE TO COMMANDER
        </a>
      </div>
    )
  }

  if (!selectedRegionId && !showNewRegion) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: '32px', background: BG }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontFamily: cinzel, fontSize: 20, color: G, marginBottom: 4 }}>🗂 Field Assessment</div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', marginBottom: 28 }}>Select a region to assess or create a new one</div>

          {regions.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em', color: MUT, marginBottom: 10 }}>EXISTING REGIONS</div>
              {regions.map(r => (
                <div
                  key={r.id}
                  onClick={() => selectRegion(r.id)}
                  style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: '14px 16px', marginBottom: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = G}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = BDR}
                >
                  <div style={{ fontSize: 20 }}>📍</div>
                  <div style={{ fontFamily: cinzel, fontSize: 12, color: TXT }}>{r.name}</div>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => setShowNewRegion(true)} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: BG, background: G, border: 'none', borderRadius: 4, padding: '12px 24px', cursor: 'pointer' }}>
            + CREATE NEW REGION
          </button>
        </div>
      </div>
    )
  }

  if (showNewRegion) {
    return (
      <div style={{ height: '100%', overflowY: 'auto', padding: '32px', background: BG }}>
        <div style={{ maxWidth: 500, margin: '0 auto' }}>
          <button onClick={() => setShowNewRegion(false)} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', marginBottom: 20 }}>← BACK</button>
          <div style={{ fontFamily: cinzel, fontSize: 18, color: G, marginBottom: 20 }}>Create New Region</div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>REGION NAME *</label>
            <input style={inputStyle} value={newRegion.name} onChange={e => setNewRegion(r => ({ ...r, name: e.target.value }))} placeholder="e.g. Copper Basin, TN/GA" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>LATITUDE</label>
              <input style={inputStyle} value={newRegion.lat} onChange={e => setNewRegion(r => ({ ...r, lat: e.target.value }))} placeholder="35.0162" />
            </div>
            <div>
              <label style={labelStyle}>LONGITUDE</label>
              <input style={inputStyle} value={newRegion.lng} onChange={e => setNewRegion(r => ({ ...r, lng: e.target.value }))} placeholder="-84.3754" />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={labelStyle}>RADIUS (MILES)</label>
              <input style={inputStyle} type="number" value={newRegion.radius} onChange={e => setNewRegion(r => ({ ...r, radius: e.target.value }))} />
            </div>
            <div>
              <label style={labelStyle}>TIER</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={newRegion.tier} onChange={e => setNewRegion(r => ({ ...r, tier: e.target.value }))}>
                <option value="local">Local</option>
                <option value="city">City</option>
                <option value="regional">Regional</option>
                <option value="state">State</option>
                <option value="national">National</option>
              </select>
            </div>
          </div>
          <button onClick={createRegion} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: BG, background: G, border: 'none', borderRadius: 4, padding: '12px 24px', cursor: 'pointer' }}>
            CREATE REGION
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: BG, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 24px', background: SURF, borderBottom: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <button onClick={() => { setSelectedRegionId(''); setRegionName('') }} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontFamily: cinzel, fontSize: 10 }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: G }}>{regionName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <div style={{ flex: 1, height: 4, background: SURF2, borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: G, borderRadius: 2, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontFamily: cinzel, fontSize: 8, color: MUT }}>{pct}%</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveMsg && <span style={{ fontFamily: cinzel, fontSize: 9, color: '#80e090' }}>{saveMsg}</span>}
          <button onClick={saveDraft} disabled={saving} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: G, background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}>
            {saving ? 'SAVING...' : 'SAVE DRAFT'}
          </button>
        </div>
      </div>

      {/* Section pills */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 24px', background: SURF2, overflowX: 'auto', flexShrink: 0 }}>
        {SECTION_LABELS.map((label, i) => (
          <button
            key={i}
            onClick={() => setCurrentSection(i)}
            style={{
              fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', whiteSpace: 'nowrap',
              padding: '5px 12px', borderRadius: 20, border: 'none', cursor: 'pointer',
              background: currentSection === i ? G : 'transparent',
              color: currentSection === i ? BG : MUT,
              outline: currentSection === i ? 'none' : `1px solid ${BDR}`,
            }}
          >
            S{i + 1}: {label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {currentSection === 0 && (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 16 }}>S1: Regional Identity</div>
            <Field label="DESCRIPTION / OVERVIEW" value={s1_description} onChange={setS1Desc} rows={4} />
            <Field label="POPULATION (APPROXIMATE)" value={s1_population} onChange={setS1Pop} rows={1} />
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>CHURCH UNITY ASSESSMENT</label>
              <select style={{ ...inputStyle, cursor: 'pointer' }} value={s1_church_unity} onChange={e => setS1Unity(e.target.value)}>
                <option value="">Select...</option>
                <option value="unified">Unified: active cross-denominational cooperation</option>
                <option value="moderate">Moderate: some cooperation, some division</option>
                <option value="divided">Divided: significant denominational conflict</option>
                <option value="fragmented">Fragmented: minimal church presence or cooperation</option>
              </select>
            </div>
          </div>
        )}

        {currentSection === 1 && (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 16 }}>S2: Historical Record</div>
            <AIResearchButton label="🤖 AI Research: Historical Record" loading={!!researching['history']} onClick={() => doResearch('history')} />
            <AIResearchButton label="🤖 AI Research: Ancestry & Indigenous" loading={!!researching['ancestry']} onClick={() => doResearch('ancestry')} />
            <ResearchResult text={research['history'] || ''} />
            <ResearchResult text={research['ancestry'] || ''} />
            <Field label="ANCIENT PEOPLES & INDIGENOUS HISTORY" value={s2_ancient_peoples} onChange={setS2Ancient} />
            <Field label="FOUNDING COVENANTS & LAND DEDICATIONS AT FOUNDING" value={s2_founding_covenants} onChange={setS2Found} />
            <Field label="BLOODSHED EVENTS (battles, massacres, murders)" value={s2_bloodshed_events} onChange={setS2Blood} />
            <Field label="BROKEN TREATIES & INJUSTICES" value={s2_broken_treaties} onChange={setS2Treaties} />
            <Field label="ENVIRONMENTAL DEVASTATION" value={s2_environmental_devastation} onChange={setS2Env} />
            <Field label="MASONIC & SECRET SOCIETY HISTORY" value={s2_masonic_history} onChange={setS2Masonic} />
            <Field label="FALSE RELIGION HISTORY" value={s2_false_religion_history} onChange={setS2Religion} />
            <Field label="LAND DEDICATIONS (specific sites dedicated to spirits)" value={s2_land_dedications} onChange={setS2Land} />
          </div>
        )}

        {currentSection === 2 && (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 16 }}>S3 — Current Conditions</div>
            <AIResearchButton label="🤖 AI Research: Current Conditions" loading={!!researching['current']} onClick={() => doResearch('current')} />
            <AIResearchButton label="🤖 AI Research: Occult Activity" loading={!!researching['occult']} onClick={() => doResearch('occult')} />
            <ResearchResult text={research['current'] || ''} />
            <ResearchResult text={research['occult'] || ''} />
            <Field label="ADDICTION & SUBSTANCE ABUSE PATTERNS" value={s3_addiction_patterns} onChange={setS3Add} />
            <Field label="POVERTY INDICATORS" value={s3_poverty_indicators} onChange={setS3Poverty} />
            <Field label="CRIME PATTERNS" value={s3_crime_patterns} onChange={setS3Crime} />
            <Field label="OCCULT & NEW AGE ACTIVITY" value={s3_occult_activity} onChange={setS3Occult} />
            <Field label="DOMINANT CULTURAL IDOLS" value={s3_dominant_idols} onChange={setS3Idols} />
            <Field label="CHURCH DIVISION NOTES" value={s3_church_division_notes} onChange={setS3Church} />
          </div>
        )}

        {currentSection === 3 && (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 16 }}>S4 — Discernment Record</div>
            <Field label="PROPHETIC WORDS OVER THIS REGION" value={s4_prophetic_words} onChange={setS4Prophet} rows={4} />
            <Field label="FIELD DISCERNMENT (on-site impressions)" value={s4_field_discernment} onChange={setS4Field} rows={4} />
            <Field label="DREAMS & VISIONS RELATED TO REGION" value={s4_dreams_visions} onChange={setS4Dreams} />
            <Field label="PHYSICAL MANIFESTATIONS OBSERVED ON-SITE" value={s4_physical_manifestations} onChange={setS4Physical} />
            <Field label="SPIRITUAL ATMOSPHERE DESCRIPTION" value={s4_spiritual_atmosphere} onChange={setS4Atmo} />
          </div>
        )}

        {currentSection === 4 && (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 16 }}>S5 — Field Sites</div>
            {s5_sites.map((site, i) => (
              <div key={i} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: '16px', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 10, color: G }}>Site {i + 1}</div>
                  <button onClick={() => setS5Sites(s => s.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: MUT, cursor: 'pointer', fontSize: 14 }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                  <div>
                    <label style={labelStyle}>SITE NAME</label>
                    <input style={inputStyle} value={site.name} onChange={e => setS5Sites(s => s.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} />
                  </div>
                  <div>
                    <label style={labelStyle}>CATEGORY</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={site.category} onChange={e => setS5Sites(s => s.map((x, j) => j === i ? { ...x, category: e.target.value } : x))}>
                      <option value="red">🔴 High Danger</option>
                      <option value="orange">🟠 Bloodshed</option>
                      <option value="yellow">🟡 Idolatry</option>
                      <option value="green">🟢 Redemptive</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>LATITUDE</label>
                    <input style={inputStyle} value={site.lat} onChange={e => setS5Sites(s => s.map((x, j) => j === i ? { ...x, lat: e.target.value } : x))} placeholder="35.0162" />
                  </div>
                  <div>
                    <label style={labelStyle}>LONGITUDE</label>
                    <input style={inputStyle} value={site.lng} onChange={e => setS5Sites(s => s.map((x, j) => j === i ? { ...x, lng: e.target.value } : x))} placeholder="-84.3754" />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>DISCERNMENT NOTES</label>
                  <textarea style={taStyle} value={site.discernment} onChange={e => setS5Sites(s => s.map((x, j) => j === i ? { ...x, discernment: e.target.value } : x))} />
                </div>
              </div>
            ))}
            <button onClick={() => setS5Sites(s => [...s, { name: '', lat: '', lng: '', category: 'yellow', discernment: '', status: 'identified' }])} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: G, background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>
              + ADD SITE
            </button>
          </div>
        )}

        {currentSection === 5 && (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 4 }}>S6 — Legal Ground</div>
            <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${BDR}`, borderRadius: 6, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, fontStyle: 'italic' }}>
                "Do not pollute the land where you are. Bloodshed pollutes the land, and atonement cannot be made for the land on which blood has been shed, except by the blood of the one who shed it." (Numbers 35:33)
              </div>
            </div>
            {[
              { confirmed: s6_bloodshed_confirmed, setConfirmed: setS6Blood, details: s6_bloodshed_details, setDetails: setS6BloodD, label: 'BLOODSHED: murder, massacre, abortion, ritual sacrifice' },
              { confirmed: s6_idolatry_confirmed, setConfirmed: setS6Idol, details: s6_idolatry_details, setDetails: setS6IdolD, label: 'IDOLATRY: land dedications, false worship, occult covenants' },
              { confirmed: s6_broken_covenants_confirmed, setConfirmed: setS6Cov, details: s6_broken_covenants_details, setDetails: setS6CovD, label: 'BROKEN COVENANTS: treaties, agreements, promises violated' },
              { confirmed: s6_sexual_perversion_confirmed, setConfirmed: setS6Sex, details: s6_sexual_perversion_details, setDetails: setS6SexD, label: 'SEXUAL PERVERSION: patterns of sexual sin that defiles land' },
            ].map((item, i) => (
              <div key={i} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: '14px', marginBottom: 12 }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer', marginBottom: item.confirmed ? 12 : 0 }}>
                  <input type="checkbox" checked={item.confirmed} onChange={e => item.setConfirmed(e.target.checked)} style={{ width: 16, height: 16, accentColor: G, marginTop: 2, cursor: 'pointer', flexShrink: 0 }} />
                  <span style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: item.confirmed ? G : DIM }}>{item.label}</span>
                </label>
                {item.confirmed && (
                  <>
                    <label style={labelStyle}>DETAILS</label>
                    <textarea style={taStyle} value={item.details} onChange={e => item.setDetails(e.target.value)} placeholder="Document specific events, locations, dates..." />
                  </>
                )}
              </div>
            ))}
            <Field label="ADDITIONAL LEGAL GROUND" value={s6_additional_legal_ground} onChange={setS6Extra} />
          </div>
        )}

        {currentSection === 6 && (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 16 }}>S7 — Principalities Identified</div>
            {s7_principalities.map((p, i) => (
              <div key={i} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: '16px', marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 10, color: G }}>Spirit {i + 1}</div>
                  <button onClick={() => setS7(s => s.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', color: MUT, cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>SPIRIT NAME</label>
                    <input style={inputStyle} value={p.spirit_name} onChange={e => setS7(s => s.map((x, j) => j === i ? { ...x, spirit_name: e.target.value } : x))} />
                  </div>
                  <div>
                    <label style={labelStyle}>TIER LEVEL (1-4)</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={p.tier_level} onChange={e => setS7(s => s.map((x, j) => j === i ? { ...x, tier_level: parseInt(e.target.value) } : x))}>
                      <option value={4}>4: Ruling Principality</option>
                      <option value={3}>3: Strong Man</option>
                      <option value={2}>2: Power</option>
                      <option value={1}>1: Familiar Spirit</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>CONFIDENCE</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={p.confidence} onChange={e => setS7(s => s.map((x, j) => j === i ? { ...x, confidence: e.target.value } : x))}>
                      <option value="CONFIRMED">CONFIRMED</option>
                      <option value="INVESTIGATING">INVESTIGATING</option>
                      <option value="UNCONFIRMED">UNCONFIRMED</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>IDENTIFIED BY</label>
                    <select style={{ ...inputStyle, cursor: 'pointer' }} value={p.identified_by} onChange={e => setS7(s => s.map((x, j) => j === i ? { ...x, identified_by: e.target.value } : x))}>
                      <option value="research">Research</option>
                      <option value="discernment">Discernment</option>
                      <option value="both">Research + Discernment</option>
                      <option value="prophetic">Prophetic Word</option>
                    </select>
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>LEGAL RIGHTS</label>
                    <input style={inputStyle} value={p.legal_rights} onChange={e => setS7(s => s.map((x, j) => j === i ? { ...x, legal_rights: e.target.value } : x))} placeholder="What gives this spirit legal access?" />
                  </div>
                  <div style={{ gridColumn: '1/-1' }}>
                    <label style={labelStyle}>REGIONAL NOTES</label>
                    <textarea style={taStyle} value={p.regional_notes} onChange={e => setS7(s => s.map((x, j) => j === i ? { ...x, regional_notes: e.target.value } : x))} />
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setS7(s => [...s, { spirit_name: '', tier_level: 3, identified_by: 'research', confidence: 'INVESTIGATING', legal_rights: '', regional_notes: '' }])} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: G, background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>
              + ADD SPIRIT
            </button>
          </div>
        )}

        {currentSection === 7 && (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 16 }}>S8 — Redemptive Gift & Design</div>
            <Field label="REDEMPTIVE GIFT OF THE REGION" value={s8_redemptive_gift} onChange={setS8Gift} rows={2} />
            <Field label="HOW THE GIFT HAS BEEN PERVERTED" value={s8_gift_perversion} onChange={setS8Perv} />
            <Field label="SIGNS OF HOPE (redemptive evidence)" value={s8_signs_of_hope} onChange={setS8Hope} />
            <Field label="GOD'S ORIGINAL DESIGN FOR THIS REGION" value={s8_gods_original_design} onChange={setS8Design} rows={4} />
            <Field label="SCRIPTURE PROMISE" value={s8_scripture_promise} onChange={setS8Scr} rows={2} />
          </div>
        )}

        {currentSection === 8 && (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, marginBottom: 16 }}>S9 — Team & Operation</div>
            <Field label="APOSTOLIC COVERING" value={s9_apostolic_covering} onChange={setS9Apos} rows={2} />
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>TEAM SIZE</label>
              <input style={inputStyle} type="number" value={s9_team_size} onChange={e => setS9Size(e.target.value)} />
            </div>
            <Field label="TEAM COMPOSITION (roles, gifts)" value={s9_team_composition} onChange={setS9Comp} />
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>OPERATION DATE</label>
              <input style={inputStyle} type="date" value={s9_operation_date} onChange={e => setS9Date(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              {[
                { checked: s9_personal_deliverance_confirmed, set: setS9Deliv, label: 'Personal deliverance confirmed for all team members' },
                { checked: s9_prayer_cover_confirmed, set: setS9Prayer, label: 'Prayer covering confirmed for team and households' },
              ].map((item, i) => (
                <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={item.checked} onChange={e => item.set(e.target.checked)} style={{ width: 16, height: 16, accentColor: G, cursor: 'pointer' }} />
                  <span style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: item.checked ? G : DIM }}>{item.label}</span>
                </label>
              ))}
            </div>

            {/* Generate Dossier */}
            <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: '20px' }}>
              <div style={{ fontFamily: cinzel, fontSize: 12, color: G, marginBottom: 8 }}>⚡ Generate Field Intelligence Dossier</div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, fontStyle: 'italic', marginBottom: 14 }}>
                Compile all assessment data and AI research into a classified Field Intelligence Dossier.
              </div>
              <button
                onClick={generateDossier}
                disabled={generatingDossier || !selectedRegionId}
                style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: BG, background: G, border: 'none', borderRadius: 4, padding: '12px 24px', cursor: generatingDossier ? 'wait' : 'pointer', opacity: generatingDossier ? 0.7 : 1 }}
              >
                {generatingDossier ? '⏳ GENERATING...' : '⚡ GENERATE DOSSIER'}
              </button>
            </div>

            {/* Dossier output */}
            {dossier && (
              <div style={{ marginTop: 20, background: SURF, border: `1px solid ${G}`, borderRadius: 8, padding: '20px' }}>
                <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.14em', color: MUT, marginBottom: 4 }}>{dossier.classification}</div>
                <div style={{ fontFamily: cinzel, fontSize: 16, color: G, marginBottom: 4 }}>{dossier.title}</div>
                <div style={{ fontFamily: cinzel, fontSize: 10, color: DIM, marginBottom: 16 }}>{dossier.operation_name}</div>
                <div style={{ fontFamily: crimson, fontSize: 14, color: TXT, lineHeight: 1.7, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{dossier.executive_summary}</div>
                {dossier.sections?.slice(0, 3).map((s: any, i: number) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: G, marginBottom: 4 }}>{s.heading}</div>
                    <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, lineHeight: 1.6 }}>{s.content?.substring(0, 300)}...</div>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button onClick={downloadDossier} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: G, background: 'transparent', border: `1px solid ${G}`, borderRadius: 4, padding: '8px 16px', cursor: 'pointer' }}>
                    ⬇ DOWNLOAD
                  </button>
                  <button onClick={submitToMap} disabled={submitting || submitted} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: BG, background: submitted ? '#6b6b7a' : G, border: 'none', borderRadius: 4, padding: '8px 16px', cursor: submitting ? 'wait' : 'pointer' }}>
                    {submitted ? '✓ SUBMITTED' : submitting ? 'SUBMITTING...' : '📤 SUBMIT TO MAP'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <div style={{ padding: '12px 24px', borderTop: `1px solid ${BDR}`, background: SURF, display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
        <button onClick={() => setCurrentSection(s => Math.max(0, s - 1))} disabled={currentSection === 0} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: currentSection > 0 ? G : MUT, background: 'transparent', border: `1px solid ${currentSection > 0 ? BDR : 'transparent'}`, borderRadius: 4, padding: '8px 16px', cursor: currentSection > 0 ? 'pointer' : 'default' }}>
          ← PREVIOUS
        </button>
        <button onClick={() => setCurrentSection(s => Math.min(SECTION_LABELS.length - 1, s + 1))} disabled={currentSection === SECTION_LABELS.length - 1} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: currentSection < SECTION_LABELS.length - 1 ? BG : MUT, background: currentSection < SECTION_LABELS.length - 1 ? G : 'transparent', border: 'none', borderRadius: 4, padding: '8px 16px', cursor: currentSection < SECTION_LABELS.length - 1 ? 'pointer' : 'default' }}>
          NEXT →
        </button>
      </div>
    </div>
  )
}
