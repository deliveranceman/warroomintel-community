import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { useState, useEffect, useRef } from 'react'
import { CommunitySidebarShell } from '@/components/CommunitySidebarShell'

export const Route = createFileRoute('/community_/testing')({
  ssr: false,
  component: TestingPage,
})

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const G       = '#C9A84C'
const BG      = '#0D0B14'
const SURF    = '#12101e'
const SURF2   = '#1a1726'
const BDR     = 'rgba(201,168,76,0.22)'
const TXT     = '#e8dcc8'
const DIM     = '#a09080'
const MUT     = '#6b5e45'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface BugReport {
  id: string
  title: string
  description: string
  steps_to_reproduce: string | null
  expected_behavior: string | null
  actual_behavior: string | null
  severity: 'low' | 'medium' | 'high' | 'critical'
  category: string
  screenshot_url: string | null
  status: 'open' | 'in_progress' | 'resolved' | 'wont_fix'
  upvotes: number
  submitted_by_name: string | null
  submitted_by_tier: string | null
  resolved_note: string | null
  created_at: string
}

interface FeatureRequest {
  id: string
  title: string
  description: string
  expected_behavior: string | null
  status: 'open' | 'planned' | 'in_progress' | 'shipped' | 'declined'
  upvotes: number
  submitted_by_name: string | null
  submitted_by_tier: string | null
  admin_note: string | null
  created_at: string
}

interface DocumentReview {
  id: string
  document_id: string
  document_title: string
  document_tier: string
  document_url: string | null
  status: 'pending' | 'approved' | 'needs_review'
  review_issues: string[]
  review_notes: string | null
  reviewed_by_name: string | null
  reviewed_at: string | null
}

interface FeatureVerification {
  id: string
  feature_name: string
  feature_area: string
  status: 'untested' | 'works' | 'needs_change'
  verified_by_name: string | null
  verified_at: string | null
  notes: string | null
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return `${Math.floor(d / 30)}mo ago`
}

const SEV_COLORS: Record<string, string> = {
  low: '#6b7280', medium: '#b45309', high: '#c2410c', critical: '#dc2626',
}

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  open:        { bg: 'rgba(201,168,76,0.12)', color: G },
  in_progress: { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
  resolved:    { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80' },
  wont_fix:    { bg: 'rgba(100,100,100,0.12)',color: '#9ca3af' },
  planned:     { bg: 'rgba(147,51,234,0.12)', color: '#c084fc' },
  shipped:     { bg: 'rgba(34,197,94,0.12)',  color: '#4ade80' },
  declined:    { bg: 'rgba(100,100,100,0.12)',color: '#9ca3af' },
}

const TIER_COLORS: Record<string, string> = {
  free: '#6a6080', watchman: '#6a6080',
  soldier: '#5C7CBF', commander: '#7C5CBF', general: '#C9A84C', minister: '#C9A84C',
}

function TierBadge({ tier }: { tier: string }) {
  return (
    <span style={{
      fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em',
      color: TIER_COLORS[tier?.toLowerCase()] || '#6a6080',
      border: `1px solid ${TIER_COLORS[tier?.toLowerCase()] || '#6a6080'}44`,
      padding: '1px 6px', borderRadius: 10,
      textTransform: 'uppercase' as const,
    }}>
      {tier || 'watchman'}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_COLORS[status] || { bg: 'rgba(100,100,100,0.12)', color: '#9ca3af' }
  return (
    <span style={{
      fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em',
      background: s.bg, color: s.color,
      padding: '2px 7px', borderRadius: 10,
      textTransform: 'uppercase' as const,
    }}>
      {status.replace('_', ' ')}
    </span>
  )
}

const inp: React.CSSProperties = {
  width: '100%', background: BG, border: `1px solid ${BDR}`,
  borderRadius: 6, padding: '8px 12px', color: TXT,
  fontFamily: crimson, fontSize: 13, outline: 'none',
  boxSizing: 'border-box' as const,
}
const lbl: React.CSSProperties = {
  fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em',
  color: MUT, display: 'block', marginBottom: 5,
}
const ta: React.CSSProperties = { ...inp, resize: 'vertical' as const, minHeight: 72 }
const sel: React.CSSProperties = { ...inp, cursor: 'pointer' }

// ─── UPVOTE BUTTON ────────────────────────────────────────────────────────────
function UpvoteBtn({
  count, upvoted, loading, onClick,
}: { count: number; upvoted: boolean; loading: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        background: upvoted ? `${G}22` : 'transparent',
        border: `1px solid ${upvoted ? G : BDR}`,
        borderRadius: 6, padding: '4px 10px',
        color: upvoted ? G : DIM,
        fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em',
        cursor: loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.15s',
      }}
    >
      ▲ {count}
    </button>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
function TestingPage() {
  const { getToken } = useAuth()
  const { user, isLoaded } = useUser()

  const tier      = ((user?.publicMetadata?.tier as string) || '').toLowerCase()
  const isMinister = (user?.publicMetadata?.role as string) === 'minister'

  const [activeTab, setActiveTab] = useState<'bugs' | 'features' | 'docs' | 'verify'>('bugs')
  const [testingMsg, setTestingMsg] = useState('')

  async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = await getToken()
    return fetch(path, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...((opts.headers as Record<string, string>) || {}),
      },
    })
  }

  useEffect(() => {
    fetch('/api/testing-settings')
      .then(r => r.json())
      .then(d => setTestingMsg(d.testing_message || ''))
      .catch(() => {})
  }, [])

  if (!isLoaded) return null

  return (
    <CommunitySidebarShell activeItem="War Room Testing" fillViewport={false}>
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 12 }}>
            <div>
              <h1 style={{ fontFamily: cinzel, fontSize: 22, color: G, letterSpacing: '0.06em', margin: '0 0 6px' }}>
                War Room Testing
              </h1>
              <p style={{ fontFamily: crimson, fontSize: 14, color: DIM, margin: 0 }}>
                Your feedback builds this platform. Report bugs, request features, review documents.
              </p>
            </div>
            <TierBadge tier={tier || 'watchman'} />
          </div>

          {testingMsg && (
            <div style={{
              marginTop: 16, padding: '10px 16px',
              background: 'rgba(201,168,76,0.08)',
              border: `1px solid ${BDR}`,
              borderLeft: `3px solid ${G}`,
              borderRadius: 6,
              fontFamily: crimson, fontSize: 13, color: TXT,
            }}>
              {testingMsg}
            </div>
          )}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 0, borderBottom: `1px solid ${BDR}`, marginBottom: 24, overflowX: 'auto' as const }}>
          {([
            { key: 'bugs',     label: 'Bug Reports' },
            { key: 'features', label: 'Feature Requests' },
            { key: 'docs',     label: 'Document Review' },
            { key: 'verify',   label: 'Feature Verification' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em',
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === t.key ? G : 'transparent'}`,
                color: activeTab === t.key ? G : DIM,
                cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap' as const,
                transition: 'color 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        {activeTab === 'bugs'     && <BugReportsTab     apiFetch={apiFetch} user={user} isMinister={isMinister} />}
        {activeTab === 'features' && <FeatureRequestsTab apiFetch={apiFetch} user={user} isMinister={isMinister} />}
        {activeTab === 'docs'     && <DocumentReviewTab  apiFetch={apiFetch} user={user} />}
        {activeTab === 'verify'   && <FeatureVerifyTab   apiFetch={apiFetch} user={user} />}
      </div>
    </CommunitySidebarShell>
  )
}

// ─── TAB 1: BUG REPORTS ───────────────────────────────────────────────────────
function BugReportsTab({ apiFetch, user, isMinister }: { apiFetch: Function; user: any; isMinister: boolean }) {
  const [bugs, setBugs]               = useState<BugReport[]>([])
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [sort, setSort]               = useState<'newest' | 'upvotes' | 'critical' | 'open'>('newest')
  const [upvoting, setUpvoting]       = useState<string | null>(null)
  const [myUpvotes, setMyUpvotes]     = useState<Set<string>>(new Set())
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())

  // Form state
  const [title, setTitle]             = useState('')
  const [desc, setDesc]               = useState('')
  const [steps, setSteps]             = useState('')
  const [expected, setExpected]       = useState('')
  const [actual, setActual]           = useState('')
  const [severity, setSeverity]       = useState('medium')
  const [category, setCategory]       = useState('other')
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null)
  const [submitting, setSubmitting]   = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Admin edit state
  const [editId, setEditId]           = useState<string | null>(null)
  const [editStatus, setEditStatus]   = useState('')
  const [editNote, setEditNote]       = useState('')
  const [editSaving, setEditSaving]   = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await apiFetch('/api/testing-bugs')
      const d = await r.json()
      setBugs(d.bugs || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function submit() {
    if (!title || !desc) return
    setSubmitting(true)
    try {
      let screenshot_url = null
      if (screenshotFile) {
        // Upload to a public endpoint or just skip for now
        screenshot_url = null
      }
      await apiFetch('/api/testing-bugs', {
        method: 'POST',
        body: JSON.stringify({ title, description: desc, steps_to_reproduce: steps, expected_behavior: expected, actual_behavior: actual, severity, category, screenshot_url }),
      })
      setTitle(''); setDesc(''); setSteps(''); setExpected(''); setActual('')
      setSeverity('medium'); setCategory('other'); setScreenshotFile(null)
      setShowForm(false)
      await load()
    } finally { setSubmitting(false) }
  }

  async function upvote(id: string) {
    setUpvoting(id)
    try {
      const r = await apiFetch('/api/testing-upvote', { method: 'POST', body: JSON.stringify({ item_type: 'bug', item_id: id }) })
      const d = await r.json()
      setMyUpvotes(prev => {
        const next = new Set(prev)
        d.upvoted ? next.add(id) : next.delete(id)
        return next
      })
      setBugs(prev => prev.map(b => b.id === id ? { ...b, upvotes: d.count } : b))
    } finally { setUpvoting(null) }
  }

  async function saveEdit() {
    if (!editId) return
    setEditSaving(true)
    try {
      await apiFetch('/api/testing-bugs', { method: 'PATCH', body: JSON.stringify({ id: editId, status: editStatus, resolved_note: editNote }) })
      setEditId(null)
      await load()
    } finally { setEditSaving(false) }
  }

  const sorted = [...bugs].sort((a, b) => {
    if (sort === 'upvotes')  return b.upvotes - a.upvotes
    if (sort === 'critical') return (a.severity === 'critical' ? 0 : 1) - (b.severity === 'critical' ? 0 : 1)
    if (sort === 'open')     return (a.status === 'open' ? 0 : 1) - (b.status === 'open' ? 0 : 1)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' as const, gap: 8 }}>
        <button
          onClick={() => setShowForm(f => !f)}
          style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', background: G, color: BG, border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}
        >
          {showForm ? '✕ Cancel' : '+ Report a Bug'}
        </button>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
          {(['newest', 'upvotes', 'critical', 'open'] as const).map(s => (
            <button key={s} onClick={() => setSort(s)} style={{
              fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em',
              padding: '4px 10px', borderRadius: 10, cursor: 'pointer',
              background: sort === s ? `${G}22` : 'transparent',
              border: `1px solid ${sort === s ? G : BDR}`,
              color: sort === s ? G : DIM,
            }}>
              {s === 'newest' ? 'Newest' : s === 'upvotes' ? 'Most Upvoted' : s === 'critical' ? 'Critical' : 'Open Only'}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.18em', color: G, marginBottom: 16 }}>REPORT A BUG</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>TITLE *</label>
              <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="Brief description of the bug" />
            </div>
            <div>
              <label style={lbl}>CATEGORY</label>
              <select style={sel} value={category} onChange={e => setCategory(e.target.value)}>
                {['ui','functionality','mobile','performance','content','other'].map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>SEVERITY</label>
              <select style={sel} value={severity} onChange={e => setSeverity(e.target.value)}>
                {['low','medium','high','critical'].map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>DESCRIPTION *</label>
              <textarea style={ta} value={desc} onChange={e => setDesc(e.target.value)} placeholder="What happened?" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={lbl}>STEPS TO REPRODUCE</label>
              <textarea style={ta} value={steps} onChange={e => setSteps(e.target.value)} placeholder="1. Go to... 2. Click... 3. See error..." />
            </div>
            <div>
              <label style={lbl}>EXPECTED BEHAVIOR</label>
              <textarea style={{ ...ta, minHeight: 60 }} value={expected} onChange={e => setExpected(e.target.value)} placeholder="What should have happened?" />
            </div>
            <div>
              <label style={lbl}>ACTUAL BEHAVIOR</label>
              <textarea style={{ ...ta, minHeight: 60 }} value={actual} onChange={e => setActual(e.target.value)} placeholder="What actually happened?" />
            </div>
          </div>
          <button
            onClick={submit}
            disabled={submitting || !title || !desc}
            style={{ marginTop: 14, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', background: G, color: BG, border: 'none', borderRadius: 6, padding: '9px 20px', cursor: submitting || !title || !desc ? 'not-allowed' : 'pointer', opacity: submitting || !title || !desc ? 0.5 : 1 }}
          >
            {submitting ? 'SUBMITTING...' : 'SUBMIT BUG REPORT'}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ textAlign: 'center', color: DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.2em', padding: 40 }}>LOADING...</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', color: DIM, fontFamily: crimson, fontStyle: 'italic', padding: 40 }}>No bug reports yet. Be the first to report something.</div>
      ) : sorted.map(bug => (
        <div key={bug.id} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' as const }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 6 }}>
                <span style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.04em' }}>{bug.title}</span>
                <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: SEV_COLORS[bug.severity] || DIM, border: `1px solid ${SEV_COLORS[bug.severity] || DIM}44`, padding: '1px 6px', borderRadius: 10, textTransform: 'uppercase' as const }}>{bug.severity}</span>
                <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: DIM, border: `1px solid ${BDR}`, padding: '1px 6px', borderRadius: 10 }}>{bug.category}</span>
                <StatusBadge status={bug.status} />
              </div>
              <p style={{ fontFamily: crimson, fontSize: 13, color: TXT, margin: '0 0 6px', lineHeight: 1.5 }}>
                {expanded.has(bug.id) ? bug.description : bug.description.slice(0, 120)}
                {bug.description.length > 120 && (
                  <button onClick={() => setExpanded(s => { const n = new Set(s); n.has(bug.id) ? n.delete(bug.id) : n.add(bug.id); return n })}
                    style={{ background: 'none', border: 'none', color: G, cursor: 'pointer', fontFamily: crimson, fontSize: 12, padding: '0 4px' }}>
                    {expanded.has(bug.id) ? ' show less' : '... show more'}
                  </button>
                )}
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, fontSize: 11, color: DIM, fontFamily: crimson }}>
                <span>{bug.submitted_by_name || 'Anonymous'}</span>
                {bug.submitted_by_tier && <TierBadge tier={bug.submitted_by_tier} />}
                <span>{timeAgo(bug.created_at)}</span>
              </div>
              {bug.status === 'resolved' && bug.resolved_note && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 6, fontFamily: crimson, fontSize: 12, color: '#4ade80' }}>
                  Resolved: {bug.resolved_note}
                </div>
              )}
              {isMinister && (
                <div style={{ marginTop: 10 }}>
                  {editId === bug.id ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                      <select style={{ ...sel, width: 'auto', fontSize: 11 }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                        {['open','in_progress','resolved','wont_fix'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select>
                      <input style={{ ...inp, flex: 1, fontSize: 11 }} value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Resolution note (optional)" />
                      <button onClick={saveEdit} disabled={editSaving} style={{ fontFamily: cinzel, fontSize: 9, background: G, color: BG, border: 'none', borderRadius: 4, padding: '5px 12px', cursor: 'pointer' }}>{editSaving ? '...' : 'Save'}</button>
                      <button onClick={() => setEditId(null)} style={{ fontFamily: cinzel, fontSize: 9, background: 'none', border: `1px solid ${BDR}`, color: DIM, borderRadius: 4, padding: '5px 10px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditId(bug.id); setEditStatus(bug.status); setEditNote(bug.resolved_note || '') }}
                      style={{ fontFamily: cinzel, fontSize: 8, background: 'none', border: `1px solid ${BDR}`, color: DIM, borderRadius: 4, padding: '3px 10px', cursor: 'pointer', letterSpacing: '0.08em' }}>
                      UPDATE STATUS
                    </button>
                  )}
                </div>
              )}
            </div>
            <UpvoteBtn count={bug.upvotes} upvoted={myUpvotes.has(bug.id)} loading={upvoting === bug.id} onClick={() => upvote(bug.id)} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TAB 2: FEATURE REQUESTS ──────────────────────────────────────────────────
function FeatureRequestsTab({ apiFetch, user, isMinister }: { apiFetch: Function; user: any; isMinister: boolean }) {
  const [features, setFeatures]     = useState<FeatureRequest[]>([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [sort, setSort]             = useState<'newest' | 'upvotes' | 'shipped'>('newest')
  const [upvoting, setUpvoting]     = useState<string | null>(null)
  const [myUpvotes, setMyUpvotes]   = useState<Set<string>>(new Set())

  const [title, setTitle]           = useState('')
  const [desc, setDesc]             = useState('')
  const [expected, setExpected]     = useState('')
  const [submitting, setSubmitting] = useState(false)

  const [editId, setEditId]         = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editNote, setEditNote]     = useState('')
  const [editSaving, setEditSaving] = useState(false)

  async function load() {
    setLoading(true)
    try {
      const r = await apiFetch('/api/testing-features')
      const d = await r.json()
      setFeatures(d.features || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function submit() {
    if (!title || !desc) return
    setSubmitting(true)
    try {
      await apiFetch('/api/testing-features', { method: 'POST', body: JSON.stringify({ title, description: desc, expected_behavior: expected }) })
      setTitle(''); setDesc(''); setExpected('')
      setShowForm(false)
      await load()
    } finally { setSubmitting(false) }
  }

  async function upvote(id: string) {
    setUpvoting(id)
    try {
      const r = await apiFetch('/api/testing-upvote', { method: 'POST', body: JSON.stringify({ item_type: 'feature', item_id: id }) })
      const d = await r.json()
      setMyUpvotes(prev => { const n = new Set(prev); d.upvoted ? n.add(id) : n.delete(id); return n })
      setFeatures(prev => prev.map(f => f.id === id ? { ...f, upvotes: d.count } : f))
    } finally { setUpvoting(null) }
  }

  async function saveEdit() {
    if (!editId) return
    setEditSaving(true)
    try {
      await apiFetch('/api/testing-features', { method: 'PATCH', body: JSON.stringify({ id: editId, status: editStatus, admin_note: editNote }) })
      setEditId(null)
      await load()
    } finally { setEditSaving(false) }
  }

  const sorted = [...features].sort((a, b) => {
    if (sort === 'upvotes') return b.upvotes - a.upvotes
    if (sort === 'shipped') return (a.status === 'shipped' ? 0 : 1) - (b.status === 'shipped' ? 0 : 1)
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap' as const, gap: 8 }}>
        <button onClick={() => setShowForm(f => !f)} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', background: G, color: BG, border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer' }}>
          {showForm ? '✕ Cancel' : '+ Request a Feature'}
        </button>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['newest', 'upvotes', 'shipped'] as const).map(s => (
            <button key={s} onClick={() => setSort(s)} style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 10, cursor: 'pointer', background: sort === s ? `${G}22` : 'transparent', border: `1px solid ${sort === s ? G : BDR}`, color: sort === s ? G : DIM }}>
              {s === 'newest' ? 'Newest' : s === 'upvotes' ? 'Most Upvoted' : 'Shipped'}
            </button>
          ))}
        </div>
      </div>

      {showForm && (
        <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.18em', color: G, marginBottom: 16 }}>REQUEST A FEATURE</div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div>
              <label style={lbl}>TITLE *</label>
              <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="What feature are you requesting?" />
            </div>
            <div>
              <label style={lbl}>DESCRIPTION * — What should it do?</label>
              <textarea style={ta} value={desc} onChange={e => setDesc(e.target.value)} placeholder="Describe the feature in detail..." />
            </div>
            <div>
              <label style={lbl}>EXPECTED BEHAVIOR — How would you know it works?</label>
              <textarea style={{ ...ta, minHeight: 60 }} value={expected} onChange={e => setExpected(e.target.value)} placeholder="When I do X, I expect Y to happen..." />
            </div>
          </div>
          <button onClick={submit} disabled={submitting || !title || !desc} style={{ marginTop: 14, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', background: G, color: BG, border: 'none', borderRadius: 6, padding: '9px 20px', cursor: submitting || !title || !desc ? 'not-allowed' : 'pointer', opacity: submitting || !title || !desc ? 0.5 : 1 }}>
            {submitting ? 'SUBMITTING...' : 'SUBMIT FEATURE REQUEST'}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', color: DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.2em', padding: 40 }}>LOADING...</div>
      ) : sorted.length === 0 ? (
        <div style={{ textAlign: 'center', color: DIM, fontFamily: crimson, fontStyle: 'italic', padding: 40 }}>No feature requests yet. Be the first to request something.</div>
      ) : sorted.map(feat => (
        <div key={feat.id} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const, marginBottom: 6 }}>
                <span style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.04em' }}>{feat.title}</span>
                <StatusBadge status={feat.status} />
              </div>
              <p style={{ fontFamily: crimson, fontSize: 13, color: TXT, margin: '0 0 6px', lineHeight: 1.5 }}>{feat.description}</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const, fontSize: 11, color: DIM, fontFamily: crimson }}>
                <span>{feat.submitted_by_name || 'Anonymous'}</span>
                {feat.submitted_by_tier && <TierBadge tier={feat.submitted_by_tier} />}
                <span>{timeAgo(feat.created_at)}</span>
              </div>
              {(feat.status === 'planned' || feat.status === 'shipped') && feat.admin_note && (
                <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(201,168,76,0.06)', border: `1px solid ${BDR}`, borderRadius: 6, fontFamily: crimson, fontSize: 12, color: G }}>
                  {feat.admin_note}
                </div>
              )}
              {isMinister && (
                <div style={{ marginTop: 10 }}>
                  {editId === feat.id ? (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                      <select style={{ ...sel, width: 'auto', fontSize: 11 }} value={editStatus} onChange={e => setEditStatus(e.target.value)}>
                        {['open','planned','in_progress','shipped','declined'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
                      </select>
                      <input style={{ ...inp, flex: 1, fontSize: 11 }} value={editNote} onChange={e => setEditNote(e.target.value)} placeholder="Admin note (optional)" />
                      <button onClick={saveEdit} disabled={editSaving} style={{ fontFamily: cinzel, fontSize: 9, background: G, color: BG, border: 'none', borderRadius: 4, padding: '5px 12px', cursor: 'pointer' }}>{editSaving ? '...' : 'Save'}</button>
                      <button onClick={() => setEditId(null)} style={{ fontFamily: cinzel, fontSize: 9, background: 'none', border: `1px solid ${BDR}`, color: DIM, borderRadius: 4, padding: '5px 10px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditId(feat.id); setEditStatus(feat.status); setEditNote(feat.admin_note || '') }}
                      style={{ fontFamily: cinzel, fontSize: 8, background: 'none', border: `1px solid ${BDR}`, color: DIM, borderRadius: 4, padding: '3px 10px', cursor: 'pointer', letterSpacing: '0.08em' }}>
                      UPDATE STATUS
                    </button>
                  )}
                </div>
              )}
            </div>
            <UpvoteBtn count={feat.upvotes} upvoted={myUpvotes.has(feat.id)} loading={upvoting === feat.id} onClick={() => upvote(feat.id)} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── TAB 3: DOCUMENT REVIEW ───────────────────────────────────────────────────
function DocumentReviewTab({ apiFetch, user }: { apiFetch: Function; user: any }) {
  const [reviews, setReviews]       = useState<DocumentReview[]>([])
  const [loading, setLoading]       = useState(true)
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [revStatus, setRevStatus]   = useState<'approved' | 'needs_review'>('approved')
  const [revIssues, setRevIssues]   = useState<string[]>([])
  const [revNotes, setRevNotes]     = useState('')
  const [saving, setSaving]         = useState(false)
  const [approvedOpen, setApprovedOpen] = useState(false)

  const ISSUES = ['Formatting issues','Template issues','Data incorrect','Wrong tier gate','Content incomplete','Other']

  async function load() {
    setLoading(true)
    try {
      const r = await apiFetch('/api/testing-documents')
      const d = await r.json()
      setReviews(d.reviews || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function submitReview(docId: string) {
    setSaving(true)
    try {
      await apiFetch('/api/testing-documents', { method: 'POST', body: JSON.stringify({ document_id: docId, status: revStatus, review_issues: revIssues, review_notes: revNotes }) })
      setReviewingId(null); setRevIssues([]); setRevNotes(''); setRevStatus('approved')
      await load()
    } finally { setSaving(false) }
  }

  const pending   = reviews.filter(r => r.status === 'pending')
  const approved  = reviews.filter(r => r.status === 'approved')
  const needsReview = reviews.filter(r => r.status === 'needs_review')

  function DocRow({ review }: { review: DocumentReview }) {
    const isReviewing = reviewingId === review.document_id
    return (
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${BDR}`, background: SURF }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
            <span style={{ fontFamily: crimson, fontSize: 13, color: TXT }}>{review.document_title}</span>
            <TierBadge tier={review.document_tier} />
            {review.document_url && (
              <a href={review.document_url} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: cinzel, fontSize: 8, color: G, textDecoration: 'none', letterSpacing: '0.08em', border: `1px solid ${BDR}`, padding: '1px 7px', borderRadius: 4 }}>
                VIEW
              </a>
            )}
          </div>
          {review.status === 'pending' && (
            <button onClick={() => { setReviewingId(isReviewing ? null : review.document_id); setRevStatus('approved'); setRevIssues([]); setRevNotes('') }}
              style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', background: isReviewing ? 'transparent' : `${G}22`, border: `1px solid ${isReviewing ? BDR : G}`, color: isReviewing ? DIM : G, borderRadius: 4, padding: '4px 12px', cursor: 'pointer' }}>
              {isReviewing ? 'Cancel' : 'Review'}
            </button>
          )}
          {review.status !== 'pending' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: DIM, fontFamily: crimson }}>
              <StatusBadge status={review.status} />
              <span>by {review.reviewed_by_name}</span>
              {review.reviewed_at && <span>{timeAgo(review.reviewed_at)}</span>}
            </div>
          )}
        </div>

        {/* Review issues tags for needs_review */}
        {review.status === 'needs_review' && review.review_issues.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginTop: 8 }}>
            {review.review_issues.map(issue => (
              <span key={issue} style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', background: 'rgba(239,68,68,0.1)', color: '#f87171', border: '1px solid rgba(239,68,68,0.2)', padding: '2px 7px', borderRadius: 10 }}>{issue}</span>
            ))}
          </div>
        )}
        {review.status === 'needs_review' && review.review_notes && (
          <p style={{ margin: '6px 0 0', fontFamily: crimson, fontSize: 12, color: DIM }}>{review.review_notes}</p>
        )}

        {isReviewing && (
          <div style={{ marginTop: 14, padding: 14, background: SURF2, borderRadius: 6, border: `1px solid ${BDR}` }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              {(['approved', 'needs_review'] as const).map(s => (
                <button key={s} onClick={() => setRevStatus(s)} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', background: revStatus === s ? (s === 'approved' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)') : 'transparent', border: `1px solid ${revStatus === s ? (s === 'approved' ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.4)') : BDR}`, color: revStatus === s ? (s === 'approved' ? '#4ade80' : '#f87171') : DIM, borderRadius: 4, padding: '5px 12px', cursor: 'pointer' }}>
                  {s === 'approved' ? '✓ Approved' : '⚠ Needs Review'}
                </button>
              ))}
            </div>
            {revStatus === 'needs_review' && (
              <div style={{ marginBottom: 12 }}>
                <label style={lbl}>ISSUES (select all that apply)</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  {ISSUES.map(issue => (
                    <label key={issue} style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontFamily: crimson, fontSize: 12, color: DIM }}>
                      <input type="checkbox" checked={revIssues.includes(issue)} onChange={e => setRevIssues(prev => e.target.checked ? [...prev, issue] : prev.filter(i => i !== issue))}
                        style={{ accentColor: G }} />
                      {issue}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <label style={lbl}>NOTES (optional)</label>
              <textarea style={{ ...ta, minHeight: 52 }} value={revNotes} onChange={e => setRevNotes(e.target.value)} placeholder="Any additional notes..." />
            </div>
            <button onClick={() => submitReview(review.document_id)} disabled={saving} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', background: G, color: BG, border: 'none', borderRadius: 4, padding: '7px 16px', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.5 : 1 }}>
              {saving ? 'SAVING...' : 'SUBMIT REVIEW'}
            </button>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div style={{ textAlign: 'center', color: DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.2em', padding: 40 }}>LOADING...</div>

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as const }}>
        {[
          { label: 'Pending Review', count: pending.length, color: G },
          { label: 'Approved', count: approved.length, color: '#4ade80' },
          { label: 'Needs Review', count: needsReview.length, color: '#f87171' },
        ].map(s => (
          <div key={s.label} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: '10px 16px', textAlign: 'center' as const }}>
            <div style={{ fontFamily: cinzel, fontSize: 18, color: s.color }}>{s.count}</div>
            <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.12em', color: DIM, marginTop: 2 }}>{s.label.toUpperCase()}</div>
          </div>
        ))}
      </div>

      {/* Pending section */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: G, marginBottom: 10 }}>PENDING REVIEW</div>
          <div style={{ border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden' }}>
            {pending.map(r => <DocRow key={r.document_id} review={r} />)}
          </div>
        </div>
      )}

      {/* Needs Review section */}
      {needsReview.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: '#f87171', marginBottom: 10 }}>NEEDS REVIEW ({needsReview.length})</div>
          <div style={{ border: '1px solid rgba(239,68,68,0.2)', borderRadius: 8, overflow: 'hidden' }}>
            {needsReview.map(r => <DocRow key={r.document_id} review={r} />)}
          </div>
        </div>
      )}

      {/* Approved section (collapsed) */}
      <div>
        <button onClick={() => setApprovedOpen(o => !o)} style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: '#4ade80', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px' }}>
          {approvedOpen ? '▾' : '▸'} APPROVED ({approved.length}) — {approvedOpen ? 'hide' : 'show'}
        </button>
        {approvedOpen && approved.length > 0 && (
          <div style={{ border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, overflow: 'hidden' }}>
            {approved.map(r => <DocRow key={r.document_id} review={r} />)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── TAB 4: FEATURE VERIFICATION ─────────────────────────────────────────────
function FeatureVerifyTab({ apiFetch, user }: { apiFetch: Function; user: any }) {
  const [features, setFeatures]     = useState<FeatureVerification[]>([])
  const [loading, setLoading]       = useState(true)
  const [savingId, setSavingId]     = useState<string | null>(null)
  const [needsChangeId, setNeedsChangeId] = useState<string | null>(null)
  const [changeNote, setChangeNote] = useState('')

  async function load() {
    setLoading(true)
    try {
      const r = await apiFetch('/api/testing-verify')
      const d = await r.json()
      setFeatures(d.features || [])
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  async function verify(id: string, status: 'works' | 'needs_change', notes?: string) {
    setSavingId(id)
    try {
      await apiFetch('/api/testing-verify', { method: 'POST', body: JSON.stringify({ id, status, notes: notes || null }) })
      setNeedsChangeId(null); setChangeNote('')
      await load()
    } finally { setSavingId(null) }
  }

  const total    = features.length
  const works    = features.filter(f => f.status === 'works').length
  const needsChg = features.filter(f => f.status === 'needs_change').length
  const untested = features.filter(f => f.status === 'untested').length

  // Group by area
  const areas = Array.from(new Set(features.map(f => f.feature_area))).filter(Boolean)

  if (loading) return <div style={{ textAlign: 'center', color: DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.2em', padding: 40 }}>LOADING...</div>

  return (
    <div>
      {/* Summary bar */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 20, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.06em' }}>{works}/{total} verified</div>
        <div style={{ fontFamily: cinzel, fontSize: 10, color: '#4ade80', letterSpacing: '0.08em' }}>✓ {works} working</div>
        <div style={{ fontFamily: cinzel, fontSize: 10, color: '#f87171', letterSpacing: '0.08em' }}>⚠ {needsChg} need changes</div>
        <div style={{ fontFamily: cinzel, fontSize: 10, color: DIM, letterSpacing: '0.08em' }}>○ {untested} untested</div>
        <div style={{ flex: 1, height: 6, background: SURF2, borderRadius: 3, minWidth: 100 }}>
          <div style={{ height: '100%', width: `${total > 0 ? (works / total) * 100 : 0}%`, background: G, borderRadius: 3, transition: 'width 0.3s' }} />
        </div>
      </div>

      {areas.map(area => {
        const areaFeatures = features.filter(f => f.feature_area === area)
        return (
          <div key={area} style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.18em', color: G, marginBottom: 10, textTransform: 'uppercase' as const }}>{area}</div>
            <div style={{ border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden' }}>
              {areaFeatures.map((feat, idx) => {
                const isLast = idx === areaFeatures.length - 1
                const isNeedsForm = needsChangeId === feat.id
                return (
                  <div key={feat.id} style={{ padding: '12px 16px', borderBottom: isLast ? 'none' : `1px solid ${BDR}`, background: feat.status === 'works' ? 'rgba(34,197,94,0.03)' : feat.status === 'needs_change' ? 'rgba(239,68,68,0.03)' : SURF }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
                      <div style={{ flex: 1, fontFamily: crimson, fontSize: 13, color: TXT }}>{feat.feature_name}</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                        {feat.status === 'untested' && (
                          <>
                            <button
                              onClick={() => verify(feat.id, 'works')}
                              disabled={savingId === feat.id}
                              style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}
                            >
                              {savingId === feat.id ? '...' : '✓ Works'}
                            </button>
                            <button
                              onClick={() => setNeedsChangeId(isNeedsForm ? null : feat.id)}
                              style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}
                            >
                              ⚠ Needs Change
                            </button>
                          </>
                        )}
                        {feat.status === 'works' && (
                          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: '#4ade80' }}>
                            ✓ Verified {feat.verified_by_name ? `by ${feat.verified_by_name}` : ''}
                          </span>
                        )}
                        {feat.status === 'needs_change' && (
                          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: '#f87171' }}>
                            ⚠ Needs change
                          </span>
                        )}
                      </div>
                    </div>
                    {feat.status === 'needs_change' && feat.notes && (
                      <p style={{ margin: '6px 0 0 0', fontFamily: crimson, fontSize: 12, color: DIM }}>{feat.notes}</p>
                    )}
                    {isNeedsForm && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                        <input
                          style={{ ...inp, flex: 1 }}
                          value={changeNote}
                          onChange={e => setChangeNote(e.target.value)}
                          placeholder="Describe what needs to change..."
                        />
                        <button
                          onClick={() => verify(feat.id, 'needs_change', changeNote)}
                          disabled={!changeNote || savingId === feat.id}
                          style={{ fontFamily: cinzel, fontSize: 9, background: '#f87171', color: '#1a0a0a', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: !changeNote ? 'not-allowed' : 'pointer', opacity: !changeNote ? 0.5 : 1 }}
                        >
                          Submit
                        </button>
                        <button onClick={() => setNeedsChangeId(null)} style={{ fontFamily: cinzel, fontSize: 9, background: 'none', border: `1px solid ${BDR}`, color: DIM, borderRadius: 4, padding: '6px 10px', cursor: 'pointer' }}>Cancel</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
