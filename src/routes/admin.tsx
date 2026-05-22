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
  const [tags, setTags]             = useState<string[]>([])
  const [tagInput, setTagInput]     = useState('')
  const [analyzing, setAnalyzing]   = useState(false)
  const [aiSuggested, setAiSuggested] = useState(false)
  // Track which fields were AI-filled and haven't been manually edited
  const [aiFields, setAiFields]     = useState<Set<string>>(new Set())
  const [uploading, setUploading]   = useState(false)
  const [uploadMsg, setUploadMsg]   = useState('')
  const [uploadErr, setUploadErr]   = useState('')
  const [dragging, setDragging]     = useState(false)
  const [resources, setResources]   = useState<any[]>([])
  const [resLoading, setResLoading] = useState(true)
  const [deleting, setDeleting]     = useState<string | null>(null)
  const fileRef    = useRef<HTMLInputElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

  const TIERS      = ['Free', 'Soldier', 'Commander', 'General']
  const CATEGORIES = ['Session Tools', 'Teaching', 'Protocol', 'Reference', 'Renunciation', 'Worksheet']
  const ALL_TAGS   = ['deliverance','prayer','freemasonry','soul-ties','generational','forgiveness','warfare','inner-healing','renunciation','assessment','protocol','worksheet','teaching','occult','sexual-bondage','rejection','fear','witchcraft','marine-kingdom','strongman','legal-rights','aftercare','session','intake']

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

  async function analyzeFile(f: File) {
    setAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: f.name, content_preview: '' }),
      })
      const data = await res.json()
      const filled = new Set<string>()
      if (data.title)    { setTitle(data.title);    filled.add('title') }
      if (data.description) { setDesc(data.description); filled.add('description') }
      if (data.category && CATEGORIES.includes(data.category)) { setCategory(data.category); filled.add('category') }
      if (data.tags?.length) { setTags(data.tags);  filled.add('tags') }
      if (filled.size > 0) { setAiFields(filled); setAiSuggested(true) }
    } catch (e) { console.error('Analysis failed', e) }
    finally { setAnalyzing(false) }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) { setFile(f); analyzeFile(f) }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] || null
    setFile(f)
    if (f) analyzeFile(f)
  }

  function addTag(tag: string) {
    const t = tag.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
    if (t && !tags.includes(t)) setTags(prev => [...prev, t])
  }

  function removeTag(tag: string) { setTags(prev => prev.filter(t => t !== tag)) }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(tagInput)
      setTagInput('')
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      setTags(prev => prev.slice(0, -1))
    }
  }

  async function handleUpload() {
    if (!file || !title.trim()) return
    setUploading(true); setUploadMsg(''); setUploadErr('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title.trim())
    fd.append('description', description.trim())
    fd.append('tier', tier)
    fd.append('category', category)
    fd.append('tags', JSON.stringify(tags))
    try {
      const res = await authFetch('/api/admin-upload', getToken, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUploadMsg(`✓ "${data.resource?.title}" uploaded successfully`)
      setFile(null); setTitle(''); setDesc(''); setTags([]); setAiFields(new Set()); setAiSuggested(false)
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
  const AiBadge = () => (
    <span style={{ fontFamily: cinzel, fontSize: 7, letterSpacing: '0.08em', color: G, background: 'rgba(201,168,76,0.12)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 4, padding: '1px 5px', marginLeft: 6, verticalAlign: 'middle' }}>✦ AI</span>
  )

  const suggestedTags = ALL_TAGS.filter(t => !tags.includes(t)).slice(0, 8)

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
            cursor: 'pointer', marginBottom: analyzing ? 8 : 20, transition: 'border-color 0.2s',
            background: dragging ? 'rgba(201,168,76,0.04)' : 'transparent',
          }}
        >
          <input ref={fileRef} type="file" accept=".pdf,.docx,.mp3,.png,.jpg,.jpeg" style={{ display: 'none' }} onChange={handleFileChange} />
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

        {/* AI analyzing indicator */}
        {analyzing && (
          <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.08em', marginBottom: 16, textAlign: 'center' }}>
            ⚔ Analyzing document...
          </div>
        )}

        {/* Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>
              Title *{aiFields.has('title') && <AiBadge />}
            </label>
            <input
              value={title}
              onChange={e => { setTitle(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('title'); return n }) }}
              placeholder="Resource title..."
              style={inputStyle}
            />
          </div>
          <div>
            <label style={labelStyle}>Tier</label>
            <select value={tier} onChange={e => setTier(e.target.value)} style={{ ...inputStyle }}>
              {TIERS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>
              Category{aiFields.has('category') && <AiBadge />}
            </label>
            <select
              value={category}
              onChange={e => { setCategory(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('category'); return n }) }}
              style={{ ...inputStyle }}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>
              Description (optional){aiFields.has('description') && <AiBadge />}
            </label>
            <textarea
              value={description}
              onChange={e => { setDesc(e.target.value.slice(0, 200)); setAiFields(prev => { const n = new Set(prev); n.delete('description'); return n }) }}
              rows={2} placeholder="Brief description..."
              style={{ ...inputStyle, resize: 'vertical' as const }}
            />
            <div style={{ fontSize: 10, color: DIM, textAlign: 'right' as const, marginTop: 2 }}>{description.length}/200</div>
          </div>

          {/* Tags pill input */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>
              Tags{aiFields.has('tags') && <AiBadge />}
            </label>
            {/* Pills + input row */}
            <div
              onClick={() => tagInputRef.current?.focus()}
              style={{
                ...inputStyle, display: 'flex', flexWrap: 'wrap', gap: 6,
                alignItems: 'center', cursor: 'text', minHeight: 44, padding: '6px 10px',
              }}
            >
              {tags.map(tag => (
                <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(201,168,76,0.15)', border: `1px solid rgba(201,168,76,0.35)`, borderRadius: 999, padding: '2px 8px', fontSize: 11, color: G, fontFamily: cinzel, letterSpacing: '0.04em', flexShrink: 0 }}>
                  {tag}
                  <button onClick={e => { e.stopPropagation(); removeTag(tag) }} style={{ background: 'none', border: 'none', color: G, cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1, opacity: 0.7 }}>×</button>
                </span>
              ))}
              <input
                ref={tagInputRef}
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleTagKeyDown}
                onBlur={() => { if (tagInput.trim()) { addTag(tagInput); setTagInput('') } }}
                placeholder={tags.length === 0 ? 'Type a tag and press Enter...' : ''}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: TXT, fontFamily: crimson, fontSize: 13, flex: 1, minWidth: 120, padding: '2px 0' }}
              />
            </div>
            {/* Suggested tags */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
              {suggestedTags.map(tag => (
                <button key={tag} onClick={() => addTag(tag)} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 999, padding: '2px 10px', fontSize: 10, color: DIM, fontFamily: cinzel, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = G; (e.currentTarget as HTMLButtonElement).style.color = G }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = BDR; (e.currentTarget as HTMLButtonElement).style.color = DIM }}>
                  + {tag}
                </button>
              ))}
            </div>
          </div>
        </div>

        {uploadMsg && <div style={{ fontFamily: crimson, fontSize: 13, color: '#4ade80', marginBottom: 10 }}>{uploadMsg}</div>}
        {uploadErr && <div style={{ fontFamily: crimson, fontSize: 13, color: '#f87171', marginBottom: 10 }}>⚠ {uploadErr}</div>}

        <button
          onClick={handleUpload}
          disabled={!file || !title.trim() || uploading || analyzing}
          style={{
            width: '100%', padding: '11px', fontFamily: cinzel, fontSize: 10,
            letterSpacing: '0.1em', border: 'none', borderRadius: 6,
            cursor: (!file || !title.trim() || uploading || analyzing) ? 'not-allowed' : 'pointer',
            background: (!file || !title.trim() || uploading || analyzing) ? 'rgba(201,168,76,0.2)' : G,
            color: (!file || !title.trim() || uploading || analyzing) ? DIM : '#0D0B14',
            transition: 'all 0.2s',
          }}
        >
          {uploading ? '⬆ Uploading...' : analyzing ? '⚔ Analyzing...' : '⬆ Upload Resource'}
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
                  {r.tags?.length > 0 && r.tags.map((t: string) => (
                    <span key={t} style={{ fontFamily: cinzel, fontSize: 7, color: G, border: `1px solid rgba(201,168,76,0.3)`, padding: '1px 6px', borderRadius: 999 }}>{t}</span>
                  ))}
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
function IntelArchive({ getToken }: { getToken: () => Promise<string | null> }) {
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const,
    background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6,
    padding: '10px 12px', color: TXT, fontFamily: crimson, fontSize: 14, outline: 'none',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontFamily: cinzel, fontSize: 9,
    letterSpacing: '0.12em', color: DIM, textTransform: 'uppercase' as const, marginBottom: 6,
  }

  // Posts state
  const [posts, setPosts]           = useState<any[]>([])
  const [postTitle, setPostTitle]   = useState('')
  const [postBody, setPostBody]     = useState('')
  const [postScripture, setPostSc]  = useState('')
  const [postType, setPostType]     = useState('briefing')
  const [postSaving, setPostSaving] = useState(false)
  const [postMsg, setPostMsg]       = useState('')

  // Links state
  const [links, setLinks]           = useState<any[]>([])
  const [linkTitle, setLinkTitle]   = useState('')
  const [linkUrl, setLinkUrl]       = useState('')
  const [linkSource, setLinkSource] = useState('')
  const [linkNote, setLinkNote]     = useState('')
  const [linkSaving, setLinkSaving] = useState(false)
  const [linkMsg, setLinkMsg]       = useState('')

  // Demons stats
  const [demons, setDemons]   = useState<any[]>([])
  const [dLoading, setDLoading] = useState(true)

  async function fetchPosts() {
    const res = await fetch('/api/intel-posts')
    const d = await res.json()
    setPosts(d.posts || [])
  }
  async function fetchLinks() {
    const res = await fetch('/api/intel-links')
    const d = await res.json()
    setLinks(d.links || [])
  }

  useEffect(() => {
    fetchPosts()
    fetchLinks()
    fetch('/api/demons').then(r => r.json()).then(d => setDemons(d.demons || [])).finally(() => setDLoading(false))
  }, [])

  async function savePost() {
    if (!postTitle.trim() || !postBody.trim()) return
    setPostSaving(true); setPostMsg('')
    try {
      const token = await getToken()
      const res = await fetch('/api/intel-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: postTitle.trim(), body: postBody.trim(), scripture: postScripture.trim() || undefined, post_type: postType }),
      })
      if (res.ok) {
        setPostMsg('✓ Briefing published')
        setPostTitle(''); setPostBody(''); setPostSc(''); setPostType('briefing')
        await fetchPosts()
      } else {
        const d = await res.json(); setPostMsg(`⚠ ${d.error}`)
      }
    } finally { setPostSaving(false) }
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this briefing?')) return
    const token = await getToken()
    await fetch(`/api/intel-posts?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
    await fetchPosts()
  }

  async function saveLink() {
    if (!linkTitle.trim() || !linkUrl.trim()) return
    setLinkSaving(true); setLinkMsg('')
    try {
      const token = await getToken()
      const res = await fetch('/api/intel-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: linkTitle.trim(), url: linkUrl.trim(), source: linkSource.trim() || undefined, note: linkNote.trim() || undefined }),
      })
      if (res.ok) {
        setLinkMsg('✓ Link added')
        setLinkTitle(''); setLinkUrl(''); setLinkSource(''); setLinkNote('')
        await fetchLinks()
      } else {
        const d = await res.json(); setLinkMsg(`⚠ ${d.error}`)
      }
    } finally { setLinkSaving(false) }
  }

  async function deleteLink(id: string) {
    if (!confirm('Remove this link?')) return
    const token = await getToken()
    await fetch(`/api/intel-links?id=${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } })
    await fetchLinks()
  }

  const emptySeq = demons.filter(d => !d.deliveranceSequence).length
  const emptySc  = demons.filter(d => !d.counterScriptures).length

  return (
    <div>
      {/* Archive stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 28, flexWrap: 'wrap' as const }}>
        {([
          ['Total Entries', demons.length, G],
          ['Missing Del. Sequence', emptySeq, emptySeq > 0 ? '#f97316' : '#4ade80'],
          ['Missing Counter Scriptures', emptySc, emptySc > 0 ? '#f97316' : '#4ade80'],
        ] as [string, number, string][]).map(([label, val, color]) => (
          <div key={label} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: '18px 22px', flex: 1 }}>
            <div style={{ fontFamily: cinzel, fontSize: 28, color, marginBottom: 6 }}>{dLoading ? '—' : val}</div>
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: DIM, textTransform: 'uppercase' as const }}>{label}</div>
          </div>
        ))}
      </div>
      <a href="https://airtable.com/appVXEj2DLPBTJTtD/tblcP4lgVykzOhLi4" target="_blank" rel="noopener noreferrer"
        style={{ display: 'inline-block', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: '#0D0B14', background: G, borderRadius: 5, padding: '8px 18px', textDecoration: 'none', marginBottom: 32 }}>
        Open Airtable →
      </a>

      {/* Post Briefing form */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: 24, marginBottom: 28 }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: G, marginBottom: 20 }}>📡 Post Briefing</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Title *</label>
            <input value={postTitle} onChange={e => setPostTitle(e.target.value)} placeholder="Briefing title..." style={inp} />
          </div>
          <div>
            <label style={lbl}>Type</label>
            <select value={postType} onChange={e => setPostType(e.target.value)} style={{ ...inp, width: 'auto' }}>
              {['briefing', 'watch-report', 'external-alert'].map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={lbl}>Body *</label>
          <textarea value={postBody} onChange={e => setPostBody(e.target.value)} rows={6} placeholder="Write your briefing..." style={{ ...inp, resize: 'vertical' as const }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Scripture (optional)</label>
          <input value={postScripture} onChange={e => setPostSc(e.target.value)} placeholder="e.g. Ephesians 6:12" style={inp} />
        </div>
        {postMsg && <div style={{ fontFamily: crimson, fontSize: 13, color: postMsg.startsWith('✓') ? '#4ade80' : '#f87171', marginBottom: 10 }}>{postMsg}</div>}
        <button onClick={savePost} disabled={postSaving || !postTitle.trim() || !postBody.trim()}
          style={{ background: (!postTitle.trim() || !postBody.trim() || postSaving) ? 'rgba(201,168,76,0.2)' : G, color: (!postTitle.trim() || !postBody.trim() || postSaving) ? DIM : '#0D0B14', border: 'none', borderRadius: 6, padding: '10px 24px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
          {postSaving ? 'Publishing...' : 'Publish Briefing'}
        </button>
      </div>

      {/* Existing posts */}
      {posts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: DIM, marginBottom: 10 }}>Published Briefings ({posts.length})</div>
          {posts.map(p => (
            <div key={p.id} style={{ background: SURF, border: `1px solid ${BDR}`, borderLeft: `3px solid ${G}`, borderRadius: 8, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: cinzel, fontSize: 12, color: TXT }}>{p.title}</div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, marginTop: 3 }}>{p.post_type} · {fmtDate(p.created_at)}</div>
              </div>
              <button onClick={() => deletePost(p.id)} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 5, color: '#f87171', fontFamily: cinzel, fontSize: 9, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}>Delete</button>
            </div>
          ))}
        </div>
      )}

      {/* Add External Link form */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: 24, marginBottom: 28 }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: G, marginBottom: 20 }}>🔗 Add External Link</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <label style={lbl}>Title *</label>
            <input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Link title..." style={inp} />
          </div>
          <div>
            <label style={lbl}>Source</label>
            <input value={linkSource} onChange={e => setLinkSource(e.target.value)} placeholder="e.g. Daniel Duval" style={inp} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>URL *</label>
            <input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." style={inp} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={lbl}>Note (optional)</label>
            <textarea value={linkNote} onChange={e => setLinkNote(e.target.value)} rows={2} placeholder="Brief description of why this is relevant..." style={{ ...inp, resize: 'vertical' as const }} />
          </div>
        </div>
        {linkMsg && <div style={{ fontFamily: crimson, fontSize: 13, color: linkMsg.startsWith('✓') ? '#4ade80' : '#f87171', marginBottom: 10 }}>{linkMsg}</div>}
        <button onClick={saveLink} disabled={linkSaving || !linkTitle.trim() || !linkUrl.trim()}
          style={{ background: (!linkTitle.trim() || !linkUrl.trim() || linkSaving) ? 'rgba(201,168,76,0.2)' : G, color: (!linkTitle.trim() || !linkUrl.trim() || linkSaving) ? DIM : '#0D0B14', border: 'none', borderRadius: 6, padding: '10px 24px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
          {linkSaving ? 'Adding...' : 'Add Link'}
        </button>
      </div>

      {/* Existing links */}
      {links.length > 0 && (
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: DIM, marginBottom: 10 }}>Active Links ({links.length})</div>
          {links.map(l => (
            <div key={l.id} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: cinzel, fontSize: 12, color: TXT, marginBottom: 2 }}>{l.title}</div>
                <div style={{ fontSize: 11, color: DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{l.source && `${l.source} · `}{l.url}</div>
              </div>
              <button onClick={() => deleteLink(l.id)} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 5, color: '#f87171', fontFamily: cinzel, fontSize: 9, padding: '3px 10px', cursor: 'pointer', flexShrink: 0 }}>Remove</button>
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
        {tab === 'intel'      && <IntelArchive getToken={getToken} />}
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
