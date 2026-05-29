import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useEffect } from 'react'

const MobileSubpageNav = () => (
  <>
    <style>{`@media(max-width:640px){.wri-subnav{display:flex!important}}`}</style>
    <nav className="wri-subnav" style={{ display:'none', position:'fixed', bottom:0, left:0, right:0, height:66, background:'#0d0b14', borderTop:'1px solid rgba(201,168,76,0.25)', zIndex:200, alignItems:'center', justifyContent:'space-around', padding:'0 4px' }}>
      <a href="/community" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color:'rgba(201,168,76,0.55)', textDecoration:'none', fontSize:9, fontFamily:"'Cinzel',serif", letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        HOME
      </a>
      <a href="/community#database" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color:'rgba(201,168,76,0.55)', textDecoration:'none', fontSize:9, fontFamily:"'Cinzel',serif", letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        INTEL
      </a>
      <div style={{ width:44, height:44, borderRadius:'50%', background:'#C9A84C', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <a href="/community" style={{ color:'#0d0b14', fontSize:18, lineHeight:1, textDecoration:'none', fontFamily:"'Cinzel',serif" }}>⚔</a>
      </div>
      <a href="/community#forum" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color:'rgba(201,168,76,0.55)', textDecoration:'none', fontSize:9, fontFamily:"'Cinzel',serif", letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="2" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        OPS
      </a>
      <a href="/community" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, color:'rgba(201,168,76,0.55)', textDecoration:'none', fontSize:9, fontFamily:"'Cinzel',serif", letterSpacing:'0.06em', minWidth:56, padding:'8px 0' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        AI
      </a>
    </nav>
  </>
)

export const Route = createFileRoute('/community_/field-ops')({
  ssr: false,
  component: () => <><FieldOpsPage /><MobileSubpageNav /></>,
})

const G       = '#C9A84C'
const BG      = '#0D0B14'
const SURF    = '#12101e'
const SURF2   = '#1a1726'
const BDR     = 'rgba(201,168,76,0.22)'
const TXT     = '#e8dcc8'
const DIM     = '#a09080'
const MUT     = '#6b5e45'
const cinzel  = "'Cinzel', serif"
const mono    = "'JetBrains Mono', monospace"
const crimson = "'Crimson Pro', serif"

const TIER_LEVELS: Record<string, number> = { watchman: 0, free: 0, soldier: 1, commander: 2, general: 3, minister: 99 }

type View = 'list' | 'detail' | 'new-case' | 'new-session' | 'edit-session'

interface CaseFile {
  id: string
  subject_name: string
  subject_alias: string | null
  gender: string | null
  age_range: string | null
  status: 'active' | 'completed' | 'archived'
  primary_issue: string | null
  tags: string[]
  spirits_flagged: string[]
  notes: string | null
  session_count: number
  last_session_at: string | null
  created_at: string
  updated_at: string
}

interface SessionNote {
  id: string
  case_file_id: string
  session_date: string
  duration_minutes: number | null
  outcome: 'breakthrough' | 'partial' | 'resistance' | 'incomplete'
  spirits_encountered: string[]
  breakthroughs: string | null
  resistances: string | null
  assignments_given: string | null
  scriptures_used: string[]
  follow_up_needed: boolean
  private_notes: string | null
  created_at: string
  updated_at: string
}

const STATUS_COLOR: Record<string, string> = {
  active:    '#6dbe7e',
  completed: '#7fa8c7',
  archived:  MUT,
}

const OUTCOME_COLOR: Record<string, string> = {
  breakthrough: '#6dbe7e',
  partial:      '#e8b658',
  resistance:   '#e07070',
  incomplete:   MUT,
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function TagList({ tags, color = G }: { tags: string[]; color?: string }) {
  if (!tags.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4 }}>
      {tags.map((t, i) => (
        <span key={i} style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 2, padding: '2px 7px', fontFamily: mono, fontSize: 9, color: color, letterSpacing: '0.08em' }}>
          {t}
        </span>
      ))}
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box' as const, background: SURF2,
  border: `1px solid ${BDR}`, borderRadius: 4, padding: '9px 12px',
  color: TXT, fontFamily: crimson, fontSize: 14, outline: 'none',
}

const labelSt: React.CSSProperties = {
  display: 'block', fontFamily: mono, fontSize: 10, color: MUT,
  letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 6,
}

const sel: React.CSSProperties = {
  ...inp as object, cursor: 'pointer',
} as React.CSSProperties

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <label style={labelSt}>{label}</label>
      {children}
    </div>
  )
}

function FieldOpsPage() {
  const { getToken }       = useAuth()
  const { user, isLoaded } = useUser()

  const [view, setView]                   = useState<View>('list')
  const [cases, setCases]                 = useState<CaseFile[]>([])
  const [selectedCase, setSelectedCase]   = useState<CaseFile | null>(null)
  const [sessions, setSessions]           = useState<SessionNote[]>([])
  const [selectedSession, setSelectedSession] = useState<SessionNote | null>(null)
  const [loadingCases, setLoadingCases]   = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [submitting, setSubmitting]       = useState(false)
  const [pageError, setPageError]         = useState<string | null>(null)
  const [formError, setFormError]         = useState<string | null>(null)

  // Case form
  const [caseForm, setCaseForm] = useState({
    subject_name: '', subject_alias: '', gender: '', age_range: '',
    status: 'active', primary_issue: '', tags: '', spirits_flagged: '', notes: '',
  })

  // Session form
  const [sessionForm, setSessionForm] = useState({
    session_date: new Date().toISOString().split('T')[0],
    duration_minutes: '', outcome: 'incomplete' as SessionNote['outcome'],
    spirits_encountered: '', breakthroughs: '', resistances: '',
    assignments_given: '', scriptures_used: '', follow_up_needed: false, private_notes: '',
  })

  const tier    = ((user?.publicMetadata?.tier as string) || '').toLowerCase()
  const role    = (user?.publicMetadata?.role as string) || ''
  const tierLvl = TIER_LEVELS[tier] ?? 0
  const isCommanderPlus = tierLvl >= 2 || role === 'minister'

  async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = await getToken()
    return fetch(`/api/field-ops${path}`, {
      ...opts,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(opts.headers || {}) },
    })
  }

  async function loadCases() {
    setLoadingCases(true)
    setPageError(null)
    try {
      const res = await apiFetch('?resource=cases')
      const d = await res.json()
      if (!res.ok) { setPageError(d.error || 'Failed to load cases'); return }
      setCases(d.cases || [])
    } catch { setPageError('Network error') }
    setLoadingCases(false)
  }

  async function loadSessions(caseId: string) {
    setLoadingSessions(true)
    try {
      const res = await apiFetch(`?resource=sessions&caseId=${caseId}`)
      const d = await res.json()
      setSessions(res.ok ? (d.sessions || []) : [])
    } catch {}
    setLoadingSessions(false)
  }

  useEffect(() => {
    if (isLoaded && isCommanderPlus) loadCases()
  }, [isLoaded])

  function openCase(c: CaseFile) {
    setSelectedCase(c)
    setSessions([])
    setView('detail')
    loadSessions(c.id)
  }

  function startNewSession() {
    setSessionForm({
      session_date: new Date().toISOString().split('T')[0],
      duration_minutes: '', outcome: 'incomplete',
      spirits_encountered: '', breakthroughs: '', resistances: '',
      assignments_given: '', scriptures_used: '', follow_up_needed: false, private_notes: '',
    })
    setFormError(null)
    setView('new-session')
  }

  function startEditSession(s: SessionNote) {
    setSelectedSession(s)
    setSessionForm({
      session_date:        s.session_date,
      duration_minutes:    s.duration_minutes != null ? String(s.duration_minutes) : '',
      outcome:             s.outcome,
      spirits_encountered: s.spirits_encountered.join(', '),
      breakthroughs:       s.breakthroughs || '',
      resistances:         s.resistances || '',
      assignments_given:   s.assignments_given || '',
      scriptures_used:     s.scriptures_used.join(', '),
      follow_up_needed:    s.follow_up_needed,
      private_notes:       s.private_notes || '',
    })
    setFormError(null)
    setView('edit-session')
  }

  async function submitCase() {
    if (!caseForm.subject_name.trim()) { setFormError('Subject name is required'); return }
    setSubmitting(true)
    setFormError(null)
    try {
      const body = {
        subject_name:    caseForm.subject_name.trim(),
        subject_alias:   caseForm.subject_alias.trim() || null,
        gender:          caseForm.gender || null,
        age_range:       caseForm.age_range || null,
        status:          caseForm.status,
        primary_issue:   caseForm.primary_issue.trim() || null,
        tags:            caseForm.tags.split(',').map(t => t.trim()).filter(Boolean),
        spirits_flagged: caseForm.spirits_flagged.split(',').map(t => t.trim()).filter(Boolean),
        notes:   caseForm.notes.trim() || null,
      }
      const res = await apiFetch('?resource=cases', { method: 'POST', body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) { setFormError(d.error || 'Failed to create case'); return }
      setCases(prev => [d.case, ...prev])
      openCase(d.case)
    } catch { setFormError('Network error') }
    setSubmitting(false)
  }

  async function submitSession() {
    if (!selectedCase) return
    setSubmitting(true)
    setFormError(null)
    try {
      const body = {
        case_file_id:        selectedCase.id,
        session_date:        sessionForm.session_date,
        duration_minutes:    sessionForm.duration_minutes ? Number(sessionForm.duration_minutes) : null,
        outcome:             sessionForm.outcome,
        spirits_encountered: sessionForm.spirits_encountered.split(',').map(t => t.trim()).filter(Boolean),
        breakthroughs:       sessionForm.breakthroughs.trim() || null,
        resistances:         sessionForm.resistances.trim() || null,
        assignments_given:   sessionForm.assignments_given.trim() || null,
        scriptures_used:     sessionForm.scriptures_used.split(',').map(t => t.trim()).filter(Boolean),
        follow_up_needed:    sessionForm.follow_up_needed,
        private_notes:       sessionForm.private_notes.trim() || null,
      }
      const res = await apiFetch('?resource=sessions', { method: 'POST', body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) { setFormError(d.error || 'Failed to save session'); return }
      // Refresh case and sessions
      await loadCases()
      await loadSessions(selectedCase.id)
      setView('detail')
    } catch { setFormError('Network error') }
    setSubmitting(false)
  }

  async function updateSession() {
    if (!selectedSession) return
    setSubmitting(true)
    setFormError(null)
    try {
      const body = {
        session_date:        sessionForm.session_date,
        duration_minutes:    sessionForm.duration_minutes ? Number(sessionForm.duration_minutes) : null,
        outcome:             sessionForm.outcome,
        spirits_encountered: sessionForm.spirits_encountered.split(',').map(t => t.trim()).filter(Boolean),
        breakthroughs:       sessionForm.breakthroughs.trim() || null,
        resistances:         sessionForm.resistances.trim() || null,
        assignments_given:   sessionForm.assignments_given.trim() || null,
        scriptures_used:     sessionForm.scriptures_used.split(',').map(t => t.trim()).filter(Boolean),
        follow_up_needed:    sessionForm.follow_up_needed,
        private_notes:       sessionForm.private_notes.trim() || null,
      }
      const res = await apiFetch(`?resource=sessions&id=${selectedSession.id}`, { method: 'PATCH', body: JSON.stringify(body) })
      const d = await res.json()
      if (!res.ok) { setFormError(d.error || 'Failed to update session'); return }
      if (selectedCase) await loadSessions(selectedCase.id)
      setView('detail')
    } catch { setFormError('Network error') }
    setSubmitting(false)
  }

  async function deleteSession(s: SessionNote) {
    if (!confirm(`Delete session from ${fmtDate(s.session_date)}?`)) return
    try {
      const res = await apiFetch(`?resource=sessions&id=${s.id}`, { method: 'DELETE' })
      if (res.ok && selectedCase) {
        await loadSessions(selectedCase.id)
        await loadCases()
      }
    } catch {}
  }

  async function deleteCase(c: CaseFile) {
    if (!confirm(`Delete case file for "${c.subject_name}"? This will also delete all session notes.`)) return
    try {
      const res = await apiFetch(`?resource=cases&id=${c.id}`, { method: 'DELETE' })
      if (res.ok) {
        setCases(prev => prev.filter(x => x.id !== c.id))
        setView('list')
      }
    } catch {}
  }

  // ── BREADCRUMB ──────────────────────────────────────────────────────────────
  const Breadcrumb = () => (
    <div style={{ borderBottom: `1px solid ${BDR}`, padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
      <a href="/community" style={{ color: MUT, fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', textDecoration: 'none' }}>← COMMUNITY</a>
      <span style={{ color: MUT, opacity: 0.4, fontSize: 12 }}>›</span>
      <button onClick={() => setView('list')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', color: view === 'list' ? G : MUT, padding: 0 }}>
        FIELD OPS
      </button>
      {(view === 'detail' || view === 'new-session' || view === 'edit-session') && selectedCase && (
        <>
          <span style={{ color: MUT, opacity: 0.4, fontSize: 12 }}>›</span>
          <button onClick={() => setView('detail')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: mono, fontSize: 10, letterSpacing: '0.1em', color: view === 'detail' ? G : MUT, padding: 0 }}>
            {selectedCase.subject_alias || selectedCase.subject_name}
          </button>
        </>
      )}
      {view === 'new-case' && (
        <>
          <span style={{ color: MUT, opacity: 0.4, fontSize: 12 }}>›</span>
          <span style={{ fontFamily: mono, fontSize: 10, color: G, letterSpacing: '0.1em' }}>NEW CASE</span>
        </>
      )}
      {view === 'new-session' && (
        <>
          <span style={{ color: MUT, opacity: 0.4, fontSize: 12 }}>›</span>
          <span style={{ fontFamily: mono, fontSize: 10, color: G, letterSpacing: '0.1em' }}>NEW SESSION</span>
        </>
      )}
      {view === 'edit-session' && (
        <>
          <span style={{ color: MUT, opacity: 0.4, fontSize: 12 }}>›</span>
          <span style={{ fontFamily: mono, fontSize: 10, color: G, letterSpacing: '0.1em' }}>EDIT SESSION</span>
        </>
      )}
    </div>
  )

  // ── FORM ERROR ──────────────────────────────────────────────────────────────
  const FormError = () => formError ? (
    <div style={{ background: 'rgba(200,74,74,0.1)', border: '1px solid rgba(200,74,74,0.3)', borderRadius: 4, padding: '10px 14px', marginBottom: 16, color: '#e07070', fontFamily: mono, fontSize: 11 }}>
      {formError}
    </div>
  ) : null

  // ── LOADING + GATE ──────────────────────────────────────────────────────────
  if (!isLoaded) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: cinzel, color: MUT, fontSize: 11, letterSpacing: '0.18em' }}>LOADING…</div>
    </div>
  )

  if (!isCommanderPlus) return (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' as const }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, color: MUT, letterSpacing: '0.18em', marginBottom: 16 }}>RESTRICTED ACCESS</div>
        <h1 style={{ fontFamily: cinzel, fontSize: 24, color: G, fontWeight: 700, margin: '0 0 12px' }}>Field Operations</h1>
        <p style={{ fontFamily: crimson, fontSize: 16, color: DIM, lineHeight: 1.6, margin: '0 0 24px' }}>
          Case Files and Session Notes are available to Commander tier and above.
        </p>
        <a href="/community" style={{ display: 'inline-block', background: G, color: '#1a1305', padding: '9px 20px', fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', textDecoration: 'none', borderRadius: 2 }}>
          ← Return to Community
        </a>
      </div>
    </div>
  )

  // ── LIST VIEW ───────────────────────────────────────────────────────────────
  if (view === 'list') return (
    <div style={{ minHeight: '100vh', background: BG, color: TXT, display: 'flex', flexDirection: 'column' as const }}>
      <Breadcrumb />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 100px', width: '100%', boxSizing: 'border-box' as const }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <div style={{ fontFamily: mono, fontSize: 11, color: MUT, letterSpacing: '0.18em', marginBottom: 6 }}>PRIVATE · COMMANDER+</div>
            <h1 style={{ fontFamily: cinzel, fontSize: 26, color: G, fontWeight: 700, margin: 0 }}>Case Files</h1>
          </div>
          <button
            onClick={() => { setCaseForm({ subject_name: '', subject_alias: '', gender: '', age_range: '', status: 'active', primary_issue: '', tags: '', spirits_flagged: '', notes: '' }); setFormError(null); setView('new-case') }}
            style={{ background: G, color: '#1a1305', border: 'none', borderRadius: 2, padding: '9px 18px', fontFamily: cinzel, fontSize: 12, fontWeight: 700, letterSpacing: '0.1em', cursor: 'pointer' }}
          >
            + New Case
          </button>
        </div>

        {pageError && (
          <div style={{ background: 'rgba(200,74,74,0.1)', border: '1px solid rgba(200,74,74,0.3)', borderRadius: 4, padding: '12px 16px', marginBottom: 20, color: '#e07070', fontFamily: mono, fontSize: 11 }}>
            {pageError}
          </div>
        )}

        {loadingCases ? (
          <div style={{ textAlign: 'center' as const, padding: '60px 0', fontFamily: cinzel, color: MUT, fontSize: 11, letterSpacing: '0.18em' }}>
            LOADING CASES…
          </div>
        ) : cases.length === 0 ? (
          <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, padding: '48px 24px', textAlign: 'center' as const }}>
            <div style={{ fontFamily: cinzel, fontSize: 13, color: MUT, letterSpacing: '0.12em', marginBottom: 12 }}>NO CASES ON FILE</div>
            <p style={{ fontFamily: crimson, fontSize: 15, color: DIM, margin: '0 0 20px', lineHeight: 1.6 }}>
              Start tracking subjects by creating your first case file.
            </p>
            <button
              onClick={() => { setCaseForm({ subject_name: '', subject_alias: '', gender: '', age_range: '', status: 'active', primary_issue: '', tags: '', spirits_flagged: '', notes: '' }); setFormError(null); setView('new-case') }}
              style={{ background: G, color: '#1a1305', border: 'none', borderRadius: 2, padding: '9px 20px', fontFamily: cinzel, fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em' }}
            >
              + Open First Case
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {cases.map(c => (
              <div
                key={c.id}
                onClick={() => openCase(c)}
                style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(201,168,76,0.45)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = BDR)}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <span style={{ fontFamily: cinzel, fontSize: 15, color: TXT, fontWeight: 600 }}>{c.subject_name}</span>
                      {c.subject_alias && <span style={{ fontFamily: mono, fontSize: 10, color: MUT }}>({c.subject_alias})</span>}
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[c.status] || MUT, flexShrink: 0 }} />
                      <span style={{ fontFamily: mono, fontSize: 9, color: STATUS_COLOR[c.status] || MUT, letterSpacing: '0.1em' }}>{c.status.toUpperCase()}</span>
                    </div>
                    {c.primary_issue && (
                      <p style={{ fontFamily: crimson, fontSize: 14, color: DIM, margin: '0 0 8px', lineHeight: 1.5, maxWidth: 600 }}>
                        {c.primary_issue.slice(0, 140)}{c.primary_issue.length > 140 ? '…' : ''}
                      </p>
                    )}
                    <TagList tags={c.spirits_flagged} color="#e07070" />
                  </div>
                  <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                    <div style={{ fontFamily: mono, fontSize: 20, color: G, fontWeight: 700, lineHeight: 1 }}>{c.session_count}</div>
                    <div style={{ fontFamily: mono, fontSize: 9, color: MUT, letterSpacing: '0.1em' }}>SESSIONS</div>
                    {c.last_session_at && (
                      <div style={{ fontFamily: mono, fontSize: 9, color: MUT, marginTop: 4 }}>{fmtDate(c.last_session_at)}</div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  // ── DETAIL VIEW ─────────────────────────────────────────────────────────────
  if (view === 'detail' && selectedCase) {
    const c = selectedCase
    return (
      <div style={{ minHeight: '100vh', background: BG, color: TXT, display: 'flex', flexDirection: 'column' as const }}>
        <Breadcrumb />
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px 100px', width: '100%', boxSizing: 'border-box' as const }}>

          {/* Case header */}
          <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, padding: 24, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  <h1 style={{ fontFamily: cinzel, fontSize: 22, color: G, fontWeight: 700, margin: 0 }}>{c.subject_name}</h1>
                  {c.subject_alias && <span style={{ fontFamily: mono, fontSize: 11, color: MUT }}>({c.subject_alias})</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[c.status] || MUT }} />
                  <span style={{ fontFamily: mono, fontSize: 10, color: STATUS_COLOR[c.status] || MUT, letterSpacing: '0.1em' }}>{c.status.toUpperCase()}</span>
                  {c.gender && <span style={{ fontFamily: mono, fontSize: 10, color: MUT }}>· {c.gender}</span>}
                  {c.age_range && <span style={{ fontFamily: mono, fontSize: 10, color: MUT }}>· {c.age_range}</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={startNewSession}
                  style={{ background: G, color: '#1a1305', border: 'none', borderRadius: 2, padding: '8px 16px', fontFamily: cinzel, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.1em' }}
                >
                  + Session
                </button>
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem('wri-session-context', JSON.stringify({
                        caseFileId: c.id,
                        subjectName: c.subject_name,
                        subjectAlias: c.subject_alias,
                        spiritsFlagged: c.spirits_flagged,
                        primaryIssue: c.primary_issue,
                      }))
                    } catch {}
                    window.location.href = '/community?section=session-center'
                  }}
                  style={{ background: 'transparent', border: `1px solid rgba(201,168,76,0.4)`, borderRadius: 2, padding: '8px 14px', fontFamily: cinzel, fontSize: 11, fontWeight: 600, color: G, cursor: 'pointer', letterSpacing: '0.1em' }}
                >
                  Launch Session
                </button>
                <button
                  onClick={() => deleteCase(c)}
                  style={{ background: 'transparent', border: `1px solid rgba(200,74,74,0.3)`, borderRadius: 2, padding: '8px 14px', fontFamily: mono, fontSize: 10, color: '#e07070', cursor: 'pointer' }}
                >
                  Delete
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: c.spirits_flagged.length || c.tags.length ? 16 : 0 }}>
              <div style={{ fontFamily: mono, fontSize: 10, color: G, letterSpacing: '0.1em' }}>
                {c.session_count} SESSION{c.session_count !== 1 ? 'S' : ''}
                {c.last_session_at && <div style={{ color: MUT, marginTop: 2 }}>Last: {fmtDate(c.last_session_at)}</div>}
              </div>
              <div style={{ fontFamily: mono, fontSize: 10, color: MUT, letterSpacing: '0.08em' }}>
                OPENED {fmtDate(c.created_at)}
              </div>
            </div>

            {c.primary_issue && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: MUT, letterSpacing: '0.14em', marginBottom: 6 }}>PRIMARY ISSUE</div>
                <p style={{ fontFamily: crimson, fontSize: 15, color: TXT, margin: 0, lineHeight: 1.6 }}>{c.primary_issue}</p>
              </div>
            )}

            {c.spirits_flagged.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: MUT, letterSpacing: '0.14em', marginBottom: 6 }}>SPIRITS FLAGGED</div>
                <TagList tags={c.spirits_flagged} color="#e07070" />
              </div>
            )}

            {c.tags.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontFamily: mono, fontSize: 9, color: MUT, letterSpacing: '0.14em', marginBottom: 6 }}>TAGS</div>
                <TagList tags={c.tags} />
              </div>
            )}

            {c.notes && (
              <div>
                <div style={{ fontFamily: mono, fontSize: 9, color: MUT, letterSpacing: '0.14em', marginBottom: 6 }}>GENERAL NOTES</div>
                <p style={{ fontFamily: crimson, fontSize: 14, color: DIM, margin: 0, lineHeight: 1.6 }}>{c.notes}</p>
              </div>
            )}
          </div>

          {/* Sessions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontFamily: mono, fontSize: 11, color: MUT, letterSpacing: '0.15em' }}>SESSION NOTES</div>
            <button
              onClick={startNewSession}
              style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 2, padding: '6px 14px', fontFamily: cinzel, fontSize: 11, color: G, cursor: 'pointer', letterSpacing: '0.08em' }}
            >
              + Add Session
            </button>
          </div>

          {loadingSessions ? (
            <div style={{ textAlign: 'center' as const, padding: '32px 0', fontFamily: cinzel, color: MUT, fontSize: 11, letterSpacing: '0.14em' }}>LOADING…</div>
          ) : sessions.length === 0 ? (
            <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, padding: '32px 20px', textAlign: 'center' as const }}>
              <p style={{ fontFamily: crimson, fontSize: 15, color: DIM, margin: '0 0 16px', lineHeight: 1.6 }}>No sessions recorded yet.</p>
              <button onClick={startNewSession} style={{ background: G, color: '#1a1305', border: 'none', borderRadius: 2, padding: '8px 18px', fontFamily: cinzel, fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}>
                Record First Session
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
              {sessions.map(s => (
                <div key={s.id} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: s.breakthroughs || s.resistances || s.spirits_encountered.length ? 12 : 0 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontFamily: cinzel, fontSize: 14, color: TXT }}>{fmtDate(s.session_date)}</span>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: OUTCOME_COLOR[s.outcome] || MUT }} />
                        <span style={{ fontFamily: mono, fontSize: 9, color: OUTCOME_COLOR[s.outcome] || MUT, letterSpacing: '0.1em' }}>{s.outcome.toUpperCase()}</span>
                        {s.duration_minutes && <span style={{ fontFamily: mono, fontSize: 9, color: MUT }}>· {s.duration_minutes}m</span>}
                        {s.follow_up_needed && <span style={{ fontFamily: mono, fontSize: 9, color: '#e8b658', background: 'rgba(232,182,88,0.08)', border: '1px solid rgba(232,182,88,0.3)', padding: '1px 5px', borderRadius: 2 }}>FOLLOW-UP</span>}
                      </div>
                      {s.spirits_encountered.length > 0 && <TagList tags={s.spirits_encountered} color="#e07070" />}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={() => startEditSession(s)} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 2, padding: '4px 10px', fontFamily: mono, fontSize: 9, color: DIM, cursor: 'pointer', letterSpacing: '0.06em' }}>EDIT</button>
                      <button onClick={() => deleteSession(s)} style={{ background: 'transparent', border: '1px solid rgba(200,74,74,0.2)', borderRadius: 2, padding: '4px 10px', fontFamily: mono, fontSize: 9, color: '#e07070', cursor: 'pointer', letterSpacing: '0.06em' }}>DEL</button>
                    </div>
                  </div>
                  {s.breakthroughs && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontFamily: mono, fontSize: 8, color: '#6dbe7e', letterSpacing: '0.12em', marginBottom: 4 }}>BREAKTHROUGHS</div>
                      <p style={{ fontFamily: crimson, fontSize: 13, color: TXT, margin: 0, lineHeight: 1.5 }}>{s.breakthroughs}</p>
                    </div>
                  )}
                  {s.resistances && (
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontFamily: mono, fontSize: 8, color: '#e07070', letterSpacing: '0.12em', marginBottom: 4 }}>RESISTANCES</div>
                      <p style={{ fontFamily: crimson, fontSize: 13, color: TXT, margin: 0, lineHeight: 1.5 }}>{s.resistances}</p>
                    </div>
                  )}
                  {s.assignments_given && (
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 8, color: MUT, letterSpacing: '0.12em', marginBottom: 4 }}>ASSIGNMENTS</div>
                      <p style={{ fontFamily: crimson, fontSize: 13, color: DIM, margin: 0, lineHeight: 1.5 }}>{s.assignments_given}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── NEW CASE FORM ───────────────────────────────────────────────────────────
  if (view === 'new-case') return (
    <div style={{ minHeight: '100vh', background: BG, color: TXT, display: 'flex', flexDirection: 'column' as const }}>
      <Breadcrumb />
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 100px', width: '100%', boxSizing: 'border-box' as const }}>
        <h1 style={{ fontFamily: cinzel, fontSize: 22, color: G, fontWeight: 700, margin: '0 0 24px' }}>New Case File</h1>

        <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, padding: 24 }}>
          <FormError />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 0 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <FormField label="Subject Name *">
                <input value={caseForm.subject_name} onChange={e => setCaseForm(p => ({ ...p, subject_name: e.target.value }))} placeholder="Full name" style={inp} />
              </FormField>
            </div>
            <FormField label="Alias / Code Name">
              <input value={caseForm.subject_alias} onChange={e => setCaseForm(p => ({ ...p, subject_alias: e.target.value }))} placeholder="e.g. Jane D." style={inp} />
            </FormField>
            <FormField label="Status">
              <select value={caseForm.status} onChange={e => setCaseForm(p => ({ ...p, status: e.target.value }))} style={sel}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </FormField>
            <FormField label="Gender">
              <select value={caseForm.gender} onChange={e => setCaseForm(p => ({ ...p, gender: e.target.value }))} style={sel}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </FormField>
            <FormField label="Age Range">
              <select value={caseForm.age_range} onChange={e => setCaseForm(p => ({ ...p, age_range: e.target.value }))} style={sel}>
                <option value="">—</option>
                {['Child (0–12)', 'Teen (13–17)', 'Young Adult (18–25)', 'Adult (26–45)', 'Middle Age (46–60)', 'Senior (61+)'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </FormField>
          </div>

          <FormField label="Primary Issue">
            <textarea value={caseForm.primary_issue} onChange={e => setCaseForm(p => ({ ...p, primary_issue: e.target.value }))} rows={3} placeholder="Main presenting issue or reason for ministry..." style={{ ...inp, resize: 'vertical' as const }} />
          </FormField>

          <FormField label="Spirits Flagged (comma-separated)">
            <input value={caseForm.spirits_flagged} onChange={e => setCaseForm(p => ({ ...p, spirits_flagged: e.target.value }))} placeholder="e.g. Jezebel, Rejection, Fear" style={inp} />
          </FormField>

          <FormField label="Tags (comma-separated)">
            <input value={caseForm.tags} onChange={e => setCaseForm(p => ({ ...p, tags: e.target.value }))} placeholder="e.g. recurring, generational, urgent" style={inp} />
          </FormField>

          <FormField label="General Notes">
            <textarea value={caseForm.notes} onChange={e => setCaseForm(p => ({ ...p, notes: e.target.value }))} rows={4} placeholder="Background context, history, observations..." style={{ ...inp, resize: 'vertical' as const }} />
          </FormField>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={submitCase} disabled={submitting} style={{ background: G, color: '#1a1305', border: 'none', borderRadius: 2, padding: '10px 24px', fontFamily: cinzel, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, letterSpacing: '0.08em' }}>
              {submitting ? 'Saving…' : 'Open Case File'}
            </button>
            <button onClick={() => setView('list')} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 2, padding: '10px 18px', fontFamily: cinzel, fontSize: 11, color: DIM, cursor: 'pointer', letterSpacing: '0.08em' }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  // ── SESSION FORM (shared by new-session + edit-session) ────────────────────
  if (view === 'new-session' || view === 'edit-session') {
    const isEdit = view === 'edit-session'
    return (
      <div style={{ minHeight: '100vh', background: BG, color: TXT, display: 'flex', flexDirection: 'column' as const }}>
        <Breadcrumb />
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 100px', width: '100%', boxSizing: 'border-box' as const }}>
          <h1 style={{ fontFamily: cinzel, fontSize: 22, color: G, fontWeight: 700, margin: '0 0 4px' }}>
            {isEdit ? 'Edit Session' : 'Record Session'}
          </h1>
          {selectedCase && <div style={{ fontFamily: mono, fontSize: 10, color: MUT, letterSpacing: '0.1em', marginBottom: 24 }}>{selectedCase.subject_name}</div>}

          <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, padding: 24 }}>
            <FormError />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <FormField label="Session Date">
                <input type="date" value={sessionForm.session_date} onChange={e => setSessionForm(p => ({ ...p, session_date: e.target.value }))} style={{ ...inp, colorScheme: 'dark' }} />
              </FormField>
              <FormField label="Duration (minutes)">
                <input type="number" min={1} value={sessionForm.duration_minutes} onChange={e => setSessionForm(p => ({ ...p, duration_minutes: e.target.value }))} placeholder="60" style={inp} />
              </FormField>
              <div style={{ gridColumn: '1 / -1' }}>
                <FormField label="Outcome">
                  <select value={sessionForm.outcome} onChange={e => setSessionForm(p => ({ ...p, outcome: e.target.value as SessionNote['outcome'] }))} style={sel}>
                    <option value="breakthrough">Breakthrough</option>
                    <option value="partial">Partial Progress</option>
                    <option value="resistance">Resistance</option>
                    <option value="incomplete">Incomplete</option>
                  </select>
                </FormField>
              </div>
            </div>

            <FormField label="Spirits Encountered (comma-separated)">
              <input value={sessionForm.spirits_encountered} onChange={e => setSessionForm(p => ({ ...p, spirits_encountered: e.target.value }))} placeholder="e.g. Fear, Infirmity, Python" style={inp} />
            </FormField>

            <FormField label="Breakthroughs">
              <textarea value={sessionForm.breakthroughs} onChange={e => setSessionForm(p => ({ ...p, breakthroughs: e.target.value }))} rows={3} placeholder="Victories, deliverances, what manifested and left..." style={{ ...inp, resize: 'vertical' as const }} />
            </FormField>

            <FormField label="Resistances">
              <textarea value={sessionForm.resistances} onChange={e => setSessionForm(p => ({ ...p, resistances: e.target.value }))} rows={3} placeholder="What held, legal grounds still in place, blocks encountered..." style={{ ...inp, resize: 'vertical' as const }} />
            </FormField>

            <FormField label="Assignments Given">
              <textarea value={sessionForm.assignments_given} onChange={e => setSessionForm(p => ({ ...p, assignments_given: e.target.value }))} rows={2} placeholder="Homework, renunciations, confessions, lifestyle changes..." style={{ ...inp, resize: 'vertical' as const }} />
            </FormField>

            <FormField label="Scriptures Used (comma-separated)">
              <input value={sessionForm.scriptures_used} onChange={e => setSessionForm(p => ({ ...p, scriptures_used: e.target.value }))} placeholder="e.g. Luke 10:19, Matt 18:18" style={inp} />
            </FormField>

            <FormField label="Private Notes">
              <textarea value={sessionForm.private_notes} onChange={e => setSessionForm(p => ({ ...p, private_notes: e.target.value }))} rows={3} placeholder="Confidential observations, prophetic impressions, discernments..." style={{ ...inp, resize: 'vertical' as const }} />
            </FormField>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <input
                type="checkbox"
                id="follow-up"
                checked={sessionForm.follow_up_needed}
                onChange={e => setSessionForm(p => ({ ...p, follow_up_needed: e.target.checked }))}
                style={{ accentColor: G, width: 14, height: 14 }}
              />
              <label htmlFor="follow-up" style={{ fontFamily: mono, fontSize: 10, color: DIM, letterSpacing: '0.1em', cursor: 'pointer' }}>Follow-up required</label>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={isEdit ? updateSession : submitSession}
                disabled={submitting}
                style={{ background: G, color: '#1a1305', border: 'none', borderRadius: 2, padding: '10px 24px', fontFamily: cinzel, fontSize: 13, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, letterSpacing: '0.08em' }}
              >
                {submitting ? 'Saving…' : isEdit ? 'Update Session' : 'Save Session'}
              </button>
              <button onClick={() => setView('detail')} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 2, padding: '10px 18px', fontFamily: cinzel, fontSize: 11, color: DIM, cursor: 'pointer', letterSpacing: '0.08em' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}
