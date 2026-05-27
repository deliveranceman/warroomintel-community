// STYLE RULE: No em dashes (—) in any UI text. Ever. Rewrite the phrase naturally.
import { useState, useEffect, useRef, useMemo, Fragment, type CSSProperties } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useAuth, useUser } from '@clerk/tanstack-start'
import { SpiritTagEditor } from '@/components/SpiritTagEditor'

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

function markdownToHtml(md: string): string {
  if (!md) return ''
  return md
    .replace(/^### (.+)$/gm, '<h3 style="font-family:Cinzel,serif;color:#C9A84C;font-size:14px;letter-spacing:0.08em;margin:20px 0 8px;font-weight:700">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="font-family:Cinzel,serif;color:#C9A84C;font-size:18px;letter-spacing:0.06em;margin:24px 0 10px;font-weight:700">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="font-family:Cinzel,serif;color:#C9A84C;font-size:22px;margin:28px 0 12px;font-weight:700">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em style="color:#a09888">$1</em>')
    .replace(/^> (.+)$/gm, '<blockquote style="border-left:3px solid #C9A84C;padding:8px 16px;margin:16px 0;color:#8B7355;font-style:italic;background:rgba(201,168,76,0.04);border-radius:0 4px 4px 0">$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li style="margin:6px 0;padding-left:4px">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul style="padding-left:20px;margin:12px 0;list-style:disc">${match}</ul>`)
    .replace(/^\d+\. (.+)$/gm, '<li style="margin:6px 0">$1</li>')
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px;line-height:1.8">')
    .replace(/\n/g, '<br/>')
    .replace(/^([^<].+)$/gm, (match) => match.startsWith('<') ? match : `<p style="margin:0 0 16px;line-height:1.8">${match}</p>`)
    .replace(/<p[^>]*><\/p>/g, '')
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
  const [arsenalEditId, setArsenalEditId] = useState<string | null>(null)
  const [arsenalEditForm, setArsenalEditForm] = useState<any>({})
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
              Review & Confirm: {bulkPreviews.filter(p => p.approved).length} of {bulkPreviews.length} selected
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
                <div style={{ marginTop: 6 }}>
                  <input
                    value={preview.spirit_tags || ''}
                    onChange={e => setBulkPreviews(prev => prev.map((p, i) => i === idx ? { ...p, spirit_tags: e.target.value } : p))}
                    placeholder="Spirit Tags (optional): Baal, Jezebel, Leviathan"
                    style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 5, padding: '5px 8px', color: TXT, fontFamily: crimson, fontSize: 12, outline: 'none' }}
                  />
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
                    if (preview.spirit_tags) formData.append('spirit_tags', preview.spirit_tags)
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
            <Fragment key={r.id}>
            <div style={{ background: SURF, border: `1px solid ${BDR}`, borderLeft: `3px solid ${TIER_COLORS[r.tier] || DIM}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
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
                onClick={() => {
                  setArsenalEditId(arsenalEditId === r.id ? null : r.id)
                  setArsenalEditForm({
                    title:      r.title || '',
                    topic:      r.topic || r.category || '',
                    tier:       (r.tier || r.access_tier || 'free').toLowerCase(),
                    tags:       Array.isArray(r.tags) ? r.tags : [],
                    notes:      r.description || r.notes || '',
                    spirit_tags: Array.isArray(r.spirit_tags) ? r.spirit_tags : [],
                  })
                }}
                style={{ background: arsenalEditId === r.id ? 'rgba(201,168,76,0.2)' : 'transparent', border: '1px solid rgba(201,168,76,0.5)', borderRadius: 5, color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}
              >
                {arsenalEditId === r.id ? '✕ Close' : '✎ Edit'}
              </button>
              <button
                onClick={() => handleDelete(r.id)}
                disabled={deleting === r.id}
                style={{ background: 'transparent', border: `1px solid rgba(220,38,38,0.3)`, borderRadius: 5, color: '#f87171', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', padding: '4px 10px', cursor: 'pointer', flexShrink: 0 }}
              >
                {deleting === r.id ? '...' : '🗑 Delete'}
              </button>
            </div>
            {/* ── Inline edit panel ── */}
            {arsenalEditId === r.id && (
              <div style={{ marginTop: 10, background: 'rgba(201,168,76,0.05)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
                <div>
                  <label style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>TITLE</label>
                  <input value={arsenalEditForm.title} onChange={e => setArsenalEditForm((f: any) => ({ ...f, title: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR}`, borderRadius: 4, padding: '6px 10px', color: TXT, fontFamily: crimson, fontSize: 13, outline: 'none' }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>TIER</label>
                    <select value={arsenalEditForm.tier} onChange={e => setArsenalEditForm((f: any) => ({ ...f, tier: e.target.value }))} style={{ width: '100%', background: BG, border: `1px solid ${BDR}`, borderRadius: 4, padding: '6px 10px', color: TXT, fontFamily: cinzel, fontSize: 10, outline: 'none' }}>
                      {['free','soldier','commander','general'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 2 }}>
                    <label style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>TOPIC</label>
                    <select value={arsenalEditForm.topic} onChange={e => setArsenalEditForm((f: any) => ({ ...f, topic: e.target.value }))} style={{ width: '100%', background: BG, border: `1px solid ${BDR}`, borderRadius: 4, padding: '6px 10px', color: TXT, fontFamily: cinzel, fontSize: 10, outline: 'none' }}>
                      {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>DESCRIPTION</label>
                  <textarea value={arsenalEditForm.notes} onChange={e => setArsenalEditForm((f: any) => ({ ...f, notes: e.target.value }))} rows={2} style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR}`, borderRadius: 4, padding: '6px 10px', color: TXT, fontFamily: crimson, fontSize: 13, outline: 'none', resize: 'vertical' as const }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={async () => {
                    const token = await getToken()
                    const res = await fetch('/api/admin-resources', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ id: r.id, ...arsenalEditForm }),
                    })
                    if (res.ok) {
                      setResources((prev: any[]) => prev.map((x: any) => x.id === r.id ? { ...x, ...arsenalEditForm, tier: arsenalEditForm.tier } : x))
                      setArsenalEditId(null)
                    } else { const d = await res.json().catch(() => ({})); alert(d.error || 'Save failed') }
                  }} style={{ background: G, color: '#0D0B14', border: 'none', borderRadius: 4, padding: '6px 18px', cursor: 'pointer', fontFamily: cinzel, fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }}>Save</button>
                  <button onClick={() => setArsenalEditId(null)} style={{ background: 'transparent', border: `1px solid ${BDR}`, color: DIM, borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontFamily: cinzel, fontSize: 10 }}>Cancel</button>
                </div>
              </div>
            )}
            </Fragment>
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
    [INTEL_NAME_F]: '', 'Also Known As': '', 'Description': '',
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
    [INTEL_NAME_F]: d.name || '', 'Also Known As': d.aka || '',
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
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Description</label>{ta('Description')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Manifestiation</label>{ta('Manifestiation')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Entry Points</label>{ta('Entry Points')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Legal Rights</label>{ta('Legal Rights')}</div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>Symptoms</label>{ta('Symptoms')}</div>
        <div>
          <label style={l}>Companion Spirits</label>
          <SpiritTypeahead mode="multi" value={f('Companion Spirits')} onChange={v => setField('Companion Spirits', v)} demons={demons} placeholder="Type spirit name to add..." />
        </div>
        <div>
          <label style={l}>Kingdom</label>
          <select value={f('Kingdom')} onChange={e => setField('Kingdom', e.target.value)} style={{ ...i }}>
            <option value="">Select</option>
            {['Hell', 'Darkness', 'Air', 'Water', 'Earth', 'Witchcraft', 'Occult'].map(k => <option key={k}>{k}</option>)}
          </select>
        </div>
        <div style={{ gridColumn: '1 / -1' }}><label style={l}>WRI Exorcist Notes</label>{ta('WRI Exorcist Notes')}</div>
        <div>
          <label style={l}>Hierarchy Category</label>
          <select value={f('Hierarchy Category')} onChange={e => setField('Hierarchy Category', e.target.value)} style={{ ...i }}>
            <option value="">Select</option>
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
            <option value="">Select</option>
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
            <option value="">Select</option>
            {['Principality', 'Power', 'Ruler of Darkness', 'Spiritual Wickedness in High Places', 'Fallen Angel', 'Demon', 'Familiar Spirit', 'Spirit of Infirmity'].map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label style={l}>Case Type</label>
          <select value={f('Case Type')} onChange={e => setField('Case Type', e.target.value)} style={{ ...i }}>
            <option value="">Select</option>
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
  ['biblicalRank', 'caseType', 'phonetic', 'isGenerational', 'isTerritorial', 'clusterSpirits', 'relatedSpirits'],
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
  const [sortCol, setSortCol]     = useState<'name' | 'biblicalRank' | 'hierarchyCategory'>('name')
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

  function handleSort(col: 'name' | 'biblicalRank' | 'hierarchyCategory') {
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
      setAiError('AI returned no fields. The model may have returned non-JSON output. Try again.')
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
        setAiError('AI returned no fields. Try again.')
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
                <th style={{ ...thS, color: isDark ? DIM : '#5c4a3a' }} onClick={() => handleSort('biblicalRank')}>Biblical Rank{sortInd('biblicalRank')}</th>
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
                    <td style={{ ...tdS, color: DIM, maxWidth: 110, fontSize: 12 }}>{d.biblicalRank || ''}</td>
                    <td style={{ ...tdS }}>
                      {d.hierarchyCategory ? (
                        <span style={{
                          background: (HIER_COLORS[d.hierarchyCategory] || '#555') + '28',
                          color: HIER_COLORS[d.hierarchyCategory] || DIM,
                          border: `1px solid ${(HIER_COLORS[d.hierarchyCategory] || '#555')}44`,
                          borderRadius: 999, padding: '2px 8px', fontSize: 9,
                          fontFamily: cinzel, letterSpacing: '0.04em', whiteSpace: 'nowrap' as const,
                        }}>{d.hierarchyCategory}</span>
                      ) : null}
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
                  AI will research this entity across Scripture, archaeology, Dead Sea Scrolls, patristics, and deliverance ministry sources, filling only empty fields.
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
                  Researching in 3 passes. This takes 30-45 seconds.
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
                  <div style={{ fontFamily: cinzel, fontSize: 11, color: MUT }}>No episodes yet. Add the first one.</div>
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
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>ZOOM LINK / MINIMUM TIER</label>
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
          <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em', marginBottom: 4 }}>🛡 Moderation: Community Feedback</div>
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
          TESTIMONY QUEUE: {testimonies.filter(t => t.status === 'pending').length} pending
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

      <ForumModerationPanel getToken={getToken} />
    </div>
  )
}

// ─── FORUM MODERATION ────────────────────────────────────────────────────────
function ForumModerationPanel({ getToken }: { getToken: any }) {
  const [flagged,  setFlagged]  = useState<any[]>([])
  const [recent,   setRecent]   = useState<any[]>([])
  const [loading,  setLoading]  = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const token = await getToken()
      // Fetch flagged posts
      const r1 = await fetch('/api/forum-posts?sort=new&limit=50', { headers: { Authorization: `Bearer ${token}` } })
      if (r1.ok) {
        const d = await r1.json()
        const all: any[] = d.posts || []
        setFlagged(all.filter((p: any) => p.flagged))
        setRecent(all.slice(0, 20))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function pinPost(id: string, pinned: boolean) {
    const token = await getToken()
    await fetch('/api/forum-posts', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, pinned }) })
    setRecent(prev => prev.map(p => p.id === id ? { ...p, pinned } : p))
  }

  async function unflag(id: string) {
    const token = await getToken()
    await fetch('/api/forum-posts', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, flagged: false }) })
    setFlagged(prev => prev.filter(p => p.id !== id))
  }

  async function del(id: string, isRecent: boolean) {
    if (!confirm('Delete this post?')) return
    const token = await getToken()
    await fetch(`/api/forum-posts?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (isRecent) setRecent(prev => prev.filter(p => p.id !== id))
    setFlagged(prev => prev.filter(p => p.id !== id))
  }

  const rowSt: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 14px', background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, marginBottom: 6 }
  const btnSt = (danger?: boolean): React.CSSProperties => ({ background: 'transparent', border: `1px solid ${danger ? 'rgba(248,113,113,0.3)' : BDR}`, borderRadius: 4, color: danger ? '#f87171' : DIM, fontFamily: cinzel, fontSize: 8, padding: '3px 10px', cursor: 'pointer' })

  if (loading) return <div style={{ color: DIM, fontFamily: crimson, fontStyle: 'italic', padding: '16px 0', fontSize: 13 }}>Loading forum data…</div>

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.1em', marginBottom: 16 }}>⚔ Forum: The War Room Board</div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' as const }}>
        {[
          { label: 'Total Posts', value: recent.length },
          { label: 'Flagged', value: flagged.length, warn: flagged.length > 0 },
          { label: 'This Week', value: recent.filter(p => Date.now() - new Date(p.created_at).getTime() < 7 * 86400000).length },
        ].map(s => (
          <div key={s.label} style={{ background: SURF, border: `1px solid ${s.warn ? 'rgba(248,113,113,0.4)' : BDR}`, borderRadius: 8, padding: '10px 18px', textAlign: 'center' as const }}>
            <div style={{ fontFamily: cinzel, fontSize: 16, color: s.warn ? '#f87171' : TXT }}>{s.value}</div>
            <div style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.08em', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
        <a href="/community/forum" target="_blank" rel="noopener noreferrer" style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 8, padding: '10px 18px', color: DIM, fontFamily: cinzel, fontSize: 9, textDecoration: 'none', display: 'flex', alignItems: 'center', letterSpacing: '0.08em' }}>View Board →</a>
      </div>

      {/* Flagged */}
      {flagged.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 10, color: '#f87171', letterSpacing: '0.1em', marginBottom: 10 }}>🚨 Flagged Posts ({flagged.length})</div>
          {flagged.map(p => (
            <div key={p.id} style={{ ...rowSt, borderLeft: '3px solid #f87171' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: cinzel, fontSize: 11, color: TXT, marginBottom: 3 }}>{p.title}</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: DIM }}>{p.author_name} · {p.post_type} · {new Date(p.created_at).toLocaleDateString()}</div>
                {p.body && <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.body.slice(0, 120)}</div>}
              </div>
              <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                <button onClick={() => unflag(p.id)} style={btnSt()}>Unflag</button>
                <button onClick={() => del(p.id, false)} style={btnSt(true)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent posts */}
      <div>
        <div style={{ fontFamily: cinzel, fontSize: 10, color: DIM, letterSpacing: '0.1em', marginBottom: 10 }}>Recent Posts</div>
        {recent.slice(0, 20).map(p => (
          <div key={p.id} style={rowSt}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: TXT, marginBottom: 2 }}>{p.title}</div>
              <div style={{ fontFamily: crimson, fontSize: 11, color: DIM }}>{p.author_name} · {p.post_type} · ▲{p.upvotes} · 💬{p.comment_count} · {new Date(p.created_at).toLocaleDateString()}</div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button onClick={() => pinPost(p.id, !p.pinned)} style={{ ...btnSt(), color: p.pinned ? G : DIM, borderColor: p.pinned ? 'rgba(201,168,76,0.4)' : BDR }}>{p.pinned ? '📌 Unpin' : '📌 Pin'}</button>
              <button onClick={() => del(p.id, true)} style={btnSt(true)}>Delete</button>
            </div>
          </div>
        ))}
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

  // Multi-context state
  const [contexts, setContexts]         = useState<any[]>([])
  const [ctxLoading, setCtxLoading]     = useState(true)
  const [editingCtxId, setEditingCtxId] = useState<string | null>(null)
  const [editCtxLabel, setEditCtxLabel] = useState('')
  const [editCtxScope, setEditCtxScope] = useState('global')
  const [editCtxText, setEditCtxText]   = useState('')
  const [editCtxSaving, setEditCtxSaving] = useState(false)
  const [editCtxMsg, setEditCtxMsg]     = useState('')
  const [showNewCtx, setShowNewCtx]     = useState(false)
  const [newCtxLabel, setNewCtxLabel]   = useState('')
  const [newCtxScope, setNewCtxScope]   = useState('global')
  const [newCtxText, setNewCtxText]     = useState('')
  const [newCtxSaving, setNewCtxSaving] = useState(false)
  const [newCtxMsg, setNewCtxMsg]       = useState('')

  // Books state
  const [books, setBooks]           = useState<any[]>([])
  const [booksLoading, setBooksLoading] = useState(true)

  // Inline edit state — one card open at a time
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editForm,    setEditForm]    = useState<{ title: string; author: string; notes: string; topic: string; spirit_tags: string[] }>({ title: '', author: '', notes: '', topic: 'ministry-library', spirit_tags: [] })
  const [editLoading, setEditLoading] = useState(false)

  // Re-tag state
  const [retagRunning, setRetagRunning] = useState(false)
  const [retagProgress, setRetagProgress] = useState<{ done: number; total: number; updated: number } | null>(null)

  // Library summary state
  const [libSummary, setLibSummary]     = useState<{ summary: string; books: any[] } | null>(null)
  const [libSummaryOpen, setLibSummaryOpen] = useState(false)
  const [libSummaryLoading, setLibSummaryLoading] = useState(false)

  // Staged files state
  type StagedFile = {
    id: string; file: File; title: string; author: string; notes: string
    spirit_tags: string[]
    status: 'pending' | 'analyzing' | 'uploading' | 'done' | 'error'
    errorMsg?: string; aiGenerated: boolean
  }
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [dragOver, setDragOver]       = useState(false)
  const [uploadingAll, setUploadingAll] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const,
    background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
    border: `1px solid ${LBDR}`, borderRadius: 6,
    padding: '8px 12px', color: LTXT, fontFamily: crimson, fontSize: 14, outline: 'none',
  }

  useEffect(() => { loadContexts(); loadBooks() }, [])

  async function loadContexts() {
    setCtxLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-context', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setContexts(d.contexts || []) }
    } catch { /* ignore */ }
    setCtxLoading(false)
  }

  async function createContext() {
    if (!newCtxText.trim()) { setNewCtxMsg('Context text required'); return }
    setNewCtxSaving(true); setNewCtxMsg('')
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: newCtxLabel || 'Ministry Context', context_text: newCtxText, scope: newCtxScope, is_active: true }),
      })
      if (res.ok) {
        const d = await res.json()
        setContexts(prev => [d.context, ...prev])
        setShowNewCtx(false); setNewCtxLabel(''); setNewCtxText(''); setNewCtxScope('global')
      } else { const d = await res.json(); setNewCtxMsg(`⚠ ${d.error}`) }
    } catch(e: any) { setNewCtxMsg(`⚠ ${e.message}`) }
    setNewCtxSaving(false)
  }

  async function updateContext() {
    if (!editingCtxId || !editCtxText.trim()) return
    setEditCtxSaving(true); setEditCtxMsg('')
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-context', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id: editingCtxId, label: editCtxLabel, context_text: editCtxText, scope: editCtxScope }),
      })
      if (res.ok) {
        const d = await res.json()
        setContexts(prev => prev.map(c => c.id === editingCtxId ? d.context : c))
        setEditingCtxId(null); setEditCtxMsg('')
      } else { const d = await res.json(); setEditCtxMsg(`⚠ ${d.error}`) }
    } catch(e: any) { setEditCtxMsg(`⚠ ${e.message}`) }
    setEditCtxSaving(false)
  }

  async function toggleContextActive(id: string, is_active: boolean) {
    const token = await getToken()
    const res = await fetch('/api/admin-context', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, is_active }),
    })
    if (res.ok) setContexts(prev => prev.map(c => c.id === id ? { ...c, is_active } : c))
  }

  async function deleteContext(id: string, label: string) {
    if (!confirm(`Delete "${label || 'this context'}"? Cannot be undone.`)) return
    const token = await getToken()
    const res = await fetch('/api/admin-context', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id }),
    })
    if (res.ok) setContexts(prev => prev.filter(c => c.id !== id))
  }

  const SCOPE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
    global:     { label: 'GLOBAL',     color: '#C9A84C', desc: 'Prepended to every AI call' },
    regional:   { label: 'REGIONAL',   color: '#8B9DCA', desc: 'Used for territorial/regional spirits' },
    session:    { label: 'SESSION',    color: '#7a9e7e', desc: 'Used for session indicators, prayer & aftercare' },
    assessment: { label: 'ASSESSMENT', color: '#b87a3d', desc: 'Used for assessment AI summaries' },
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

  function addFiles(files: FileList | File[]) {
    const valid = Array.from(files).filter(f => {
      const ok = (f.name.endsWith('.pdf') || f.name.endsWith('.txt')) && f.size <= 50 * 1024 * 1024
      return ok
    })
    setStagedFiles(prev => {
      const existing = new Set(prev.map(s => s.file.name + s.file.size))
      const fresh = valid
        .filter(f => !existing.has(f.name + f.size))
        .slice(0, 10 - prev.length)
        .map(f => ({
          id: crypto.randomUUID(),
          file: f,
          // Strip extension → strip ALL leading numeric doc-ID blocks → normalise separators
          // e.g. "355225898-32149476-Principles-Of-Mass-Deliverance.txt" → "Principles Of Mass Deliverance"
          title: f.name.replace(/\.[^/.]+$/, '').replace(/^(\d+[-_\s]*)+/, '').replace(/[-_]/g, ' ').trim(),
          author: '', notes: '', spirit_tags: [],
          status: 'pending' as const,
          aiGenerated: false,
        }))
      return [...prev, ...fresh]
    })
  }

  function updateStaged(id: string, patch: Partial<{ title: string; author: string; notes: string; spirit_tags: string[]; status: StagedFile['status']; errorMsg: string; aiGenerated: boolean }>) {
    setStagedFiles(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  async function handleAutoFill() {
    const token = await getToken()
    console.log('[handleAutoFill] token present:', !!token, '| staged pending:', stagedFiles.filter(f => f.status === 'pending').length)
    if (!token) {
      console.error('[handleAutoFill] no token — aborting')
      return
    }
    const pending = stagedFiles.filter(f => f.status === 'pending')
    if (!pending.length) return
    await Promise.all(pending.map(async sf => {
      console.log('[handleAutoFill] processing file id:', sf.id, 'name:', sf.file.name)
      setStagedFiles(prev => prev.map(f => f.id === sf.id ? { ...f, status: 'analyzing' } : f))
      try {
        let contentSnippet = ''
        if (sf.file.name.toLowerCase().endsWith('.txt')) {
          contentSnippet = await new Promise<string>((res, rej) => {
            const reader = new FileReader()
            reader.onload = () => res((reader.result as string).slice(0, 2000))
            reader.onerror = rej
            reader.readAsText(sf.file.slice(0, 4000))
          })
        }
        const resp = await fetch('/api/library-autofill', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: sf.file.name, contentSnippet }),
        })
        let d: any = {}
        try { d = await resp.json() } catch { d = {} }
        console.log('[handleAutoFill] resp status:', resp.status, '| body:', d)
        if (!resp.ok) {
          const msg = d.error || `HTTP ${resp.status}`
          console.error('[handleAutoFill] API error for', sf.id, ':', msg)
          setStagedFiles(prev => prev.map(f => f.id === sf.id
            ? { ...f, status: 'error', errorMsg: msg }
            : f))
          return
        }
        // Expect { title, author, notes, topic, spirit_tags } — populate only non-empty fields
        console.log('[handleAutoFill] success for', sf.id, '| title:', d.title, 'author:', d.author, 'spirit_tags:', d.spirit_tags)
        setStagedFiles(prev => prev.map(f => {
          if (f.id !== sf.id) return f
          return {
            ...f,
            title: d.title?.trim() || f.title,
            author: d.author?.trim() || f.author,
            notes: d.notes?.trim() || f.notes,
            spirit_tags: Array.isArray(d.spirit_tags) ? d.spirit_tags : f.spirit_tags,
            aiGenerated: true,
            status: 'pending' as const,
            errorMsg: undefined,
          }
        }))
      } catch (e: any) {
        console.error('[handleAutoFill] fetch threw for', sf.id, ':', e)
        setStagedFiles(prev => prev.map(f => f.id === sf.id
          ? { ...f, status: 'error', errorMsg: e.message || 'Network error' }
          : f))
      }
    }))
  }

  async function handleUploadAll() {
    const token = await getToken()
    const pending = stagedFiles.filter(f => f.status === 'pending')
    if (!pending.length) return
    setUploadingAll(true)
    for (const sf of pending) {
      // Step 1 — signed URL
      updateStaged(sf.id, { status: 'uploading' })
      let signedUrl = '', filePath = ''
      try {
        const urlRes = await fetch('/api/admin-library-url', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: sf.file.name, contentType: sf.file.type || 'application/octet-stream' }),
        })
        const urlData = await urlRes.json()
        if (!urlRes.ok) { updateStaged(sf.id, { status: 'error', errorMsg: urlData.error || 'Failed to get upload URL' }); continue }
        signedUrl = urlData.signedUrl
        filePath = urlData.filePath
      } catch (e: any) {
        updateStaged(sf.id, { status: 'error', errorMsg: e.message }); continue
      }

      // Step 2 — PUT to Supabase
      try {
        const storageRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': sf.file.type || 'application/octet-stream' },
          body: sf.file,
        })
        if (!storageRes.ok) { updateStaged(sf.id, { status: 'error', errorMsg: `Storage upload failed: ${storageRes.status}` }); continue }
      } catch (e: any) {
        updateStaged(sf.id, { status: 'error', errorMsg: e.message }); continue
      }

      // Step 3 — save metadata
      try {
        const saveRes = await fetch('/api/admin-library-save', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sf.title.trim() || sf.file.name,
            author: sf.author.trim() || null,
            notes: sf.notes.trim() || null,
            spirit_tags: sf.spirit_tags ?? [],
            filename: sf.file.name,
            file_size: sf.file.size,
            file_path: filePath,
            ai_generated: sf.aiGenerated,
            file_type: sf.file.name.endsWith('.pdf') ? 'pdf' : 'txt',
          }),
        })
        const saveData = await saveRes.json()
        if (!saveData.success) { updateStaged(sf.id, { status: 'error', errorMsg: saveData.error || 'Save failed' }); continue }
        updateStaged(sf.id, { status: 'done' })
        if (saveData.book) setBooks(prev => [saveData.book, ...prev])
      } catch (e: any) {
        updateStaged(sf.id, { status: 'error', errorMsg: e.message })
      }
    }
    setUploadingAll(false)
  }


  async function toggleBook(id: string, active: boolean) {
    const token = await getToken()
    const res = await fetch('/api/admin-library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, active }),
    })
    if (res.ok) setBooks(prev => prev.map(b => b.id === id ? { ...b, active } : b))
  }

  async function toggleAiEnabled(id: string, ai_generated: boolean) {
    const token = await getToken()
    const res = await fetch('/api/admin-library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, ai_generated }),
    })
    if (res.ok) setBooks(prev => prev.map(b => b.id === id ? { ...b, ai_generated } : b))
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
    if (!b) return ''
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
    return `${(b / (1024 * 1024)).toFixed(1)} MB`
  }

  function openEdit(book: any) {
    setEditingId(book.id)
    setEditForm({
      title:       book.title  || '',
      author:      book.author || '',
      notes:       book.notes  || '',
      topic:       book.topic  || 'ministry-library',
      spirit_tags: Array.isArray(book.spirit_tags) ? book.spirit_tags : [],
    })
    setEditLoading(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditLoading(false)
  }

  async function saveEdit() {
    if (!editingId) return
    const token = await getToken()
    const res = await fetch('/api/admin-library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id:          editingId,
        title:       editForm.title.trim(),
        author:      editForm.author.trim(),
        notes:       editForm.notes.trim(),
        topic:       editForm.topic,
        spirit_tags: editForm.spirit_tags,
      }),
    })
    if (res.ok) {
      const d = await res.json()
      if (d.book) setBooks(prev => prev.map(b => b.id === editingId ? { ...b, ...d.book } : b))
      else setBooks(prev => prev.map(b => b.id === editingId ? { ...b, ...editForm } : b))
    }
    cancelEdit()
  }

  /** Re-run AI autofill inside the open edit panel */
  async function aiRenameInPanel() {
    const book = books.find(b => b.id === editingId)
    if (!book) return
    setEditLoading(true)
    try {
      const token = await getToken()
      const resp  = await fetch('/api/library-autofill', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ filename: book.filename || book.file_path || book.title, contentSnippet: book.notes || '' }),
      })
      const d = await resp.json()
      if (resp.ok) {
        setEditForm(prev => ({
          ...prev,
          title:       d.title  || prev.title,
          author:      d.author || prev.author,
          notes:       d.notes  || prev.notes,
          topic:       d.topic  || prev.topic,
          spirit_tags: Array.isArray(d.spirit_tags) && d.spirit_tags.length ? d.spirit_tags : prev.spirit_tags,
        }))
      }
    } catch { /* best-effort */ }
    setEditLoading(false)
  }

  /** Unused but kept to avoid TS warning — remove if desired */
  async function handleAiRename(book: any) {
    openEdit(book)
    await aiRenameInPanel()
  }

  const GENERIC_TAGS = new Set([
    'demons', 'territorial spirits', 'supernatural forces', 'evil spirits',
    'demonic forces', 'dark forces', 'spiritual entities', 'evil forces',
    'spiritual forces', 'principalities', 'powers', 'evil beings',
  ])

  function isGenericOnly(tags: string[]): boolean {
    if (!Array.isArray(tags) || tags.length === 0) return true
    return tags.every(t => GENERIC_TAGS.has(t.toLowerCase()))
  }

  async function retagAllBooks() {
    const needsRetag = books.filter(b => isGenericOnly(b.spirit_tags))
    if (needsRetag.length === 0) { alert('All books already have specific spirit tags.'); return }
    setRetagRunning(true)
    setRetagProgress({ done: 0, total: needsRetag.length, updated: 0 })
    let updated = 0
    try {
      const token = await getToken()
      for (let i = 0; i < needsRetag.length; i++) {
        const book = needsRetag[i]
        try {
          const autofillRes = await fetch('/api/library-autofill', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: book.filename || book.file_path || book.title, contentSnippet: book.notes || '' }),
          })
          if (autofillRes.ok) {
            const d = await autofillRes.json()
            const newTags: string[] = Array.isArray(d.spirit_tags) ? d.spirit_tags : []
            if (newTags.length > 0 && !isGenericOnly(newTags)) {
              // Patch the book in Supabase
              await fetch('/api/admin-library', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ id: book.id, spirit_tags: newTags }),
              })
              setBooks(prev => prev.map(b => b.id === book.id ? { ...b, spirit_tags: newTags } : b))
              updated++
            }
          }
        } catch { /* best-effort per book */ }
        setRetagProgress({ done: i + 1, total: needsRetag.length, updated })
      }
    } catch { /* best-effort */ }
    setRetagRunning(false)
  }

  async function cleanTitle(book: any) {
    const token = await getToken()
    const res = await fetch('/api/admin-library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id: book.id, cleanTitle: true }),
    })
    if (res.ok) {
      const d = await res.json()
      if (d.book) setBooks(prev => prev.map(b => b.id === book.id ? { ...b, ...d.book } : b))
    }
  }

  async function loadLibrarySummary() {
    if (libSummaryLoading) return
    setLibSummaryLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/library-summary', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setLibSummary(d) }
    } catch { /* ignore */ }
    setLibSummaryLoading(false)
  }

  const anyUploading = stagedFiles.some(f => f.status === 'uploading')
  const anyAnalyzing = stagedFiles.some(f => f.status === 'analyzing')

  return (
    <div style={{ color: LTXT, fontFamily: crimson }}>

      {/* ── MINISTRY CONTEXTS ── */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 }}>
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 15, color: LG, letterSpacing: '0.08em', marginBottom: 5 }}>Ministry Contexts</div>
            <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, lineHeight: 1.6, maxWidth: 520 }}>
              Contexts are injected into AI calls based on their scope. Write in your own voice: your theology, approach, and doctrinal positions.
            </div>
          </div>
          <button onClick={() => { setShowNewCtx(s => !s); setNewCtxLabel(''); setNewCtxText(''); setNewCtxScope('global'); setNewCtxMsg('') }}
            style={{ background: showNewCtx ? 'rgba(201,168,76,0.1)' : LG, color: showNewCtx ? LG : '#0D0B14', border: showNewCtx ? `1px solid ${LG}` : 'none', borderRadius: 6, padding: '8px 18px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', flexShrink: 0 }}>
            {showNewCtx ? '✕ Cancel' : '+ Add Context'}
          </button>
        </div>

        {/* New context form */}
        {showNewCtx && (
          <div style={{ background: LSURF, border: `1px solid ${LBDR}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, color: LG, letterSpacing: '0.1em', marginBottom: 14 }}>✦ New Context</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>LABEL</label>
                <input value={newCtxLabel} onChange={e => setNewCtxLabel(e.target.value)} style={inp} placeholder="My Ministry Voice" />
              </div>
              <div>
                <label style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>SCOPE</label>
                <select value={newCtxScope} onChange={e => setNewCtxScope(e.target.value)} style={{ ...inp }}>
                  {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v.label}: {v.desc}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>CONTEXT TEXT</label>
              <textarea value={newCtxText} onChange={e => setNewCtxText(e.target.value)} rows={8}
                style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65 }}
                placeholder="Write your ministry voice, theological framework, and approach here..." />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT }}>{newCtxText.length.toLocaleString()} characters</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {newCtxMsg && <span style={{ fontFamily: crimson, fontSize: 13, color: newCtxMsg.startsWith('⚠') ? '#f87171' : '#4ade80' }}>{newCtxMsg}</span>}
                <button onClick={createContext} disabled={newCtxSaving || !newCtxText.trim()}
                  style={{ padding: '8px 20px', background: newCtxText.trim() ? LG : 'rgba(201,168,76,0.3)', border: 'none', borderRadius: 6, color: newCtxText.trim() ? '#0D0B14' : LMUT, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: newCtxText.trim() ? 'pointer' : 'not-allowed', fontWeight: 700 }}>
                  {newCtxSaving ? 'Saving...' : '✓ Create Context'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Context cards */}
        {ctxLoading ? (
          <div style={{ fontFamily: cinzel, fontSize: 10, color: LMUT, letterSpacing: '0.1em' }}>Loading contexts...</div>
        ) : contexts.length === 0 ? (
          <div style={{ fontFamily: crimson, fontSize: 14, color: LMUT, fontStyle: 'italic', padding: '20px 0' }}>
            No contexts yet. Add one to start shaping the AI's voice.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 12 }}>
            {contexts.map(ctx => {
              const scopeMeta = SCOPE_LABELS[ctx.scope] || SCOPE_LABELS.global
              const isEditing = editingCtxId === ctx.id
              return (
                <div key={ctx.id} style={{ background: LSURF, border: `1px solid ${isEditing ? LG + '88' : LBDR}`, borderRadius: 10, overflow: 'hidden' }}>
                  {/* Card header */}
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <span style={{ fontFamily: cinzel, fontSize: 13, color: LTXT }}>{ctx.label || 'Ministry Context'}</span>
                        <span style={{ fontFamily: cinzel, fontSize: 8, background: scopeMeta.color + '22', color: scopeMeta.color, border: `1px solid ${scopeMeta.color}55`, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.1em' }}>{scopeMeta.label}</span>
                      </div>
                      <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.06em' }}>
                        {(ctx.context_text || '').length.toLocaleString()} chars
                        {ctx.updated_at && <span> · {new Date(ctx.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>}
                        <span style={{ marginLeft: 8, color: LMUT + '88' }}>{scopeMeta.desc}</span>
                      </div>
                    </div>
                    {/* Always Active toggle */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', flexShrink: 0 }}>
                      <input type="checkbox" checked={ctx.is_active} onChange={e => toggleContextActive(ctx.id, e.target.checked)}
                        style={{ accentColor: LG, width: 14, height: 14 }} />
                      <span style={{ fontFamily: cinzel, fontSize: 9, color: ctx.is_active ? LG : LMUT, letterSpacing: '0.06em' }}>ACTIVE</span>
                    </label>
                    <button onClick={() => {
                      if (isEditing) { setEditingCtxId(null) }
                      else { setEditingCtxId(ctx.id); setEditCtxLabel(ctx.label || ''); setEditCtxScope(ctx.scope || 'global'); setEditCtxText(ctx.context_text || ''); setEditCtxMsg('') }
                    }} style={{ background: 'transparent', border: `1px solid ${LBDR}`, borderRadius: 5, padding: '5px 12px', color: LMUT, fontFamily: cinzel, fontSize: 9, cursor: 'pointer', letterSpacing: '0.06em' }}>
                      {isEditing ? 'Close' : 'Edit'}
                    </button>
                    <button onClick={() => deleteContext(ctx.id, ctx.label)}
                      style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 5, padding: '5px 12px', color: '#f87171', fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>
                      Delete
                    </button>
                  </div>
                  {/* Inline edit form */}
                  {isEditing && (
                    <div style={{ padding: '0 18px 18px', borderTop: `1px solid ${LBDR}` }}>
                      <div style={{ paddingTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>LABEL</label>
                          <input value={editCtxLabel} onChange={e => setEditCtxLabel(e.target.value)} style={inp} />
                        </div>
                        <div>
                          <label style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>SCOPE</label>
                          <select value={editCtxScope} onChange={e => setEditCtxScope(e.target.value)} style={{ ...inp }}>
                            {Object.entries(SCOPE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v.label}: {v.desc}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <textarea value={editCtxText} onChange={e => setEditCtxText(e.target.value)} rows={8}
                        style={{ ...inp, resize: 'vertical' as const, lineHeight: 1.65, marginBottom: 10 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT }}>{editCtxText.length.toLocaleString()} characters</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          {editCtxMsg && <span style={{ fontFamily: crimson, fontSize: 13, color: editCtxMsg.startsWith('⚠') ? '#f87171' : '#4ade80' }}>{editCtxMsg}</span>}
                          <button onClick={updateContext} disabled={editCtxSaving}
                            style={{ padding: '8px 20px', background: LG, border: 'none', borderRadius: 6, color: '#0D0B14', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', fontWeight: 700, opacity: editCtxSaving ? 0.7 : 1 }}>
                            {editCtxSaving ? 'Saving...' : '✓ Save Changes'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── PERSONAL LIBRARY ── */}
      <div style={{ borderTop: `1px solid ${LBDR}`, paddingTop: 32 }}>
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontFamily: cinzel, fontSize: 15, color: LG, letterSpacing: '0.08em', marginBottom: 5 }}>Personal Ministry Library</div>
          <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, lineHeight: 1.6 }}>
            Upload PDF or TXT books. AI will reference relevant passages when enhancing spirits.
          </div>
        </div>

        {/* ── HOW AI USES YOUR LIBRARY — collapsible ── */}
        <div style={{ marginBottom: 18, background: 'rgba(201,168,76,0.04)', border: `1px solid rgba(201,168,76,0.18)`, borderRadius: 8 }}>
          <button
            onClick={() => {
              const opening = !libSummaryOpen
              setLibSummaryOpen(opening)
              if (opening && !libSummary) loadLibrarySummary()
            }}
            style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', color: LMUT, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', textAlign: 'left' as const }}
          >
            <span style={{ fontSize: 13 }}>ℹ</span>
            <span>HOW AI USES YOUR LIBRARY</span>
            <span style={{ marginLeft: 'auto', fontSize: 14, transition: 'transform 0.2s', display: 'inline-block', transform: libSummaryOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
          </button>
          {libSummaryOpen && (
            <div style={{ padding: '0 14px 14px 14px' }}>
              {libSummaryLoading ? (
                <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT, fontStyle: 'italic' }}>Loading...</div>
              ) : libSummary ? (
                <>
                  <div style={{ fontFamily: crimson, fontSize: 13, color: LTXT, lineHeight: 1.7, marginBottom: 10 }}>{libSummary.summary}</div>
                  {libSummary.books.filter((b: any) => b.active !== false).length > 0 && (
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', marginBottom: 6 }}>ACTIVE IN AI CONTEXT</div>
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
                        {libSummary.books.filter((b: any) => b.active !== false).map((b: any) => (
                          <div key={b.id} style={{ fontFamily: crimson, fontSize: 12, color: LMUT }}>
                            <span style={{ color: LG }}>✦</span> {b.title}{b.author ? ` by ${b.author}` : ''}
                            {b.ai_generated && <span style={{ fontFamily: cinzel, fontSize: 8, color: '#5C7CBF', marginLeft: 6, letterSpacing: '0.08em' }}>AI</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT, fontStyle: 'italic' }}>Could not load summary.</div>
              )}
            </div>
          )}
        </div>

        {/* ── DROPZONE — always visible ── */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer.files) }}
          onClick={() => fileInputRef.current?.click()}
          style={{ border: `2px dashed ${dragOver ? LG : 'rgba(201,168,76,0.44)'}`, borderRadius: 10, padding: '20px', marginBottom: 16, cursor: 'pointer', background: dragOver ? 'rgba(201,168,76,0.06)' : 'transparent', transition: 'all 0.15s', textAlign: 'center' as const }}
        >
          <input ref={fileInputRef} type="file" multiple accept=".pdf,.txt" style={{ display: 'none' }}
            onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = '' }} />
          <div style={{ fontFamily: cinzel, fontSize: 11, color: LG, letterSpacing: '0.06em', marginBottom: 4 }}>
            Drop PDF or TXT files, up to 10 at once
          </div>
          <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT }}>or click to select · Max 50MB per file</div>
        </div>

        {/* ── STAGING TABLE ── */}
        {stagedFiles.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
              <button
                onClick={handleAutoFill}
                disabled={anyAnalyzing || anyUploading || uploadingAll || stagedFiles.every(f => f.status !== 'pending')}
                style={{ padding: '9px 18px', background: LG, border: 'none', borderRadius: 6, color: '#0D0B14', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', fontWeight: 700, opacity: anyAnalyzing ? 0.6 : 1 }}
              >
                {anyAnalyzing ? '✦ Analyzing...' : '✦ Auto-fill with AI'}
              </button>
              <button
                onClick={handleUploadAll}
                disabled={uploadingAll || anyAnalyzing || stagedFiles.every(f => f.status !== 'pending')}
                style={{ padding: '9px 20px', background: 'transparent', border: `1px solid ${LG}`, borderRadius: 6, color: LG, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', opacity: uploadingAll ? 0.6 : 1 }}
              >
                {uploadingAll ? 'Uploading...' : `Upload All (${stagedFiles.filter(f => f.status === 'pending').length} pending)`}
              </button>
              <button
                onClick={() => setStagedFiles(prev => prev.filter(f => f.status !== 'pending'))}
                style={{ marginLeft: 'auto', padding: '9px 14px', background: 'transparent', border: `1px solid ${LBDR}`, borderRadius: 6, color: LMUT, fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}
              >
                Clear Pending
              </button>
            </div>

            {/* File rows */}
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {stagedFiles.map(sf => {
                const statusStyle: Record<string, { bg: string; color: string; label: string }> = {
                  pending:   { bg: 'rgba(255,255,255,0.06)', color: '#9a8c74', label: 'Ready' },
                  analyzing: { bg: 'rgba(201,168,76,0.12)', color: LG, label: 'Analyzing...' },
                  uploading: { bg: 'rgba(92,124,191,0.15)', color: '#8B9DCA', label: 'Uploading...' },
                  done:      { bg: 'rgba(74,222,128,0.1)',  color: '#4ade80', label: '✓ Done' },
                  error:     { bg: 'rgba(248,113,113,0.1)', color: '#f87171', label: '✗ Failed' },
                }
                const st = statusStyle[sf.status]
                const busy = sf.status === 'uploading' || sf.status === 'analyzing' || sf.status === 'done'
                const nameShort = sf.file.name.length > 28 ? sf.file.name.slice(0, 25) + '…' : sf.file.name
                return (
                  <div key={sf.id} style={{ background: LSURF, border: `1px solid ${LBDR}`, borderRadius: 8, padding: '12px 14px' }}>
                    {/* Row header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.04em', minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {nameShort}
                      </span>
                      <span style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, flexShrink: 0 }}>{fmtBytes(sf.file.size)}</span>
                      <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', padding: '2px 8px', borderRadius: 10, background: st.bg, color: st.color, flexShrink: 0 }}>
                        {st.label}
                      </span>
                      {sf.errorMsg && <span style={{ fontFamily: crimson, fontSize: 11, color: '#f87171', flexShrink: 0 }}>{sf.errorMsg}</span>}
                      {!busy && (
                        <button onClick={() => setStagedFiles(prev => prev.filter(x => x.id !== sf.id))}
                          style={{ background: 'none', border: 'none', color: LMUT, cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0, lineHeight: 1 }}>×</button>
                      )}
                    </div>
                    {/* Editable fields */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                      <div>
                        <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>TITLE</label>
                        <input value={sf.title} onChange={e => updateStaged(sf.id, { title: e.target.value })} disabled={busy}
                          style={{ ...inp, fontSize: 12, padding: '6px 10px' }} placeholder="Book title" />
                      </div>
                      <div>
                        <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>AUTHOR</label>
                        <input value={sf.author} onChange={e => updateStaged(sf.id, { author: e.target.value })} disabled={busy}
                          style={{ ...inp, fontSize: 12, padding: '6px 10px' }} placeholder="Author name" />
                      </div>
                    </div>
                    <div>
                      <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>NOTES</label>
                      <textarea value={sf.notes} onChange={e => updateStaged(sf.id, { notes: e.target.value })} disabled={busy}
                        rows={2} style={{ ...inp, fontSize: 12, padding: '6px 10px', resize: 'vertical' as const }} placeholder="Ministry relevance..." />
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>SPIRIT TAGS</label>
                      <SpiritTagEditor
                        tags={sf.spirit_tags ?? []}
                        onChange={tags => updateStaged(sf.id, { spirit_tags: tags })}
                        disabled={busy}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
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
                Pigs in the Parlor by Frank Hammond<br />
                Blessing or Curse by Derek Prince<br />
                Battling the Hosts of Hell by Win Worley<br />
                He Came to Set the Captives Free by Rebecca Brown<br />
                Unbroken Curses by Rebecca Greenwood
              </div>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontFamily: cinzel, fontSize: 10, color: LMUT, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>
                {books.length} book{books.length !== 1 ? 's' : ''} · {books.filter(b => b.ai_generated).length} AI-generated
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {retagProgress && (
                  <span style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.06em' }}>
                    {retagRunning ? `Re-tagging ${retagProgress.done}/${retagProgress.total}…` : `✓ Done: ${retagProgress.updated} updated`}
                  </span>
                )}
                <button
                  onClick={retagAllBooks}
                  disabled={retagRunning}
                  title="Re-run AI spirit tag analysis on books with empty or generic spirit tags"
                  style={{ background: 'transparent', border: `1px solid rgba(92,124,191,0.5)`, borderRadius: 5, color: '#8BA3D4', fontFamily: cinzel, fontSize: 9, padding: '5px 12px', cursor: retagRunning ? 'wait' : 'pointer', letterSpacing: '0.06em', opacity: retagRunning ? 0.6 : 1, whiteSpace: 'nowrap' as const }}
                >
                  {retagRunning ? '✦ Re-tagging…' : '✦ Re-run AI Tags'}
                </button>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {books.map(book => {
                const isEditing        = editingId === book.id
                const hasNumericPrefix = /^\d+[-\s]/.test(book.title || '')
                return (
                <div key={book.id} style={{ background: LSURF, border: `1px solid rgba(201,168,76,0.22)`, borderLeft: `3px solid ${book.active !== false ? LG : 'rgba(201,168,76,0.25)'}`, borderRadius: 8, padding: '14px 18px', opacity: book.active !== false ? 1 : 0.6, transition: 'all 0.15s' }}>
                  {/* ── Card header row ── */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    {/* Left: title / author / meta / tags */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 13, color: LTXT, marginBottom: 3, letterSpacing: '0.04em' }}>{book.title}</div>
                      {book.author && book.author !== 'Unknown' && (
                        <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT, marginBottom: 4, fontStyle: 'italic' }}>{book.author}</div>
                      )}
                      <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.06em', marginBottom: book.notes ? 6 : 0 }}>
                        {fmtBytes(book.file_size)}
                        {book.created_at ? ` · ${new Date(book.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                      </div>
                      {book.notes && (
                        <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT, fontStyle: 'italic', marginBottom: 4 }}>{book.notes}</div>
                      )}
                      {/* Read-only spirit tags pills */}
                      {Array.isArray(book.spirit_tags) && book.spirit_tags.length > 0 && !isEditing && (
                        <SpiritTagEditor tags={book.spirit_tags} onChange={() => {}} readOnly />
                      )}
                    </div>

                    {/* Right: action buttons */}
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' as const, justifyContent: 'flex-end' }}>
                      {/* VIS toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: cinzel, fontSize: 7, color: LMUT, letterSpacing: '0.08em' }}>VIS</span>
                        <button
                          onClick={() => toggleBook(book.id, !(book.active !== false))}
                          style={{ width: 34, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer', background: book.active !== false ? LG : 'rgba(255,255,255,0.12)', position: 'relative' as const, transition: 'background 0.2s', padding: 0 }}
                        >
                          <div style={{ position: 'absolute' as const, top: 2, left: book.active !== false ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                        </button>
                      </div>
                      {/* AI toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span style={{ fontFamily: cinzel, fontSize: 7, color: LMUT, letterSpacing: '0.08em' }}>AI</span>
                        <button
                          onClick={() => toggleAiEnabled(book.id, !book.ai_generated)}
                          style={{ width: 34, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer', background: book.ai_generated ? '#5C7CBF' : 'rgba(255,255,255,0.12)', position: 'relative' as const, transition: 'background 0.2s', padding: 0 }}
                          title={book.ai_generated ? 'AI-generated: ON' : 'AI-generated: OFF'}
                        >
                          <div style={{ position: 'absolute' as const, top: 2, left: book.ai_generated ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                        </button>
                      </div>
                      {/* Clean numeric prefix — only when applicable */}
                      {hasNumericPrefix && !isEditing && (
                        <button
                          onClick={() => cleanTitle(book)}
                          style={{ background: 'transparent', border: `1px solid rgba(201,168,76,0.35)`, borderRadius: 5, color: LMUT, fontFamily: cinzel, fontSize: 9, padding: '4px 8px', cursor: 'pointer', letterSpacing: '0.06em' }}
                          title="Strip leading numeric prefix from title"
                        >✂ Clean</button>
                      )}
                      {/* ✎ EDIT BUTTON */}
                      <button
                        onClick={() => isEditing ? cancelEdit() : openEdit(book)}
                        style={{
                          background:    isEditing ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.10)',
                          border:        '1px solid rgba(201,168,76,0.6)',
                          borderRadius:  5,
                          color:         LG,
                          fontFamily:    cinzel,
                          fontSize:      9,
                          padding:       '4px 10px',
                          cursor:        'pointer',
                          letterSpacing: '0.06em',
                          fontWeight:    600,
                        }}
                        title={isEditing ? 'Close editor' : 'Edit title, author, notes, spirit tags'}
                      >
                        {isEditing ? '✕ Close' : '✎ Edit'}
                      </button>
                      {/* DELETE BUTTON */}
                      <button
                        onClick={() => deleteBook(book.id, book.file_path, book.title)}
                        style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#f87171', fontFamily: cinzel, fontSize: 9, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.06em' }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* ── Inline Edit Panel (shown when isEditing) ── */}
                  {isEditing && (
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid rgba(201,168,76,0.2)` }}>
                      {/* Panel header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Edit Metadata</span>
                        <button
                          onClick={aiRenameInPanel}
                          disabled={editLoading}
                          style={{ background: 'transparent', border: `1px solid rgba(92,124,191,0.5)`, borderRadius: 5, color: '#8BA3D4', fontFamily: cinzel, fontSize: 9, padding: '4px 10px', cursor: editLoading ? 'wait' : 'pointer', letterSpacing: '0.06em', opacity: editLoading ? 0.6 : 1 }}
                        >
                          {editLoading ? '✦ Analyzing…' : '✦ AI Rename'}
                        </button>
                      </div>

                      {/* Title + Author */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>TITLE</label>
                          <input
                            value={editForm.title}
                            onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))}
                            style={{ ...inp, fontSize: 12, padding: '6px 10px' }}
                          />
                        </div>
                        <div>
                          <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>AUTHOR</label>
                          <input
                            value={editForm.author}
                            onChange={e => setEditForm(p => ({ ...p, author: e.target.value }))}
                            style={{ ...inp, fontSize: 12, padding: '6px 10px' }}
                          />
                        </div>
                      </div>

                      {/* Notes */}
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>NOTES</label>
                        <textarea
                          value={editForm.notes}
                          onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                          rows={2}
                          style={{ ...inp, fontSize: 12, padding: '6px 10px', resize: 'vertical' as const }}
                        />
                      </div>

                      {/* Topic */}
                      <div style={{ marginBottom: 8 }}>
                        <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>TOPIC</label>
                        <select
                          value={editForm.topic}
                          onChange={e => setEditForm(p => ({ ...p, topic: e.target.value }))}
                          style={{ ...inp, fontSize: 12, padding: '6px 10px' }}
                        >
                          {['ministry-library','deliverance','spiritual-warfare','inner-healing','theology','prayer','prophecy','healing'].map(t => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      </div>

                      {/* Spirit Tags */}
                      <div style={{ marginBottom: 14 }}>
                        <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>SPIRIT TAGS</label>
                        <SpiritTagEditor
                          tags={editForm.spirit_tags}
                          onChange={tags => setEditForm(p => ({ ...p, spirit_tags: tags }))}
                        />
                      </div>

                      {/* Save / Cancel */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          onClick={saveEdit}
                          style={{ background: LG, color: '#0D0B14', border: 'none', borderRadius: 5, fontFamily: cinzel, fontSize: 9, padding: '6px 18px', cursor: 'pointer', letterSpacing: '0.06em', fontWeight: 700 }}
                        >
                          ✦ Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          style={{ background: 'transparent', border: `1px solid ${LBDR}`, borderRadius: 5, color: LMUT, fontFamily: cinzel, fontSize: 9, padding: '6px 14px', cursor: 'pointer', letterSpacing: '0.06em' }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                )
              })}
            </div>
            <div style={{ marginTop: 20, padding: '14px 18px', background: 'rgba(201,168,76,0.04)', border: `1px solid rgba(201,168,76,0.12)`, borderRadius: 8 }}>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.1em', marginBottom: 6 }}>SUGGESTED UPLOADS</div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, lineHeight: 1.9 }}>
                Pigs in the Parlor by Frank Hammond · Blessing or Curse by Derek Prince · Battling the Hosts of Hell by Win Worley · He Came to Set the Captives Free by Rebecca Brown · Unbroken Curses by Rebecca Greenwood
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── DOCUMENT TEMPLATES ──────────────────────────────────────────────────────
const DOC_TEMPLATES = {
  'renunciation-prayer': {
    id: 'renunciation-prayer', name: 'Renunciation Prayer',
    description: 'Spirit-specific renunciation and deliverance prayer',
    icon: '🙏',
    sections: [
      { id: 'opening',        label: 'Opening Declaration',      instruction: 'Opening declaration of faith and authority in Christ' },
      { id: 'renunciations',  label: 'Specific Renunciations',   instruction: 'Spirit-specific renunciations based on entry points and legal rights' },
      { id: 'breaking',       label: 'Breaking Curses & Legal Rights', instruction: 'Break all legal rights, generational curses, and demonic agreements' },
      { id: 'expulsion',      label: 'Command of Expulsion',     instruction: 'Direct command to the spirit to leave in Jesus\' name' },
      { id: 'fillup',         label: 'Fill-Up & Blessing',       instruction: 'Fill-up prayer inviting Holy Spirit, blessings over the person' },
    ],
  },
  'spirit-profile': {
    id: 'spirit-profile', name: 'Spirit Profile Document',
    description: 'Complete dossier document for a spirit pulled from the database',
    icon: '📋',
    sections: [
      { id: 'overview',      label: 'Overview',             instruction: 'Name, rank, type, description, phonetic, biblical classification' },
      { id: 'session-intel', label: 'Session Intelligence', instruction: 'Manifestations, entry points, session indicators, resistance signature' },
      { id: 'warfare',       label: 'Warfare Protocol',     instruction: 'Legal rights, cluster spirits, prayer points, deliverance sequence' },
      { id: 'research',      label: 'Research Notes',       instruction: 'Etymology, archaeology, scripture context' },
      { id: 'aftercare',     label: 'Aftercare Plan',       instruction: 'Aftercare notes, fill-up scriptures, mentor watch list' },
    ],
  },
  'aftercare-plan': {
    id: 'aftercare-plan', name: 'Personal Aftercare Plan',
    description: 'Personalized post-session aftercare document for a ministry candidate',
    icon: '🌱',
    sections: [
      { id: 'summary',       label: 'Session Summary',          instruction: 'Brief summary of what was addressed in the session' },
      { id: 'daily-actions', label: 'Daily Actions Required',   instruction: 'Specific daily declarations, scripture reading, practices to maintain freedom' },
      { id: 'mentor-watch',  label: 'Mentor Watch List',        instruction: 'Signs mentor should watch for, warning indicators of regression' },
      { id: 'fillup',        label: 'Fill-Up Scriptures',       instruction: 'Specific scriptures to meditate on and declare, personalized to what was addressed' },
      { id: 'warning-signs', label: 'Warning Signs',            instruction: 'Specific warning signs this person should watch for based on spirit addressed' },
      { id: 'next-steps',    label: 'Next Steps',               instruction: 'Recommended next steps, follow-up sessions if needed, resources' },
    ],
  },
} as const

type DocTemplateId = keyof typeof DOC_TEMPLATES

// ─── DASHBOARD VIEW ───────────────────────────────────────────────────────────
function DashboardView({ getToken, isDark, setTab }: {
  getToken: any; isDark: boolean; setTab: (t: string) => void
}) {
  const BG2  = isDark ? '#13111a' : '#fff'
  const BDR2 = isDark ? 'rgba(201,168,76,0.2)' : 'rgba(160,120,48,0.25)'
  const MUT  = isDark ? '#9a8c74' : '#5c4a3a'
  const TXT2 = isDark ? '#e8e0d0' : '#1a1410'

  const [demons, setDemons]         = useState<any[]>([])
  const [aiStats, setAiStats]       = useState<any>(null)
  const [memberStats, setMembers]   = useState<any>(null)
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken()
        const authHdr = { Authorization: `Bearer ${token}` }
        const [dRes, aRes, mRes] = await Promise.allSettled([
          fetch('/api/demons').then(r => r.json()),
          fetch('/api/ai-usage', { headers: authHdr }).then(r => r.json()),
          fetch('/api/admin-members', { headers: authHdr }).then(r => r.json()),
        ])
        if (dRes.status === 'fulfilled') setDemons(dRes.value.demons || [])
        if (aRes.status === 'fulfilled') setAiStats(aRes.value)
        if (mRes.status === 'fulfilled') setMembers(mRes.value)
      } catch {}
      setLoading(false)
    }
    load()
  }, [])

  // Spirit completeness — category breakdown
  const coreFields     = ['name', 'aka', 'description', 'manifestation', 'symptoms']
  const intelFields    = ['entryPoints', 'legalRights', 'sessionIndicators', 'resistanceSignature', 'transmissionVectors']
  const warfareFields  = ['prayerPoints', 'clusterSpirits', 'deliveranceSequence', 'counterScriptures', 'wriNotes']
  const researchFields = ['etymologyNotes', 'archaeologyNotes', 'scriptureContext', 'biblicalRank', 'caseType']
  const mediaFields    = ['images', 'phonetic', 'relatedSpirits', 'companionSpirits']
  const allTracked     = [...coreFields, ...intelFields, ...warfareFields, ...researchFields, ...mediaFields]

  const fieldScore = (d: any, fields: string[]) =>
    fields.filter(f => {
      const v = d[f]
      if (!v) return false
      if (Array.isArray(v)) return v.length > 0
      return String(v).trim().length > 2
    }).length

  const pct = (sum: number, max: number) => max === 0 ? 0 : Math.round((sum / max) * 100)

  const getCompletionStats = (ds: any[]) => {
    if (!ds.length) return null
    const n = ds.length
    return {
      core:     pct(ds.reduce((s, d) => s + fieldScore(d, coreFields),     0), n * coreFields.length),
      intel:    pct(ds.reduce((s, d) => s + fieldScore(d, intelFields),    0), n * intelFields.length),
      warfare:  pct(ds.reduce((s, d) => s + fieldScore(d, warfareFields),  0), n * warfareFields.length),
      research: pct(ds.reduce((s, d) => s + fieldScore(d, researchFields), 0), n * researchFields.length),
      media:    pct(ds.reduce((s, d) => s + fieldScore(d, mediaFields),    0), n * mediaFields.length),
      overall:  pct(ds.reduce((s, d) => s + fieldScore(d, allTracked),     0), n * allTracked.length),
    }
  }

  const stats = getCompletionStats(demons)
  const noImage    = demons.filter(d => !d.images || (Array.isArray(d.images) ? d.images.length === 0 : !d.images)).length
  const needsEnhance = demons.filter(d => fieldScore(d, allTracked) < Math.round(allTracked.length * 0.5)).length

  const card = (label: string, value: string | number, subtitle: string) => (
    <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 10, padding: '20px 24px', flex: 1, minWidth: 160 }}>
      <div style={{ fontFamily: cinzel, fontSize: 11, color: MUT, letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: cinzel, fontSize: 32, color: G, fontWeight: 700 }}>{loading ? '…' : value}</div>
      <div style={{ fontFamily: crimson, fontSize: 12, color: MUT, marginTop: 4 }}>{subtitle}</div>
    </div>
  )

  const TIER_COLORS: Record<string,string> = { general: G, commander: '#8B9DCA', soldier: '#7a9e7e', watchman: '#9a8c74', free: '#555', minister: '#ef4444' }

  const recentEnhancements = aiStats?.recentCalls?.filter((c: any) => c.call_type === 'enhance').slice(0, 8) || []

  return (
    <div style={{ color: TXT2, fontFamily: crimson }}>
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontFamily: cinzel, fontSize: 22, color: G, marginBottom: 4, letterSpacing: '0.06em' }}>⚔ War Room Intel: Command Center</div>
        <div style={{ fontFamily: crimson, fontSize: 14, color: MUT }}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      {/* Row 1 — Hero stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' as const }}>
        {card('Total Spirits', demons.length, `${stats?.overall ?? 0}% overall complete`)}
        {card('Total Members', memberStats?.total ?? '…', `${memberStats?.newThisMonth ?? 0} joined this month`)}
        {card('AI Calls This Month', aiStats?.thisMonth?.calls ?? '…', `vs ${aiStats?.lastMonth?.calls ?? 0} last month`)}
        {card('Est. Monthly Cost', aiStats?.thisMonth ? `$${aiStats.thisMonth.estimatedCost.toFixed(2)}` : '…', `${((aiStats?.thisMonth?.inputTokens || 0) + (aiStats?.thisMonth?.outputTokens || 0)).toLocaleString()} tokens`)}
      </div>

      {/* Row 2 — DB completion + Member tiers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* DB completion */}
        <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 10, padding: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.08em', marginBottom: 14 }}>Intelligence Database</div>
          {loading || !stats ? (
            <div style={{ color: MUT, fontFamily: crimson, fontSize: 13 }}>Loading...</div>
          ) : (
            <>
              <div style={{ fontFamily: cinzel, fontSize: 42, color: G, fontWeight: 700, lineHeight: 1 }}>{stats.overall}%</div>
              <div style={{ fontFamily: crimson, fontSize: 12, color: MUT, marginBottom: 18, marginTop: 4 }}>Overall · {demons.length} spirits</div>
              {([
                { label: 'Core Data', pct: stats.core,     color: '#C9A84C' },
                { label: 'Intel',     pct: stats.intel,    color: '#8B9DCA' },
                { label: 'Warfare',   pct: stats.warfare,  color: '#7a9e7e' },
                { label: 'Research',  pct: stats.research, color: '#9B7BB8' },
                { label: 'Media',     pct: stats.media,    color: '#CA8B8B' },
              ] as const).map(cat => (
                <div key={cat.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: MUT, marginBottom: 4 }}>
                    <span>{cat.label.toUpperCase()}</span>
                    <span style={{ color: cat.color }}>{cat.pct}%</span>
                  </div>
                  <div style={{ height: 4, background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)', borderRadius: 2 }}>
                    <div style={{ height: '100%', width: `${cat.pct}%`, background: cat.color, borderRadius: 2, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Member tiers */}
        <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 10, padding: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.08em', marginBottom: 16 }}>Warriors</div>
          {loading || !memberStats ? (
            <div style={{ color: MUT, fontFamily: crimson, fontSize: 13 }}>Loading...</div>
          ) : (['minister','general','commander','soldier','watchman','free']).map(tier => {
            const count = memberStats.byTier?.[tier] || 0
            if (count === 0 && tier === 'free') return null
            const total = memberStats.total || 1
            const pct   = Math.round((count / total) * 100)
            const col   = TIER_COLORS[tier] || MUT
            return (
              <div key={tier} style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em' }}>
                  <span style={{ color: col }}>{tier.toUpperCase()}</span>
                  <span style={{ color: MUT }}>{count} ({pct}%)</span>
                </div>
                <div style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)', borderRadius: 3, height: 5 }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: 3, transition: 'width 0.6s ease' }} />
                </div>
              </div>
            )
          })}
          <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.08em', marginTop: 8 }}>{memberStats?.activeThisWeek ?? '…'} active this week</div>
        </div>
      </div>

      {/* Row 3 — AI usage + Action items */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {/* AI usage */}
        <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 10, padding: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.08em', marginBottom: 16 }}>AI Research Activity</div>
          {aiStats && (
            <>
              <div style={{ display: 'flex', gap: 24, marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.08em', marginBottom: 3 }}>THIS MONTH</div>
                  <div style={{ fontFamily: cinzel, fontSize: 18, color: G }}>{aiStats.thisMonth?.calls} calls</div>
                  <div style={{ fontFamily: crimson, fontSize: 12, color: MUT }}>${aiStats.thisMonth?.estimatedCost?.toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.08em', marginBottom: 3 }}>LAST MONTH</div>
                  <div style={{ fontFamily: cinzel, fontSize: 18, color: MUT }}>{aiStats.lastMonth?.calls} calls</div>
                  <div style={{ fontFamily: crimson, fontSize: 12, color: MUT }}>${aiStats.lastMonth?.estimatedCost?.toFixed(2)}</div>
                </div>
              </div>
              {/* Mini bar chart */}
              {aiStats.byDay?.length > 0 && (() => {
                const last14 = aiStats.byDay.slice(-14)
                const maxCalls = Math.max(...last14.map((d: any) => d.calls), 1)
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 40, marginBottom: 8 }}>
                    {last14.map((d: any) => (
                      <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 3 }}>
                        <div style={{ width: '100%', background: G, borderRadius: 2, height: `${Math.max((d.calls / maxCalls) * 36, 2)}px` }} />
                      </div>
                    ))}
                  </div>
                )
              })()}
              {/* Recent calls */}
              {recentEnhancements.slice(0, 5).map((c: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderTop: `1px solid ${BDR2}`, fontFamily: crimson, fontSize: 12 }}>
                  <span style={{ color: TXT2 }}>{c.spirit_name || c.call_type}</span>
                  <span style={{ color: MUT }}>${c.estimatedCost?.toFixed(3)}</span>
                </div>
              ))}
            </>
          )}
          {!aiStats && !loading && <div style={{ color: MUT, fontFamily: crimson, fontSize: 13, fontStyle: 'italic' }}>No AI usage data yet.</div>}
        </div>

        {/* Action items */}
        <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 10, padding: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.08em', marginBottom: 16 }}>Action Required</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
            {needsEnhance > 0 && (
              <div onClick={() => setTab('intel')} style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 8, padding: '12px 16px', cursor: 'pointer' }}>
                <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.06em' }}>⚡ {needsEnhance} spirits need enhancement</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: MUT, marginTop: 2 }}>Fewer than 15 fields researched</div>
              </div>
            )}
            {noImage > 0 && (
              <div onClick={() => setTab('intel')} style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 8, padding: '12px 16px', cursor: 'pointer' }}>
                <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.06em' }}>🖼 {noImage} spirits missing images</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: MUT, marginTop: 2 }}>Run AI enhancement to auto-fetch Wikipedia images</div>
              </div>
            )}
            <div onClick={() => setTab('moderation')} style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.25)`, borderRadius: 8, padding: '12px 16px', cursor: 'pointer' }}>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.06em' }}>✝ Testimonies & Field Reports</div>
              <div style={{ fontFamily: crimson, fontSize: 12, color: MUT, marginTop: 2 }}>Review pending community submissions</div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 4 — Quick actions */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.08em', marginBottom: 16 }}>Quick Actions</div>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' as const }}>
          {[
            { icon: '⚡', title: 'Enhance Next Spirit', sub: 'Research the least-complete spirit', action: () => setTab('intel') },
            { icon: '📄', title: 'Generate Document',   sub: 'Create a ministry document',         action: () => setTab('documents') },
            { icon: '+',  title: 'Add Spirit',          sub: 'Add a new entry to the database',    action: () => setTab('intel') },
            { icon: '✍',  title: 'Write Briefing',      sub: 'Post weekly intel to the community', action: () => setTab('training') },
          ].map(a => (
            <div key={a.title} onClick={a.action}
              style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 10, padding: '20px 24px', cursor: 'pointer', flex: 1, minWidth: 140, transition: 'all 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(201,168,76,0.12)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(201,168,76,0.06)' }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{a.icon}</div>
              <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.06em', marginBottom: 4 }}>{a.title}</div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: MUT }}>{a.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Row 5 — Recently researched */}
      {recentEnhancements.length > 0 && (
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.08em', marginBottom: 12 }}>Recently Researched</div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' as const, paddingBottom: 4 }}>
            {recentEnhancements.map((c: any, i: number) => c.spirit_name && (
              <div key={i} onClick={() => setTab('intel')}
                style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 20, padding: '6px 14px', fontFamily: cinzel, fontSize: 10, color: G, cursor: 'pointer', whiteSpace: 'nowrap' as const, letterSpacing: '0.06em', flexShrink: 0 }}>
                {c.spirit_name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── FIELD MINISTRY MANAGER ───────────────────────────────────────────────────
function FieldMinistryManager({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const BG2 = isDark ? '#13111a' : '#fff'
  const BDR2 = isDark ? 'rgba(201,168,76,0.2)' : 'rgba(160,120,48,0.25)'
  const MUT  = isDark ? '#9a8c74' : '#5c4a3a'
  const TXT2 = isDark ? '#e8e0d0' : '#1a1410'
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: isDark ? 'rgba(13,11,20,0.8)' : '#f5f0e8',
    border: `1px solid ${BDR2}`, borderRadius: 6, padding: '8px 12px', color: TXT2,
    fontSize: 13, fontFamily: crimson, outline: 'none',
  }

  const TIERS = ['free', 'soldier', 'commander', 'general', 'minister']

  const [articles, setArticles] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId]     = useState<string | null>(null)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [preview, setPreview]   = useState(false)

  const blankForm = () => ({
    category: '', category_slug: '', category_order: 0, category_icon: '📖',
    title: '', slug: '', content: '', youtube_url: '', min_tier: 'free', is_published: false,
  })
  const [form, setForm] = useState<any>(blankForm())

  async function load() {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/field-manual', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const d = await res.json()
        const all: any[] = []
        for (const cat of d.categories || []) for (const a of cat.articles || []) all.push({ ...a, category: cat.category, category_slug: cat.category_slug, category_order: cat.category_order, category_icon: cat.category_icon })
        setArticles(all)
      }
    } finally { setLoading(false) }
  }

  // Also load all (including unpublished) for admin
  async function loadAll() {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/field-manual?all=1', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const d = await res.json()
        const all: any[] = []
        for (const cat of d.categories || []) for (const a of cat.articles || []) all.push({ ...a, category: cat.category, category_slug: cat.category_slug, category_order: cat.category_order, category_icon: cat.category_icon })
        setArticles(all)
      }
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [])

  const existingCategories = [...new Set(articles.map(a => a.category))].filter(Boolean)

  function slugify(s: string) { return s.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }

  function setF(key: string, val: any) {
    setForm((f: any) => {
      const next = { ...f, [key]: val }
      if (key === 'title' && !editId) next.slug = slugify(val)
      if (key === 'category' && !editId) next.category_slug = slugify(val)
      return next
    })
  }

  function startEdit(a: any) {
    setForm({
      category: a.category || '', category_slug: a.category_slug || '',
      category_order: a.category_order ?? 0, category_icon: a.category_icon || '📖',
      title: a.title || '', slug: a.slug || '', content: a.content || '',
      youtube_url: a.youtube_url || '', min_tier: a.min_tier || 'free',
      is_published: a.is_published ?? false,
    })
    setEditId(a.id)
    setShowForm(true)
    setMsg('')
    setPreview(false)
  }

  function cancelForm() { setShowForm(false); setEditId(null); setForm(blankForm()); setMsg(''); setPreview(false) }

  async function save() {
    if (!form.title || !form.category || !form.slug) { setMsg('Title, category, and slug are required.'); return }
    setSaving(true); setMsg('')
    try {
      const token = await getToken()
      const method = editId ? 'PATCH' : 'POST'
      const url    = editId ? `/api/field-manual?id=${editId}` : '/api/field-manual'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const d = await res.json()
      if (!res.ok) { setMsg(d.error || 'Save failed'); return }
      setMsg('Saved!')
      setTimeout(() => { cancelForm(); loadAll() }, 800)
    } finally { setSaving(false) }
  }

  async function remove(id: string, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    const token = await getToken()
    const res = await fetch(`/api/field-manual?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) loadAll()
    else { const d = await res.json(); alert(d.error || 'Delete failed') }
  }

  async function seedContent() {
    const token = await getToken()
    const SEED = [
      { category: 'Understanding Deliverance', category_slug: 'understanding-deliverance', category_order: 1, category_icon: '✝', title: 'What is Deliverance?', slug: 'what-is-deliverance', min_tier: 'free', is_published: true, content: '## What is Deliverance?\n\nDeliverance is the process by which a believer is freed from demonic oppression through the authority of Jesus Christ. It is not a magic formula — it is an encounter with the living God.\n\n> *"The Spirit of the Lord is upon me... to proclaim liberty to the captives."* — Luke 4:18\n\nDeliverance ministry recognizes that spiritual bondage is real, that Jesus purchased our freedom at Calvary, and that believers have been given authority to apply that freedom.' },
      { category: 'Understanding Deliverance', category_slug: 'understanding-deliverance', category_order: 1, category_icon: '✝', title: 'Why Do We Need It?', slug: 'why-do-we-need-deliverance', min_tier: 'free', is_published: true, content: '## Why Do We Need Deliverance?\n\nSin, trauma, and generational patterns can create legal access points for demonic oppression. Salvation opens the door to freedom — deliverance ministry walks through it.\n\nMany believers are saved but not free. They have accepted Christ but continue to struggle with compulsive behaviors, persistent fears, or spiritual heaviness that does not respond to counseling or willpower alone.\n\nDeliverance addresses the spiritual root.' },
      { category: 'Understanding Deliverance', category_slug: 'understanding-deliverance', category_order: 1, category_icon: '✝', title: 'Biblical Foundation', slug: 'biblical-foundation', min_tier: 'free', is_published: true, content: '## Biblical Foundation\n\nDeliverance ministry is not a fringe practice — it is woven throughout the gospels and the early church.\n\n- Jesus cast out demons as a central part of His ministry (Matthew 8, Mark 1, Luke 13)\n- He commissioned believers to do the same (Mark 16:17)\n- The early church continued this ministry (Acts 16:18, Acts 19)\n\n> *"And these signs shall follow them that believe: In my name shall they cast out devils."* — Mark 16:17' },
      { category: 'The Ministry Process', category_slug: 'the-ministry-process', category_order: 2, category_icon: '🏥', title: 'Readiness Evaluation', slug: 'readiness-evaluation', min_tier: 'free', is_published: true, content: '## Readiness Evaluation\n\nNot every person who desires deliverance is ready for a session. A brief readiness evaluation helps the ministry team determine the right timing.\n\n**Key readiness indicators:**\n- The person is born again or seeking to be\n- They want freedom — not just relief\n- They are willing to forgive those who have wronged them\n- They understand that post-session lifestyle changes are required\n\nReadiness is not perfection — it is willingness.' },
      { category: 'The Ministry Process', category_slug: 'the-ministry-process', category_order: 2, category_icon: '🏥', title: 'The Assessment Process', slug: 'assessment-process', min_tier: 'free', is_published: true, content: '## The Assessment Process\n\nBefore a deliverance session, the team completes a thorough intake assessment. This covers:\n\n- Family history and generational patterns\n- Trauma timeline\n- Areas of persistent struggle\n- Any occult or sexual sin history\n- Current spiritual disciplines\n\nThe assessment is confidential and treated with pastoral care. It is not an interrogation — it is a map.' },
      { category: 'The Ministry Process', category_slug: 'the-ministry-process', category_order: 2, category_icon: '🏥', title: 'Prayer & Team Listening', slug: 'prayer-team-listening', min_tier: 'soldier', is_published: true, content: '## Prayer & Team Listening\n\nBefore the session begins, the ministry team prays and listens to the Holy Spirit. This is not preparation theater — it is essential intelligence gathering.\n\nThe Spirit often reveals specific spirits, entry points, or areas of resistance before the session opens. Write down what you receive. Compare notes with the team.\n\n**Common forms of receiving:**\n- Words of knowledge\n- Scriptures that arise spontaneously\n- Physical sensations (heaviness, pressure)\n- Mental pictures or impressions\n\nTest everything against scripture.' },
      { category: 'The Ministry Process', category_slug: 'the-ministry-process', category_order: 2, category_icon: '🏥', title: 'The Deliverance Session', slug: 'deliverance-session', min_tier: 'soldier', is_published: true, content: '## The Deliverance Session\n\nA deliverance session follows a general pattern, though the Spirit leads each one differently.\n\n### Opening\nWorship, establishing the presence of God, and prayer covering for all team members.\n\n### Renunciation\nThe person verbally renounces any legal rights granted to spirits through sin, trauma, or agreement.\n\n### Command\nThe minister commands named spirits to leave in the name of Jesus Christ.\n\n### Filling\nAfter spirits depart, the person is prayed over for infilling of the Holy Spirit in every vacated area.\n\n### Aftercare Planning\nThe session closes with a clear aftercare plan.' },
      { category: 'Inner Healing', category_slug: 'inner-healing', category_order: 3, category_icon: '💛', title: 'What is Inner Healing?', slug: 'what-is-inner-healing', min_tier: 'free', is_published: true, content: '## What is Inner Healing?\n\nInner healing addresses the emotional and psychological wounds that create legal access for demonic oppression. It is not therapy — it is the ministry of the Holy Spirit to the wounded soul.\n\nJesus said He came to heal the brokenhearted (Luke 4:18). Inner healing is the fulfillment of that promise applied personally.\n\nTrauma, rejection, abuse, and loss leave marks on the soul. These marks can become doors. Inner healing closes those doors through forgiveness, truth, and the presence of God.' },
      { category: 'Inner Healing', category_slug: 'inner-healing', category_order: 3, category_icon: '💛', title: 'Trauma & Legal Rights', slug: 'trauma-legal-rights', min_tier: 'soldier', is_published: true, content: '## Trauma & Legal Rights\n\nUnhealed trauma is one of the most common entry points for demonic oppression. When a person experiences severe trauma without processing it in the presence of God, it can create what we call a *legal right* — a basis upon which a spirit claims permission to remain.\n\n**Common trauma-based legal rights:**\n- Childhood abuse (physical, sexual, emotional)\n- Betrayal by a trusted authority\n- Involvement in occult practices\n- Oaths, vows, or agreements made in crisis\n\nRevoking legal rights requires both forgiveness of the offender and renunciation of any vow or agreement made in response to the wound.' },
      { category: 'Inner Healing', category_slug: 'inner-healing', category_order: 3, category_icon: '💛', title: 'The Attachment Loop', slug: 'attachment-loop', min_tier: 'commander', is_published: true, content: '## The Attachment Loop\n\nThe attachment loop describes how unhealed wounds perpetuate demonic cycles. A wound creates a need. The need creates an unhealthy attachment (to a behavior, substance, person, or belief). The attachment provides a legal ground for a spirit. The spirit reinforces the wound.\n\n**Breaking the loop requires:**\n1. Identifying the original wound\n2. Bringing it to Jesus in prayer\n3. Forgiving the source of the wound\n4. Renouncing the attachment\n5. Commanding the spirit to leave\n6. Receiving healing and filling\n\nThis is why surface-level deliverance without inner healing often produces temporary results.' },
      { category: 'After Your Session', category_slug: 'after-your-session', category_order: 4, category_icon: '🌱', title: 'Aftercare Principles', slug: 'aftercare-principles', min_tier: 'free', is_published: true, content: '## Aftercare Principles\n\nWhat happens after a deliverance session is as important as the session itself. Jesus warned that a house left empty can be reoccupied (Matthew 12:43-45).\n\n**Core aftercare principles:**\n- Daily scripture intake and prayer\n- Accountability with a trusted believer\n- Avoid environments or relationships that triggered old patterns\n- Regular worship and praise\n- Continue inner healing work as needed\n- Stay connected to a healthy local church\n\nFreedom is a door you walk through — but you must continue walking.' },
      { category: 'After Your Session', category_slug: 'after-your-session', category_order: 4, category_icon: '🌱', title: 'Walking in Freedom', slug: 'walking-in-freedom', min_tier: 'free', is_published: true, content: '## Walking in Freedom\n\nDeliverance is a moment. Freedom is a lifestyle. The session breaks the power — but renewing the mind (Romans 12:2) establishes new patterns.\n\n> *"And be not conformed to this world: but be ye transformed by the renewing of your mind."* — Romans 12:2\n\nPractical freedom disciplines:\n- Replace old thought patterns with scripture declarations\n- Journal what the Holy Spirit reveals\n- Find a spiritual father or mother who can speak into your life\n- Serve others — walking in your calling accelerates healing' },
      { category: 'After Your Session', category_slug: 'after-your-session', category_order: 4, category_icon: '🌱', title: 'Working With a Mentor', slug: 'working-with-mentor', min_tier: 'soldier', is_published: true, content: '## Working With a Mentor\n\nA post-deliverance mentor is not a therapist — they are a spiritual companion who has walked the road ahead of you. Their role is to help you identify when old patterns are returning and to pray with you through new challenges.\n\nA good mentor:\n- Has their own deliverance experience\n- Is accountable to pastoral leadership\n- Meets regularly (weekly or bi-weekly)\n- Listens more than they speak\n- Points you to Jesus, not to themselves\n\nWar Room Intel can connect you with a trained mentor through the assessment process.' },
      { category: 'Common Questions', category_slug: 'common-questions', category_order: 5, category_icon: '❓', title: 'Is This Biblical?', slug: 'is-this-biblical', min_tier: 'free', is_published: true, content: '## Is This Biblical?\n\nYes. Deliverance ministry is thoroughly biblical.\n\n**Old Testament precedent:** Saul\'s torment by an evil spirit (1 Samuel 16:14-23)\n\n**Jesus\' ministry:** Matthew 4:24, 8:16, 8:28-34, Mark 1:23-27, Mark 5:1-20, Luke 13:10-17\n\n**Commission to believers:** Mark 16:17, Luke 9:1, Luke 10:17-20\n\n**Early church:** Acts 5:16, Acts 8:7, Acts 16:18, Acts 19:11-12\n\n**Pauline theology:** Ephesians 6:10-18, 2 Corinthians 10:3-5\n\nThe question is not whether deliverance is biblical — it is whether we will operate in the full counsel of God.' },
      { category: 'Common Questions', category_slug: 'common-questions', category_order: 5, category_icon: '❓', title: 'What to Expect in a Session', slug: 'what-to-expect', min_tier: 'free', is_published: true, content: '## What to Expect in a Session\n\nMany people come to their first session with fear about what might happen. Here is what a typical War Room Intel session looks like:\n\n**Duration:** 2-3 hours (intake + session + aftercare plan)\n\n**Team:** 1-2 trained ministers, possibly an intercessor\n\n**Setting:** A private, peaceful room — no audience\n\n**What you will do:** Share your story, renounce specific things as led, receive prayer\n\n**What might happen:** Some people experience physical manifestations (shaking, coughing, yawning). This is normal and not dangerous.\n\n**What will not happen:** We do not use theatrical techniques, loud shouting, or physical restraint.' },
      { category: 'Common Questions', category_slug: 'common-questions', category_order: 5, category_icon: '❓', title: 'How to Prepare', slug: 'how-to-prepare', min_tier: 'free', is_published: true, content: '## How to Prepare for Your Session\n\nPreparation significantly affects outcomes. Here is how to prepare:\n\n**In the days before:**\n- Fast if you are able (even one meal)\n- Spend time in worship and scripture\n- Write down key areas of struggle and timeline of trauma\n- Begin forgiving people on your list — even if feelings have not followed yet\n\n**Day of session:**\n- Eat lightly\n- Avoid alcohol and sleep deprivation\n- Come expectant, not fearful\n- Bring a notebook for the aftercare plan\n\n**Spiritually:**\n- Confess any known sin\n- Ask the Holy Spirit to reveal anything that needs to surface\n- Come surrendered — not trying to control the session' },
    ]

    let seeded = 0
    for (const article of SEED) {
      const res = await fetch('/api/field-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(article),
      })
      if (res.ok) seeded++
    }
    setMsg(`Seeded ${seeded} articles.`)
    loadAll()
  }

  async function handleSeed() {
    if (articles.length > 0) { if (!confirm(`Table already has ${articles.length} articles. Seed anyway? (duplicates will fail silently)`)) return }
    await seedContent()
  }

  const thS: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, borderBottom: `1px solid ${BDR2}`, whiteSpace: 'nowrap' }
  const tdS: React.CSSProperties = { padding: '9px 12px', borderBottom: `1px solid ${BDR2}20`, fontSize: 12, verticalAlign: 'middle' }
  const TIER_COLORS: Record<string, string> = { free: '#7a9e7e', soldier: '#60a5fa', commander: '#a78bfa', general: '#f59e0b', minister: G }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 18, color: G, letterSpacing: '0.06em' }}>📖 Field Ministry Manager</div>
          <div style={{ fontFamily: crimson, color: MUT, fontSize: 13, marginTop: 4 }}>Manage knowledge base articles visible to community members</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {articles.length === 0 && !loading && (
            <button onClick={handleSeed}
              style={{ padding: '8px 16px', background: 'rgba(201,168,76,0.15)', border: `1px solid ${BDR2}`, borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer' }}>
              Seed Starter Content
            </button>
          )}
          <button
            onClick={() => { setShowForm(true); setEditId(null); setForm(blankForm()); setMsg('') }}
            style={{ padding: '8px 18px', background: G, color: '#0D0B14', border: 'none', borderRadius: 6, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, cursor: 'pointer' }}>
            + New Article
          </button>
        </div>
      </div>

      {msg && <div style={{ marginBottom: 16, padding: '8px 14px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${BDR2}`, borderRadius: 6, fontFamily: crimson, color: G, fontSize: 13 }}>{msg}</div>}

      {/* Article table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 40, color: MUT, fontFamily: crimson, fontStyle: 'italic' }}>Loading articles…</div>
      ) : (
        <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 10, overflow: 'hidden', marginBottom: showForm ? 32 : 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: isDark ? 'rgba(201,168,76,0.06)' : '#f0ebe3' }}>
                <th style={thS}>Title</th>
                <th style={thS}>Category</th>
                <th style={thS}>Tier</th>
                <th style={thS}>Status</th>
                <th style={{ ...thS, width: 100 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {articles.length === 0 ? (
                <tr><td colSpan={5} style={{ ...tdS, textAlign: 'center', color: MUT, padding: 32, fontStyle: 'italic', fontFamily: crimson }}>No articles yet. Click "+ New Article" or seed starter content.</td></tr>
              ) : articles.map(a => (
                <tr key={a.id} style={{ background: 'transparent', transition: 'background 0.1s' }}>
                  <td style={{ ...tdS, fontFamily: cinzel, fontSize: 11, color: TXT2 }}>{a.title}</td>
                  <td style={{ ...tdS, color: MUT }}>{a.category_icon} {a.category}</td>
                  <td style={{ ...tdS }}>
                    <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: TIER_COLORS[a.min_tier] || MUT, background: `${TIER_COLORS[a.min_tier]}18`, border: `1px solid ${TIER_COLORS[a.min_tier]}40`, padding: '2px 8px', borderRadius: 3 }}>
                      {a.min_tier.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ ...tdS }}>
                    <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: a.is_published ? '#7a9e7e' : MUT }}>
                      {a.is_published ? '● Published' : '○ Draft'}
                    </span>
                  </td>
                  <td style={{ ...tdS }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => startEdit(a)}
                        style={{ padding: '3px 10px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${BDR2}`, borderRadius: 4, color: G, fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>Edit</button>
                      <button onClick={() => remove(a.id, a.title)}
                        style={{ padding: '3px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, color: '#f87171', fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit form */}
      {showForm && (
        <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 10, padding: 28, marginTop: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.08em', marginBottom: 20 }}>
            {editId ? '✏ Edit Article' : '+ New Article'}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, display: 'block', marginBottom: 4 }}>Category *</label>
              <input list="fm-categories" value={form.category} onChange={e => setF('category', e.target.value)} placeholder="Understanding Deliverance" style={inp} />
              <datalist id="fm-categories">{existingCategories.map((c: string) => <option key={c} value={c} />)}</datalist>
            </div>
            <div>
              <label style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, display: 'block', marginBottom: 4 }}>Category Slug</label>
              <input value={form.category_slug} onChange={e => setF('category_slug', e.target.value)} placeholder="understanding-deliverance" style={inp} />
            </div>
            <div>
              <label style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, display: 'block', marginBottom: 4 }}>Category Icon</label>
              <input value={form.category_icon} onChange={e => setF('category_icon', e.target.value)} placeholder="📖" style={{ ...inp, width: 80 }} />
            </div>
            <div>
              <label style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, display: 'block', marginBottom: 4 }}>Category Order</label>
              <input type="number" value={form.category_order} onChange={e => setF('category_order', Number(e.target.value))} style={{ ...inp, width: 80 }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, display: 'block', marginBottom: 4 }}>Title *</label>
              <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="What is Deliverance?" style={inp} />
            </div>
            <div>
              <label style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, display: 'block', marginBottom: 4 }}>Slug (URL)</label>
              <input value={form.slug} onChange={e => setF('slug', e.target.value)} placeholder="what-is-deliverance" style={inp} />
            </div>
            <div>
              <label style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, display: 'block', marginBottom: 4 }}>Min Tier</label>
              <select value={form.min_tier} onChange={e => setF('min_tier', e.target.value)} style={inp}>
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT, display: 'block', marginBottom: 4 }}>YouTube URL (optional)</label>
              <input value={form.youtube_url} onChange={e => setF('youtube_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." style={inp} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: MUT }}>Content (Markdown)</label>
              <button onClick={() => setPreview(p => !p)}
                style={{ padding: '3px 10px', background: preview ? 'rgba(201,168,76,0.15)' : 'transparent', border: `1px solid ${BDR2}`, borderRadius: 4, color: G, fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>
                {preview ? 'Edit' : 'Preview'}
              </button>
            </div>
            {preview ? (
              <div style={{ minHeight: 240, background: isDark ? 'rgba(13,11,20,0.6)' : '#f9f6f1', border: `1px solid ${BDR2}`, borderRadius: 6, padding: 16, fontFamily: crimson, fontSize: 15, lineHeight: 1.8, color: TXT2 }}
                dangerouslySetInnerHTML={{ __html: markdownToHtml(form.content) }} />
            ) : (
              <textarea
                value={form.content}
                onChange={e => setF('content', e.target.value)}
                rows={14}
                placeholder={'## Section Header\n\nWrite your article content here using Markdown.\n\n**Bold text**, *italic text*, and > blockquotes are supported.\n\n- Bullet list item\n- Another item'}
                style={{ ...inp, resize: 'vertical', minHeight: 240, lineHeight: 1.6 }}
              />
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 20 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontFamily: crimson, fontSize: 13, color: TXT2 }}>
              <input type="checkbox" checked={form.is_published} onChange={e => setF('is_published', e.target.checked)} />
              Published (visible to community)
            </label>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button onClick={save} disabled={saving}
              style={{ padding: '10px 24px', background: G, color: '#0D0B14', border: 'none', borderRadius: 6, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', fontWeight: 700, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Saving…' : editId ? 'Update Article' : 'Create Article'}
            </button>
            <button onClick={cancelForm}
              style={{ padding: '10px 20px', background: 'transparent', border: `1px solid ${BDR2}`, borderRadius: 6, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: MUT, cursor: 'pointer' }}>
              Cancel
            </button>
            {msg && <span style={{ fontFamily: crimson, fontSize: 13, color: msg.includes('ailed') ? '#f87171' : G }}>{msg}</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── DOCUMENTS VIEW ───────────────────────────────────────────────────────────
function DocumentsView({ getToken, isDark, demons }: {
  getToken: any; isDark: boolean; demons: any[]
}) {
  const BG2  = isDark ? '#13111a' : '#fff'
  const BDR2 = isDark ? 'rgba(201,168,76,0.2)' : 'rgba(160,120,48,0.25)'
  const MUT  = isDark ? '#9a8c74' : '#5c4a3a'
  const TXT2 = isDark ? '#e8e0d0' : '#1a1410'
  const inp2: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const,
    background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
    border: `1px solid ${BDR2}`, borderRadius: 6,
    padding: '9px 12px', color: TXT2, fontFamily: crimson, fontSize: 14, outline: 'none',
  }

  const [docSubTab, setDocSubTab] = useState<'templates' | 'generate'>('templates')
  const [selectedTemplate, setSelectedTemplate] = useState<DocTemplateId>('renunciation-prayer')
  const [subject, setSubject]       = useState('')
  const [pullFromDB, setPullFromDB] = useState(true)
  const [specialInstr, setSpecialInstr] = useState('')
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState('')
  const [document, setDocument]     = useState<any>(null)
  const [savingToArsenal, setSavingToArsenal] = useState(false)
  const [arsenalMsg, setArsenalMsg] = useState('')

  const template = DOC_TEMPLATES[selectedTemplate]

  const matchedSpirit = pullFromDB && subject.trim()
    ? demons.find(d => d.name?.toLowerCase() === subject.trim().toLowerCase())
    : null

  async function generate() {
    if (!subject.trim()) { setGenError('Subject required'); return }
    setGenerating(true); setGenError(''); setDocument(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          templateId: template.id,
          templateName: template.name,
          sections: [...template.sections],
          subject: subject.trim(),
          spiritData: matchedSpirit || null,
          specialInstructions: specialInstr.trim() || null,
        }),
      })
      const text = await res.text()
      let d: any
      try { d = JSON.parse(text) } catch { throw new Error('Invalid response from server') }
      if (!res.ok) throw new Error(d.error || `Server error ${res.status}`)
      setDocument(d.document)
    } catch(e: any) {
      setGenError(e.message || 'Generation failed')
    }
    setGenerating(false)
  }

  async function saveToArsenal() {
    if (!document) return
    setSavingToArsenal(true); setArsenalMsg('')
    try {
      const token = await getToken()
      const fullContent = document.sections.map((s: any) => `${s.label}\n\n${s.content}`).join('\n\n---\n\n')
      const res = await fetch('/api/admin-resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: document.title,
          content: fullContent,
          topic: 'ministry-document',
          function_tags: ['ministry', 'document'],
          tier: 'minister',
        }),
      })
      if (res.ok) { setArsenalMsg('✓ Saved to Arsenal') }
      else { const d = await res.json(); setArsenalMsg(`⚠ ${d.error}`) }
    } catch(e: any) { setArsenalMsg(`⚠ ${e.message}`) }
    setSavingToArsenal(false)
  }

  function exportPDF() {
    window.print()
  }

  return (
    <div style={{ color: TXT2, fontFamily: crimson }}>
      {/* Print styles injected via head — only preview renders */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #doc-preview-print { display: block !important; }
          #doc-preview-print * { display: revert !important; }
        }
        #doc-preview-print { display: none; }
      `}</style>

      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: cinzel, fontSize: 18, color: G, letterSpacing: '0.06em' }}>📄 Document Creator</div>
        <div style={{ display: 'flex', gap: 0, border: `1px solid ${BDR2}`, borderRadius: 6, overflow: 'hidden' }}>
          {(['templates', 'generate'] as const).map(t => (
            <button key={t} onClick={() => setDocSubTab(t)}
              style={{ padding: '8px 20px', background: docSubTab === t ? G : 'transparent', color: docSubTab === t ? '#0D0B14' : MUT, border: 'none', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', fontWeight: docSubTab === t ? 700 : 400 }}>
              {t === 'templates' ? 'Templates' : 'Generate'}
            </button>
          ))}
        </div>
      </div>

      {/* TEMPLATES sub-tab */}
      {docSubTab === 'templates' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {Object.values(DOC_TEMPLATES).map(t => (
            <div key={t.id} style={{ background: BG2, border: `1px solid ${selectedTemplate === t.id ? G + '88' : BDR2}`, borderRadius: 10, padding: 20 }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>{t.icon}</div>
              <div style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.06em', marginBottom: 6 }}>{t.name}</div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: MUT, marginBottom: 14, lineHeight: 1.5 }}>{t.description}</div>
              <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.08em', marginBottom: 14 }}>{t.sections.length} SECTIONS</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setSelectedTemplate(t.id as DocTemplateId); setDocSubTab('generate') }}
                  style={{ flex: 1, background: G, border: 'none', borderRadius: 5, padding: '8px 0', color: '#0D0B14', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer', fontWeight: 700 }}>
                  Use Template
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GENERATE sub-tab */}
      {docSubTab === 'generate' && (
        <div style={{ display: 'grid', gridTemplateColumns: document ? '1fr 1fr' : '1fr', gap: 24 }}>
          {/* Form */}
          <div>
            <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 10, padding: 24, marginBottom: 16 }}>
              <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.08em', marginBottom: 20 }}>Generate Document</div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>DOCUMENT TYPE</label>
                <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value as DocTemplateId)} style={{ ...inp2 }}>
                  {Object.values(DOC_TEMPLATES).map(t => (
                    <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>SUBJECT / TOPIC *</label>
                <input value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Spirit name, person name, or topic"
                  style={inp2} />
                {matchedSpirit && (
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: '#4ade80', marginTop: 4, letterSpacing: '0.06em' }}>
                    ✓ Found in database: {matchedSpirit.name}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={pullFromDB} onChange={e => setPullFromDB(e.target.checked)}
                    style={{ accentColor: G, width: 14, height: 14 }} />
                  <span style={{ fontFamily: cinzel, fontSize: 10, color: TXT2, letterSpacing: '0.06em' }}>Pull data from Intel Database (if spirit name matches)</span>
                </label>
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>SPECIAL INSTRUCTIONS</label>
                <textarea value={specialInstr} onChange={e => setSpecialInstr(e.target.value)}
                  rows={3} style={{ ...inp2, resize: 'vertical' as const }}
                  placeholder="Any specific requirements, people involved, regional context..." />
              </div>

              {genError && <div style={{ fontFamily: crimson, fontSize: 13, color: '#f87171', marginBottom: 12 }}>⚠ {genError}</div>}

              <button onClick={generate} disabled={generating || !subject.trim()}
                style={{ width: '100%', padding: '14px', background: subject.trim() ? G : 'rgba(201,168,76,0.3)', border: 'none', borderRadius: 8, color: subject.trim() ? '#0D0B14' : MUT, fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em', cursor: subject.trim() ? 'pointer' : 'not-allowed', fontWeight: 700, opacity: generating ? 0.7 : 1 }}>
                {generating ? '⏳ Generating...' : '✦ Generate Document'}
              </button>
            </div>

            {/* Sections preview */}
            <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 10, padding: 24 }}>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: MUT, letterSpacing: '0.1em', marginBottom: 12 }}>SECTIONS IN {template.name.toUpperCase()}</div>
              {template.sections.map((s, i) => (
                <div key={s.id} style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: G, width: 16, flexShrink: 0, paddingTop: 1 }}>{i + 1}</div>
                  <div>
                    <div style={{ fontFamily: cinzel, fontSize: 10, color: TXT2, letterSpacing: '0.06em', marginBottom: 2 }}>{s.label}</div>
                    <div style={{ fontFamily: crimson, fontSize: 12, color: MUT }}>{s.instruction}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          {document && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' as const }}>
                <button onClick={exportPDF} style={{ flex: 1, padding: '10px', background: G, border: 'none', borderRadius: 6, color: '#0D0B14', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', fontWeight: 700 }}>📄 Export PDF</button>
                <button onClick={saveToArsenal} disabled={savingToArsenal} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${BDR2}`, borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>💾 Save to Arsenal</button>
                <button onClick={generate} disabled={generating} style={{ flex: 1, padding: '10px', background: 'transparent', border: `1px solid ${BDR2}`, borderRadius: 6, color: MUT, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer' }}>↺ Regenerate</button>
              </div>
              {arsenalMsg && <div style={{ fontFamily: crimson, fontSize: 13, color: arsenalMsg.startsWith('✓') ? '#4ade80' : '#f87171', marginBottom: 10 }}>{arsenalMsg}</div>}

              {/* Printable preview */}
              <div id="doc-preview-print" style={{ background: isDark ? '#1a1625' : '#fff', border: `1px solid ${BDR2}`, borderRadius: 10, padding: 32, maxHeight: 680, overflowY: 'auto' as const }}>
                {/* Document header */}
                <div style={{ textAlign: 'center' as const, marginBottom: 28, paddingBottom: 20, borderBottom: `2px solid rgba(201,168,76,0.3)` }}>
                  <div style={{ fontFamily: cinzel, fontSize: 11, color: MUT, letterSpacing: '0.15em', marginBottom: 8 }}>⚔ WAR ROOM INTEL · STAFFORDTOWN CHURCH</div>
                  <div style={{ fontFamily: cinzel, fontSize: 22, color: G, letterSpacing: '0.05em', marginBottom: 6 }}>{document.title}</div>
                  {document.subtitle && <div style={{ fontFamily: crimson, fontSize: 14, color: MUT, fontStyle: 'italic' }}>{document.subtitle}</div>}
                </div>

                {/* Sections */}
                {document.sections?.map((s: any) => (
                  <div key={s.id} style={{ marginBottom: 24 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 8, paddingBottom: 4, borderBottom: `1px solid rgba(201,168,76,0.2)` }}>{s.label}</div>
                    <div
                      contentEditable suppressContentEditableWarning
                      style={{ fontFamily: crimson, fontSize: 14, color: TXT2, lineHeight: 1.75, outline: 'none', whiteSpace: 'pre-wrap' as const }}
                    >{s.content}</div>
                  </div>
                ))}

                {/* Footer */}
                <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid rgba(201,168,76,0.2)`, textAlign: 'center' as const }}>
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: MUT, letterSpacing: '0.1em' }}>warroomintel.com · Staffordtown Church · Copperhill, Tennessee</div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LibraryIntelligence({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const G2 = isDark ? G : '#A07C2C'
  const surf2 = isDark ? SURF : '#EDE6D3'
  const bdr2 = isDark ? BDR : 'rgba(139,105,20,0.25)'
  const txt2 = isDark ? TXT : '#1C1407'
  const dim2 = isDark ? DIM : '#6B5520'
  const mut2 = isDark ? '#9a8c74' : '#5c4a3a'

  // Gap analysis state
  const [gapLoading, setGapLoading] = useState(false)
  const [gapResults, setGapResults] = useState<any[]>([])
  const [gapMeta, setGapMeta] = useState<{ bookTitles: string[]; spiritCount: number } | null>(null)
  const [gapError, setGapError] = useState('')
  const [addingSpirit, setAddingSpirit] = useState<any | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)

  // Content query state
  const [cqQuery, setCqQuery] = useState('')
  const [cqLoading, setCqLoading] = useState(false)
  const [cqResponse, setCqResponse] = useState('')
  const [cqTitles, setCqTitles] = useState<string[]>([])
  const [cqError, setCqError] = useState('')

  // Reindex state
  const [reindexing, setReindexing] = useState(false)
  const [reindexResult, setReindexResult] = useState<string>('')

  async function runGapAnalysis() {
    setGapLoading(true)
    setGapResults([])
    setGapError('')
    setGapMeta(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/library-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tool: 'gap-analysis' }),
      })
      const data = await res.json()
      if (!res.ok) { setGapError(data.error || 'Analysis failed'); return }
      setGapResults(data.results || [])
      setGapMeta({ bookTitles: data.bookTitles || [], spiritCount: data.spiritCount || 0 })
    } catch (e: any) { setGapError(e.message) }
    setGapLoading(false)
  }

  async function runContentQuery() {
    if (!cqQuery.trim()) return
    setCqLoading(true)
    setCqResponse('')
    setCqError('')
    try {
      const token = await getToken()
      const res = await fetch('/api/library-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tool: 'content-query', query: cqQuery }),
      })
      const data = await res.json()
      if (!res.ok) { setCqError(data.error || 'Query failed'); return }
      setCqResponse(data.response || '')
      setCqTitles(data.bookTitles || [])
    } catch (e: any) { setCqError(e.message) }
    setCqLoading(false)
  }

  async function runReindex() {
    setReindexing(true)
    setReindexResult('')
    try {
      const token = await getToken()
      const res = await fetch('/api/library-backfill', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) { setReindexResult(`Error: ${data.error}`); return }
      setReindexResult(`Reindex complete: ${data.succeeded}/${data.processed} books extracted. Reload to test.`)
    } catch (e: any) { setReindexResult(`Error: ${e.message}`) }
    setReindexing(false)
  }

  async function addToDatabase(spirit: any) {
    setAddingSpirit(spirit)
  }

  async function confirmAdd(spirit: any) {
    try {
      const token = await getToken()
      const fields: Record<string, string> = {
        '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE': spirit.spirit_name,
        'Description': spirit.brief_description,
      }
      const res = await fetch('/api/admin-demon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fields }),
      })
      if (res.ok) {
        setAddSuccess(spirit.spirit_name)
        setAddingSpirit(null)
        setTimeout(() => setAddSuccess(null), 3000)
      }
    } catch {}
  }

  function renderMarkdown(text: string) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('## ')) return <div key={i} style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: G2, marginTop: 16, marginBottom: 6, letterSpacing: '0.06em' }}>{line.slice(3)}</div>
      if (line.startsWith('**') && line.endsWith('**')) return <div key={i} style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: txt2, marginTop: 10, marginBottom: 4 }}>{line.replace(/\*\*/g, '')}</div>
      if (line.startsWith('- ')) return <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}><span style={{ color: G2, flexShrink: 0 }}>•</span><span style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: txt2, lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, `<strong style="color:${G2}">$1</strong>`) }} /></div>
      if (!line.trim()) return <div key={i} style={{ height: 8 }} />
      return <div key={i} style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: dim2, lineHeight: 1.65, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${txt2}">$1</strong>`) }} />
    })
  }

  return (
    <div style={{ color: txt2, fontFamily: "'Crimson Pro', serif" }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: G2, marginBottom: 4, letterSpacing: '0.08em' }}>🔬 Library Intelligence</div>
      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: dim2, fontStyle: 'italic', marginBottom: 16 }}>
        AI-powered analysis of your ministry library against the spirit database
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <button onClick={runReindex} disabled={reindexing} style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', color: G2, background: 'transparent', border: `1px solid ${G2}55`, borderRadius: 4, padding: '7px 16px', cursor: reindexing ? 'wait' : 'pointer', opacity: reindexing ? 0.6 : 1 }}>
          {reindexing ? '⏳ Reindexing...' : '🔄 Reindex Library'}
        </button>
        {reindexResult && <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: reindexResult.startsWith('Error') ? '#e09090' : '#80e090' }}>{reindexResult}</span>}
      </div>

      {/* ── Tool 1: Spirit Gap Analysis ── */}
      <div style={{ background: surf2, border: `1px solid ${bdr2}`, borderRadius: 10, padding: '24px', marginBottom: 24 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: txt2, marginBottom: 8, letterSpacing: '0.06em' }}>⚔ Spirit Gap Analysis</div>
        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: dim2, lineHeight: 1.6, marginBottom: 16 }}>
          Scans your ministry library documents and identifies spirits mentioned in your books that are not yet in the War Room Intel database.
        </div>
        <button onClick={runGapAnalysis} disabled={gapLoading} style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', color: '#0D0B14', background: G2, border: 'none', borderRadius: 4, padding: '10px 24px', cursor: gapLoading ? 'wait' : 'pointer', opacity: gapLoading ? 0.7 : 1, marginBottom: 16 }}>
          {gapLoading ? '🔍 Analyzing library against database...' : '⚔ Find Spirits Not In My Database'}
        </button>
        {gapError && <div style={{ color: '#e09090', fontFamily: "'Crimson Pro', serif", fontSize: 13, marginBottom: 12 }}>⚠ {gapError}</div>}
        {addSuccess && <div style={{ color: '#80e090', fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.08em', marginBottom: 12 }}>✓ {addSuccess} added to database</div>}
        {gapMeta && (
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', color: mut2, marginBottom: 12 }}>
            Analyzed {gapMeta.bookTitles.length} book{gapMeta.bookTitles.length !== 1 ? 's' : ''} against {gapMeta.spiritCount} database entries
            {gapMeta.bookTitles.length > 0 && `: ${gapMeta.bookTitles.join(' · ')}`}
          </div>
        )}
        {gapResults.length > 0 && (
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: G2, letterSpacing: '0.1em', marginBottom: 12 }}>
              {gapResults.length} potential additions found
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {gapResults.map((r, i) => (
                <div key={i} style={{ background: isDark ? BG : '#F5F0E8', border: `1px solid ${bdr2}`, borderRadius: 8, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: txt2, marginBottom: 4 }}>{r.spirit_name}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, marginBottom: 6 }}>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.08em', color: G2, border: `1px solid ${G2}44`, padding: '2px 8px', borderRadius: 3 }}>{r.suggested_rank}</span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.08em', color: mut2, border: `1px solid ${bdr2}`, padding: '2px 8px', borderRadius: 3 }}>{r.suggested_kingdom}</span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.06em', color: mut2 }}>📖 {r.source_document}</span>
                    </div>
                    <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: dim2, lineHeight: 1.5 }}>{r.brief_description}</div>
                  </div>
                  <button onClick={() => addToDatabase(r)} style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.08em', color: '#0D0B14', background: G2, border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                    + Add to DB
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {gapResults.length === 0 && gapMeta && (
          <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: dim2, fontStyle: 'italic' }}>
            No new spirits found. Your database may already cover the content in these books.
          </div>
        )}
      </div>

      {/* Add to DB confirmation modal */}
      {addingSpirit && (
        <div onClick={() => setAddingSpirit(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: surf2, border: `1px solid ${G2}55`, borderRadius: 10, padding: 28, maxWidth: 440, width: '100%' }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: G2, marginBottom: 12 }}>Add to Database</div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: txt2, marginBottom: 8 }}>{addingSpirit.spirit_name}</div>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: dim2, marginBottom: 16, lineHeight: 1.6 }}>{addingSpirit.brief_description}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => confirmAdd(addingSpirit)} style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', color: '#0D0B14', background: '#80e090', border: 'none', borderRadius: 4, padding: '10px 20px', cursor: 'pointer' }}>
                ✓ Confirm Add
              </button>
              <button onClick={() => setAddingSpirit(null)} style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', color: dim2, background: 'transparent', border: `1px solid ${bdr2}`, borderRadius: 4, padding: '10px 20px', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ height: 1, background: bdr2, margin: '8px 0 24px' }} />

      {/* ── Tool 2: Content Intelligence Query ── */}
      <div style={{ background: surf2, border: `1px solid ${bdr2}`, borderRadius: 10, padding: '24px' }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: txt2, marginBottom: 8, letterSpacing: '0.06em' }}>💡 Content Intelligence Query</div>
        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: dim2, lineHeight: 1.6, marginBottom: 16 }}>
          Ask questions about what content exists in your library and how it could be used to build out the platform.
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
          <input
            value={cqQuery}
            onChange={e => setCqQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runContentQuery()}
            placeholder="e.g. What teaching topics are covered? What assessment tools exist? What prayer strategies haven't I added yet?"
            style={{ flex: 1, background: isDark ? BG : '#F5F0E8', border: `1px solid ${bdr2}`, borderRadius: 6, padding: '10px 14px', color: txt2, fontFamily: "'Crimson Pro', serif", fontSize: 14, outline: 'none' }}
          />
          <button onClick={runContentQuery} disabled={cqLoading || !cqQuery.trim()} style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', color: '#0D0B14', background: G2, border: 'none', borderRadius: 4, padding: '10px 20px', cursor: cqLoading ? 'wait' : 'pointer', opacity: cqLoading || !cqQuery.trim() ? 0.6 : 1, whiteSpace: 'nowrap' as const }}>
            {cqLoading ? 'Thinking...' : '💡 Ask'}
          </button>
        </div>
        {cqError && <div style={{ color: '#e09090', fontFamily: "'Crimson Pro', serif", fontSize: 13, marginBottom: 12 }}>⚠ {cqError}</div>}
        {cqResponse && (
          <div>
            <div style={{ background: isDark ? BG : '#F5F0E8', border: `1px solid ${bdr2}`, borderRadius: 8, padding: '20px', marginBottom: 12 }}>
              {renderMarkdown(cqResponse)}
            </div>
            {cqTitles.length > 0 && (
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: mut2, letterSpacing: '0.08em' }}>
                Documents analyzed: {cqTitles.join(' · ')}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SpiritualMappingAdmin({ isDark }: { isDark: boolean }) {
  const [submissions, setSubmissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({})
  const [processing, setProcessing] = useState<Record<string, boolean>>({})
  const adGold2 = isDark ? G : '#A07C2C'
  const bg2 = isDark ? BG : '#F5F0E8'
  const surf2 = isDark ? SURF : '#EDE6D3'
  const bdr2 = isDark ? BDR : 'rgba(139,105,20,0.25)'
  const txt2 = isDark ? TXT : '#1C1407'
  const dim2 = isDark ? DIM : '#6B5520'
  const mut2 = isDark ? '#9a8c74' : '#5c4a3a'

  useEffect(() => {
    loadSubmissions()
  }, [])

  async function loadSubmissions() {
    setLoading(true)
    try {
      const res = await fetch('/api/sm-submission?pending=true')
      const data = await res.json()
      setSubmissions(data.submissions || [])
    } catch {}
    setLoading(false)
  }

  async function approveSubmission(subId: string, regionId: string) {
    setProcessing(p => ({ ...p, [subId]: true }))
    try {
      await fetch('/api/sm-submission', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subId, admin_status: 'approved', regionId }),
      })
      await loadSubmissions()
    } catch {}
    setProcessing(p => ({ ...p, [subId]: false }))
  }

  async function rejectSubmission(subId: string) {
    setProcessing(p => ({ ...p, [subId]: true }))
    try {
      await fetch('/api/sm-submission', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: subId, admin_status: 'rejected', admin_notes: rejectNotes[subId] || '' }),
      })
      await loadSubmissions()
    } catch {}
    setProcessing(p => ({ ...p, [subId]: false }))
  }

  return (
    <div style={{ color: txt2, fontFamily: "'Crimson Pro', serif" }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: adGold2, marginBottom: 4, letterSpacing: '0.08em' }}>📍 Spiritual Mapping: Submission Review</div>
      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: dim2, fontStyle: 'italic', marginBottom: 24 }}>Review and approve region submissions for the Global Intelligence Map</div>

      {loading && <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.2em', color: mut2 }}>LOADING...</div>}

      {!loading && submissions.length === 0 && (
        <div style={{ padding: '40px 0', textAlign: 'center', fontFamily: "'Crimson Pro', serif", fontSize: 14, color: dim2, fontStyle: 'italic' }}>
          No pending submissions
        </div>
      )}

      {!loading && submissions.map((sub: any) => (
        <div key={sub.id} style={{ background: surf2, border: `1px solid ${bdr2}`, borderRadius: 10, padding: '20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: txt2, marginBottom: 4 }}>{sub.region?.name || 'Unknown Region'}</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: mut2, letterSpacing: '0.1em' }}>{sub.region?.tier?.toUpperCase()}</span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: mut2, letterSpacing: '0.1em' }}>By: {sub.submitted_by_name}</span>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: mut2, letterSpacing: '0.1em' }}>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : ''}</span>
              </div>
            </div>
            <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', color: '#d4b84a', border: '1px solid rgba(212,184,74,0.4)', padding: '3px 10px', borderRadius: 20 }}>⏳ PENDING</span>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', color: mut2, display: 'block', marginBottom: 5 }}>REJECTION NOTES (optional)</label>
            <input
              value={rejectNotes[sub.id] || ''}
              onChange={e => setRejectNotes(n => ({ ...n, [sub.id]: e.target.value }))}
              placeholder="Reason for rejection if applicable..."
              style={{ width: '100%', background: isDark ? BG : '#F5F0E8', border: `1px solid ${bdr2}`, borderRadius: 6, padding: '8px 12px', color: txt2, fontFamily: "'Crimson Pro', serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }}
            />
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => approveSubmission(sub.id, sub.region_id)}
              disabled={!!processing[sub.id]}
              style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', color: '#0D0B14', background: '#80e090', border: 'none', borderRadius: 4, padding: '9px 18px', cursor: 'pointer', opacity: processing[sub.id] ? 0.6 : 1 }}
            >
              {processing[sub.id] ? '...' : '✓ APPROVE: Add to Global Map'}
            </button>
            <button
              onClick={() => rejectSubmission(sub.id)}
              disabled={!!processing[sub.id]}
              style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', color: '#e09090', background: 'transparent', border: '1px solid rgba(224,144,144,0.4)', borderRadius: 4, padding: '9px 18px', cursor: 'pointer', opacity: processing[sub.id] ? 0.6 : 1 }}
            >
              ✕ REJECT
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function AdminPage() {
  const { user, isLoaded } = useUser()
  const { getToken }       = useAuth()
  const [tab, setTab]      = useState<'dashboard' | 'arsenal' | 'intel' | 'moderation' | 'training' | 'field-ministry' | 'documents' | 'library' | 'spiritual-mapping' | 'lib-intel' | 'taxonomy' | 'tracker'>('dashboard')
  const [dashDemons, setDashDemons] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/demons').then(r => r.json()).then(d => setDashDemons(d.demons || [])).catch(() => {})
  }, [])
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
    { key: 'dashboard',       label: '⚡ Dashboard'    },
    { key: 'arsenal',         label: 'Arsenal'          },
    { key: 'intel',           label: 'Intel Archive'    },
    { key: 'moderation',      label: 'Moderation'       },
    { key: 'training',        label: 'Training'         },
    { key: 'field-ministry',  label: 'Field Min.'       },
    { key: 'documents',       label: 'Documents'        },
    { key: 'library',         label: 'Min. Library'     },
    { key: 'spiritual-mapping', label: '📍 Sp. Mapping' },
    { key: 'lib-intel', label: '🔬 Lib. Intel'          },
    { key: 'taxonomy',  label: '🔬 Taxonomy'            },
    { key: 'tracker',   label: '🗂 Tracker'             },
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
      <div style={{ borderBottom: `1px solid ${adBdr}`, padding: '0 16px', display: 'flex', background: headerBg, overflowX: 'auto' as const, WebkitOverflowScrolling: 'touch' as any, whiteSpace: 'nowrap' as const, scrollbarWidth: 'none' as any }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '11px 10px', background: 'none', border: 'none',
              borderBottom: `2px solid ${tab === t.key ? adGold : 'transparent'}`,
              color: tab === t.key ? adGold : adDim,
              fontFamily: cinzel, fontSize: 9,
              letterSpacing: '0.06em', cursor: 'pointer', marginBottom: '-1px',
              transition: 'all 0.15s', whiteSpace: 'nowrap' as const, flexShrink: 0,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ maxWidth: tab === 'documents' || tab === 'field-ministry' || tab === 'taxonomy' ? 1200 : 900, margin: '0 auto', padding: '32px 24px' }}>
        {tab === 'dashboard'      && <DashboardView getToken={getToken} isDark={isDark} setTab={(t: string) => setTab(t as any)} />}
        {tab === 'arsenal'        && <ArsenalManager getToken={getToken} />}
        {tab === 'intel'          && <IntelArchive getToken={getToken} isDark={isDark} />}
        {tab === 'moderation'     && <ModerationPanel getToken={getToken} />}
        {tab === 'training'       && <TrainingManager getToken={getToken} isDark={isDark} />}
        {tab === 'field-ministry' && <FieldMinistryManager getToken={getToken} isDark={isDark} />}
        {tab === 'documents'      && <DocumentsView getToken={getToken} isDark={isDark} demons={dashDemons} />}
        {tab === 'library'        && <LibraryManager getToken={getToken} isDark={isDark} />}
        {tab === 'spiritual-mapping' && <SpiritualMappingAdmin isDark={isDark} />}
        {tab === 'lib-intel'        && <LibraryIntelligence getToken={getToken} isDark={isDark} />}
        {tab === 'taxonomy'         && <TaxonomyReview getToken={getToken} isDark={isDark} />}
        {tab === 'tracker'          && <TrackerView getToken={getToken} isDark={isDark} />}
      </div>
    </div>
  )
}

// ─── TaxonomyReview ──────────────────────────────────────────────────────────

const KINGDOM_OPTIONS = [
  '', 'Hell / Darkness', 'Air', 'Water / Marine', 'Earth', 'Witchcraft', 'Occult',
  'Religion / False Religion', 'False Religion / Paganism', 'Infirmity / Sickness',
  'Mind / Intellect', 'Sexual Perversion', 'Death / Destruction', 'Fear / Torment',
  'Pride / Self', 'Deception / Lies', 'Anger / Violence', 'Mammon / Greed',
]

interface TaxSuggestion {
  recordId:   string
  name:       string
  current:    { biblicalRank: string; kingdom: string; subKingdom: string }
  suggested:  { biblicalRank: string; kingdom: string; subKingdom: string }
  confidence: 'high' | 'medium' | 'low'
  reasoning:  string
  changed:    boolean
}

const SUB_KINGDOM_OPTIONS = [
  '', 'Norse / Germanic', 'Celtic / Druidic', 'Greek / Roman', 'Egyptian',
  'Babylonian / Sumerian', 'Canaanite / Phoenician', 'Assyrian / Akkadian',
  'Persian / Zoroastrian', 'Hindu / Vedic', 'Buddhist / Eastern',
  'Native American / Indigenous', 'African Traditional / Vodou',
  'Aztec / Mayan / Mesoamerican', 'Polynesian / Pacific',
  'Freemasonry / Rosicrucian', 'Satanism / Luciferianism', 'New Age / Theosophy',
  'Witchcraft / Wicca', 'Kabbalah / Jewish Mysticism', 'Gnosticism',
  'Hermeticism / Alchemy', 'Marine / Aquatic', 'Celestial / Astral',
  'Infernal / Hellish', 'Generational / Bloodline', 'Religious Spirit / False Religion',
  'Sexual Covenant', 'Death Covenant', 'Mind / Intellect', 'Trauma / Wound',
  'Fallen Angel / Watcher', 'Nephilim / Giant Bloodline', 'Goetic / Solomonic', 'Apocryphal',
]

const BIBLICAL_RANK_OPTIONS = [
  '', 'Principality', 'World Ruler', 'Power', 'Wicked Spirit',
  'Demon', 'Familiar Spirit', 'Spirit of Infirmity', 'Fallen Angel',
]

function TaxonomyReview({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const [spirits,     setSpirits]     = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [filter,      setFilter]      = useState<'all' | 'needs'>('all')
  const [search,      setSearch]      = useState('')
  const [saves,       setSaves]       = useState<Record<string, 'saving' | 'saved' | 'error'>>({})

  // AI suggestion state
  const [aiRunning,   setAiRunning]   = useState(false)
  const [aiMsg,       setAiMsg]       = useState('')
  const [suggestions, setSuggestions] = useState<TaxSuggestion[]>([])
  const [suggFilter,  setSuggFilter]  = useState<'all' | 'high' | 'changed'>('all')
  const [applying,    setApplying]    = useState<{ running: boolean; done: number; total: number }>({ running: false, done: 0, total: 0 })

  useEffect(() => {
    // Use dedicated taxonomy-spirits endpoint (no view filter, correct field names)
    fetch('/api/taxonomy-spirits').then(r => r.json()).then(d => {
      // Map recordId → airtableId for compatibility with handleChange
      setSpirits((d.spirits || []).map((s: any) => ({ ...s, airtableId: s.recordId })))
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  async function handleChange(airtableId: string, field: string, value: string) {
    const key = `${airtableId}_${field}`
    setSaves(p => ({ ...p, [key]: 'saving' }))
    setSpirits(p => p.map(s => s.airtableId === airtableId ? { ...s, [field]: value } : s))
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-taxonomy-patch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ recordId: airtableId, field, value }),
      })
      if (res.ok) {
        setSaves(p => ({ ...p, [key]: 'saved' }))
        setTimeout(() => setSaves(p => { const n = { ...p }; delete n[key]; return n }), 1800)
      } else {
        const err = await res.json().catch(() => ({}))
        console.error('[TaxonomyReview] save error:', err)
        setSaves(p => ({ ...p, [key]: 'error' }))
        setTimeout(() => setSaves(p => { const n = { ...p }; delete n[key]; return n }), 3500)
      }
    } catch {
      setSaves(p => ({ ...p, [key]: 'error' }))
      setTimeout(() => setSaves(p => { const n = { ...p }; delete n[key]; return n }), 3500)
    }
  }

  async function runAiSuggest() {
    setAiRunning(true)
    setSuggestions([])
    let allSuggestions: TaxSuggestion[] = []
    let totalSpirits = 0
    let processed = 0
    let cursor: string | null = null

    try {
      const token = await getToken()
      setAiMsg('Starting AI analysis…')
      do {
        setAiMsg(`Analyzing spirits ${processed}/${totalSpirits || '?'}…`)
        const res: Response = await fetch('/api/admin-taxonomy-ai', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body:    JSON.stringify({ airtableOffset: cursor || undefined, limit: 20 }),
        })
        if (!res.ok) {
          const err: any = await res.json().catch(() => ({}))
          setAiMsg(`Error: ${err.error || res.statusText}`)
          break
        }
        const data: any = await res.json()
        if (data.total) totalSpirits = data.total
        processed += data.batchCount || 0
        allSuggestions = [...allSuggestions, ...(data.suggestions || [])]
        setSuggestions([...allSuggestions])
        cursor = data.nextOffset || null
      } while (cursor)

      const highCount = allSuggestions.filter(s => s.confidence === 'high').length
      setAiMsg(`AI found ${allSuggestions.length} suggested changes (${highCount} high confidence)`)
    } catch (e: any) {
      setAiMsg(`Error: ${e.message}`)
    }
    setAiRunning(false)
  }

  async function applyRow(sugg: TaxSuggestion) {
    const patches: Promise<void>[] = []
    if (sugg.suggested.kingdom && sugg.suggested.kingdom !== sugg.current.kingdom)
      patches.push(handleChange(sugg.recordId, 'kingdom', sugg.suggested.kingdom))
    if (sugg.suggested.subKingdom && sugg.suggested.subKingdom !== 'None' && sugg.suggested.subKingdom !== sugg.current.subKingdom)
      patches.push(handleChange(sugg.recordId, 'subKingdom', sugg.suggested.subKingdom))
    if (sugg.suggested.biblicalRank && sugg.suggested.biblicalRank !== sugg.current.biblicalRank)
      patches.push(handleChange(sugg.recordId, 'biblicalRank', sugg.suggested.biblicalRank))
    await Promise.all(patches)
    setSuggestions(p => p.filter(s => s.recordId !== sugg.recordId))
  }

  async function applyAllSuggestions(list: TaxSuggestion[]) {
    if (!list.length) return
    setApplying({ running: true, done: 0, total: list.length })
    for (let i = 0; i < list.length; i += 5) {
      const batch = list.slice(i, i + 5)
      await Promise.all(batch.map(applyRow))
      setApplying(p => ({ ...p, done: Math.min(i + 5, list.length) }))
    }
    setApplying({ running: false, done: 0, total: 0 })
  }

  const filteredSuggs = useMemo(() => {
    if (suggFilter === 'high')    return suggestions.filter(s => s.confidence === 'high')
    if (suggFilter === 'changed') return suggestions.filter(s => s.changed)
    return suggestions
  }, [suggestions, suggFilter])

  const filtered = useMemo(() => spirits.filter(s => {
    if (search && !s.name.toLowerCase().includes(search.toLowerCase())) return false
    if (filter === 'needs') return !s.kingdom || !s.subKingdom || !s.biblicalRank
    return true
  }), [spirits, search, filter])

  const total      = spirits.length
  const classified = spirits.filter(s => s.kingdom && s.subKingdom && s.biblicalRank).length
  const pct        = total ? Math.round((classified / total) * 100) : 0

  const G2   = isDark ? '#C9A84C' : '#a07830'
  const surf = isDark ? '#1a1714' : '#ffffff'
  const bdr  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.2)'
  const txt2 = isDark ? '#f0e8d8' : '#1a1410'
  const dim2 = isDark ? '#9a8c74' : '#5c4a3a'

  const selStyle: CSSProperties = {
    background: isDark ? '#1a1714' : '#fff',
    color: txt2,
    border: `1px solid ${bdr}`,
    borderRadius: 3,
    padding: '3px 5px',
    fontFamily: "'Crimson Pro', serif",
    fontSize: 12,
    cursor: 'pointer',
    width: '100%',
    outline: 'none',
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, fontFamily: "'Cinzel', serif", color: G2, letterSpacing: '0.12em', fontSize: 11 }}>
      LOADING ARCHIVE...
    </div>
  )

  return (
    <div style={{ fontFamily: "'Crimson Pro', serif", color: txt2 }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 17, color: G2, letterSpacing: '0.08em', marginBottom: 6 }}>
          🔬 Taxonomy Review
        </div>
        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: dim2, marginBottom: 18 }}>
          Bulk-classify every spirit's Kingdom, Sub-Kingdom, and Biblical Rank. Changes save instantly.
        </div>

        {/* Progress */}
        <div style={{ background: isDark ? 'rgba(201,168,76,0.07)' : 'rgba(160,120,48,0.07)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 8, padding: '12px 18px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: G2, letterSpacing: '0.1em', whiteSpace: 'nowrap' as const }}>
            {classified} / {total} classified
          </div>
          <div style={{ flex: 1, background: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(0,0,0,0.12)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
            <div style={{ width: `${pct}%`, height: '100%', background: G2, borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: G2, letterSpacing: '0.06em', fontWeight: 700, whiteSpace: 'nowrap' as const }}>
            {pct}%
          </div>
        </div>

        {/* Filters + Search + AI button */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const, marginTop: 4 }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              padding: '6px 16px',
              background: filter === 'all' ? G2 : (isDark ? 'rgba(201,168,76,0.12)' : 'rgba(160,120,48,0.1)'),
              color: filter === 'all' ? '#0D0B14' : G2,
              border: `1px solid ${filter === 'all' ? G2 : 'rgba(201,168,76,0.45)'}`,
              borderRadius: 4,
              fontFamily: "'Cinzel', serif",
              fontSize: 9,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontWeight: filter === 'all' ? 700 : 500,
            }}
          >
            ALL ({spirits.length})
          </button>
          <button
            onClick={() => setFilter('needs')}
            style={{
              padding: '6px 16px',
              background: filter === 'needs' ? G2 : (isDark ? 'rgba(201,168,76,0.12)' : 'rgba(160,120,48,0.1)'),
              color: filter === 'needs' ? '#0D0B14' : G2,
              border: `1px solid ${filter === 'needs' ? G2 : 'rgba(201,168,76,0.45)'}`,
              borderRadius: 4,
              fontFamily: "'Cinzel', serif",
              fontSize: 9,
              letterSpacing: '0.1em',
              cursor: 'pointer',
              fontWeight: filter === 'needs' ? 700 : 500,
            }}
          >
            NEEDS REVIEW ({spirits.filter(s => !s.kingdom || !s.subKingdom || !s.biblicalRank).length})
          </button>
          <button
            onClick={runAiSuggest}
            disabled={aiRunning}
            style={{
              padding:      '6px 16px',
              background:   aiRunning ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.15)',
              color:        G2,
              border:       `1px solid rgba(201,168,76,0.5)`,
              borderRadius: 4,
              fontFamily:   "'Cinzel', serif",
              fontSize:     9,
              letterSpacing:'0.1em',
              cursor:       aiRunning ? 'not-allowed' : 'pointer',
              opacity:      aiRunning ? 0.7 : 1,
            }}
          >
            {aiRunning ? '✦ Analyzing…' : '✦ AI Suggest All'}
          </button>
          {aiMsg && !aiRunning && (
            <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: dim2, fontStyle: 'italic' }}>
              {aiMsg}
            </span>
          )}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search spirit name..."
            style={{
              background: surf, color: txt2,
              border: `1px solid rgba(201,168,76,0.35)`,
              borderRadius: 4, padding: '5px 12px',
              fontFamily: "'Crimson Pro', serif",
              fontSize: 13, outline: 'none',
              marginLeft: 'auto', width: 200,
            }}
          />
        </div>
      </div>

      {/* AI Suggestions Panel */}
      {suggestions.length > 0 && (
        <div style={{ marginBottom: 24, border: `1px solid rgba(201,168,76,0.35)`, borderRadius: 10, overflow: 'hidden' }}>
          {/* Panel header */}
          <div style={{ background: isDark ? 'rgba(201,168,76,0.1)' : 'rgba(160,120,48,0.08)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const, borderBottom: `1px solid rgba(201,168,76,0.2)` }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: G2, letterSpacing: '0.08em', fontWeight: 700 }}>
              ✦ AI SUGGESTIONS: {suggestions.length} changes ({suggestions.filter(s => s.confidence === 'high').length} high confidence)
            </div>
            {/* Suggestion filter tabs */}
            <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
              {(['all', 'high', 'changed'] as const).map(f => (
                <button key={f} onClick={() => setSuggFilter(f)} style={{
                  padding: '3px 10px',
                  background: suggFilter === f ? G2 : 'transparent',
                  color: suggFilter === f ? '#0D0B14' : G2,
                  border: `1px solid rgba(201,168,76,${suggFilter === f ? '1' : '0.4'})`,
                  borderRadius: 3, fontFamily: "'Cinzel', serif", fontSize: 8,
                  letterSpacing: '0.08em', cursor: 'pointer',
                }}>
                  {f === 'all' ? `ALL (${suggestions.length})` : f === 'high' ? `HIGH (${suggestions.filter(s => s.confidence === 'high').length})` : `CHANGED (${suggestions.filter(s => s.changed).length})`}
                </button>
              ))}
            </div>
            {/* Bulk apply buttons */}
            <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
              {applying.running ? (
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: G2, letterSpacing: '0.08em' }}>
                  Applying {applying.done}/{applying.total}…
                </span>
              ) : (
                <>
                  <button onClick={() => applyAllSuggestions(suggestions.filter(s => s.confidence === 'high'))} style={{
                    padding: '5px 12px', background: G2, color: '#0D0B14',
                    border: 'none', borderRadius: 4,
                    fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.08em', cursor: 'pointer', fontWeight: 700,
                  }}>
                    ✓ Apply High Confidence ({suggestions.filter(s => s.confidence === 'high').length})
                  </button>
                  <button onClick={() => applyAllSuggestions(suggestions)} style={{
                    padding: '5px 12px', background: 'transparent', color: G2,
                    border: `1px solid rgba(201,168,76,0.5)`, borderRadius: 4,
                    fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.08em', cursor: 'pointer',
                  }}>
                    Apply All ({suggestions.length})
                  </button>
                  <button onClick={() => setSuggestions([])} style={{
                    padding: '5px 10px', background: 'transparent', color: dim2,
                    border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.12)'}`, borderRadius: 4,
                    fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.08em', cursor: 'pointer',
                  }}>
                    ✕ Dismiss All
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Suggestion rows */}
          <div style={{ maxHeight: 420, overflowY: 'auto' as const }}>
            {filteredSuggs.map(sugg => {
              const confColor = sugg.confidence === 'high' ? '#4ade80' : sugg.confidence === 'medium' ? '#f59e0b' : '#f87171'
              const fieldDiff = (cur: string, sug: string) => cur !== sug && !!sug && sug !== 'None'

              return (
                <div key={sugg.recordId} style={{
                  display: 'grid', gridTemplateColumns: '180px 1fr 1fr 1fr auto auto',
                  gap: 0, padding: '8px 14px', borderBottom: `1px solid rgba(201,168,76,0.1)`,
                  alignItems: 'center', fontSize: 12,
                }}>
                  {/* Name */}
                  <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 600, color: txt2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={sugg.name}>
                    {sugg.name}
                  </div>

                  {/* Kingdom */}
                  <div style={{ padding: '0 8px' }}>
                    {fieldDiff(sugg.current.kingdom, sugg.suggested.kingdom) ? (
                      <>
                        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 11, color: dim2, textDecoration: 'line-through', lineHeight: 1.3 }}>{sugg.current.kingdom || ''}</div>
                        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 11, color: G2, fontWeight: 600, lineHeight: 1.3 }}>{sugg.suggested.kingdom}</div>
                      </>
                    ) : (
                      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 11, color: dim2 }}>{sugg.current.kingdom || ''}</div>
                    )}
                  </div>

                  {/* Sub-Kingdom */}
                  <div style={{ padding: '0 8px' }}>
                    {fieldDiff(sugg.current.subKingdom, sugg.suggested.subKingdom) ? (
                      <>
                        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 11, color: dim2, textDecoration: 'line-through', lineHeight: 1.3 }}>{sugg.current.subKingdom || ''}</div>
                        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 11, color: G2, fontWeight: 600, lineHeight: 1.3 }}>{sugg.suggested.subKingdom}</div>
                      </>
                    ) : (
                      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 11, color: dim2 }}>{sugg.current.subKingdom || ''}</div>
                    )}
                  </div>

                  {/* Biblical Rank + confidence + reasoning */}
                  <div style={{ padding: '0 8px' }}>
                    {fieldDiff(sugg.current.biblicalRank, sugg.suggested.biblicalRank) ? (
                      <>
                        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 11, color: dim2, textDecoration: 'line-through', lineHeight: 1.3 }}>{sugg.current.biblicalRank || '—'}</div>
                        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 11, color: G2, fontWeight: 600, lineHeight: 1.3 }}>{sugg.suggested.biblicalRank}</div>
                      </>
                    ) : (
                      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 11, color: dim2 }}>{sugg.current.biblicalRank || '—'}</div>
                    )}
                    {sugg.reasoning && (
                      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 10, color: dim2, fontStyle: 'italic', marginTop: 2, lineHeight: 1.3, whiteSpace: 'normal' as const }}>
                        {sugg.reasoning}
                      </div>
                    )}
                  </div>

                  {/* Confidence badge */}
                  <div style={{ padding: '0 8px', textAlign: 'center' as const }}>
                    <span style={{
                      display: 'inline-block', padding: '2px 7px', borderRadius: 10,
                      background: confColor + '22', border: `1px solid ${confColor}66`,
                      color: confColor, fontFamily: "'Cinzel', serif", fontSize: 7,
                      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                    }}>
                      {sugg.confidence}
                    </span>
                  </div>

                  {/* Apply / Skip */}
                  <div style={{ display: 'flex', gap: 5, padding: '0 4px', whiteSpace: 'nowrap' as const }}>
                    <button onClick={() => applyRow(sugg)} style={{
                      padding: '4px 10px', background: G2, color: '#0D0B14',
                      border: 'none', borderRadius: 3,
                      fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.06em', cursor: 'pointer', fontWeight: 700,
                    }}>✓</button>
                    <button onClick={() => setSuggestions(p => p.filter(s => s.recordId !== sugg.recordId))} style={{
                      padding: '4px 10px', background: 'transparent', color: dim2,
                      border: `1px solid ${isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.15)'}`, borderRadius: 3,
                      fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.06em', cursor: 'pointer',
                    }}>✕</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' as const, border: `1px solid ${bdr}`, borderRadius: 8 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' as const, fontSize: 12 }}>
          <thead>
            <tr style={{ background: isDark ? 'rgba(201,168,76,0.07)' : 'rgba(160,120,48,0.06)', borderBottom: `1px solid ${bdr}` }}>
              {['Spirit Name', 'Kingdom', 'Sub-Kingdom', 'Biblical Rank', ''].map((h, i) => (
                <th key={i} style={{
                  padding: '8px 12px', textAlign: 'left' as const,
                  fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.12em',
                  color: dim2, fontWeight: 600, whiteSpace: 'nowrap' as const,
                  width: i === 0 ? 200 : i === 4 ? 50 : undefined,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((spirit, idx) => {
              const kKey  = `${spirit.airtableId}_kingdom`
              const skKey = `${spirit.airtableId}_subKingdom`
              const rKey  = `${spirit.airtableId}_biblicalRank`
              const allFilled = !!(spirit.kingdom && spirit.subKingdom && spirit.biblicalRank)
              const rowBg = idx % 2 === 0 ? 'transparent' : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.015)')

              const flash = (key: string) => {
                const s = saves[key]
                if (!s) return null
                return <span style={{ marginLeft: 4, fontSize: 11, color: s === 'saved' ? '#4ade80' : s === 'error' ? '#f87171' : dim2 }}>
                  {s === 'saving' ? '…' : s === 'saved' ? '✓' : '✗'}
                </span>
              }

              return (
                <tr key={spirit.airtableId} style={{ background: rowBg, borderBottom: `1px solid ${bdr}`, height: 36 }}>
                  <td style={{ padding: '4px 12px', maxWidth: 200 }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, fontWeight: 600, color: txt2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={spirit.name}>
                      {spirit.name}
                    </div>
                    {spirit.aka && <div style={{ fontSize: 10, color: dim2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, fontStyle: 'italic' }}>{spirit.aka}</div>}
                  </td>
                  <td style={{ padding: '4px 8px', minWidth: 165 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <select value={spirit.kingdom || ''} onChange={e => handleChange(spirit.airtableId, 'kingdom', e.target.value)} style={selStyle}>
                        {KINGDOM_OPTIONS.map(o => <option key={o} value={o}>{o || 'Select'}</option>)}
                      </select>
                      {flash(kKey)}
                    </div>
                  </td>
                  <td style={{ padding: '4px 8px', minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <select value={spirit.subKingdom || ''} onChange={e => handleChange(spirit.airtableId, 'subKingdom', e.target.value)} style={selStyle}>
                        {SUB_KINGDOM_OPTIONS.map(o => <option key={o} value={o}>{o || 'Select'}</option>)}
                      </select>
                      {flash(skKey)}
                    </div>
                  </td>
                  <td style={{ padding: '4px 8px', minWidth: 150 }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <select value={spirit.biblicalRank || ''} onChange={e => handleChange(spirit.airtableId, 'biblicalRank', e.target.value)} style={selStyle}>
                        {BIBLICAL_RANK_OPTIONS.map(o => <option key={o} value={o}>{o || 'Select'}</option>)}
                      </select>
                      {flash(rKey)}
                    </div>
                  </td>
                  <td style={{ padding: '4px 12px', textAlign: 'center' as const }}>
                    <span title={allFilled ? 'Classified' : 'Needs classification'} style={{
                      display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                      background: allFilled ? '#4ade80' : '#f59e0b',
                    }} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '40px 0', textAlign: 'center' as const, color: dim2, fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em' }}>
            {search ? `No spirits matching "${search}"` : filter === 'needs' ? 'All spirits classified ✓' : 'No spirits found'}
          </div>
        )}
      </div>
      <div style={{ marginTop: 10, fontFamily: "'Cinzel', serif", fontSize: 9, color: dim2, letterSpacing: '0.08em' }}>
        Showing {filtered.length} of {total} spirits
      </div>
    </div>
  )
}

// ─── TrackerView ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  in_progress:  { label: 'In Progress',  color: '#8BA3D4', bg: 'rgba(139,163,212,0.1)' },
  needs_review: { label: 'Needs Review', color: '#d4903a', bg: 'rgba(212,144,58,0.1)' },
  approved:     { label: 'Approved',     color: '#7a9e7e', bg: 'rgba(122,158,126,0.1)' },
  known_bug:    { label: 'Known Bug',    color: '#e05555', bg: 'rgba(220,85,85,0.1)'  },
  backlog:      { label: 'Backlog',      color: '#9a8c74', bg: 'rgba(154,140,116,0.1)' },
}
const PRIORITY_COLOR: Record<string, string> = { high: '#e05555', medium: '#d4903a', low: '#7a9e7e' }
const CATEGORIES = ['page', 'feature', 'api', 'arsenal', 'demon']

function TrackerView({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const G2   = isDark ? '#C9A84C' : '#a07830'
  const surf = isDark ? '#1a1714' : '#ffffff'
  const bdr  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.2)'
  const txt  = isDark ? '#f0e8d8' : '#1a1410'
  const dim  = isDark ? '#9a8c74' : '#5c4a3a'

  const [items, setItems]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [seeding, setSeeding]       = useState(false)
  const [seedMsg, setSeedMsg]       = useState('')
  const [catFilter, setCatFilter]   = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editNotes, setEditNotes]   = useState('')
  const [savingId, setSavingId]     = useState<string | null>(null)

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    setLoading(true)
    const token = await getToken()
    const res = await fetch('/api/admin-tracker', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setItems(d.items || []) }
    setLoading(false)
  }

  async function seed() {
    setSeeding(true); setSeedMsg('')
    const token = await getToken()
    const res = await fetch('/api/admin-tracker-seed', { method: 'POST', headers: { Authorization: `Bearer ${token}` } })
    const d = await res.json()
    setSeedMsg(d.skipped ? `Already seeded (${d.message})` : `Seeded ${d.inserted} items`)
    if (!d.skipped) await loadItems()
    setSeeding(false)
  }

  async function updateStatus(id: string, status: string) {
    setSavingId(id)
    const token = await getToken()
    const res = await fetch('/api/admin-tracker', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    })
    if (res.ok) {
      const d = await res.json()
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...d.item } : i))
    }
    setSavingId(null)
  }

  async function saveNotes(id: string) {
    setSavingId(id)
    const token = await getToken()
    const res = await fetch('/api/admin-tracker', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, notes: editNotes }),
    })
    if (res.ok) {
      const d = await res.json()
      setItems(prev => prev.map(i => i.id === id ? { ...i, ...d.item } : i))
    }
    setEditingId(null)
    setSavingId(null)
  }

  async function deleteItem(id: string) {
    if (!confirm('Remove this tracker item?')) return
    const token = await getToken()
    await fetch(`/api/admin-tracker?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const filtered = items.filter(i => {
    if (catFilter !== 'all' && i.category !== catFilter) return false
    if (statusFilter !== 'all' && i.status !== statusFilter) return false
    return true
  })

  const counts: Record<string, number> = {}
  for (const s of Object.keys(STATUS_CONFIG)) {
    counts[s] = items.filter(i => i.status === s).length
  }

  const selStyle: CSSProperties = {
    background: isDark ? '#1a1714' : '#fff', color: txt,
    border: `1px solid ${bdr}`, borderRadius: 4, padding: '4px 8px',
    fontFamily: "'Cinzel', serif", fontSize: 9, outline: 'none', letterSpacing: '0.06em',
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: G2, letterSpacing: '0.08em', marginBottom: 4 }}>🗂 Product QA & Roadmap</div>
          <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: dim, fontStyle: 'italic' }}>
            {items.length} items · {counts.approved || 0} approved · {counts.in_progress || 0} in progress
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {seedMsg && <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: dim, letterSpacing: '0.06em' }}>{seedMsg}</span>}
          <button onClick={seed} disabled={seeding} style={{ background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 5, color: dim, fontFamily: "'Cinzel', serif", fontSize: 9, padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.06em' }}>
            {seeding ? 'Seeding…' : '✦ Seed Tracker'}
          </button>
          <button onClick={loadItems} style={{ background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 5, color: dim, fontFamily: "'Cinzel', serif", fontSize: 9, padding: '5px 12px', cursor: 'pointer' }}>↺</button>
        </div>
      </div>

      {/* Status summary pills */}
      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8, marginBottom: 18 }}>
        {Object.entries(STATUS_CONFIG).map(([s, cfg]) => (
          <button key={s} onClick={() => setStatusFilter(statusFilter === s ? 'all' : s)}
            style={{ background: statusFilter === s ? cfg.bg : 'transparent', border: `1px solid ${statusFilter === s ? cfg.color : bdr}`, borderRadius: 20, padding: '4px 12px', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: 9, color: statusFilter === s ? cfg.color : dim, letterSpacing: '0.06em' }}>
            {cfg.label} ({counts[s] || 0})
          </button>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' as const }}>
        {['all', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setCatFilter(c)}
            style={{ background: catFilter === c ? 'rgba(201,168,76,0.15)' : 'transparent', border: `1px solid ${catFilter === c ? 'rgba(201,168,76,0.4)' : bdr}`, borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: 9, color: catFilter === c ? G2 : dim, letterSpacing: '0.06em', textTransform: 'capitalize' as const }}>
            {c === 'all' ? 'All' : c}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px 0', color: dim, fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', textAlign: 'center' as const }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '40px 0', color: dim, fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', textAlign: 'center' as const }}>
          {items.length === 0 ? 'No items yet. Click "✦ Seed Tracker" to populate.' : 'No items match this filter'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6 }}>
          {filtered.map(item => {
            const sc = STATUS_CONFIG[item.status] || STATUS_CONFIG.in_progress
            const pc = PRIORITY_COLOR[item.priority] || PRIORITY_COLOR.medium
            return (
              <div key={item.id} style={{ background: surf, border: `1px solid ${bdr}`, borderLeft: `3px solid ${sc.color}`, borderRadius: 8, padding: '10px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' as const }}>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: txt, fontWeight: 600 }}>{item.name}</span>
                      <span style={{ fontFamily: "'Cinzel', serif", fontSize: 7, color: dim, border: `1px solid ${bdr}`, borderRadius: 3, padding: '1px 6px', textTransform: 'capitalize' as const }}>{item.category}</span>
                      {item.route && <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: dim }}>{item.route}</span>}
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: pc, flexShrink: 0 }} title={`Priority: ${item.priority}`} />
                    </div>
                    {item.description && <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: dim, marginBottom: 4 }}>{item.description}</div>}
                    {item.notes && <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: dim, fontStyle: 'italic', borderLeft: `2px solid ${bdr}`, paddingLeft: 8 }}>{item.notes}</div>}
                    {item.status === 'approved' && item.approved_by && (
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: '#7a9e7e', marginTop: 4, letterSpacing: '0.06em' }}>
                        ✓ Approved by {item.approved_by} · {new Date(item.approved_at).toLocaleDateString()}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                    <select value={item.status} onChange={e => updateStatus(item.id, e.target.value)} disabled={savingId === item.id}
                      style={{ ...selStyle, background: sc.bg, color: sc.color, borderColor: sc.color + '66' }}>
                      {Object.entries(STATUS_CONFIG).map(([s, cfg]) => <option key={s} value={s}>{cfg.label}</option>)}
                    </select>
                    <button onClick={() => { setEditingId(editingId === item.id ? null : item.id); setEditNotes(item.notes || '') }}
                      style={{ background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 4, color: dim, fontFamily: "'Cinzel', serif", fontSize: 9, padding: '3px 8px', cursor: 'pointer' }}>
                      {editingId === item.id ? '✕' : '✎'}
                    </button>
                    <button onClick={() => deleteItem(item.id)}
                      style={{ background: 'transparent', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 4, color: '#f87171', fontFamily: "'Cinzel', serif", fontSize: 9, padding: '3px 8px', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
                {editingId === item.id && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} placeholder="Add notes…"
                      style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: `1px solid ${bdr}`, borderRadius: 4, padding: '6px 8px', color: txt, fontFamily: "'Crimson Pro', serif", fontSize: 12, outline: 'none', resize: 'vertical' as const }} />
                    <button onClick={() => saveNotes(item.id)} disabled={savingId === item.id}
                      style={{ background: G2, color: '#0D0B14', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: 'pointer', fontFamily: "'Cinzel', serif", fontSize: 9, fontWeight: 700 }}>
                      {savingId === item.id ? '…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
