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
  const [topic, setTopic]           = useState('General Ministry')
  const [tags, setTags]             = useState<string[]>([])
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
  const TOPICS = [
    'Soul Ties', 'Generational Curses', 'Forgiveness', 'Ungodly Vows',
    'Freemasonry & Secret Societies', 'Sexual Bondage', 'Fear & Rejection',
    'Identity & Sonship', 'Inner Healing', 'Witchcraft & Occult',
    'Marine Kingdom', 'Mind Control', 'Leviathan & Pride', 'Jezebel & Control',
    'Python & Constriction', 'Deliverance Foundations', 'Aftercare',
    'Prayer & Intercession', 'Scripture Reference', 'General Ministry',
  ]
  const FUNCTION_TAGS = [
    'Renunciation Prayer', 'Worksheet', 'Teaching', 'Protocol', 'Session Tool',
    'Scripture Reference', 'Aftercare', 'Assessment Tool', 'Quick Reference',
    'Leader Guide', 'Self-Deliverance', 'Group Exercise',
  ]
  const allTopics = [...TOPICS, ...customCategories]

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
      if (data.topic && allTopics.includes(data.topic)) { setTopic(data.topic); filled.add('topic') }
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

  async function handleUpload() {
    if (!file || !title.trim()) return
    setUploading(true); setUploadMsg(''); setUploadErr('')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('title', title.trim())
    fd.append('description', description.trim())
    fd.append('tier', tier)
    fd.append('topic', topic)
    fd.append('tags', JSON.stringify(tags))
    try {
      const res = await authFetch('/api/admin-upload', getToken, { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      setUploadMsg(`✓ "${data.resource?.title}" uploaded successfully`)
      setFile(null); setTitle(''); setDesc(''); setTags([]); setTopic('General Ministry'); setAiFields(new Set()); setAiSuggested(false)
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
                    topic: d.topic || d.category || 'General Ministry',
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
                    topic: 'General Ministry',
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
                {/* Function Tags checklist */}
                <div style={{ marginBottom: 6 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: 5 }}>Function Tags</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
                    {FUNCTION_TAGS.map(tag => {
                      const selected = (Array.isArray(preview.tags) ? preview.tags : []).includes(tag)
                      return (
                        <button key={tag}
                          onClick={() => setBulkPreviews(prev => prev.map((p, i) => {
                            if (i !== idx) return p
                            const cur = Array.isArray(p.tags) ? p.tags : []
                            return { ...p, tags: selected ? cur.filter((t: string) => t !== tag) : [...cur, tag] }
                          }))}
                          style={{ padding: '3px 10px', background: selected ? 'rgba(201,168,76,0.2)' : 'transparent', border: `1px solid ${selected ? G : 'rgba(201,168,76,0.2)'}`, borderRadius: 20, color: selected ? G : DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s' }}>
                          {selected ? '✓ ' : ''}{tag}
                        </button>
                      )
                    })}
                  </div>
                </div>
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
                    value={preview.topic || preview.category || 'General Ministry'}
                    onChange={e => setBulkPreviews(prev => prev.map((p, i) => i === idx ? { ...p, topic: e.target.value } : p))}
                    style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '5px 8px', color: TXT, fontFamily: cinzel, fontSize: 10, outline: 'none' }}
                  >
                    {allTopics.map(c => <option key={c}>{c}</option>)}
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
                    formData.append('topic', preview.topic || preview.category || 'General Ministry')
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
              Topic{aiFields.has('topic') && <AiBadge />}
            </label>
            <select
              value={topic}
              onChange={e => { setTopic(e.target.value); setAiFields(prev => { const n = new Set(prev); n.delete('topic'); return n }) }}
              style={{ ...inputStyle }}
            >
              {allTopics.map(c => <option key={c}>{c}</option>)}
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

          {/* Function Tags checklist */}
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>
              Function Tags{aiFields.has('tags') && <AiBadge />}
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 5 }}>
              {FUNCTION_TAGS.map(tag => {
                const selected = tags.includes(tag)
                return (
                  <button key={tag}
                    onClick={() => setTags(prev => selected ? prev.filter(t => t !== tag) : [...prev, tag])}
                    style={{ padding: '3px 10px', background: selected ? 'rgba(201,168,76,0.2)' : 'transparent', border: `1px solid ${selected ? G : 'rgba(201,168,76,0.2)'}`, borderRadius: 20, color: selected ? G : DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', transition: 'all 0.15s' }}>
                    {selected ? '✓ ' : ''}{tag}
                  </button>
                )
              })}
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
                  <span style={{ fontFamily: cinzel, fontSize: 8, color: DIM }}>{r.topic || r.category}</span>
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
          {showCatManager ? '▲' : '▼'} Manage Custom Topics
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
    'Phonetic': '', 'Images': '', 'Related Spirits': '',
    'Biblical Rank': '', 'Transmission Vectors': '', 'Case Type': '', 'Cluster Spirits': '',
    'Session Indicators': '', 'Demonic Agreements': '', 'Aftercare Notes': '',
    'Etymology Notes': '', 'Archaeology Notes': '', 'Scripture Context': '',
    'Resistance Signature': '', 'Institutional Expression': '', 'Prayer Points': '',
    'Legal Rights Framework': '',
    'Is Generational': 'false', 'Is Territorial': 'false',
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
    'Source / Orgin': d.sourceOrigin || '', 'Kingdom': d.kingdom || '',
    'Strongman': d.strongman || '', 'Assignment': d.assignment || '',
    'Phonetic': d.phonetic || '',
    'Images': Array.isArray(d.images) ? d.images.join('\n') : d.images || '',
    'Related Spirits': d.relatedSpirits || '',
    'Biblical Rank': d.biblicalRank || '',
    'Transmission Vectors': d.transmissionVectors || '',
    'Case Type': d.caseType || '',
    'Cluster Spirits': d.clusterSpirits || '',
    'Session Indicators': d.sessionIndicators || '',
    'Demonic Agreements': d.demonicAgreements || '',
    'Aftercare Notes': d.aftercareNotes || '',
    'Etymology Notes': d.etymologyNotes || '',
    'Archaeology Notes': d.archaeologyNotes || '',
    'Scripture Context': d.scriptureContext || '',
    'Resistance Signature': d.resistanceSignature || '',
    'Institutional Expression': d.institutionalExpression || '',
    'Prayer Points': d.prayerPoints || '',
    'Legal Rights Framework': d.legalRightsFramework || '',
    'Is Generational': String(d.isGenerational || false),
    'Is Territorial': String(d.isTerritorial || false),
  }
}

function SpiritTypeahead({ value, onChange, demons, mode, placeholder }: {
  value: string
  onChange: (val: string) => void
  demons: any[]
  mode: 'single' | 'multi'
  placeholder?: string
}) {
  const [localInput, setLocalInput] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = mode === 'multi' ? value.split(',').map(s => s.trim()).filter(Boolean) : []
  const filterText = mode === 'single' ? value : localInput
  const suggestions = filterText.length > 0
    ? demons
        .filter(d => d.name && d.name.toLowerCase().includes(filterText.toLowerCase()))
        .filter(d => mode === 'multi' ? !selected.includes(d.name) : true)
        .slice(0, 8)
    : []

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const, background: '#0a0813',
    border: `1px solid ${BDR}`, borderRadius: 6, padding: '9px 11px',
    color: TXT, fontFamily: crimson, fontSize: 13, outline: 'none',
  }

  const handleSelect = (name: string) => {
    if (mode === 'single') {
      onChange(name)
    } else {
      onChange([...selected, name].join(', '))
      setLocalInput('')
    }
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {mode === 'multi' && selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 8 }}>
          {selected.map(name => (
            <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(201,168,76,0.1)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 20, padding: '3px 10px', fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.06em' }}>
              {name}
              <button onMouseDown={e => { e.preventDefault(); onChange(selected.filter(s => s !== name).join(', ')) }}
                style={{ background: 'none', border: 'none', color: G, cursor: 'pointer', padding: 0, fontSize: 11, lineHeight: 1 }}>✕</button>
            </span>
          ))}
        </div>
      )}
      <input
        value={mode === 'single' ? value : localInput}
        onChange={e => {
          if (mode === 'single') { onChange(e.target.value); setOpen(true) }
          else { setLocalInput(e.target.value); setOpen(true) }
        }}
        onFocus={() => { if (filterText.length > 0) setOpen(true) }}
        placeholder={placeholder || (mode === 'multi' ? 'Type spirit name to add...' : 'Type to search...')}
        style={inp}
      />
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#1a1625', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, marginTop: 2, maxHeight: 200, overflowY: 'auto' as const, boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
          {suggestions.map(d => (
            <div key={d.airtableId || d.name}
              onMouseDown={e => { e.preventDefault(); handleSelect(d.name) }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(201,168,76,0.1)'; (e.currentTarget as HTMLDivElement).style.color = G }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = DIM }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontFamily: cinzel, fontSize: 10, color: DIM, letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 8 }}>
              {d.name}
              {d.type && <span style={{ fontSize: 8, opacity: 0.5 }}>{d.type}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SpiritEditForm({ fields, setField, onSave, onCancel, saving, msg, demons = [] }: {
  fields: Record<string, string>
  setField: (name: string, val: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  msg: string
  demons?: any[]
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
        <div>
          <label style={l}>Companion Spirits</label>
          <SpiritTypeahead mode="multi" value={f('Companion Spirits')} onChange={v => setField('Companion Spirits', v)} demons={demons} placeholder="Type spirit name to add..." />
        </div>
        <div><label style={l}>Kingdom</label>{ti('Kingdom')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>WRI Exorcist Notes</label>{ta('WRI Exorcist Notes')}</div>
        <div>
          <label style={l}>Hierarchy Category</label>
          <select value={f('Hierarchy Category')} onChange={e => setField('Hierarchy Category', e.target.value)} style={{ ...i }}>
            <option value="">— Select —</option>
            {HIER_CATS.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={l}>Parent Strongman</label>
          <SpiritTypeahead mode="single" value={f('Parent Strongman')} onChange={v => setField('Parent Strongman', v)} demons={demons} placeholder="Type to search spirits..." />
        </div>
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
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={l}>Phonetic Pronunciation</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={f('Phonetic')} onChange={e => setField('Phonetic', e.target.value)}
              placeholder="e.g. BAY-uhl-zee-bub"
              style={{ flex: 1, ...i }} />
            <button
              onClick={() => {
                const ph = f('Phonetic')
                if (ph && 'speechSynthesis' in window) {
                  window.speechSynthesis.cancel()
                  const u = new SpeechSynthesisUtterance(ph)
                  u.rate = 0.75
                  window.speechSynthesis.speak(u)
                }
              }}
              style={{ padding: '6px 12px', background: 'rgba(201,168,76,0.1)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 9, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
              🔊 Test
            </button>
          </div>
          <div style={{ fontSize: 10, color: DIM, fontFamily: crimson, marginTop: 3, fontStyle: 'italic' }}>
            Use ALL-CAPS syllables, hyphens between. Click Test to hear browser TTS preview.
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={l}>Historical Image URLs</label>
          <textarea value={f('Images')} onChange={e => setField('Images', e.target.value)}
            placeholder={'One URL per line\nhttps://upload.wikimedia.org/...'}
            rows={3} style={{ ...i, resize: 'vertical' as const }} />
          <div style={{ fontSize: 10, color: DIM, fontFamily: crimson, marginTop: 3, fontStyle: 'italic' }}>
            One image URL per line. Wikimedia Commons, historical manuscripts, etc.
          </div>
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={l}>Related Spirits</label>
          <input value={f('Related Spirits')} onChange={e => setField('Related Spirits', e.target.value)}
            placeholder="Comma separated: Jezebel, Ahab, Leviathan"
            style={{ ...i }} />
        </div>

        {/* Biblical Classification Section */}
        <div style={{ gridColumn: '1 / -1', fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 8, paddingTop: 16, paddingBottom: 6, borderTop: `1px solid ${BDR}`, borderBottom: `1px solid ${BDR}` }}>⚔ Biblical Classification</div>
        <div>
          <label style={l}>Biblical Rank (Eph. 6:12)</label>
          <select value={f('Biblical Rank')} onChange={e => setField('Biblical Rank', e.target.value)} style={{ ...i }}>
            <option value="">— Select —</option>
            {['Principality', 'Power', 'Ruler of Darkness', 'Spiritual Wickedness in High Places', 'Fallen Angel', 'Demon', 'Familiar Spirit', 'Spirit of Infirmity'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={l}>Case Type</label>
          <select value={f('Case Type')} onChange={e => setField('Case Type', e.target.value)} style={{ ...i }}>
            <option value="">— Select —</option>
            {['Personal Deliverance', 'Generational/Bloodline', 'Territorial/Regional', 'Institutional', 'Atmospheric/Intercessory', 'Multiple'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Transmission Vectors</label>{ta('Transmission Vectors', 2)}</div>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 24 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={f('Is Generational') === 'true'} onChange={e => setField('Is Generational', e.target.checked ? 'true' : 'false')} style={{ accentColor: G, width: 14, height: 14 }} />
            <span style={{ fontFamily: crimson, fontSize: 13, color: TXT }}>Primarily Generational/Bloodline</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={f('Is Territorial') === 'true'} onChange={e => setField('Is Territorial', e.target.checked ? 'true' : 'false')} style={{ accentColor: G, width: 14, height: 14 }} />
            <span style={{ fontFamily: crimson, fontSize: 13, color: TXT }}>Primarily Territorial/Regional</span>
          </label>
        </div>

        {/* Operational Intelligence Section */}
        <div style={{ gridColumn: '1 / -1', fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 8, paddingTop: 16, paddingBottom: 6, borderTop: `1px solid ${BDR}`, borderBottom: `1px solid ${BDR}` }}>🔍 Operational Intelligence</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Session Indicators</label>{ta('Session Indicators', 3)}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Resistance Signature</label>{ta('Resistance Signature', 2)}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Demonic Agreements / Lies Planted</label>{ta('Demonic Agreements', 3)}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Cluster Spirits</label>{ta('Cluster Spirits', 3)}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Legal Rights Framework</label>{ta('Legal Rights Framework', 3)}</div>

        {/* Scholarly Section */}
        <div style={{ gridColumn: '1 / -1', fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 8, paddingTop: 16, paddingBottom: 6, borderTop: `1px solid ${BDR}`, borderBottom: `1px solid ${BDR}` }}>📚 Scholarly Research</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Etymology Notes</label>{ta('Etymology Notes', 3)}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Archaeology Notes</label>{ta('Archaeology Notes', 3)}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Scripture Context</label>{ta('Scripture Context', 4)}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Institutional Expression</label>{ta('Institutional Expression', 2)}</div>

        {/* Ministry Section */}
        <div style={{ gridColumn: '1 / -1', fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 8, paddingTop: 16, paddingBottom: 6, borderTop: `1px solid ${BDR}`, borderBottom: `1px solid ${BDR}` }}>🙏 Ministry Application</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Prayer Points</label>{ta('Prayer Points', 3)}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Aftercare Notes</label>{ta('Aftercare Notes', 3)}</div>
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

const FIELD_GROUPS = [
  ['biblicalRank', 'caseType', 'type', 'phonetic', 'isGenerational', 'isTerritorial', 'clusterSpirits'],
  ['sessionIndicators', 'resistanceSignature', 'legalRights', 'transmissionVectors', 'entryPoints', 'manifestation'],
  ['etymologyNotes', 'archaeologyNotes', 'description', 'prayerPoints', 'aftercareNotes', 'scriptureContext'],
]

// ─── INTEL ARCHIVE TAB ───────────────────────────────────────────────────────
function IntelArchive({ getToken, isDark = true }: { getToken: () => Promise<string | null>, isDark?: boolean }) {
  const adStatBg  = isDark ? SURF : '#fff'
  const adHeaderBg = isDark ? SURF2 : '#e8e0d4'
  const adStatNum = isDark ? G : '#a07830'
  const adStatLbl = isDark ? DIM : '#7a6555'
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

  // AI Enhancement — state machine: idle → loading → review → saving → done | error
  type AiPhase = 'idle' | 'loading' | 'review' | 'saving' | 'done' | 'error'
  const [aiPhase, setAiPhase]             = useState<AiPhase>('idle')
  const [aiTargetDemon, setAiTargetDemon] = useState<any>(null)
  const [aiResult, setAiResult]           = useState<Record<string, any>>({})
  const [showAiPanel, setShowAiPanel]     = useState(false)
  const [aiError, setAiError]             = useState('')
  const [aiSavedLog, setAiSavedLog]       = useState<string[]>([])
  const [fieldDecisions, setFieldDecisions] = useState<Record<string, { status: 'pending' | 'accepted' | 'skipped', value: string, editing: boolean }>>({})

  function setDecision(key: string, status: 'accepted' | 'skipped' | 'pending') {
    setFieldDecisions(prev => ({ ...prev, [key]: { ...(prev[key] || {}), status, editing: false } }))
  }
  function setEditing(key: string, on: boolean) {
    setFieldDecisions(prev => ({ ...prev, [key]: { ...(prev[key] || {}), editing: on } }))
  }
  function setEditValue(key: string, val: string) {
    setFieldDecisions(prev => ({ ...prev, [key]: { ...(prev[key] || {}), value: val } }))
  }

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

  function openAiPanel(demon: any) {
    setAiTargetDemon(demon)
    setAiResult({})
    setFieldDecisions({})
    setAiSavedLog([])
    setAiError('')
    setAiPhase('idle')
    setShowAiPanel(true)
  }

  function applyAiFields(fields: Record<string, any>) {
    if (Object.keys(fields).length === 0) {
      setAiError('AI returned no fields — the model may have returned non-JSON output. Try again.')
      setAiPhase('error')
      return
    }
    const init: Record<string, { status: 'pending' | 'accepted' | 'skipped', value: string, editing: boolean }> = {}
    Object.entries(fields).forEach(([k, v]) => {
      init[k] = { status: 'pending', value: typeof v === 'boolean' ? (v ? 'Yes' : 'No') : String(v ?? ''), editing: false }
    })
    setAiResult(fields)
    setFieldDecisions(init)
    setAiPhase('review')
  }

  async function startAiResearch() {
    if (!aiTargetDemon) return
    setAiPhase('loading')
    setAiResult({})
    setFieldDecisions({})
    setAiError('')

    const allFields: Record<string, any> = {}
    const baseJobId = `enhance-${aiTargetDemon.airtableId || aiTargetDemon.id}-${Date.now()}`

    try {
      const token = await getToken()

      for (let i = 0; i < FIELD_GROUPS.length; i++) {
        const group = FIELD_GROUPS[i]
        const jobId = `${baseJobId}-part-${i + 1}`

        try {
          const res = await fetch('/api/ai-spirit-enhance-background', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ name: aiTargetDemon.name, existing: aiTargetDemon, fields: group, jobId }),
          })

          const text = await res.text()
          if (!text || text.trim() === '') {
            console.warn(`[enhance] Group ${i + 1} returned empty body`)
            continue
          }

          let d: any
          try { d = JSON.parse(text) } catch {
            console.warn(`[enhance] Group ${i + 1} returned non-JSON:`, text.slice(0, 100))
            continue
          }

          if (d.fields && Object.keys(d.fields).length > 0) {
            Object.assign(allFields, d.fields)
            console.log(`[enhance] Group ${i + 1} returned fields:`, Object.keys(d.fields))
          } else {
            console.warn(`[enhance] Group ${i + 1} returned no fields:`, d.error || 'unknown')
          }
        } catch (groupErr: any) {
          console.warn(`[enhance] Group ${i + 1} failed:`, groupErr.message)
          // Continue to next group even if this one fails
        }
      }

      if (Object.keys(allFields).length > 0) {
        applyAiFields(allFields)
      } else {
        setAiError('AI returned no fields — try again')
        setAiPhase('error')
      }
    } catch(e: any) {
      setAiError(e.message || 'Network error')
      setAiPhase('error')
    }
  }

  const AI_LABELS: Record<string, string> = {
    description: '📖 Description', type: '🏷 Entity Type',
    biblicalRank: '⚔ Biblical Rank (Eph. 6:12)', etymologyNotes: '📚 Etymology',
    archaeologyNotes: '🏺 Archaeology & ANE', scriptureContext: '✝ Scripture Context',
    primaryBattlefield: '🎯 Primary Battlefield', manifestation: '⚠ Manifestations',
    entryPoints: '🚪 Entry Points', transmissionVectors: '🧬 Transmission Vectors',
    caseType: '📋 Case Type', clusterSpirits: '🕸 Cluster Spirits',
    legalRights: '⚖ Legal Rights', sessionIndicators: '🔍 Session Indicators',
    resistanceSignature: '🛡 Resistance Signature', demonicAgreements: '🤥 Demonic Agreements',
    institutionalExpression: '🏛 Institutional Expression', counterScriptures: '🗡 Counter Scriptures',
    deliveranceSequence: '📋 Deliverance Sequence', aftercareNotes: '🌱 Aftercare Notes',
    prayerPoints: '🙏 Prayer Points', phonetic: '🔊 Phonetic',
    images: '🖼 Image (Wikipedia)',
    biblicalReferences: '📖 Biblical References', isGenerational: '🧬 Generational?',
    isTerritorial: '🗺 Territorial?',
  }
  const AI_BOOL_FIELDS = new Set(['isGenerational', 'isTerritorial'])

  async function saveAiAccepted() {
    const toSave: Record<string, any> = {}
    const savedLabels: string[] = []

    Object.entries(fieldDecisions).forEach(([k, dec]) => {
      if (dec.status !== 'accepted') return
      if (AI_BOOL_FIELDS.has(k)) {
        toSave[k] = dec.value === 'Yes' || dec.value === 'true' || dec.value === 'yes'
      } else {
        toSave[k] = dec.value
      }
      savedLabels.push(AI_LABELS[k] || k)
    })

    if (Object.keys(toSave).length === 0) return
    setAiPhase('saving')

    try {
      const merged = { ...aiTargetDemon, ...toSave }
      setDemons((prev: any[]) => prev.map(d =>
        d.id === aiTargetDemon.id || d.airtableId === aiTargetDemon.airtableId ? merged : d
      ))
      setAiTargetDemon(merged)

      const token = await getToken()
      console.log('[save] Sending to admin-demon:', {
        id: aiTargetDemon.airtableId,
        fieldCount: Object.keys(toSave).length,
        keys: Object.keys(toSave),
      })

      const res = await fetch('/api/admin-demon', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: aiTargetDemon.airtableId, fields: toSave }),
      })

      const responseText = await res.text()
      console.log('[save] Response status:', res.status, 'body:', responseText.slice(0, 200))

      if (res.ok) {
        setAiSavedLog(savedLabels)
        setAiPhase('done')
        fetchDemons()
      } else {
        let errMsg = `Save failed: ${res.status}`
        try { errMsg = JSON.parse(responseText).error || errMsg } catch {}
        setAiError(errMsg)
        setAiPhase('error')
      }
    } catch(e: any) {
      console.error('[save] Exception:', e)
      setAiError(e.message || 'Save failed')
      setAiPhase('error')
    }
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
            style={{ background: quickFilter === qf ? `${color}15` : adStatBg, border: `1px solid ${quickFilter === qf ? color : BDR}`, borderRadius: 10, padding: '18px 22px', flex: 1, cursor: dLoading ? 'default' : 'pointer', textAlign: 'left' as const, transition: 'all 0.15s' }}>
            <div style={{ fontFamily: cinzel, fontSize: 28, color: quickFilter === qf ? color : adStatNum, marginBottom: 6 }}>{val === null ? '...' : val}</div>
            <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: adStatLbl, textTransform: 'uppercase' as const }}>{label}</div>
          </button>
        ))}
      </div>

      {/* Refresh + Airtable link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <button onClick={fetchDemons} disabled={dLoading}
          style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', padding: '6px 14px', cursor: dLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: dLoading ? 0.5 : 1 }}>
          ↺ Refresh
        </button>
      <div style={{ textAlign: 'right' as const }}>
        <a href="https://airtable.com/appVXEj2DLPBTJTtD/tblcP4lgVykzOhLi4" target="_blank" rel="noopener noreferrer"
          style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: DIM, textDecoration: 'none', opacity: 0.65 }}>
          View raw data in Airtable →
        </a>
      </div>
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
            demons={demons}
          />
        </div>
      )}

      {/* Spirit table */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: adHeaderBg }}>
                <th style={{ ...thS, color: isDark ? DIM : '#5c4a3a' }} onClick={() => handleSort('name')}>Name{sortInd('name')}</th>
                <th style={{ ...thS, color: isDark ? DIM : '#5c4a3a' }} onClick={() => handleSort('type')}>Type{sortInd('type')}</th>
                <th style={{ ...thS, color: isDark ? DIM : '#5c4a3a' }} onClick={() => handleSort('hierarchyCategory')}>Category{sortInd('hierarchyCategory')}</th>
                <th style={{ ...thS, cursor: 'default', color: isDark ? DIM : '#5c4a3a' }}>Del. Sequence</th>
                <th style={{ ...thS, cursor: 'default', color: isDark ? DIM : '#5c4a3a' }}>Counter Scriptures</th>
                <th style={{ ...thS, cursor: 'default', width: 70, color: isDark ? DIM : '#5c4a3a' }}>Actions</th>
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
                      <div style={{ display: 'flex', gap: 4, flexDirection: 'column' }}>
                        <button
                          onClick={() => editingId === d.airtableId ? setEditingId(null) : startEdit(d)}
                          style={{ background: 'transparent', border: `1px solid ${editingId === d.airtableId ? G : BDR}`, borderRadius: 5, color: editingId === d.airtableId ? G : DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', padding: '4px 10px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                          {editingId === d.airtableId ? 'Close' : 'Edit'}
                        </button>
                        <button
                          onClick={() => openAiPanel(d)}
                          style={{ background: 'rgba(201,168,76,0.1)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 5, color: G, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.04em', padding: '3px 8px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                          ✦ AI
                        </button>
                      </div>
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
                          demons={demons}
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

      {/* AI Enhancement Panel */}
      {showAiPanel && aiTargetDemon && (
        <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 520, background: BG, borderLeft: `1px solid ${BDR}`, zIndex: 9999, display: 'flex', flexDirection: 'column' as const, boxShadow: '-4px 0 32px rgba(0,0,0,0.4)' }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.12em', marginBottom: 3 }}>✦ AI SPIRIT RESEARCH</div>
              <div style={{ fontFamily: crimson, fontSize: 16, color: TXT, fontWeight: 600 }}>{aiTargetDemon.name}</div>
            </div>
            <button onClick={() => setShowAiPanel(false)} style={{ background: 'none', border: 'none', color: DIM, fontSize: 20, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>✕</button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' as const, padding: '20px' }}>

            {/* IDLE */}
            {aiPhase === 'idle' && (
              <div style={{ textAlign: 'center' as const, padding: '48px 20px' }}>
                <div style={{ fontFamily: cinzel, fontSize: 28, color: G, marginBottom: 16 }}>✦</div>
                <div style={{ fontFamily: cinzel, fontSize: 13, color: TXT, letterSpacing: '0.06em', marginBottom: 10 }}>{aiTargetDemon.name}</div>
                <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', marginBottom: 28, lineHeight: 1.6 }}>
                  AI will research this entity across Scripture, archaeology, Dead Sea Scrolls, patristics, and deliverance ministry sources — filling only empty fields.
                </div>
                <button onClick={startAiResearch}
                  style={{ padding: '12px 28px', background: G, border: 'none', borderRadius: 6, color: BG, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', fontWeight: 700 }}>
                  ✦ Run AI Research
                </button>
              </div>
            )}

            {/* LOADING */}
            {aiPhase === 'loading' && (
              <div style={{ textAlign: 'center' as const, padding: '60px 20px' }}>
                <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.12em', marginBottom: 12 }}>◉ RESEARCHING...</div>
                <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', lineHeight: 1.7, marginBottom: 14 }}>
                  Consulting Scripture, Dead Sea Scrolls, archaeology,<br />and deliverance ministry sources
                </div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.1em' }}>
                  Researching in 3 passes — this takes 30–45 seconds
                </div>
              </div>
            )}

            {/* REVIEW */}
            {aiPhase === 'review' && (() => {
              const fieldKeys = Object.keys(aiResult).filter(k => AI_LABELS[k])
              const acceptedCount = fieldKeys.filter(k => fieldDecisions[k]?.status === 'accepted').length
              const pendingCount  = fieldKeys.filter(k => !fieldDecisions[k] || fieldDecisions[k].status === 'pending').length
              const handleAcceptAll = () => {
                const next = { ...fieldDecisions }
                fieldKeys.forEach(k => { next[k] = { ...(next[k] || {}), status: 'accepted' as const, editing: false } })
                setFieldDecisions(next)
              }
              const handleSkipAll = () => {
                const next = { ...fieldDecisions }
                fieldKeys.forEach(k => { next[k] = { ...(next[k] || {}), status: 'skipped' as const, editing: false } })
                setFieldDecisions(next)
              }
              return (
                <div>
                  {/* Summary bar */}
                  <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${BDR}`, borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.08em', marginBottom: 10 }}>
                      {fieldKeys.length} missing field{fieldKeys.length !== 1 ? 's' : ''} found
                      {pendingCount > 0 && <span style={{ color: DIM }}> · {pendingCount} pending</span>}
                      {acceptedCount > 0 && <span style={{ color: '#4ade80' }}> · {acceptedCount} accepted</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                      <button onClick={handleAcceptAll}
                        style={{ flex: 1, padding: '7px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 5, color: '#4ade80', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer' }}>
                        ✓ Accept All
                      </button>
                      <button onClick={handleSkipAll}
                        style={{ flex: 1, padding: '7px', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 5, color: '#f87171', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer' }}>
                        ✗ Skip All
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={saveAiAccepted} disabled={acceptedCount === 0}
                        style={{ flex: 1, padding: '9px', background: acceptedCount > 0 ? G : 'rgba(201,168,76,0.15)', border: 'none', borderRadius: 6, color: acceptedCount > 0 ? BG : DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: acceptedCount > 0 ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                        💾 Save {acceptedCount} Accepted Field{acceptedCount !== 1 ? 's' : ''}
                      </button>
                      <button onClick={startAiResearch} title="Re-run research"
                        style={{ padding: '9px 13px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 6, color: DIM, fontFamily: cinzel, fontSize: 12, cursor: 'pointer' }}>
                        ↺
                      </button>
                    </div>
                  </div>

                  {/* Per-field cards */}
                  {fieldKeys.map(key => {
                    const value = aiResult[key]
                    const isBool = AI_BOOL_FIELDS.has(key)
                    const dec = fieldDecisions[key] || { status: 'pending' as const, value: typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value ?? ''), editing: false }
                    return (
                      <div key={key} style={{ marginBottom: 10, background: dec.status === 'accepted' ? 'rgba(74,222,128,0.04)' : dec.status === 'skipped' ? 'rgba(248,113,113,0.03)' : 'rgba(201,168,76,0.03)', border: `1px solid ${dec.status === 'accepted' ? 'rgba(74,222,128,0.25)' : dec.status === 'skipped' ? 'rgba(248,113,113,0.2)' : BDR}`, borderRadius: 8, padding: '12px 14px', opacity: dec.status === 'skipped' ? 0.5 : 1, transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.08em' }}>{AI_LABELS[key]}</div>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {!isBool && dec.status !== 'accepted' && (
                              <button onClick={() => setDecision(key, 'accepted')}
                                style={{ fontSize: 9, padding: '3px 8px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 4, color: '#4ade80', fontFamily: cinzel, cursor: 'pointer' }}>
                                ✓ Accept
                              </button>
                            )}
                            {!isBool && !dec.editing && (
                              <button onClick={() => setEditing(key, true)}
                                style={{ fontSize: 9, padding: '3px 8px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${BDR}`, borderRadius: 4, color: G, fontFamily: cinzel, cursor: 'pointer' }}>
                                ✏ Edit
                              </button>
                            )}
                            {!isBool && dec.editing && (
                              <button onClick={() => { setEditing(key, false); setDecision(key, 'accepted') }}
                                style={{ fontSize: 9, padding: '3px 8px', background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 4, color: '#4ade80', fontFamily: cinzel, cursor: 'pointer' }}>
                                ✓ Done
                              </button>
                            )}
                            {dec.status !== 'skipped' ? (
                              <button onClick={() => setDecision(key, 'skipped')}
                                style={{ fontSize: 9, padding: '3px 8px', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 4, color: '#f87171', fontFamily: cinzel, cursor: 'pointer' }}>
                                ✗ Skip
                              </button>
                            ) : (
                              <button onClick={() => setDecision(key, 'pending')}
                                style={{ fontSize: 9, padding: '3px 8px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, color: DIM, fontFamily: cinzel, cursor: 'pointer' }}>
                                ↩ Undo
                              </button>
                            )}
                          </div>
                        </div>
                        {isBool ? (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => { setEditValue(key, 'Yes'); setDecision(key, 'accepted') }}
                              style={{ padding: '6px 18px', background: dec.value === 'Yes' ? 'rgba(74,222,128,0.25)' : 'transparent', border: `1px solid ${dec.value === 'Yes' ? 'rgba(74,222,128,0.6)' : BDR}`, borderRadius: 5, color: dec.value === 'Yes' ? '#4ade80' : DIM, fontFamily: cinzel, fontSize: 10, cursor: 'pointer', letterSpacing: '0.06em' }}>
                              Yes
                            </button>
                            <button onClick={() => { setEditValue(key, 'No'); setDecision(key, 'accepted') }}
                              style={{ padding: '6px 18px', background: dec.value === 'No' ? 'rgba(248,113,113,0.2)' : 'transparent', border: `1px solid ${dec.value === 'No' ? 'rgba(248,113,113,0.5)' : BDR}`, borderRadius: 5, color: dec.value === 'No' ? '#f87171' : DIM, fontFamily: cinzel, fontSize: 10, cursor: 'pointer', letterSpacing: '0.06em' }}>
                              No
                            </button>
                          </div>
                        ) : dec.editing ? (
                          <textarea value={dec.value} onChange={e => setEditValue(key, e.target.value)} rows={4}
                            style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.05)', border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 10px', color: TXT, fontFamily: crimson, fontSize: 13, outline: 'none', resize: 'vertical' as const }} />
                        ) : (
                          <div style={{ fontFamily: crimson, fontSize: 13, color: TXT, lineHeight: 1.6 }}>{dec.value}</div>
                        )}
                        {dec.status === 'accepted' && !dec.editing && (
                          <div style={{ fontSize: 9, color: '#4ade80', fontFamily: cinzel, letterSpacing: '0.06em', marginTop: 6 }}>✓ Will be saved</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}

            {/* SAVING */}
            {aiPhase === 'saving' && (
              <div style={{ textAlign: 'center' as const, padding: '60px 20px' }}>
                <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.12em' }}>⏳ SAVING TO AIRTABLE...</div>
              </div>
            )}

            {/* DONE */}
            {aiPhase === 'done' && (
              <div>
                <div style={{ textAlign: 'center' as const, padding: '28px 20px 20px', borderBottom: `1px solid ${BDR}`, marginBottom: 16 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 14, color: '#4ade80', letterSpacing: '0.08em', marginBottom: 6 }}>✓ Research Saved</div>
                  <div style={{ fontFamily: crimson, fontSize: 13, color: DIM }}>{aiSavedLog.length} field{aiSavedLog.length !== 1 ? 's' : ''} saved to Airtable</div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  {aiSavedLog.map(label => (
                    <div key={label} style={{ fontFamily: crimson, fontSize: 13, color: '#4ade80', padding: '7px 0', borderBottom: `1px solid rgba(74,222,128,0.1)`, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10 }}>✓</span> {label}
                    </div>
                  ))}
                </div>
                <button onClick={() => { setAiPhase('idle'); setAiResult({}); setFieldDecisions({}); setAiSavedLog([]) }}
                  style={{ width: '100%', padding: '10px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 6, color: DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer' }}>
                  ↺ Research Again
                </button>
              </div>
            )}

            {/* ERROR */}
            {aiPhase === 'error' && (
              <div style={{ padding: '8px 0' }}>
                <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '14px 16px', color: '#f87171', fontFamily: crimson, fontSize: 13, marginBottom: 16, lineHeight: 1.6 }}>
                  ⚠ {aiError}
                </div>
                <button onClick={startAiResearch}
                  style={{ width: '100%', padding: '10px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${BDR}`, borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer' }}>
                  ↺ Try Again
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

// ─── TRAINING MANAGER ────────────────────────────────────────────────────────
function TrainingManager({ getToken, isDark }: { getToken: any, isDark: boolean }) {
  const BG2  = isDark ? '#0D0B14' : '#f5f0e8'
  const SURF3 = isDark ? '#1a1714' : '#f0ebe3'
  const BDR2  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.25)'
  const TXT2  = isDark ? '#f0e8d8' : '#1a1410'
  const MUT   = isDark ? '#9a8c74' : '#5c4a3a'
  const GG    = isDark ? '#C9A84C' : '#a07830'
  const inp2: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const,
    background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
    border: `1px solid ${BDR2}`, borderRadius: 6,
    padding: '8px 12px', color: TXT2,
    fontFamily: crimson, fontSize: 14, outline: 'none',
  }

  const [activeManagerTab, setActiveManagerTab] = useState<'courses' | 'fringe' | 'events'>('courses')

  // Events state
  const [evts, setEvts]                   = useState<any[]>([])
  const [evtLoading, setEvtLoading]       = useState(false)
  const [showEvtForm, setShowEvtForm]     = useState(false)
  const [editingEvt, setEditingEvt]       = useState<any | null>(null)
  const [evtSaving, setEvtSaving]         = useState(false)
  const [evtMsg, setEvtMsg]               = useState('')
  const [evtTitle, setEvtTitle]           = useState('')
  const [evtDesc, setEvtDesc]             = useState('')
  const [evtDate, setEvtDate]             = useState('')
  const [evtDuration, setEvtDuration]     = useState('60')
  const [evtType, setEvtType]             = useState('live_training')
  const [evtZoom, setEvtZoom]             = useState('')
  const [evtZoomTier, setEvtZoomTier]     = useState('free')
  const [evtPublished, setEvtPublished]   = useState(false)
  const [evtMaxAtt, setEvtMaxAtt]         = useState('')

  async function loadEvents() {
    setEvtLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/events', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setEvts(d.events || []) }
    } catch { /* ignore */ } finally { setEvtLoading(false) }
  }

  function openEvtForm(evt?: any) {
    if (evt) {
      setEditingEvt(evt)
      setEvtTitle(evt.title || '')
      setEvtDesc(evt.description || '')
      setEvtDate(evt.event_date ? new Date(evt.event_date).toISOString().slice(0, 16) : '')
      setEvtDuration(String(evt.duration_minutes || 60))
      setEvtType(evt.event_type || 'live_training')
      setEvtZoom(evt.zoom_link || '')
      setEvtZoomTier(evt.zoom_link_tier || 'free')
      setEvtPublished(evt.is_published || false)
      setEvtMaxAtt(evt.max_attendees ? String(evt.max_attendees) : '')
    } else {
      setEditingEvt(null)
      setEvtTitle(''); setEvtDesc(''); setEvtDate(''); setEvtDuration('60')
      setEvtType('live_training'); setEvtZoom(''); setEvtZoomTier('free')
      setEvtPublished(false); setEvtMaxAtt('')
    }
    setEvtMsg('')
    setShowEvtForm(true)
  }

  async function saveEvent() {
    if (!evtTitle.trim() || !evtDate) { setEvtMsg('Title and date required'); return }
    setEvtSaving(true); setEvtMsg('')
    const token = await getToken()
    const body: Record<string, any> = {
      title: evtTitle.trim(), description: evtDesc.trim() || null,
      event_date: new Date(evtDate).toISOString(),
      duration_minutes: parseInt(evtDuration) || 60,
      event_type: evtType, zoom_link: evtZoom.trim() || null,
      zoom_link_tier: evtZoomTier, is_published: evtPublished,
      max_attendees: evtMaxAtt ? parseInt(evtMaxAtt) : null,
    }
    const url  = editingEvt ? `/api/events?id=${editingEvt.id}` : '/api/events'
    const method = editingEvt ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
    if (res.ok) { setShowEvtForm(false); setEditingEvt(null); await loadEvents() }
    else { const d = await res.json(); setEvtMsg(d.error || 'Save failed') }
    setEvtSaving(false)
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event?')) return
    const token = await getToken()
    await fetch(`/api/events?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    loadEvents()
  }
  const [fringeArticles, setFringeArticles] = useState<any[]>([])
  const [fringeTopicFilter, setFringeTopicFilter] = useState('ufo-disclosure')
  const [showFringeForm, setShowFringeForm] = useState(false)
  const [editingFringe, setEditingFringe]   = useState<any | null>(null)
  const [fringeSaving, setFringeSaving]     = useState(false)
  const [faTitle, setFaTitle]   = useState('')
  const [faSummary, setFaSummary] = useState('')
  const [faBody, setFaBody]     = useState('')
  const [faTier, setFaTier]     = useState('free')
  const [faStatus, setFaStatus] = useState('draft')

  const FRINGE_TOPICS = [
    { key: 'ufo-disclosure', label: 'UFO Disclosure' },
    { key: 'genesis-6', label: 'Genesis 6' },
    { key: 'bloodline-warfare', label: 'Bloodline Warfare' },
    { key: 'nephilim', label: 'Nephilim' },
    { key: 'gov-programming', label: 'Gov. Programming' },
    { key: 'fringe-science', label: 'Fringe Science' },
  ]

  async function loadFringeArticles(topic: string) {
    const token = await getToken()
    const res = await fetch(`/api/fringe-articles?topic=${topic}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setFringeArticles(d.articles || []) }
  }

  async function saveFringeArticle() {
    setFringeSaving(true)
    const token = await getToken()
    const body = { topic: fringeTopicFilter, title: faTitle, summary: faSummary, body: faBody, tier: faTier, status: faStatus }
    if (editingFringe) {
      await fetch(`/api/fringe-articles?id=${editingFringe.id}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch('/api/fringe-articles', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setFringeSaving(false)
    setShowFringeForm(false)
    setEditingFringe(null)
    setFaTitle(''); setFaSummary(''); setFaBody(''); setFaTier('free'); setFaStatus('draft')
    loadFringeArticles(fringeTopicFilter)
  }

  async function deleteFringeArticle(id: string) {
    if (!confirm('Delete this article?')) return
    const token = await getToken()
    await fetch(`/api/fringe-articles?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    loadFringeArticles(fringeTopicFilter)
  }

  function openFringeForm(article?: any) {
    if (article) {
      setEditingFringe(article)
      setFaTitle(article.title || '')
      setFaSummary(article.summary || '')
      setFaBody(article.body || '')
      setFaTier(article.tier || 'free')
      setFaStatus(article.status || 'draft')
    } else {
      setEditingFringe(null)
      setFaTitle(''); setFaSummary(''); setFaBody(''); setFaTier('free'); setFaStatus('draft')
    }
    setShowFringeForm(true)
  }

  const [courses, setCourses]               = useState<any[]>([])
  const [loading, setLoading]               = useState(true)
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null)
  const [episodes, setEpisodes]             = useState<any[]>([])
  const [showCourseForm, setShowCourseForm] = useState(false)
  const [showEpisodeForm, setShowEpisodeForm] = useState(false)
  const [editingCourse, setEditingCourse]   = useState<any | null>(null)
  const [editingEpisode, setEditingEpisode] = useState<any | null>(null)
  const [saving, setSaving]                 = useState(false)

  const [cTitle, setCTitle]     = useState('')
  const [cDesc, setCDesc]       = useState('')
  const [cThumbnail, setCThumbnail] = useState('')
  const [cTier, setCTier]       = useState('free')
  const [cStatus, setCStatus]   = useState('draft')
  const [cType, setCType]       = useState<'course' | 'protocol' | 'quick-hit'>('course')

  const [eTitle, setETitle]     = useState('')
  const [eDesc, setEDesc]       = useState('')
  const [eYoutube, setEYoutube] = useState('')
  const [eNotes, setENotes]     = useState('')
  const [eStatus, setEStatus]   = useState('draft')
  const [eSortOrder, setESortOrder] = useState(0)

  useEffect(() => { loadCourses() }, [])

  async function loadCourses() {
    setLoading(true)
    const token = await getToken()
    const res = await fetch('/api/admin-courses', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setCourses(d.courses || []) }
    setLoading(false)
  }

  async function loadEpisodes(courseId: string) {
    const token = await getToken()
    const res = await fetch(`/api/admin-episodes?courseId=${courseId}`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setEpisodes(d.episodes || []) }
  }

  function openCourseForm(course?: any) {
    if (course) {
      setEditingCourse(course); setCTitle(course.title); setCDesc(course.description || '')
      setCThumbnail(course.thumbnail_url || ''); setCTier(course.tier); setCStatus(course.status)
      setCType(course.course_type || 'course')
    } else {
      setEditingCourse(null); setCTitle(''); setCDesc(''); setCThumbnail(''); setCTier('free'); setCStatus('draft')
      setCType('course')
    }
    setShowCourseForm(true)
  }

  function openEpisodeForm(episode?: any) {
    if (episode) {
      setEditingEpisode(episode); setETitle(episode.title); setEDesc(episode.description || '')
      setEYoutube(episode.youtube_url || ''); setENotes(episode.notes || '')
      setEStatus(episode.status); setESortOrder(episode.sort_order || 0)
    } else {
      setEditingEpisode(null); setETitle(''); setEDesc(''); setEYoutube(''); setENotes('')
      setEStatus('draft'); setESortOrder(episodes.length)
    }
    setShowEpisodeForm(true)
  }

  async function saveCourse() {
    if (!cTitle.trim()) return
    setSaving(true)
    const token = await getToken()
    const body = { title: cTitle, description: cDesc, thumbnail_url: cThumbnail, tier: cTier, status: cStatus, courseType: cType }
    const res = editingCourse
      ? await fetch(`/api/admin-courses?id=${editingCourse.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      : await fetch('/api/admin-courses', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { setShowCourseForm(false); loadCourses() }
  }

  async function deleteCourse(id: string) {
    if (!confirm('Delete this course and all its episodes?')) return
    const token = await getToken()
    await fetch(`/api/admin-courses?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (selectedCourse?.id === id) setSelectedCourse(null)
    loadCourses()
  }

  async function saveEpisode() {
    if (!eTitle.trim() || !selectedCourse) return
    setSaving(true)
    const token = await getToken()
    const body = { courseId: selectedCourse.id, title: eTitle, description: eDesc, youtubeUrl: eYoutube, notes: eNotes, status: eStatus, sortOrder: eSortOrder }
    const res = editingEpisode
      ? await fetch(`/api/admin-episodes?id=${editingEpisode.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
      : await fetch('/api/admin-episodes', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) { setShowEpisodeForm(false); loadEpisodes(selectedCourse.id) }
  }

  async function deleteEpisode(id: string) {
    if (!confirm('Delete this episode?')) return
    const token = await getToken()
    await fetch(`/api/admin-episodes?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    loadEpisodes(selectedCourse.id)
  }

  async function toggleCourseStatus(course: any) {
    const token = await getToken()
    const newStatus = course.status === 'published' ? 'draft' : 'published'
    await fetch(`/api/admin-courses?id=${course.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    })
    loadCourses()
    if (selectedCourse?.id === course.id) setSelectedCourse({ ...course, status: newStatus })
  }

  async function toggleEpisodeStatus(ep: any) {
    const token = await getToken()
    const newStatus = ep.status === 'published' ? 'draft' : 'published'
    await fetch(`/api/admin-episodes?id=${ep.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus }),
    })
    loadEpisodes(selectedCourse.id)
  }

  const tierColors: Record<string, string> = { free: '#9a8c74', soldier: '#7a9e7e', commander: '#8B9DCA', general: '#C9A84C' }
  const statusColor = (s: string) => s === 'published' ? '#4ade80' : '#9a8c74'

  const modal: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    backdropFilter: 'blur(4px)', zIndex: 9999,
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
  }
  const modalBox: React.CSSProperties = {
    background: isDark ? '#0D0B14' : '#fff',
    border: '1px solid rgba(201,168,76,0.3)',
    borderRadius: 12, width: '100%', maxWidth: 540,
    padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.85)',
    maxHeight: '90vh', overflowY: 'auto' as const,
  }

  return (
    <div>
      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: `1px solid ${BDR2}` }}>
        {(['courses', 'fringe', 'events'] as const).map(t => (
          <button key={t} onClick={() => {
            setActiveManagerTab(t)
            if (t === 'fringe') loadFringeArticles(fringeTopicFilter)
            if (t === 'events') loadEvents()
          }}
            style={{ padding: '8px 20px', background: 'transparent', border: 'none', borderBottom: activeManagerTab === t ? `2px solid ${GG}` : '2px solid transparent', color: activeManagerTab === t ? GG : MUT, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'capitalize' as const, marginBottom: -1 }}>
            {t === 'courses' ? '🎬 Courses' : t === 'fringe' ? '👁 Fringe Intel' : '📅 Events'}
          </button>
        ))}
      </div>

      {/* Fringe article manager */}
      {activeManagerTab === 'fringe' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <select value={fringeTopicFilter} onChange={e => { setFringeTopicFilter(e.target.value); loadFringeArticles(e.target.value) }}
              style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR2}`, borderRadius: 6, padding: '8px 12px', color: TXT2, fontFamily: cinzel, fontSize: 10, outline: 'none', letterSpacing: '0.06em' }}>
              {FRINGE_TOPICS.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
            <button onClick={() => openFringeForm()}
              style={{ padding: '10px 20px', background: 'rgba(201,168,76,0.15)', border: `1px solid ${GG}`, borderRadius: 8, color: GG, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}>
              + New Article
            </button>
          </div>
          {fringeArticles.length === 0 ? (
            <div style={{ color: MUT, fontFamily: crimson, fontStyle: 'italic', padding: '20px 0' }}>No articles for this topic yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {fringeArticles.map((a: any) => (
                <div key={a.id} style={{ background: SURF3, border: `1px solid ${BDR2}`, borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 12, color: TXT2, letterSpacing: '0.04em', marginBottom: 2 }}>{a.title}</div>
                    {a.summary && <div style={{ fontFamily: crimson, fontSize: 12, color: MUT }}>{a.summary}</div>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <span style={{ fontSize: 9, color: MUT, fontFamily: cinzel, textTransform: 'uppercase', border: `1px solid ${BDR2}`, borderRadius: 8, padding: '1px 6px' }}>{a.tier}</span>
                      <span style={{ fontSize: 9, color: a.status === 'published' ? '#4ade80' : MUT, fontFamily: cinzel, textTransform: 'uppercase', border: `1px solid ${a.status === 'published' ? '#4ade8040' : BDR2}`, borderRadius: 8, padding: '1px 6px' }}>{a.status}</span>
                    </div>
                  </div>
                  <button onClick={() => openFringeForm(a)} style={{ padding: '6px 12px', background: 'transparent', border: `1px solid ${BDR2}`, borderRadius: 6, color: MUT, fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => deleteFringeArticle(a.id)} style={{ padding: '6px 12px', background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, color: '#ef4444', fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>Delete</button>
                </div>
              ))}
            </div>
          )}
          {showFringeForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 12, padding: 28, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ fontFamily: cinzel, fontSize: 14, color: GG, marginBottom: 20 }}>{editingFringe ? 'Edit Article' : 'New Article'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <input value={faTitle} onChange={e => setFaTitle(e.target.value)} placeholder="Title"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR2}`, borderRadius: 6, padding: '8px 12px', color: TXT2, fontFamily: crimson, fontSize: 14, outline: 'none' }} />
                  <input value={faSummary} onChange={e => setFaSummary(e.target.value)} placeholder="Summary (shown in article list)"
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR2}`, borderRadius: 6, padding: '8px 12px', color: TXT2, fontFamily: crimson, fontSize: 14, outline: 'none' }} />
                  <textarea value={faBody} onChange={e => setFaBody(e.target.value)} placeholder="Full article body..."
                    rows={12}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR2}`, borderRadius: 6, padding: '8px 12px', color: TXT2, fontFamily: crimson, fontSize: 14, outline: 'none', resize: 'vertical' as const }} />
                  <div style={{ display: 'flex', gap: 12 }}>
                    <select value={faTier} onChange={e => setFaTier(e.target.value)}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR2}`, borderRadius: 6, padding: '8px 12px', color: TXT2, fontFamily: cinzel, fontSize: 10, outline: 'none' }}>
                      {['free', 'soldier', 'commander', 'general'].map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <select value={faStatus} onChange={e => setFaStatus(e.target.value)}
                      style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR2}`, borderRadius: 6, padding: '8px 12px', color: TXT2, fontFamily: cinzel, fontSize: 10, outline: 'none' }}>
                      {['draft', 'published'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button onClick={() => { setShowFringeForm(false); setEditingFringe(null) }}
                      style={{ padding: '8px 18px', background: 'transparent', border: `1px solid ${BDR2}`, borderRadius: 6, color: MUT, fontFamily: cinzel, fontSize: 10, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={saveFringeArticle} disabled={fringeSaving || !faTitle.trim()}
                      style={{ padding: '8px 18px', background: GG, border: 'none', borderRadius: 6, color: '#0D0B14', fontFamily: cinzel, fontSize: 10, cursor: 'pointer', fontWeight: 700 }}>
                      {fringeSaving ? 'Saving...' : editingFringe ? 'Update' : 'Create'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Courses panel — only show when tab is courses */}
      {activeManagerTab === 'courses' && <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 16, color: GG, letterSpacing: '0.08em' }}>🎬 Training Manager</div>
          <div style={{ fontFamily: crimson, fontSize: 13, color: MUT, marginTop: 4 }}>Create and manage courses, episodes, and training content</div>
        </div>
        <button onClick={() => openCourseForm()}
          style={{ padding: '10px 20px', background: 'rgba(201,168,76,0.15)', border: `1px solid ${GG}`, borderRadius: 8, color: GG, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}>
          + New Course
        </button>
      </div>

      {/* Two-panel layout */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>

        {/* LEFT — Course list */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ fontFamily: cinzel, fontSize: 10, color: MUT, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
            Courses ({courses.length})
          </div>
          {loading ? (
            <div style={{ color: MUT, fontFamily: crimson, fontStyle: 'italic', fontSize: 13 }}>Loading...</div>
          ) : courses.length === 0 ? (
            <div style={{ background: SURF3, border: `1px solid ${BDR2}`, borderRadius: 8, padding: '24px 16px', textAlign: 'center' as const }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>🎬</div>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: MUT }}>No courses yet</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {courses.map(course => (
                <div key={course.id}
                  onClick={() => { setSelectedCourse(course); loadEpisodes(course.id); setShowEpisodeForm(false) }}
                  style={{ background: selectedCourse?.id === course.id ? 'rgba(201,168,76,0.08)' : SURF3, border: `1px solid ${selectedCourse?.id === course.id ? GG : BDR2}`, borderLeft: `3px solid ${selectedCourse?.id === course.id ? GG : 'transparent'}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 12, color: TXT2, letterSpacing: '0.04em', flex: 1 }}>{course.title}</div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                      <button onClick={e => { e.stopPropagation(); openCourseForm(course) }} style={{ background: 'none', border: 'none', color: MUT, cursor: 'pointer', fontSize: 12, padding: 2 }}>✎</button>
                      <button onClick={e => { e.stopPropagation(); deleteCourse(course.id) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: 2 }}>✕</button>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' as const }}>
                    <span style={{ fontSize: 9, color: tierColors[course.tier] || MUT, fontFamily: cinzel, letterSpacing: '0.06em', textTransform: 'uppercase' as const, border: `1px solid ${tierColors[course.tier] || MUT}`, borderRadius: 10, padding: '1px 7px' }}>{course.tier}</span>
                    <span style={{ fontSize: 9, color: statusColor(course.status), fontFamily: cinzel, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>● {course.status}</span>
                    <span style={{ fontSize: 9, color: MUT, fontFamily: crimson }}>{course.episodeCount || 0} episodes</span>
                    <span style={{ fontSize: 9, color: MUT, fontFamily: cinzel, letterSpacing: '0.06em' }}>
                      {course.course_type === 'protocol' ? '📋 Protocol' : course.course_type === 'quick-hit' ? '⚡ Quick Hit' : '📚 Course'}
                    </span>
                  </div>
                  <button onClick={e => { e.stopPropagation(); toggleCourseStatus(course) }}
                    style={{ marginTop: 8, fontSize: 9, padding: '2px 10px', background: course.status === 'published' ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)', border: `1px solid ${course.status === 'published' ? '#ef4444' : '#4ade80'}`, borderRadius: 4, color: course.status === 'published' ? '#ef4444' : '#4ade80', cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                    {course.status === 'published' ? 'Unpublish' : 'Publish'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT — Episode list */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedCourse ? (
            <div style={{ background: SURF3, border: `1px solid ${BDR2}`, borderRadius: 10, padding: '40px 24px', textAlign: 'center' as const }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>←</div>
              <div style={{ fontFamily: cinzel, fontSize: 13, color: MUT }}>Select a course to manage episodes</div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: cinzel, fontSize: 14, color: GG, letterSpacing: '0.06em' }}>{selectedCourse.title}</div>
                  <div style={{ fontFamily: cinzel, fontSize: 10, color: MUT, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginTop: 2 }}>Episodes ({episodes.length})</div>
                </div>
                <button onClick={() => openEpisodeForm()}
                  style={{ padding: '8px 16px', background: 'rgba(201,168,76,0.15)', border: `1px solid ${GG}`, borderRadius: 6, color: GG, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}>
                  + Add Episode
                </button>
              </div>

              {episodes.length === 0 ? (
                <div style={{ background: SURF3, border: `1px solid ${BDR2}`, borderRadius: 8, padding: '32px 20px', textAlign: 'center' as const }}>
                  <div style={{ fontFamily: cinzel, fontSize: 11, color: MUT }}>No episodes yet — add the first one</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {episodes.map((ep, idx) => (
                    <div key={ep.id} style={{ background: SURF3, border: `1px solid ${BDR2}`, borderRadius: 8, padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontFamily: cinzel, fontSize: 10, color: MUT, flexShrink: 0 }}>#{idx + 1}</span>
                            <span style={{ fontFamily: cinzel, fontSize: 12, color: TXT2, letterSpacing: '0.04em' }}>{ep.title}</span>
                          </div>
                          {ep.youtube_url && (
                            <div style={{ fontSize: 11, color: MUT, fontFamily: crimson, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                              🎬 {ep.youtube_url}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                            <span style={{ fontSize: 9, color: statusColor(ep.status), fontFamily: cinzel, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>● {ep.status}</span>
                            <button onClick={() => toggleEpisodeStatus(ep)}
                              style={{ fontSize: 9, padding: '1px 8px', background: ep.status === 'published' ? 'rgba(239,68,68,0.1)' : 'rgba(74,222,128,0.1)', border: `1px solid ${ep.status === 'published' ? '#ef4444' : '#4ade80'}`, borderRadius: 4, color: ep.status === 'published' ? '#ef4444' : '#4ade80', cursor: 'pointer', fontFamily: cinzel, letterSpacing: '0.06em', textTransform: 'uppercase' as const }}>
                              {ep.status === 'published' ? 'Unpublish' : 'Publish'}
                            </button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                          <button onClick={() => openEpisodeForm(ep)} style={{ background: 'none', border: 'none', color: MUT, cursor: 'pointer', fontSize: 14, padding: 2 }}>✎</button>
                          <button onClick={() => deleteEpisode(ep.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: 2 }}>✕</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Course Form Modal */}
      {showCourseForm && (
        <div style={modal} onClick={() => setShowCourseForm(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: GG, marginBottom: 20 }}>{editingCourse ? 'Edit Course' : 'New Course'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={cTitle} onChange={e => setCTitle(e.target.value)} placeholder="Course title *" style={inp2} />
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                {(['course', 'protocol', 'quick-hit'] as const).map(t => (
                  <button key={t} onClick={() => setCType(t)}
                    style={{ flex: 1, padding: '6px 8px', background: cType === t ? 'rgba(201,168,76,0.2)' : 'transparent', border: `1px solid ${cType === t ? GG : BDR2}`, borderRadius: 6, color: cType === t ? GG : MUT, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}>
                    {t === 'course' ? '📚 Course' : t === 'protocol' ? '📋 Protocol' : '⚡ Quick Hit'}
                  </button>
                ))}
              </div>
              <textarea value={cDesc} onChange={e => setCDesc(e.target.value)} placeholder="Description" rows={3} style={{ ...inp2, resize: 'vertical' as const }} />
              <input value={cThumbnail} onChange={e => setCThumbnail(e.target.value)} placeholder="Thumbnail URL (optional)" style={inp2} />
              <div style={{ display: 'flex', gap: 10 }}>
                <select value={cTier} onChange={e => setCTier(e.target.value)} style={{ ...inp2, flex: 1 }}>
                  <option value="free">Free</option>
                  <option value="soldier">Soldier</option>
                  <option value="commander">Commander</option>
                  <option value="general">General</option>
                </select>
                <select value={cStatus} onChange={e => setCStatus(e.target.value)} style={{ ...inp2, flex: 1 }}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setShowCourseForm(false)} style={{ padding: '8px 18px', background: 'transparent', border: `1px solid ${BDR2}`, borderRadius: 6, color: MUT, fontFamily: cinzel, fontSize: 10, cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveCourse} disabled={saving || !cTitle.trim()} style={{ padding: '8px 18px', background: GG, border: 'none', borderRadius: 6, color: '#0D0B14', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' as const, opacity: !cTitle.trim() ? 0.5 : 1 }}>
                  {saving ? 'Saving...' : 'Save Course'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Episode Form Modal */}
      {showEpisodeForm && (
        <div style={modal} onClick={() => setShowEpisodeForm(false)}>
          <div style={modalBox} onClick={e => e.stopPropagation()}>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: GG, marginBottom: 20 }}>{editingEpisode ? 'Edit Episode' : 'New Episode'}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input value={eTitle} onChange={e => setETitle(e.target.value)} placeholder="Episode title *" style={inp2} />
              <textarea value={eDesc} onChange={e => setEDesc(e.target.value)} placeholder="Short description" rows={2} style={{ ...inp2, resize: 'vertical' as const }} />
              <input value={eYoutube} onChange={e => setEYoutube(e.target.value)} placeholder="YouTube URL (unlisted)" style={inp2} />
              <textarea value={eNotes} onChange={e => setENotes(e.target.value)} placeholder="Episode notes / transcript / key points..." rows={5} style={{ ...inp2, resize: 'vertical' as const, lineHeight: 1.6 }} />
              <div style={{ display: 'flex', gap: 10 }}>
                <select value={eStatus} onChange={e => setEStatus(e.target.value)} style={{ ...inp2, flex: 1 }}>
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
                <input type="number" value={eSortOrder} onChange={e => setESortOrder(parseInt(e.target.value) || 0)} placeholder="Order" style={{ ...inp2, width: 80, flex: 'none' as const }} />
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button onClick={() => setShowEpisodeForm(false)} style={{ padding: '8px 18px', background: 'transparent', border: `1px solid ${BDR2}`, borderRadius: 6, color: MUT, fontFamily: cinzel, fontSize: 10, cursor: 'pointer' }}>Cancel</button>
                <button onClick={saveEpisode} disabled={saving || !eTitle.trim()} style={{ padding: '8px 18px', background: GG, border: 'none', borderRadius: 6, color: '#0D0B14', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer', fontWeight: 700, textTransform: 'uppercase' as const, opacity: !eTitle.trim() ? 0.5 : 1 }}>
                  {saving ? 'Saving...' : 'Save Episode'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>}

      {/* Events manager */}
      {activeManagerTab === 'events' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 15, color: GG, letterSpacing: '0.08em' }}>📅 Events</div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: MUT, marginTop: 3 }}>Create and manage live sessions, training calls, and special events</div>
            </div>
            <button onClick={() => openEvtForm()} style={{ padding: '10px 20px', background: 'rgba(201,168,76,0.15)', border: `1px solid ${GG}`, borderRadius: 8, color: GG, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>
              + New Event
            </button>
          </div>

          {evtMsg && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '8px 12px', color: '#f87171', fontFamily: crimson, fontSize: 13, marginBottom: 12 }}>{evtMsg}</div>}

          {evtLoading ? (
            <div style={{ color: MUT, fontFamily: crimson, fontStyle: 'italic', fontSize: 13 }}>Loading...</div>
          ) : evts.length === 0 ? (
            <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 8, padding: '32px 24px', textAlign: 'center' as const }}>
              <div style={{ fontFamily: cinzel, fontSize: 13, color: MUT }}>No events yet. Create your first event.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {evts.map(evt => {
                const evtDate = new Date(evt.event_date)
                const isPast = evtDate < new Date()
                const typeColors: Record<string, string> = { live_training: GG, prayer_call: '#7a9e7e', q_and_a: '#8B9DCA', deliverance_workshop: '#b87333' }
                const tc = typeColors[evt.event_type] || GG
                return (
                  <div key={evt.id} style={{ background: BG2, border: `1px solid ${BDR2}`, borderLeft: `3px solid ${tc}`, borderRadius: 8, padding: '14px 18px', opacity: isPast ? 0.65 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, flexWrap: 'wrap' as const }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontFamily: cinzel, fontSize: 13, color: TXT2, marginBottom: 4 }}>{evt.title}</div>
                        <div style={{ fontFamily: crimson, fontSize: 12, color: MUT }}>
                          {evtDate.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })} · {evt.duration_minutes} min
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' as const }}>
                          <span style={{ fontFamily: cinzel, fontSize: 9, color: tc, border: `1px solid ${tc}40`, borderRadius: 10, padding: '1px 8px', letterSpacing: '0.06em' }}>{evt.event_type.replace('_', ' ')}</span>
                          <span style={{ fontFamily: cinzel, fontSize: 9, color: evt.is_published ? '#4ade80' : MUT, letterSpacing: '0.06em' }}>{evt.is_published ? '● Published' : '○ Draft'}</span>
                          {evt.zoom_link && <span style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.06em' }}>🔗 Zoom ({evt.zoom_link_tier}+)</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => openEvtForm(evt)} style={{ background: 'none', border: `1px solid ${BDR2}`, borderRadius: 4, color: MUT, fontFamily: cinzel, fontSize: 9, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.06em' }}>Edit</button>
                        <button onClick={() => deleteEvent(evt.id)} style={{ background: 'none', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, color: '#f87171', fontFamily: cinzel, fontSize: 9, padding: '4px 10px', cursor: 'pointer' }}>Delete</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Event form modal */}
          {showEvtForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
              <div style={{ background: isDark ? '#0D0B14' : '#fff', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 12, width: '100%', maxWidth: 540, padding: 28, boxShadow: '0 24px 64px rgba(0,0,0,0.85)', maxHeight: '90vh', overflowY: 'auto' as const }}>
                <div style={{ fontFamily: cinzel, fontSize: 14, color: GG, letterSpacing: '0.08em', marginBottom: 20 }}>{editingEvt ? 'Edit Event' : 'New Event'}</div>
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
                  <div>
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>TITLE</label>
                    <input value={evtTitle} onChange={e => setEvtTitle(e.target.value)} style={{ ...inp2 }} placeholder="Event title" />
                  </div>
                  <div>
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>DESCRIPTION</label>
                    <textarea value={evtDesc} onChange={e => setEvtDesc(e.target.value)} rows={3} style={{ ...inp2, resize: 'vertical' as const }} placeholder="Event description" />
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 2 }}>
                      <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>DATE & TIME</label>
                      <input type="datetime-local" value={evtDate} onChange={e => setEvtDate(e.target.value)} style={{ ...inp2 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>DURATION (min)</label>
                      <input type="number" value={evtDuration} onChange={e => setEvtDuration(e.target.value)} style={{ ...inp2 }} placeholder="60" />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>TYPE</label>
                      <select value={evtType} onChange={e => setEvtType(e.target.value)} style={{ ...inp2 }}>
                        <option value="live_training">Live Training</option>
                        <option value="prayer_call">Prayer Call</option>
                        <option value="q_and_a">Q&A Session</option>
                        <option value="deliverance_workshop">Deliverance Workshop</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>MAX ATTENDEES</label>
                      <input type="number" value={evtMaxAtt} onChange={e => setEvtMaxAtt(e.target.value)} style={{ ...inp2 }} placeholder="No limit" />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>ZOOM LINK</label>
                    <input value={evtZoom} onChange={e => setEvtZoom(e.target.value)} style={{ ...inp2 }} placeholder="https://zoom.us/j/..." />
                  </div>
                  <div>
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>ZOOM LINK — MINIMUM TIER</label>
                    <select value={evtZoomTier} onChange={e => setEvtZoomTier(e.target.value)} style={{ ...inp2 }}>
                      {['free', 'soldier', 'commander', 'general', 'minister'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="evtPub" checked={evtPublished} onChange={e => setEvtPublished(e.target.checked)} style={{ width: 16, height: 16, accentColor: GG }} />
                    <label htmlFor="evtPub" style={{ fontFamily: cinzel, fontSize: 10, color: TXT2, letterSpacing: '0.06em', cursor: 'pointer' }}>Published (visible to members)</label>
                  </div>
                  {evtMsg && <div style={{ color: '#f87171', fontFamily: crimson, fontSize: 13 }}>{evtMsg}</div>}
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button onClick={() => { setShowEvtForm(false); setEditingEvt(null) }} style={{ padding: '8px 18px', background: 'transparent', border: `1px solid ${BDR2}`, borderRadius: 6, color: MUT, fontFamily: cinzel, fontSize: 10, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={saveEvent} disabled={evtSaving} style={{ padding: '8px 18px', background: GG, border: 'none', borderRadius: 6, color: '#0D0B14', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer', fontWeight: 700 }}>
                      {evtSaving ? 'Saving...' : 'Save Event'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
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

// ─── LIBRARY MANAGER ─────────────────────────────────────────────────────────
function LibraryManager({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const LBG   = isDark ? '#0D0B14' : '#f5f0e8'
  const LSURF = isDark ? '#13111a' : '#fff'
  const LBDR  = isDark ? 'rgba(201,168,76,0.2)' : 'rgba(160,120,48,0.25)'
  const LTXT  = isDark ? '#e8e0d0' : '#1a1410'
  const LMUT  = isDark ? '#9a8c74' : '#5c4a3a'
  const LG    = '#C9A84C'

  // Context state
  const [ctxText, setCtxText]       = useState('')
  const [ctxLabel, setCtxLabel]     = useState('Main Ministry Voice')
  const [ctxUpdated, setCtxUpdated] = useState<string | null>(null)
  const [ctxSaving, setCtxSaving]   = useState(false)
  const [ctxMsg, setCtxMsg]         = useState('')

  // Books state
  const [books, setBooks]           = useState<any[]>([])
  const [booksLoading, setBooksLoading] = useState(true)

  // Upload state
  const [uploadTitle, setUploadTitle]   = useState('')
  const [uploadAuthor, setUploadAuthor] = useState('')
  const [uploadNotes, setUploadNotes]   = useState('')
  const [uploadFile, setUploadFile]     = useState<File | null>(null)
  const [uploadPhase, setUploadPhase]   = useState<'idle' | 'reading' | 'uploading' | 'extracting' | 'done' | 'error'>('idle')
  const [uploadMsg, setUploadMsg]       = useState('')
  const [dragOver, setDragOver]         = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const,
    background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
    border: `1px solid ${LBDR}`, borderRadius: 6,
    padding: '8px 12px', color: LTXT, fontFamily: crimson, fontSize: 14, outline: 'none',
  }

  useEffect(() => { loadContext(); loadBooks() }, [])

  async function loadContext() {
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-context', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const d = await res.json()
        if (d.context) {
          setCtxText(d.context.context_text || '')
          setCtxLabel(d.context.label || 'Main Ministry Voice')
          setCtxUpdated(d.context.updated_at || null)
        }
      }
    } catch { /* ignore */ }
  }

  async function saveContext() {
    if (!ctxText.trim()) { setCtxMsg('Context text required'); return }
    setCtxSaving(true); setCtxMsg('')
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ context_text: ctxText, label: ctxLabel }),
      })
      if (res.ok) {
        const d = await res.json()
        setCtxUpdated(d.context?.updated_at || new Date().toISOString())
        setCtxMsg('✓ Context saved')
      } else {
        const d = await res.json(); setCtxMsg(`⚠ ${d.error}`)
      }
    } catch(e: any) { setCtxMsg(`⚠ ${e.message}`) }
    setCtxSaving(false)
  }

  async function loadBooks() {
    setBooksLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-library', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setBooks(d.books || []) }
    } catch { /* ignore */ }
    setBooksLoading(false)
  }

  function handleFileSelect(file: File) {
    if (!file.name.endsWith('.pdf')) { setUploadMsg('Only PDF files are supported'); return }
    if (file.size > 50 * 1024 * 1024) { setUploadMsg('File must be under 50MB'); return }
    setUploadFile(file)
    setUploadMsg('')
    if (!uploadTitle) setUploadTitle(file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' '))
  }

  async function uploadBook() {
    if (!uploadFile || !uploadTitle.trim()) { setUploadMsg('Title and file required'); return }
    setUploadPhase('reading')
    try {
      // Read file as base64
      const fileBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const result = reader.result as string
          resolve(result.split(',')[1]) // strip data URL prefix
        }
        reader.onerror = reject
        reader.readAsDataURL(uploadFile)
      })

      setUploadPhase('uploading')
      const token = await getToken()
      const res = await fetch('/api/admin-library', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: uploadTitle.trim(),
          author: uploadAuthor.trim() || null,
          notes: uploadNotes.trim() || null,
          fileBase64,
          fileName: uploadFile.name,
          fileSize: uploadFile.size,
        }),
      })
      setUploadPhase('extracting')
      const d = await res.json()
      if (res.ok) {
        setUploadPhase('done')
        setUploadMsg(`✓ Uploaded — ${d.pagesExtracted} pages, ${(d.textLength || 0).toLocaleString()} characters extracted`)
        setUploadTitle(''); setUploadAuthor(''); setUploadNotes(''); setUploadFile(null)
        await loadBooks()
        setTimeout(() => setUploadPhase('idle'), 3000)
      } else {
        setUploadPhase('error')
        setUploadMsg(`⚠ ${d.error}`)
      }
    } catch(e: any) {
      setUploadPhase('error')
      setUploadMsg(`⚠ ${e.message}`)
    }
  }

  async function toggleBook(id: string, is_enabled: boolean) {
    const token = await getToken()
    const res = await fetch('/api/admin-library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, is_enabled }),
    })
    if (res.ok) setBooks(prev => prev.map(b => b.id === id ? { ...b, is_enabled } : b))
  }

  async function deleteBook(id: string, file_path: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    const token = await getToken()
    const res = await fetch('/api/admin-library', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, file_path }),
    })
    if (res.ok) setBooks(prev => prev.filter(b => b.id !== id))
  }

  function fmtBytes(b: number) {
    if (!b) return '—'
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  const uploading = ['reading', 'uploading', 'extracting'].includes(uploadPhase)
  const phaseLabel: Record<string, string> = { reading: 'Reading file...', uploading: 'Uploading...', extracting: 'Extracting text...' }

  return (
    <div style={{ color: LTXT, fontFamily: crimson }}>

      {/* ── MINISTRY CONTEXT ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: cinzel, fontSize: 15, color: LG, letterSpacing: '0.08em', marginBottom: 5 }}>Ministry Voice & Theological Framework</div>
          <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, lineHeight: 1.6 }}>
            This text is prepended to every AI enhancement call. Write in your own voice — your theology, your approach, your doctrinal positions. The AI will apply this framework to all spirit research.
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>CONTEXT LABEL</label>
          <input value={ctxLabel} onChange={e => setCtxLabel(e.target.value)} style={{ ...inp, width: 280 }} placeholder="Main Ministry Voice" />
        </div>

        <div style={{ marginBottom: 8 }}>
          <label style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>YOUR MINISTRY VOICE</label>
          <textarea
            value={ctxText}
            onChange={e => setCtxText(e.target.value)}
            rows={10}
            style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }}
            placeholder={`Example: I am a Pentecostal deliverance minister operating from a charismatic evangelical framework. I believe in the authority of Scripture as the final word, the ongoing gifts of the Spirit, and the biblical mandate for deliverance ministry (Mark 16:17). My approach to spirits is through the lens of legal rights — every demon needs a door. I hold to the teaching of Derek Prince on blessings and curses, Frank Hammond on demonic groupings, and Peter Wagner on territorial spirits...`}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.06em' }}>
            {ctxText.length.toLocaleString()} characters
            {ctxUpdated && <span> · Last saved {new Date(ctxUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
          </div>
        </div>
        {ctxMsg && (
          <div style={{ fontFamily: crimson, fontSize: 13, color: ctxMsg.startsWith('✓') ? '#4ade80' : '#f87171', marginBottom: 10 }}>{ctxMsg}</div>
        )}
        <button onClick={saveContext} disabled={ctxSaving}
          style={{ padding: '10px 28px', background: LG, border: 'none', borderRadius: 6, color: '#0D0B14', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', cursor: ctxSaving ? 'not-allowed' : 'pointer', fontWeight: 700, opacity: ctxSaving ? 0.7 : 1 }}>
          {ctxSaving ? 'Saving...' : '✓ Save Context'}
        </button>
      </div>

      {/* ── PERSONAL LIBRARY ── */}
      <div style={{ borderTop: `1px solid ${LBDR}`, paddingTop: 32 }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: cinzel, fontSize: 15, color: LG, letterSpacing: '0.08em', marginBottom: 5 }}>Personal Ministry Library</div>
          <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, lineHeight: 1.6 }}>
            Upload your personal PDF books. AI will reference relevant passages when enhancing spirits.
          </div>
        </div>

        {/* Upload zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f) }}
          onClick={() => !uploading && fileInputRef.current?.click()}
          style={{ border: `2px dashed ${dragOver ? LG : 'rgba(201,168,76,0.44)'}`, borderRadius: 10, padding: '24px 20px', marginBottom: 16, cursor: uploading ? 'default' : 'pointer', background: dragOver ? 'rgba(201,168,76,0.06)' : 'transparent', transition: 'all 0.15s', textAlign: 'center' as const }}
        >
          <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = '' }} />
          {uploading ? (
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: LG, letterSpacing: '0.1em', marginBottom: 4 }}>{phaseLabel[uploadPhase]}</div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT }}>Please wait...</div>
            </div>
          ) : uploadFile ? (
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 12, color: LG, marginBottom: 4 }}>📄 {uploadFile.name}</div>
              <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT }}>{fmtBytes(uploadFile.size)} · Click to change</div>
            </div>
          ) : (
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 12, color: LG, letterSpacing: '0.06em', marginBottom: 4 }}>Drop PDF here or click to select</div>
              <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT }}>PDF only · Max 50MB</div>
            </div>
          )}
        </div>

        {uploadFile && !uploading && (
          <div style={{ background: LSURF, border: `1px solid ${LBDR}`, borderRadius: 8, padding: '16px 18px', marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
              <div style={{ flex: 2, minWidth: 180 }}>
                <label style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>TITLE *</label>
                <input value={uploadTitle} onChange={e => setUploadTitle(e.target.value)} style={inp} placeholder="Book title" />
              </div>
              <div style={{ flex: 1, minWidth: 140 }}>
                <label style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>AUTHOR</label>
                <input value={uploadAuthor} onChange={e => setUploadAuthor(e.target.value)} style={inp} placeholder="Author name" />
              </div>
            </div>
            <div style={{ marginTop: 10 }}>
              <label style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>NOTES (optional)</label>
              <input value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} style={inp} placeholder="Personal notes about this book..." />
            </div>
            <div style={{ marginTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={uploadBook} disabled={!uploadTitle.trim()}
                style={{ padding: '10px 24px', background: uploadTitle.trim() ? LG : 'rgba(201,168,76,0.3)', border: 'none', borderRadius: 6, color: uploadTitle.trim() ? '#0D0B14' : LMUT, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: uploadTitle.trim() ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                Upload & Extract
              </button>
              <button onClick={() => { setUploadFile(null); setUploadMsg(''); setUploadPhase('idle') }}
                style={{ padding: '10px 16px', background: 'transparent', border: `1px solid ${LBDR}`, borderRadius: 6, color: LMUT, fontFamily: cinzel, fontSize: 10, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {uploadMsg && (
          <div style={{ fontFamily: crimson, fontSize: 13, color: uploadMsg.startsWith('✓') ? '#4ade80' : '#f87171', marginBottom: 14 }}>{uploadMsg}</div>
        )}

        {/* Book list */}
        {booksLoading ? (
          <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, fontStyle: 'italic', padding: '20px 0' }}>Loading library...</div>
        ) : books.length === 0 ? (
          <div style={{ background: LSURF, border: `1px solid ${LBDR}`, borderRadius: 10, padding: '32px 24px', textAlign: 'center' as const }}>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: LMUT, marginBottom: 10 }}>No books uploaded yet</div>
            <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, lineHeight: 1.7 }}>
              Add your personal ministry library to give the AI your theological framework.
            </div>
            <div style={{ marginTop: 18, padding: '14px 18px', background: 'rgba(201,168,76,0.05)', border: `1px solid rgba(201,168,76,0.15)`, borderRadius: 8, textAlign: 'left' as const }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', marginBottom: 8 }}>SUGGESTED UPLOADS</div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, lineHeight: 1.9 }}>
                Pigs in the Parlor — Frank Hammond<br />
                Blessing or Curse — Derek Prince<br />
                Battling the Hosts of Hell — Win Worley<br />
                He Came to Set the Captives Free — Rebecca Brown<br />
                Unbroken Curses — Rebecca Greenwood
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 10, color: LMUT, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 12 }}>
              {books.length} book{books.length !== 1 ? 's' : ''} · {books.filter(b => b.is_enabled).length} active in AI context
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {books.map(book => (
                <div key={book.id} style={{ background: LSURF, border: `1px solid rgba(201,168,76,0.22)`, borderLeft: `3px solid ${book.is_enabled ? LG : 'rgba(201,168,76,0.25)'}`, borderRadius: 8, padding: '14px 18px', opacity: book.is_enabled ? 1 : 0.6, transition: 'all 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 13, color: LTXT, marginBottom: 3, letterSpacing: '0.04em' }}>{book.title}</div>
                      {book.author && <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT, marginBottom: 4, fontStyle: 'italic' }}>{book.author}</div>}
                      <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.06em', marginBottom: book.notes ? 6 : 0 }}>
                        {fmtBytes(book.file_size_bytes)}
                        {book.page_count ? ` · ${book.page_count} pages` : ''}
                        {book.upload_date ? ` · ${new Date(book.upload_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                      </div>
                      {book.notes && <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT, fontStyle: 'italic' }}>{book.notes}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
                      {/* Toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em' }}>AI</span>
                        <button
                          onClick={() => toggleBook(book.id, !book.is_enabled)}
                          style={{ width: 38, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', background: book.is_enabled ? LG : 'rgba(255,255,255,0.15)', position: 'relative' as const, transition: 'background 0.2s', padding: 0 }}
                        >
                          <div style={{ position: 'absolute' as const, top: 3, left: book.is_enabled ? 20 : 3, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                        </button>
                      </div>
                      <button onClick={() => deleteBook(book.id, book.file_path, book.title)}
                        style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#f87171', fontFamily: cinzel, fontSize: 9, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(201,168,76,0.04)', border: `1px solid rgba(201,168,76,0.12)`, borderRadius: 8 }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', marginBottom: 6 }}>SUGGESTED UPLOADS</div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, lineHeight: 1.9 }}>
                Pigs in the Parlor — Frank Hammond · Blessing or Curse — Derek Prince · Battling the Hosts of Hell — Win Worley · He Came to Set the Captives Free — Rebecca Brown · Unbroken Curses — Rebecca Greenwood
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function AdminPage() {
  const { user, isLoaded } = useUser()
  const { getToken }       = useAuth()
  const [tab, setTab]      = useState<'arsenal' | 'intel' | 'moderation' | 'training' | 'library'>('arsenal')
  const [isMobile, setIsMobile] = useState(false)
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('wri-theme') !== 'light'
  })
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const headerBg  = isDark ? '#13111e' : '#e8e0d4'
  const contentBg = isDark ? '#0D0B14' : '#f5f0e8'
  const adBdr     = isDark ? 'rgba(201,168,76,0.18)' : 'rgba(160,120,48,0.25)'
  const adGold    = isDark ? '#C9A84C' : '#a07830'
  const adDim     = isDark ? '#9a8c74' : '#5c4a3a'

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
    { key: 'arsenal',    label: 'Arsenal Manager'   },
    { key: 'intel',      label: 'Intel Archive'     },
    { key: 'moderation', label: 'Moderation'        },
    { key: 'training',   label: 'Training'          },
    { key: 'library',    label: 'Ministry Library'  },
  ] as const

  return (
    <div style={{ minHeight: '100vh', background: contentBg, color: TXT, fontFamily: crimson }}>
      {isMobile && (
        <div style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '12px 16px', margin: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18 }}>⚠</span>
          <div style={{ fontFamily: crimson, fontSize: 13, color: adDim }}>
            Admin panel is optimized for desktop. Some features may be limited on mobile.
          </div>
        </div>
      )}
      {/* Header */}
      <div style={{ background: headerBg, borderBottom: `1px solid ${adBdr}`, padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: adDim, textDecoration: 'none' }}>← Community</a>
          <span style={{ color: adBdr }}>|</span>
          <span style={{ fontFamily: cinzel, fontSize: 13, letterSpacing: '0.14em', color: adGold }}>⚔ Admin Panel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: adDim }}>{user?.firstName} {user?.lastName}</span>
          <button onClick={() => {
            const next = !isDark
            setIsDark(next)
            localStorage.setItem('wri-theme', next ? 'dark' : 'light')
          }} style={{ background: 'none', border: `1px solid ${adBdr}`, borderRadius: '50%', width: 28, height: 28, color: adGold, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isDark ? '☀' : '🌙'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${adBdr}`, padding: '0 32px', display: 'flex', background: headerBg, overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as any }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '14px 22px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.key ? adGold : 'transparent'}`,
              color: tab === t.key ? adGold : adDim,
              fontFamily: cinzel, fontSize: 10,
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
        {tab === 'intel'      && <IntelArchive getToken={getToken} isDark={isDark} />}
        {tab === 'moderation' && <ModerationPanel getToken={getToken} />}
        {tab === 'training'   && <TrainingManager getToken={getToken} isDark={isDark} />}
        {tab === 'library'    && <LibraryManager getToken={getToken} isDark={isDark} />}
      </div>
    </div>
  )
}
