import { useState, useEffect, useRef, Fragment } from 'react'
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
const STREAM_APP_ID = '1609751'

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
function ArsenalManager({ getToken }: { getToken: (opts?: { template?: string }) => Promise<string | null> }) {
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
  const [bulkFiles, setBulkFiles]         = useState<File[]>([])
  const [bulkPreviews, setBulkPreviews]   = useState<any[]>([])
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [dragOver, setDragOver]           = useState(false)
  const [analyzingIdx, setAnalyzingIdx]   = useState<number>(-1)
  const [showCatManager, setShowCatManager] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [newCategory, setNewCategory]     = useState('')

  const TIERS      = ['Free', 'Soldier', 'Commander', 'General']
  const CATEGORIES = [
    'Session Tools',
    'Teaching',
    'Protocol',
    'Reference',
    'Renunciation',
    'Worksheet',
    'Scripture',
    'Prayer',
    'Deliverance Guide',
    'Inner Healing',
    'Generational Curses',
    'Soul Ties',
    'Occult & Freemasonry',
    'Sexual Bondage',
    'Mental Strongholds',
  ]
  const ALL_TAGS   = ['deliverance','prayer','freemasonry','soul-ties','generational','forgiveness','warfare','inner-healing','renunciation','assessment','protocol','worksheet','teaching','occult','sexual-bondage','rejection','fear','witchcraft','marine-kingdom','strongman','legal-rights','aftercare','session','intake']
  const allCategories = [...CATEGORIES, ...customCategories]

  async function fetchResources() {
    setResLoading(true)
    try {
      const token = await getToken({ template: undefined })
      const res = await fetch('/api/admin-resources', {
        headers: { 'Authorization': `Bearer ${token}` },
      })
      if (!res.ok) {
        const body = await res.text()
        console.error('admin-resources failed:', res.status, body)
        setResources([])
        return
      }
      const data = await res.json()
      setResources(data.resources || [])
    } catch (e) {
      console.error('fetchResources error:', e)
      setResources([])
    } finally { setResLoading(false) }
  }

  useEffect(() => { fetchResources() }, [])
  useEffect(() => {
    const stored = localStorage.getItem('wri-custom-categories')
    if (stored) setCustomCategories(JSON.parse(stored))
  }, [])

  function addCategory() {
    if (!newCategory.trim()) return
    const updated = [...customCategories, newCategory.trim()]
    setCustomCategories(updated)
    localStorage.setItem('wri-custom-categories', JSON.stringify(updated))
    setNewCategory('')
  }

  function removeCategory(cat: string) {
    const updated = customCategories.filter(c => c !== cat)
    setCustomCategories(updated)
    localStorage.setItem('wri-custom-categories', JSON.stringify(updated))
  }

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
      if (data.category && allCategories.includes(data.category)) { setCategory(data.category); filled.add('category') }
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
      {/* ── BULK UPLOAD ── */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: 24, marginBottom: 28 }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: G, marginBottom: 20 }}>📦 Bulk Upload</div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => {
            e.preventDefault()
            setDragOver(false)
            const files = Array.from(e.dataTransfer.files).filter(f =>
              f.type === 'application/pdf' || f.name.endsWith('.docx') || f.name.endsWith('.pdf')
            ).slice(0, 10)
            setBulkFiles(files)
            setBulkPreviews([])
          }}
          style={{
            border: `2px dashed ${dragOver ? G : 'rgba(201,168,76,0.3)'}`,
            borderRadius: 10,
            padding: '28px 20px',
            textAlign: 'center' as const,
            marginBottom: 24,
            background: dragOver ? 'rgba(201,168,76,0.04)' : 'transparent',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onClick={() => document.getElementById('bulk-file-input')?.click()}
        >
          <input
            id="bulk-file-input"
            type="file"
            multiple
            accept=".pdf,.docx"
            style={{ display: 'none' }}
            onChange={e => {
              const files = Array.from(e.target.files || []).slice(0, 10)
              setBulkFiles(files)
              setBulkPreviews([])
            }}
          />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
          <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.08em', marginBottom: 4 }}>
            Drag & Drop up to 10 files
          </div>
          <div style={{ fontSize: 11, color: DIM }}>PDF or DOCX · Click to browse</div>
          {bulkFiles.length > 0 && (
            <div style={{ marginTop: 10, fontSize: 11, color: G }}>
              {bulkFiles.length} file{bulkFiles.length > 1 ? 's' : ''} selected
            </div>
          )}
        </div>

        {/* AI Analyze button */}
        {bulkFiles.length > 0 && bulkPreviews.length === 0 && (
          <button
            onClick={async () => {
              setBulkProcessing(true)
              const results: any[] = []
              for (let i = 0; i < bulkFiles.length; i++) {
                setAnalyzingIdx(i)
                const file = bulkFiles[i]
                const formData = new FormData()
                formData.append('file', file)
                formData.append('aiAnalyze', 'true')
                try {
                  const token = await getToken()
                  const res = await fetch('/api/admin-upload', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                  })
                  const d = await res.json()
                  results.push({
                    file,
                    fileName: file.name,
                    title: d.title || file.name.replace(/\.[^.]+$/, ''),
                    description: d.description || '',
                    category: d.category || 'Reference',
                    tags: d.tags || [],
                    tier: d.tier || 'free',
                    fileSize: (file.size / 1024 / 1024).toFixed(1) + ' MB',
                    approved: true,
                  })
                } catch {
                  results.push({
                    file,
                    fileName: file.name,
                    title: file.name.replace(/\.[^.]+$/, ''),
                    description: '',
                    category: 'Reference',
                    tags: [],
                    tier: 'free',
                    fileSize: (file.size / 1024 / 1024).toFixed(1) + ' MB',
                    approved: true,
                    error: true,
                  })
                }
              }
              setBulkPreviews(results)
              setAnalyzingIdx(-1)
              setBulkProcessing(false)
            }}
            disabled={bulkProcessing}
            style={{ padding: '10px 24px', background: 'rgba(201,168,76,0.15)', border: `1px solid ${G}`, borderRadius: 8, color: G, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', marginBottom: 20, width: '100%', textTransform: 'uppercase' as const }}
          >
            {bulkProcessing ? `⚙ Analyzing file ${analyzingIdx + 1} of ${bulkFiles.length}...` : `✦ Analyze ${bulkFiles.length} Files with AI`}
          </button>
        )}

        {/* Review cards */}
        {bulkPreviews.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.1em', marginBottom: 14 }}>
              Review & Confirm — {bulkPreviews.filter(p => p.approved).length} of {bulkPreviews.length} selected
            </div>
            {bulkPreviews.map((preview, idx) => (
              <div key={idx} style={{
                background: preview.approved ? 'rgba(201,168,76,0.04)' : 'rgba(0,0,0,0.2)',
                border: `1px solid ${preview.approved ? 'rgba(201,168,76,0.25)' : 'rgba(255,255,255,0.05)'}`,
                borderRadius: 8, padding: '14px 16px', marginBottom: 10,
                opacity: preview.approved ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 11, color: G }}>{preview.fileName}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 10, color: DIM }}>{preview.fileSize}</span>
                    <button
                      onClick={() => setBulkPreviews(prev => prev.map((p, i) => i === idx ? { ...p, approved: !p.approved } : p))}
                      style={{ fontSize: 10, padding: '2px 10px', background: preview.approved ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${preview.approved ? G : 'rgba(255,255,255,0.1)'}`, borderRadius: 4, color: preview.approved ? G : DIM, cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.06em' }}
                    >{preview.approved ? '✓ Include' : '✗ Skip'}</button>
                  </div>
                </div>
                <input
                  value={preview.title}
                  onChange={e => setBulkPreviews(prev => prev.map((p, i) => i === idx ? { ...p, title: e.target.value } : p))}
                  style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '6px 10px', color: TXT, fontFamily: cinzel, fontSize: 11, marginBottom: 6, outline: 'none' }}
                  placeholder="Title"
                />
                <textarea
                  value={preview.description}
                  onChange={e => setBulkPreviews(prev => prev.map((p, i) => i === idx ? { ...p, description: e.target.value } : p))}
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '6px 10px', color: TXT, fontFamily: crimson, fontSize: 12, marginBottom: 6, outline: 'none', resize: 'vertical' as const }}
                  placeholder="Description"
                />
                {/* Tags input */}
                <div style={{ marginBottom: 6 }}>
                  <input
                    value={Array.isArray(preview.tags) ? preview.tags.join(', ') : preview.tags || ''}
                    onChange={e => setBulkPreviews(prev => prev.map((p, i) =>
                      i === idx ? {
                        ...p,
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean)
                      } : p
                    ))}
                    placeholder="Tags (comma separated): forgiveness, generational, soul ties..."
                    style={{
                      width: '100%',
                      boxSizing: 'border-box' as const,
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(201,168,76,0.2)',
                      borderRadius: 5,
                      padding: '6px 10px',
                      color: TXT,
                      fontFamily: crimson,
                      fontSize: 12,
                      outline: 'none',
                    }}
                  />
                </div>
                {Array.isArray(preview.tags) && preview.tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 6 }}>
                    {preview.tags.map((tag: string, ti: number) => (
                      <span key={ti} style={{
                        background: 'rgba(201,168,76,0.12)',
                        border: '1px solid rgba(201,168,76,0.3)',
                        borderRadius: 20,
                        padding: '2px 8px',
                        fontSize: 10,
                        color: G,
                        fontFamily: cinzel,
                        letterSpacing: '0.04em',
                      }}>{tag}</span>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    value={preview.tier}
                    onChange={e => setBulkPreviews(prev => prev.map((p, i) => i === idx ? { ...p, tier: e.target.value } : p))}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '5px 8px', color: TXT, fontFamily: cinzel, fontSize: 10, outline: 'none' }}
                  >
                    <option value="free">Free</option>
                    <option value="soldier">Soldier</option>
                    <option value="commander">Commander</option>
                    <option value="general">General</option>
                  </select>
                  <select
                    value={preview.category}
                    onChange={e => setBulkPreviews(prev => prev.map((p, i) => i === idx ? { ...p, category: e.target.value } : p))}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '5px 8px', color: TXT, fontFamily: cinzel, fontSize: 10, outline: 'none' }}
                  >
                    {allCategories.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            ))}

            <button
              onClick={async () => {
                setBulkUploading(true)
                const toUpload = bulkPreviews.filter(p => p.approved)
                let succeeded = 0
                for (const preview of toUpload) {
                  try {
                    const formData = new FormData()
                    formData.append('file', preview.file)
                    formData.append('title', preview.title)
                    formData.append('description', preview.description)
                    formData.append('category', preview.category)
                    formData.append('tier', preview.tier)
                    formData.append('tags', JSON.stringify(preview.tags))
                    const token = await getToken()
                    const res = await fetch('/api/admin-upload', {
                      method: 'POST',
                      headers: { Authorization: `Bearer ${token}` },
                      body: formData,
                    })
                    if (res.ok) succeeded++
                  } catch { /* silent */ }
                }
                setBulkUploading(false)
                setBulkFiles([])
                setBulkPreviews([])
                alert(`Uploaded ${succeeded} of ${toUpload.length} files successfully.`)
              }}
              disabled={bulkUploading || bulkPreviews.filter(p => p.approved).length === 0}
              style={{ width: '100%', padding: '12px', background: G, border: 'none', borderRadius: 8, color: '#0D0B14', fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' as const, fontWeight: 700 }}
            >
              {bulkUploading ? 'Uploading...' : `⚔ Upload ${bulkPreviews.filter(p => p.approved).length} Files`}
            </button>
          </div>
        )}
      </div>

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
              {allCategories.map(c => <option key={c}>{c}</option>)}
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

      {/* Category Manager */}
      <div style={{ marginTop: 24, borderTop: `1px solid rgba(201,168,76,0.15)`, paddingTop: 16 }}>
        <button
          onClick={() => setShowCatManager(c => !c)}
          style={{ background: 'none', border: 'none', color: DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}
        >
          {showCatManager ? '▲' : '▼'} Manage Custom Categories
        </button>
        {showCatManager && (
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 12 }}>
              {customCategories.map(cat => (
                <span key={cat} style={{
                  background: 'rgba(201,168,76,0.08)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: 20,
                  padding: '3px 10px',
                  fontSize: 10,
                  color: G,
                  fontFamily: cinzel,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}>
                  {cat}
                  <button
                    onClick={() => removeCategory(cat)}
                    style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 12, padding: 0, lineHeight: 1 }}
                  >×</button>
                </span>
              ))}
              {customCategories.length === 0 && (
                <span style={{ fontSize: 11, color: DIM, fontFamily: crimson, fontStyle: 'italic' }}>No custom categories yet</span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addCategory()}
                placeholder="New category name..."
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(201,168,76,0.2)',
                  borderRadius: 5,
                  padding: '6px 10px',
                  color: TXT,
                  fontFamily: cinzel,
                  fontSize: 11,
                  outline: 'none',
                }}
              />
              <button
                onClick={addCategory}
                style={{ padding: '6px 16px', background: 'rgba(201,168,76,0.15)', border: `1px solid ${G}`, borderRadius: 5, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' as const }}
              >+ Add</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── INTEL ARCHIVE — shared constants ────────────────────────────────────────
const INTEL_NAME_F = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'
const HIER_CATS = [
  'Fear / Rejection', 'Marine Kingdom', 'Occult / Witchcraft', 'Freemasonry',
  'Perversion', 'Death / Destruction', 'Religious', 'General Oppression',
]
const HIER_COLORS: Record<string, string> = {
  'Fear / Rejection': '#7C5CBF', 'Marine Kingdom': '#2D7D9A',
  'Occult / Witchcraft': '#8B1A1A', 'Freemasonry': '#B8860B',
  'Perversion': '#8B3A3A', 'Death / Destruction': '#4A4A5C',
  'Religious': '#4A5C4A', 'General Oppression': '#5C4A3A',
}
const BATTLEFIELDS = [
  'Identity and emotions', 'Mind and will',
  'Mind, sexuality, spiritual oppression', 'Control and spiritual authority',
  'Sexual purity and soul ties',
]

function blankSpiritFields(): Record<string, string> {
  return {
    [INTEL_NAME_F]: '', 'Also Known As': '', 'Type / Rank': '', 'Description': '',
    'Manifestiation': '', 'Entry Points': '', 'Legal Rights': '', 'Symptoms': '',
    'Companion Spirits': '', 'WRI Exorcist Notes': '', 'Hierarchy Category': '',
    'Parent Strongman': '', 'Deliverance Sequence': '', 'Operational Notes': '',
    'Primary Battlefield': '', 'Typical Personality Presentation': '',
    'Counter Scriptures': '', 'Scripture Reference': '', 'Source / Orgin': '',
    'Kingdom': '', 'Strongman': '', 'Assignment': '',
  }
}

function demonToSpiritFields(d: any): Record<string, string> {
  return {
    [INTEL_NAME_F]: d.name || '', 'Also Known As': d.aka || '', 'Type / Rank': d.type || '',
    'Description': d.description || '', 'Manifestiation': d.manifestation || '',
    'Entry Points': d.entryPoints || '', 'Legal Rights': d.legalRights || '',
    'Symptoms': d.symptoms || '', 'Companion Spirits': d.companionSpirits || '',
    'WRI Exorcist Notes': d.wriNotes || '', 'Hierarchy Category': d.hierarchyCategory || '',
    'Parent Strongman': d.parentStrongman || '', 'Deliverance Sequence': d.deliveranceSequence || '',
    'Operational Notes': d.operationalNotes || '', 'Primary Battlefield': d.primaryBattlefield || '',
    'Typical Personality Presentation': d.personalityPresentation || '',
    'Counter Scriptures': d.counterScriptures || '', 'Scripture Reference': d.scripture || '',
    'Source / Orgin': d.sourceOrgin || '', 'Kingdom': d.kingdom || '',
    'Strongman': d.strongman || '', 'Assignment': d.assignment || '',
  }
}

function SpiritEditForm({ fields, setField, onSave, onCancel, saving, msg }: {
  fields: Record<string, string>
  setField: (name: string, val: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  msg: string
}) {
  const i: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: '#0a0813',
    border: `1px solid ${BDR}`, borderRadius: 6, padding: '9px 11px',
    color: TXT, fontFamily: crimson, fontSize: 13, outline: 'none',
  }
  const l: React.CSSProperties = {
    display: 'block', fontFamily: cinzel, fontSize: 9,
    letterSpacing: '0.12em', color: DIM, textTransform: 'uppercase', marginBottom: 5,
  }
  const f = (name: string) => fields[name] || ''
  const ti = (name: string) => <input value={f(name)} onChange={e => setField(name, e.target.value)} style={i} />
  const ta = (name: string, rows = 3) => (
    <textarea value={f(name)} onChange={e => setField(name, e.target.value)} rows={rows}
      style={{ ...i, resize: 'vertical' as const }} />
  )
  return (
    <div style={{ background: '#09080f', border: `1px solid ${BDR}`, borderRadius: 8, padding: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Name *</label>{ti(INTEL_NAME_F)}</div>
        <div><label style={l}>Also Known As</label>{ti('Also Known As')}</div>
        <div><label style={l}>Type / Rank</label>{ti('Type / Rank')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Description</label>{ta('Description')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Manifestiation</label>{ta('Manifestiation')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Entry Points</label>{ta('Entry Points')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Legal Rights</label>{ta('Legal Rights')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Symptoms</label>{ta('Symptoms')}</div>
        <div><label style={l}>Companion Spirits</label>{ti('Companion Spirits')}</div>
        <div><label style={l}>Kingdom</label>{ti('Kingdom')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>WRI Exorcist Notes</label>{ta('WRI Exorcist Notes')}</div>
        <div>
          <label style={l}>Hierarchy Category</label>
          <select value={f('Hierarchy Category')} onChange={e => setField('Hierarchy Category', e.target.value)} style={{ ...i }}>
            <option value="">— Select —</option>
            {HIER_CATS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div><label style={l}>Parent Strongman</label>{ti('Parent Strongman')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Deliverance Sequence</label>{ta('Deliverance Sequence', 4)}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Operational Notes</label>{ta('Operational Notes')}</div>
        <div>
          <label style={l}>Primary Battlefield</label>
          <select value={f('Primary Battlefield')} onChange={e => setField('Primary Battlefield', e.target.value)} style={{ ...i }}>
            <option value="">— Select —</option>
            {BATTLEFIELDS.map(b => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div><label style={l}>Typical Personality Presentation</label>{ti('Typical Personality Presentation')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Counter Scriptures</label>{ta('Counter Scriptures')}</div>
        <div><label style={l}>Scripture Reference</label>{ti('Scripture Reference')}</div>
        <div><label style={l}>Source / Orgin</label>{ti('Source / Orgin')}</div>
        <div><label style={l}>Strongman</label>{ti('Strongman')}</div>
        <div><label style={l}>Assignment</label>{ti('Assignment')}</div>
      </div>
      {msg && <div style={{ fontFamily: crimson, fontSize: 13, color: msg.startsWith('✓') ? '#4ade80' : '#f87171', marginTop: 12 }}>{msg}</div>}
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={onSave} disabled={saving}
          style={{ background: saving ? 'rgba(201,168,76,0.2)' : G, color: saving ? DIM : '#0D0B14', border: 'none', borderRadius: 6, padding: '9px 22px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: saving ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving...' : '✓ Save'}
        </button>
        <button onClick={onCancel}
          style={{ background: 'transparent', color: DIM, border: `1px solid ${BDR}`, borderRadius: 6, padding: '9px 18px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
          Cancel
        </button>
      </div>
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

  // Posts
  const [posts, setPosts]           = useState<any[]>([])
  const [postTitle, setPostTitle]   = useState('')
  const [postBody, setPostBody]     = useState('')
  const [postScripture, setPostSc]  = useState('')
  const [postType, setPostType]     = useState('briefing')
  const [postSaving, setPostSaving]     = useState(false)
  const [postMsg, setPostMsg]           = useState('')
  const [editingPostId, setEditingPostId] = useState<string | null>(null)

  // Links
  const [links, setLinks]           = useState<any[]>([])
  const [linkTitle, setLinkTitle]   = useState('')
  const [linkUrl, setLinkUrl]       = useState('')
  const [linkSource, setLinkSource] = useState('')
  const [linkNote, setLinkNote]     = useState('')
  const [linkSaving, setLinkSaving] = useState(false)
  const [linkMsg, setLinkMsg]       = useState('')

  // Demons
  const [demons, setDemons]     = useState<any[]>([])
  const [dLoading, setDLoading] = useState(true)
  const [quickFilter, setQuickFilter] = useState<'all' | 'missing-seq' | 'missing-sc' | 'missing-notes' | 'recent'>('all')

  // Table controls
  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [sortCol, setSortCol]     = useState<'name' | 'type' | 'hierarchyCategory'>('name')
  const [sortDir, setSortDir]     = useState<'asc' | 'desc'>('asc')
  const [page, setPage]           = useState(0)
  const PAGE_SIZE = 20

  // Edit
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editFields, setEditFields] = useState<Record<string, string>>({})
  const [editSaving, setEditSaving] = useState(false)
  const [editMsg, setEditMsg]       = useState('')

  // New spirit
  const [showNew, setShowNew]     = useState(false)
  const [newFields, setNewFields] = useState<Record<string, string>>(blankSpiritFields())
  const [newSaving, setNewSaving] = useState(false)
  const [newMsg, setNewMsg]       = useState('')

  async function fetchDemons() {
    setDLoading(true)
    try {
      const res = await fetch('/api/demons')
      const d = await res.json()
      setDemons(d.demons || [])
      if (d.demons?.length > 0) {
        console.log('DEMON SAMPLE KEYS:', Object.keys(d.demons[0] || {}))
        console.log('DEMON SAMPLE VALUES:', JSON.stringify(d.demons[0] || {}))
      }
    } catch { setDemons([]) }
    finally { setDLoading(false) }
  }
  async function fetchPosts() {
    try {
      const res = await fetch('/api/intel-posts')
      const d = await res.json()
      setPosts(d.posts || [])
    } catch { setPosts([]) }
  }
  async function fetchLinks() {
    try {
      const res = await fetch('/api/intel-links')
      const d = await res.json()
      setLinks(d.links || [])
    } catch { setLinks([]) }
  }

  useEffect(() => { fetchPosts(); fetchLinks(); fetchDemons() }, [])
  const emptySeq = dLoading ? null : demons.filter(d => {
    const val = d.deliveranceSequence || d['Deliverance Sequence'] || d.deliverance_sequence
    return !val || String(val).trim() === ''
  }).length
  const emptySc = dLoading ? null : demons.filter(d => {
    const val = d.counterScriptures || d['Counter Scriptures'] || d.counter_scriptures
    return !val || String(val).trim() === ''
  }).length
  const emptyNotes = dLoading ? null : demons.filter(d =>
    !d.operationalNotes || String(d.operationalNotes).trim() === ''
  ).length
  const recentlyAdded = dLoading ? null : demons.filter(d => {
    if (!d.createdTime) return false
    return Date.now() - new Date(d.createdTime).getTime() < 30 * 24 * 60 * 60 * 1000
  }).length

  // Filtered + sorted + paginated
  const filtered = demons
    .filter(d => quickFilter === 'missing-seq'   ? (!d.deliveranceSequence || String(d.deliveranceSequence).trim() === '') :
                 quickFilter === 'missing-sc'    ? (!d.counterScriptures  || String(d.counterScriptures).trim()  === '') :
                 quickFilter === 'missing-notes' ? (!d.operationalNotes   || String(d.operationalNotes).trim()   === '') :
                 quickFilter === 'recent'        ? (d.createdTime ? (Date.now() - new Date(d.createdTime).getTime() < 30*24*60*60*1000) : false) : true)
    .filter(d => !search || d.name.toLowerCase().includes(search.toLowerCase()))
    .filter(d => !filterCat || d.hierarchyCategory === filterCat)
    .sort((a, b) => {
      const va = (a[sortCol] || '').toLowerCase()
      const vb = (b[sortCol] || '').toLowerCase()
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    })
  const pageCount = Math.ceil(filtered.length / PAGE_SIZE) || 1
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function handleSort(col: 'name' | 'type' | 'hierarchyCategory') {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
    setPage(0)
  }

  function startEdit(d: any) {
    setEditingId(d.airtableId)
    setEditFields(demonToSpiritFields(d))
    setEditMsg('')
    setShowNew(false)
  }

  async function saveEdit() {
    if (!editingId) return
    setEditSaving(true); setEditMsg('')
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-demon', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ id: editingId, fields: editFields }),
      })
      if (res.ok) {
        setEditMsg('✓ Saved')
        await fetchDemons()
        setTimeout(() => { setEditingId(null); setEditMsg('') }, 1200)
      } else {
        const d = await res.json(); setEditMsg(`⚠ ${d.error}`)
      }
    } finally { setEditSaving(false) }
  }

  async function saveNew() {
    setNewSaving(true); setNewMsg('')
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-demon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fields: newFields }),
      })
      if (res.ok) {
        setNewMsg('✓ Spirit created')
        await fetchDemons()
        setTimeout(() => { setShowNew(false); setNewMsg(''); setNewFields(blankSpiritFields()) }, 1200)
      } else {
        const d = await res.json(); setNewMsg(`⚠ ${d.error}`)
      }
    } finally { setNewSaving(false) }
  }

  async function savePost() {
    if (!postTitle.trim() || !postBody.trim()) return
    setPostSaving(true); setPostMsg('')
    try {
      const token = await getToken()
      const url    = editingPostId ? `/api/intel-posts?id=${editingPostId}` : '/api/intel-posts'
      const method = editingPostId ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title: postTitle.trim(), body: postBody.trim(), scripture: postScripture.trim() || undefined, post_type: postType }),
      })
      if (res.ok) {
        setPostMsg(editingPostId ? '✓ Briefing updated' : '✓ Briefing published')
        setPostTitle(''); setPostBody(''); setPostSc(''); setPostType('briefing'); setEditingPostId(null)
        await fetchPosts()
      } else {
        const d = await res.json(); setPostMsg(`⚠ ${d.error}`)
      }
    } finally { setPostSaving(false) }
  }

  function startEditPost(p: any) {
    setPostTitle(p.title)
    setPostBody(p.body)
    setPostSc(p.scripture || '')
    setPostType(p.post_type || 'briefing')
    setEditingPostId(p.id)
    setPostMsg('')
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

  function exportCSV() {
    const headers = ['Name', 'Type', 'Hierarchy Category', 'Deliverance Sequence', 'Counter Scriptures', 'Entry Points', 'Legal Rights']
    const rows = filtered.map(d => [
      d.name, d.type, d.hierarchyCategory, d.deliveranceSequence, d.counterScriptures, d.entryPoints, d.legalRights,
    ].map(v => `"${(v || '').replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'intel-archive.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const thS: React.CSSProperties = {
    fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM,
    textTransform: 'uppercase', padding: '10px 12px', textAlign: 'left',
    borderBottom: `1px solid ${BDR}`, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap',
  }
  const tdS: React.CSSProperties = {
    padding: '9px 12px', fontFamily: crimson, fontSize: 13, color: TXT,
    borderBottom: `1px solid rgba(201,168,76,0.07)`, verticalAlign: 'top',
  }
  const sortInd = (col: string) => sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ' ↕'

  return (
    <div>
      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' as const }}>
        {([
          ['Total Entries',              dLoading ? null : demons.length, G,                                            'all'        ],
          ['Missing Notes',    emptyNotes,    emptyNotes === null || emptyNotes === 0 ? '#4ade80' : '#f97316', 'missing-notes'],
          ['Added This Month', recentlyAdded, recentlyAdded === null ? '#4ade80' : G,                         'recent'       ],
        ] as [string, number | null, string, 'all' | 'missing-seq' | 'missing-sc' | 'missing-notes' | 'recent'][]).map(([label, val, color, qf]) => (
          <button key={label}
            onClick={() => { if (!dLoading) { setQuickFilter(qf === quickFilter ? 'all' : qf); setPage(0) } }}
            style={{ background: quickFilter === qf ? `${color}15` : SURF, border: `1px solid ${quickFilter === qf ? color : BDR}`, borderRadius: 10, padding: '18px 22px', flex: 1, cursor: dLoading ? 'default' : 'pointer', textAlign: 'left' as const, transition: 'all 0.15s' }}>
            <div style={{ fontFamily: cinzel, fontSize: 28, color, marginBottom: 6 }}>{val === null ? '...' : val}</div>
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: DIM, textTransform: 'uppercase' as const }}>{label}</div>
          </button>
        ))}
      </div>

      {/* Subtle Airtable link */}
      <div style={{ textAlign: 'right' as const, marginBottom: 22 }}>
        <a href="https://airtable.com/appVXEj2DLPBTJTtD/tblcP4lgVykzOhLi4" target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: DIM, textDecoration: 'none', opacity: 0.65 }}>
          View raw data in Airtable →
        </a>
      </div>

      {/* Table toolbar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center', flexWrap: 'wrap' as const }}>
        <button
          onClick={() => { setShowNew(s => { if (!s) { setNewFields(blankSpiritFields()); setNewMsg('') }; return !s }); setEditingId(null) }}
          style={{ background: showNew ? 'rgba(201,168,76,0.12)' : G, color: showNew ? G : '#0D0B14', border: showNew ? `1px solid ${G}` : 'none', borderRadius: 6, padding: '8px 16px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
          {showNew ? '✕ Cancel New' : '+ Add Spirit'}
        </button>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} placeholder="Search spirits by name..."
          style={{ ...inp, flex: 1, minWidth: 160, fontSize: 13, padding: '8px 12px' }} />
        <select value={filterCat} onChange={e => { setFilterCat(e.target.value); setPage(0) }}
          style={{ ...inp, width: 'auto', fontSize: 12, padding: '8px 12px' }}>
          <option value="">All Categories</option>
          {HIER_CATS.map(c => <option key={c}>{c}</option>)}
        </select>
        <button onClick={exportCSV} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 5, padding: '7px 14px', color: DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer', flexShrink: 0 }}>↓ CSV</button>
        {quickFilter !== 'all' && (
          <button onClick={() => setQuickFilter('all')} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 999, padding: '3px 12px', color: G, fontSize: 11, fontFamily: cinzel, cursor: 'pointer', flexShrink: 0 }}>
            ✕ {quickFilter === 'missing-seq' ? 'Missing Sequence' : quickFilter === 'missing-sc' ? 'Missing Scriptures' : quickFilter === 'missing-notes' ? 'Missing Notes' : 'Recent Additions'}
          </button>
        )}
      </div>

      {/* New Spirit form */}
      {showNew && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.1em', marginBottom: 10 }}>✦ New Spirit Entry</div>
          <SpiritEditForm
            fields={newFields}
            setField={(name, val) => setNewFields(prev => ({ ...prev, [name]: val }))}
            onSave={saveNew}
            onCancel={() => { setShowNew(false); setNewMsg('') }}
            saving={newSaving}
            msg={newMsg}
          />
        </div>
      )}

      {/* Spirit table */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: SURF2 }}>
                <th style={thS} onClick={() => handleSort('name')}>Name{sortInd('name')}</th>
                <th style={thS} onClick={() => handleSort('type')}>Type{sortInd('type')}</th>
                <th style={thS} onClick={() => handleSort('hierarchyCategory')}>Category{sortInd('hierarchyCategory')}</th>
                <th style={{ ...thS, cursor: 'default' }}>Del. Sequence</th>
                <th style={{ ...thS, cursor: 'default' }}>Counter Scriptures</th>
                <th style={{ ...thS, cursor: 'default', width: 70 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dLoading ? (
                <tr><td colSpan={6} style={{ ...tdS, textAlign: 'center', color: DIM, padding: 32, fontStyle: 'italic' }}>Loading spirits...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={6} style={{ ...tdS, textAlign: 'center', color: DIM, padding: 32, fontStyle: 'italic' }}>{quickFilter !== 'all' ? 'No spirits found with this filter. Try clearing the filter.' : 'No spirits found.'}</td></tr>
              ) : paginated.map(d => (
                <Fragment key={d.airtableId || d.id}>
                  <tr style={{ background: editingId === d.airtableId ? 'rgba(201,168,76,0.05)' : 'transparent', transition: 'background 0.15s' }}>
                    <td style={{ ...tdS, fontFamily: cinzel, fontSize: 11, maxWidth: 160, wordBreak: 'break-word' as const }}>{d.name}</td>
                    <td style={{ ...tdS, color: DIM, maxWidth: 110, fontSize: 12 }}>{d.type || '—'}</td>
                    <td style={{ ...tdS }}>
                      {d.hierarchyCategory ? (
                        <span style={{
                          background: (HIER_COLORS[d.hierarchyCategory] || '#555') + '28',
                          color: HIER_COLORS[d.hierarchyCategory] || DIM,
                          border: `1px solid ${(HIER_COLORS[d.hierarchyCategory] || '#555')}44`,
                          borderRadius: 999, padding: '2px 8px', fontSize: 9,
                          fontFamily: cinzel, letterSpacing: '0.04em', whiteSpace: 'nowrap' as const,
                        }}>{d.hierarchyCategory}</span>
                      ) : <span style={{ color: DIM }}>—</span>}
                    </td>
                    <td style={{ ...tdS, color: DIM, maxWidth: 150, fontSize: 12 }}>
                      {d.deliveranceSequence
                        ? d.deliveranceSequence.slice(0, 60) + (d.deliveranceSequence.length > 60 ? '…' : '')
                        : <span style={{ color: '#f97316', fontSize: 10 }}>⚠ Empty</span>}
                    </td>
                    <td style={{ ...tdS, color: DIM, maxWidth: 150, fontSize: 12 }}>
                      {d.counterScriptures
                        ? d.counterScriptures.slice(0, 60) + (d.counterScriptures.length > 60 ? '…' : '')
                        : <span style={{ color: '#f97316', fontSize: 10 }}>⚠ Empty</span>}
                    </td>
                    <td style={{ ...tdS }}>
                      <button
                        onClick={() => editingId === d.airtableId ? setEditingId(null) : startEdit(d)}
                        style={{ background: 'transparent', border: `1px solid ${editingId === d.airtableId ? G : BDR}`, borderRadius: 5, color: editingId === d.airtableId ? G : DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                        {editingId === d.airtableId ? 'Close' : 'Edit'}
                      </button>
                    </td>
                  </tr>
                  {editingId === d.airtableId && (
                    <tr>
                      <td colSpan={6} style={{ padding: '4px 12px 16px' }}>
                        <SpiritEditForm
                          fields={editFields}
                          setField={(name, val) => setEditFields(prev => ({ ...prev, [name]: val }))}
                          onSave={saveEdit}
                          onCancel={() => { setEditingId(null); setEditMsg('') }}
                          saving={editSaving}
                          msg={editMsg}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {pageCount > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderTop: `1px solid ${BDR}` }}>
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 5, color: page === 0 ? DIM : G, fontFamily: cinzel, fontSize: 9, padding: '5px 14px', cursor: page === 0 ? 'not-allowed' : 'pointer', opacity: page === 0 ? 0.5 : 1 }}>
              ← Prev
            </button>
            <span style={{ fontFamily: cinzel, fontSize: 9, color: DIM }}>
              {page + 1} / {pageCount} · {filtered.length} spirits
            </span>
            <button disabled={page >= pageCount - 1} onClick={() => setPage(p => p + 1)}
              style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 5, color: page >= pageCount - 1 ? DIM : G, fontFamily: cinzel, fontSize: 9, padding: '5px 14px', cursor: page >= pageCount - 1 ? 'not-allowed' : 'pointer', opacity: page >= pageCount - 1 ? 0.5 : 1 }}>
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Post Briefing form */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: G }}>
            {editingPostId ? '✏ Edit Briefing' : '📡 Post Briefing'}
          </div>
          {editingPostId && (
            <button onClick={() => { setEditingPostId(null); setPostTitle(''); setPostBody(''); setPostSc(''); setPostType('briefing'); setPostMsg('') }}
              style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 5, color: DIM, fontFamily: cinzel, fontSize: 9, padding: '3px 10px', cursor: 'pointer' }}>
              ✕ Cancel Edit
            </button>
          )}
        </div>
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
          <div style={{ textAlign: 'right' as const, fontSize: 10, color: DIM, marginTop: 3 }}>{postBody.length} chars</div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={lbl}>Scripture (optional)</label>
          <input value={postScripture} onChange={e => setPostSc(e.target.value)} placeholder="e.g. Ephesians 6:12" style={inp} />
        </div>
        {postMsg && <div style={{ fontFamily: crimson, fontSize: 13, color: postMsg.startsWith('✓') ? '#4ade80' : '#f87171', marginBottom: 10 }}>{postMsg}</div>}
        <button onClick={savePost} disabled={postSaving || !postTitle.trim() || !postBody.trim()}
          style={{ background: (!postTitle.trim() || !postBody.trim() || postSaving) ? 'rgba(201,168,76,0.2)' : G, color: (!postTitle.trim() || !postBody.trim() || postSaving) ? DIM : '#0D0B14', border: 'none', borderRadius: 6, padding: '10px 24px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
          {postSaving ? (editingPostId ? 'Saving...' : 'Publishing...') : (editingPostId ? 'Save Changes' : 'Publish Briefing')}
        </button>
      </div>

      {posts.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: DIM, marginBottom: 10 }}>Published Briefings ({posts.length})</div>
          {posts.map(p => (
            <div key={p.id} style={{ background: SURF, border: `1px solid ${BDR}`, borderLeft: `3px solid ${G}`, borderRadius: 8, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: cinzel, fontSize: 12, color: TXT }}>{p.title}</div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, marginTop: 3 }}>{p.post_type} · {fmtDate(p.created_at)}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => startEditPost(p)} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 5, color: DIM, fontFamily: cinzel, fontSize: 9, padding: '3px 10px', cursor: 'pointer' }}>Edit</button>
                <button onClick={() => deletePost(p.id)} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 5, color: '#f87171', fontFamily: cinzel, fontSize: 9, padding: '3px 10px', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add External Link form */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: 24, marginBottom: 28 }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: G, marginBottom: 20 }}>🔗 Add External Link</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div><label style={lbl}>Title *</label><input value={linkTitle} onChange={e => setLinkTitle(e.target.value)} placeholder="Link title..." style={inp} /></div>
          <div><label style={lbl}>Source</label><input value={linkSource} onChange={e => setLinkSource(e.target.value)} placeholder="e.g. Daniel Duval" style={inp} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>URL *</label><input value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." style={inp} /></div>
          <div style={{ gridColumn: '1 / -1' }}><label style={lbl}>Note (optional)</label><textarea value={linkNote} onChange={e => setLinkNote(e.target.value)} rows={2} placeholder="Brief description of why this is relevant..." style={{ ...inp, resize: 'vertical' as const }} /></div>
        </div>
        {linkMsg && <div style={{ fontFamily: crimson, fontSize: 13, color: linkMsg.startsWith('✓') ? '#4ade80' : '#f87171', marginBottom: 10 }}>{linkMsg}</div>}
        <button onClick={saveLink} disabled={linkSaving || !linkTitle.trim() || !linkUrl.trim()}
          style={{ background: (!linkTitle.trim() || !linkUrl.trim() || linkSaving) ? 'rgba(201,168,76,0.2)' : G, color: (!linkTitle.trim() || !linkUrl.trim() || linkSaving) ? DIM : '#0D0B14', border: 'none', borderRadius: 6, padding: '10px 24px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer' }}>
          {linkSaving ? 'Adding...' : 'Add Link'}
        </button>
      </div>

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
// ─── MODERATION PANEL ────────────────────────────────────────────────────────
const FB_STATUS_COLORS: Record<string, string> = {
  'open': G, 'in-progress': '#38bdf8', 'resolved': '#4ade80', 'closed': '#6b7280',
}

function ModerationPanel({ getToken }: { getToken: (opts?: { template?: string }) => Promise<string | null> }) {
  const [feedback, setFeedback]   = useState<any[]>([])
  const [fbLoading, setFbLoading] = useState(true)
  const [editingFb, setEditingFb] = useState<string | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editNotes, setEditNotes]   = useState('')
  const [testimonies, setTestimonies] = useState<any[]>([])
  const [testLoading, setTestLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const token = await getToken()
      const res = await fetch('/api/testimonies?all=true', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setTestimonies(d.testimonies || []) }
      setTestLoading(false)
    }
    load()
  }, [])

  useEffect(() => {
    async function load() {
      const token = await getToken()
      const res = await fetch('/api/feedback', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setFeedback(d.feedback || []) }
      setFbLoading(false)
    }
    load()
  }, [])

  async function updateFeedback(id: string) {
    const token = await getToken()
    await fetch(`/api/feedback?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: editStatus, admin_notes: editNotes }),
    })
    setFeedback(prev => prev.map(f => f.id === id ? { ...f, status: editStatus, admin_notes: editNotes } : f))
    setEditingFb(null)
  }

  async function deleteFeedback(id: string) {
    if (!confirm('Delete this report?')) return
    const token = await getToken()
    await fetch(`/api/feedback?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setFeedback(prev => prev.filter(f => f.id !== id))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em', marginBottom: 4 }}>🛡 Moderation — Community Feedback</div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: DIM }}>{feedback.length} report{feedback.length !== 1 ? 's' : ''} submitted by members</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <a href="/community" style={{ display: 'inline-block', background: 'transparent', border: `1px solid ${BDR}`, color: DIM, borderRadius: 5, padding: '6px 14px', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', textDecoration: 'none' }}>Community →</a>
          <a href={`https://dashboard.getstream.io/app/${STREAM_APP_ID}/moderation`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: 'transparent', border: `1px solid ${BDR}`, color: DIM, borderRadius: 5, padding: '6px 14px', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', textDecoration: 'none' }}>Stream →</a>
        </div>
      </div>

      {fbLoading ? (
        <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', padding: '20px 0' }}>Loading feedback...</div>
      ) : feedback.length === 0 ? (
        <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: '32px 24px', textAlign: 'center' as const }}>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: DIM }}>No feedback submitted yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {feedback.map(fb => (
            <div key={fb.id} style={{ background: SURF, border: `1px solid ${BDR}`, borderLeft: `3px solid ${fb.type === 'bug' ? '#f87171' : G}`, borderRadius: 10, padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' as const, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 13 }}>{fb.type === 'bug' ? '🐛' : '✦'}</span>
                  <span style={{ fontFamily: cinzel, fontSize: 12, color: fb.type === 'bug' ? '#f87171' : G }}>{fb.title}</span>
                  <span style={{ fontSize: 9, fontFamily: cinzel, padding: '2px 8px', borderRadius: 999, background: `${FB_STATUS_COLORS[fb.status] || DIM}20`, color: FB_STATUS_COLORS[fb.status] || DIM, border: `1px solid ${FB_STATUS_COLORS[fb.status] || DIM}40` }}>{fb.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 10, color: DIM }}>{fb.submitted_by_name} · {fb.submitted_by_tier} · {fb.priority}</span>
                  <button onClick={() => { setEditingFb(fb.id); setEditStatus(fb.status); setEditNotes(fb.admin_notes || '') }} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, color: DIM, fontFamily: cinzel, fontSize: 9, padding: '2px 8px', cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => deleteFeedback(fb.id)} style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 4, color: '#f87171', fontFamily: cinzel, fontSize: 9, padding: '2px 8px', cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: TXT, lineHeight: 1.5, marginBottom: fb.admin_notes ? 8 : 0 }}>{fb.description}</div>
              {fb.admin_notes && <div style={{ fontSize: 12, color: DIM, fontStyle: 'italic', fontFamily: crimson }}>Admin: {fb.admin_notes}</div>}
              {editingFb === fb.id && (
                <div style={{ marginTop: 12, padding: '12px 14px', background: SURF2, borderRadius: 8, display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.1em' }}>STATUS</label>
                    <select value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 4, color: TXT, fontFamily: crimson, fontSize: 12, padding: '3px 8px' }}>
                      {['open', 'in-progress', 'resolved', 'closed'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} placeholder="Admin notes..." style={{ background: BG, border: `1px solid ${BDR}`, borderRadius: 4, color: TXT, fontFamily: crimson, fontSize: 13, padding: '6px 8px', resize: 'vertical' as const, outline: 'none' }} />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => updateFeedback(fb.id)} style={{ background: G, color: '#0D0B14', border: 'none', borderRadius: 4, padding: '5px 14px', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>Save</button>
                    <button onClick={() => setEditingFb(null)} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, color: DIM, padding: '5px 14px', fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>Cancel</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TESTIMONY QUEUE ── */}
      <div style={{ marginTop: 32, borderTop: `1px solid ${BDR}`, paddingTop: 24 }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.1em', marginBottom: 14 }}>
          TESTIMONY QUEUE — {testimonies.filter(t => t.status === 'pending').length} pending
        </div>
        {testLoading ? (
          <div style={{ color: DIM, fontFamily: crimson, fontStyle: 'italic', padding: '20px 0' }}>Loading...</div>
        ) : (
          <div>
            {testimonies.map(t => (
              <div key={t.id} style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid ${BDR}`, borderRadius: 8, padding: '14px 16px', marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div>
                    <div style={{ fontFamily: cinzel, fontSize: 12, color: TXT, marginBottom: 2 }}>{t.title}</div>
                    <div style={{ fontSize: 10, color: DIM }}>{t.user_name} · {t.category} · {new Date(t.created_at).toLocaleDateString()}</div>
                  </div>
                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: t.status === 'approved' ? 'rgba(74,222,128,0.1)' : t.status === 'rejected' ? 'rgba(239,68,68,0.1)' : 'rgba(201,168,76,0.1)', color: t.status === 'approved' ? '#4ade80' : t.status === 'rejected' ? '#ef4444' : G, fontFamily: cinzel, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                    {t.status}
                  </span>
                </div>
                <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, lineHeight: 1.5, marginBottom: 10 }}>
                  {t.body.slice(0, 150)}{t.body.length > 150 ? '...' : ''}
                </div>
                {t.status === 'pending' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={async () => {
                        const token = await getToken()
                        await fetch(`/api/testimonies?id=${t.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ status: 'approved' }),
                        })
                        setTestimonies(prev => prev.map(x => x.id === t.id ? { ...x, status: 'approved', approved_at: new Date().toISOString() } : x))
                      }}
                      style={{ padding: '4px 14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 5, color: '#4ade80', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' as const }}
                    >✓ Approve</button>
                    <button
                      onClick={async () => {
                        const token = await getToken()
                        await fetch(`/api/testimonies?id=${t.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                          body: JSON.stringify({ status: 'rejected' }),
                        })
                        setTestimonies(prev => prev.map(x => x.id === t.id ? { ...x, status: 'rejected' } : x))
                      }}
                      style={{ padding: '4px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#ef4444', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' as const }}
                    >✗ Reject</button>
                  </div>
                )}
              </div>
            ))}
            {testimonies.length === 0 && (
              <div style={{ color: DIM, fontFamily: crimson, fontStyle: 'italic', fontSize: 13 }}>No testimonies yet</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

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
  console.log('[AdminPage] role:', role, 'publicMetadata:', user?.publicMetadata)
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
        {tab === 'moderation' && <ModerationPanel getToken={getToken} />}
      </div>
    </div>
  )
}
