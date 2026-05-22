import { useState, useEffect, useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'

export const Route = createFileRoute('/admin')({
  component: AdminPage,
})

const G      = '#C9A84C'
const BG     = '#0D0B14'
const SURF   = '#13111e'
const SURF2  = '#1a1726'
const BDR    = 'rgba(201,168,76,0.18)'
const TXT    = '#e8dcc8'
const DIM    = '#7a6d58'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

const TIER_COLORS: Record<string, string> = {
  Free: '#6a6080', Soldier: '#5C7CBF', Commander: '#7C5CBF', General: '#C9A84C',
}
const TIER_ORDER: Record<string, number> = { Free: 0, Soldier: 1, Commander: 2, General: 3 }

const FILE_ICONS: Record<string, string> = {
  pdf: '📄', docx: '📝', mp3: '🎵', png: '🖼', jpg: '🖼', jpeg: '🖼',
}

function fileExt(name: string) { return name.split('.').pop()?.toLowerCase() || '' }
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── SHARED AUTH ─────────────────────────────────────────────────────────────
async function authFetch(url: string, getToken: () => Promise<string | null>, opts: RequestInit = {}) {
  const token = await getToken()
  return fetch(url, {
    ...opts,
    headers: { ...(opts.headers as Record<string, string> || {}), 'Authorization': `Bearer ${token}` },
  })
}

// ─── ARSENAL MANAGER ─────────────────────────────────────────────────────────
function ArsenalManager({ getToken }: { getToken: () => Promise<string | null> }) {
  const [file, setFile]             = useState<File | null>(null)
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [tier, setTier]             = useState('Free')
  const [category, setCategory]     = useState('Session Tools')
  const [uploading, setUploading]   = useState(false)
  const [uploadMsg, setUploadMsg]   = useState('')
  const [uploadErr, setUploadErr]   = useState('')
  const [dragging, setDragging]     = useState(false)
  const [resources, setResources]   = useState<any[]>([])
  const [resLoading, setResLoading] = useState(true)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const TIERS      = ['Free', 'Soldier', 'Commander', 'General']
  const CATEGORIES = ['Session Tools', 'Teaching', 'Protocol', 'Reference', 'Renunciation', 'Worksheet']

  async function fetchResources() {
    setResLoading(true)
    try {
      const res = await authFetch('/api/admin-resources', getToken)
      const data = await res.json()
      setResources(data.resources || [])
    } catch { setResources([]) }
    finally { setResLoading(false) }
  }

  useEffect(() => { fetchResources() }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  async function handleUpload() {
    if (!file || !title.trim()) return
    setUploading(true)
    setUploadMsg('')
    setUploadErr('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title.trim())
    fd.append('description', description.trim())
    fd.append('tier', tier)
    fd.append('category', category)
    try {
      const res = await authFetch('/api/admin-upload', getToken, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUploadMsg(`✓ "${data.resource?.title}" uploaded successfully`)
      setFile(null); setTitle(''); setDesc('')
      if (fileRef.current) fileRef.current.value = ''
      await fetchResources()
    } catch (err: any) { setUploadErr(err.message) }
    finally { setUploading(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this resource? This cannot be undone.')) return
    setDeleting(id)
    try {
      await authFetch(`/api/admin-resources?id=${id}`, getToken, { method: 'DELETE' })
      await fetchResources()
    } catch { /* silent */ }
    finally { setDeleting(null) }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: SURF2,
    border: `1px solid ${BDR}`, borderRadius: 6, padding: '10px 12px',
    color: TXT, fontFamily: crimson, fontSize: 14, outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    display: 'block', fontFamily: cinzel, fontSize: 9,
    letterSpacing: '0.12em', color: DIM, textTransform: 'uppercase', marginBottom: 6,
  }

  return (
    <div>
      {/* Upload Form */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: 24, marginBottom: 28 }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: G, marginBottom: 20 }}>⬆ Upload Resource</div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? G : BDR}`,
            borderRadius: 8, padding: '32px 20px', textAlign: 'center',
            cursor: 'pointer', marginBottom: 20, transition: 'border-color 0.2s',
            background: dragging ? 'rgba(201,168,76,0.04)' : 'transparent',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.mp3,.png,.jpg,.jpeg"
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
          {file ? (
            <div>
              <div style={{ fontSize: 28, marginBottom: 6 }}>{FILE_ICONS[fileExt(file.name)] || '📎'}</div>
              <div style={{ fontFamily: crimson, color: TXT, fontSize: 15 }}>{file.name}</div>
              <div style={{ fontFamily: cinzel, fontSize: 10, color: DIM, marginTop: 4 }}>{fmtBytes(file.size)}</div>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
              <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', color: DIM }}>Drop file here or click to browse</div>
              <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, marginTop: 4, fontStyle: 'italic' }}>PDF, DOCX, MP3, PNG, JPG · max 50MB</div>
            </div>
          )}
        </div>

        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Resource title..." style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Tier</label>
            <select value={tier} onChange={e => setTier(e.target.value)} style={{ ...inputStyle }}>
              {TIERS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inputStyle }}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Description (optional)</label>
            <textarea
              value={description} onChange={e => setDesc(e.target.value.slice(0, 200))}
              rows={2} placeholder="Brief description..."
              style={{ ...inputStyle, resize: 'vertical' as const }}
            />
            <div style={{ fontSize: 10, color: DIM, textAlign: 'right' as const, marginTop: 2 }}>{description.length}/200</div>
          </div>
        </div>

        {uploadMsg && <div style={{ fontFamily: crimson, fontSize: 13, color: '#4ade80', marginBottom: 10 }}>{uploadMsg}</div>}
        {uploadErr && <div style={{ fontFamily: crimson, fontSize: 13, color: '#f87171', marginBottom: 10 }}>⚠ {uploadErr}</div>}

        <button
          onClick={handleUpload}
          disabled={!file || !title.trim() || uploading}
          style={{
            width: '100%', padding: '11px', fontFamily: cinzel, fontSize: 10,
            letterSpacing: '0.1em', border: 'none', borderRadius: 6, cursor: (!file || !title.trim() || uploading) ? 'not-allowed' : 'pointer',
            background: (!file || !title.trim() || uploading) ? 'rgba(201,168,76,0.2)' : G,
            color: (!file || !title.trim() || uploading) ? DIM : '#0D0B14',
            transition: 'all 0.2s',
          }}
        >
          {uploading ? '⬆ Uploading...' : '⬆ Upload Resource'}
        </button>
      </div>

      {/* Resource List */}
      <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: G, marginBottom: 14 }}>
        📂 Resources ({resources.length})
      </div>
      {resLoading ? (
        <div style={{ fontFamily: cinzel, fontSize: 10, color: DIM, letterSpacing: '0.1em', padding: '20px 0' }}>Loading...</div>
      ) : resources.length === 0 ? (
        <div style={{ fontFamily: crimson, fontSize: 15, color: DIM, fontStyle: 'italic', padding: '20px 0' }}>No resources uploaded yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {resources.map((r: any) => (
            <div key={r.id} style={{ background: SURF, border: `1px solid ${BDR}`, borderLeft: `3px solid ${TIER_COLORS[r.tier] || DIM}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{FILE_ICONS[r.file_type?.split('/').pop() || ''] || '📎'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: cinzel, fontSize: 12, color: TXT, marginBottom: 3 }}>{r.title}</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                  <span style={{ fontFamily: cinzel, fontSize: 8, color: TIER_COLORS[r.tier], border: `1px solid ${TIER_COLORS[r.tier]}44`, padding: '1px 7px', borderRadius: 10 }}>{r.tier}</span>
                  <span style={{ fontFamily: cinzel, fontSize: 8, color: DIM }}>{r.category}</span>
                  <span style={{ fontFamily: cinzel, fontSize: 8, color: DIM }}>{fmtBytes(r.file_size || 0)}</span>
                  <span style={{ fontFamily: cinzel, fontSize: 8, color: DIM }}>{r.created_at ? fmtDate(r.created_at) : ''}</span>
                </div>
              </div>
              <button
                onClick={() => handleDelete(r.id)}
                disabled={deleting === r.id}
                style={{ background: 'transparent', border: `1px solid rgba(220,38,38,0.3)`, borderRadius: 5, color: '#f87171', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}
              >
                {deleting === r.id ? '...' : '🗑 Delete'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── INTEL ARCHIVE TAB ───────────────────────────────────────────────────────
function IntelArchive() {
  const [demons, setDemons]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/demons')
      .then(r => r.json())
      .then(d => setDemons(d.demons || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const emptySequence  = demons.filter(d => !d.deliveranceSequence).length
  const emptyScripture = demons.filter(d => !d.counterScriptures).length
  const recent         = demons.slice(0, 10)

  const statCard = (label: string, value: number | string, color = G) => (
    <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: '18px 22px', flex: 1 }}>
      <div style={{ fontFamily: cinzel, fontSize: 28, color, marginBottom: 6 }}>{loading ? '—' : value}</div>
      <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: DIM, textTransform: 'uppercase' as const }}>{label}</div>
    </div>
  )

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' as const }}>
        {statCard('Total Entries', demons.length)}
        {statCard('Missing Deliverance Sequence', emptySequence, emptySequence > 0 ? '#f97316' : '#4ade80')}
        {statCard('Missing Counter Scriptures', emptyScripture, emptyScripture > 0 ? '#f97316' : '#4ade80')}
      </div>

      {/* Airtable link */}
      <a
        href="https://airtable.com/appVXEj2DLPBTJTtD/tblcP4lgVykzOhLi4"
        target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-block', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: '#0D0B14', background: G, borderRadius: 5, padding: '8px 18px', textDecoration: 'none', marginBottom: 22 }}
      >
        Open Airtable →
      </a>

      {/* Recent entries table */}
      <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: DIM, marginBottom: 10 }}>
        10 Most Recent Entries
      </div>
      {loading ? (
        <div style={{ fontFamily: cinzel, fontSize: 10, color: DIM, letterSpacing: '0.1em' }}>Loading...</div>
      ) : (
        <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '10px 16px', borderBottom: `1px solid ${BDR}`, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM }}>
            <span>SPIRIT NAME</span>
            <span>HIERARCHY CATEGORY</span>
          </div>
          {recent.map((d: any, i: number) => (
            <div key={d.id || i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '10px 16px', borderBottom: i < recent.length - 1 ? `1px solid ${BDR}` : 'none', alignItems: 'center' }}>
              <a
                href="https://airtable.com/appVXEj2DLPBTJTtD/tblcP4lgVykzOhLi4"
                target="_blank" rel="noopener noreferrer"
                style={{ fontFamily: cinzel, fontSize: 12, color: G, textDecoration: 'none' }}
              >
                {d.name}
              </a>
              <span style={{ fontFamily: crimson, fontSize: 13, color: DIM }}>{d.hierarchyCategory || '—'}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── ADMIN PAGE ───────────────────────────────────────────────────────────────
function AdminPage() {
  const { user, isLoaded } = useUser()
  const { getToken }       = useAuth()
  const [tab, setTab]      = useState<'arsenal' | 'intel' | 'moderation'>('arsenal')

  if (!isLoaded) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', color: G, fontFamily: cinzel, letterSpacing: '0.12em', fontSize: 12 }}>
        LOADING...
      </div>
    )
  }

  const role = (user?.publicMetadata?.role as string) || ''
  if (role !== 'minister') {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
          <h2 style={{ fontFamily: cinzel, color: G, fontSize: 20, marginBottom: 12 }}>Access Denied</h2>
          <p style={{ fontFamily: crimson, color: DIM, fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
            This panel is restricted to ordained ministers. Contact the admin if you believe this is an error.
          </p>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: '#0D0B14', background: G, padding: '10px 24px', borderRadius: 5, textDecoration: 'none' }}>
            ← Return to Community
          </a>
        </div>
      </div>
    )
  }

  const TABS = [
    { key: 'arsenal',    label: 'Arsenal Manager' },
    { key: 'intel',      label: 'Intel Archive'   },
    { key: 'moderation', label: 'Moderation'      },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TXT, fontFamily: crimson }}>
      {/* Header */}
      <div style={{ background: SURF, borderBottom: `1px solid ${BDR}`, padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: DIM, textDecoration: 'none' }}>← Community</a>
          <span style={{ color: BDR }}>|</span>
          <span style={{ fontFamily: cinzel, fontSize: 13, letterSpacing: '0.14em', color: G }}>⚔ Admin Panel</span>
        </div>
        <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM }}>{user?.firstName} {user?.lastName}</span>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${BDR}`, padding: '0 32px', display: 'flex', background: SURF }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '14px 22px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.key ? G : 'transparent'}`,
              color: tab === t.key ? G : DIM, fontFamily: cinzel, fontSize: 10,
              letterSpacing: '0.1em', cursor: 'pointer', marginBottom: '-1px',
              transition: 'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>
        {tab === 'arsenal'    && <ArsenalManager getToken={getToken} />}
        {tab === 'intel'      && <IntelArchive />}
        {tab === 'moderation' && (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: 36, marginBottom: 16 }}>🛡</div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.1em', marginBottom: 8 }}>Moderation Tools</div>
            <div style={{ fontFamily: crimson, fontSize: 16, color: DIM, fontStyle: 'italic' }}>Coming soon — post review, flagged content, and member management.</div>
          </div>
        )}
      </div>
    </div>
  )
}
