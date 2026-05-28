import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '@clerk/tanstack-start'

// ── CONSTANTS ────────────────────────────────────────────────────────────────
const G      = '#C9A84C'
const DIM    = '#6b5e45'
const SURF   = '#110e1a'
const SURF2  = '#1a1726'
const BDR    = 'rgba(201,168,76,0.18)'
const TXT    = '#e8dcc8'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const PHASES = [
  { id: 'team_prep',    label: 'Team Prep',        icon: '⚙' },
  { id: 'welcome',      label: 'Welcome & Settle',  icon: '🕊' },
  { id: 'renunciations',label: 'Renunciations',     icon: '📜' },
  { id: 'deliverance',  label: 'Deliverance',       icon: '⚔' },
  { id: 'inner_healing',label: 'Inner Healing',     icon: '💛' },
  { id: 'filling',      label: 'Filling & Blessing',icon: '✦' },
  { id: 'aftercare',    label: 'Aftercare',         icon: '🙏' },
]

const TEAM_ROLES = [
  'leader','recorder','intercessor','encourager','seer','worship','runner','gatekeeper',
]

const BODY_REGIONS_SCC = [
  { id: 'head_mind',    label: 'Head',       icon: '🧠' },
  { id: 'eyes_vision',  label: 'Eyes',       icon: '👁' },
  { id: 'throat_voice', label: 'Throat',     icon: '🗣' },
  { id: 'heart_chest',  label: 'Chest',      icon: '❤' },
  { id: 'stomach_gut',  label: 'Gut',        icon: '🫁' },
  { id: 'reproductive', label: 'Repro.',     icon: '⚕' },
  { id: 'hands_arms',   label: 'Hands',      icon: '🙌' },
  { id: 'back_spine',   label: 'Back',       icon: '🦴' },
  { id: 'legs_feet',    label: 'Legs',       icon: '🦶' },
  { id: 'skin_body',    label: 'Full Body',  icon: '🫀' },
]

const LOG_ICONS: Record<string, string> = {
  note: '·', manifestation: '●', breakthrough: '◉', resistance: '✗',
  deception: '⚠', spirit_named: '➤', renunciation: '✓', pause: '⏸',
  photo: '📷', audio: '🎤', seer_note: '🌊',
}

const LOG_COLORS: Record<string, string> = {
  note: TXT, manifestation: G, breakthrough: '#4ade80', resistance: '#f87171',
  deception: '#fb923c', spirit_named: '#c084fc', renunciation: '#86efac',
  pause: DIM, photo: '#60a5fa', audio: '#a78bfa', seer_note: '#34d399',
}

const STATUS_COLORS: Record<string, string> = {
  pending: DIM, bound: '#60a5fa', active: G, manifesting: '#fb923c',
  expelled: '#4ade80', revisit: '#f87171',
}

const RENUNCIATION_CATEGORIES = [
  'Spiritual Freedom / Lordship','Recommitment to Christ','Forgiveness Prayer',
  'Occult Confession','Witchcraft (personal)','Witchcraft (generational)',
  'Loosing Dominion Prayer','Breaking Word Curses','Breaking Generational Curses',
  'Breaking Self-Inflicted Curses','Breaking Soul Ties','Bloodline Covenant Prayer',
  'Act of War (closing open altars)','Freemasonry','Eastern Religions',
  'Cults (Mormon / JW / Catholic)','Sexual Immorality','Substance Abuse',
  'Occult / New Age','Anger and Violence','Rejection and Abandonment',
  'Hindrance Inventory',
]

const PRE_SESSION_CHECKLIST = {
  team_prep: [
    { id: 'unity_prayer',    text: 'Team unity prayer' },
    { id: 'communion',       text: 'Receive communion together' },
    { id: 'review_plans',    text: 'Review session prep report' },
    { id: 'assign_roles',    text: 'Assign and confirm all roles' },
    { id: 'bind_leviathan',  text: 'BIND Leviathan and Mind Control specifically' },
    { id: 'forbid_transfer', text: 'Forbid all spirit transfers to team members' },
    { id: 'angels_stationed',text: 'Pray angels at every entry/exit point' },
  ],
  welcome: [
    { id: 'welcome_person',  text: 'Welcome person warmly' },
    { id: 'ask_feeling',     text: 'Ask how they are feeling today' },
    { id: 'anxiety_level',   text: 'Anxiety level: ___/10' },
    { id: 'did_fast',        text: 'Did they fast? (Yes / No / Partial)' },
    { id: 'medications',     text: 'Medications today: ___' },
    { id: 'brief_teaching',  text: 'Brief teaching on what to expect' },
    { id: 'keep_informed',   text: 'Tell them: keep us informed how you feel' },
    { id: 'can_stop',        text: 'Tell them: you can stop at any time' },
    { id: 'forgiveness_talk',text: 'Speak on forgiveness foundation' },
    { id: 'reassure',        text: 'Reassure confidence in Christ' },
  ],
}

// ── TYPES ───────────────────────────────────────────────────────────────────
export interface SequenceSpirit {
  id: string
  name: string
  rank: string
  label: string
  status: 'pending' | 'bound' | 'active' | 'manifesting' | 'expelled' | 'revisit'
  reasoning: string
  entryPoints: string
  companions: string[]
  scriptures: string[]
  breakthroughLevel: 'none' | 'partial' | 'full'
}

export interface LogEntry {
  id: string
  timestamp: string
  type: keyof typeof LOG_ICONS
  content: string
  spiritContext?: string
  bodyRegion?: string
  role: string
  processing?: boolean
}

interface TeamMember {
  name: string
  role: string
}

interface SessionState {
  id: string
  subjectAlias: string
  sessionNumber: number
  status: 'active' | 'paused' | 'completed'
  startedAt: string | null
  elapsedSeconds: number
  team: TeamMember[]
  currentPhase: string
  phaseOrder: string[]
  completedPhases: string[]
  spiritSequence: SequenceSpirit[]
  activeSpirit: SequenceSpirit | null
  preSession: Record<string, boolean>
  logEntries: LogEntry[]
  renunciations: { id: string; category: string; text: string; completed: boolean; flaggedFromAssessment: boolean }[]
  worksheets: Record<string, boolean>
  aiSuggestions: { id: string; text: string; source: string; timestamp: string }[]
  lastSaved: Date | null
  mode: 'live' | 'guided' | 'offline'
  activeRole: string
}

// ── PROPS ───────────────────────────────────────────────────────────────────
interface SessionCommandCenterProps {
  sessionId?: string
  caseFile?: any
  onClose: () => void
  demons?: any[]
}

// ── HELPERS ─────────────────────────────────────────────────────────────────
function formatElapsed(secs: number) {
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function mkId() { return Math.random().toString(36).slice(2, 10) }

function fmtTime(ts: string) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

// ── MAIN COMPONENT ──────────────────────────────────────────────────────────
export function SessionCommandCenter({ sessionId, caseFile, onClose, demons = [] }: SessionCommandCenterProps) {
  const { getToken } = useAuth()

  const [session, setSession] = useState<SessionState>(() => ({
    id: sessionId || '',
    subjectAlias: caseFile?.subjectAlias || caseFile?.subject_alias || 'Subject',
    sessionNumber: caseFile?.sessionNumber || 1,
    status: 'active',
    startedAt: new Date().toISOString(),
    elapsedSeconds: 0,
    team: [],
    currentPhase: 'team_prep',
    phaseOrder: PHASES.map(p => p.id),
    completedPhases: [],
    spiritSequence: [],
    activeSpirit: null,
    preSession: {},
    logEntries: [],
    renunciations: RENUNCIATION_CATEGORIES.map(cat => ({
      id: mkId(), category: cat, text: cat, completed: false, flaggedFromAssessment: false,
    })),
    worksheets: {
      forgiveness: false, soul_ties: false, stronghold_buster: false,
      iniquity: false, aftercare: false,
    },
    aiSuggestions: [],
    lastSaved: null,
    mode: 'live',
    activeRole: 'leader',
  }))

  const [elapsed, setElapsed] = useState(0)
  const [logInput, setLogInput]       = useState('')
  const [spiritSearch, setSpiritSearch]= useState('')
  const [showSpiritAdd, setShowSpiritAdd] = useState(false)
  const [activeRegion, setActiveRegion] = useState<string | null>(null)
  const [regionSuggestions, setRegionSuggestions] = useState<string[]>([])
  const [prayerLoading, setPrayerLoading] = useState(false)
  const [activePrayer, setActivePrayer] = useState('')
  const [seerInput, setSeerInput] = useState('')
  const [seerNotif, setSeerNotif] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [showEndModal, setShowEndModal] = useState(false)
  const [reportLoading, setReportLoading] = useState(false)
  const [report, setReport] = useState('')
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [dragItem, setDragItem] = useState<string | null>(null)
  const [dragType, setDragType] = useState<'phase' | 'spirit' | null>(null)
  const [teamInput, setTeamInput] = useState('')
  const [teamRole, setTeamRole] = useState('recorder')
  const [addTeamOpen, setAddTeamOpen] = useState(false)
  const [renuncFilter, setRenuncFilter] = useState('')
  const [guidedStep, setGuidedStep] = useState(0)
  const [seenSeer, setSeenSeer] = useState(false)

  const photoRef = useRef<HTMLInputElement>(null)
  const fileRef  = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<any>(null)
  const audioChunksRef   = useRef<Blob[]>([])
  const [recording, setRecording] = useState(false)
  const [recSeconds, setRecSeconds] = useState(0)
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const logEndRef = useRef<HTMLDivElement>(null)
  const autoSaveRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── TIMER ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (session.status !== 'active') return
    const t = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(t)
  }, [session.status])

  // ── LOAD SESSION ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return
    getToken().then(token => {
      fetch(`/api/sessions?id=${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).then(data => {
        if (data.session) {
          const s = data.session
          setSession(prev => ({
            ...prev,
            id: s.id,
            subjectAlias: s.subject_alias,
            sessionNumber: s.session_number,
            status: s.status,
            startedAt: s.started_at,
            elapsedSeconds: s.total_elapsed_seconds || 0,
            team: s.team_members || [],
            currentPhase: s.current_phase || 'team_prep',
            phaseOrder: s.phase_order || PHASES.map(p => p.id),
            completedPhases: s.completed_phases || [],
            spiritSequence: s.spirit_sequence || [],
            preSession: s.pre_session || {},
            logEntries: s.log_entries || [],
            renunciations: s.renunciations?.length ? s.renunciations : prev.renunciations,
            worksheets: s.worksheets || prev.worksheets,
            aiSuggestions: s.ai_suggestions || [],
          }))
          setElapsed(s.total_elapsed_seconds || 0)
        }
      }).catch(() => {})
    })
  }, [sessionId])

  // ── AUTO-SAVE every 30s ───────────────────────────────────────────────────
  useEffect(() => {
    autoSaveRef.current = setInterval(() => { saveSession(false) }, 30000)
    return () => { if (autoSaveRef.current) clearInterval(autoSaveRef.current) }
  }, [session])

  // ── SCROLL LOG TO BOTTOM ──────────────────────────────────────────────────
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.logEntries.length])

  // ── SAVE ──────────────────────────────────────────────────────────────────
  const saveSession = useCallback(async (showMsg = true) => {
    if (!session.id) return
    try {
      const token = await getToken()
      await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          id: session.id,
          current_phase: session.currentPhase,
          completed_phases: session.completedPhases,
          spirit_sequence: session.spiritSequence,
          log_entries: session.logEntries,
          team_members: session.team,
          pre_session: session.preSession,
          renunciations: session.renunciations,
          worksheets: session.worksheets,
          ai_suggestions: session.aiSuggestions,
          total_elapsed_seconds: elapsed,
          status: session.status,
        }),
      })
      setSession(s => ({ ...s, lastSaved: new Date() }))
      if (showMsg) setSaveMsg('Saved')
      setTimeout(() => setSaveMsg(''), 2000)
    } catch {}
  }, [session, elapsed, getToken])

  // ── ADD LOG ENTRY ─────────────────────────────────────────────────────────
  const addLog = useCallback((type: LogEntry['type'], content: string, extra?: Partial<LogEntry>) => {
    const entry: LogEntry = {
      id: mkId(),
      timestamp: new Date().toISOString(),
      type,
      content,
      spiritContext: session.activeSpirit?.name,
      role: session.activeRole,
      ...extra,
    }
    setSession(s => ({ ...s, logEntries: [...s.logEntries, entry] }))
    return entry
  }, [session.activeSpirit, session.activeRole])

  // ── SUBMIT LOG INPUT ──────────────────────────────────────────────────────
  function submitLog(e: React.FormEvent) {
    e.preventDefault()
    if (!logInput.trim()) return
    addLog('note', logInput.trim())
    setLogInput('')
  }

  // ── BODY REGION TAP ───────────────────────────────────────────────────────
  async function tapRegion(regionId: string) {
    const region = BODY_REGIONS_SCC.find(r => r.id === regionId)
    if (!region) return
    setActiveRegion(regionId)
    addLog('manifestation', `MANIFESTATION: ${region.label}`, { bodyRegion: regionId })

    try {
      const res = await fetch('/api/session-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'region_spirits',
          data: {
            region: regionId,
            activeSpirits: session.spiritSequence.map(s => s.name),
            demonData: demons,
          },
        }),
      })
      const data = await res.json()
      setRegionSuggestions(data.suggestions || [])
    } catch {}
  }

  // ── ADD SPIRIT TO SEQUENCE ────────────────────────────────────────────────
  async function addSpiritToSequence(name: string) {
    const demon = demons.find(d => d.name?.toLowerCase() === name.toLowerCase())
    const newSpirit: SequenceSpirit = {
      id: mkId(),
      name: demon?.name || name,
      rank: demon?.biblicalRank || demon?.rank || 'Common Spirit',
      label: '',
      status: 'pending',
      reasoning: '',
      entryPoints: demon?.entryPoints || '',
      companions: demon?.companions ? String(demon.companions).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      scriptures: demon?.scriptures ? String(demon.scriptures).split(',').map((s: string) => s.trim()).filter(Boolean) : [],
      breakthroughLevel: 'none',
    }

    const newSeq = [...session.spiritSequence, newSpirit]
    setSession(s => ({ ...s, spiritSequence: newSeq }))

    try {
      const res = await fetch('/api/session-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'sequence',
          data: { spirits: newSeq.map(s => s.name), existingDemonData: demons },
        }),
      })
      const data = await res.json()
      if (data.sequence?.length) {
        const ordered: SequenceSpirit[] = data.sequence.map((ai: any) => {
          const existing = newSeq.find(s => s.name.toLowerCase() === ai.name?.toLowerCase())
          return {
            ...(existing || newSpirit),
            id: existing?.id || mkId(),
            label: ai.label || '',
            reasoning: ai.reasoning || '',
            rank: ai.rank || existing?.rank || 'Common Spirit',
          }
        })
        setSession(s => ({ ...s, spiritSequence: ordered }))
      }
    } catch {}

    setShowSpiritAdd(false)
    setSpiritSearch('')
    addLog('note', `Added to sequence: ${name}`)
  }

  // ── GENERATE EXPULSION PRAYER ─────────────────────────────────────────────
  async function generatePrayer() {
    if (!session.activeSpirit) return
    setPrayerLoading(true)
    setActivePrayer('')
    try {
      const res = await fetch('/api/session-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'expulsion_prayer',
          data: {
            spiritName: session.activeSpirit.name,
            entryPoints: session.activeSpirit.entryPoints,
            sessionContext: `Session ${session.sessionNumber} for ${session.subjectAlias}, phase: ${session.currentPhase}`,
          },
        }),
      })
      const data = await res.json()
      setActivePrayer(data.prayer || '')
    } catch { setActivePrayer('Error generating prayer. Try again.') }
    finally { setPrayerLoading(false) }
  }

  // ── AI SUGGESTION ─────────────────────────────────────────────────────────
  async function fetchAiSuggestion() {
    setAiLoading(true)
    try {
      const res = await fetch('/api/session-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ai_suggestion',
          data: {
            recentLogs: session.logEntries.slice(-8).map(e => `[${e.type}] ${e.content}`),
            activeSpirit: session.activeSpirit?.name,
            manifestations: session.logEntries.filter(e => e.type === 'manifestation').slice(-3).map(e => e.content),
          },
        }),
      })
      const data = await res.json()
      if (data.suggestion) {
        const sug = { id: mkId(), text: data.suggestion, source: data.source || 'WRI', timestamp: new Date().toISOString() }
        setSession(s => ({ ...s, aiSuggestions: [sug, ...s.aiSuggestions].slice(0, 10) }))
      }
    } catch {}
    finally { setAiLoading(false) }
  }

  // ── PHOTO CAPTURE ─────────────────────────────────────────────────────────
  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const placeholder = addLog('photo', 'Processing photo...', { processing: true })
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const b64 = (ev.target?.result as string).split(',')[1]
      try {
        const res = await fetch('/api/session-ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'transcribe_note', data: { type: 'photo', content: b64, mimeType: file.type } }),
        })
        const data = await res.json()
        setSession(s => ({
          ...s,
          logEntries: s.logEntries.map(e =>
            e.id === placeholder.id
              ? { ...e, content: `Photo: ${data.transcript || 'Could not read'}`, processing: false }
              : e
          ),
        }))
      } catch {
        setSession(s => ({
          ...s,
          logEntries: s.logEntries.map(e =>
            e.id === placeholder.id ? { ...e, content: 'Photo captured (offline)', processing: false } : e
          ),
        }))
      }
    }
    reader.readAsDataURL(file)
    if (photoRef.current) photoRef.current.value = ''
  }

  // ── AUDIO RECORDING ───────────────────────────────────────────────────────
  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop()
      setRecording(false)
      if (recTimerRef.current) clearInterval(recTimerRef.current)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new (window as any).MediaRecorder(stream, { mimeType: 'audio/webm' })
      audioChunksRef.current = []
      mr.ondataavailable = (e: any) => { if (e.data.size > 0) audioChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((t: any) => t.stop())
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const placeholder = addLog('audio', 'Transcribing audio...', { processing: true })
        const reader = new FileReader()
        reader.onload = async (ev) => {
          const b64 = (ev.target?.result as string).split(',')[1]
          try {
            const res = await fetch('/api/session-ai', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'transcribe_note', data: { type: 'audio', content: b64, mimeType: 'audio/webm' } }),
            })
            const data = await res.json()
            setSession(s => ({
              ...s,
              logEntries: s.logEntries.map(e =>
                e.id === placeholder.id
                  ? { ...e, content: `Audio: ${data.transcript || 'Could not transcribe'}`, processing: false }
                  : e
              ),
            }))
          } catch {
            setSession(s => ({
              ...s,
              logEntries: s.logEntries.map(e =>
                e.id === placeholder.id ? { ...e, content: 'Audio memo recorded (offline)', processing: false } : e
              ),
            }))
          }
        }
        reader.readAsDataURL(blob)
      }
      mr.start()
      mediaRecorderRef.current = mr
      setRecording(true)
      setRecSeconds(0)
      recTimerRef.current = setInterval(() => setRecSeconds(s => s + 1), 1000)
    } catch { addLog('note', 'Mic access denied') }
  }

  // ── FILE UPLOAD ───────────────────────────────────────────────────────────
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = file.name.split('.').pop()?.toLowerCase()
    const placeholder = addLog('note', `Processing ${file.name}...`, { processing: true })

    if (ext === 'txt') {
      const text = await file.text()
      setSession(s => ({
        ...s,
        logEntries: s.logEntries.map(e =>
          e.id === placeholder.id ? { ...e, content: `Uploaded: ${text.slice(0, 500)}`, processing: false } : e
        ),
      }))
    } else if (['wav','mp3','m4a','webm'].includes(ext || '')) {
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const b64 = (ev.target?.result as string).split(',')[1]
        try {
          const res = await fetch('/api/session-ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'transcribe_note', data: { type: 'audio', content: b64, mimeType: file.type } }),
          })
          const d = await res.json()
          setSession(s => ({
            ...s,
            logEntries: s.logEntries.map(e =>
              e.id === placeholder.id ? { ...e, content: `Uploaded audio: ${d.transcript || 'Transcription failed'}`, processing: false } : e
            ),
          }))
        } catch {
          setSession(s => ({
            ...s,
            logEntries: s.logEntries.map(e =>
              e.id === placeholder.id ? { ...e, content: `File uploaded: ${file.name}`, processing: false } : e
            ),
          }))
        }
      }
      reader.readAsDataURL(file)
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  // ── SAVE & PAUSE ──────────────────────────────────────────────────────────
  async function saveAndPause() {
    setSession(s => ({ ...s, status: 'paused' }))
    await saveSession(true)
    setSaveMsg('Session saved. Resume from Session Center.')
    setTimeout(() => onClose(), 1500)
  }

  // ── END SESSION ───────────────────────────────────────────────────────────
  async function endSession() {
    setSession(s => ({ ...s, status: 'completed' }))
    await saveSession(false)
    if (session.id) {
      const token = await getToken()
      await fetch('/api/sessions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: session.id, status: 'completed', total_elapsed_seconds: elapsed }),
      })
    }
    setShowEndModal(false)
    onClose()
  }

  // ── GENERATE SESSION REPORT ───────────────────────────────────────────────
  async function generateReport() {
    setReportLoading(true)
    try {
      const res = await fetch('/api/session-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'session_report',
          data: {
            session: {
              subject_alias: session.subjectAlias,
              session_number: session.sessionNumber,
              team_members: session.team,
              completed_phases: session.completedPhases,
              spirit_sequence: session.spiritSequence,
              log_entries: session.logEntries,
              total_elapsed_seconds: elapsed,
            },
          },
        }),
      })
      const data = await res.json()
      setReport(data.report || 'Report generation failed.')
    } catch { setReport('Error generating report.') }
    setReportLoading(false)
  }

  // ── SEER NOTE ─────────────────────────────────────────────────────────────
  function submitSeerNote() {
    if (!seerInput.trim()) return
    addLog('seer_note', `SEER: ${seerInput.trim()}`)
    setSeerNotif(seerInput.trim())
    setSeerInput('')
    setSeenSeer(false)
    setTimeout(() => { setSeerNotif(''); setSeenSeer(true) }, 8000)
  }

  // ── DRAG & DROP — PHASES ─────────────────────────────────────────────────
  function onPhaseDragStart(id: string) { setDragItem(id); setDragType('phase') }
  function onPhaseDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (dragType !== 'phase') return
    setDragOver(id)
  }
  function onPhaseDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragItem || dragType !== 'phase' || dragItem === targetId) { setDragOver(null); return }
    const arr = [...session.phaseOrder]
    const from = arr.indexOf(dragItem)
    const to   = arr.indexOf(targetId)
    if (from < 0 || to < 0) { setDragOver(null); return }
    arr.splice(from, 1); arr.splice(to, 0, dragItem)
    setSession(s => ({ ...s, phaseOrder: arr }))
    setDragOver(null); setDragItem(null); setDragType(null)
  }

  // ── DRAG & DROP — SPIRITS ────────────────────────────────────────────────
  function onSpiritDragStart(id: string) { setDragItem(id); setDragType('spirit') }
  function onSpiritDragOver(e: React.DragEvent, id: string) {
    e.preventDefault()
    if (dragType !== 'spirit') return
    setDragOver(id)
  }
  function onSpiritDrop(e: React.DragEvent, targetId: string) {
    e.preventDefault()
    if (!dragItem || dragType !== 'spirit' || dragItem === targetId) { setDragOver(null); return }
    const arr = [...session.spiritSequence]
    const from = arr.findIndex(s => s.id === dragItem)
    const to   = arr.findIndex(s => s.id === targetId)
    if (from < 0 || to < 0) { setDragOver(null); return }
    const [moved] = arr.splice(from, 1); arr.splice(to, 0, moved)
    setSession(s => ({ ...s, spiritSequence: arr }))
    setDragOver(null); setDragItem(null); setDragType(null)
  }

  // ── QUICK TAGS ────────────────────────────────────────────────────────────
  const QUICK_TAGS: { label: string; type: LogEntry['type']; color: string }[] = [
    { label: '◉ BREAKTHROUGH', type: 'breakthrough', color: '#4ade80' },
    { label: '✗ RESISTANCE',   type: 'resistance',   color: '#f87171' },
    { label: '⚠ DECEPTION',    type: 'deception',    color: '#fb923c' },
    { label: '⚡ MANIFEST',     type: 'manifestation',color: G },
    { label: '➤ NAMED ITSELF', type: 'spirit_named', color: '#c084fc' },
    { label: '✓ RENUNCIATION', type: 'renunciation', color: '#86efac' },
  ]

  // ── SPIRIT SEARCH FILTERED ────────────────────────────────────────────────
  const filteredDemons = spiritSearch.length > 1
    ? demons.filter(d => d.name?.toLowerCase().includes(spiritSearch.toLowerCase())).slice(0, 8)
    : []

  // ── ACTIVE SPIRIT DOSSIER DATA ────────────────────────────────────────────
  const activeDemonData = session.activeSpirit
    ? demons.find(d => d.name?.toLowerCase() === session.activeSpirit!.name.toLowerCase())
    : null

  // ── SESSION SUMMARY ───────────────────────────────────────────────────────
  const expelled   = session.spiritSequence.filter(s => s.status === 'expelled').length
  const addressed  = session.spiritSequence.filter(s => s.status !== 'pending').length
  const stillActive= session.spiritSequence.filter(s => s.status === 'active' || s.status === 'manifesting' || s.status === 'revisit').length

  // ── STYLES ────────────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', height: '100%',
    overflow: 'hidden', background: SURF,
  }
  const sectionLabel = (text: string) => (
    <div style={{ padding: '8px 10px 4px', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.2em', color: G, textTransform: 'uppercase' }}>{text}</div>
  )
  const pill = (label: string, active: boolean, onClick: () => void, color = G) => (
    <button onClick={onClick} style={{
      padding: '3px 9px', borderRadius: 20, border: `1px solid ${active ? color : 'rgba(201,168,76,0.2)'}`,
      background: active ? `${color}22` : 'transparent', color: active ? color : DIM,
      fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer',
    }}>{label}</button>
  )

  // ── GUIDED MODE ───────────────────────────────────────────────────────────
  const GUIDED_STEPS = [
    { q: 'Has the team completed unity prayer?', action: 'unity_prayer' },
    { q: 'Has the team received communion together?', action: 'communion' },
    { q: 'Have you reviewed the session prep report?', action: 'review_plans' },
    { q: 'Have all roles been assigned and confirmed?', action: 'assign_roles' },
    { q: 'Have you bound Leviathan and Mind Control specifically?', action: 'bind_leviathan' },
    { q: 'Have you forbidden spirit transfers to team members?', action: 'forbid_transfer' },
    { q: 'Have you prayed angels at every entry/exit point?', action: 'angels_stationed' },
  ]

  if (session.mode === 'guided') {
    const step = GUIDED_STEPS[guidedStep]
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#09070e', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 44, background: '#060408', borderBottom: `1px solid #1e1a0e`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.15em' }}>⚔ GUIDED SESSION SETUP</div>
          <div style={{ fontFamily: cinzel, fontSize: 11, color: G }}>{formatElapsed(elapsed)}</div>
          <button onClick={() => setSession(s => ({ ...s, mode: 'live' }))} style={{ fontFamily: cinzel, fontSize: 9, color: DIM, background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.08em' }}>SKIP TO LIVE</button>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 32 }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.15em' }}>STEP {guidedStep + 1} OF {GUIDED_STEPS.length}</div>
          <div style={{ fontFamily: crimson, fontSize: 26, color: TXT, textAlign: 'center', maxWidth: 500, lineHeight: 1.5 }}>{step?.q}</div>
          <div style={{ display: 'flex', gap: 16 }}>
            <button
              onClick={() => {
                setSession(s => ({ ...s, preSession: { ...s.preSession, [step.action]: true } }))
                if (guidedStep + 1 >= GUIDED_STEPS.length) {
                  setSession(s => ({ ...s, mode: 'live', currentPhase: 'welcome' }))
                } else {
                  setGuidedStep(g => g + 1)
                }
              }}
              style={{ padding: '14px 32px', background: G, border: 'none', borderRadius: 6, fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: '#060408', cursor: 'pointer', fontWeight: 700 }}
            >YES</button>
            <button
              onClick={() => {
                if (guidedStep + 1 >= GUIDED_STEPS.length) {
                  setSession(s => ({ ...s, mode: 'live' }))
                } else {
                  setGuidedStep(g => g + 1)
                }
              }}
              style={{ padding: '14px 32px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 6, fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', color: DIM, cursor: 'pointer' }}
            >NO - SKIP</button>
          </div>
        </div>
      </div>
    )
  }

  // ── OFFLINE MODE ──────────────────────────────────────────────────────────
  if (session.mode === 'offline') {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#09070e', display: 'flex', flexDirection: 'column' }}>
        <div style={{ height: 44, background: '#060408', borderBottom: `1px solid #1e1a0e`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', flexShrink: 0 }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.15em' }}>⚔ OFFLINE CAPTURE MODE</div>
          <div style={{ fontFamily: cinzel, fontSize: 18, color: G, fontWeight: 700 }}>{formatElapsed(elapsed)}</div>
          <button onClick={() => setSession(s => ({ ...s, mode: 'live' }))} style={{ fontFamily: cinzel, fontSize: 9, color: G, background: `${G}22`, border: `1px solid ${G}`, borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>GO LIVE</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 24, maxWidth: 600, margin: '0 auto', width: '100%' }}>
          <div style={{ marginBottom: 20, fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.1em' }}>QUICK CAPTURE — {session.subjectAlias}</div>
          {QUICK_TAGS.map(tag => (
            <button key={tag.type} onClick={() => addLog(tag.type, tag.label)}
              style={{ display: 'block', width: '100%', marginBottom: 10, padding: '14px', background: 'transparent', border: `1px solid ${tag.color}44`, borderRadius: 8, color: tag.color, fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer', textAlign: 'left' }}>
              {tag.label}
            </button>
          ))}
          <form onSubmit={submitLog} style={{ marginTop: 20 }}>
            <input value={logInput} onChange={e => setLogInput(e.target.value)} placeholder="Type note..." style={{ width: '100%', boxSizing: 'border-box', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '12px 14px', color: TXT, fontFamily: crimson, fontSize: 16, outline: 'none' }} />
          </form>
          <div style={{ marginTop: 24 }}>
            {session.logEntries.slice().reverse().slice(0, 20).map(e => (
              <div key={e.id} style={{ padding: '8px 0', borderBottom: `1px solid ${BDR}`, fontFamily: crimson, fontSize: 14, color: LOG_COLORS[e.type] || TXT }}>
                <span style={{ color: DIM, fontSize: 11 }}>{fmtTime(e.timestamp)} </span>{e.content}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── LIVE MODE — MAIN RENDER ───────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#09070e', display: 'flex', flexDirection: 'column', fontFamily: crimson }}>
      <style>{`
        @keyframes scc-pulse { 0%,100%{opacity:0.5} 50%{opacity:1} }
        @keyframes scc-glow  { 0%,100%{box-shadow:0 0 4px ${G}44} 50%{box-shadow:0 0 12px ${G}88} }
        .scc-scroll::-webkit-scrollbar { width: 4px }
        .scc-scroll::-webkit-scrollbar-track { background: transparent }
        .scc-scroll::-webkit-scrollbar-thumb { background: rgba(201,168,76,0.2); border-radius: 2px }
      `}</style>

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div style={{ height: 44, background: '#060408', borderBottom: '1px solid #1e1a0e', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px', flexShrink: 0, gap: 8 }}>
        {/* Left */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: session.status === 'active' ? '#4ade80' : '#f87171', animation: session.status === 'active' ? 'scc-pulse 2s infinite' : 'none', flexShrink: 0 }} />
          <span style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.15em', whiteSpace: 'nowrap' }}>⚔ SESSION</span>
          <span style={{ fontFamily: cinzel, fontSize: 10, color: TXT, letterSpacing: '0.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 120 }}>
            {session.subjectAlias} #{session.sessionNumber}
          </span>
          {saveMsg && <span style={{ fontFamily: cinzel, fontSize: 8, color: '#4ade80', letterSpacing: '0.1em' }}>{saveMsg}</span>}
        </div>

        {/* Center — Timer */}
        <div style={{ fontFamily: cinzel, fontSize: 20, color: G, letterSpacing: '0.12em', fontWeight: 700, flexShrink: 0 }}>
          {formatElapsed(elapsed)}
        </div>

        {/* Right — actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />
          <input ref={fileRef} type="file" accept=".wav,.mp3,.m4a,.txt,.webm" style={{ display: 'none' }} onChange={handleFileUpload} />
          <button onClick={() => photoRef.current?.click()} style={{ padding: '4px 8px', background: 'rgba(201,168,76,0.06)', border: `1px solid ${BDR}`, borderRadius: 4, color: TXT, fontFamily: cinzel, fontSize: 9, cursor: 'pointer', letterSpacing: '0.06em' }}>📷</button>
          <button
            onClick={toggleRecording}
            style={{ padding: '4px 8px', background: recording ? 'rgba(248,113,113,0.15)' : 'rgba(201,168,76,0.06)', border: `1px solid ${recording ? '#f87171' : BDR}`, borderRadius: 4, color: recording ? '#f87171' : TXT, fontFamily: cinzel, fontSize: 9, cursor: 'pointer', letterSpacing: '0.06em' }}
          >{recording ? `⏹ ${recSeconds}s` : '🎤'}</button>
          <button onClick={() => fileRef.current?.click()} style={{ padding: '4px 8px', background: 'rgba(201,168,76,0.06)', border: `1px solid ${BDR}`, borderRadius: 4, color: TXT, fontFamily: cinzel, fontSize: 9, cursor: 'pointer', letterSpacing: '0.06em' }}>📄 UPLOAD</button>
          <button onClick={saveAndPause} style={{ padding: '5px 10px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${BDR}`, borderRadius: 4, color: G, fontFamily: cinzel, fontSize: 9, cursor: 'pointer', letterSpacing: '0.08em' }}>⏸ PAUSE</button>
          <button onClick={() => setShowEndModal(true)} style={{ padding: '5px 10px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 4, color: '#f87171', fontFamily: cinzel, fontSize: 9, cursor: 'pointer', letterSpacing: '0.08em' }}>END</button>
        </div>
      </div>

      {/* ── SEER NOTIFICATION ─────────────────────────────────────────────── */}
      {seerNotif && !seenSeer && (
        <div onClick={() => setSeenSeer(true)} style={{ background: 'rgba(52,211,153,0.15)', border: '1px solid rgba(52,211,153,0.4)', padding: '8px 16px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 14 }}>🌊</span>
          <span style={{ fontFamily: crimson, fontSize: 14, color: '#34d399', flex: 1 }}>SEER: {seerNotif}</span>
          <span style={{ fontFamily: cinzel, fontSize: 8, color: '#34d399', opacity: 0.6 }}>TAP TO DISMISS</span>
        </div>
      )}

      {/* ── MODE PILLS ────────────────────────────────────────────────────── */}
      <div style={{ background: '#080610', borderBottom: '1px solid #1e1a0e', padding: '4px 12px', display: 'flex', gap: 6, flexShrink: 0 }}>
        {(['live','guided','offline'] as const).map(m => pill(m.toUpperCase(), session.mode === m, () => {
          if (m === 'guided') setGuidedStep(0)
          setSession(s => ({ ...s, mode: m }))
        }))}
        {/* Role tabs */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          {TEAM_ROLES.map(r => (
            <button key={r} onClick={() => setSession(s => ({ ...s, activeRole: r }))}
              style={{ padding: '3px 8px', borderRadius: 3, border: 'none', background: session.activeRole === r ? `${G}22` : 'transparent', color: session.activeRole === r ? G : DIM, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* ── THREE COLUMN LAYOUT ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

        {/* ═══════════════════════════════════════════════════════════════════
            LEFT PANEL — 200px
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ width: 200, flexShrink: 0, ...panelStyle, borderRight: `1px solid #1e1a0e` }}>
          <div className="scc-scroll" style={{ flex: 1, overflowY: 'auto' }}>

            {/* Phase Tracker */}
            {sectionLabel('Phase')}
            <div style={{ padding: '0 6px' }}>
              {session.phaseOrder.map(phaseId => {
                const phase = PHASES.find(p => p.id === phaseId)
                if (!phase) return null
                const isActive    = session.currentPhase === phaseId
                const isCompleted = session.completedPhases.includes(phaseId)
                return (
                  <div
                    key={phaseId}
                    draggable
                    onDragStart={() => onPhaseDragStart(phaseId)}
                    onDragOver={e => onPhaseDragOver(e, phaseId)}
                    onDrop={e => onPhaseDrop(e, phaseId)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 6px',
                      borderRadius: 4, cursor: 'pointer', marginBottom: 1,
                      background: isActive ? 'rgba(201,168,76,0.1)' : dragOver === phaseId ? 'rgba(255,255,255,0.04)' : 'transparent',
                      border: isActive ? `1px solid ${BDR}` : '1px solid transparent',
                    }}
                    onClick={() => setSession(s => ({ ...s, currentPhase: phaseId }))}
                  >
                    <span style={{ fontSize: 9, color: DIM, cursor: 'grab' }}>⠿</span>
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        setSession(s => ({
                          ...s,
                          completedPhases: isCompleted
                            ? s.completedPhases.filter(p => p !== phaseId)
                            : [...s.completedPhases, phaseId],
                        }))
                      }}
                      style={{ width: 14, height: 14, borderRadius: '50%', border: `1px solid ${isCompleted ? '#4ade80' : BDR}`, background: isCompleted ? '#4ade8022' : 'transparent', color: isCompleted ? '#4ade80' : DIM, fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                    >{isCompleted ? '✓' : isActive ? '●' : '○'}</button>
                    <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', color: isActive ? G : isCompleted ? '#6b7280' : TXT, flex: 1, lineHeight: 1.2 }}>
                      {phase.icon} {phase.label}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* Sequence Engine */}
            {sectionLabel('Sequence Engine · AI')}
            <div style={{ padding: '0 6px' }}>
              {session.spiritSequence.length === 0 && (
                <div style={{ padding: '8px 6px', fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic' }}>No spirits added yet</div>
              )}
              {session.spiritSequence.map((spirit, i) => {
                const isActive = session.activeSpirit?.id === spirit.id
                return (
                  <div
                    key={spirit.id}
                    draggable
                    onDragStart={() => onSpiritDragStart(spirit.id)}
                    onDragOver={e => onSpiritDragOver(e, spirit.id)}
                    onDrop={e => onSpiritDrop(e, spirit.id)}
                    onClick={() => setSession(s => ({ ...s, activeSpirit: spirit }))}
                    style={{
                      padding: '5px 6px', borderRadius: 4, marginBottom: 2, cursor: 'pointer',
                      background: isActive ? 'rgba(201,168,76,0.12)' : dragOver === spirit.id ? 'rgba(255,255,255,0.04)' : 'transparent',
                      border: `1px solid ${isActive ? BDR : 'transparent'}`,
                      animation: isActive && spirit.status === 'active' ? 'scc-glow 2s infinite' : 'none',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ fontSize: 9, color: DIM, cursor: 'grab' }}>⠿</span>
                      <span style={{ fontFamily: cinzel, fontSize: 9, color: DIM }}>{i + 1}.</span>
                      <span style={{ fontFamily: cinzel, fontSize: 10, color: isActive ? G : TXT, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{spirit.name}</span>
                      <span style={{ fontSize: 7, fontFamily: cinzel, color: STATUS_COLORS[spirit.status] || DIM, letterSpacing: '0.06em', flexShrink: 0 }}>
                        {spirit.status.toUpperCase()}
                      </span>
                    </div>
                    {spirit.label && (
                      <div style={{ fontSize: 7, fontFamily: cinzel, color: DIM, letterSpacing: '0.06em', paddingLeft: 18, marginTop: 1 }}>{spirit.label}</div>
                    )}
                    {/* Status buttons — only show for active spirit */}
                    {isActive && (
                      <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' as const }}>
                        {(['bound','active','manifesting','expelled','revisit'] as const).map(st => (
                          <button key={st} onClick={e => {
                            e.stopPropagation()
                            setSession(s => ({
                              ...s,
                              spiritSequence: s.spiritSequence.map(sp => sp.id === spirit.id ? { ...sp, status: st } : sp),
                              activeSpirit: s.activeSpirit?.id === spirit.id ? { ...s.activeSpirit, status: st } : s.activeSpirit,
                            }))
                            if (st === 'expelled') addLog('breakthrough', `${spirit.name} EXPELLED`)
                          }}
                            style={{ padding: '2px 5px', borderRadius: 3, border: `1px solid ${STATUS_COLORS[st]}44`, background: spirit.status === st ? `${STATUS_COLORS[st]}22` : 'transparent', color: STATUS_COLORS[st], fontFamily: cinzel, fontSize: 7, cursor: 'pointer', letterSpacing: '0.04em' }}>
                            {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add spirit */}
              <div style={{ position: 'relative', marginTop: 6 }}>
                <button onClick={() => setShowSpiritAdd(s => !s)}
                  style={{ width: '100%', padding: '6px', background: 'rgba(201,168,76,0.06)', border: `1px dashed ${BDR}`, borderRadius: 4, color: G, fontFamily: cinzel, fontSize: 9, cursor: 'pointer', letterSpacing: '0.08em' }}>
                  + ADD SPIRIT
                </button>
                {showSpiritAdd && (
                  <div style={{ marginTop: 4 }}>
                    <input autoFocus value={spiritSearch} onChange={e => setSpiritSearch(e.target.value)}
                      placeholder="Search spirits..." style={{ width: '100%', boxSizing: 'border-box', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 4, padding: '6px 8px', color: TXT, fontFamily: crimson, fontSize: 12, outline: 'none' }} />
                    {filteredDemons.map(d => (
                      <div key={d.id || d.name} onClick={() => addSpiritToSequence(d.name)}
                        style={{ padding: '5px 8px', cursor: 'pointer', background: 'rgba(255,255,255,0.02)', borderBottom: `1px solid ${BDR}`, fontFamily: cinzel, fontSize: 10, color: TXT }}>
                        {d.name}
                      </div>
                    ))}
                    {spiritSearch.length > 1 && filteredDemons.length === 0 && (
                      <div onClick={() => addSpiritToSequence(spiritSearch)}
                        style={{ padding: '5px 8px', cursor: 'pointer', background: 'rgba(201,168,76,0.06)', fontFamily: cinzel, fontSize: 10, color: G }}>
                        + Add "{spiritSearch}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Team Roster */}
            {sectionLabel('Team')}
            <div style={{ padding: '0 6px 8px' }}>
              {session.team.map((m, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 6px', fontFamily: cinzel }}>
                  <span style={{ fontSize: 9, color: G }}>●</span>
                  <span style={{ fontSize: 10, color: TXT, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.name}</span>
                  <span style={{ fontSize: 8, color: DIM }}>{m.role}</span>
                </div>
              ))}
              {!addTeamOpen ? (
                <button onClick={() => setAddTeamOpen(true)} style={{ width: '100%', marginTop: 4, padding: '4px', background: 'transparent', border: `1px dashed ${BDR}`, borderRadius: 4, color: DIM, fontFamily: cinzel, fontSize: 8, cursor: 'pointer', letterSpacing: '0.08em' }}>+ ADD ROLE</button>
              ) : (
                <div style={{ marginTop: 4 }}>
                  <input value={teamInput} onChange={e => setTeamInput(e.target.value)} placeholder="Name" style={{ width: '100%', boxSizing: 'border-box', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 4, padding: '4px 6px', color: TXT, fontFamily: crimson, fontSize: 12, outline: 'none', marginBottom: 4 }} />
                  <select value={teamRole} onChange={e => setTeamRole(e.target.value)} style={{ width: '100%', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 4, padding: '4px 6px', color: TXT, fontFamily: cinzel, fontSize: 9, outline: 'none', marginBottom: 4 }}>
                    {TEAM_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => {
                      if (!teamInput.trim()) return
                      setSession(s => ({ ...s, team: [...s.team, { name: teamInput.trim(), role: teamRole }] }))
                      setTeamInput(''); setAddTeamOpen(false)
                    }} style={{ flex: 1, padding: '4px', background: `${G}22`, border: `1px solid ${BDR}`, borderRadius: 3, color: G, fontFamily: cinzel, fontSize: 8, cursor: 'pointer' }}>ADD</button>
                    <button onClick={() => setAddTeamOpen(false)} style={{ flex: 1, padding: '4px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 3, color: DIM, fontFamily: cinzel, fontSize: 8, cursor: 'pointer' }}>CANCEL</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            CENTER PANEL — flex-1
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* ── LEADER TAB ─────────────────────────────────────────────────── */}
          {(session.activeRole === 'leader' || session.activeRole === 'worship' || session.activeRole === 'runner' || session.activeRole === 'gatekeeper') && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Body Region Tap Grid */}
              <div style={{ padding: '8px 12px', borderBottom: '1px solid #1e1a0e', flexShrink: 0 }}>
                <div style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.15em', marginBottom: 6 }}>BODY REGION — TAP WHEN MANIFESTATION OCCURS</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                  {BODY_REGIONS_SCC.map(r => (
                    <button key={r.id} onClick={() => tapRegion(r.id)}
                      style={{
                        padding: '5px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 12,
                        border: `1px solid ${activeRegion === r.id ? G : 'rgba(201,168,76,0.2)'}`,
                        background: activeRegion === r.id ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.02)',
                        animation: activeRegion === r.id ? 'scc-pulse 1.5s infinite' : 'none',
                        color: TXT,
                      }}>
                      {r.icon} <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em' }}>{r.label}</span>
                    </button>
                  ))}
                </div>
                {regionSuggestions.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' as const }}>
                    <span style={{ fontFamily: cinzel, fontSize: 8, color: G, letterSpacing: '0.1em' }}>SPIRITS:</span>
                    {regionSuggestions.map(name => (
                      <button key={name} onClick={() => addSpiritToSequence(name)}
                        style={{ padding: '2px 8px', borderRadius: 10, border: `1px solid ${BDR}`, background: 'rgba(201,168,76,0.08)', color: TXT, fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>
                        + {name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Live Log */}
              <div className="scc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                {session.logEntries.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '40px 0', fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic' }}>Session log is empty. Begin logging below.</div>
                )}
                {session.logEntries.map(entry => (
                  <div key={entry.id} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'flex-start' }}>
                    <span style={{ fontFamily: cinzel, fontSize: 9, color: DIM, whiteSpace: 'nowrap', flexShrink: 0, marginTop: 2 }}>{fmtTime(entry.timestamp)}</span>
                    <span style={{ fontSize: 13, flexShrink: 0, color: LOG_COLORS[entry.type] || TXT }}>{LOG_ICONS[entry.type] || '·'}</span>
                    <span style={{ fontFamily: crimson, fontSize: 14, color: LOG_COLORS[entry.type] || TXT, flex: 1, lineHeight: 1.4, opacity: entry.processing ? 0.6 : 1 }}>
                      {entry.content}
                      {entry.spiritContext && <span style={{ color: DIM, fontSize: 11, marginLeft: 6 }}>[{entry.spiritContext}]</span>}
                    </span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>

              {/* Quick Tags */}
              <div style={{ padding: '6px 12px', borderTop: '1px solid #1e1a0e', display: 'flex', gap: 5, flexWrap: 'wrap' as const, flexShrink: 0 }}>
                {QUICK_TAGS.map(tag => (
                  <button key={tag.type} onClick={() => addLog(tag.type, tag.label)}
                    style={{ padding: '4px 8px', borderRadius: 4, border: `1px solid ${tag.color}44`, background: 'transparent', color: tag.color, fontFamily: cinzel, fontSize: 8, cursor: 'pointer', letterSpacing: '0.06em' }}>
                    {tag.label}
                  </button>
                ))}
              </div>

              {/* Log Input */}
              <form onSubmit={submitLog} style={{ padding: '6px 12px 8px', flexShrink: 0, borderTop: '1px solid #1e1a0e' }}>
                <input value={logInput} onChange={e => setLogInput(e.target.value)}
                  placeholder="Type observation → Enter to log..."
                  style={{ width: '100%', boxSizing: 'border-box', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 12px', color: TXT, fontFamily: crimson, fontSize: 14, outline: 'none' }} />
              </form>
            </div>
          )}

          {/* ── RECORDER TAB (Ruby's interface) ───────────────────────────── */}
          {session.activeRole === 'recorder' && (
            <div className="scc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              {/* Large Timer */}
              <div style={{ textAlign: 'center', padding: '12px 0 16px', borderBottom: '1px solid #1e1a0e', marginBottom: 16 }}>
                <div style={{ fontFamily: cinzel, fontSize: 32, color: G, letterSpacing: '0.15em', fontWeight: 700 }}>{formatElapsed(elapsed)}</div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.15em', marginTop: 4 }}>{session.subjectAlias} · SESSION #{session.sessionNumber}</div>
              </div>

              {/* Pre-Session Checklist */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', marginBottom: 10 }}>PRE-SESSION CHECKLIST</div>
                {[...( PRE_SESSION_CHECKLIST.team_prep || []), ...(PRE_SESSION_CHECKLIST.welcome || [])].map(item => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0', borderBottom: '1px solid rgba(201,168,76,0.06)' }}>
                    <button onClick={() => setSession(s => ({ ...s, preSession: { ...s.preSession, [item.id]: !s.preSession[item.id] } }))}
                      style={{ width: 16, height: 16, borderRadius: 3, border: `1px solid ${session.preSession[item.id] ? '#4ade80' : BDR}`, background: session.preSession[item.id] ? '#4ade8022' : 'transparent', color: '#4ade80', fontSize: 10, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {session.preSession[item.id] ? '✓' : ''}
                    </button>
                    <span style={{ fontFamily: crimson, fontSize: 13, color: session.preSession[item.id] ? DIM : TXT, textDecoration: session.preSession[item.id] ? 'line-through' : 'none' }}>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Spirit Cluster Cards */}
              <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', marginBottom: 10 }}>SPIRIT STATUS</div>
              {session.spiritSequence.map(spirit => (
                <div key={spirit.id} style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 8, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 16, color: G, marginBottom: 4 }}>{spirit.name}</div>
                  {spirit.entryPoints && <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, marginBottom: 8 }}>{spirit.entryPoints}</div>}
                  <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' as const }}>
                    {(['manifesting','expelled','active'] as const).map(st => (
                      <button key={st} onClick={() => setSession(s => ({
                        ...s,
                        spiritSequence: s.spiritSequence.map(sp => sp.id === spirit.id ? { ...sp, status: st } : sp),
                        activeSpirit: s.activeSpirit?.id === spirit.id ? { ...s.activeSpirit, status: st } : s.activeSpirit,
                      }))}
                        style={{ flex: 1, padding: '8px 4px', borderRadius: 5, border: `1px solid ${STATUS_COLORS[st]}44`, background: spirit.status === st ? `${STATUS_COLORS[st]}22` : 'transparent', color: STATUS_COLORS[st], fontFamily: cinzel, fontSize: 9, cursor: 'pointer', letterSpacing: '0.06em' }}>
                        {st === 'expelled' ? '✓ EXPELLED' : st === 'manifesting' ? '⚡ MANIFESTING' : 'STILL ACTIVE'}
                      </button>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                    {(['full','partial','none'] as const).map(lvl => (
                      <button key={lvl} onClick={() => setSession(s => ({
                        ...s,
                        spiritSequence: s.spiritSequence.map(sp => sp.id === spirit.id ? { ...sp, breakthroughLevel: lvl } : sp),
                      }))}
                        style={{ flex: 1, padding: '5px', borderRadius: 4, border: `1px solid ${lvl === 'full' ? '#4ade8044' : lvl === 'partial' ? `${G}44` : '#6b728044'}`, background: spirit.breakthroughLevel === lvl ? (lvl === 'full' ? '#4ade8022' : lvl === 'partial' ? `${G}22` : 'rgba(107,114,128,0.1)') : 'transparent', color: spirit.breakthroughLevel === lvl ? (lvl === 'full' ? '#4ade80' : lvl === 'partial' ? G : DIM) : DIM, fontFamily: cinzel, fontSize: 8, cursor: 'pointer' }}>
                        {lvl.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              {/* Session Summary */}
              <div style={{ background: 'rgba(201,168,76,0.05)', border: `1px solid ${BDR}`, borderRadius: 8, padding: '12px 14px', marginTop: 8 }}>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', marginBottom: 8 }}>SESSION TALLY</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                  {[['Addressed', addressed],['Expelled', expelled],['Still Active', stillActive]].map(([label, val]) => (
                    <div key={label as string} style={{ textAlign: 'center' as const }}>
                      <div style={{ fontFamily: cinzel, fontSize: 22, color: G }}>{val}</div>
                      <div style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.08em' }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick capture */}
              <form onSubmit={submitLog} style={{ marginTop: 16 }}>
                <input value={logInput} onChange={e => setLogInput(e.target.value)}
                  placeholder="Quick note → Enter to log against active spirit"
                  style={{ width: '100%', boxSizing: 'border-box', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '10px 14px', color: TXT, fontFamily: crimson, fontSize: 14, outline: 'none' }} />
              </form>
            </div>
          )}

          {/* ── INTERCESSOR TAB ───────────────────────────────────────────── */}
          {session.activeRole === 'intercessor' && (
            <div className="scc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${BDR}`, borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', marginBottom: 6 }}>TRANSFER SHIELD</div>
                <div style={{ fontFamily: crimson, fontSize: 13, color: TXT, lineHeight: 1.6 }}>Pray continuously: protection against transfer of ALL spirits from the subject to team members. Cover every team member by name. Command no spirit to jump.</div>
              </div>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', marginBottom: 8 }}>LIVE PRAYER POINTS</div>
              {session.logEntries.filter(e => e.type === 'manifestation' || e.type === 'resistance').slice(-5).map(entry => (
                <div key={entry.id} style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 12px', marginBottom: 6 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: DIM, marginBottom: 3 }}>{fmtTime(entry.timestamp)}</div>
                  <div style={{ fontFamily: crimson, fontSize: 13, color: TXT }}>Pray against: {entry.content}</div>
                </div>
              ))}
              {session.activeSpirit && (
                <div style={{ background: 'rgba(201,168,76,0.08)', border: `1px solid ${BDR}`, borderRadius: 8, padding: '12px 14px', marginTop: 12 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em', marginBottom: 6 }}>WARFARE PRAYERS — {session.activeSpirit.name}</div>
                  {session.activeSpirit.scriptures.slice(0, 3).map((s, i) => (
                    <div key={i} style={{ fontFamily: crimson, fontSize: 13, color: TXT, marginBottom: 4 }}>📖 {s}</div>
                  ))}
                  {session.activeSpirit.scriptures.length === 0 && (
                    <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, fontStyle: 'italic' }}>Colossians 2:15 · Ephesians 6:12 · Luke 10:19</div>
                  )}
                </div>
              )}
              <form onSubmit={submitLog} style={{ marginTop: 12 }}>
                <input value={logInput} onChange={e => setLogInput(e.target.value)} placeholder="Log prayer observation..."
                  style={{ width: '100%', boxSizing: 'border-box', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 12px', color: TXT, fontFamily: crimson, fontSize: 14, outline: 'none' }} />
              </form>
            </div>
          )}

          {/* ── ENCOURAGER TAB ────────────────────────────────────────────── */}
          {session.activeRole === 'encourager' && (
            <div className="scc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', marginBottom: 8 }}>SUBJECT EMOTIONAL STATE</div>
              <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 16 }}>
                {['CALM','ANXIOUS','OVERWHELMED','DISSOCIATING','BREAKTHROUGH','NEEDS BREAK'].map(state => {
                  const colors: Record<string,string> = { CALM:'#4ade80',ANXIOUS:G,OVERWHELMED:'#fb923c',DISSOCIATING:'#f87171',BREAKTHROUGH:'#34d399','NEEDS BREAK':'#f87171' }
                  return (
                    <button key={state} onClick={() => addLog('note', `Subject state: ${state}`)}
                      style={{ padding: '8px 12px', borderRadius: 5, border: `1px solid ${colors[state]}44`, background: `${colors[state]}11`, color: colors[state], fontFamily: cinzel, fontSize: 9, cursor: 'pointer', letterSpacing: '0.08em' }}>
                      {state}
                    </button>
                  )
                })}
              </div>
              {caseFile?.notes && (
                <div style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em', marginBottom: 6 }}>SUBJECT BACKGROUND (READ ONLY)</div>
                  <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, lineHeight: 1.6 }}>{caseFile.notes}</div>
                </div>
              )}
              <form onSubmit={submitLog}>
                <input value={logInput} onChange={e => setLogInput(e.target.value)} placeholder="Comfort note..."
                  style={{ width: '100%', boxSizing: 'border-box', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 12px', color: TXT, fontFamily: crimson, fontSize: 14, outline: 'none' }} />
              </form>
            </div>
          )}

          {/* ── SEER TAB ──────────────────────────────────────────────────── */}
          {session.activeRole === 'seer' && (
            <div className="scc-scroll" style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', marginBottom: 10 }}>PASS TO LEADER</div>
              <textarea value={seerInput} onChange={e => setSeerInput(e.target.value)} rows={5}
                placeholder="Enter spiritual impression or seer observation to send to the leader..."
                style={{ width: '100%', boxSizing: 'border-box', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '10px 14px', color: TXT, fontFamily: crimson, fontSize: 15, outline: 'none', resize: 'vertical' as const, marginBottom: 8 }} />
              <button onClick={submitSeerNote} disabled={!seerInput.trim()}
                style={{ width: '100%', padding: '10px', background: seerInput.trim() ? 'rgba(52,211,153,0.15)' : 'transparent', border: `1px solid ${seerInput.trim() ? 'rgba(52,211,153,0.5)' : BDR}`, borderRadius: 6, color: seerInput.trim() ? '#34d399' : DIM, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', cursor: seerInput.trim() ? 'pointer' : 'default' }}>
                🌊 SEND TO TEAM
              </button>
              <div style={{ marginTop: 20 }}>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.12em', marginBottom: 8 }}>YOUR SEER LOG</div>
                {session.logEntries.filter(e => e.type === 'seer_note').slice().reverse().map(e => (
                  <div key={e.id} style={{ padding: '8px 0', borderBottom: `1px solid ${BDR}`, fontFamily: crimson, fontSize: 13, color: '#34d399' }}>
                    <span style={{ color: DIM, fontSize: 10 }}>{fmtTime(e.timestamp)} </span>{e.content}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            RIGHT PANEL — 215px
            ═══════════════════════════════════════════════════════════════════ */}
        <div style={{ width: 215, flexShrink: 0, ...panelStyle, borderLeft: `1px solid #1e1a0e` }}>
          <div className="scc-scroll" style={{ flex: 1, overflowY: 'auto' }}>

            {/* Active Spirit Dossier */}
            {sectionLabel('Active Spirit')}
            {session.activeSpirit ? (
              <div style={{ padding: '0 8px 10px' }}>
                <div style={{ fontFamily: cinzel, fontSize: 16, color: G, letterSpacing: '0.06em', marginBottom: 2 }}>{session.activeSpirit.name}</div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.1em', marginBottom: 8 }}>{session.activeSpirit.rank}</div>
                {session.activeSpirit.label && (
                  <div style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, background: 'rgba(201,168,76,0.1)', border: `1px solid ${BDR}`, fontFamily: cinzel, fontSize: 8, color: G, letterSpacing: '0.1em', marginBottom: 8 }}>{session.activeSpirit.label}</div>
                )}

                {/* Command Scriptures */}
                {activeDemonData?.scriptures && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 7, color: DIM, letterSpacing: '0.12em', marginBottom: 4 }}>COMMAND SCRIPTURES</div>
                    {String(activeDemonData.scriptures).split(',').slice(0, 3).map((s: string, i: number) => (
                      <div key={i} style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 4, padding: '5px 7px', marginBottom: 3, fontFamily: crimson, fontSize: 11, color: TXT }}>{s.trim()}</div>
                    ))}
                  </div>
                )}

                {/* Expulsion Prayer */}
                <button onClick={generatePrayer} disabled={prayerLoading}
                  style={{ width: '100%', padding: '7px', background: `${G}22`, border: `1px solid ${BDR}`, borderRadius: 5, color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', marginBottom: 4 }}>
                  {prayerLoading ? '...' : '⚔ GENERATE EXPULSION PRAYER'}
                </button>
                {activePrayer && (
                  <div style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px', marginBottom: 6 }}>
                    <div style={{ fontFamily: crimson, fontSize: 11, color: TXT, lineHeight: 1.5, whiteSpace: 'pre-wrap' as const }}>{activePrayer}</div>
                    <button onClick={() => { try { navigator.clipboard.writeText(activePrayer) } catch {} }}
                      style={{ marginTop: 5, padding: '3px 8px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 3, color: DIM, fontFamily: cinzel, fontSize: 8, cursor: 'pointer' }}>COPY</button>
                  </div>
                )}

                <button onClick={() => {
                  localStorage.setItem('wri_prefill_spirit', session.activeSpirit!.name)
                }}
                  style={{ width: '100%', padding: '5px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 5, color: DIM, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', cursor: 'pointer', marginBottom: 6 }}>
                  VIEW FULL DOSSIER
                </button>

                {/* Entry Points */}
                {session.activeSpirit.entryPoints && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 7, color: DIM, letterSpacing: '0.12em', marginBottom: 3 }}>ENTRY POINTS</div>
                    <div style={{ fontFamily: crimson, fontSize: 11, color: TXT, lineHeight: 1.4 }}>{session.activeSpirit.entryPoints}</div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ padding: '12px 10px', fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic' }}>Tap a spirit in the sequence to pull its dossier</div>
            )}

            {/* Companion Spirits */}
            {(session.activeSpirit?.companions?.length ?? 0) > 0 && (
              <>
                {sectionLabel('Companions')}
                <div style={{ padding: '0 8px 8px', display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
                  {(session.activeSpirit?.companions ?? []).map(comp => {
                    const inSequence = session.spiritSequence.some(s => s.name.toLowerCase() === comp.toLowerCase())
                    return (
                      <button key={comp} onClick={() => { if (!inSequence) addSpiritToSequence(comp) }}
                        style={{ padding: '3px 7px', borderRadius: 10, border: `1px solid ${inSequence ? '#4ade8044' : BDR}`, background: inSequence ? '#4ade8011' : 'transparent', color: inSequence ? '#4ade80' : TXT, fontFamily: cinzel, fontSize: 8, cursor: inSequence ? 'default' : 'pointer' }}>
                        {inSequence ? '⚔ ' : '+ '}{comp}
                      </button>
                    )
                  })}
                </div>
              </>
            )}

            {/* Renunciation Checklist */}
            {sectionLabel('Renunciations')}
            <div style={{ padding: '0 8px 6px' }}>
              <input value={renuncFilter} onChange={e => setRenuncFilter(e.target.value)} placeholder="Filter..."
                style={{ width: '100%', boxSizing: 'border-box', background: SURF2, border: `1px solid ${BDR}`, borderRadius: 4, padding: '4px 7px', color: TXT, fontFamily: cinzel, fontSize: 9, outline: 'none', marginBottom: 6 }} />
              {session.renunciations
                .filter(r => !renuncFilter || r.category.toLowerCase().includes(renuncFilter.toLowerCase()))
                .map(r => (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, padding: '3px 0', borderBottom: '1px solid rgba(201,168,76,0.04)' }}>
                    <button onClick={() => {
                      setSession(s => ({
                        ...s,
                        renunciations: s.renunciations.map(x => x.id === r.id ? { ...x, completed: !x.completed } : x),
                      }))
                      if (!r.completed) addLog('renunciation', `RENUNCIATION: ${r.category}`)
                    }}
                      style={{ width: 12, height: 12, borderRadius: 2, border: `1px solid ${r.completed ? '#86efac' : BDR}`, background: r.completed ? '#86efac22' : 'transparent', color: '#86efac', fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      {r.completed ? '✓' : ''}
                    </button>
                    <span style={{ fontFamily: crimson, fontSize: 11, color: r.completed ? DIM : TXT, textDecoration: r.completed ? 'line-through' : 'none', lineHeight: 1.3 }}>{r.category}</span>
                  </div>
                ))
              }
            </div>

            {/* Worksheets */}
            {sectionLabel('Worksheets')}
            <div style={{ padding: '0 8px 8px' }}>
              {Object.entries({ forgiveness: 'Forgiveness', soul_ties: 'Soul Ties', stronghold_buster: 'Stronghold Buster', iniquity: 'Iniquity in Bloodline', aftercare: 'Aftercare Declarations' }).map(([k, label]) => (
                <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', borderBottom: '1px solid rgba(201,168,76,0.04)' }}>
                  <button onClick={() => setSession(s => ({ ...s, worksheets: { ...s.worksheets, [k]: !s.worksheets[k] } }))}
                    style={{ width: 12, height: 12, borderRadius: 2, border: `1px solid ${session.worksheets[k] ? '#86efac' : BDR}`, background: session.worksheets[k] ? '#86efac22' : 'transparent', color: '#86efac', fontSize: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {session.worksheets[k] ? '✓' : ''}
                  </button>
                  <span style={{ fontFamily: crimson, fontSize: 11, color: session.worksheets[k] ? DIM : TXT }}>{label}</span>
                </div>
              ))}
            </div>

            {/* AI Intel */}
            {sectionLabel('AI Intel')}
            <div style={{ padding: '0 8px 12px' }}>
              <button onClick={fetchAiSuggestion} disabled={aiLoading}
                style={{ width: '100%', padding: '5px', background: aiLoading ? 'transparent' : 'rgba(201,168,76,0.06)', border: `1px solid ${BDR}`, borderRadius: 4, color: aiLoading ? DIM : G, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', cursor: aiLoading ? 'default' : 'pointer', marginBottom: 6 }}>
                {aiLoading ? 'ANALYZING...' : '⚡ GET AI SUGGESTION'}
              </button>
              {session.aiSuggestions.slice(0, 3).map(sug => (
                <div key={sug.id} style={{ background: SURF2, border: `1px solid ${BDR}`, borderRadius: 5, padding: '7px 8px', marginBottom: 6 }}>
                  <div style={{ fontFamily: crimson, fontSize: 11, color: TXT, lineHeight: 1.4, marginBottom: 3 }}>{sug.text}</div>
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: DIM }}>{sug.source}</div>
                </div>
              ))}
              {session.logEntries.filter(e => e.type === 'seer_note').slice(-2).map(e => (
                <div key={e.id} style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)', borderRadius: 5, padding: '7px 8px', marginBottom: 6 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 7, color: '#34d399', letterSpacing: '0.1em', marginBottom: 3 }}>🌊 SEER</div>
                  <div style={{ fontFamily: crimson, fontSize: 11, color: '#34d399' }}>{e.content.replace('SEER: ', '')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── END SESSION MODAL ─────────────────────────────────────────────── */}
      {showEndModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#13111e', border: `1px solid ${BDR}`, borderRadius: 12, width: '100%', maxWidth: 480, padding: 28 }}>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.1em', marginBottom: 16 }}>END THIS SESSION?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[['Spirits Addressed', addressed],['Expelled', expelled],['Still Active', stillActive]].map(([label, val]) => (
                <div key={label as string} style={{ textAlign: 'center' as const, background: SURF2, borderRadius: 6, padding: '10px' }}>
                  <div style={{ fontFamily: cinzel, fontSize: 24, color: G }}>{val}</div>
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.08em' }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, marginBottom: 20 }}>Duration: {formatElapsed(elapsed)}</div>

            {report ? (
              <div style={{ background: '#0a0812', border: `1px solid ${BDR}`, borderRadius: 8, padding: '12px', maxHeight: 200, overflowY: 'auto', marginBottom: 16 }}>
                <div style={{ fontFamily: crimson, fontSize: 12, color: TXT, whiteSpace: 'pre-wrap' as const, lineHeight: 1.6 }}>{report}</div>
              </div>
            ) : null}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={generateReport} disabled={reportLoading}
                style={{ flex: 1, padding: '10px', background: `${G}22`, border: `1px solid ${BDR}`, borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
                {reportLoading ? 'GENERATING...' : '📄 GENERATE REPORT'}
              </button>
              <button onClick={() => setShowEndModal(false)}
                style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 6, color: DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
                CONTINUE SESSION
              </button>
              <button onClick={endSession}
                style={{ flex: 1, padding: '10px', background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 6, color: '#f87171', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
                END
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionCommandCenter
