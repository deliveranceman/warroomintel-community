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

const ATM_COLORS_ADMIN: Record<string, { bg: string; border: string; text: string; dot: string; label: string }> = {
  green:  { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.35)',   text: '#4ade80', dot: '#22c55e', label: 'Covered'  },
  amber:  { bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.35)',  text: '#fbbf24', dot: '#f59e0b', label: 'Carrying' },
  purple: { bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.35)', text: '#c084fc', dot: '#a855f7', label: 'Assigned' },
}

const TIER_COLORS: Record<string, string> = {
  Free: '#6a6080', Soldier: '#5C7CBF', Commander: '#7C5CBF', General: '#C9A84C',
}
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
function getMimeType(filename: string, fallback?: string): string {
  switch (fileExt(filename)) {
    case 'pdf':  return 'application/pdf'
    case 'txt':  return 'text/plain'
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case 'doc':  return 'application/msword'
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    case 'xls':  return 'application/vnd.ms-excel'
    default:     return fallback || 'application/octet-stream'
  }
}
function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / (1024 * 1024)).toFixed(1)} MB`
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function isSimilarTitle(a: string, b: string): boolean {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return false
  if (na === nb) return true
  if (na.includes(nb) || nb.includes(na)) return true
  return false
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
  const [resources, setResources]       = useState<any[]>([])
  const [resLoading, setResLoading]     = useState(true)
  const [deleting, setDeleting]         = useState<string | null>(null)
  const [arsenalEditId, setArsenalEditId] = useState<string | null>(null)
  const [arsenalEditForm, setArsenalEditForm] = useState<any>({})
  const [stagedFiles, setStagedFiles]   = useState<{
    id: number; file: File; filename: string; sizeLabel: string; tier: string;
    status: 'pending'|'uploading'|'done'|'error'|'duplicate'; errorMsg?: string;
    topic?: string; description?: string; spirit_tags?: string[]; aiStatus?: 'idle'|'loading'|'done'|'error';
    duplicateMatch?: any;
  }[]>([])
  const [listExpanded, setListExpanded] = useState(true)
  const [bulkUploading, setBulkUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ done: 0, total: 0 })
  const [dragOver, setDragOver]         = useState(false)
  const [showCatManager, setShowCatManager] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [newCategory, setNewCategory]   = useState('')
  const [highlightedResourceId, setHighlightedResourceId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set())
  const [massEditTier, setMassEditTier]     = useState('')
  const [massEditTopic, setMassEditTopic]   = useState('')
  const [massDelConfirm, setMassDelConfirm] = useState(false)
  const [massApplying, setMassApplying]     = useState(false)
  const justAddedRef = useRef<number[]>([])
  const [filterSearch, setFilterSearch]     = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterTier, setFilterTier]         = useState('')
  const [recentSearch, setRecentSearch]     = useState('')

  const TOPICS = [
    'Spiritual Warfare',
    'Deliverance Ministry',
    'Inspirational / Faith',
    'Prayer and Intercession',
    'Ministry Training',
    'Devotional',
    'Healing and Wholeness',
    'Generational / Bloodline',
    'Scripture Study',
    "Men's Ministry",
    'Freemasonry & Secret Societies',
    'Marine Kingdom',
    'Jezebel Spirit',
    'Python Spirit',
    'Witchcraft',
  ]

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

  // Auto-autofill: fire when new files are staged
  useEffect(() => {
    if (justAddedRef.current.length === 0) return
    const toProcess = [...justAddedRef.current]
    justAddedRef.current = []
    for (const id of toProcess) handleArsenalAutofill(id)
  }, [stagedFiles.length])

  async function handleMassEdit() {
    if (!selectedIds.size || massApplying) return
    if (!massEditTier && !massEditTopic) return
    setMassApplying(true)
    try {
      const token = await getToken()
      const body: any = { ids: [...selectedIds] }
      if (massEditTier)  body.tier  = massEditTier
      if (massEditTopic) body.topic = massEditTopic
      const res = await fetch('/api/admin-resources', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      if (res.ok) {
        setResources(prev => prev.map(r =>
          selectedIds.has(r.id)
            ? { ...r, ...(massEditTier ? { tier: massEditTier } : {}), ...(massEditTopic ? { topic: massEditTopic } : {}) }
            : r
        ))
        setSelectedIds(new Set())
        setMassEditTier('')
        setMassEditTopic('')
      }
    } catch { /* silent */ }
    setMassApplying(false)
  }

  async function handleMassDelete() {
    if (!selectedIds.size || massApplying) return
    setMassApplying(true)
    try {
      const ids = [...selectedIds].join(',')
      const token = await getToken()
      const res = await fetch(`/api/admin-resources?ids=${encodeURIComponent(ids)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        setResources(prev => prev.filter(r => !selectedIds.has(r.id)))
        setSelectedIds(new Set())
      }
    } catch { /* silent */ }
    setMassApplying(false)
    setMassDelConfirm(false)
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

  function detectTier(filename: string): string {
    const lower = filename.toLowerCase()
    if (lower.includes('commander') || lower.includes('cmd')) return 'commander'
    if (lower.includes('general') || lower.includes('gen')) return 'general'
    return 'soldier'
  }

  function findDuplicateResource(file: File): any | null {
    return resources.find(r =>
      r.file_path?.split('/').pop() === file.name ||
      r.title?.toLowerCase() === file.name.replace(/\.[^/.]+$/, '').toLowerCase() ||
      isSimilarTitle(r.title || '', file.name)
    ) || null
  }

  function addStagedFiles(files: File[]) {
    const allowed = files
      .filter(f => f.type === 'application/pdf' || f.name.endsWith('.pdf') || f.name.endsWith('.docx'))
      .slice(0, Math.max(0, 20 - stagedFiles.length))
    if (!allowed.length) return
    const now = Date.now()
    const mapped = allowed.map((f, i) => {
      const match = findDuplicateResource(f)
      return {
        id: now + i,
        file: f,
        filename: f.name,
        sizeLabel: fmtBytes(f.size),
        tier: detectTier(f.name),
        status: (match ? 'duplicate' : 'pending') as 'pending'|'uploading'|'done'|'error'|'duplicate',
        duplicateMatch: match || undefined,
      }
    })
    setStagedFiles(prev => [...prev, ...mapped])
    justAddedRef.current = mapped.map(x => x.id)
    if (stagedFiles.length + mapped.length > 5) setListExpanded(false)
  }

  function removeStagedFile(id: number) {
    setStagedFiles(prev => prev.filter(sf => sf.id !== id))
  }

  async function handleArsenalAutofill(sfId: number) {
    const sf = stagedFiles.find(x => x.id === sfId)
    if (!sf) return
    setStagedFiles(prev => prev.map(x => x.id === sfId ? { ...x, aiStatus: 'loading' as const } : x))
    try {
      const fd = new FormData()
      fd.append('file', sf.file)
      const token = await getToken()
      const res = await fetch('/api/arsenal-autofill', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) throw new Error('autofill failed')
      const data = await res.json()
      setStagedFiles(prev => prev.map(x => x.id === sfId ? {
        ...x,
        aiStatus: 'done' as const,
        topic: data.category || x.topic,
        description: data.description || x.description,
        spirit_tags: data.spirit_tags || x.spirit_tags || [],
        tier: data.tier && ['watchman','soldier','commander','general'].includes(data.tier) ? data.tier : x.tier,
      } : x))
    } catch {
      setStagedFiles(prev => prev.map(x => x.id === sfId ? { ...x, aiStatus: 'error' as const } : x))
    }
  }

  async function handleBulkUpload() {
    const pending = stagedFiles.filter(sf => sf.status === 'pending')
    if (!pending.length || bulkUploading) return
    setBulkUploading(true)
    setUploadProgress({ done: 0, total: pending.length })
    for (const sf of pending) {
      setStagedFiles(prev => prev.map(x => x.id === sf.id ? { ...x, status: 'uploading' as const } : x))
      try {
        const fd = new FormData()
        fd.append('file', sf.file)
        const cleanedTitle = (sf.filename.replace(/\.[^.]+$/, '').replace(/_arsenal$/i, '').replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).trim()) || sf.filename
        fd.append('title', cleanedTitle)
        fd.append('tier', sf.tier)
        fd.append('topic', sf.topic || 'Spiritual Warfare')
        fd.append('description', sf.description || '')
        fd.append('spirit_tags', JSON.stringify(sf.spirit_tags || []))
        fd.append('tags', '[]')
        const token = await getToken()
        const res = await fetch('/api/admin-upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        })
        if (res.ok) {
          setStagedFiles(prev => prev.map(x => x.id === sf.id ? { ...x, status: 'done' as const } : x))
          setUploadProgress(p => ({ ...p, done: p.done + 1 }))
        } else {
          const d = await res.json().catch(() => ({}))
          const errMsg = res.status === 409
            ? `Duplicate: "${d.existingTitle || 'file already exists'}"`
            : d.error || 'Upload failed'
          setStagedFiles(prev => prev.map(x => x.id === sf.id ? { ...x, status: 'error' as const, errorMsg: errMsg } : x))
        }
      } catch (e: any) {
        setStagedFiles(prev => prev.map(x => x.id === sf.id ? { ...x, status: 'error' as const, errorMsg: e.message } : x))
      }
    }
    setBulkUploading(false)
    await fetchResources()
  }

  const recentUploads = (recentSearch.trim()
    ? [...resources].filter((r: any) =>
        (r.title || '').toLowerCase().includes(recentSearch.toLowerCase()) ||
        (r.description || '').toLowerCase().includes(recentSearch.toLowerCase()) ||
        (r.filename || '').toLowerCase().includes(recentSearch.toLowerCase())
      )
    : [...resources]
  ).sort((a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
   .slice(0, 10)

  const displayedItems = resources.filter((item: any) => {
    if (filterCategory && item.topic !== filterCategory) return false
    if (filterTier) {
      const t = (item.tier || '').toLowerCase()
      const f = filterTier.toLowerCase()
      if (f === 'watchman') { if (t !== 'watchman' && t !== 'free') return false }
      else if (t !== f) return false
    }
    if (filterSearch) {
      const q = filterSearch.toLowerCase()
      return (item.title || '').toLowerCase().includes(q) || (item.description || '').toLowerCase().includes(q)
    }
    return true
  })

  return (
    <div>
      {/* ── BULK UPLOAD ── */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: G }}>📦 Bulk Upload</span>
          {stagedFiles.length > 0 && (
            <span style={{ fontFamily: crimson, fontSize: 12, color: DIM }}>
              {stagedFiles.length} staged · {stagedFiles.filter(sf => sf.status === 'pending').length} pending
              {stagedFiles.filter(sf => sf.status === 'duplicate').length > 0 && ` · ${stagedFiles.filter(sf => sf.status === 'duplicate').length} duplicate`}
            </span>
          )}
        </div>

        {/* ── Recently Uploaded ── */}
        {resources.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: DIM, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>RECENTLY UPLOADED</span>
              <input
                value={recentSearch}
                onChange={e => setRecentSearch(e.target.value)}
                placeholder="Filter..."
                style={{ flex: 1, background: 'rgba(255,255,255,0.03)', border: `1px solid ${BDR}`, borderRadius: 4, padding: '4px 8px', color: TXT, fontFamily: crimson, fontSize: 12, outline: 'none' }}
              />
              {recentSearch && (
                <button onClick={() => setRecentSearch('')} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1, flexShrink: 0 }}>✕</button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 3 }}>
              {recentUploads.length === 0 ? (
                <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic' }}>No matches</div>
              ) : recentUploads.map((r: any) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)`, borderLeft: `2px solid ${TIER_COLORS[r.tier] || DIM}`, borderRadius: 5, padding: '6px 10px' }}>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>{FILE_ICONS[r.file_type?.split('/').pop() || ''] || '📎'}</span>
                  <span style={{ fontFamily: crimson, fontSize: 12, color: TXT, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{r.title?.replace(/_arsenal$/i, '') ?? r.filename}</span>
                  <span style={{ fontFamily: cinzel, fontSize: 7, color: TIER_COLORS[r.tier] || DIM, border: `1px solid ${TIER_COLORS[r.tier] || DIM}44`, padding: '1px 6px', borderRadius: 10, flexShrink: 0 }}>{r.tier}</span>
                  <span style={{ fontFamily: cinzel, fontSize: 8, color: DIM, flexShrink: 0 }}>{r.created_at ? fmtDate(r.created_at) : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); addStagedFiles(Array.from(e.dataTransfer.files)) }}
          onClick={() => document.getElementById('bulk-file-input')?.click()}
          style={{
            border: `2px dashed ${dragOver ? G : 'rgba(201,168,76,0.3)'}`,
            borderRadius: 10, padding: '28px 20px', textAlign: 'center' as const,
            marginBottom: 16, background: dragOver ? 'rgba(201,168,76,0.04)' : 'transparent',
            cursor: 'pointer', transition: 'all 0.2s',
          }}
        >
          <input
            id="bulk-file-input" type="file" multiple accept=".pdf,.docx"
            style={{ display: 'none' }}
            onChange={e => { addStagedFiles(Array.from(e.target.files || [])); e.target.value = '' }}
          />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📁</div>
          <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.08em', marginBottom: 4 }}>
            Drop PDFs here or click to browse
          </div>
          <div style={{ fontSize: 11, color: DIM }}>Up to 20 files · PDF or DOCX · Tier auto-detected from filename</div>
        </div>

        {/* Staged file list */}
        {stagedFiles.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <button
                onClick={() => setListExpanded(e => !e)}
                style={{ background: 'none', border: 'none', color: DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', textTransform: 'uppercase' as const, padding: 0 }}
              >
                {listExpanded ? '▲' : '▼'} {stagedFiles.length} File{stagedFiles.length !== 1 ? 's' : ''} Staged
              </button>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {bulkUploading && (
                  <span style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.08em' }}>
                    {uploadProgress.done} / {uploadProgress.total} uploaded
                  </span>
                )}
                {!bulkUploading && stagedFiles.some(sf => sf.status === 'done') && (
                  <button
                    onClick={() => setStagedFiles(prev => prev.filter(sf => sf.status !== 'done'))}
                    style={{ background: 'none', border: 'none', color: DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const, padding: 0 }}
                  >Clear Done</button>
                )}
              </div>
            </div>

            {listExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4, marginBottom: 12 }}>
                {stagedFiles.map(sf => {
                  const statusColors: Record<string, string> = {
                    pending: DIM, uploading: G, done: '#4ade80', error: '#f87171', duplicate: '#f59e0b',
                  }
                  const statusLabels: Record<string, string> = {
                    pending: 'Pending', uploading: '⏳ Uploading', done: '✓ Done', error: '✗ Error', duplicate: '⚠ Duplicate',
                  }
                  const sc = statusColors[sf.status] || DIM
                  return (
                    <div key={sf.id} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'rgba(255,255,255,0.02)',
                      border: `1px solid ${sf.status === 'duplicate' ? 'rgba(245,158,11,0.25)' : sf.status === 'error' ? 'rgba(248,113,113,0.25)' : sf.status === 'done' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)'}`,
                      borderRadius: 6, padding: '8px 12px',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: cinzel, fontSize: 10, color: TXT, whiteSpace: 'nowrap' as const, overflow: 'hidden', textOverflow: 'ellipsis' }}>{sf.filename}</div>
                        <div style={{ fontFamily: crimson, fontSize: 11, color: DIM }}>{sf.sizeLabel}</div>
                        {sf.topic && <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.06em' }}>{sf.topic}</div>}
                        {sf.description && <div style={{ fontFamily: crimson, fontSize: 11, color: DIM, fontStyle: 'italic' as const, marginTop: 2, maxWidth: 340, whiteSpace: 'normal' as const }}>{sf.description}</div>}
                        {sf.spirit_tags && sf.spirit_tags.length > 0 && (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' as const, marginTop: 3 }}>
                            {sf.spirit_tags.map(tag => (
                              <span key={tag} style={{ fontFamily: cinzel, fontSize: 8, color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 10, padding: '1px 6px' }}>{tag}</span>
                            ))}
                          </div>
                        )}
                        {sf.status === 'duplicate' && (
                          <div>
                            <div style={{ fontFamily: crimson, fontSize: 11, color: '#f59e0b', fontStyle: 'italic' as const, marginBottom: 4 }}>
                              ⚠ Already exists{sf.duplicateMatch?.title ? ` as "${sf.duplicateMatch.title}"` : ''}
                            </div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                              <button
                                onClick={() => setStagedFiles(prev => prev.map(x => x.id === sf.id ? { ...x, status: 'pending' as const } : x))}
                                style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 4, padding: '3px 8px', fontSize: 9, color: G, fontFamily: cinzel, cursor: 'pointer', letterSpacing: '0.06em' }}>
                                ↑ Upload Anyway
                              </button>
                              {sf.duplicateMatch?.id && (
                                <button
                                  onClick={() => {
                                    setHighlightedResourceId(sf.duplicateMatch!.id)
                                    setTimeout(() => setHighlightedResourceId(null), 3000)
                                  }}
                                  style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 4, padding: '3px 8px', fontSize: 9, color: 'rgba(201,168,76,0.6)', fontFamily: cinzel, cursor: 'pointer', letterSpacing: '0.06em' }}>
                                  → View Existing
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                        {sf.status === 'error' && sf.errorMsg && <div style={{ fontFamily: crimson, fontSize: 11, color: '#f87171', fontStyle: 'italic' as const }}>{sf.errorMsg}</div>}
                      </div>
                      {(sf.status === 'pending' || sf.status === 'duplicate') && (
                        <>
                          <button
                            onClick={() => handleArsenalAutofill(sf.id)}
                            disabled={sf.aiStatus === 'loading'}
                            title="AI Autofill — category, description, spirit tags"
                            style={{
                              background: sf.aiStatus === 'done' ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${sf.aiStatus === 'done' ? 'rgba(201,168,76,0.5)' : sf.aiStatus === 'error' ? 'rgba(248,113,113,0.4)' : 'rgba(201,168,76,0.2)'}`,
                              borderRadius: 4, padding: '3px 7px',
                              color: sf.aiStatus === 'loading' ? DIM : sf.aiStatus === 'error' ? '#f87171' : G,
                              fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
                              cursor: sf.aiStatus === 'loading' ? 'wait' : 'pointer',
                              whiteSpace: 'nowrap' as const, flexShrink: 0,
                            }}
                          >
                            {sf.aiStatus === 'loading' ? '…' : sf.aiStatus === 'done' ? '✦ Filled' : sf.aiStatus === 'error' ? '✦ Retry' : '✦ AI'}
                          </button>
                          <select
                            value={sf.tier}
                            onChange={e => setStagedFiles(prev => prev.map(x => x.id === sf.id ? { ...x, tier: e.target.value } : x))}
                            style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 4, padding: '3px 6px', color: TXT, fontFamily: cinzel, fontSize: 9, outline: 'none' }}
                          >
                            <option value="watchman">Watchman</option>
                            <option value="soldier">Soldier</option>
                            <option value="commander">Commander</option>
                            <option value="general">General</option>
                          </select>
                        </>
                      )}
                      <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: sc, border: `1px solid ${sc}44`, borderRadius: 10, padding: '2px 8px', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                        {statusLabels[sf.status] || sf.status}
                      </span>
                      {sf.status === 'pending' && (
                        <button onClick={() => removeStagedFile(sf.id)} style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: '0 2px', flexShrink: 0 }} title="Remove">×</button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={handleBulkUpload}
              disabled={bulkUploading || !stagedFiles.some(sf => sf.status === 'pending')}
              style={{
                width: '100%', padding: '12px',
                background: (bulkUploading || !stagedFiles.some(sf => sf.status === 'pending')) ? 'rgba(201,168,76,0.2)' : G,
                border: 'none', borderRadius: 8,
                color: (bulkUploading || !stagedFiles.some(sf => sf.status === 'pending')) ? DIM : '#0D0B14',
                fontFamily: cinzel, fontSize: 12, letterSpacing: '0.1em',
                cursor: (bulkUploading || !stagedFiles.some(sf => sf.status === 'pending')) ? 'not-allowed' : 'pointer',
                textTransform: 'uppercase' as const, fontWeight: 700,
              }}
            >
              {bulkUploading
                ? `⬆ Uploading... ${uploadProgress.done + 1} / ${uploadProgress.total}`
                : `⚔ Upload ${stagedFiles.filter(sf => sf.status === 'pending').length} File${stagedFiles.filter(sf => sf.status === 'pending').length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>

      {/* Resource List */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: G }}>
          📂 Resources
          {!resLoading && (
            <span style={{ color: DIM, fontSize: 10 }}>
              {filterSearch || filterCategory || filterTier
                ? ` — ${displayedItems.length} of ${resources.length}`
                : ` (${resources.length})`}
            </span>
          )}
        </div>
        {resources.length > 0 && (
          <button
            onClick={() => setSelectedIds(selectedIds.size === displayedItems.length ? new Set() : new Set(displayedItems.map((r: any) => r.id)))}
            style={{ background: 'none', border: 'none', color: DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', textTransform: 'uppercase' as const }}
          >
            {selectedIds.size === displayedItems.length && displayedItems.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
        )}
      </div>

      {/* ── Filter bar ── */}
      <div style={{ marginBottom: 14 }}>
        {/* Search */}
        <input
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          placeholder="Search titles and descriptions..."
          style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 12px', color: TXT, fontFamily: crimson, fontSize: 13, outline: 'none', marginBottom: 8 }}
        />
        {/* Category pills */}
        <div style={{ display: 'flex', gap: 5, overflowX: 'auto', scrollbarWidth: 'none' as any, WebkitOverflowScrolling: 'touch' as any, paddingBottom: 4, marginBottom: 6 }}>
          {['', ...TOPICS].map(t => (
            <button key={t || '__all__'} onClick={() => setFilterCategory(t)}
              style={{ flexShrink: 0, padding: '3px 10px', borderRadius: 999, border: `1px solid ${filterCategory === t ? G : 'rgba(201,168,76,0.2)'}`, background: filterCategory === t ? 'rgba(201,168,76,0.15)' : 'transparent', color: filterCategory === t ? G : DIM, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
              {t || 'All Topics'}
            </button>
          ))}
        </div>
        {/* Tier pills */}
        <div style={{ display: 'flex', gap: 5 }}>
          {[['', 'All'], ['watchman', 'Watchman'], ['soldier', 'Soldier'], ['commander', 'Commander'], ['general', 'General']].map(([val, label]) => (
            <button key={val} onClick={() => setFilterTier(val)}
              style={{ padding: '3px 10px', borderRadius: 999, border: `1px solid ${filterTier === val ? G : 'rgba(201,168,76,0.2)'}`, background: filterTier === val ? 'rgba(201,168,76,0.15)' : 'transparent', color: filterTier === val ? G : DIM, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', cursor: 'pointer' }}>
              {label}
            </button>
          ))}
          {(filterSearch || filterCategory || filterTier) && (
            <button onClick={() => { setFilterSearch(''); setFilterCategory(''); setFilterTier('') }}
              style={{ padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(248,113,113,0.3)', background: 'transparent', color: '#f87171', fontFamily: cinzel, fontSize: 8, cursor: 'pointer', marginLeft: 4 }}>
              ✕ Clear
            </button>
          )}
        </div>
      </div>

      {resLoading ? (
        <div style={{ fontFamily: cinzel, fontSize: 10, color: DIM, letterSpacing: '0.1em', padding: '20px 0' }}>Loading...</div>
      ) : resources.length === 0 ? (
        <div style={{ fontFamily: crimson, fontSize: 15, color: DIM, fontStyle: 'italic', padding: '20px 0' }}>No resources uploaded yet.</div>
      ) : displayedItems.length === 0 ? (
        <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', padding: '20px 0' }}>No resources match the current filters.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingBottom: selectedIds.size > 0 ? 72 : 0 }}>
          {displayedItems.map((r: any) => (
            <Fragment key={r.id}>
            <div style={{ background: SURF, border: `1px solid ${selectedIds.has(r.id) ? 'rgba(201,168,76,0.6)' : highlightedResourceId === r.id ? 'rgba(201,168,76,0.8)' : BDR}`, borderLeft: `3px solid ${highlightedResourceId === r.id ? '#C9A84C' : (TIER_COLORS[r.tier] || DIM)}`, borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, transition: 'border-color 0.4s', boxShadow: highlightedResourceId === r.id ? '0 0 0 2px rgba(201,168,76,0.15)' : 'none' }}>
              <input
                type="checkbox"
                checked={selectedIds.has(r.id)}
                onChange={e => setSelectedIds(prev => { const s = new Set(prev); e.target.checked ? s.add(r.id) : s.delete(r.id); return s })}
                style={{ flexShrink: 0, accentColor: '#C9A84C', width: 14, height: 14, cursor: 'pointer' }}
              />
              <span style={{ fontSize: 20, flexShrink: 0 }}>{FILE_ICONS[r.file_type?.split('/').pop() || ''] || '📎'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: cinzel, fontSize: 12, color: TXT, marginBottom: 3 }}>{r.title?.replace(/_arsenal$/i, '') ?? r.title}</div>
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
                      {['free','soldier','commander','general'].map(t => <option key={t} value={t}>{t === 'free' ? 'Watchman' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
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
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
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
                  <button onClick={async () => {
                    const token = await getToken()
                    setArsenalEditForm((f: any) => ({ ...f, _aiLoading: true }))
                    try {
                      const res = await fetch(`/api/arsenal-autofill?id=${r.id}`, {
                        headers: { Authorization: `Bearer ${token}` },
                      })
                      if (res.ok) {
                        const data = await res.json()
                        setArsenalEditForm((f: any) => ({
                          ...f,
                          _aiLoading: false,
                          title:       data.title       || f.title,
                          topic:       data.category    || f.topic,
                          notes:       data.description || f.notes,
                          spirit_tags: data.spirit_tags?.length ? data.spirit_tags : f.spirit_tags,
                          tier:        data.tier && ['watchman','soldier','commander','general'].includes(data.tier) ? data.tier : f.tier,
                        }))
                      } else { setArsenalEditForm((f: any) => ({ ...f, _aiLoading: false })) }
                    } catch { setArsenalEditForm((f: any) => ({ ...f, _aiLoading: false })) }
                  }} style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 4, padding: '6px 14px', cursor: arsenalEditForm._aiLoading ? 'wait' : 'pointer', fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.08em', opacity: arsenalEditForm._aiLoading ? 0.6 : 1 }}>
                    {arsenalEditForm._aiLoading ? '…' : '✦ AI Autofill'}
                  </button>
                </div>
              </div>
            )}
            </Fragment>
          ))}
        </div>
      )}

      {/* Floating mass-edit/delete bar */}
      {selectedIds.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: '#1A1626', border: '1px solid rgba(201,168,76,0.5)', borderRadius: 10, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', flexWrap: 'wrap' as const, maxWidth: '90vw' }}>
          <span style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.08em', whiteSpace: 'nowrap' as const }}>{selectedIds.size} selected</span>
          <select value={massEditTier} onChange={e => setMassEditTier(e.target.value)} style={{ background: '#0D0B14', border: `1px solid ${BDR}`, borderRadius: 4, padding: '5px 8px', color: massEditTier ? TXT : DIM, fontFamily: cinzel, fontSize: 9, outline: 'none' }}>
            <option value=''>Tier...</option>
            {['watchman','soldier','commander','general'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
          <select value={massEditTopic} onChange={e => setMassEditTopic(e.target.value)} style={{ background: '#0D0B14', border: `1px solid ${BDR}`, borderRadius: 4, padding: '5px 8px', color: massEditTopic ? TXT : DIM, fontFamily: cinzel, fontSize: 9, outline: 'none' }}>
            <option value=''>Topic...</option>
            {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button
            onClick={handleMassEdit}
            disabled={massApplying || (!massEditTier && !massEditTopic)}
            style={{ background: (massApplying || (!massEditTier && !massEditTopic)) ? 'rgba(201,168,76,0.2)' : G, color: '#0D0B14', border: 'none', borderRadius: 4, padding: '6px 14px', cursor: (massApplying || (!massEditTier && !massEditTopic)) ? 'not-allowed' : 'pointer', fontFamily: cinzel, fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', whiteSpace: 'nowrap' as const }}
          >{massApplying ? '…' : '⊕ Apply'}</button>
          <button
            onClick={() => setMassDelConfirm(true)}
            disabled={massApplying}
            style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.4)', borderRadius: 4, padding: '6px 14px', cursor: massApplying ? 'not-allowed' : 'pointer', fontFamily: cinzel, fontSize: 9, color: '#f87171', letterSpacing: '0.08em', whiteSpace: 'nowrap' as const }}
          >🗑 Delete</button>
          <button onClick={() => { setSelectedIds(new Set()); setMassEditTier(''); setMassEditTopic('') }} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, padding: '6px 10px', cursor: 'pointer', fontFamily: cinzel, fontSize: 9, color: DIM }}>✕</button>
        </div>
      )}

      {/* Mass delete confirmation modal */}
      {massDelConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#1A1626', border: '1px solid rgba(220,38,38,0.5)', borderRadius: 10, padding: 28, maxWidth: 380, width: '90%', textAlign: 'center' as const }}>
            <div style={{ fontFamily: cinzel, fontSize: 13, color: '#f87171', marginBottom: 10, letterSpacing: '0.1em' }}>DELETE {selectedIds.size} RESOURCE{selectedIds.size !== 1 ? 'S' : ''}?</div>
            <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, marginBottom: 20 }}>This will permanently delete the files and records. This cannot be undone.</div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button onClick={handleMassDelete} disabled={massApplying} style={{ background: 'rgba(220,38,38,0.2)', border: '1px solid rgba(220,38,38,0.5)', borderRadius: 6, padding: '8px 20px', color: '#f87171', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: massApplying ? 'wait' : 'pointer', fontWeight: 700 }}>
                {massApplying ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button onClick={() => setMassDelConfirm(false)} style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 20px', color: DIM, fontFamily: cinzel, fontSize: 10, cursor: 'pointer' }}>Cancel</button>
            </div>
          </div>
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
    'Equivalent Spirits': '',
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
    'Equivalent Spirits': d.equivalentSpirits || '',
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

function SpiritEditForm({ fields, setField, onSave, onCancel, saving, msg, demons = [], getToken }: {
  fields: Record<string, string>
  setField: (name: string, val: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  msg: string
  demons?: any[]
  getToken?: () => Promise<string | null>
}) {
  const [loadingEquivalents, setLoadingEquivalents] = useState(false)
  const [equivalentSuggestions, setEquivalentSuggestions] = useState<any[]>([])
  const [equivalentSummary, setEquivalentSummary] = useState('')
  const [showEquivalentSuggestions, setShowEquivalentSuggestions] = useState(false)
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

  async function lookupEquivalents() {
    if (!getToken) return
    setLoadingEquivalents(true)
    setShowEquivalentSuggestions(false)
    try {
      const token = await getToken()
      const res = await fetch('/api/spirit-equivalents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          spiritName: f(INTEL_NAME_F),
          kingdom: f('Kingdom'),
          description: f('Description'),
          aka: f('Also Known As'),
        }),
      })
      const data = await res.json()
      if (data.equivalents?.length > 0) {
        setEquivalentSuggestions(data.equivalents)
        setEquivalentSummary(data.summary || '')
        setShowEquivalentSuggestions(true)
      } else {
        setEquivalentSuggestions([])
        setEquivalentSummary('No cross-cultural equivalents found with sufficient confidence.')
        setShowEquivalentSuggestions(true)
      }
    } catch (err) {
      console.error('[lookupEquivalents]', err)
    } finally {
      setLoadingEquivalents(false)
    }
  }
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

        {/* Cross-Cultural Equivalents Section */}
        <div style={{ gridColumn: '1 / -1', fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: 8, marginTop: 8, paddingTop: 16, paddingBottom: 6, borderTop: `1px solid ${BDR}`, borderBottom: `1px solid ${BDR}` }}>🌐 Cross-Cultural Equivalents</div>
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <label style={{ ...l, marginBottom: 0 }}>EQUIVALENT SPIRITS</label>
            {getToken && (
              <button
                onClick={lookupEquivalents}
                disabled={loadingEquivalents}
                style={{ background: 'transparent', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 4, padding: '3px 10px', fontSize: 9, color: G, fontFamily: cinzel, cursor: 'pointer', letterSpacing: '0.08em', opacity: loadingEquivalents ? 0.5 : 1 }}>
                {loadingEquivalents ? 'Looking up...' : '✦ AI Lookup'}
              </button>
            )}
          </div>

          {showEquivalentSuggestions && (
            <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 6, padding: 12, marginBottom: 8 }}>
              {equivalentSummary && (
                <div style={{ fontFamily: crimson, fontSize: 12, color: 'rgba(240,232,216,0.7)', fontStyle: 'italic', marginBottom: 10 }}>
                  {equivalentSummary}
                </div>
              )}
              {equivalentSuggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
                  {equivalentSuggestions.map((eq, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 4, padding: '6px 10px' }}>
                      <div>
                        <span style={{ fontFamily: cinzel, fontSize: 11, color: G }}>{eq.name}</span>
                        <span style={{ fontFamily: cinzel, fontSize: 9, color: 'rgba(201,168,76,0.5)', marginLeft: 8 }}>({eq.tradition})</span>
                        {eq.notes && (
                          <div style={{ fontFamily: crimson, fontSize: 11, color: 'rgba(240,232,216,0.5)', fontStyle: 'italic', marginTop: 2 }}>
                            {eq.notes}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <span style={{ fontFamily: cinzel, fontSize: 9, color: 'rgba(201,168,76,0.4)' }}>{eq.confidence}/10</span>
                        <button
                          onClick={() => {
                            const line = eq.tradition ? `${eq.name} (${eq.tradition})` : eq.name
                            setField('Equivalent Spirits', f('Equivalent Spirits').trim() ? `${f('Equivalent Spirits').trim()}\n${line}` : line)
                          }}
                          style={{ background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, padding: '3px 8px', fontSize: 9, color: G, fontFamily: cinzel, cursor: 'pointer', letterSpacing: '0.06em', whiteSpace: 'nowrap' as const }}>
                          + ADD
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={() => {
                  const allLines = equivalentSuggestions.map(eq => eq.tradition ? `${eq.name} (${eq.tradition})` : eq.name).join('\n')
                  setField('Equivalent Spirits', f('Equivalent Spirits').trim() ? `${f('Equivalent Spirits').trim()}\n${allLines}` : allLines)
                  setShowEquivalentSuggestions(false)
                }}
                style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, padding: '5px 12px', fontSize: 9, color: G, fontFamily: cinzel, cursor: 'pointer', letterSpacing: '0.08em', width: '100%' }}>
                + ADD ALL TO FIELD
              </button>
            </div>
          )}

          <textarea value={f('Equivalent Spirits')} onChange={e => setField('Equivalent Spirits', e.target.value)}
            rows={4} placeholder={'One equivalent per line, e.g.:\nAshtoreth (Canaanite)\nVenus (Roman)\nIshtar (Babylonian)'}
            style={{ ...i, resize: 'vertical' as const }} />
          <div style={{ fontSize: 10, color: DIM, fontFamily: crimson, marginTop: 3, fontStyle: 'italic' }}>
            One equivalent per line. Include tradition in parentheses.
          </div>
        </div>
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

// ─── BODY MAP ADMIN ──────────────────────────────────────────────────────────

const BM_REGION_MAP: Record<string, string> = {
  // Head
  'Crown': 'Head', 'Left Temple': 'Head', 'Right Temple': 'Head',
  'Left Eye': 'Head', 'Right Eye': 'Head', 'Mouth / Jaw': 'Head', 'Throat': 'Head',
  'Crown / Back of Head': 'Head', 'Neck / Cervical': 'Head',
  // Torso
  'Heart / Chest': 'Torso', 'Solar Plexus': 'Torso', 'Abdomen': 'Torso',
  // Spine
  'Left Shoulder Blade': 'Spine', 'Right Shoulder Blade': 'Spine',
  'Upper Back / Thoracic': 'Spine', 'Mid Back / Lumbar': 'Spine', 'Lower Back / Sacral': 'Spine',
  // Pelvic
  'Pelvis / Groin': 'Pelvic', 'Pelvis': 'Pelvic', 'Womb / Uterus': 'Pelvic',
  'Left Hip / Glute': 'Pelvic', 'Right Hip / Glute': 'Pelvic',
  // Upper Extremities
  'Left Shoulder': 'Upper Extremities', 'Right Shoulder': 'Upper Extremities',
  'Left Elbow': 'Upper Extremities', 'Right Elbow': 'Upper Extremities',
  'Left Wrist': 'Upper Extremities', 'Right Wrist': 'Upper Extremities',
  'Left Hand': 'Upper Extremities', 'Right Hand': 'Upper Extremities',
  // Lower Extremities
  'Left Thigh': 'Lower Extremities', 'Right Thigh': 'Lower Extremities',
  'Left Knee': 'Lower Extremities', 'Right Knee': 'Lower Extremities',
  'Left Shin': 'Lower Extremities', 'Right Shin': 'Lower Extremities',
  'Left Foot': 'Lower Extremities', 'Right Foot': 'Lower Extremities',
  'Left Hamstring': 'Lower Extremities', 'Right Hamstring': 'Lower Extremities',
  'Left Knee Back': 'Lower Extremities', 'Right Knee Back': 'Lower Extremities',
  'Left Heel / Foot': 'Lower Extremities', 'Right Heel / Foot': 'Lower Extremities',
}

function bmDeriveRegion(name: string): string {
  const n = name.toLowerCase()
  if (n.includes('eye') || n.includes('ear') || n.includes('nose') || n.includes('mouth') ||
      n.includes('jaw') || n.includes('temple') || n.includes('forehead') || n.includes('crown') ||
      n.includes('head') || n.includes('throat') || n.includes('neck') || n.includes('skull') ||
      n.includes('occiput')) return 'Head'
  if (n.includes('spine') || n.includes('shoulder blade') || n.includes('sacrum') ||
      n.includes('lumbar') || n.includes('thoracic') || n.includes('cervical')) return 'Spine'
  if (n.includes('chest') || n.includes('lung') || n.includes('solar') || n.includes('stomach') ||
      n.includes('abdomen') || n.includes('navel') || n.includes('rib') || n.includes('sternum') ||
      n.includes('kidney') || n.includes('breast')) return 'Torso'
  if (n.includes('pelvis') || n.includes('womb') || n.includes('groin') || n.includes('hip') ||
      n.includes('gluteal') || n.includes('reproductive')) return 'Pelvic'
  if (n.includes('shoulder') || n.includes('elbow') || n.includes('forearm') || n.includes('wrist') ||
      n.includes('hand') || n.includes('palm') || n.includes('upper arm')) return 'Upper Extremities'
  if (n.includes('knee') || n.includes('thigh') || n.includes('calf') || n.includes('ankle') ||
      n.includes('foot') || n.includes('feet') || n.includes('shin')) return 'Lower Extremities'
  return ''
}

const BM_SOURCES = [
  '', 'Dake Annotated Bible', 'Win Worley',
  'Frank Hammond - Pigs in the Parlor', 'Derek Prince', 'Rebecca Brown',
  'John Eckhardt', 'Clinical Session Observation', 'Justin Payne - Pastoral Notes',
  'Scripture Reference', 'Custom...',
]

const BM_REGIONS = ['', 'Head', 'Torso', 'Spine', 'Pelvic', 'Upper Extremities', 'Lower Extremities']

const BM_MANIFESTATION_PRESETS = [
  'Burning sensation', 'Pressure', 'Pain', 'Numbness', 'Tingling',
  'Tightness', 'Heaviness', 'Nausea', 'Throbbing', 'Cold sensation',
  'Heat', 'Trembling', 'Weakness', 'Stabbing pain', 'Crawling sensation',
]

type BMManifestation = {
  id: string
  hotspot_id: string
  body_part: string
  region: string
  manifestation: string
  spirit_names: string[]
  notes: string | null
  source: string | null
  created_at: string
}

const BM_HOTSPOT_GROUPS = [
  {
    label: 'Male Front',
    hotspots: [
      { id: 'mf-crown',          label: 'Crown' },
      { id: 'mf-left-temple',    label: 'Left Temple' },
      { id: 'mf-right-temple',   label: 'Right Temple' },
      { id: 'mf-left-eye',       label: 'Left Eye' },
      { id: 'mf-right-eye',      label: 'Right Eye' },
      { id: 'mf-mouth',          label: 'Mouth / Jaw' },
      { id: 'mf-throat',         label: 'Throat' },
      { id: 'mf-heart',          label: 'Heart / Chest' },
      { id: 'mf-left-shoulder',  label: 'Left Shoulder' },
      { id: 'mf-right-shoulder', label: 'Right Shoulder' },
      { id: 'mf-left-elbow',     label: 'Left Elbow' },
      { id: 'mf-right-elbow',    label: 'Right Elbow' },
      { id: 'mf-solar-plexus',   label: 'Solar Plexus' },
      { id: 'mf-abdomen',        label: 'Abdomen' },
      { id: 'mf-left-wrist',     label: 'Left Wrist' },
      { id: 'mf-right-wrist',    label: 'Right Wrist' },
      { id: 'mf-pelvis',         label: 'Pelvis / Groin' },
      { id: 'mf-left-hand',      label: 'Left Hand' },
      { id: 'mf-right-hand',     label: 'Right Hand' },
      { id: 'mf-left-thigh',     label: 'Left Thigh' },
      { id: 'mf-right-thigh',    label: 'Right Thigh' },
      { id: 'mf-left-knee',      label: 'Left Knee' },
      { id: 'mf-right-knee',     label: 'Right Knee' },
      { id: 'mf-left-shin',      label: 'Left Shin' },
      { id: 'mf-right-shin',     label: 'Right Shin' },
      { id: 'mf-left-foot',      label: 'Left Foot' },
      { id: 'mf-right-foot',     label: 'Right Foot' },
    ],
  },
  {
    label: 'Male Back',
    hotspots: [
      { id: 'mb-crown',           label: 'Crown / Back of Head' },
      { id: 'mb-neck',            label: 'Neck / Cervical' },
      { id: 'mb-left-shoulder',   label: 'Left Shoulder Blade' },
      { id: 'mb-right-shoulder',  label: 'Right Shoulder Blade' },
      { id: 'mb-upper-back',      label: 'Upper Back / Thoracic' },
      { id: 'mb-left-elbow',      label: 'Left Elbow' },
      { id: 'mb-right-elbow',     label: 'Right Elbow' },
      { id: 'mb-mid-back',        label: 'Mid Back / Lumbar' },
      { id: 'mb-lower-back',      label: 'Lower Back / Sacral' },
      { id: 'mb-left-hip',        label: 'Left Hip / Glute' },
      { id: 'mb-right-hip',       label: 'Right Hip / Glute' },
      { id: 'mb-left-hamstring',  label: 'Left Hamstring' },
      { id: 'mb-right-hamstring', label: 'Right Hamstring' },
      { id: 'mb-left-knee-back',  label: 'Left Knee Back' },
      { id: 'mb-right-knee-back', label: 'Right Knee Back' },
      { id: 'mb-left-heel',       label: 'Left Heel / Foot' },
      { id: 'mb-right-heel',      label: 'Right Heel / Foot' },
    ],
  },
  {
    label: 'Female Front',
    hotspots: [
      { id: 'ff-crown',          label: 'Crown' },
      { id: 'ff-left-temple',    label: 'Left Temple' },
      { id: 'ff-right-temple',   label: 'Right Temple' },
      { id: 'ff-left-eye',       label: 'Left Eye' },
      { id: 'ff-right-eye',      label: 'Right Eye' },
      { id: 'ff-mouth',          label: 'Mouth / Jaw' },
      { id: 'ff-throat',         label: 'Throat' },
      { id: 'ff-heart',          label: 'Heart / Chest' },
      { id: 'ff-left-shoulder',  label: 'Left Shoulder' },
      { id: 'ff-right-shoulder', label: 'Right Shoulder' },
      { id: 'ff-left-elbow',     label: 'Left Elbow' },
      { id: 'ff-right-elbow',    label: 'Right Elbow' },
      { id: 'ff-solar-plexus',   label: 'Solar Plexus' },
      { id: 'ff-abdomen',        label: 'Abdomen' },
      { id: 'ff-womb',           label: 'Womb / Uterus' },
      { id: 'ff-left-wrist',     label: 'Left Wrist' },
      { id: 'ff-right-wrist',    label: 'Right Wrist' },
      { id: 'ff-pelvis',         label: 'Pelvis' },
      { id: 'ff-left-hand',      label: 'Left Hand' },
      { id: 'ff-right-hand',     label: 'Right Hand' },
      { id: 'ff-left-thigh',     label: 'Left Thigh' },
      { id: 'ff-right-thigh',    label: 'Right Thigh' },
      { id: 'ff-left-knee',      label: 'Left Knee' },
      { id: 'ff-right-knee',     label: 'Right Knee' },
      { id: 'ff-left-shin',      label: 'Left Shin' },
      { id: 'ff-right-shin',     label: 'Right Shin' },
      { id: 'ff-left-foot',      label: 'Left Foot' },
      { id: 'ff-right-foot',     label: 'Right Foot' },
    ],
  },
  {
    label: 'Female Back',
    hotspots: [
      { id: 'fb-crown',           label: 'Crown / Back of Head' },
      { id: 'fb-neck',            label: 'Neck / Cervical' },
      { id: 'fb-left-shoulder',   label: 'Left Shoulder Blade' },
      { id: 'fb-right-shoulder',  label: 'Right Shoulder Blade' },
      { id: 'fb-upper-back',      label: 'Upper Back / Thoracic' },
      { id: 'fb-left-elbow',      label: 'Left Elbow' },
      { id: 'fb-right-elbow',     label: 'Right Elbow' },
      { id: 'fb-mid-back',        label: 'Mid Back / Lumbar' },
      { id: 'fb-lower-back',      label: 'Lower Back / Sacral' },
      { id: 'fb-left-hip',        label: 'Left Hip / Glute' },
      { id: 'fb-right-hip',       label: 'Right Hip / Glute' },
      { id: 'fb-left-hamstring',  label: 'Left Hamstring' },
      { id: 'fb-right-hamstring', label: 'Right Hamstring' },
      { id: 'fb-left-knee-back',  label: 'Left Knee Back' },
      { id: 'fb-right-knee-back', label: 'Right Knee Back' },
      { id: 'fb-left-heel',       label: 'Left Heel / Foot' },
      { id: 'fb-right-heel',      label: 'Right Heel / Foot' },
    ],
  },
]

const BM_HOTSPOT_OPTIONS = BM_HOTSPOT_GROUPS.flatMap(g => g.hotspots)

function BodyMapAdmin({ getToken, isDark = true }: { getToken: () => Promise<string | null>, isDark?: boolean }) {
  const [rows, setRows] = useState<BMManifestation[]>([])
  const [loading, setLoading] = useState(false)
  const [filterHotspot, setFilterHotspot] = useState<string>('all')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const allSpirits = useRef<any[]>([])

  // Form fields
  const [hotspotId, setHotspotId] = useState('mf-crown')
  const [bodyPart, setBodyPart] = useState('')
  const [region, setRegion] = useState('')
  const [manifestation, setManifestation] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedSpirits, setSelectedSpirits] = useState<string[]>([])
  const [spiritInput, setSpiritInput] = useState('')
  const [spiritSuggestions, setSpiritSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [sourceSelect, setSourceSelect] = useState('')
  const [sourceCustom, setSourceCustom] = useState('')
  const [autoFilled, setAutoFilled] = useState(false)
  const [customChip, setCustomChip] = useState('')
  const [aiLoadingManif, setAiLoadingManif] = useState(false)
  const [aiLoadingNotes, setAiLoadingNotes] = useState(false)

  useEffect(() => {
    getToken().then(token => {
      fetch('/api/demons', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { allSpirits.current = (d.demons || []).sort((a: any, b: any) => a.name.localeCompare(b.name)) })
        .catch(() => {})
    })
  }, [])

  function resetForm() {
    setHotspotId('mf-crown')
    setBodyPart('')
    setRegion('')
    setManifestation('')
    setNotes('')
    setSelectedSpirits([])
    setSpiritInput('')
    setSpiritSuggestions([])
    setShowSuggestions(false)
    setSourceSelect('')
    setSourceCustom('')
    setAutoFilled(false)
    setCustomChip('')
  }

  function handleHotspotChange(id: string) {
    setHotspotId(id)
    const hotspot = BM_HOTSPOT_OPTIONS.find(o => o.id === id)
    if (hotspot) {
      setBodyPart(hotspot.label)
      setRegion(BM_REGION_MAP[hotspot.label] || bmDeriveRegion(hotspot.label))
      setAutoFilled(true)
    }
  }

  function handleSpiritInput(val: string) {
    setSpiritInput(val)
    if (!val.trim()) { setShowSuggestions(false); return }
    const q = val.toLowerCase()
    const matches = allSpirits.current
      .map((s: any) => s.name as string)
      .filter(n => n.toLowerCase().includes(q) && !selectedSpirits.includes(n))
      .slice(0, 10)
    setSpiritSuggestions(matches)
    setShowSuggestions(matches.length > 0)
  }

  function selectSpirit(name: string) {
    setSelectedSpirits(prev => [...prev, name])
    setSpiritInput('')
    setShowSuggestions(false)
  }

  function removeSpirit(name: string) {
    setSelectedSpirits(prev => prev.filter(s => s !== name))
  }

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      const qs = filterHotspot !== 'all' ? `?hotspot_id=${filterHotspot}` : ''
      const res = await fetch(`/api/body-map${qs}`, { headers: { Authorization: `Bearer ${token}` } })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setRows(j.manifestations)
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [filterHotspot])

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const token = await getToken()
      const source = sourceSelect === 'Custom...' ? sourceCustom : sourceSelect
      const payload = {
        hotspot_id: hotspotId,
        body_part: bodyPart,
        region,
        manifestation,
        spirit_names: selectedSpirits,
        notes: notes || null,
        source: source || null,
      }
      const isEdit = !!editingId
      const res = await fetch(`/api/body-map${isEdit ? `?id=${editingId}` : ''}`, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      setShowAdd(false)
      setEditingId(null)
      resetForm()
      await load()
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  async function del(id: string) {
    if (!confirm('Delete this manifestation entry?')) return
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/body-map?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      const j = await res.json()
      if (!res.ok) throw new Error(j.error)
      await load()
    } catch (e: any) { setError(e.message) }
  }

  function startEdit(row: BMManifestation) {
    setEditingId(row.id)
    setHotspotId(row.hotspot_id)
    setBodyPart(row.body_part)
    setRegion(row.region)
    setManifestation(row.manifestation)
    setNotes(row.notes || '')
    setSelectedSpirits(row.spirit_names || [])
    setSpiritInput('')
    setSpiritSuggestions([])
    setShowSuggestions(false)
    setAutoFilled(false)
    const presetList = BM_SOURCES.slice(1, -1)
    const src = row.source || ''
    if (!src) { setSourceSelect(''); setSourceCustom('') }
    else if (presetList.includes(src)) { setSourceSelect(src); setSourceCustom('') }
    else { setSourceSelect('Custom...'); setSourceCustom(src) }
    setShowAdd(true)
  }

  const inp: CSSProperties = {
    width: '100%', background: isDark ? '#0D0B14' : '#fff',
    border: `1px solid ${isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.3)'}`,
    borderRadius: 4, padding: '7px 10px', color: isDark ? '#e8ddc8' : '#1a1208',
    fontFamily: crimson, fontSize: 14, boxSizing: 'border-box',
  }
  const lbl: CSSProperties = { fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.1em', display: 'block', marginBottom: 4 }
  const autoBadge = <span style={{ marginLeft: 6, padding: '1px 5px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 3, fontSize: 8, color: G, letterSpacing: '0.05em' }}>auto</span>
  const canSave = manifestation.trim() && bodyPart.trim() && region.trim()

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.08em', marginBottom: 4 }}>BODY MAP MANIFESTATIONS</div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic' }}>
            {rows.length} entr{rows.length !== 1 ? 'ies' : 'y'} - link spirits to body regions
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={filterHotspot} onChange={e => setFilterHotspot(e.target.value)}
            style={{ ...inp, width: 'auto', paddingRight: 28 }}>
            <option value="all">All Hotspots</option>
            {BM_HOTSPOT_GROUPS.map(g => (
              <optgroup key={g.label} label={`— ${g.label} —`}>
                {g.hotspots.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </optgroup>
            ))}
          </select>
          <button onClick={() => { setShowAdd(true); setEditingId(null); resetForm() }}
            style={{ padding: '8px 18px', background: G, border: 'none', borderRadius: 6, color: '#0D0B14', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', fontWeight: 700 }}>
            + ADD ENTRY
          </button>
        </div>
      </div>

      {error && <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 14px', color: '#f87171', fontFamily: crimson, fontSize: 13, marginBottom: 16 }}>{error}</div>}

      {showAdd && (
        <div style={{ background: isDark ? 'rgba(201,168,76,0.04)' : '#fffdf5', border: `1px solid ${isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.2)'}`, borderRadius: 8, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em', marginBottom: 16 }}>{editingId ? 'EDIT ENTRY' : 'NEW ENTRY'}</div>

          {/* Hotspot / Body Part / Region */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={lbl}>HOTSPOT</label>
              <select value={hotspotId} onChange={e => handleHotspotChange(e.target.value)} style={inp}>
                {BM_HOTSPOT_GROUPS.map(g => (
                  <optgroup key={g.label} label={`— ${g.label} —`}>
                    {g.hotspots.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label style={lbl}>BODY PART {autoFilled && autoBadge}</label>
              <input type="text" value={bodyPart} onChange={e => { setBodyPart(e.target.value); setAutoFilled(false) }} style={inp} placeholder="e.g. Crown" />
            </div>
            <div>
              <label style={lbl}>REGION {autoFilled && region && autoBadge}</label>
              <select value={region} onChange={e => { setRegion(e.target.value); setAutoFilled(false) }} style={inp}>
                {BM_REGIONS.map(r => <option key={r} value={r}>{r || '-- select --'}</option>)}
              </select>
            </div>
          </div>

          {/* Spirit Names */}
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>SPIRIT NAMES</label>
            {selectedSpirits.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {selectedSpirits.map(name => (
                  <span key={name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 20, padding: '3px 10px', fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.06em' }}>
                    {name}
                    <button onMouseDown={e => { e.preventDefault(); removeSpirit(name) }}
                      style={{ background: 'none', border: 'none', color: G, cursor: 'pointer', padding: 0, fontSize: 11, lineHeight: 1 }}>x</button>
                  </span>
                ))}
              </div>
            )}
            <div style={{ position: 'relative' }}>
              <input type="text" value={spiritInput}
                onChange={e => handleSpiritInput(e.target.value)}
                onFocus={() => { if (spiritInput.trim() && spiritSuggestions.length > 0) setShowSuggestions(true) }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Type to search verified spirit names..."
                style={inp}
              />
              {showSuggestions && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, background: '#1a1714', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, marginTop: 2, maxHeight: 220, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.5)' }}>
                  {spiritSuggestions.map(name => (
                    <div key={name}
                      onMouseDown={e => { e.preventDefault(); selectSpirit(name) }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(201,168,76,0.1)'; (e.currentTarget as HTMLDivElement).style.color = G }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent'; (e.currentTarget as HTMLDivElement).style.color = DIM }}
                      style={{ padding: '8px 12px', cursor: 'pointer', fontFamily: cinzel, fontSize: 10, color: DIM, letterSpacing: '0.06em' }}>
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Manifestation with presets */}
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>MANIFESTATION</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {BM_MANIFESTATION_PRESETS.map(p => (
                <button key={p}
                  type="button"
                  onMouseDown={e => { e.preventDefault(); setManifestation(prev => prev.trim() ? `${prev.trim()}, ${p}` : p) }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.7)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(201,168,76,0.3)' }}
                  style={{ padding: '3px 8px', background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 4, color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.04em', cursor: 'pointer' }}>
                  {p}
                </button>
              ))}
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                <input
                  type="text"
                  value={customChip}
                  onChange={e => setCustomChip(e.target.value)}
                  onKeyDown={e => {
                    if ((e.key === 'Enter' || e.key === ',') && customChip.trim()) {
                      e.preventDefault()
                      const chip = customChip.trim().replace(/,$/, '')
                      if (chip) setManifestation(prev => prev.trim() ? `${prev.trim()}, ${chip}` : chip)
                      setCustomChip('')
                    }
                  }}
                  placeholder="Custom..."
                  style={{ ...inp, width: 100, padding: '3px 8px', fontSize: 9 }}
                />
                {customChip.trim() && (
                  <button
                    type="button"
                    onMouseDown={e => {
                      e.preventDefault()
                      const chip = customChip.trim()
                      if (chip) setManifestation(prev => prev.trim() ? `${prev.trim()}, ${chip}` : chip)
                      setCustomChip('')
                    }}
                    style={{ padding: '3px 8px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.5)', borderRadius: 4, color: G, fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>
                    + Add
                  </button>
                )}
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <textarea value={manifestation} onChange={e => setManifestation(e.target.value)}
                rows={3} style={{ ...inp, resize: 'vertical', paddingRight: 110 }} placeholder="Describe the physical or emotional manifestation..." />
              <button
                type="button"
                disabled={aiLoadingManif}
                onMouseDown={async e => {
                  e.preventDefault()
                  if (aiLoadingManif) return
                  setAiLoadingManif(true)
                  try {
                    const token = await getToken()
                    const hotspotLabel = BM_HOTSPOT_OPTIONS.find(o => o.id === hotspotId)?.label || hotspotId
                    const spiritContext = selectedSpirits.length > 0 ? `Spirits: ${selectedSpirits.join(', ')}. ` : ''
                    const prompt = `You are a deliverance ministry assistant. Generate a concise list of physical and emotional manifestations for the body location "${hotspotLabel}" (${bodyPart}${region ? `, ${region}` : ''}). ${spiritContext}${manifestation ? `Existing: "${manifestation}". Expand or improve this.` : 'List common manifestations seen in deliverance ministry for this area.'} Return only the manifestations as a comma-separated list, no preamble.`
                    const res = await fetch('/api/ai-assistant', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ message: prompt, history: [] }),
                    })
                    const data = await res.json()
                    if (data.response) setManifestation(data.response.trim())
                  } catch {}
                  setAiLoadingManif(false)
                }}
                style={{ position: 'absolute', top: 6, right: 6, padding: '3px 8px', background: aiLoadingManif ? 'rgba(201,168,76,0.05)' : 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.04em', cursor: aiLoadingManif ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                {aiLoadingManif ? '...' : '✦ AI Complete'}
              </button>
            </div>
          </div>

          {/* Source */}
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>SOURCE</label>
            <select value={sourceSelect} onChange={e => setSourceSelect(e.target.value)} style={inp}>
              {BM_SOURCES.map(s => <option key={s} value={s}>{s || '-- select source --'}</option>)}
            </select>
            {sourceSelect === 'Custom...' && (
              <input type="text" value={sourceCustom} onChange={e => setSourceCustom(e.target.value)}
                placeholder="Enter custom source..." style={{ ...inp, marginTop: 8 }} />
            )}
          </div>

          {/* Notes */}
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>NOTES</label>
            <div style={{ position: 'relative' }}>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                rows={2} style={{ ...inp, resize: 'vertical', paddingRight: 110 }} />
              <button
                type="button"
                disabled={aiLoadingNotes}
                onMouseDown={async e => {
                  e.preventDefault()
                  if (aiLoadingNotes) return
                  setAiLoadingNotes(true)
                  try {
                    const token = await getToken()
                    const hotspotLabel = BM_HOTSPOT_OPTIONS.find(o => o.id === hotspotId)?.label || hotspotId
                    const spiritContext = selectedSpirits.length > 0 ? `Spirits involved: ${selectedSpirits.join(', ')}. ` : ''
                    const manifContext = manifestation ? `Manifestations: "${manifestation}". ` : ''
                    const prompt = `You are a deliverance ministry assistant. Write brief minister notes for the body location "${hotspotLabel}" (${bodyPart}${region ? `, ${region}` : ''}). ${spiritContext}${manifContext}${notes ? `Existing notes: "${notes}". Expand or improve.` : 'Include prayer approach, scriptural basis, and what to watch for during deliverance.'} Be concise and practical. Return only the notes text, no preamble.`
                    const res = await fetch('/api/ai-assistant', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify({ message: prompt, history: [] }),
                    })
                    const data = await res.json()
                    if (data.response) setNotes(data.response.trim())
                  } catch {}
                  setAiLoadingNotes(false)
                }}
                style={{ position: 'absolute', top: 6, right: 6, padding: '3px 8px', background: aiLoadingNotes ? 'rgba(201,168,76,0.05)' : 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 4, color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.04em', cursor: aiLoadingNotes ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>
                {aiLoadingNotes ? '...' : '✦ AI Complete'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={save} disabled={saving || !canSave}
              style={{ padding: '8px 22px', background: saving || !canSave ? DIM : G, border: 'none', borderRadius: 6, color: '#0D0B14', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: saving ? 'wait' : 'pointer', fontWeight: 700 }}>
              {saving ? 'Saving...' : editingId ? 'Update' : 'Add'}
            </button>
            <button onClick={() => { setShowAdd(false); setEditingId(null); resetForm() }}
              style={{ padding: '8px 18px', background: 'transparent', border: `1px solid ${isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.3)'}`, borderRadius: 6, color: DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ fontFamily: cinzel, fontSize: 10, color: DIM, letterSpacing: '0.1em', padding: '40px 0', textAlign: 'center' }}>Loading...</div>
      ) : rows.length === 0 ? (
        <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', padding: '40px 0', textAlign: 'center' }}>No entries yet - add the first one above.</div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: crimson, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.2)'}` }}>
                {['Hotspot', 'Manifestation', 'Spirits', 'Source', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '6px 10px', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM, fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.id} style={{ borderBottom: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)'}` }}>
                  <td style={{ padding: '8px 10px', color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                    {BM_HOTSPOT_OPTIONS.find(o => o.id === row.hotspot_id)?.label ?? row.hotspot_id}
                  </td>
                  <td style={{ padding: '8px 10px', color: isDark ? '#e8ddc8' : '#1a1208', maxWidth: 320, lineHeight: 1.4 }}>{row.manifestation}</td>
                  <td style={{ padding: '8px 10px', maxWidth: 200 }}>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {(row.spirit_names || []).map(s => (
                        <a key={s} href={`/community?section=database&search=${encodeURIComponent(s)}`}
                          style={{ padding: '2px 8px', background: isDark ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.12)', border: `1px solid ${isDark ? 'rgba(201,168,76,0.25)' : 'rgba(139,105,20,0.3)'}`, borderRadius: 4, color: G, fontSize: 11, fontFamily: cinzel, letterSpacing: '0.05em', textDecoration: 'none' }}>
                          {s}
                        </a>
                      ))}
                    </div>
                  </td>
                  <td style={{ padding: '8px 10px', color: DIM, fontSize: 12 }}>{row.source || '--'}</td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                    <button onClick={() => startEdit(row)}
                      style={{ background: 'transparent', border: `1px solid ${isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.25)'}`, borderRadius: 4, color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', padding: '4px 10px', marginRight: 6 }}>
                      Edit
                    </button>
                    <button onClick={() => del(row.id)}
                      style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, color: '#f87171', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', padding: '4px 10px' }}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ─── INTEL ARCHIVE TAB ───────────────────────────────────────────────────────
function IntelArchive({ getToken, isDark = true }: { getToken: () => Promise<string | null>, isDark?: boolean }) {
  const adStatBg  = isDark ? SURF : '#fff'
  const adHeaderBg = isDark ? SURF2 : '#FFFFFF'
  const adStatNum = isDark ? G : '#8B6914'
  const adStatLbl = isDark ? DIM : '#5C5248'
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
  const [intelGenerating, setIntelGenerating] = useState(false)

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
  const [aiUsedLibrary, setAiUsedLibrary]         = useState(false)
  const [aiLibrarySourceCount, setAiLibrarySourceCount] = useState(0)

  // AI Backfill state
  const [backfillRunning, setBackfillRunning]   = useState(false)
  const [backfillProgress, setBackfillProgress] = useState('')
  const [backfillResults, setBackfillResults]   = useState<{ totalUpdated: number; totalSkipped: number; totalFailed: number; complete: boolean } | null>(null)

  // Spirit Line bulk import state
  const [importFile,     setImportFile]     = useState<File | null>(null)
  const [importParsed,   setImportParsed]   = useState<any[] | null>(null)
  const [importProgress, setImportProgress] = useState<{
    running: boolean; created: number; updated: number;
    errors: Array<{ name: string; error: string }>; done: boolean
  } | null>(null)
  const [importError,    setImportError]    = useState<string | null>(null)

  // Selection + batch enrich state
  const [selectedSpirits, setSelectedSpirits]     = useState<Set<string>>(new Set())
  const [selectAll, setSelectAll]                 = useState(false)
  const [needsEnrichFilter, setNeedsEnrichFilter] = useState(false)
  const [enrichProgress, setEnrichProgress]       = useState<{
    current: number; total: number; currentName: string; done: boolean;
    updated: number; failed: number; skipped: number
  } | null>(null)

  // Sub-section navigation
  const [intelTab, setIntelTab] = useState<'database' | 'enrichment' | 'taxonomy' | 'gap-analysis' | 'duplicates' | 'body-map'>('database')

  // Duplicate Finder
  const [dupeGroups, setDupeGroups] = useState<Array<{ key: string; type: 'exact' | 'near' | 'fuzzy'; entries: any[] }>>([])
  const [dupeScanned, setDupeScanned] = useState(false)
  const [dupeResolving, setDupeResolving] = useState<string | null>(null)
  const [dupeLog, setDupeLog] = useState<string[]>([])
  const [mergeTarget, setMergeTarget] = useState<{ groupKey: string; a: any; b: any } | null>(null)
  const [mergeChoices, setMergeChoices] = useState<Record<string, 'a' | 'b'>>({})
  const [merging, setMerging] = useState(false)
  const [mergeMsg, setMergeMsg] = useState('')
  const [dupeSearch, setDupeSearch] = useState('')
  const [searchMergeA, setSearchMergeA] = useState<any | null>(null)
  const [bulkResolving, setBulkResolving] = useState(false)
  const [resolvedPairs, setResolvedPairs] = useState<Set<string>>(new Set())

  function setDecision(key: string, status: 'accepted' | 'skipped' | 'pending') {
    setFieldDecisions(prev => ({ ...prev, [key]: { ...(prev[key] || {}), status, editing: false } }))
  }
  function setEditing(key: string, on: boolean) {
    setFieldDecisions(prev => ({ ...prev, [key]: { ...(prev[key] || {}), editing: on } }))
  }
  function setEditValue(key: string, val: string) {
    setFieldDecisions(prev => ({ ...prev, [key]: { ...(prev[key] || {}), value: val } }))
  }

  useEffect(() => {
    const prefill = localStorage.getItem('wri_add_spirit_prefill')
    if (prefill) {
      localStorage.removeItem('wri_add_spirit_prefill')
      setNewFields(prev => ({ ...prev, [INTEL_NAME_F]: prefill }))
      setShowNew(true)
    }
  }, [])

  async function parseImportFile(file: File): Promise<any[]> {
    const text = await file.text()

    if (file.name.endsWith('.json')) {
      const parsed = JSON.parse(text)
      return Array.isArray(parsed) ? parsed : (parsed.spirits ?? [])
    }

    // Extract const E = [...] array from .mjs scripts
    const match = text.match(/const E\s*=\s*(\[[\s\S]*?\]);?\s*\n\s*(?:async function|\/\/)/)
    if (match) return JSON.parse(match[1])

    // Fallback: find any substantial JSON array in the file
    const arrayMatch = text.match(/\[[\s\S]{100,}\]/)
    if (arrayMatch) return JSON.parse(arrayMatch[0])

    throw new Error('Could not parse spirit data from file')
  }

  async function handleImport() {
    if (!importParsed || importParsed.length === 0) return
    const token = await getToken()
    if (!token) {
      setImportError('Auth token unavailable — try refreshing')
      return
    }
    setImportProgress({ running: true, created: 0, updated: 0, errors: [], done: false })
    try {
      const res = await fetch('/api/spirit-bulk-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ spirits: importParsed }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }))
        setImportError(`Import failed: ${err.error}`)
        setImportProgress(null)
        return
      }
      const data = await res.json()
      setImportProgress({ running: false, created: data.created, updated: data.updated, errors: data.errors ?? [], done: true })
      await fetchDemons()
      setImportFile(null)
      setImportParsed(null)
    } catch (e: any) {
      setImportError(`Import failed: ${e.message}`)
      setImportProgress(null)
    }
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

  function normalizeSpiritName(n: string): string {
    return n.toLowerCase().trim()
      .replace(/^spirit of /i, '').replace(/^spirit /i, '').replace(/ spirit$/i, '')
      .replace(/^the /i, '').trim()
  }
  function editDistance(a: string, b: string): number {
    const m = a.length, n = b.length
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
      Array.from({ length: n + 1 }, (_, j) => i === 0 ? j : j === 0 ? i : 0))
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
    return dp[m][n]
  }
  function nameSimilarity(a: string, b: string): number {
    const mx = Math.max(a.length, b.length)
    return mx === 0 ? 1 : 1 - editDistance(a, b) / mx
  }
  function makePairKey(a: string, b: string): string {
    return [a.toLowerCase().trim(), b.toLowerCase().trim()].sort().join('|||')
  }

  async function recordDupeResolution(nameA: string, nameB: string, resolution: string) {
    const token = await getToken()
    if (!token) return
    await fetch('/api/duplicate-resolutions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ spirit_name_a: nameA, spirit_name_b: nameB, resolution }),
    }).catch(() => {})
    setResolvedPairs(prev => new Set([...prev, makePairKey(nameA, nameB)]))
  }

  function scanDupes(knownResolved?: Set<string>) {
    const result: Array<{ key: string; type: 'exact' | 'near' | 'fuzzy'; entries: any[] }> = []
    const usedIds = new Set<string>()
    // Pass 1: exact
    const exactMap: Record<string, any[]> = {}
    for (const d of demons) {
      const key = (d.name || '').toLowerCase().trim()
      if (!key) continue
      if (!exactMap[key]) exactMap[key] = []
      exactMap[key].push(d)
    }
    for (const [key, entries] of Object.entries(exactMap)) {
      if (entries.length > 1) {
        result.push({ key, type: 'exact', entries })
        entries.forEach(d => usedIds.add(d.airtableId))
      }
    }
    // Pass 2: near (normalized name match)
    const normMap: Record<string, any[]> = {}
    for (const d of demons) {
      if (usedIds.has(d.airtableId)) continue
      const key = normalizeSpiritName(d.name || '')
      if (!key) continue
      if (!normMap[key]) normMap[key] = []
      normMap[key].push(d)
    }
    for (const [key, entries] of Object.entries(normMap)) {
      if (entries.length > 1) {
        const rawNames = [...new Set(entries.map(d => (d.name || '').toLowerCase().trim()))]
        if (rawNames.length > 1) {
          result.push({ key, type: 'near', entries })
          entries.forEach(d => usedIds.add(d.airtableId))
        }
      }
    }
    // Pass 3: fuzzy (similarity >= 0.75)
    const remaining = demons.filter(d => !usedIds.has(d.airtableId))
    const seen = new Set<string>()
    for (let i = 0; i < remaining.length; i++) {
      for (let j = i + 1; j < remaining.length; j++) {
        const na = normalizeSpiritName(remaining[i].name || '')
        const nb = normalizeSpiritName(remaining[j].name || '')
        if (!na || !nb || na === nb) continue
        if (nameSimilarity(na, nb) >= 0.75) {
          const pKey = [remaining[i].airtableId, remaining[j].airtableId].sort().join('|')
          if (!seen.has(pKey)) {
            seen.add(pKey)
            result.push({ key: pKey, type: 'fuzzy', entries: [remaining[i], remaining[j]] })
          }
        }
      }
    }
    // Filter out pairs that have already been resolved
    const resolved = knownResolved || resolvedPairs
    const filtered = result.filter(group => {
      if (resolved.size === 0) return true
      for (let i = 0; i < group.entries.length; i++) {
        for (let j = i + 1; j < group.entries.length; j++) {
          const key = makePairKey(group.entries[i].name || '', group.entries[j].name || '')
          if (!resolved.has(key)) return true
        }
      }
      return false
    })
    setDupeGroups(filtered)
    setDupeScanned(true)
  }

  async function handleDeleteEntry(group: { key: string; entries: any[] }, delIdx: number) {
    const d = group.entries[delIdx]
    setDupeResolving(group.key)
    const token = await getToken()
    try {
      await fetch(`/api/admin-demon?id=${d.airtableId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    } catch {}
    const remaining = group.entries.filter((_, i) => i !== delIdx)
    if (remaining.length < 2) {
      setDupeGroups(prev => prev.filter(g => g.key !== group.key))
    } else {
      setDupeGroups(prev => prev.map(g => g.key === group.key ? { ...g, entries: remaining } : g))
    }
    setDupeLog(prev => [...prev, `Deleted duplicate "${d.name}"`])
    const keeper = group.entries.find((_: any, i: number) => i !== delIdx)
    if (keeper) recordDupeResolution(keeper.name || '', d.name || '', 'deleted')
    setDupeResolving(null)
    fetchDemons()
  }

  const MERGE_FIELDS = [
    { key: 'name', label: 'Name' }, { key: 'aka', label: 'Also Known As' },
    { key: 'kingdom', label: 'Kingdom' }, { key: 'biblicalRank', label: 'Biblical Rank' },
    { key: 'hierarchyCategory', label: 'Category' }, { key: 'description', label: 'Description' },
    { key: 'manifestation', label: 'Manifestations' }, { key: 'entryPoints', label: 'Entry Points' },
    { key: 'legalRights', label: 'Legal Rights' }, { key: 'symptoms', label: 'Symptoms' },
    { key: 'deliveranceSequence', label: 'Deliv. Sequence' },
    { key: 'counterScriptures', label: 'Counter Scriptures' },
    { key: 'prayerPoints', label: 'Prayer Points' },
    { key: 'companionSpirits', label: 'Companions' },
    { key: 'wriNotes', label: 'WRI Notes' }, { key: 'operationalNotes', label: 'Ops Notes' },
    { key: 'sessionIndicators', label: 'Session Indicators' },
    { key: 'primaryBattlefield', label: 'Battlefield' }, { key: 'assignment', label: 'Assignment' },
  ]

  function openMerge(groupKey: string, a: any, b: any) {
    const choices: Record<string, 'a' | 'b'> = {}
    for (const f of MERGE_FIELDS) {
      const va = String(a[f.key] || '').trim()
      const vb = String(b[f.key] || '').trim()
      choices[f.key] = (!va && vb) ? 'b' : 'a'
    }
    setMergeChoices(choices)
    setMergeTarget({ groupKey, a, b })
    setMergeMsg('')
    setSearchMergeA(null)
  }

  async function executeMerge() {
    if (!mergeTarget) return
    setMerging(true); setMergeMsg('')
    const mergedFields: Record<string, any> = {}
    for (const f of MERGE_FIELDS) {
      const val = mergeChoices[f.key] === 'b'
        ? String(mergeTarget.b[f.key] || '').trim()
        : String(mergeTarget.a[f.key] || '').trim()
      if (val) mergedFields[f.key] = val
    }
    try {
      const token = await getToken()
      const res = await fetch('/api/spirit-merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ keepId: mergeTarget.a.airtableId, deleteId: mergeTarget.b.airtableId, mergedFields }),
      })
      const data = await res.json()
      if (res.ok) {
        const key = mergeTarget.groupKey
        setDupeLog(prev => [...prev, `Merged "${mergeTarget.a.name}" + "${mergeTarget.b.name}" — kept A, deleted B`])
        recordDupeResolution(mergeTarget.a.name || '', mergeTarget.b.name || '', 'merged')
        setDupeGroups(prev => prev.filter(g => g.key !== key))
        setMergeTarget(null)
        fetchDemons()
      } else {
        setMergeMsg(`Error: ${data.error}`)
      }
    } catch (e: any) {
      setMergeMsg(`Error: ${e.message}`)
    }
    setMerging(false)
  }

  async function bulkAutoResolve() {
    const exactGroups = dupeGroups.filter(g => g.type === 'exact')
    if (!exactGroups.length) return
    if (!confirm(`Auto-resolve ${exactGroups.length} exact duplicate group(s)? Fields from deleted records will be merged into the kept records.`)) return
    setBulkResolving(true)
    const token = await getToken()
    let resolved = 0
    for (const group of exactGroups) {
      if (group.entries.length < 2) continue
      const richIdx = group.entries.reduce((best, _e, i, arr) => {
        const count = Object.values(arr[i]).filter(v => v && v !== '').length
        const bestCount = Object.values(arr[best]).filter(v => v && v !== '').length
        return count > bestCount ? i : best
      }, 0)
      const keeper = group.entries[richIdx]
      const others = group.entries.filter((_, i) => i !== richIdx)
      for (const other of others) {
        const mf: Record<string, any> = {}
        for (const f of MERGE_FIELDS) {
          const vk = String(keeper[f.key] || '').trim()
          const vo = String(other[f.key] || '').trim()
          if (vk || vo) mf[f.key] = vk || vo
        }
        try {
          await fetch('/api/spirit-merge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ keepId: keeper.airtableId, deleteId: other.airtableId, mergedFields: mf }),
          })
          resolved++
        } catch {}
      }
    }
    setDupeLog(prev => [...prev, `Auto-resolved ${resolved} exact duplicate(s)`])
    setDupeGroups(prev => prev.filter(g => g.type !== 'exact'))
    setBulkResolving(false)
    fetchDemons()
  }

  function exportDuplicateCSV() {
    const rows = ['Type,Name A,ID A,Name B,ID B']
    for (const g of dupeGroups) {
      for (let i = 0; i < g.entries.length - 1; i++) {
        for (let j = i + 1; j < g.entries.length; j++) {
          const a = g.entries[i], b = g.entries[j]
          rows.push(`${g.type},"${(a.name||'').replace(/"/g,'""')}",${a.airtableId},"${(b.name||'').replace(/"/g,'""')}",${b.airtableId}`)
        }
      }
    }
    const url = URL.createObjectURL(new Blob([rows.join('\n')], { type: 'text/csv' }))
    const link = document.createElement('a')
    link.href = url; link.download = 'duplicate-spirits.csv'; link.click()
    URL.revokeObjectURL(url)
  }

  async function handleAIBackfill() {
    setBackfillRunning(true)
    setBackfillResults(null)
    let startFrom    = 0
    let totalUpdated = 0
    let totalSkipped = 0
    let totalFailed  = 0
    try {
      const token = await getToken()
      while (true) {
        setBackfillProgress(`Processing spirits ${startFrom + 1}–${startFrom + 20}...`)
        const res = await fetch('/api/ai-backfill', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ startFrom }),
        })
        if (!res.ok) { setBackfillProgress(`Error: ${res.status}`); break }
        const data = await res.json()
        totalUpdated += data.updated || 0
        totalSkipped += data.skipped || 0
        totalFailed  += data.failed  || 0
        setBackfillProgress(`${data.message}`)
        if (!data.hasMore) break
        startFrom = data.nextStartFrom
        await new Promise(r => setTimeout(r, 500))
      }
      setBackfillResults({ totalUpdated, totalSkipped, totalFailed, complete: true })
      setBackfillProgress('')
    } catch (e: any) {
      setBackfillProgress('Error: ' + e.message)
    } finally {
      setBackfillRunning(false)
    }
  }

  async function handleEnrichSelected() {
    const ids = Array.from(selectedSpirits)
    setEnrichProgress({ current: 0, total: ids.length, currentName: '', done: false, updated: 0, failed: 0, skipped: 0 })

    let updated = 0, failed = 0, skipped = 0

    for (let i = 0; i < ids.length; i++) {
      const spirit = demons.find(s => s.airtableId === ids[i])
      if (!spirit) continue

      setEnrichProgress(p => p ? { ...p, current: i + 1, currentName: spirit.name ?? '' } : p)

      try {
        const token = await getToken()
        const allFields: Record<string, any> = {}

        // Call the enhance endpoint once per field group — mirrors the individual AI button (FIELD_GROUPS × 3 calls)
        // Image URLs are fetched automatically inside ai-spirit-enhance.ts via Wikipedia if available
        for (let gi = 0; gi < FIELD_GROUPS.length; gi++) {
          const group = FIELD_GROUPS[gi]
          try {
            const controller = new AbortController()
            const timer = setTimeout(() => controller.abort(), 25000)

            const res = await fetch('/api/ai-spirit-enhance-background', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
              body: JSON.stringify({ name: spirit.name, existing: spirit, fields: group }),
              signal: controller.signal,
            })
            clearTimeout(timer)

            if (res.ok) {
              const text = await res.text()
              if (!text || text.trim() === '') {
                console.warn(`[batch-enrich] Group ${gi + 1} empty body for: ${spirit.name}`)
                continue
              }
              let d: any
              try { d = JSON.parse(text) } catch {
                console.warn(`[batch-enrich] Group ${gi + 1} non-JSON for: ${spirit.name}`)
                continue
              }
              if (d.fields && Object.keys(d.fields).length > 0) {
                Object.assign(allFields, d.fields)
                console.log(`[batch-enrich] Group ${gi + 1} fields:`, Object.keys(d.fields))
              }
            } else {
              console.warn(`[batch-enrich] Group ${gi + 1} HTTP ${res.status} for: ${spirit.name}`)
            }
          } catch (groupErr: any) {
            if (groupErr.name === 'AbortError') {
              console.warn(`[batch-enrich] Group ${gi + 1} timeout for: ${spirit.name}`)
            } else {
              console.warn(`[batch-enrich] Group ${gi + 1} error for: ${spirit.name}`, groupErr.message)
            }
            // Continue to next group even if this one fails
          }
        }

        if (Object.keys(allFields).length > 0) {
          // Auto-save all returned fields — no review panel in batch mode
          const saveToken = await getToken()
          const saveRes = await fetch('/api/admin-demon', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${saveToken}` },
            body: JSON.stringify({ id: spirit.airtableId, fields: allFields }),
          })
          if (saveRes.ok) updated++
          else failed++
        } else {
          skipped++
        }
      } catch (err: any) {
        console.warn(`[batch-enrich] Error on spirit: ${spirit.name}`, err.message)
        failed++
      }

      setEnrichProgress(p => p ? { ...p, updated, failed, skipped } : p)

      if (i < ids.length - 1) {
        await new Promise(r => setTimeout(r, 3000))
      }
    }

    setEnrichProgress(p => p ? { ...p, done: true } : p)
    await fetchDemons()
    setSelectedSpirits(new Set())
    setSelectAll(false)
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
    .filter(d => !needsEnrichFilter || (
      !d.description         || String(d.description).trim()         === '' ||
      !d.sessionIndicators   || String(d.sessionIndicators).trim()   === '' ||
      !d.etymologyNotes      || String(d.etymologyNotes).trim()      === '' ||
      !d.deliveranceSequence || String(d.deliveranceSequence).trim() === ''
    ))
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
    setAiUsedLibrary(false)
    setAiLibrarySourceCount(0)

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
            if (d.usedLibrary) { setAiUsedLibrary(true); setAiLibrarySourceCount(c => Math.max(c, d.librarySourceCount || 0)) }
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

  async function generateIntelBrief() {
    setIntelGenerating(true); setPostMsg('')
    try {
      const token = await getToken()
      const res = await fetch('/api/generate-content-suggestions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: 'weekly intelligence briefing for deliverance ministers' }),
      })
      const d = await res.json()
      if (res.ok && d.suggestions?.length > 0) {
        const suggestion = d.suggestions.find((s: any) => s.content_type === 'weekly_intel') || d.suggestions[0]
        setPostMsg('AI draft ready below')
        if (suggestion) { setPostTitle(suggestion.title || ''); setPostBody(suggestion.summary || '') }
      } else { setPostMsg(d.error || 'Generation failed') }
    } catch { setPostMsg('Network error') }
    setIntelGenerating(false)
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
      {/* Sub-section nav */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 28, borderBottom: `1px solid ${BDR}`, overflowX: 'auto' as const }}>
        {(['database', 'enrichment', 'taxonomy', 'gap-analysis', 'duplicates', 'body-map'] as const).map(t => {
          const labels: Record<string, string> = { database: 'SPIRIT DATABASE', enrichment: 'ENRICHMENT', taxonomy: 'TAXONOMY', 'gap-analysis': 'GAP ANALYSIS', duplicates: 'DUPLICATE FINDER', 'body-map': 'BODY MAP' }
          return (
            <button key={t} onClick={() => setIntelTab(t)}
              style={{ padding: '10px 18px', background: 'transparent', border: 'none', borderBottom: intelTab === t ? `2px solid ${G}` : '2px solid transparent', color: intelTab === t ? G : DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', flexShrink: 0, marginBottom: -1, whiteSpace: 'nowrap' as const }}>
              {labels[t]}
            </button>
          )
        })}
      </div>

      {/* ── SPIRIT DATABASE ──────────────────────────────────────────────────── */}
      {intelTab === 'database' && (<>
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

      {/* Refresh + AI Backfill + Airtable link */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: backfillProgress || backfillResults ? 12 : 22, flexWrap: 'wrap' as const, gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' as const }}>
          <button onClick={fetchDemons} disabled={dLoading}
            style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', padding: '6px 14px', cursor: dLoading ? 'default' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: dLoading ? 0.5 : 1 }}>
            ↺ Refresh
          </button>
          <button onClick={handleAIBackfill} disabled={backfillRunning}
            style={{ padding: '6px 14px', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: backfillRunning ? 'wait' : 'pointer', opacity: backfillRunning ? 0.7 : 1 }}>
            🧠 {backfillRunning ? 'RUNNING...' : 'SMART ENRICH ALL SPIRITS'}
          </button>
          {!backfillRunning && (
            <span style={{ fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic' }}>
              Fills empty fields and improves low-quality entries (&lt;75% confidence). Processes 20 at a time.
            </span>
          )}
        </div>
        <div style={{ textAlign: 'right' as const }}>
          <a href="https://airtable.com/appVXEj2DLPBTJTtD/tblcP4lgVykzOhLi4" target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: DIM, textDecoration: 'none', opacity: 0.65 }}>
            View raw data in Airtable →
          </a>
        </div>
      </div>
      {backfillProgress && (
        <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.08em', marginBottom: 12 }}>{backfillProgress}</div>
      )}
      {backfillResults?.complete && (
        <div style={{ padding: '16px 20px', marginBottom: 20, background: 'rgba(201,168,76,0.06)', border: '1px solid #3a3020', borderLeft: '3px solid #C9A84C', borderRadius: 6 }}>
          <div style={{ fontFamily: cinzel, fontSize: 12, color: G, marginBottom: 12, letterSpacing: '0.06em' }}>ENRICHMENT COMPLETE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            {[
              { label: 'UPDATED',              value: backfillResults.totalUpdated, color: '#4a7a4a' },
              { label: 'SKIPPED (HIGH QUALITY)', value: backfillResults.totalSkipped, color: '#6b5e45' },
              { label: 'FAILED',               value: backfillResults.totalFailed, color: '#8B3232' },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' as const, padding: 10, background: '#0a0807', borderRadius: 4, border: '1px solid #1e1a0e' }}>
                <div style={{ fontFamily: cinzel, fontSize: 20, color: stat.color }}>{stat.value}</div>
                <div style={{ fontFamily: cinzel, fontSize: 8, color: '#3a3020', letterSpacing: '0.1em', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
          <button onClick={() => setBackfillResults(null)} style={{ marginTop: 12, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', color: DIM, background: 'transparent', border: 'none', cursor: 'pointer' }}>Dismiss</button>
        </div>
      )}

      {/* Batch enrich progress panel */}
      {enrichProgress && (
        <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.12em', marginBottom: 12 }}>
            {enrichProgress.done ? 'ENRICHMENT COMPLETE' : `ENRICHING — ${enrichProgress.current} / ${enrichProgress.total}`}
          </div>
          {!enrichProgress.done && (
            <>
              <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 6, marginBottom: 12 }}>
                <div style={{ width: `${enrichProgress.total ? (enrichProgress.current / enrichProgress.total) * 100 : 0}%`, height: '100%', background: G, borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
              <div style={{ fontFamily: crimson, fontSize: 13, color: '#b8a98a', marginBottom: 8 }}>
                Processing: <strong>{enrichProgress.currentName}</strong>
              </div>
            </>
          )}
          <div style={{ display: 'flex', gap: 20, fontSize: 12, fontFamily: cinzel, letterSpacing: '0.08em' }}>
            <span style={{ color: '#4CAF7D' }}>✓ {enrichProgress.updated} updated</span>
            <span style={{ color: '#b8a98a' }}>↷ {enrichProgress.skipped} skipped</span>
            <span style={{ color: '#D4524A' }}>✗ {enrichProgress.failed} failed</span>
          </div>
          {enrichProgress.done && (
            <button onClick={() => setEnrichProgress(null)}
              style={{ marginTop: 12, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', color: DIM, background: 'transparent', border: 'none', cursor: 'pointer' }}>
              Dismiss
            </button>
          )}
        </div>
      )}

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
        <button
          onClick={() => { setNeedsEnrichFilter(f => !f); setPage(0) }}
          style={{ background: needsEnrichFilter ? 'rgba(201,168,76,0.15)' : 'transparent', border: `1px solid ${needsEnrichFilter ? G : BDR}`, borderRadius: 5, padding: '7px 14px', color: needsEnrichFilter ? G : DIM, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: 'pointer', flexShrink: 0 }}>
          🧠 Needs Enrichment{needsEnrichFilter ? ' ✕' : ''}
        </button>
        {quickFilter !== 'all' && (
          <button onClick={() => setQuickFilter('all')} style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 999, padding: '3px 12px', color: G, fontSize: 11, fontFamily: cinzel, cursor: 'pointer', flexShrink: 0 }}>
            ✕ {quickFilter === 'missing-seq' ? 'Missing Sequence' : quickFilter === 'missing-sc' ? 'Missing Scriptures' : quickFilter === 'missing-notes' ? 'Missing Notes' : 'Recent Additions'}
          </button>
        )}
      </div>

      {/* ── IMPORT SPIRIT LINE FILE ── */}
      <details style={{ marginBottom: 16 }}>
        <summary style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: G, cursor: 'pointer', padding: '8px 0', listStyle: 'none' as const }}>
          ⬆ IMPORT SPIRIT LINE FILE
        </summary>
        <div style={{ background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 8, padding: '16px', marginTop: 8 }}>

          {/* Error banner */}
          {importError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 6, padding: '10px 14px', marginBottom: 12 }}>
              <span style={{ fontFamily: crimson, fontSize: 13, color: 'rgba(248,113,113,0.95)', flex: 1 }}>⚠ {importError}</span>
              <button onClick={() => setImportError(null)} style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.8)', cursor: 'pointer', fontSize: 16, padding: 0, lineHeight: 1 }}>✕</button>
            </div>
          )}

          {/* File picker */}
          {!importParsed && (
            <div>
              <label style={{ display: 'inline-block', cursor: 'pointer', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: G, background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, padding: '8px 18px' }}>
                📂 Choose .mjs or .json file
                <input type="file" accept=".mjs,.json" style={{ display: 'none' }}
                  onChange={async e => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    setImportFile(file)
                    setImportError(null)
                    try {
                      const parsed = await parseImportFile(file)
                      setImportParsed(parsed)
                    } catch (err: any) {
                      setImportError(err.message || 'Parse failed')
                      setImportFile(null)
                    }
                    e.target.value = ''
                  }}
                />
              </label>
              <span style={{ fontFamily: crimson, fontSize: 12, color: DIM, marginLeft: 12 }}>
                Accepts .mjs scripts (const E = [...]) or .json arrays
              </span>
            </div>
          )}

          {/* Preview table */}
          {importParsed && !importProgress && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em' }}>
                  {importParsed.length} SPIRITS FOUND — PREVIEW{importFile ? ` · ${importFile.name}` : ''}
                </div>
                <button onClick={() => { setImportFile(null); setImportParsed(null) }}
                  style={{ background: 'none', border: 'none', color: DIM, cursor: 'pointer', fontSize: 11, fontFamily: cinzel, letterSpacing: '0.06em' }}>
                  ✕ Clear
                </button>
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', marginBottom: 12 }}>
                {importParsed.map((s, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontFamily: crimson, fontSize: 13, color: TXT }}>
                    <span style={{ minWidth: 24, color: 'rgba(201,168,76,0.4)', fontFamily: cinzel, fontSize: 9 }}>{i + 1}</span>
                    <span style={{ flex: 1 }}>{s.name}</span>
                    <span style={{ color: 'rgba(201,168,76,0.5)', fontSize: 11 }}>{s.typeRank || s.rank || ''}</span>
                    <span style={{ color: 'rgba(201,168,76,0.35)', fontSize: 11 }}>{s.hierarchyCategory || ''}</span>
                  </div>
                ))}
              </div>
              <button onClick={handleImport}
                style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', background: G, color: '#0d0b14', border: 'none', borderRadius: 6, padding: '10px 24px', cursor: 'pointer', fontWeight: 700 }}>
                ⬆ IMPORT {importParsed.length} SPIRITS TO AIRTABLE
              </button>
            </div>
          )}

          {/* Progress / results */}
          {importProgress && (
            <div style={{ marginTop: 4 }}>
              {importProgress.running && (
                <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em' }}>⟳ IMPORTING… THIS MAY TAKE A MINUTE</div>
              )}
              {importProgress.done && (
                <div>
                  <div style={{ display: 'flex', gap: 20, marginBottom: 8 }}>
                    <span style={{ color: '#4CAF7D', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em' }}>✓ {importProgress.created} CREATED</span>
                    <span style={{ color: G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em' }}>↷ {importProgress.updated} UPDATED</span>
                    {importProgress.errors.length > 0 && (
                      <span style={{ color: '#D4524A', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em' }}>✗ {importProgress.errors.length} ERRORS</span>
                    )}
                  </div>
                  {importProgress.errors.length > 0 && (
                    <div style={{ background: 'rgba(212,82,74,0.1)', borderRadius: 6, padding: '8px 12px', marginBottom: 8 }}>
                      {importProgress.errors.map((e, i) => (
                        <div key={i} style={{ fontFamily: crimson, fontSize: 12, color: '#D4524A' }}>{e.name}: {e.error}</div>
                      ))}
                    </div>
                  )}
                  <button onClick={() => setImportProgress(null)}
                    style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, padding: '6px 14px', fontFamily: cinzel, fontSize: 9, color: '#b8a98a', cursor: 'pointer', letterSpacing: '0.08em' }}>
                    DISMISS
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </details>

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
            getToken={getToken}
          />
        </div>
      )}

      {/* Spirit table */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, overflow: 'hidden', marginBottom: 32 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: adHeaderBg }}>
                <th style={{ ...thS, cursor: 'default', width: 36, color: isDark ? DIM : '#5C5248' }}>
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={e => {
                      setSelectAll(e.target.checked)
                      setSelectedSpirits(e.target.checked ? new Set(paginated.map((s: any) => s.airtableId)) : new Set())
                    }}
                    style={{ accentColor: G, width: 16, height: 16, cursor: 'pointer' }}
                  />
                </th>
                <th style={{ ...thS, color: isDark ? DIM : '#5C5248' }} onClick={() => handleSort('name')}>Name{sortInd('name')}</th>
                <th style={{ ...thS, color: isDark ? DIM : '#5C5248' }} onClick={() => handleSort('biblicalRank')}>Biblical Rank{sortInd('biblicalRank')}</th>
                <th style={{ ...thS, color: isDark ? DIM : '#5C5248' }} onClick={() => handleSort('hierarchyCategory')}>Category{sortInd('hierarchyCategory')}</th>
                <th style={{ ...thS, cursor: 'default', color: isDark ? DIM : '#5C5248' }}>Del. Sequence</th>
                <th style={{ ...thS, cursor: 'default', color: isDark ? DIM : '#5C5248' }}>Counter Scriptures</th>
                <th style={{ ...thS, cursor: 'default', width: 70, color: isDark ? DIM : '#5C5248' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {dLoading ? (
                <tr><td colSpan={7} style={{ ...tdS, textAlign: 'center', color: DIM, padding: 32, fontStyle: 'italic' }}>Loading spirits...</td></tr>
              ) : paginated.length === 0 ? (
                <tr><td colSpan={7} style={{ ...tdS, textAlign: 'center', color: DIM, padding: 32, fontStyle: 'italic' }}>{quickFilter !== 'all' ? 'No spirits found with this filter. Try clearing the filter.' : 'No spirits found.'}</td></tr>
              ) : paginated.map((d: any) => (
                <Fragment key={d.airtableId || d.id}>
                  <tr style={{ background: editingId === d.airtableId ? 'rgba(201,168,76,0.05)' : 'transparent', transition: 'background 0.15s' }}>
                    <td style={{ ...tdS, width: 36 }}>
                      <input
                        type="checkbox"
                        checked={selectedSpirits.has(d.airtableId)}
                        onChange={e => {
                          setSelectedSpirits(prev => {
                            const next = new Set(prev)
                            e.target.checked ? next.add(d.airtableId) : next.delete(d.airtableId)
                            return next
                          })
                        }}
                        style={{ accentColor: G, width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                      />
                    </td>
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
                      <td colSpan={7} style={{ padding: '4px 12px 16px' }}>
                        <SpiritEditForm
                          fields={editFields}
                          setField={(name, val) => setEditFields(prev => ({ ...prev, [name]: val }))}
                          onSave={saveEdit}
                          onCancel={() => { setEditingId(null); setEditMsg('') }}
                          saving={editSaving}
                          msg={editMsg}
                          demons={demons}
                          getToken={getToken}
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

      {/* Floating selection action bar */}
      {selectedSpirits.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1a1508', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16, zIndex: 200, boxShadow: '0 4px 24px rgba(0,0,0,0.6)' }}>
          <span style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.1em' }}>
            {selectedSpirits.size} SELECTED
          </span>
          <button onClick={handleEnrichSelected}
            disabled={!!enrichProgress && !enrichProgress.done}
            style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', background: G, color: '#0d0b14', border: 'none', borderRadius: 6, padding: '8px 18px', cursor: 'pointer', opacity: (enrichProgress && !enrichProgress.done) ? 0.5 : 1 }}>
            🧠 ENRICH SELECTED ({selectedSpirits.size})
          </button>
          <button onClick={() => { setSelectedSpirits(new Set()); setSelectAll(false) }}
            style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 6, padding: '8px 14px', cursor: 'pointer', fontFamily: cinzel, fontSize: 10, color: '#b8a98a', letterSpacing: '0.08em' }}>
            CLEAR
          </button>
        </div>
      )}

      {/* Post Briefing form */}
      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: 24, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, gap: 10, flexWrap: 'wrap' as const }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: G }}>
            {editingPostId ? '✏ Edit Briefing' : '📡 Post Briefing'}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {!editingPostId && (
              <button onClick={generateIntelBrief} disabled={intelGenerating}
                style={{ padding: '5px 14px', background: intelGenerating ? 'transparent' : 'rgba(201,168,76,0.1)', border: `1px solid ${intelGenerating ? BDR : G}`, borderRadius: 5, color: intelGenerating ? DIM : G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: intelGenerating ? 'wait' : 'pointer', opacity: intelGenerating ? 0.6 : 1 }}>
                {intelGenerating ? 'GENERATING...' : '⚡ GENERATE INTEL BRIEF'}
              </button>
            )}
            {editingPostId && (
              <button onClick={() => { setEditingPostId(null); setPostTitle(''); setPostBody(''); setPostSc(''); setPostType('briefing'); setPostMsg('') }}
                style={{ background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 5, color: DIM, fontFamily: cinzel, fontSize: 9, padding: '3px 10px', cursor: 'pointer' }}>
                ✕ Cancel Edit
              </button>
            )}
          </div>
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
      </>)}

      {/* ── ENRICHMENT ───────────────────────────────────────────────────────── */}
      {intelTab === 'enrichment' && <EnrichmentSuggestions getToken={getToken} isDark={isDark} />}

      {/* ── TAXONOMY ─────────────────────────────────────────────────────────── */}
      {intelTab === 'taxonomy' && <TaxonomyReview getToken={getToken} isDark={isDark} />}

      {/* ── GAP ANALYSIS ─────────────────────────────────────────────────────── */}
      {intelTab === 'gap-analysis' && <LibraryIntelligence getToken={getToken} isDark={isDark} />}

      {/* ── DUPLICATE FINDER ─────────────────────────────────────────────────── */}
      {intelTab === 'duplicates' && (
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.08em', marginBottom: 6 }}>DUPLICATE FINDER</div>
          <div style={{ fontFamily: crimson, fontSize: 14, color: DIM, fontStyle: 'italic', marginBottom: 20, lineHeight: 1.6 }}>
            Finds exact, near, and fuzzy-matched duplicate spirits. Merge any pair with full field-level control.
          </div>

          {dLoading ? (
            <div style={{ fontFamily: cinzel, fontSize: 10, color: DIM, letterSpacing: '0.1em' }}>Loading spirit database...</div>
          ) : mergeTarget ? (

            /* ── MERGE PANEL ──────────────────────────────────────────────────── */
            <div>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 16 }}>
                <div>
                  <div style={{ fontFamily: cinzel, fontSize: 12, color: G, letterSpacing: '0.1em' }}>
                    MERGE: {mergeTarget.a.name} ↔ {mergeTarget.b.name}
                  </div>
                  <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, marginTop: 4 }}>
                    A: {mergeTarget.a.airtableId} · {mergeTarget.a.createdTime ? new Date(mergeTarget.a.createdTime).toLocaleDateString() : '—'}
                    &nbsp;&nbsp;|&nbsp;&nbsp;
                    B: {mergeTarget.b.airtableId} · {mergeTarget.b.createdTime ? new Date(mergeTarget.b.createdTime).toLocaleDateString() : '—'}
                  </div>
                </div>
                <button onClick={() => setMergeTarget(null)}
                  style={{ padding: '6px 16px', background: 'none', border: `1px solid ${BDR}`, borderRadius: 4, color: DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', flexShrink: 0 }}>
                  CANCEL MERGE
                </button>
              </div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 8, padding: '8px 12px', background: SURF2, borderBottom: `1px solid ${BDR}`, marginBottom: 2 }}>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.08em' }}>FIELD</div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: '#4ade80', letterSpacing: '0.08em' }}>RECORD A — KEEP</div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: '#f87171', letterSpacing: '0.08em' }}>RECORD B — DELETE</div>
              </div>

              {/* Field rows */}
              <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 4, overflow: 'hidden', marginBottom: 20 }}>
                {MERGE_FIELDS.map(f => {
                  const va = String(mergeTarget.a[f.key] || '').trim()
                  const vb = String(mergeTarget.b[f.key] || '').trim()
                  if (!va && !vb) return null
                  const isConflict = !!va && !!vb && va !== vb
                  const isIdentical = va === vb && !!va
                  const choice = mergeChoices[f.key] || 'a'
                  const trunc = (s: string) => s.length > 110 ? s.slice(0, 110) + '…' : s
                  return (
                    <div key={f.key} style={{
                      display: 'grid', gridTemplateColumns: '140px 1fr 1fr', gap: 8,
                      padding: '8px 12px', borderBottom: `1px solid ${BDR}`,
                      background: isConflict ? 'rgba(201,168,76,0.04)' : 'transparent',
                      borderLeft: isConflict ? `2px solid ${G}` : '2px solid transparent',
                    }}>
                      <div style={{ fontFamily: cinzel, fontSize: 8, color: isConflict ? G : DIM, letterSpacing: '0.06em', paddingTop: 3, lineHeight: 1.5 }}>
                        {f.label}
                        {isConflict && <span style={{ display: 'block', color: G, marginTop: 1, fontSize: 7 }}>⚠ CHOOSE</span>}
                        {isIdentical && <span style={{ display: 'block', color: '#4ade80', marginTop: 1, fontSize: 7 }}>✓ SAME</span>}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 6, cursor: isIdentical ? 'default' : 'pointer', opacity: !va ? 0.4 : 1 }}>
                        <input type="radio" name={`m-${f.key}`}
                          checked={choice === 'a'}
                          onChange={() => { if (!isIdentical) setMergeChoices(p => ({ ...p, [f.key]: 'a' })) }}
                          style={{ marginTop: 3, flexShrink: 0, accentColor: G }} />
                        <span style={{ fontFamily: crimson, fontSize: 13, color: va ? TXT : DIM, fontStyle: va ? 'normal' : 'italic' as const, lineHeight: 1.4 }}>
                          {va ? trunc(va) : '(empty)'}
                        </span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'flex-start', gap: 6, cursor: isIdentical ? 'default' : 'pointer', opacity: !vb ? 0.4 : 1 }}>
                        <input type="radio" name={`m-${f.key}`}
                          checked={choice === 'b'}
                          onChange={() => { if (!isIdentical) setMergeChoices(p => ({ ...p, [f.key]: 'b' })) }}
                          style={{ marginTop: 3, flexShrink: 0, accentColor: G }} />
                        <span style={{ fontFamily: crimson, fontSize: 13, color: vb ? TXT : DIM, fontStyle: vb ? 'normal' : 'italic' as const, lineHeight: 1.4 }}>
                          {vb ? trunc(vb) : '(empty)'}
                        </span>
                      </label>
                    </div>
                  )
                })}
              </div>

              {/* Merge preview */}
              {(() => {
                const previewFields = MERGE_FIELDS.filter(f => {
                  const va = String(mergeTarget.a[f.key] || '').trim()
                  const vb = String(mergeTarget.b[f.key] || '').trim()
                  return !!(mergeChoices[f.key] === 'b' ? vb : va)
                })
                if (previewFields.length === 0) return null
                return (
                  <div style={{ marginBottom: 20, padding: '14px 16px', background: 'rgba(201,168,76,0.04)', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 6 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.12em', marginBottom: 10 }}>MERGED RECORD PREVIEW</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '6px 20px' }}>
                      {previewFields.slice(0, 6).map(f => {
                        const val = mergeChoices[f.key] === 'b'
                          ? String(mergeTarget.b[f.key] || '').trim()
                          : String(mergeTarget.a[f.key] || '').trim()
                        return (
                          <div key={f.key} style={{ minWidth: 160 }}>
                            <span style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.06em' }}>{f.label}: </span>
                            <span style={{ fontFamily: crimson, fontSize: 13, color: TXT }}>{val.length > 60 ? val.slice(0, 60) + '…' : val}</span>
                          </div>
                        )
                      })}
                      {previewFields.length > 6 && (
                        <div style={{ fontFamily: cinzel, fontSize: 8, color: DIM }}>+{previewFields.length - 6} more fields</div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {mergeMsg && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: mergeMsg.startsWith('Error') ? 'rgba(239,68,68,0.08)' : 'rgba(74,222,128,0.06)', border: `1px solid ${mergeMsg.startsWith('Error') ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.2)'}`, borderRadius: 4, fontFamily: crimson, fontSize: 13, color: mergeMsg.startsWith('Error') ? '#f87171' : '#80e090' }}>
                  {mergeMsg}
                </div>
              )}

              <button onClick={executeMerge} disabled={merging}
                style={{ padding: '10px 28px', background: G, border: 'none', borderRadius: 6, color: BG, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: merging ? 'default' : 'pointer', opacity: merging ? 0.6 : 1, fontWeight: 700 }}>
                {merging ? 'MERGING...' : '⚔ EXECUTE MERGE — KEEP A, DELETE B'}
              </button>
              <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic', marginTop: 8 }}>
                Record A will be updated with chosen fields. Record B will be permanently deleted.
              </div>
            </div>

          ) : (

            /* ── MAIN VIEW ────────────────────────────────────────────────────── */
            <>
              {/* Action bar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' as const }}>
                <button onClick={async () => {
                    const token = await getToken()
                    let pairs = resolvedPairs
                    if (token) {
                      const res = await fetch('/api/duplicate-resolutions', { headers: { Authorization: `Bearer ${token}` } }).catch(() => null)
                      if (res?.ok) {
                        const data = await res.json().catch(() => ({}))
                        pairs = new Set<string>((data.resolutions || []).map((r: any) => makePairKey(r.spirit_name_a, r.spirit_name_b)))
                        setResolvedPairs(pairs)
                      }
                    }
                    scanDupes(pairs)
                  }}
                  style={{ padding: '8px 20px', background: G, border: 'none', borderRadius: 6, color: BG, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', fontWeight: 700 }}>
                  🔍 Scan {demons.length} Spirits
                </button>
                {dupeScanned && dupeGroups.filter(g => g.type === 'exact').length > 0 && (
                  <button onClick={bulkAutoResolve} disabled={bulkResolving}
                    style={{ padding: '8px 16px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${G}`, borderRadius: 6, color: G, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: bulkResolving ? 'default' : 'pointer', opacity: bulkResolving ? 0.6 : 1 }}>
                    {bulkResolving ? 'RESOLVING...' : `⚡ AUTO-RESOLVE ${dupeGroups.filter(g => g.type === 'exact').length} EXACT`}
                  </button>
                )}
                {dupeScanned && dupeGroups.length > 0 && (
                  <button onClick={exportDuplicateCSV}
                    style={{ padding: '8px 16px', background: 'none', border: `1px solid ${BDR}`, borderRadius: 6, color: DIM, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
                    📥 EXPORT CSV
                  </button>
                )}
                {dupeScanned && (
                  <span style={{ fontFamily: cinzel, fontSize: 10, color: dupeGroups.length === 0 ? '#4ade80' : G, letterSpacing: '0.08em' }}>
                    {dupeGroups.length === 0 ? '✓ No duplicates found'
                      : `${dupeGroups.filter(g => g.type === 'exact').length} exact · ${dupeGroups.filter(g => g.type === 'near').length} near · ${dupeGroups.filter(g => g.type === 'fuzzy').length} fuzzy`}
                  </span>
                )}
              </div>

              {/* Similar name search */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.1em', marginBottom: 8 }}>SEARCH SIMILAR NAMES</div>
                <input
                  value={dupeSearch} onChange={e => { setDupeSearch(e.target.value); setSearchMergeA(null) }}
                  placeholder="Type a spirit name to find similar entries..."
                  style={{ width: '100%', maxWidth: 420, boxSizing: 'border-box' as const, background: SURF2, border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 12px', color: TXT, fontFamily: crimson, fontSize: 14, outline: 'none' }}
                />
                {dupeSearch.trim().length >= 2 && (() => {
                  const q = normalizeSpiritName(dupeSearch.trim())
                  const results = demons
                    .filter(d => {
                      const dn = normalizeSpiritName(d.name || '')
                      return dn.includes(q) || q.includes(dn) || nameSimilarity(q, dn) >= 0.55
                    })
                    .sort((a, b) => nameSimilarity(q, normalizeSpiritName(b.name || '')) - nameSimilarity(q, normalizeSpiritName(a.name || '')))
                    .slice(0, 10)
                  if (results.length < 2) return <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, fontStyle: 'italic', marginTop: 6 }}>No similar spirits found.</div>
                  return (
                    <div style={{ marginTop: 8, background: SURF, border: `1px solid ${BDR}`, borderRadius: 6, overflow: 'hidden' }}>
                      {searchMergeA && (
                        <div style={{ padding: '8px 12px', background: 'rgba(201,168,76,0.08)', borderBottom: `1px solid ${BDR}`, fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.08em' }}>
                          A SELECTED: {searchMergeA.name} — now click another spirit to open merge panel
                        </div>
                      )}
                      {results.map((d, i) => {
                        const isSelA = searchMergeA?.airtableId === d.airtableId
                        return (
                          <div key={d.airtableId} style={{ padding: '9px 12px', borderBottom: i < results.length - 1 ? `1px solid ${BDR}` : 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: isSelA ? 'rgba(201,168,76,0.06)' : 'transparent' }}>
                            <div>
                              <span style={{ fontFamily: crimson, fontSize: 14, color: TXT }}>{d.name}</span>
                              {d.biblicalRank && <span style={{ fontFamily: cinzel, fontSize: 8, color: DIM, marginLeft: 8, border: `1px solid ${BDR}`, borderRadius: 3, padding: '1px 6px', letterSpacing: '0.05em' }}>{d.biblicalRank}</span>}
                            </div>
                            {isSelA ? (
                              <button onClick={() => setSearchMergeA(null)}
                                style={{ padding: '4px 10px', background: 'none', border: `1px solid ${BDR}`, borderRadius: 3, color: DIM, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.05em', cursor: 'pointer' }}>
                                DESELECT
                              </button>
                            ) : searchMergeA ? (
                              <button onClick={() => openMerge(`search-${searchMergeA.airtableId}-${d.airtableId}`, searchMergeA, d)}
                                style={{ padding: '4px 12px', background: G, border: 'none', borderRadius: 3, color: BG, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', cursor: 'pointer', fontWeight: 700 }}>
                                ⚔ MERGE WITH A
                              </button>
                            ) : (
                              <button onClick={() => setSearchMergeA(d)}
                                style={{ padding: '4px 10px', background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 3, color: G, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.05em', cursor: 'pointer' }}>
                                SELECT AS A
                              </button>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>

              {/* Resolved log */}
              {dupeLog.length > 0 && (
                <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: '#4ade80', letterSpacing: '0.1em', marginBottom: 8 }}>
                    RESOLVED — {dupeLog.length} ACTION{dupeLog.length !== 1 ? 'S' : ''}
                  </div>
                  {dupeLog.map((entry, i) => (
                    <div key={i} style={{ fontFamily: crimson, fontSize: 13, color: '#80e090', marginBottom: 2 }}>✓ {entry}</div>
                  ))}
                </div>
              )}

              {/* Group sections — exact / near / fuzzy */}
              {(['exact', 'near', 'fuzzy'] as const).map(type => {
                const groups = dupeGroups.filter(g => g.type === type)
                if (!groups.length) return null
                const LABELS = { exact: 'CONFIRMED DUPLICATES', near: 'LIKELY DUPLICATES', fuzzy: 'POSSIBLE DUPLICATES — REVIEW' }
                const DESCS  = { exact: 'Same name (case-insensitive)', near: 'Same after removing "Spirit of / Spirit / The" prefix/suffix', fuzzy: 'Names are 75%+ similar by character similarity' }
                const COLORS = { exact: '#f87171', near: G, fuzzy: '#94a3b8' }
                return (
                  <div key={type} style={{ marginBottom: 28 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 10, color: COLORS[type], letterSpacing: '0.1em' }}>{LABELS[type]}</div>
                      <div style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.06em' }}>{groups.length} GROUP{groups.length !== 1 ? 'S' : ''}</div>
                    </div>
                    <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, fontStyle: 'italic', marginBottom: 12 }}>{DESCS[type]}</div>
                    {groups.map(group => (
                      <div key={group.key} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, marginBottom: 12, overflow: 'hidden', opacity: dupeResolving === group.key ? 0.5 : 1 }}>
                        <div style={{ padding: '8px 14px', background: 'rgba(201,168,76,0.04)', borderBottom: `1px solid ${BDR}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontFamily: cinzel, fontSize: 10, color: COLORS[type], letterSpacing: '0.08em' }}>
                              {group.entries.map(e => e.name).join(' / ')}
                            </span>
                            <span style={{ fontFamily: cinzel, fontSize: 8, color: DIM }}>{group.entries.length} ENTRIES</span>
                            {dupeResolving === group.key && <span style={{ fontFamily: cinzel, fontSize: 8, color: G }}>RESOLVING...</span>}
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {group.entries.length === 2 && (
                              <button onClick={() => openMerge(group.key, group.entries[0], group.entries[1])}
                                style={{ padding: '5px 14px', background: G, border: 'none', borderRadius: 4, color: BG, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', fontWeight: 700 }}>
                                ⚔ MERGE
                              </button>
                            )}
                            <button
                              onClick={async () => {
                                setDupeResolving(group.key)
                                const names = group.entries.map((e: any) => e.name || '')
                                for (let i = 0; i < names.length; i++) {
                                  for (let j = i + 1; j < names.length; j++) {
                                    await recordDupeResolution(names[i], names[j], 'not_duplicate')
                                  }
                                }
                                setDupeGroups(prev => prev.filter(g => g.key !== group.key))
                                setDupeLog(prev => [...prev, `Skipped "${group.entries.map((e: any) => e.name).join(' / ')}" — marked not a duplicate`])
                                setDupeResolving(null)
                              }}
                              disabled={!!dupeResolving}
                              style={{ padding: '5px 12px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 4, color: DIM, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', cursor: dupeResolving ? 'default' : 'pointer' }}>
                              Skip
                            </button>
                          </div>
                        </div>
                        {group.entries.map((d, idx) => (
                          <div key={d.airtableId || idx} style={{ padding: '10px 14px', borderBottom: idx < group.entries.length - 1 ? `1px solid ${BDR}` : 'none', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontFamily: crimson, fontSize: 14, color: TXT, marginBottom: 3 }}>{d.name}</div>
                              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' as const, marginBottom: 4 }}>
                                {d.biblicalRank && <span style={{ fontFamily: cinzel, fontSize: 8, color: DIM, border: `1px solid ${BDR}`, borderRadius: 3, padding: '2px 7px', letterSpacing: '0.06em' }}>{d.biblicalRank}</span>}
                                {d.kingdom && <span style={{ fontFamily: cinzel, fontSize: 8, color: DIM, border: `1px solid ${BDR}`, borderRadius: 3, padding: '2px 7px', letterSpacing: '0.06em' }}>{d.kingdom}</span>}
                              </div>
                              <div style={{ fontFamily: cinzel, fontSize: 8, color: 'rgba(201,168,76,0.3)', letterSpacing: '0.06em' }}>
                                {d.createdTime ? new Date(d.createdTime).toLocaleDateString() : 'No date'} · {d.airtableId}
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 5, flexShrink: 0 }}>
                              {group.entries.length > 2 && group.entries.filter((_, j) => j !== idx).map((other, oj) => (
                                <button key={oj} onClick={() => openMerge(group.key, d, other)}
                                  style={{ padding: '4px 10px', background: 'rgba(201,168,76,0.08)', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 3, color: G, fontFamily: cinzel, fontSize: 7, letterSpacing: '0.05em', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                                  MERGE ↔ {other.name.slice(0, 18)}{other.name.length > 18 ? '…' : ''}
                                </button>
                              ))}
                              <button onClick={() => handleDeleteEntry(group, idx)} disabled={!!dupeResolving}
                                style={{ padding: '4px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 3, color: '#f87171', fontFamily: cinzel, fontSize: 7, letterSpacing: '0.05em', cursor: dupeResolving ? 'default' : 'pointer', whiteSpace: 'nowrap' as const }}>
                                DELETE THIS
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ── BODY MAP ─────────────────────────────────────────────────────────── */}
      {intelTab === 'body-map' && <BodyMapAdmin getToken={getToken} isDark={isDark} />}

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
                  {aiUsedLibrary && (
                    <div style={{ marginTop: 10, fontFamily: cinzel, fontSize: 9, color: '#4a3f2f', letterSpacing: '0.1em' }}>
                      ✦ ENHANCED WITH {aiLibrarySourceCount} PASSAGE{aiLibrarySourceCount !== 1 ? 'S' : ''} FROM YOUR MINISTRY LIBRARY
                    </div>
                  )}
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
  const BG2  = isDark ? '#0D0B14' : '#FAF8F5'
  const SURF3 = isDark ? '#1a1714' : '#FFFFFF'
  const BDR2  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)'
  const TXT2  = isDark ? '#f0e8d8' : '#2D2924'
  const MUT   = isDark ? '#9a8c74' : '#5C5248'
  const GG    = isDark ? '#C9A84C' : '#8B6914'
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
  const [evtRecordingUrl, setEvtRecordingUrl] = useState('')
  const [evtRecurring, setEvtRecurring]       = useState(false)
  const [evtRecurrenceType, setEvtRecurrenceType] = useState('weekly')
  const [evtThumbnail, setEvtThumbnail]       = useState('')
  const [evtRelatedSpirits, setEvtRelatedSpirits] = useState('')
  const [evtAttachments, setEvtAttachments]   = useState<Array<{label: string; url: string}>>([])
  const [evtAttachLabel, setEvtAttachLabel]   = useState('')
  const [evtAttachUrl, setEvtAttachUrl]       = useState('')

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
      setEvtRecordingUrl(evt.recording_url || '')
      setEvtRecurring(!!evt.recurrence_type)
      setEvtRecurrenceType(evt.recurrence_type || 'weekly')
      setEvtThumbnail(evt.thumbnail_url || '')
      setEvtRelatedSpirits((evt.related_spirits || []).join(', '))
      setEvtAttachments(evt.attachments || [])
    } else {
      setEditingEvt(null)
      setEvtTitle(''); setEvtDesc(''); setEvtDate(''); setEvtDuration('60')
      setEvtType('live_training'); setEvtZoom(''); setEvtZoomTier('free')
      setEvtPublished(false); setEvtMaxAtt('')
      setEvtRecordingUrl(''); setEvtRecurring(false); setEvtRecurrenceType('weekly')
      setEvtThumbnail(''); setEvtRelatedSpirits(''); setEvtAttachments([])
      setEvtAttachLabel(''); setEvtAttachUrl('')
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
      recording_url: evtRecordingUrl.trim() || null,
      recurrence_type: evtRecurring ? evtRecurrenceType : null,
      thumbnail_url: evtThumbnail.trim() || null,
      related_spirits: evtRelatedSpirits.split(',').map((s: string) => s.trim()).filter(Boolean),
      attachments: evtAttachments,
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

  const [thumbnailUploading, setThumbnailUploading] = useState(false)

  const [eTitle, setETitle]       = useState('')
  const [eDesc, setEDesc]         = useState('')
  const [eYoutube, setEYoutube]   = useState('')
  const [eThumbnail, setEThumbnail] = useState('')
  const [eNotes, setENotes]       = useState('')
  const [eStatus, setEStatus]     = useState('draft')
  const [eSortOrder, setESortOrder] = useState(0)
  const [eAttachments, setEAttachments] = useState<any[]>([])
  const [attUploading, setAttUploading] = useState(false)
  const [attError, setAttError]         = useState<string | null>(null)
  const attFileRef = useRef<HTMLInputElement>(null)

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
    setAttError(null)
    if (episode) {
      setEditingEpisode(episode); setETitle(episode.title); setEDesc(episode.description || '')
      setEYoutube(episode.youtube_url || ''); setEThumbnail(episode.thumbnail_url || '')
      setENotes(episode.notes || ''); setEStatus(episode.status); setESortOrder(episode.sort_order || 0)
      loadEpisodeAttachments(episode.id)
    } else {
      setEditingEpisode(null); setETitle(''); setEDesc(''); setEYoutube(''); setEThumbnail('')
      setENotes(''); setEStatus('draft'); setESortOrder(episodes.length); setEAttachments([])
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
    const body = { courseId: selectedCourse.id, title: eTitle, description: eDesc, youtubeUrl: eYoutube, thumbnailUrl: eThumbnail.trim() || null, notes: eNotes, status: eStatus, sortOrder: eSortOrder }
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

  async function uploadThumbnail(file: File) {
    setThumbnailUploading(true)
    const token = await getToken()
    const fd = new FormData()
    fd.append('file', file)
    fd.append('type', 'thumbnail')
    if (editingCourse) fd.append('courseId', editingCourse.id)
    const res = await fetch('/api/admin-episode-upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
    if (res.ok) { const d = await res.json(); setCThumbnail(d.url) }
    setThumbnailUploading(false)
  }

  async function loadEpisodeAttachments(episodeId: string) {
    const token = await getToken()
    const res = await fetch(`/api/admin-episodes?id=${episodeId}&action=attachments`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setEAttachments(d.attachments || []) }
  }

  async function uploadAttachment(file: File) {
    if (!editingEpisode) return
    setAttUploading(true)
    setAttError(null)
    try {
      const token = await getToken()
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'attachment')
      fd.append('episodeId', editingEpisode.id)
      const res = await fetch('/api/admin-episode-upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      const data = await res.json()
      if (!res.ok) {
        setAttError(data.error || `Upload failed (${res.status})`)
      } else {
        setEAttachments(prev => [...prev, { id: data.id, file_path: data.url, title: data.fileName, file_size: data.fileSize }])
      }
    } catch (e: any) {
      setAttError(e.message || 'Upload failed — check your connection')
    } finally {
      setAttUploading(false)
      if (attFileRef.current) attFileRef.current.value = ''
    }
  }

  async function deleteAttachment(attachmentId: string) {
    const token = await getToken()
    await fetch(`/api/admin-episode-upload?id=${attachmentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setEAttachments(prev => prev.filter(a => a.id !== attachmentId))
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

  const tierColors: Record<string, string> = { free: '#9a8c74', watchman: '#9a8c74', soldier: '#7a9e7e', commander: '#8B9DCA', general: '#C9A84C' }
  const tierLabel = (tier: string) => ({ free: 'WATCHMAN', watchman: 'WATCHMAN', soldier: 'SOLDIER', commander: 'COMMANDER', general: 'GENERAL' }[tier] || tier.toUpperCase())
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
                    <span style={{ fontSize: 9, color: tierColors[course.tier] || MUT, fontFamily: cinzel, letterSpacing: '0.06em', border: `1px solid ${tierColors[course.tier] || MUT}`, borderRadius: 10, padding: '1px 7px' }}>{tierLabel(course.tier)}</span>
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
              <div>
                {cThumbnail && (
                  <div style={{ marginBottom: 8, position: 'relative' as const }}>
                    <img src={cThumbnail} alt="Thumbnail" style={{ width: '100%', maxHeight: 120, objectFit: 'cover' as const, borderRadius: 6, border: `1px solid ${BDR2}` }} />
                    <button onClick={() => setCThumbnail('')} style={{ position: 'absolute' as const, top: 4, right: 4, background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', color: '#fff', width: 22, height: 22, cursor: 'pointer', fontSize: 13, lineHeight: '22px', padding: 0, textAlign: 'center' as const }}>×</button>
                  </div>
                )}
                <label style={{ display: 'block', padding: '8px 12px', background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px dashed ${BDR2}`, borderRadius: 6, color: thumbnailUploading ? MUT : TXT2, fontFamily: crimson, fontSize: 14, cursor: thumbnailUploading ? 'wait' : 'pointer', textAlign: 'center' as const }}>
                  {thumbnailUploading ? 'Uploading…' : cThumbnail ? '📷 Replace Thumbnail' : '📷 Upload Thumbnail (jpg / png / webp)'}
                  <input type="file" accept="image/jpeg,image/png,image/webp" style={{ display: 'none' }} disabled={thumbnailUploading} onChange={e => { const f = e.target.files?.[0]; if (f) uploadThumbnail(f) }} />
                </label>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <select value={cTier} onChange={e => setCTier(e.target.value)} style={{ ...inp2, flex: 1 }}>
                  <option value="free">Watchman</option>
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
              <input value={eThumbnail} onChange={e => setEThumbnail(e.target.value)} placeholder="Thumbnail URL (optional) — https://... or upload below" style={inp2} />
              {editingEpisode && (
                <div style={{ border: `1px solid ${BDR2}`, borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.14em', textTransform: 'uppercase' as const, marginBottom: 10 }}>Attachments</div>
                  {eAttachments.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 10 }}>
                      {eAttachments.map(att => (
                        <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)', border: `1px solid ${BDR2}`, borderRadius: 6, padding: '6px 10px' }}>
                          <span style={{ fontSize: 14, flexShrink: 0 }}>📄</span>
                          <span style={{ flex: 1, fontFamily: crimson, fontSize: 13, color: TXT2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{att.title || att.file_name}</span>
                          <button onClick={() => deleteAttachment(att.id)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 14, padding: '0 2px', flexShrink: 0 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <label style={{ display: 'block', padding: '7px 12px', background: isDark ? 'rgba(255,255,255,0.04)' : '#fff', border: `1px dashed ${attError ? '#ef4444' : BDR2}`, borderRadius: 6, color: attUploading ? MUT : TXT2, fontFamily: crimson, fontSize: 13, cursor: attUploading ? 'wait' : 'pointer', textAlign: 'center' as const }}>
                    {attUploading ? '⏳ Uploading…' : '📎 Attach PDF or Document'}
                    <input ref={attFileRef} type="file" accept=".pdf,.doc,.docx,.txt,.pptx,.xlsx" style={{ display: 'none' }} disabled={attUploading} onChange={e => { const f = e.target.files?.[0]; if (f) uploadAttachment(f) }} />
                  </label>
                  {attError && (
                    <div style={{ marginTop: 6, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#f87171', fontFamily: crimson, fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>⚠</span>
                      <span style={{ flex: 1 }}>{attError}</span>
                      <button onClick={() => setAttError(null)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
                    </div>
                  )}
                </div>
              )}
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
                const typeColors: Record<string, string> = { live_training: GG, prayer_call: '#7a9e7e', q_and_a: '#8B9DCA', deliverance_workshop: '#b87333', group_warfare_prayer: '#9b59b6', generals_table: '#c0392b', youtube_premiere: '#e74c3c' }
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
                          {evt.zoom_link && <span style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.06em' }}>🔗 Join ({evt.zoom_link_tier}+)</span>}
                          {evt.recording_url && <span style={{ fontFamily: cinzel, fontSize: 9, color: '#38bdf8', letterSpacing: '0.06em' }}>▶ Recording</span>}
                          {evt.recurrence_type && <span style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.06em' }}>↻ {evt.recurrence_type}</span>}
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
                        <option value="group_warfare_prayer">Group Warfare Prayer</option>
                        <option value="generals_table">General's Table</option>
                        <option value="youtube_premiere">YouTube Premiere</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>MAX ATTENDEES</label>
                      <input type="number" value={evtMaxAtt} onChange={e => setEvtMaxAtt(e.target.value)} style={{ ...inp2 }} placeholder="No limit" />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>JOIN LINK</label>
                    <input value={evtZoom} onChange={e => setEvtZoom(e.target.value)} style={{ ...inp2 }} placeholder="https://zoom.us/j/... or YouTube link" />
                  </div>
                  <div>
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>JOIN LINK / MINIMUM TIER</label>
                    <select value={evtZoomTier} onChange={e => setEvtZoomTier(e.target.value)} style={{ ...inp2 }}>
                      {['free', 'soldier', 'commander', 'general', 'minister'].map(t => <option key={t} value={t}>{t === 'free' ? 'Watchman' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>RECORDING URL</label>
                    <input value={evtRecordingUrl} onChange={e => setEvtRecordingUrl(e.target.value)} style={{ ...inp2 }} placeholder="https://youtube.com/watch?v=..." />
                  </div>
                  <div>
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>THUMBNAIL URL</label>
                    <input value={evtThumbnail} onChange={e => setEvtThumbnail(e.target.value)} style={{ ...inp2 }} placeholder="https://..." />
                  </div>
                  <div>
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>RELATED SPIRITS (comma-separated)</label>
                    <input value={evtRelatedSpirits} onChange={e => setEvtRelatedSpirits(e.target.value)} style={{ ...inp2 }} placeholder="Fear, Jezebel, Divination" />
                    {evtRelatedSpirits.trim() && (
                      <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginTop: 6 }}>
                        {evtRelatedSpirits.split(',').map(s => s.trim()).filter(Boolean).map(s => (
                          <a key={s} href={`/community?section=database&search=${encodeURIComponent(s)}`} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '2px 8px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${BDR2}`, borderRadius: 4, color: GG, fontSize: 11, fontFamily: cinzel, textDecoration: 'none', letterSpacing: '0.04em' }}>
                            {s}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.1em', display: 'block', marginBottom: 5 }}>ATTACHMENTS / DOCUMENTS</label>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                      <input value={evtAttachLabel} onChange={e => setEvtAttachLabel(e.target.value)} style={{ ...inp2, flex: 1, marginBottom: 0 }} placeholder="Label (e.g. Session Notes PDF)" />
                      <input value={evtAttachUrl} onChange={e => setEvtAttachUrl(e.target.value)} style={{ ...inp2, flex: 2, marginBottom: 0 }} placeholder="URL" />
                      <button onClick={() => {
                        if (!evtAttachLabel.trim() || !evtAttachUrl.trim()) return
                        setEvtAttachments(prev => [...prev, { label: evtAttachLabel.trim(), url: evtAttachUrl.trim() }])
                        setEvtAttachLabel(''); setEvtAttachUrl('')
                      }} style={{ padding: '7px 12px', background: GG, border: 'none', borderRadius: 4, color: '#0D0B14', fontFamily: cinzel, fontSize: 9, cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' as const }}>
                        + Add
                      </button>
                    </div>
                    {evtAttachments.length > 0 && (
                      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4 }}>
                        {evtAttachments.map((att, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(201,168,76,0.04)', border: `1px solid ${BDR2}`, borderRadius: 4, padding: '5px 10px' }}>
                            <span style={{ fontFamily: cinzel, fontSize: 10, color: GG, flex: 1 }}>{att.label}</span>
                            <span style={{ fontFamily: crimson, fontSize: 11, color: MUT, flex: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{att.url}</span>
                            <button onClick={() => setEvtAttachments(prev => prev.filter((_, j) => j !== i))}
                              style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 14, padding: '0 4px', lineHeight: 1 }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="evtPub" checked={evtPublished} onChange={e => setEvtPublished(e.target.checked)} style={{ width: 16, height: 16, accentColor: GG }} />
                    <label htmlFor="evtPub" style={{ fontFamily: cinzel, fontSize: 10, color: TXT2, letterSpacing: '0.06em', cursor: 'pointer' }}>Published (visible to members)</label>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input type="checkbox" id="evtRecur" checked={evtRecurring} onChange={e => setEvtRecurring(e.target.checked)} style={{ width: 16, height: 16, accentColor: GG }} />
                    <label htmlFor="evtRecur" style={{ fontFamily: cinzel, fontSize: 10, color: TXT2, letterSpacing: '0.06em', cursor: 'pointer' }}>Recurring event</label>
                    {evtRecurring && (
                      <select value={evtRecurrenceType} onChange={e => setEvtRecurrenceType(e.target.value)} style={{ ...inp2, flex: 1, marginBottom: 0 }}>
                        <option value="weekly">Weekly</option>
                        <option value="biweekly">Bi-weekly</option>
                        <option value="monthly">Monthly</option>
                      </select>
                    )}
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

function ModerationPanel({ getToken, section = 'feedback' }: { getToken: (opts?: { template?: string }) => Promise<string | null>; section?: 'feedback' | 'testimony' | 'forum' | 'fieldreports' | 'flags' }) {
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
      {/* ── COMMUNITY FEEDBACK ── */}
      {section === 'feedback' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em', marginBottom: 4 }}>🛡 Community Feedback</div>
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
        </>
      )}

      {/* ── TESTIMONY QUEUE ── */}
      {section === 'testimony' && (
        <>
          <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em', marginBottom: 16 }}>
            Testimony Queue — {testimonies.filter(t => t.status === 'pending').length} pending
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
        </>
      )}

      {/* ── FORUM BOARD ── */}
      {section === 'forum' && <ForumModerationPanel getToken={getToken} />}

      {/* ── FIELD REPORTS ── */}
      {section === 'fieldreports' && <FieldReportsPanel getToken={getToken} />}

      {/* ── FLAGS ── */}
      {section === 'flags' && <FlagsPanel getToken={getToken} />}
    </div>
  )
}

function FieldReportsPanel({ getToken }: { getToken: any }) {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const token = await getToken()
      const res = await fetch('/api/field-reports', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setReports(d.reports || []) }
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(id: string, status: 'approved' | 'rejected') {
    const token = await getToken()
    await fetch('/api/field-reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, status }),
    })
    setReports(prev => prev.map(r => r.id === id ? { ...r, status } : r))
  }

  const STATUS_COLOR: Record<string, string> = { pending: G, approved: '#4ade80', rejected: '#f87171' }

  if (loading) return <div style={{ fontFamily: crimson, color: DIM, fontStyle: 'italic', padding: '20px 0' }}>Loading field reports...</div>

  return (
    <div>
      <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.1em', marginBottom: 16 }}>
        Field Reports — {reports.filter(r => r.status === 'pending').length} pending
      </div>
      {reports.length === 0 && (
        <div style={{ color: DIM, fontFamily: crimson, fontStyle: 'italic', fontSize: 13 }}>No field reports submitted yet.</div>
      )}
      {reports.map(r => (
        <div key={r.id} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: TXT, marginBottom: 2 }}>{r.submitted_by_name} — {r.submitted_by_tier?.toUpperCase()}</div>
              <div style={{ fontSize: 10, color: DIM }}>{r.location_city}{r.location_state ? `, ${r.location_state}` : ''} · {new Date(r.created_at).toLocaleDateString()}</div>
            </div>
            <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: `${STATUS_COLOR[r.status] || DIM}18`, color: STATUS_COLOR[r.status] || DIM, fontFamily: cinzel, letterSpacing: '0.06em' }}>
              {r.status?.toUpperCase()}
            </span>
          </div>
          <div style={{ fontFamily: crimson, fontSize: 13, color: TXT, marginBottom: 4 }}><strong>Spirits:</strong> {Array.isArray(r.spirit_names) ? r.spirit_names.join(', ') : r.spirit_names}</div>
          <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, marginBottom: 4 }}><strong>Manifestations:</strong> {r.manifestations}</div>
          {r.outcome && <div style={{ fontFamily: crimson, fontSize: 13, color: DIM, marginBottom: 4 }}><strong>Outcome:</strong> {r.outcome}</div>}
          {r.status === 'pending' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => updateStatus(r.id, 'approved')} style={{ padding: '4px 14px', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 5, color: '#4ade80', fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>✓ Approve</button>
              <button onClick={() => updateStatus(r.id, 'rejected')} style={{ padding: '4px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#ef4444', fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>✗ Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function FlagsPanel({ getToken }: { getToken: any }) {
  const [flagged, setFlagged] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const token = await getToken()
      const res = await fetch('/api/forum-posts?sort=new&limit=100', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const d = await res.json()
        setFlagged((d.posts || []).filter((p: any) => p.flagged || (p.flag_count ?? 0) > 0))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function dismiss(id: string) {
    const token = await getToken()
    await fetch('/api/forum-posts', { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ id, flagged: false }) })
    setFlagged(prev => prev.filter(p => p.id !== id))
  }

  async function remove(id: string) {
    if (!confirm('Delete this post?')) return
    const token = await getToken()
    await fetch(`/api/forum-posts?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setFlagged(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return <div style={{ color: DIM, fontFamily: crimson, fontStyle: 'italic', padding: '20px 0' }}>Loading flagged content...</div>

  return (
    <div>
      <div style={{ fontFamily: cinzel, fontSize: 13, color: flagged.length > 0 ? '#f87171' : G, letterSpacing: '0.1em', marginBottom: 16 }}>
        🚩 Flagged Content — {flagged.length} item{flagged.length !== 1 ? 's' : ''}
      </div>
      {flagged.length === 0 && (
        <div style={{ color: DIM, fontFamily: crimson, fontStyle: 'italic', fontSize: 13 }}>No flagged posts. Community looks clean.</div>
      )}
      {flagged.map(p => (
        <div key={p.id} style={{ background: SURF, border: '1px solid rgba(248,113,113,0.3)', borderLeft: '3px solid #f87171', borderRadius: 10, padding: '14px 18px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
            <div>
              <div style={{ fontFamily: cinzel, fontSize: 11, color: TXT, marginBottom: 2 }}>{p.title}</div>
              <div style={{ fontSize: 10, color: DIM }}>{p.author_name} · {p.post_type} · {new Date(p.created_at).toLocaleDateString()}</div>
            </div>
            {(p.flag_count ?? 0) > 0 && (
              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', color: '#f87171', fontFamily: cinzel }}>
                {p.flag_count} flag{p.flag_count !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {p.body && <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const, marginBottom: 10 }}>{p.body.slice(0, 140)}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => dismiss(p.id)} style={{ padding: '4px 14px', background: 'transparent', border: `1px solid ${BDR}`, borderRadius: 5, color: DIM, fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>Dismiss Flag</button>
            <button onClick={() => remove(p.id)} style={{ padding: '4px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#ef4444', fontFamily: cinzel, fontSize: 9, cursor: 'pointer' }}>Delete Post</button>
          </div>
        </div>
      ))}
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

// ─── AICommandManager ────────────────────────────────────────────────────────

function AICommandManager({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const LSURF = isDark ? '#13111a' : '#fff'
  const LBDR  = isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.25)'
  const LTXT  = isDark ? '#e8e0d0' : '#2D2924'
  const LMUT  = isDark ? '#9a8c74' : '#5C5248'
  const LG    = '#C9A84C'

  const [contexts, setContexts]           = useState<any[]>([])
  const [ctxLoading, setCtxLoading]       = useState(true)
  const [editingCtxId, setEditingCtxId]   = useState<string | null>(null)
  const [editCtxLabel, setEditCtxLabel]   = useState('')
  const [editCtxScope, setEditCtxScope]   = useState('global')
  const [editCtxText, setEditCtxText]     = useState('')
  const [editCtxSaving, setEditCtxSaving] = useState(false)
  const [editCtxMsg, setEditCtxMsg]       = useState('')
  const [showNewCtx, setShowNewCtx]       = useState(false)
  const [newCtxLabel, setNewCtxLabel]     = useState('')
  const [newCtxScope, setNewCtxScope]     = useState('global')
  const [newCtxText, setNewCtxText]       = useState('')
  const [newCtxSaving, setNewCtxSaving]   = useState(false)
  const [newCtxMsg, setNewCtxMsg]         = useState('')

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const,
    background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
    border: `1px solid ${LBDR}`, borderRadius: 6,
    padding: '8px 12px', color: LTXT, fontFamily: crimson, fontSize: 14, outline: 'none',
  }

  const SCOPE_LABELS: Record<string, { label: string; color: string; desc: string }> = {
    global:     { label: 'GLOBAL',     color: '#C9A84C', desc: 'Prepended to every AI call' },
    regional:   { label: 'REGIONAL',   color: '#8B9DCA', desc: 'Used for territorial/regional spirits' },
    session:    { label: 'SESSION',    color: '#7a9e7e', desc: 'Used for session indicators, prayer & aftercare' },
    assessment: { label: 'ASSESSMENT', color: '#b87a3d', desc: 'Used for assessment AI summaries' },
  }

  useEffect(() => { loadContexts() }, [])

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

      {/* ── COMING SOON ── */}
      <div style={{ marginTop: 48, opacity: 0.4, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.12em', color: '#C9A84C' }}>
        ADDITIONAL AI CONFIGURATION — COMING SOON
      </div>
    </div>
  )
}

// ─── LIBRARY MANAGER ─────────────────────────────────────────────────────────
function LibraryManager({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const LSURF = isDark ? '#13111a' : '#fff'
  const LBDR  = isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.25)'
  const LTXT  = isDark ? '#e8e0d0' : '#2D2924'
  const LMUT  = isDark ? '#9a8c74' : '#5C5248'
  const LG    = '#C9A84C'

  // Books state
  const [books, setBooks]           = useState<any[]>([])
  const [booksLoading, setBooksLoading] = useState(true)

  // Inline edit state — one card open at a time
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [editForm,    setEditForm]    = useState<{ title: string; author: string; notes: string; topic: string; spirit_tags: string[]; sourceType: 'christian' | 'intelligence'; active: boolean; ai_generated: boolean }>({ title: '', author: '', notes: '', topic: 'Spiritual Warfare', spirit_tags: [], sourceType: 'christian', active: true, ai_generated: true })
  const [editLoading, setEditLoading] = useState(false)
  const [reanalyzeId,     setReanalyzeId]     = useState<string | null>(null)
  const [reanalyzeErrors, setReanalyzeErrors] = useState<Record<string, string>>({})
  const [enrichingId,     setEnrichingId]     = useState<string | null>(null)
  const [enrichErrors,    setEnrichErrors]    = useState<Record<string, string>>({})

  // Re-tag state
  const [retagRunning, setRetagRunning] = useState(false)
  const [retagProgress, setRetagProgress] = useState<{ done: number; total: number; updated: number } | null>(null)

  // Staged files state
  type StagedFile = {
    id: string; file: File; title: string; author: string; notes: string
    spirit_tags: string[]; sourceType: 'christian' | 'intelligence'
    status: 'pending' | 'analyzing' | 'uploading' | 'done' | 'error'
    errorMsg?: string; aiGenerated: boolean
  }
  const [stagedFiles, setStagedFiles] = useState<StagedFile[]>([])
  const [duplicateWarnings, setDuplicateWarnings] = useState<{file: File, match: any}[]>([])
  const [highlightedBookId, setHighlightedBookId] = useState<string | null>(null)
  const [dragOverAi, setDragOverAi]   = useState(false)
  const [dragOverPdf, setDragOverPdf] = useState(false)
  const [uploadingAll, setUploadingAll] = useState(false)
  const [uploadError, setUploadError]   = useState<string | null>(null)
  const [pdfUploadError, setPdfUploadError] = useState<string | null>(null)
  const [bookSearch, setBookSearch]     = useState('')
  const [quickTagId, setQuickTagId]     = useState<string | null>(null)
  const [kbExpanded, setKbExpanded]     = useState(false)
  const [selectedBooks, setSelectedBooks] = useState<Set<string>>(new Set())
  const [selectAllBooks, setSelectAllBooks] = useState(false)
  const [batchProgress, setBatchProgress] = useState<{ action: string; current: number; total: number; done: boolean; errors: string[] } | null>(null)
  const fileInputRef        = useRef<HTMLInputElement>(null)
  const libraryFileInputRef = useRef<HTMLInputElement>(null)

  // Pending-approval queue state
  const [pendingBooks, setPendingBooks]           = useState<any[]>([])
  const [summaryingId, setSummaryingId]           = useState<string | null>(null)
  const [summaryErrors, setSummaryErrors]         = useState<Record<string, string>>({})
  const [approveExpanded, setApproveExpanded]     = useState<string | null>(null)
  const [rejectExpanded, setRejectExpanded]       = useState<string | null>(null)
  const [pdConfirmed, setPdConfirmed]             = useState<Record<string, boolean>>({})
  const [rejectReasons, setRejectReasons]         = useState<Record<string, string>>({})
  const [approvingId, setApprovingId]             = useState<string | null>(null)

  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box' as const,
    background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
    border: `1px solid ${LBDR}`, borderRadius: 6,
    padding: '8px 12px', color: LTXT, fontFamily: crimson, fontSize: 14, outline: 'none',
  }

  useEffect(() => { loadBooks(); loadPendingBooks() }, [])

  // Auto-clear staged files 3s after all reach done/error, then refresh book list
  useEffect(() => {
    if (stagedFiles.length === 0) return
    const allFinished = stagedFiles.every(f => f.status === 'done' || f.status === 'error')
    if (!allFinished) return
    const t = setTimeout(() => {
      setStagedFiles([])
      loadBooks()
    }, 3000)
    return () => clearTimeout(t)
  }, [stagedFiles])

  async function loadBooks() {
    setBooksLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-library', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setBooks(d.books || []) }
    } catch { /* ignore */ }
    setBooksLoading(false)
  }

  async function loadPendingBooks() {
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-library?status=pending', { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) { const d = await res.json(); setPendingBooks(d.books || []) }
    } catch { /* ignore */ }
  }

  async function handleGenerateSummary(bookId: string) {
    setSummaryingId(bookId)
    setSummaryErrors(prev => { const n = { ...prev }; delete n[bookId]; return n })
    try {
      const token = await getToken()
      const res = await fetch('/api/library-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resourceId: bookId }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Summary failed')
      await loadPendingBooks()
    } catch (e: any) {
      setSummaryErrors(prev => ({ ...prev, [bookId]: e.message }))
    }
    setSummaryingId(null)
  }

  async function handleLibraryApprove(bookId: string, action: 'approve' | 'reject') {
    setApprovingId(bookId)
    try {
      const token = await getToken()
      const res = await fetch('/api/library-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          resourceId: bookId,
          action,
          publicDomainConfirmed: action === 'approve' ? (pdConfirmed[bookId] || false) : undefined,
          rejectionReason: action === 'reject' ? (rejectReasons[bookId] || '') : undefined,
        }),
      })
      if (res.ok) {
        setPendingBooks(prev => prev.filter(b => b.id !== bookId))
        setApproveExpanded(null)
        setRejectExpanded(null)
        if (action === 'approve') await loadBooks()
      }
    } catch { /* ignore */ }
    setApprovingId(null)
  }

  function findDuplicateBook(file: File): any | null {
    const cleanFilename = file.name.toLowerCase().replace(/\.[^.]+$/, '').replace(/[^a-z0-9]/g, '')
    return books.find(b => {
      const existingFilename = (b.filename || b.file_path || '').toLowerCase().replace(/[^a-z0-9]/g, '')
      return existingFilename.includes(cleanFilename) || cleanFilename.includes(existingFilename) || isSimilarTitle(b.title || '', file.name)
    }) || null
  }

  function checkDuplicate(file: File, allBooks: any[]): string | null {
    const filenameMatch = allBooks.find(b => b.file_path?.toLowerCase().includes(file.name.toLowerCase()))
    if (filenameMatch) return `Filename matches: "${filenameMatch.title || file.name}"`
    if (file.size > 0) {
      const sizeMatch = allBooks.find(b => b.file_size && Math.abs(b.file_size - file.size) < 100)
      if (sizeMatch) return `Same file size as: "${sizeMatch.title || 'existing book'}"`
    }
    const fname = file.name.toLowerCase().replace(/\.[^/.]+$/, '')
    const stripped = fname.replace(/^(the|a|an)\s+/i, '').replace(/[-_]/g, ' ').toLowerCase()
    const titleMatch = allBooks.find(b => {
      const existingStripped = (b.title || '').replace(/^(the|a|an)\s+/i, '').toLowerCase()
      return existingStripped.length > 4 && (existingStripped.includes(stripped) || stripped.includes(existingStripped))
    })
    if (titleMatch) return `Similar title: "${titleMatch.title}"`
    return null
  }

  const handleLibraryDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    console.log('[PDF-drop] fired', e.dataTransfer?.files?.length)
    e.preventDefault()
    e.stopPropagation()
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return
    addLibraryFiles(files, true)
  }

  const handleLibraryFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('[PDF-select] fired', e.target?.files?.length)
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    addLibraryFiles(files, true)
    e.target.value = ''
  }

  function addLibraryFiles(files: FileList | File[], pdfOnly = false) {
    console.log('[PDF-add] files:', Array.from(files).length, 'pdfOnly:', pdfOnly)
    const valid = Array.from(files).filter(f => {
      const name = f.name.toLowerCase()
      const okType = pdfOnly
        ? (name.endsWith('.pdf') || f.type === 'application/pdf' || f.type === 'application/x-pdf')
        : (name.endsWith('.txt') || name.endsWith('.docx'))
      console.log('[library-add] file:', f.name, 'type:', f.type, 'size:', f.size, 'okType:', okType, 'pdfOnly:', pdfOnly)
      return okType && f.size <= 50 * 1024 * 1024
    })
    const duplicates: {file: File, match: any}[] = []
    setStagedFiles(prev => {
      const existing = new Set(prev.map(s => s.file.name + s.file.size))
      const fresh = valid
        .filter(f => {
          if (existing.has(f.name + f.size)) return false
          const match = findDuplicateBook(f)
          if (match) { duplicates.push({ file: f, match }); return false }
          return true
        })
        .slice(0, 50 - prev.length)
        .map(f => ({
          id: crypto.randomUUID(),
          file: f,
          title: f.name.replace(/\.[^/.]+$/, '').replace(/^(\d+[-_\s]*)+/, '').replace(/[-_]/g, ' ').trim(),
          author: '', notes: '', spirit_tags: [], sourceType: 'christian' as const,
          status: 'pending' as const,
          aiGenerated: false,
        }))
      return [...prev, ...fresh]
    })
    if (duplicates.length > 0) {
      setDuplicateWarnings(prev => [...prev, ...duplicates])
    }
  }

  function updateStaged(id: string, patch: Partial<{ title: string; author: string; notes: string; spirit_tags: string[]; sourceType: 'christian' | 'intelligence'; status: StagedFile['status']; errorMsg: string; aiGenerated: boolean }>) {
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
    console.log('[PDF-upload] starting, files:', stagedFiles.filter(f => f.status === 'pending').length)
    const token = await getToken()
    console.log('[PDF-upload] token:', token ? 'ok' : 'NULL')
    if (!token) {
      const msg = 'Authentication token unavailable — please refresh and try again.'
      setUploadError(msg)
      setPdfUploadError(msg)
      return
    }
    const pending = stagedFiles.filter(f => f.status === 'pending')
    if (!pending.length) return
    setUploadingAll(true)
    for (const sf of pending) {
      console.log('[handleUploadAll] starting upload:', sf.file.name, 'type:', sf.file.type, 'size:', sf.file.size)
      // Step 1 — signed URL
      updateStaged(sf.id, { status: 'uploading' })
      let signedUrl = '', filePath = ''
      try {
        console.log('[PDF-upload] calling:', '/api/admin-library-url')
        const urlRes = await fetch('/api/admin-library-url', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ filename: sf.file.name, contentType: sf.file.type || 'application/octet-stream' }),
        })
        console.log('[PDF-upload] response:', urlRes.status)
        const urlData = await urlRes.json()
        if (!urlRes.ok) {
          console.error('[handleUploadAll] signed URL error:', urlData.error, 'for', sf.file.name)
          const msg = urlData.error || 'Failed to get upload URL'
          updateStaged(sf.id, { status: 'error', errorMsg: msg })
          setPdfUploadError(msg)
          continue
        }
        signedUrl = urlData.signedUrl
        filePath = urlData.filePath
        console.log('[handleUploadAll] got signed URL, filePath:', filePath)
      } catch (err: any) {
        console.error('[PDF-upload] error:', err)
        updateStaged(sf.id, { status: 'error', errorMsg: err.message || 'Upload failed — check console' })
        setPdfUploadError(err.message || 'Upload failed — check console')
        continue
      }

      // Step 2 — PUT to Supabase
      try {
        const contentType = getMimeType(sf.file.name, sf.file.type || undefined)
        console.log('[PDF-upload] calling:', signedUrl)
        const storageRes = await fetch(signedUrl, {
          method: 'PUT',
          headers: { 'Content-Type': contentType },
          body: sf.file,
        })
        console.log('[PDF-upload] response:', storageRes.status)
        if (!storageRes.ok) {
          const msg = `Storage upload failed: ${storageRes.status}`
          updateStaged(sf.id, { status: 'error', errorMsg: msg })
          setPdfUploadError(msg)
          continue
        }
      } catch (err: any) {
        console.error('[PDF-upload] error:', err)
        updateStaged(sf.id, { status: 'error', errorMsg: err.message || 'Upload failed — check console' })
        setPdfUploadError(err.message || 'Upload failed — check console')
        continue
      }

      // Step 3 — save metadata
      try {
        console.log('[PDF-upload] calling:', '/api/admin-library-save')
        const saveRes = await fetch('/api/admin-library-save', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sf.title.trim() || sf.file.name,
            author: sf.author.trim() || null,
            notes: sf.notes.trim() || null,
            spirit_tags: sf.spirit_tags ?? [],
            sourceType: sf.sourceType ?? 'christian',
            filename: sf.file.name,
            file_size: sf.file.size,
            file_path: filePath,
            ai_generated: sf.aiGenerated,
            file_type: fileExt(sf.file.name) || 'txt',
          }),
        })
        console.log('[PDF-upload] response:', saveRes.status)
        const saveData = await saveRes.json()
        if (saveRes.status === 409) {
          updateStaged(sf.id, { status: 'error', errorMsg: `Duplicate: "${saveData.existingTitle || 'file already exists'}"` })
          continue
        }
        if (!saveData.success) {
          console.error('[handleUploadAll] save failed:', saveData.error, 'for', sf.file.name)
          const msg = saveData.error || 'Save failed'
          updateStaged(sf.id, { status: 'error', errorMsg: msg })
          setPdfUploadError(msg)
          continue
        }
        console.log('[handleUploadAll] done for', sf.file.name)
        updateStaged(sf.id, { status: 'done' })
        if (saveData.book) setBooks(prev => [saveData.book, ...prev])
        // Trigger autofill for newly uploaded book (non-blocking)
        if (saveData.book?.id) {
          fetch('/api/library-autofill', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              bookId: saveData.book.id,
              filename: sf.file.name,
              notes: sf.notes || '',
            }),
          }).then(r => r.json()).then(d => {
            console.log('[PDF-upload] autofill result:', d)
            if (d.spirit_tags?.length || d.title || d.author) {
              fetch('/api/admin-library', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                  id: saveData.book.id,
                  ...(d.title  && { title:  d.title }),
                  ...(d.author && { author: d.author }),
                  ...(Array.isArray(d.spirit_tags) && d.spirit_tags.length && { spirit_tags: d.spirit_tags }),
                }),
              }).catch(() => {})
            }
          }).catch(e => console.warn('[PDF-upload] autofill failed silently:', e))
        }
      } catch (err: any) {
        console.error('[PDF-upload] error:', err)
        updateStaged(sf.id, { status: 'error', errorMsg: err.message || 'Upload failed — check console' })
        setPdfUploadError(err.message || 'Upload failed — check console')
      }
    }
    setUploadingAll(false)
    loadBooks()
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
      title:        book.title  || '',
      author:       book.author || '',
      notes:        book.notes  || '',
      topic:        book.topic  || 'Spiritual Warfare',
      spirit_tags:  Array.isArray(book.spirit_tags) ? book.spirit_tags : [],
      sourceType:   (book.source_type === 'intelligence' ? 'intelligence' : 'christian') as 'christian' | 'intelligence',
      active:       book.active ?? true,
      ai_generated: book.ai_generated ?? true,
    })
    setEditLoading(false)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditLoading(false)
  }

  function setReanalyzeError(bookId: string, msg: string) {
    setReanalyzeErrors(prev => ({ ...prev, [bookId]: msg }))
  }

  async function reanalyzeBook(bookId: string) {
    setReanalyzeId(bookId)
    setReanalyzeErrors(prev => { const n = { ...prev }; delete n[bookId]; return n })
    try {
      const token = await getToken()
      const res   = await fetch('/api/library-reanalyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resourceId: bookId }),
      })
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch { data = { error: text.slice(0, 200) } }
      console.log('[REANALYZE] response:', res.status, data)
      if (!res.ok) { setReanalyzeError(bookId, data.error || `HTTP ${res.status}`); return }
      if (data.resource) setBooks(prev => prev.map(b => b.id === bookId ? { ...b, ...data.resource, is_indexed: true } : b))
    } catch (e: any) {
      console.error('[REANALYZE] network error:', e)
      setReanalyzeError(bookId, e.message || 'Network error')
    }
    finally { setReanalyzeId(null) }
  }

  async function quickTagBook(book: any) {
    setQuickTagId(book.id)
    try {
      const token = await getToken()
      let contentSnippet = [book.title, book.author, book.notes].filter(Boolean).join('\n\n')
      try {
        const textRes = await fetch(`/api/admin-library?id=${book.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (textRes.ok) {
          const textData = await textRes.json()
          const extracted = textData.book?.extracted_text
          if (extracted && extracted.length > 50) contentSnippet = extracted.slice(0, 6000)
        }
      } catch { /* fall back to notes */ }
      const res = await fetch('/api/library-autofill', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: book.file_path || book.filename || book.title, contentSnippet, resourceId: book.id }),
      })
      if (res.ok) {
        const d = await res.json()
        const newTags: string[] = Array.isArray(d.spirit_tags) ? d.spirit_tags : []
        if (newTags.length > 0) {
          await fetch('/api/admin-library', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id: book.id, spirit_tags: newTags }),
          })
          setBooks(prev => prev.map(b => b.id === book.id ? { ...b, spirit_tags: newTags } : b))
        }
      }
    } catch { /* best-effort */ }
    setQuickTagId(null)
  }

  async function handleGenerateSuggestions(bookId: string) {
    setEnrichingId(bookId)
    setEnrichErrors(prev => { const n = { ...prev }; delete n[bookId]; return n })
    try {
      const token = await getToken()
      const res   = await fetch('/api/library-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ resourceId: bookId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setEnrichErrors(prev => ({ ...prev, [bookId]: data.error || `HTTP ${res.status}` }))
      } else {
        console.log('[ENRICH] Done:', data.message)
        setEnrichErrors(prev => ({ ...prev, [bookId]: `✓ ${data.suggestions} suggestions — check Enrichment tab` }))
      }
    } catch (e: any) {
      setEnrichErrors(prev => ({ ...prev, [bookId]: e.message || 'Network error' }))
    } finally {
      setEnrichingId(null)
    }
  }

  async function saveEdit() {
    if (!editingId) return
    const token = await getToken()
    const res = await fetch('/api/admin-library', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        id:           editingId,
        title:        editForm.title.trim(),
        author:       editForm.author.trim(),
        notes:        editForm.notes.trim(),
        topic:        editForm.topic,
        spirit_tags:  editForm.spirit_tags,
        source_type:  editForm.sourceType,
        active:       editForm.active,
        ai_generated: editForm.ai_generated,
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
      let contentSnippet = book.notes || ''
      try {
        const textRes = await fetch(`/api/admin-library?id=${book.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (textRes.ok) {
          const textData = await textRes.json()
          const extracted = textData.book?.extracted_text
          if (extracted && extracted.length > 50) contentSnippet = extracted.slice(0, 6000)
        }
      } catch { /* fall back to notes */ }
      const resp  = await fetch('/api/library-autofill', {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body:    JSON.stringify({ filename: book.filename || book.file_path || book.title, contentSnippet }),
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
          let contentSnippet = book.notes || ''
          try {
            const textRes = await fetch(`/api/admin-library?id=${book.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (textRes.ok) {
              const textData = await textRes.json()
              const extracted = textData.book?.extracted_text
              if (extracted && extracted.length > 50) contentSnippet = extracted.slice(0, 6000)
            }
          } catch { /* fall back to notes */ }
          const autofillRes = await fetch('/api/library-autofill', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: book.filename || book.file_path || book.title, contentSnippet }),
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

  async function handleBatchAutofill() {
    const ids = Array.from(selectedBooks)
    const selectedBookObjects = books.filter(b => ids.includes(b.id))
    setBatchProgress({ action: 'AI AUTOFILL', current: 0, total: ids.length, done: false, errors: [] })
    const token = await getToken()
    if (!token) return
    const errors: string[] = []
    for (let i = 0; i < selectedBookObjects.length; i++) {
      const book = selectedBookObjects[i]
      setBatchProgress(p => p ? { ...p, current: i + 1 } : p)
      try {
        const res = await fetch('/api/library-autofill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ bookId: book.id, filename: book.file_path?.split('/').pop() || '', notes: book.notes || '' }),
        })
        if (!res.ok) errors.push(`${book.title || book.id}: autofill failed`)
      } catch (e: any) {
        errors.push(`${book.title || book.id}: ${e.message}`)
      }
      if (i < selectedBookObjects.length - 1) await new Promise(r => setTimeout(r, 1500))
    }
    setBatchProgress(p => p ? { ...p, done: true, errors } : p)
    await loadBooks()
    setSelectedBooks(new Set())
    setSelectAllBooks(false)
  }

  async function handleBatchReindex() {
    const ids = Array.from(selectedBooks)
    const selectedBookObjects = books.filter(b => ids.includes(b.id))
    setBatchProgress({ action: 'RE-INDEX', current: 0, total: ids.length, done: false, errors: [] })
    const token = await getToken()
    if (!token) return
    const errors: string[] = []
    for (let i = 0; i < selectedBookObjects.length; i++) {
      const book = selectedBookObjects[i]
      setBatchProgress(p => p ? { ...p, current: i + 1 } : p)
      try {
        const fp = book.file_path || ''
        const ext = fp.split('.').pop()?.toLowerCase() || 'txt'
        const fileType = ext === 'pdf' ? 'pdf' : ext === 'docx' ? 'docx' : 'txt'
        const res = await fetch('/api/library-index', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ resourceId: book.id, filePath: fp, fileType }),
        })
        if (!res.ok) errors.push(`${book.title || book.id}: index failed`)
      } catch (e: any) {
        errors.push(`${book.title || book.id}: ${e.message}`)
      }
      if (i < selectedBookObjects.length - 1) await new Promise(r => setTimeout(r, 800))
    }
    setBatchProgress(p => p ? { ...p, done: true, errors } : p)
    await loadBooks()
    setSelectedBooks(new Set())
    setSelectAllBooks(false)
  }

  async function handleBatchToggleActive(active: boolean) {
    const ids = Array.from(selectedBooks)
    const token = await getToken()
    if (!token) return
    await Promise.all(ids.map(id =>
      fetch('/api/admin-library', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, active }),
      })
    ))
    await loadBooks()
    setSelectedBooks(new Set())
    setSelectAllBooks(false)
  }

  async function handleBatchDelete() {
    const ids = Array.from(selectedBooks)
    if (!window.confirm(`Delete ${ids.length} book${ids.length !== 1 ? 's' : ''} permanently? This cannot be undone.`)) return
    const token = await getToken()
    if (!token) return
    await Promise.all(ids.map(id =>
      fetch('/api/admin-library', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id }),
      })
    ))
    await loadBooks()
    setSelectedBooks(new Set())
    setSelectAllBooks(false)
  }

  const anyUploading = stagedFiles.some(f => f.status === 'uploading')
  const anyAnalyzing = stagedFiles.some(f => f.status === 'analyzing')

  function isPdfBook(b: any): boolean {
    const fp = (b.file_path || b.filename || '').toLowerCase()
    return fp.includes('.pdf') || (fp.length > 0 && !fp.includes('.txt') && !fp.includes('.docx'))
  }
  const aiBooks      = books.filter(b => !isPdfBook(b))
  const allPdfBooks  = books.filter(isPdfBook)
  const filteredBooks = allPdfBooks.filter(b => {
    if (!bookSearch.trim()) return true
    const q = bookSearch.toLowerCase()
    return (
      b.title?.toLowerCase().includes(q) ||
      b.author?.toLowerCase().includes(q) ||
      (b.spirit_tags || []).some((t: string) => t.toLowerCase().includes(q)) ||
      b.notes?.toLowerCase().includes(q)
    )
  })

  const duplicateIds = useMemo(() => {
    const seen = new Map<string, string>()
    const dupes = new Set<string>()
    books.forEach(book => {
      if (book.file_size) {
        const sizeKey = String(book.file_size)
        if (seen.has(sizeKey)) { dupes.add(book.id); dupes.add(seen.get(sizeKey)!) } else { seen.set(sizeKey, book.id) }
      }
      const titleKey = (book.title || '').replace(/^(the|a|an)\s+/i, '').toLowerCase().trim()
      if (titleKey.length > 4) {
        if (seen.has(titleKey)) { dupes.add(book.id); dupes.add(seen.get(titleKey)!) } else { seen.set(titleKey, book.id) }
      }
    })
    return dupes
  }, [books])

  return (
    <div style={{ color: LTXT, fontFamily: crimson }}>

      {/* ══ SERMON LIBRARY BANNER ══════════════════════════════════════════════ */}
      <div style={{ background: 'rgba(201,168,76,0.07)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 8, padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ color: LG, fontSize: 18, flexShrink: 0 }}>⚔</span>
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', color: LG, marginBottom: 5 }}>SERMON LIBRARY — DAILY BRIEF SOURCE MATERIAL</div>
          <div style={{ fontSize: 13, color: LTXT, lineHeight: 1.6 }}>
            Upload your sermons, teaching notes, and ministry resources below. The AI Daily Brief generator draws from these documents when crafting devotionals — the more content you add, the more your Daily Briefs will sound like your own voice and theology. PDFs and Word documents are supported.
          </div>
        </div>
      </div>

      {/* ══ AWAITING REVIEW ════════════════════════════════════════════════════ */}
      {pendingBooks.length > 0 && (
        <div style={{ border: `1px solid ${LG}44`, borderRadius: 10, padding: 20, marginBottom: 32, background: 'rgba(201,168,76,0.04)' }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.14em', color: LG, marginBottom: 16 }}>
            ✦ AWAITING REVIEW — {pendingBooks.length} text{pendingBooks.length !== 1 ? 's' : ''}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 16 }}>
            {pendingBooks.map((book: any) => {
              const sum   = book.ai_summary
              const sstat = book.summary_status || 'pending'
              const isApproveOpen = approveExpanded === book.id
              const isRejectOpen  = rejectExpanded  === book.id
              const wrel  = sum?.warfare_relevance
              const relColor = wrel === 'high' ? G : wrel === 'medium' ? '#7ab4e0' : DIM
              return (
                <div key={book.id} style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: '16px 18px' }}>
                  {/* Header */}
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 12, color: LG, letterSpacing: '0.06em' }}>{book.title}</div>
                    <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, marginTop: 2 }}>{book.author}</div>
                  </div>
                  {/* Tags */}
                  {Array.isArray(book.spirit_tags) && book.spirit_tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginBottom: 10 }}>
                      {book.spirit_tags.slice(0, 6).map((t: string) => (
                        <span key={t} style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: '#c084fc', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 3, padding: '2px 6px' }}>{t}</span>
                      ))}
                    </div>
                  )}
                  {/* Summary status */}
                  {sstat === 'pending' && (
                    <button
                      onClick={() => handleGenerateSummary(book.id)}
                      disabled={summaryingId === book.id}
                      style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: LG, background: 'rgba(201,168,76,0.08)', border: `1px solid ${BDR}`, borderRadius: 4, padding: '5px 12px', cursor: 'pointer', marginBottom: 12 }}
                    >✦ Generate Summary</button>
                  )}
                  {(sstat === 'processing' || summaryingId === book.id) && (
                    <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.08em', marginBottom: 12 }}>⏳ Analyzing...</div>
                  )}
                  {sstat === 'failed' && (
                    <div style={{ marginBottom: 12 }}>
                      <span style={{ fontFamily: crimson, fontSize: 12, color: '#f87171' }}>Summary failed: {book.summary_error || 'Unknown error'}</span>
                      <button onClick={() => handleGenerateSummary(book.id)} style={{ marginLeft: 10, fontFamily: cinzel, fontSize: 8, color: LG, background: 'none', border: `1px solid ${BDR}`, borderRadius: 3, padding: '3px 8px', cursor: 'pointer' }}>Retry</button>
                    </div>
                  )}
                  {summaryErrors[book.id] && (
                    <div style={{ fontFamily: crimson, fontSize: 12, color: '#f87171', marginBottom: 10 }}>Error: {summaryErrors[book.id]}</div>
                  )}
                  {sstat === 'complete' && sum && (
                    <div style={{ marginBottom: 12 }}>
                      <p style={{ fontFamily: crimson, fontSize: 13, color: LTXT, lineHeight: 1.7, margin: '0 0 10px' }}>{sum.summary}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' as const }}>
                        {wrel && (
                          <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: relColor, border: `1px solid ${relColor}44`, borderRadius: 4, padding: '2px 8px' }}>
                            {wrel.toUpperCase()} RELEVANCE
                          </span>
                        )}
                        {Array.isArray(sum.key_topics) && sum.key_topics.slice(0, 5).map((t: string) => (
                          <span key={t} style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR}`, borderRadius: 3, padding: '2px 6px' }}>{t}</span>
                        ))}
                      </div>
                      {Array.isArray(sum.key_quotes) && sum.key_quotes.length > 0 && (
                        <div style={{ marginBottom: 6 }}>
                          {sum.key_quotes.map((q: string, i: number) => (
                            <p key={i} style={{ fontFamily: crimson, fontSize: 12, color: LMUT, fontStyle: 'italic', margin: '2px 0' }}>"{q}"</p>
                          ))}
                        </div>
                      )}
                      {sum.minister_note && (
                        <p style={{ fontFamily: crimson, fontSize: 12, color: LMUT, fontStyle: 'italic', margin: '4px 0 0' }}>{sum.minister_note}</p>
                      )}
                    </div>
                  )}
                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    <button
                      onClick={() => { setApproveExpanded(isApproveOpen ? null : book.id); setRejectExpanded(null) }}
                      style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}
                    >{isApproveOpen ? 'Cancel' : '✓ APPROVE'}</button>
                    <button
                      onClick={() => { setRejectExpanded(isRejectOpen ? null : book.id); setApproveExpanded(null) }}
                      style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}
                    >{isRejectOpen ? 'Cancel' : '✗ REJECT'}</button>
                  </div>
                  {isApproveOpen && (
                    <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(74,222,128,0.04)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 6 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: cinzel, fontSize: 9, color: LTXT, marginBottom: 10, cursor: 'pointer' }}>
                        <input type="checkbox" checked={!!pdConfirmed[book.id]} onChange={e => setPdConfirmed(p => ({ ...p, [book.id]: e.target.checked }))} />
                        Public domain confirmed
                      </label>
                      <button
                        onClick={() => handleLibraryApprove(book.id, 'approve')}
                        disabled={approvingId === book.id}
                        style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: '#0D0B14', background: '#4ade80', border: 'none', borderRadius: 4, padding: '7px 16px', cursor: 'pointer' }}
                      >Confirm Approve</button>
                    </div>
                  )}
                  {isRejectOpen && (
                    <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6 }}>
                      <textarea
                        value={rejectReasons[book.id] || ''}
                        onChange={e => setRejectReasons(p => ({ ...p, [book.id]: e.target.value }))}
                        placeholder="Reason (optional)"
                        rows={2}
                        style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.04)', border: `1px solid ${BDR}`, borderRadius: 4, padding: '6px 10px', color: LTXT, fontFamily: crimson, fontSize: 13, outline: 'none', resize: 'vertical' as const, marginBottom: 8 }}
                      />
                      <button
                        onClick={() => handleLibraryApprove(book.id, 'reject')}
                        disabled={approvingId === book.id}
                        style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 4, padding: '7px 16px', cursor: 'pointer' }}
                      >Confirm Reject</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ══ AI KNOWLEDGE BASE ══════════════════════════════════════════════════ */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: kbExpanded ? 12 : 0 }}>
          <button
            onClick={() => setKbExpanded(e => !e)}
            style={{ background: 'none', border: 'none', color: LG, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', cursor: 'pointer', padding: 0 }}
          >
            {kbExpanded ? '▲' : '▼'} 🧠 AI Knowledge Base (ingestion)
          </button>
          {kbExpanded && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {retagProgress && (
                <span style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.06em' }}>
                  {retagRunning ? `Re-tagging ${retagProgress.done}/${retagProgress.total}…` : `✓ ${retagProgress.updated} updated`}
                </span>
              )}
              <button onClick={retagAllBooks} disabled={retagRunning}
                style={{ background: 'transparent', border: `1px solid rgba(92,124,191,0.5)`, borderRadius: 5, color: '#8BA3D4', fontFamily: cinzel, fontSize: 9, padding: '5px 12px', cursor: retagRunning ? 'wait' : 'pointer', letterSpacing: '0.06em', opacity: retagRunning ? 0.6 : 1, whiteSpace: 'nowrap' as const }}
              >{retagRunning ? '✦ Re-tagging…' : '✦ Re-run AI Tags'}</button>
            </div>
          )}
        </div>

        {kbExpanded && (<>

        {/* ── Upload error banner ── */}
        {uploadError && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 8, padding: '12px 16px', marginBottom: 14, marginTop: 14 }}>
            <span style={{ fontFamily: crimson, fontSize: 13, color: 'rgba(248,113,113,0.95)', flex: 1 }}>⚠ {uploadError}</span>
            <button onClick={() => setUploadError(null)} style={{ background: 'none', border: 'none', color: 'rgba(248,113,113,0.8)', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>✕</button>
          </div>
        )}

        {/* ── AI dropzone ── */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOverAi(true) }}
          onDragLeave={() => setDragOverAi(false)}
          onDrop={e => { e.preventDefault(); e.stopPropagation(); setDragOverAi(false); addLibraryFiles(e.dataTransfer.files, false) }}
          onDragEnter={e => { e.preventDefault(); e.stopPropagation() }}
          onClick={() => fileInputRef.current?.click()}
          style={{ border: `2px dashed ${dragOverAi ? LG : 'rgba(201,168,76,0.35)'}`, borderRadius: 8, padding: '18px', marginBottom: 16, marginTop: 14, cursor: 'pointer', background: dragOverAi ? 'rgba(201,168,76,0.06)' : 'transparent', transition: 'all 0.15s', textAlign: 'center' as const }}
        >
          <input ref={fileInputRef} type="file" multiple accept=".txt,.docx" style={{ display: 'none' }}
            onChange={e => { if (e.target.files) addLibraryFiles(e.target.files, false); e.target.value = '' }} />
          <div style={{ fontFamily: cinzel, fontSize: 11, color: LG, letterSpacing: '0.06em', marginBottom: 3 }}>Drop TXT or DOCX files — AI will extract and index content</div>
          <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT }}>or click to select · Max 50MB per file</div>
        </div>

        {/* ── DUPLICATE WARNINGS ── */}
        {duplicateWarnings.map((dw, idx) => (
          <div key={idx} style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.35)', borderRadius: 8, padding: 16, marginBottom: 10 }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, color: 'rgba(248,113,113,0.9)', letterSpacing: '0.08em', marginBottom: 8 }}>⚠ POSSIBLE DUPLICATE DETECTED</div>
            <div style={{ fontFamily: crimson, fontSize: 13, color: LTXT, marginBottom: 12 }}>
              "{dw.file.name}" may already exist as "{dw.match.title || dw.match.filename || 'Unknown'}"
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              <button
                onClick={() => setDuplicateWarnings(prev => prev.filter((_, i) => i !== idx))}
                style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 4, padding: '6px 14px', fontSize: 10, color: 'rgba(248,113,113,0.8)', fontFamily: cinzel, cursor: 'pointer', letterSpacing: '0.06em' }}>
                ✕ Cancel Upload
              </button>
              <button
                onClick={() => {
                  setDuplicateWarnings(prev => prev.filter((_, i) => i !== idx))
                  setStagedFiles(prev => [...prev, {
                    id: crypto.randomUUID(),
                    file: dw.file,
                    title: dw.file.name.replace(/\.[^/.]+$/, '').replace(/^(\d+[-_\s]*)+/, '').replace(/[-_]/g, ' ').trim(),
                    author: '', notes: '', spirit_tags: [], sourceType: 'christian' as const,
                    status: 'pending' as const,
                    aiGenerated: false,
                  }])
                }}
                style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 4, padding: '6px 14px', fontSize: 10, color: LG, fontFamily: cinzel, cursor: 'pointer', letterSpacing: '0.06em' }}>
                ↑ Upload Anyway (New Version)
              </button>
              <button
                onClick={() => {
                  setDuplicateWarnings(prev => prev.filter((_, i) => i !== idx))
                  setHighlightedBookId(dw.match.id)
                  setTimeout(() => setHighlightedBookId(null), 3000)
                }}
                style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 4, padding: '6px 14px', fontSize: 10, color: 'rgba(201,168,76,0.6)', fontFamily: cinzel, cursor: 'pointer', letterSpacing: '0.06em' }}>
                → View Existing Entry
              </button>
            </div>
          </div>
        ))}

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
                    {(() => { const dupReason = checkDuplicate(sf.file, books); return dupReason ? (
                      <div style={{ background: 'rgba(212,82,74,0.12)', border: '1px solid rgba(212,82,74,0.35)', borderRadius: 5, padding: '4px 10px', marginBottom: 8, fontFamily: cinzel, fontSize: 8, color: '#D4524A', letterSpacing: '0.06em' }}>
                        ⚠ POSSIBLE DUPLICATE — {dupReason}
                      </div>
                    ) : null })()}
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
                    <div style={{ marginTop: 10 }}>
                      <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>SOURCE CLASSIFICATION</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button type="button" onClick={() => updateStaged(sf.id, { sourceType: 'christian' })} disabled={busy}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 4, border: (sf.sourceType ?? 'christian') === 'christian' ? `1px solid ${LG}` : `1px solid ${LBDR}`, background: (sf.sourceType ?? 'christian') === 'christian' ? 'rgba(201,168,76,0.15)' : 'transparent', color: (sf.sourceType ?? 'christian') === 'christian' ? LG : LMUT, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: busy ? 'default' : 'pointer', transition: 'all 0.15s' }}>
                          + Christian Source
                        </button>
                        <button type="button" onClick={() => updateStaged(sf.id, { sourceType: 'intelligence' })} disabled={busy}
                          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 4, border: (sf.sourceType ?? 'christian') === 'intelligence' ? '1px solid rgba(239,68,68,0.6)' : `1px solid ${LBDR}`, background: (sf.sourceType ?? 'christian') === 'intelligence' ? 'rgba(127,29,29,0.6)' : 'transparent', color: (sf.sourceType ?? 'christian') === 'intelligence' ? '#f87171' : LMUT, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em', cursor: busy ? 'default' : 'pointer', transition: 'all 0.15s' }}>
                          ! Intelligence Only
                        </button>
                      </div>
                      {(sf.sourceType ?? 'christian') === 'intelligence' && (
                        <div style={{ fontFamily: crimson, fontSize: 11, color: 'rgba(248,113,113,0.6)', marginTop: 4, lineHeight: 1.5 }}>
                          AI will treat this as enemy source material. Tactics and spirit names extracted for counterintelligence only. Never presented as endorsed practice.
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── AI book list ── */}
        {booksLoading ? (
          <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, fontStyle: 'italic', padding: '20px 0' }}>Loading library...</div>
        ) : aiBooks.length === 0 ? (
          <div style={{ background: LSURF, border: `1px solid ${LBDR}`, borderRadius: 8, padding: '24px', textAlign: 'center' as const }}>
            <div style={{ fontFamily: cinzel, fontSize: 13, color: LMUT, marginBottom: 8 }}>No AI knowledge books yet</div>
            <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT }}>Upload TXT or DOCX files above to give the AI your theological framework.</div>
          </div>
        ) : (
          <div>
            {batchProgress && (
              <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: 8, padding: '14px 16px', marginBottom: 16 }}>
                <div style={{ fontFamily: cinzel, fontSize: 10, color: LG, letterSpacing: '0.12em', marginBottom: 10 }}>
                  {batchProgress.action} — {batchProgress.current} / {batchProgress.total}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 4, height: 5, marginBottom: 10 }}>
                  <div style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%`, height: '100%', background: LG, borderRadius: 4, transition: 'width 0.4s ease' }} />
                </div>
                {batchProgress.done && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: crimson, fontSize: 13, color: '#4CAF7D' }}>
                      ✓ Complete{batchProgress.errors.length > 0 ? ` — ${batchProgress.errors.length} errors` : ''}
                    </span>
                    <button onClick={() => setBatchProgress(null)} style={{ background: 'transparent', border: `1px solid rgba(201,168,76,0.3)`, borderRadius: 5, padding: '4px 12px', fontFamily: cinzel, fontSize: 9, color: '#b8a98a', cursor: 'pointer', letterSpacing: '0.06em' }}>DISMISS</button>
                  </div>
                )}
                {batchProgress.done && batchProgress.errors.length > 0 && (
                  <div style={{ marginTop: 8 }}>{batchProgress.errors.map((e, i) => <div key={i} style={{ fontFamily: crimson, fontSize: 12, color: '#D4524A' }}>{e}</div>)}</div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' as const }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={selectAllBooks && selectedBooks.size === aiBooks.length} onChange={e => { setSelectAllBooks(e.target.checked); setSelectedBooks(e.target.checked ? new Set(aiBooks.map(b => b.id)) : new Set()) }} style={{ accentColor: LG, width: 15, height: 15 }} />
                <span style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.12em' }}>
                  {aiBooks.length} book{aiBooks.length !== 1 ? 's' : ''} · {aiBooks.filter(b => b.is_indexed).length} indexed
                </span>
              </label>
              <button onClick={() => { const ids = aiBooks.filter(b => !b.is_indexed).map(b => b.id); setSelectedBooks(new Set(ids)) }} style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: 'rgba(201,168,76,0.6)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>SELECT NOT INDEXED</button>
              <button onClick={() => setSelectedBooks(new Set([...duplicateIds].filter(id => aiBooks.some(b => b.id === id))))} style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: 'rgba(212,82,74,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>SELECT DUPLICATES</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {aiBooks.map(book => {
                const isEditing        = editingId === book.id
                const hasNumericPrefix = /^\d+[-\s]/.test(book.title || '')
                return (
                  <div key={book.id} style={{ background: selectedBooks.has(book.id) ? 'rgba(201,168,76,0.04)' : LSURF, border: `1px solid ${selectedBooks.has(book.id) ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.22)'}`, borderLeft: `3px solid ${book.active !== false ? LG : 'rgba(201,168,76,0.25)'}`, borderRadius: 8, padding: '14px 18px', opacity: book.active !== false ? 1 : 0.6, transition: 'all 0.15s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                      {/* Checkbox */}
                      <input type="checkbox" checked={selectedBooks.has(book.id)} onChange={e => { setSelectedBooks(prev => { const next = new Set(prev); e.target.checked ? next.add(book.id) : next.delete(book.id); return next }) }} style={{ accentColor: LG, width: 15, height: 15, cursor: 'pointer', flexShrink: 0, marginTop: 2 }} />
                      {/* Left: indexed status + title / author / meta / tags */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' as const }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: book.is_indexed ? '#4ade80' : '#f59e0b', flexShrink: 0 }} title={book.is_indexed ? 'Indexed' : 'Pending extraction'} />
                          <div style={{ fontFamily: cinzel, fontSize: 13, color: LTXT, letterSpacing: '0.04em' }}>{book.title}</div>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 10, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', background: book.is_indexed ? 'rgba(76,175,77,0.15)' : 'rgba(201,168,76,0.1)', border: `1px solid ${book.is_indexed ? 'rgba(76,175,77,0.4)' : 'rgba(201,168,76,0.25)'}`, color: book.is_indexed ? '#4CAF7D' : 'rgba(201,168,76,0.6)', flexShrink: 0 }}>
                            {book.is_indexed ? '✓ INDEXED' : '○ NOT INDEXED'}
                          </span>
                          {duplicateIds.has(book.id) && (
                            <span style={{ padding: '2px 7px', borderRadius: 10, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', background: 'rgba(212,82,74,0.12)', border: '1px solid rgba(212,82,74,0.3)', color: '#D4524A', flexShrink: 0 }}>⚠ DUPLICATE</span>
                          )}
                        </div>
                        {book.author && book.author !== 'Unknown' && (
                          <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT, marginBottom: 4, fontStyle: 'italic' }}>{book.author}</div>
                        )}
                        <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.06em', marginBottom: book.notes ? 6 : 0 }}>
                          {book.is_indexed ? '● INDEXED' : '○ PENDING'} · {fmtBytes(book.file_size)}
                          {book.created_at ? ` · ${new Date(book.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                        </div>
                        {book.notes && (
                          <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT, fontStyle: 'italic', marginBottom: 4 }}>{book.notes}</div>
                        )}
                        {Array.isArray(book.spirit_tags) && book.spirit_tags.length > 0 && !isEditing && (
                          <SpiritTagEditor tags={book.spirit_tags} onChange={() => {}} readOnly />
                        )}
                      </div>

                      {/* Right: action buttons */}
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0, flexWrap: 'wrap' as const, justifyContent: 'flex-end' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontFamily: cinzel, fontSize: 7, color: LMUT, letterSpacing: '0.08em' }}>VIS</span>
                          <button onClick={() => toggleBook(book.id, !(book.active !== false))}
                            style={{ width: 34, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer', background: book.active !== false ? LG : 'rgba(255,255,255,0.12)', position: 'relative' as const, transition: 'background 0.2s', padding: 0 }}>
                            <div style={{ position: 'absolute' as const, top: 2, left: book.active !== false ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                          </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ fontFamily: cinzel, fontSize: 7, color: LMUT, letterSpacing: '0.08em' }}>AI</span>
                          <button onClick={() => toggleAiEnabled(book.id, !book.ai_generated)}
                            style={{ width: 34, height: 18, borderRadius: 9, border: 'none', cursor: 'pointer', background: book.ai_generated ? '#5C7CBF' : 'rgba(255,255,255,0.12)', position: 'relative' as const, transition: 'background 0.2s', padding: 0 }}
                            title={book.ai_generated ? 'AI-generated: ON' : 'AI-generated: OFF'}>
                            <div style={{ position: 'absolute' as const, top: 2, left: book.ai_generated ? 17 : 2, width: 14, height: 14, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
                          </button>
                        </div>
                        {hasNumericPrefix && !isEditing && (
                          <button onClick={() => cleanTitle(book)}
                            style={{ background: 'transparent', border: `1px solid rgba(201,168,76,0.35)`, borderRadius: 5, color: LMUT, fontFamily: cinzel, fontSize: 9, padding: '4px 8px', cursor: 'pointer', letterSpacing: '0.06em' }}
                            title="Strip leading numeric prefix from title">✂ Clean</button>
                        )}
                        {!isEditing && (
                          <button onClick={() => reanalyzeBook(book.id)} disabled={reanalyzeId === book.id}
                            style={{ background: 'transparent', border: '1px solid rgba(92,124,191,0.5)', borderRadius: 5, color: reanalyzeId === book.id ? '#4a6a9a' : '#5C7CBF', fontFamily: cinzel, fontSize: 9, padding: '4px 10px', cursor: reanalyzeId === book.id ? 'not-allowed' : 'pointer', letterSpacing: '0.06em' }}
                            title="Re-analyze: extract text + AI spirit tags">
                            {reanalyzeId === book.id ? '⏳ Analyzing…' : '⚡ Re-analyze'}
                          </button>
                        )}
                        {reanalyzeErrors[book.id] && reanalyzeId !== book.id && (
                          <span style={{ fontFamily: 'monospace', fontSize: 10, color: '#f87171', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={reanalyzeErrors[book.id]}>
                            {reanalyzeErrors[book.id]}
                          </span>
                        )}
                        {!isEditing && book.is_indexed && (
                          <button onClick={() => handleGenerateSuggestions(book.id)} disabled={enrichingId === book.id}
                            style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 5, color: enrichingId === book.id ? '#6b5e30' : '#C9A84C', fontFamily: cinzel, fontSize: 9, padding: '4px 10px', cursor: enrichingId === book.id ? 'not-allowed' : 'pointer', letterSpacing: '0.06em' }}
                            title="Generate enrichment suggestions from this book">
                            {enrichingId === book.id ? '⏳ Scanning…' : '🔗 GENERATE SUGGESTIONS'}
                          </button>
                        )}
                        {enrichErrors[book.id] && enrichingId !== book.id && (
                          <span style={{ fontFamily: 'monospace', fontSize: 10, color: enrichErrors[book.id].startsWith('✓') ? '#4a7a4a' : '#f87171', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }} title={enrichErrors[book.id]}>
                            {enrichErrors[book.id]}
                          </span>
                        )}
                        <button onClick={() => isEditing ? cancelEdit() : openEdit(book)}
                          style={{ background: isEditing ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.10)', border: '1px solid rgba(201,168,76,0.6)', borderRadius: 5, color: LG, fontFamily: cinzel, fontSize: 9, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.06em', fontWeight: 600 }}
                          title={isEditing ? 'Close editor' : 'Edit title, author, notes, spirit tags'}>
                          {isEditing ? '✕ Close' : '✎ Edit'}
                        </button>
                        <button onClick={() => deleteBook(book.id, book.file_path, book.title)}
                          style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#f87171', fontFamily: cinzel, fontSize: 9, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Inline Edit Panel */}
                    {isEditing && (
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid rgba(201,168,76,0.2)` }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <span style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.12em', textTransform: 'uppercase' as const }}>Edit Metadata</span>
                          <button onClick={aiRenameInPanel} disabled={editLoading}
                            style={{ background: 'transparent', border: `1px solid rgba(92,124,191,0.5)`, borderRadius: 5, color: '#8BA3D4', fontFamily: cinzel, fontSize: 9, padding: '4px 10px', cursor: editLoading ? 'wait' : 'pointer', letterSpacing: '0.06em', opacity: editLoading ? 0.6 : 1 }}>
                            {editLoading ? '✦ Analyzing…' : '✦ AI Rename'}
                          </button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                          <div>
                            <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>TITLE</label>
                            <input value={editForm.title} onChange={e => setEditForm(p => ({ ...p, title: e.target.value }))} style={{ ...inp, fontSize: 12, padding: '6px 10px' }} />
                          </div>
                          <div>
                            <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>AUTHOR</label>
                            <input value={editForm.author} onChange={e => setEditForm(p => ({ ...p, author: e.target.value }))} style={{ ...inp, fontSize: 12, padding: '6px 10px' }} />
                          </div>
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>NOTES</label>
                          <textarea value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} rows={2} style={{ ...inp, fontSize: 12, padding: '6px 10px', resize: 'vertical' as const }} />
                        </div>
                        <div style={{ marginBottom: 8 }}>
                          <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 3 }}>TOPIC</label>
                          <select value={editForm.topic} onChange={e => setEditForm(p => ({ ...p, topic: e.target.value }))} style={{ ...inp, fontSize: 12, padding: '6px 10px' }}>
                            {['Spiritual Warfare','Deliverance Ministry','Inspirational / Faith','Prayer & Intercession','Ministry Training','Devotional',"Men's Ministry",'Healing & Wholeness','Generational / Bloodline','Scripture Study'].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ marginBottom: 14 }}>
                          <label style={{ fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>SPIRIT TAGS</label>
                          <SpiritTagEditor tags={editForm.spirit_tags} onChange={tags => setEditForm(p => ({ ...p, spirit_tags: tags }))} />
                        </div>
                        <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', cursor: 'pointer' }}>
                            <input type="checkbox" checked={editForm.active} onChange={e => setEditForm(p => ({ ...p, active: e.target.checked }))} style={{ accentColor: LG }} />
                            ACTIVE (visible to AI)
                          </label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontFamily: cinzel, fontSize: 8, color: LMUT, letterSpacing: '0.08em', cursor: 'pointer' }}>
                            <input type="checkbox" checked={editForm.ai_generated} onChange={e => setEditForm(p => ({ ...p, ai_generated: e.target.checked }))} style={{ accentColor: '#5C7CBF' }} />
                            AI CONTEXT ENABLED
                          </label>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={saveEdit} style={{ background: LG, color: '#0D0B14', border: 'none', borderRadius: 5, fontFamily: cinzel, fontSize: 9, padding: '6px 18px', cursor: 'pointer', letterSpacing: '0.06em', fontWeight: 700 }}>✦ Save</button>
                          <button onClick={cancelEdit} style={{ background: 'transparent', border: `1px solid ${LBDR}`, borderRadius: 5, color: LMUT, fontFamily: cinzel, fontSize: 9, padding: '6px 14px', cursor: 'pointer', letterSpacing: '0.06em' }}>Cancel</button>
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
        </>)}
      </div>

      {/* ══ READING LIBRARY ══════════════════════════════════════════════════════ */}
      <div style={{ marginTop: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14 }}>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.18)' }} />
          <div style={{ fontFamily: cinzel, fontSize: 15, color: LG, letterSpacing: '0.08em', whiteSpace: 'nowrap' as const }}>📚 PDF Library</div>
          <div style={{ flex: 1, height: 1, background: 'rgba(201,168,76,0.18)' }} />
        </div>
        <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, lineHeight: 1.5, marginBottom: 14 }}>
          PDF books for minister reference. Not AI-indexed — ministers can open and read these documents directly.
        </div>

        {/* Upload error banner (PDF section) */}
        {pdfUploadError && (
          <div style={{ background: 'rgba(212,82,74,0.15)', border: '1px solid rgba(212,82,74,0.4)', borderRadius: 6, padding: '10px 14px', marginBottom: 12, fontFamily: "'Crimson Pro',serif", fontSize: 13, color: '#D4524A', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠ {pdfUploadError}</span>
            <button onClick={() => setPdfUploadError(null)} style={{ background: 'none', border: 'none', color: '#D4524A', cursor: 'pointer', fontSize: 16 }}>✕</button>
          </div>
        )}

        {/* PDF dropzone */}
        <div
          onDrop={handleLibraryDrop}
          onDragOver={e => { e.preventDefault(); e.stopPropagation(); setDragOverPdf(true) }}
          onDragEnter={e => { e.preventDefault(); e.stopPropagation() }}
          onDragLeave={() => setDragOverPdf(false)}
          onClick={() => libraryFileInputRef.current?.click()}
          style={{ border: `2px dashed ${dragOverPdf ? LG : 'rgba(201,168,76,0.35)'}`, borderRadius: 8, padding: '18px', marginBottom: 16, cursor: 'pointer', background: dragOverPdf ? 'rgba(201,168,76,0.06)' : 'transparent', transition: 'all 0.15s', textAlign: 'center' as const }}
        >
          <input
            ref={libraryFileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.docx,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            style={{ display: 'none' }}
            onChange={handleLibraryFileSelect}
          />
          <div style={{ fontFamily: cinzel, fontSize: 11, color: LG, letterSpacing: '0.06em', marginBottom: 3 }}>Drop PDF files — minister reading library</div>
          <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT }}>or click to select · Max 50MB per file</div>
        </div>

        {/* Staged PDF files — upload queue visible regardless of KB section state */}
        {(() => {
          const pdfStaged = stagedFiles.filter(sf => {
            const n = sf.file.name.toLowerCase()
            return n.endsWith('.pdf') || sf.file.type === 'application/pdf' || sf.file.type === 'application/x-pdf'
          })
          if (pdfStaged.length === 0) return null
          const pendingCount = pdfStaged.filter(f => f.status === 'pending').length
          return (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8, marginBottom: 12 }}>
                {pdfStaged.map(sf => (
                  <div key={sf.id} style={{ background: LSURF, border: `1px solid ${sf.status === 'error' ? 'rgba(248,113,113,0.4)' : sf.status === 'done' ? 'rgba(34,197,94,0.3)' : LBDR}`, borderRadius: 8, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>📄</span>
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', gap: 8 }}>
                      <input
                        value={sf.title}
                        onChange={e => updateStaged(sf.id, { title: e.target.value })}
                        style={{ ...inp, fontSize: 12, padding: '5px 10px', flex: 2 }}
                        placeholder="Title"
                        disabled={sf.status !== 'pending'}
                      />
                      <input
                        value={sf.author}
                        onChange={e => updateStaged(sf.id, { author: e.target.value })}
                        style={{ ...inp, fontSize: 12, padding: '5px 10px', flex: 1 }}
                        placeholder="Author"
                        disabled={sf.status !== 'pending'}
                      />
                    </div>
                    <div style={{ flexShrink: 0, minWidth: 80, textAlign: 'right' as const }}>
                      {sf.status === 'done' && <span style={{ color: '#22c55e', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em' }}>✓ DONE</span>}
                      {sf.status === 'uploading' && <span style={{ color: LG, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.06em' }}>Uploading…</span>}
                      {sf.status === 'error' && <span style={{ color: '#f87171', fontFamily: crimson, fontSize: 11 }} title={sf.errorMsg}>✕ {sf.errorMsg?.slice(0, 30)}</span>}
                      {sf.status === 'pending' && (
                        <button onClick={() => setStagedFiles(prev => prev.filter(f => f.id !== sf.id))}
                          style={{ background: 'none', border: 'none', color: LMUT, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>✕</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={handleUploadAll}
                disabled={uploadingAll || pendingCount === 0}
                style={{ padding: '9px 20px', background: 'transparent', border: `1px solid ${LG}`, borderRadius: 6, color: LG, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: uploadingAll || pendingCount === 0 ? 'not-allowed' : 'pointer', opacity: uploadingAll || pendingCount === 0 ? 0.5 : 1 }}
              >
                {uploadingAll ? 'Uploading…' : `Upload ${pendingCount} PDF${pendingCount !== 1 ? 's' : ''}`}
              </button>
            </div>
          )
        })()}

        {/* PDF book list */}
        {booksLoading ? (
          <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT, fontStyle: 'italic', padding: '20px 0' }}>Loading library...</div>
        ) : allPdfBooks.length === 0 ? (
          <div style={{ background: LSURF, border: `1px solid ${LBDR}`, borderRadius: 8, padding: '24px', textAlign: 'center' as const }}>
            <div style={{ fontFamily: cinzel, fontSize: 13, color: LMUT, marginBottom: 8 }}>No PDF books yet</div>
            <div style={{ fontFamily: crimson, fontSize: 13, color: LMUT }}>Upload PDF files above to build your minister reading library.</div>
          </div>
        ) : (
          <div>
            {/* Search bar */}
            <div style={{ position: 'relative' as const, marginBottom: 12 }}>
              <input
                value={bookSearch}
                onChange={e => setBookSearch(e.target.value)}
                placeholder="Search by title, author, or spirit tag..."
                style={{ ...inp, paddingRight: bookSearch ? 32 : 12, fontSize: 13 }}
              />
              {bookSearch && (
                <button onClick={() => setBookSearch('')}
                  style={{ position: 'absolute' as const, right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: LMUT, cursor: 'pointer', fontSize: 14, lineHeight: 1, padding: 0 }}>
                  ✕
                </button>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' as const }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" checked={allPdfBooks.length > 0 && allPdfBooks.every(b => selectedBooks.has(b.id))} onChange={e => { setSelectedBooks(prev => { const next = new Set(prev); allPdfBooks.forEach(b => e.target.checked ? next.add(b.id) : next.delete(b.id)); return next }) }} style={{ accentColor: LG, width: 15, height: 15 }} />
                <span style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.12em' }}>
                  {filteredBooks.length} PDF{filteredBooks.length !== 1 ? 's' : ''}{bookSearch.trim() ? ` of ${allPdfBooks.length}` : ''}
                </span>
              </label>
              <button onClick={() => setSelectedBooks(prev => { const next = new Set(prev); allPdfBooks.filter(b => duplicateIds.has(b.id)).forEach(b => next.add(b.id)); return next })} style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: 'rgba(212,82,74,0.7)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0' }}>SELECT DUPLICATES</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
              {filteredBooks.map(book => (
                <div key={book.id} style={{ background: selectedBooks.has(book.id) ? 'rgba(201,168,76,0.04)' : LSURF, border: `1px solid ${highlightedBookId === book.id ? 'rgba(201,168,76,0.8)' : selectedBooks.has(book.id) ? 'rgba(201,168,76,0.6)' : 'rgba(201,168,76,0.22)'}`, borderLeft: `3px solid ${highlightedBookId === book.id ? '#C9A84C' : 'rgba(201,168,76,0.4)'}`, borderRadius: 8, padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, transition: 'border-color 0.4s, background 0.4s', boxShadow: highlightedBookId === book.id ? '0 0 0 2px rgba(201,168,76,0.2)' : 'none' }}>
                  <input type="checkbox" checked={selectedBooks.has(book.id)} onChange={e => { setSelectedBooks(prev => { const next = new Set(prev); e.target.checked ? next.add(book.id) : next.delete(book.id); return next }) }} style={{ accentColor: LG, width: 15, height: 15, cursor: 'pointer', flexShrink: 0, marginTop: 2 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' as const }}>
                      <span style={{ fontFamily: cinzel, fontSize: 13, color: LTXT, letterSpacing: '0.04em' }}>{book.title}</span>
                      {duplicateIds.has(book.id) && (
                        <span style={{ padding: '2px 7px', borderRadius: 10, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', background: 'rgba(212,82,74,0.12)', border: '1px solid rgba(212,82,74,0.3)', color: '#D4524A', flexShrink: 0 }}>⚠ DUPLICATE</span>
                      )}
                    </div>
                    {book.author && book.author !== 'Unknown' && (
                      <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT, fontStyle: 'italic', marginBottom: 4 }}>{book.author}</div>
                    )}
                    <div style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.06em' }}>
                      PDF · {fmtBytes(book.file_size)}
                      {book.created_at ? ` · ${new Date(book.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                    </div>
                    {book.notes && (
                      <div style={{ fontFamily: crimson, fontSize: 12, color: LMUT, fontStyle: 'italic', marginTop: 4 }}>{book.notes}</div>
                    )}
                    {/* Spirit tags row */}
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap' as const, gap: 4, alignItems: 'center' }}>
                      {Array.isArray(book.spirit_tags) && book.spirit_tags.length > 0 ? (
                        book.spirit_tags.map((tag: string) => (
                          <span key={tag} style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.25)', fontFamily: cinzel, fontSize: 9, color: LG, padding: '2px 8px', borderRadius: 3 }}>{tag}</span>
                        ))
                      ) : (
                        <>
                          <span style={{ fontFamily: cinzel, fontSize: 9, color: LMUT, letterSpacing: '0.04em' }}>No tags</span>
                          <button onClick={() => quickTagBook(book)} disabled={quickTagId === book.id}
                            style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.35)', borderRadius: 3, color: LG, fontFamily: cinzel, fontSize: 9, padding: '2px 8px', cursor: quickTagId === book.id ? 'wait' : 'pointer', letterSpacing: '0.06em', opacity: quickTagId === book.id ? 0.6 : 1 }}>
                            {quickTagId === book.id ? '⏳' : '✦ Tag'}
                          </button>
                        </>
                      )}
                      {book.source_type === 'intelligence' && (
                        <span style={{ background: 'rgba(220,50,50,0.12)', border: '1px solid rgba(220,50,50,0.35)', fontFamily: cinzel, fontSize: 9, color: '#e05c5c', padding: '2px 8px', borderRadius: 3 }}>⚠ Intel Only</span>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'center' }}>
                    {book.file_url && (
                      <a href={book.file_url} target="_blank" rel="noopener noreferrer"
                        style={{ background: 'transparent', border: `1px solid rgba(201,168,76,0.5)`, borderRadius: 5, color: LG, fontFamily: cinzel, fontSize: 9, padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.06em', textDecoration: 'none' }}>
                        ↗ VIEW PDF
                      </a>
                    )}
                    <button onClick={() => deleteBook(book.id, book.file_path, book.title)}
                      style={{ background: 'transparent', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 5, color: '#f87171', fontFamily: cinzel, fontSize: 9, padding: '4px 10px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating batch action bar */}
      {selectedBooks.size > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#1a1508', border: '1px solid rgba(201,168,76,0.4)', borderRadius: 10, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 200, boxShadow: '0 4px 24px rgba(0,0,0,0.6)', whiteSpace: 'nowrap' as const }}>
          <span style={{ fontFamily: cinzel, fontSize: 10, color: LG, letterSpacing: '0.1em' }}>{selectedBooks.size} SELECTED</span>
          <button onClick={handleBatchAutofill} disabled={!!batchProgress && !batchProgress.done} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', background: LG, color: '#0d0b14', border: 'none', borderRadius: 6, padding: '7px 14px', cursor: 'pointer', fontWeight: 700 }}>🧠 AI AUTOFILL</button>
          <button onClick={handleBatchReindex} disabled={!!batchProgress && !batchProgress.done} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.4)', color: LG, borderRadius: 6, padding: '7px 14px', cursor: 'pointer' }}>↺ RE-INDEX</button>
          <button onClick={() => handleBatchToggleActive(true)} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', background: 'rgba(76,175,77,0.15)', border: '1px solid rgba(76,175,77,0.3)', color: '#4CAF7D', borderRadius: 6, padding: '7px 14px', cursor: 'pointer' }}>✓ ACTIVATE</button>
          <button onClick={() => handleBatchToggleActive(false)} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', color: '#888', borderRadius: 6, padding: '7px 14px', cursor: 'pointer' }}>○ DEACTIVATE</button>
          <button onClick={handleBatchDelete} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', background: 'rgba(212,82,74,0.15)', border: '1px solid rgba(212,82,74,0.3)', color: '#D4524A', borderRadius: 6, padding: '7px 14px', cursor: 'pointer' }}>🗑 DELETE</button>
          <button onClick={() => { setSelectedBooks(new Set()); setSelectAllBooks(false) }} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontFamily: cinzel, fontSize: 9, color: '#666' }}>CLEAR</button>
        </div>
      )}
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
  const BDR2 = isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.25)'
  const MUT  = isDark ? '#9a8c74' : '#5C5248'
  const TXT2 = isDark ? '#e8e0d0' : '#2D2924'

  const [demons, setDemons]         = useState<any[]>([])
  const [aiStats, setAiStats]       = useState<any>(null)
  const [memberStats, setMembers]   = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [sotw, setSotw]             = useState<any>(null)
  const [quickStats, setQuickStats]  = useState<any>(null)
  const [sotwForm, setSotwForm]     = useState({ spirit_name: '', minister_note: '', deliverance_tip: '' })
  const [sotwSaving, setSotwSaving] = useState(false)
  const [sotwMsg, setSotwMsg]       = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const token = await getToken()
        const authHdr = { Authorization: `Bearer ${token}` }
        const [dRes, aRes, mRes, sotwRes, qsRes] = await Promise.allSettled([
          fetch('/api/demons').then(r => r.json()),
          fetch('/api/ai-usage', { headers: authHdr }).then(r => r.json()),
          fetch('/api/admin-members', { headers: authHdr }).then(r => r.json()),
          fetch('/api/spirit-of-week').then(r => r.json()),
          fetch('/api/admin-quick-stats', { headers: authHdr }).then(r => r.ok ? r.json() : null),
        ])
        if (dRes.status === 'fulfilled') setDemons(dRes.value.demons || [])
        if (aRes.status === 'fulfilled') setAiStats(aRes.value)
        if (mRes.status === 'fulfilled') setMembers(mRes.value)
        if (qsRes.status === 'fulfilled' && qsRes.value) setQuickStats(qsRes.value)
        if (sotwRes.status === 'fulfilled' && sotwRes.value.sotw) {
          const s = sotwRes.value.sotw
          setSotw(s)
          setSotwForm({ spirit_name: s.spirit_name || '', minister_note: s.minister_note || '', deliverance_tip: s.deliverance_tip || '' })
        }
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

      {/* Quick stats — today's snapshot */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' as const }}>
        {card('AI Calls Today',        quickStats?.callsToday          ?? '…', 'across all members')}
        {card('Pending Testimonies',   quickStats?.pendingTestimonies  ?? '…', 'awaiting review')}
        {card('New This Week',         quickStats?.newMembersThisWeek  ?? '…', 'new members joined')}
        {card('Spirits in Database',   quickStats?.spiritCount         ?? demons.length, 'documented spirits')}
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
                  <span style={{ color: col }}>{tier === 'free' || tier === 'Free' ? 'WATCHMAN' : tier.toUpperCase()}</span>
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
        <div style={{ marginBottom: 24 }}>
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

      {/* Row 6 — Spirit of the Week editor */}
      <div style={{ background: BG2, border: `1px solid ${BDR2}`, borderRadius: 10, padding: 24 }}>
        <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.08em', marginBottom: 4 }}>🎯 Spirit of the Week</div>
        {sotw && (
          <div style={{ fontFamily: crimson, fontSize: 12, color: MUT, marginBottom: 14 }}>
            Current: <strong style={{ color: TXT2 }}>{sotw.spirit_name}</strong>
            {sotw.published_at && <> · set {new Date(sotw.published_at).toLocaleDateString()}</>}
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.08em', marginBottom: 4 }}>SPIRIT NAME</div>
            <input
              value={sotwForm.spirit_name}
              onChange={e => setSotwForm(f => ({ ...f, spirit_name: e.target.value }))}
              placeholder="e.g. Spirit of Fear"
              list="sotw-demon-list"
              style={{ width: '100%', boxSizing: 'border-box' as const, background: isDark ? 'rgba(13,11,20,0.8)' : '#FAF8F5', border: `1px solid ${BDR2}`, borderRadius: 6, padding: '8px 12px', color: TXT2, fontSize: 13, fontFamily: crimson, outline: 'none' }}
            />
            <datalist id="sotw-demon-list">
              {demons.slice(0, 100).map((d: any) => <option key={d.id} value={d.name} />)}
            </datalist>
          </div>
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.08em', marginBottom: 4 }}>MINISTER NOTE</div>
            <textarea
              value={sotwForm.minister_note}
              onChange={e => setSotwForm(f => ({ ...f, minister_note: e.target.value }))}
              placeholder="Why is this spirit on assignment this week? What should warriors know?"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box' as const, background: isDark ? 'rgba(13,11,20,0.8)' : '#FAF8F5', border: `1px solid ${BDR2}`, borderRadius: 6, padding: '8px 12px', color: TXT2, fontSize: 13, fontFamily: crimson, outline: 'none', resize: 'vertical' as const }}
            />
          </div>
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: MUT, letterSpacing: '0.08em', marginBottom: 4 }}>TACTICAL TIP</div>
            <textarea
              value={sotwForm.deliverance_tip}
              onChange={e => setSotwForm(f => ({ ...f, deliverance_tip: e.target.value }))}
              placeholder="A specific deliverance tip or prayer strategy for this week"
              rows={2}
              style={{ width: '100%', boxSizing: 'border-box' as const, background: isDark ? 'rgba(13,11,20,0.8)' : '#FAF8F5', border: `1px solid ${BDR2}`, borderRadius: 6, padding: '8px 12px', color: TXT2, fontSize: 13, fontFamily: crimson, outline: 'none', resize: 'vertical' as const }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              disabled={sotwSaving || !sotwForm.spirit_name.trim()}
              onClick={async () => {
                setSotwSaving(true); setSotwMsg('')
                try {
                  const token = await getToken()
                  const res = await fetch('/api/spirit-of-week', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify(sotwForm),
                  })
                  const d = await res.json()
                  if (res.ok) { setSotw(d.sotw); setSotwMsg('Published') }
                  else setSotwMsg(d.error || 'Error')
                } catch { setSotwMsg('Network error') }
                setSotwSaving(false)
              }}
              style={{ padding: '8px 20px', background: sotwSaving ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.15)', border: `1px solid ${sotwSaving ? BDR2 : 'rgba(201,168,76,0.5)'}`, borderRadius: 6, color: sotwSaving ? MUT : G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: sotwSaving ? 'default' : 'pointer', textTransform: 'uppercase' as const }}
            >{sotwSaving ? 'Publishing...' : '🎯 Publish This Week'}</button>
            {sotwMsg && <span style={{ fontFamily: crimson, fontSize: 12, color: sotwMsg === 'Published' ? '#4ade80' : '#e05c5c' }}>{sotwMsg}</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── FIELD MINISTRY MANAGER ───────────────────────────────────────────────────
function FieldMinistryManager({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const BG2 = isDark ? '#13111a' : '#fff'
  const BDR2 = isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.25)'
  const MUT  = isDark ? '#9a8c74' : '#5C5248'
  const TXT2 = isDark ? '#e8e0d0' : '#2D2924'
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: isDark ? 'rgba(13,11,20,0.8)' : '#FAF8F5',
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
              <tr style={{ background: isDark ? 'rgba(201,168,76,0.06)' : '#FFFFFF' }}>
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
  const BDR2 = isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.25)'
  const MUT  = isDark ? '#9a8c74' : '#5C5248'
  const TXT2 = isDark ? '#e8e0d0' : '#2D2924'
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
  const txt2 = isDark ? TXT : '#2D2924'
  const dim2 = isDark ? DIM : '#6B5520'
  const mut2 = isDark ? '#9a8c74' : '#5C5248'

  // Gap analysis state
  const [gapLoading, setGapLoading] = useState(false)
  const [gapStatus,  setGapStatus]  = useState('')
  const [gapResults, setGapResults] = useState<any[]>([])
  const [gapSummary, setGapSummary] = useState('')
  const [gapMeta, setGapMeta] = useState<{ bookTitles: string[]; spiritCount: number; bookCount: number } | null>(null)
  const [gapError, setGapError] = useState('')
  const [addingSpirit, setAddingSpirit] = useState<any | null>(null)
  const [addSuccess, setAddSuccess] = useState<string | null>(null)
  const [selectedGaps, setSelectedGaps] = useState<number[]>([])
  const [dismissingGap, setDismissingGap] = useState<Set<string>>(new Set())
  const [bulkAdding, setBulkAdding]     = useState(false)
  const [bulkProgress, setBulkProgress] = useState('')
  const [bulkComplete, setBulkComplete] = useState<{ succeeded: number; failed: number; duplicates: number; total: number; newDbTotal: number } | null>(null)
  const [existingSpiritNames, setExistingSpiritNames] = useState<Set<string>>(new Set())
  // Content query state
  const [cqQuery, setCqQuery] = useState('')
  const [cqLoading, setCqLoading] = useState(false)
  const [cqResponse, setCqResponse] = useState('')
  const [cqTitles, setCqTitles] = useState<string[]>([])
  const [cqError, setCqError] = useState('')

  // Reindex state
  const [reindexing, setReindexing] = useState(false)
  const [reindexResult, setReindexResult] = useState<string>('')
  const [reindexErrors, setReindexErrors] = useState<{ filename: string; error: string; code?: string }[]>([])

  async function fetchDemonNames(): Promise<{ names: Set<string>; total: number }> {
    try {
      const res = await fetch('/api/taxonomy-spirits')
      if (!res.ok) return { names: new Set(), total: 0 }
      const data = await res.json()
      const names = new Set<string>((data.spirits || []).map((s: any) => String(s.name).toLowerCase().trim()))
      return { names, total: data.total || names.size }
    } catch {
      return { names: new Set(), total: 0 }
    }
  }

  async function dismissGapItems(items: { name: string; source?: string }[]) {
    const token = await getToken()
    if (!token) return
    await fetch('/api/gap-analysis-dismissed', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items.map(i => ({ spirit_name: i.name, source_book: i.source || null })) }),
    }).catch(() => {})
  }

  async function runGapAnalysis() {
    setGapLoading(true)
    setGapStatus('Analyzing your library... this may take 30–60 seconds')
    setGapResults([])
    setGapSummary('')
    setGapError('')
    setGapMeta(null)
    try {
      const token = await getToken()
      console.log('[FRONTEND] gap-analysis token present:', !!token, 'length:', token?.length)
      const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) reqHeaders['Authorization'] = `Bearer ${token}`

      // Fetch dismissed names in parallel with the analysis
      const [res, dismissedRes] = await Promise.all([
        fetch('/api/library-intelligence', {
          method: 'POST',
          headers: reqHeaders,
          body: JSON.stringify({ tool: 'gap-analysis' }),
        }),
        fetch('/api/gap-analysis-dismissed', { headers: reqHeaders }),
      ])

      const data = await res.json()
      if (!res.ok) { setGapError(data.error || 'Analysis failed'); return }

      const dismissedData = await dismissedRes.json().catch(() => ({}))
      const dismissedNames = new Set<string>((dismissedData.dismissed || []).map((d: any) => (d.spirit_name || '').toLowerCase().trim()))

      // Client-side dedup — fetch fresh Airtable names as belt-and-suspenders
      const { names, total } = await fetchDemonNames()
      setExistingSpiritNames(names)

      const genuinelyNew = (data.gaps || []).filter((g: any) => {
        const nl = (g.name || '').toLowerCase().trim()
        return !names.has(nl) && !dismissedNames.has(nl)
      })
      setGapResults(genuinelyNew)
      setGapSummary(data.summary || '')
      setGapMeta({ bookTitles: data.bookTitles || [], spiritCount: total, bookCount: data.bookCount || 0 })
    } catch (e: any) { setGapError(e.message) }
    setGapStatus('')
    setGapLoading(false)
  }

  async function runContentQuery() {
    if (!cqQuery.trim()) return
    setCqLoading(true)
    setCqResponse('')
    setCqError('')
    try {
      const token = await getToken()
      const reqHeaders: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) reqHeaders['Authorization'] = `Bearer ${token}`
      const res = await fetch('/api/library-intelligence', {
        method: 'POST',
        headers: reqHeaders,
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
    setReindexErrors([])
    try {
      const token = await getToken()
      const res = await fetch('/api/library-backfill', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const text = await res.text()
      let data: any = {}
      try { data = text ? JSON.parse(text) : {} } catch { data = { error: text } }
      if (!res.ok) { setReindexResult(`Error: ${data.error || data.errorMessage || `Request failed ${res.status}`}`); return }
      setReindexResult(data.message || `Reindex complete: ${data.processed} books indexed, ${data.skippedFormat ?? data.skippedNonPdf ?? 0} skipped (unsupported format), ${data.skipped ?? 0} already indexed${data.errors ? `, ${data.errors} errors` : ''}.`)
      if (data.errorDetails && data.errorDetails.length > 0) setReindexErrors(data.errorDetails)
    } catch (e: any) { setReindexResult(`Error: ${e.message}`) }
    setReindexing(false)
  }

  async function fetchSpiritAIData(name: string): Promise<Record<string, string>> {
    try {
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `You are a demonic intelligence specialist. Provide structured data for the demon/spirit named "${name}" for a deliverance ministry database.\n\nReturn ONLY this JSON (no markdown):\n{\n  "description": "2-3 sentence description of this spirit's nature, function, and how it operates",\n  "kingdom": "one of: Witchcraft, Occult, False Religion / Paganism, Death / Destruction, Deception / Lies, Marine Kingdom, Familiar Spirits, Addiction, Sexual Perversion, Infirmity, Religious Spirit, Pride",\n  "rank": "one of: Principality, Power, World Ruler, Strongman, Common Spirit",\n  "entry_points": "comma-separated list of common entry points",\n  "manifestations": "comma-separated list of common manifestations",\n  "scriptures": "relevant scripture references"\n}`,
          history: [],
        }),
      })
      const data = await res.json()
      const raw = (data.response || '').replace(/^```json\s*/im, '').replace(/```\s*$/im, '').trim()
      const m = raw.match(/\{[\s\S]*\}/)
      try { return JSON.parse(m ? m[0] : raw) } catch { return {} }
    } catch { return {} }
  }

  async function handleAddWithAI(gap: any) {
    const spiritName = gap.name || ''
    // Check client-side cache first; re-fetch from Airtable if cache is empty
    let names = existingSpiritNames
    if (names.size === 0) {
      const fresh = await fetchDemonNames()
      names = fresh.names
      setExistingSpiritNames(fresh.names)
    }
    if (names.has(spiritName.toLowerCase().trim())) {
      // Mark row as already-in-DB (shows amber badge instead of button)
      setGapResults(prev => prev.map((r: any) =>
        (r.name || '') === spiritName ? { ...r, alreadyInDb: true } : r
      ))
      return
    }
    setAddingSpirit({ name: spiritName, suggested_kingdom: gap.suggested_kingdom || '', context: gap.description || '', source: gap.source || '', loading: true })
    const aiData = await fetchSpiritAIData(spiritName)
    setAddingSpirit((prev: any) => prev ? {
      ...prev,
      suggested_kingdom: aiData.kingdom || prev.suggested_kingdom,
      context: aiData.description || prev.context,
      rank: aiData.rank || '',
      entry_points: aiData.entry_points || '',
      manifestations: aiData.manifestations || '',
      scriptures: aiData.scriptures || '',
      loading: false,
    } : null)
  }

  async function handleBulkAddToDb() {
    setBulkAdding(true)
    setBulkComplete(null)
    setBulkProgress('Checking existing database...')

    // Fetch fresh list to pre-filter before sending anything
    const { names: freshNames } = await fetchDemonNames()
    setExistingSpiritNames(freshNames)

    const allSelected = selectedGaps.map(i => gapResults[i])
    const toAdd = allSelected.filter(s => !freshNames.has((s.name || '').toLowerCase().trim()))
    const preExisting = allSelected.length - toAdd.length

    let succeeded  = 0
    let failed     = 0
    let duplicates = preExisting  // start with pre-filtered count

    for (let idx = 0; idx < toAdd.length; idx++) {
      const spirit = toAdd[idx]
      setBulkProgress(`Adding ${idx + 1} of ${toAdd.length}: ${spirit.name}...`)

      try {
        const token = await getToken()
        // Get AI data silently — no modal
        let aiFields: Record<string, string> = {
          kingdom: spirit.suggested_kingdom || '',
          rank: '', description: spirit.description || '',
          entry_points: '', manifestations: '', scriptures: '',
        }
        try {
          const aiRes = await fetch('/api/ai-assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: `Provide data for demon/spirit: "${spirit.name}". Return ONLY JSON (no markdown): {"kingdom":"one of: Witchcraft/Occult/False Religion / Paganism/Death / Destruction/Marine Kingdom/Familiar Spirits/Addiction/Sexual Perversion/Infirmity/Religious Spirit/Pride/Rejection/Fear","rank":"one of: Principality/Power/World Ruler/Strongman/Common Spirit","description":"2 sentence description","entry_points":"semicolon separated list","manifestations":"semicolon separated list","scriptures":"1-2 references"}`,
              history: [],
            }),
          })
          const aiData = await aiRes.json()
          const raw  = (aiData.response || '').replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim()
          const match = raw.match(/\{[\s\S]*\}/)
          if (match) {
            try { aiFields = { ...aiFields, ...JSON.parse(match[0]) } } catch {}
          }
        } catch {}

        const addRes = await fetch('/api/admin-demon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: spirit.name,
            kingdom: aiFields.kingdom,
            rank: aiFields.rank,
            description: aiFields.description,
            entry_points: aiFields.entry_points,
            manifestations: aiFields.manifestations,
            scriptures: aiFields.scriptures,
            source: spirit.source || 'Library Gap Analysis',
          }),
        })
        if (addRes.ok) {
          const addData = await addRes.json()
          if (addData.conflict) { duplicates++ } else { succeeded++ }
        } else {
          failed++
          console.error('[BULK-ADD] Failed for:', spirit.name)
        }
      } catch (e) {
        failed++
        console.error('[BULK-ADD] Error on:', spirit.name, e)
      }
      await new Promise(r => setTimeout(r, 300))
    }

    setGapResults((prev: any[]) => prev.filter((_: any, i: number) => !selectedGaps.includes(i)))
    setSelectedGaps([])
    setBulkAdding(false)
    setBulkProgress('')
    setBulkComplete({ succeeded, failed, duplicates, total: allSelected.length, newDbTotal: succeeded })
  }

  async function confirmAdd(spirit: any) {
    try {
      const token = await getToken()
      const spiritName = spirit.name || spirit.spirit_name || ''
      const res = await fetch('/api/admin-demon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: spiritName,
          kingdom: spirit.suggested_kingdom,
          description: spirit.context,
          rank: spirit.rank,
          entry_points: spirit.entry_points,
          manifestations: spirit.manifestations,
          scriptures: spirit.scriptures,
          source: spirit.source,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.conflict) {
          setAddSuccess(`"${spiritName}" is already in the database`)
        } else {
          setAddSuccess(`${spiritName} added — database now has ~${(gapMeta?.spiritCount ?? 0) + 1} spirits`)
        }
        setAddingSpirit(null)
        // Remove from gap results and permanently dismiss
        setGapResults((prev: any[]) => prev.filter((r: any) => (r.name || r.spirit_name) !== spiritName))
        dismissGapItems([{ name: spiritName, source: spirit.source || '' }])
        setTimeout(() => setAddSuccess(null), 5000)
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

      {/* ── Reindex Error Details ── */}
      {reindexErrors.length > 0 && (
        <div style={{ background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 8, padding: '14px 18px', marginBottom: 24 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: '#e09090', letterSpacing: '0.12em', marginBottom: 10 }}>
            REINDEX ERRORS — {reindexErrors.length} FILE{reindexErrors.length !== 1 ? 'S' : ''} FAILED
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, maxHeight: 300, overflowY: 'auto' as const }}>
            {reindexErrors.map((e, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '6px 0', borderBottom: i < reindexErrors.length - 1 ? '1px solid rgba(248,113,113,0.12)' : 'none' }}>
                <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: '#e09090', letterSpacing: '0.06em', flexShrink: 0, marginTop: 2 }}>{e.code || 'ERR'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: dim2, wordBreak: 'break-all' as const }}>{e.filename}</div>
                  <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 11, color: '#e09090', marginTop: 2 }}>{e.error}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tool 1: Spirit Gap Analysis ── */}
      <div style={{ background: surf2, border: `1px solid ${bdr2}`, borderRadius: 10, padding: '24px', marginBottom: 24 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: txt2, marginBottom: 8, letterSpacing: '0.06em' }}>⚔ Spirit Gap Analysis</div>
        <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: dim2, lineHeight: 1.6, marginBottom: 16 }}>
          Scans your ministry library documents and identifies spirits mentioned in your books that are not yet in the War Room Intel database.
        </div>
        <button onClick={runGapAnalysis} disabled={gapLoading} style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', color: '#0D0B14', background: G2, border: 'none', borderRadius: 4, padding: '10px 24px', cursor: gapLoading ? 'wait' : 'pointer', opacity: gapLoading ? 0.7 : 1, marginBottom: 8 }}>
          {gapLoading ? '🔍 Analyzing library against database...' : '⚔ Find Spirits Not In My Database'}
        </button>
        {gapLoading && gapStatus && (
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: '#6b5e45', letterSpacing: '0.1em', marginBottom: 12 }}>
            {gapStatus}
          </div>
        )}
        {gapError && <div style={{ color: '#e09090', fontFamily: "'Crimson Pro', serif", fontSize: 13, marginBottom: 12 }}>⚠ {gapError}</div>}
        {addSuccess && <div style={{ color: '#80e090', fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.08em', marginBottom: 12 }}>✓ {addSuccess} added to database</div>}
        {gapMeta && (
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', color: mut2, marginBottom: 12 }}>
            Scanned {gapMeta.bookCount} book{gapMeta.bookCount !== 1 ? 's' : ''} · {gapMeta.spiritCount} spirits already in database
            {gapMeta.bookTitles.length > 0 && ` · ${gapMeta.bookTitles.join(' · ')}`}
          </div>
        )}
        {gapResults.length > 0 && (
          <div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: G2, letterSpacing: '0.1em', marginBottom: 12 }}>
              {gapResults.length} SPIRITS IN LIBRARY NOT YET IN DATABASE
            </div>
            {gapSummary && (
              <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: dim2, marginBottom: 16, fontStyle: 'italic' }}>
                {gapSummary}
              </div>
            )}
            {/* Bulk actions toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'rgba(201,168,76,0.04)', border: `1px solid ${bdr2}`, borderRadius: 6, marginBottom: 16 }}>
              <input
                type="checkbox"
                checked={selectedGaps.length === gapResults.length}
                onChange={e => setSelectedGaps(e.target.checked ? gapResults.map((_: any, i: number) => i) : [])}
                style={{ cursor: 'pointer', width: 16, height: 16 }}
              />
              <span style={{ fontFamily: cinzel, fontSize: 10, color: mut2, letterSpacing: '0.08em' }}>
                {selectedGaps.length > 0 ? `${selectedGaps.length} SELECTED` : 'SELECT ALL'}
              </span>
              {selectedGaps.length > 0 && (
                <>
                  <button
                    onClick={handleBulkAddToDb}
                    disabled={bulkAdding}
                    style={{ padding: '6px 14px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${G2}`, borderRadius: 4, color: G2, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
                    {bulkAdding ? 'ADDING...' : `+ ADD ${selectedGaps.length} TO DATABASE`}
                  </button>
                  <button
                    onClick={async () => {
                      const items = selectedGaps.map(i => ({
                        name: gapResults[i].name || gapResults[i].spirit_name || '',
                        source: gapResults[i].source || gapResults[i].source_document || '',
                      })).filter(x => x.name)
                      await dismissGapItems(items)
                      setGapResults((prev: any[]) => prev.filter((_: any, i: number) => !selectedGaps.includes(i)))
                      setSelectedGaps([])
                    }}
                    style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${bdr2}`, borderRadius: 4, color: mut2, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
                    DISMISS SELECTED
                  </button>
                </>
              )}
            </div>
            {bulkAdding && (
              <div style={{ padding: '12px 16px', marginBottom: 12, background: 'rgba(201,168,76,0.06)', border: '1px solid #3a3020', borderRadius: 6, fontFamily: cinzel, fontSize: 10, color: '#C9A84C', letterSpacing: '0.1em' }}>
                ⚡ {bulkProgress}
              </div>
            )}
            {bulkComplete && (
              <div style={{ padding: '12px 16px', marginBottom: 12, background: 'rgba(74,122,74,0.08)', border: '1px solid #4a7a4a', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontFamily: cinzel, fontSize: 10, color: '#4a7a4a', letterSpacing: '0.1em', marginBottom: 4 }}>
                      ✓ BATCH COMPLETE — {bulkComplete.succeeded} SPIRIT{bulkComplete.succeeded !== 1 ? 'S' : ''} ADDED
                      {bulkComplete.duplicates > 0 ? `, ${bulkComplete.duplicates} ALREADY IN DB` : ''}
                      {bulkComplete.failed > 0 ? `, ${bulkComplete.failed} FAILED` : ''}
                    </div>
                    {bulkComplete.newDbTotal > 0 && (
                      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: '#80c080', fontStyle: 'italic' }}>
                        Database now has ~{bulkComplete.newDbTotal} spirits
                      </div>
                    )}
                  </div>
                  <button onClick={() => setBulkComplete(null)} style={{ background: 'transparent', border: 'none', color: '#4a7a4a', cursor: 'pointer', fontSize: 14, flexShrink: 0 }}>×</button>
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              {gapResults.map((r, i) => (
                <div key={i} style={{ padding: '12px 16px', background: 'rgba(201,168,76,0.04)', border: `1px solid ${bdr2}`, borderLeft: `3px solid ${G2}`, borderRadius: 4, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <input
                    type="checkbox"
                    checked={selectedGaps.includes(i)}
                    onChange={e => setSelectedGaps(prev => e.target.checked ? [...prev, i] : prev.filter(x => x !== i))}
                    style={{ cursor: 'pointer', marginTop: 3, flexShrink: 0 }}
                  />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: G2, marginBottom: 4 }}>
                      {r.name || r.spirit_name}
                    </div>
                    {(r.context || r.brief_description) && (
                      <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: dim2, marginBottom: 4, fontStyle: 'italic' }}>
                        "{r.context || r.brief_description}"
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const, gap: 8 }}>
                      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: mut2, letterSpacing: '0.08em', display: 'flex', gap: 12, flexWrap: 'wrap' as const }}>
                        {(r.source || r.source_document) && <span>SOURCE: {r.source || r.source_document}</span>}
                        {r.suggested_kingdom && <span>KINGDOM: {r.suggested_kingdom}</span>}
                        {r.confidence && <span>CONFIDENCE: {r.confidence}</span>}
                      </div>
                      {r.alreadyInDb ? (
                        <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.08em', color: '#d97706', background: 'rgba(217,119,6,0.12)', border: '1px solid rgba(217,119,6,0.4)', borderRadius: 4, padding: '5px 10px', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                          Already in DB
                        </span>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => handleAddWithAI(r)} style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.08em', color: '#0D0B14', background: G2, border: 'none', borderRadius: 4, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                            + Add to DB
                          </button>
                          <button
                            onClick={async () => {
                              const name = r.name || r.spirit_name || ''
                              setDismissingGap(prev => new Set([...prev, name]))
                              await dismissGapItems([{ name, source: r.source || r.source_document || '' }])
                              setGapResults((prev: any[]) => prev.filter((x: any) => (x.name || x.spirit_name) !== name))
                              setDismissingGap(prev => { const s = new Set(prev); s.delete(name); return s })
                            }}
                            style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.08em', color: mut2, background: 'transparent', border: `1px solid ${bdr2}`, borderRadius: 4, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                            {dismissingGap.has(r.name || r.spirit_name || '') ? '…' : 'Dismiss'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
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

      {/* Add to DB modal — AI-enhanced */}
      {addingSpirit && (
        <div onClick={() => setAddingSpirit(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: surf2, border: `1px solid ${G2}55`, borderRadius: 10, padding: 28, maxWidth: 480, width: '100%', maxHeight: '85vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: cinzel, fontSize: 13, color: G2, marginBottom: 16, letterSpacing: '0.08em' }}>Add to Database</div>
            {addingSpirit.loading && (
              <div style={{ fontFamily: cinzel, fontSize: 9, color: G2, letterSpacing: '0.1em', marginBottom: 14 }}>
                ⚡ AI POPULATING FIELDS...
              </div>
            )}
            {/* Name */}
            <div style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: dim2, textTransform: 'uppercase' as const, marginBottom: 4 }}>NAME</div>
            <input
              value={addingSpirit.name || ''}
              onChange={e => setAddingSpirit((s: any) => ({ ...s, name: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(0,0,0,0.2)', border: `1px solid ${bdr2}`, borderRadius: 4, padding: '8px 10px', color: txt2, fontFamily: crimson, fontSize: 13, outline: 'none', marginBottom: 12 }}
            />
            {/* Kingdom */}
            <div style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: dim2, textTransform: 'uppercase' as const, marginBottom: 4 }}>KINGDOM</div>
            <select
              value={addingSpirit.suggested_kingdom || ''}
              onChange={e => setAddingSpirit((s: any) => ({ ...s, suggested_kingdom: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(0,0,0,0.2)', border: `1px solid ${bdr2}`, borderRadius: 4, padding: '8px 10px', color: txt2, fontFamily: crimson, fontSize: 13, outline: 'none', marginBottom: 12 }}>
              <option value="">Select kingdom...</option>
              <option>Witchcraft</option>
              <option>Occult</option>
              <option>False Religion / Paganism</option>
              <option>Death / Destruction</option>
              <option>Deception / Lies</option>
              <option>Marine Kingdom</option>
              <option>Familiar Spirits</option>
              <option>Addiction</option>
              <option>Sexual Perversion</option>
              <option>Infirmity</option>
              <option>Religious Spirit</option>
              <option>Pride</option>
              <option>Rejection</option>
              <option>Fear</option>
            </select>
            {/* Description */}
            <div style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: dim2, textTransform: 'uppercase' as const, marginBottom: 4 }}>DESCRIPTION</div>
            <textarea
              value={addingSpirit.context || ''}
              onChange={e => setAddingSpirit((s: any) => ({ ...s, context: e.target.value }))}
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(0,0,0,0.2)', border: `1px solid ${bdr2}`, borderRadius: 4, padding: '8px 10px', color: txt2, fontFamily: crimson, fontSize: 13, outline: 'none', resize: 'vertical' as const, marginBottom: 12 }}
            />
            {/* Rank */}
            <div style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: dim2, textTransform: 'uppercase' as const, marginBottom: 4 }}>RANK</div>
            <select
              value={addingSpirit.rank || ''}
              onChange={e => setAddingSpirit((s: any) => ({ ...s, rank: e.target.value }))}
              style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(0,0,0,0.2)', border: `1px solid ${bdr2}`, borderRadius: 4, padding: '8px 10px', color: txt2, fontFamily: crimson, fontSize: 13, outline: 'none', marginBottom: 12 }}>
              <option value="">Select rank...</option>
              <option>Principality</option>
              <option>Power</option>
              <option>World Ruler</option>
              <option>Strongman</option>
              <option>Common Spirit</option>
            </select>
            {/* Entry Points */}
            <div style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: dim2, textTransform: 'uppercase' as const, marginBottom: 4 }}>ENTRY POINTS</div>
            <input
              value={addingSpirit.entry_points || ''}
              onChange={e => setAddingSpirit((s: any) => ({ ...s, entry_points: e.target.value }))}
              placeholder="e.g. Pride, Trauma, Occult contact"
              style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(0,0,0,0.2)', border: `1px solid ${bdr2}`, borderRadius: 4, padding: '8px 10px', color: txt2, fontFamily: crimson, fontSize: 13, outline: 'none', marginBottom: 12 }}
            />
            {/* Manifestations */}
            <div style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: dim2, textTransform: 'uppercase' as const, marginBottom: 4 }}>MANIFESTATIONS</div>
            <input
              value={addingSpirit.manifestations || ''}
              onChange={e => setAddingSpirit((s: any) => ({ ...s, manifestations: e.target.value }))}
              placeholder="e.g. Twisting, confusion, isolation"
              style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(0,0,0,0.2)', border: `1px solid ${bdr2}`, borderRadius: 4, padding: '8px 10px', color: txt2, fontFamily: crimson, fontSize: 13, outline: 'none', marginBottom: 12 }}
            />
            {/* Scriptures */}
            <div style={{ display: 'block', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.12em', color: dim2, textTransform: 'uppercase' as const, marginBottom: 4 }}>SCRIPTURES</div>
            <input
              value={addingSpirit.scriptures || ''}
              onChange={e => setAddingSpirit((s: any) => ({ ...s, scriptures: e.target.value }))}
              placeholder="e.g. Job 41:1, Isaiah 27:1"
              style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(0,0,0,0.2)', border: `1px solid ${bdr2}`, borderRadius: 4, padding: '8px 10px', color: txt2, fontFamily: crimson, fontSize: 13, outline: 'none', marginBottom: 20 }}
            />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => confirmAdd(addingSpirit)} disabled={!!addingSpirit.loading} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: '#0D0B14', background: '#80e090', border: 'none', borderRadius: 4, padding: '10px 20px', cursor: 'pointer', opacity: addingSpirit.loading ? 0.5 : 1 }}>
                ✓ Confirm Add
              </button>
              <button onClick={() => setAddingSpirit(null)} style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: dim2, background: 'transparent', border: `1px solid ${bdr2}`, borderRadius: 4, padding: '10px 20px', cursor: 'pointer' }}>
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
  const surf2 = isDark ? SURF : '#EDE6D3'
  const bdr2 = isDark ? BDR : 'rgba(139,105,20,0.25)'
  const txt2 = isDark ? TXT : '#2D2924'
  const dim2 = isDark ? DIM : '#6B5520'
  const mut2 = isDark ? '#9a8c74' : '#5C5248'

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

function DailyBriefManager({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const bg   = isDark ? '#0D0B14' : '#FAF8F5'
  const bdr  = isDark ? 'rgba(201,168,76,0.18)' : 'rgba(139,105,20,0.25)'
  const txt  = isDark ? '#E8D5B0' : '#2D2924'
  const mut  = isDark ? '#8B7355' : '#5C5248'
  const GG   = isDark ? '#C9A84C' : '#8B6914'
  const inp  = { background: bg, border: `1px solid ${bdr}`, borderRadius: 6, padding: '10px 14px', color: txt, fontFamily: "'Crimson Pro', serif", fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const }

  const [entries, setEntries] = useState<any[]>([])
  const [drafts, setDrafts]   = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [saving, setSaving]   = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatingBatch, setGeneratingBatch] = useState(false)
  const [batchProgress, setBatchProgress] = useState('')
  const [msg, setMsg]         = useState('')
  const [form, setForm]       = useState({
    date: new Date().toISOString().split('T')[0],
    title: '',
    morning_prayer: '',
    scripture: '',
    scripture_reference: '',
    devotional_text: '',
    evening_prayer: '',
    youtube_url: '',
    min_tier: 'watchman',
    published: false,
  })

  async function loadEntries() {
    const token = await getToken()
    const [archiveRes, draftsRes] = await Promise.all([
      fetch('/api/daily-devotion?archive=true', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/daily-devotion?drafts=true',   { headers: { Authorization: `Bearer ${token}` } }),
    ])
    if (archiveRes.ok) { const d = await archiveRes.json(); setEntries(d.devotions || []) }
    if (draftsRes.ok)  { const d = await draftsRes.json();  setDrafts(d.drafts   || []) }
  }

  async function generateDraft() {
    setGenerating(true); setMsg('')
    try {
      const token = await getToken()
      const res = await fetch('/api/generate-daily-brief', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      })
      const d = await res.json()
      if (res.ok) { setMsg('AI draft generated — review it in DRAFT QUEUE below'); loadEntries() }
      else setMsg(d.error || 'Generation failed')
    } catch { setMsg('Network error') }
    setGenerating(false)
  }

  async function generate7Days() {
    setGeneratingBatch(true); setMsg(''); setBatchProgress('')
    const token = await getToken()
    let created = 0; let skipped = 0
    // Load existing dates to avoid duplicates
    const archiveRes = await fetch('/api/daily-devotion?archive=true', { headers: { Authorization: `Bearer ${token}` } })
    const archiveData = archiveRes.ok ? await archiveRes.json() : { devotions: [] }
    const existingDates = new Set((archiveData.devotions || []).map((d: any) => d.date))
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      if (existingDates.has(dateStr)) { skipped++; setBatchProgress(`Skipping ${dateStr} (exists)...`); continue }
      setBatchProgress(`Generating ${dateStr} (${i + 1}/7)...`)
      try {
        const res = await fetch('/api/generate-daily-brief', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateStr }),
        })
        if (res.ok) created++
        else { const e = await res.json(); setBatchProgress(`Error on ${dateStr}: ${e.error}`); break }
      } catch { setBatchProgress(`Network error on ${dateStr}`); break }
      await new Promise(r => setTimeout(r, 1500))
    }
    setBatchProgress('')
    setMsg(`Batch complete — ${created} generated, ${skipped} skipped (already existed)`)
    loadEntries()
    setGeneratingBatch(false)
  }

  useEffect(() => { loadEntries() }, [])

  function startNew() {
    setSelected(null)
    setForm({ date: new Date().toISOString().split('T')[0], title: '', morning_prayer: '', scripture: '', scripture_reference: '', devotional_text: '', evening_prayer: '', youtube_url: '', min_tier: 'watchman', published: false })
    setMsg('')
  }

  function loadEntry(e: any) {
    setSelected(e)
    setForm({ date: e.date, title: e.title || '', morning_prayer: e.morning_prayer || '', scripture: e.scripture || '', scripture_reference: e.scripture_reference || '', devotional_text: e.devotional_text || '', evening_prayer: e.evening_prayer || '', youtube_url: e.youtube_url || '', min_tier: e.min_tier || 'watchman', published: e.published || false })
    setMsg('')
  }

  async function save() {
    if (!form.date || !form.title) { setMsg('Date and title are required'); return }
    setSaving(true)
    setMsg('')
    try {
      const token = await getToken()
      const body = { date: form.date, title: form.title, morningPrayer: form.morning_prayer, scripture: form.scripture, scriptureReference: form.scripture_reference, devotionalText: form.devotional_text, eveningPrayer: form.evening_prayer, youtubeUrl: form.youtube_url, minTier: form.min_tier, published: form.published }
      const url = selected ? `/api/daily-devotion?id=${selected.id}` : '/api/daily-devotion'
      const method = selected ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (res.ok) { setMsg('Saved ✓'); loadEntries(); if (!selected) { const d = await res.json(); setSelected(d.devotion) } }
      else { const d = await res.json(); setMsg(d.error || 'Save failed') }
    } catch { setMsg('Network error') }
    setSaving(false)
  }

  async function deleteDevotion(id: string) {
    if (!confirm('Delete this devotion?')) return
    const token = await getToken()
    await fetch(`/api/daily-devotion?id=${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    setSelected(null); startNew(); loadEntries()
  }

  const F = (label: string, key: keyof typeof form, multiline = false, rows = 4) => (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontFamily: "'Cinzel', serif", fontSize: 9, color: GG, letterSpacing: '0.12em', marginBottom: 6 }}>{label}</label>
      {multiline
        ? <textarea value={form[key] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} rows={rows} style={{ ...inp, resize: 'vertical' as const }} />
        : <input value={form[key] as string} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} style={inp} />
      }
    </div>
  )

  return (
    <div>
      {/* DRAFT QUEUE — AI-generated unpublished drafts */}
      {drafts.length > 0 && (
        <div style={{ marginBottom: 28, padding: '18px 20px', background: 'rgba(201,168,76,0.05)', border: `1px solid ${bdr}`, borderRadius: 10 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: GG, letterSpacing: '0.14em', marginBottom: 12 }}>AI DRAFT QUEUE ({drafts.length})</div>
          {drafts.map(d => (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${bdr}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: GG }}>{d.title}</div>
                <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: mut, marginTop: 2 }}>
                  {new Date(d.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  {d.created_by === 'ai-agent' && <span style={{ marginLeft: 8, opacity: 0.6 }}>AI</span>}
                </div>
              </div>
              <button onClick={() => loadEntry(d)}
                style={{ padding: '6px 14px', background: 'rgba(201,168,76,0.1)', border: `1px solid ${bdr}`, borderRadius: 6, color: GG, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', flexShrink: 0 }}>
                Review and Edit
              </button>
              <button onClick={async () => {
                const token = await getToken()
                await fetch(`/api/daily-devotion?id=${d.id}`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ date: d.date, title: d.title, morningPrayer: d.morning_prayer, scripture: d.scripture, scriptureReference: d.scripture_reference, devotionalText: d.devotional_text, eveningPrayer: d.evening_prayer, youtubeUrl: d.youtube_url || '', minTier: d.min_tier || 'watchman', published: true }) })
                loadEntries(); setMsg('Published ✓')
              }} style={{ padding: '6px 14px', background: 'rgba(74,138,74,0.12)', border: '1px solid rgba(74,138,74,0.4)', borderRadius: 6, color: '#4ade80', fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', flexShrink: 0 }}>
                Approve and Publish
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
      {/* Entry list */}
      <div style={{ width: 200, flexShrink: 0 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 10, color: GG, letterSpacing: '0.12em', marginBottom: 10 }}>RECENT ENTRIES</div>
        <button onClick={startNew} style={{ width: '100%', marginBottom: 8, padding: '7px 12px', background: 'rgba(201,168,76,0.08)', border: `1px solid ${bdr}`, borderRadius: 6, color: GG, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>+ New Entry</button>
        <button onClick={generateDraft} disabled={generating || generatingBatch}
          style={{ width: '100%', marginBottom: 6, padding: '7px 12px', background: generating ? 'rgba(201,168,76,0.05)' : 'rgba(201,168,76,0.12)', border: `1px solid ${generating ? 'rgba(201,168,76,0.2)' : GG}`, borderRadius: 6, color: generating ? mut : GG, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.08em', cursor: generating ? 'wait' : 'pointer', opacity: generating ? 0.6 : 1 }}>
          {generating ? 'GENERATING...' : '⚡ AI GENERATE TODAY'}
        </button>
        <button onClick={generate7Days} disabled={generating || generatingBatch}
          style={{ width: '100%', marginBottom: 12, padding: '7px 12px', background: generatingBatch ? 'rgba(201,168,76,0.05)' : 'rgba(74,138,201,0.08)', border: `1px solid ${generatingBatch ? 'rgba(201,168,76,0.2)' : 'rgba(74,138,201,0.5)'}`, borderRadius: 6, color: generatingBatch ? mut : '#7ab4e0', fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.08em', cursor: generatingBatch ? 'wait' : 'pointer', opacity: generatingBatch ? 0.6 : 1 }}>
          {generatingBatch ? (batchProgress || '⏳ GENERATING...') : '📅 GENERATE 7 DAYS'}
        </button>
        {entries.map(e => (
          <button key={e.id} onClick={() => loadEntry(e)}
            style={{ display: 'block', width: '100%', textAlign: 'left' as const, padding: '8px 12px', background: selected?.id === e.id ? 'rgba(201,168,76,0.1)' : 'transparent', border: 'none', borderBottom: `1px solid ${bdr}`, cursor: 'pointer', color: selected?.id === e.id ? GG : txt, fontFamily: "'Crimson Pro', serif", fontSize: 13 }}>
            {new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — {e.title}
          </button>
        ))}
      </div>

      {/* Form */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 16, color: GG, letterSpacing: '0.08em' }}>☀️ {selected ? 'Edit Entry' : 'New Daily Brief'}</div>
          {selected && <button onClick={() => deleteDevotion(selected.id)} style={{ background: 'none', border: '1px solid rgba(255,80,80,0.3)', borderRadius: 4, color: '#e09090', fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', padding: '5px 12px' }}>Delete</button>}
        </div>
        {F('DATE', 'date')}
        {F('TITLE', 'title')}
        {F('MORNING PRAYER', 'morning_prayer', true, 5)}
        {F('SCRIPTURE TEXT', 'scripture', true, 3)}
        {F('SCRIPTURE REFERENCE', 'scripture_reference')}
        {F('DEVOTIONAL TEXT (Markdown)', 'devotional_text', true, 8)}
        {F('EVENING PRAYER', 'evening_prayer', true, 5)}
        {F('YOUTUBE URL (optional)', 'youtube_url')}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontFamily: "'Cinzel', serif", fontSize: 9, color: GG, letterSpacing: '0.12em', marginBottom: 6 }}>MIN TIER</label>
          <select value={form.min_tier} onChange={e => setForm(p => ({ ...p, min_tier: e.target.value }))} style={{ ...inp, cursor: 'pointer' }}>
            {['watchman', 'soldier', 'commander', 'general'].map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18, cursor: 'pointer' }}>
          <input type="checkbox" checked={form.published} onChange={e => setForm(p => ({ ...p, published: e.target.checked }))} />
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: GG, letterSpacing: '0.1em' }}>PUBLISHED</span>
        </label>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={save} disabled={saving}
            style={{ padding: '10px 24px', background: 'rgba(201,168,76,0.12)', border: `1px solid ${GG}`, borderRadius: 6, color: GG, fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'SAVING…' : 'SAVE'}
          </button>
          {msg && <span style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: msg.includes('✓') ? '#4ade80' : '#e09090' }}>{msg}</span>}
        </div>
      </div>
      </div>
    </div>
  )
}

// ─── MINISTRY CONTEXT MANAGER ──────────────────────────────────────────────────
function MinistryContextManager({ getToken, isDark }: { getToken: () => Promise<string | null>; isDark: boolean }) {
  const G    = '#C9A84C'
  const bg   = isDark ? '#0D0B14' : '#FAF8F5'
  const surf = isDark ? 'rgba(201,168,76,0.04)' : '#FFFFFF'
  const bdr  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(139,105,20,0.25)'
  const txt  = isDark ? '#E8D5B0' : '#2D2924'
  const mut  = isDark ? '#8B7355' : '#5C5248'

  const [versions, setVersions]       = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [showEditor, setShowEditor]   = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showDanger, setShowDanger]   = useState(false)
  const [dangerInput, setDangerInput] = useState('')
  const [editorLabel, setEditorLabel] = useState('')
  const [editorNotes, setEditorNotes] = useState('')
  const [editorText, setEditorText]   = useState('')
  const [editorActivate, setEditorActivate] = useState(true)
  const [saving, setSaving]           = useState(false)
  const [toast, setToast]             = useState('')
  const [previewVersion, setPreviewVersion] = useState<any | null>(null)
  const [confirmActivate, setConfirmActivate] = useState<any | null>(null)

  const active = versions.find(v => v.is_active)

  function showToast(msg: string) {
    setToast(msg); setTimeout(() => setToast(''), 4000)
  }

  async function load() {
    setLoading(true)
    const token = await getToken()
    const res = await fetch('/api/ministry-context?admin=true', { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { const d = await res.json(); setVersions(d.versions || []) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openEditor(prefill?: any) {
    setEditorLabel(prefill ? `v${(versions[0]?.version || 0) + 1} — ` : '')
    setEditorNotes('')
    setEditorText(prefill?.context_text || active?.context_text || '')
    setEditorActivate(true)
    setShowEditor(true)
  }

  async function saveVersion() {
    if (!editorLabel.trim() || !editorText.trim()) return
    if (editorActivate && !confirm(`Activate this version? This will update the AI context across all platform tools immediately.`)) return
    setSaving(true)
    const token = await getToken()
    const res = await fetch('/api/ministry-context', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ label: editorLabel, context_text: editorText, notes: editorNotes, activate: editorActivate }),
    })
    if (res.ok) {
      const d = await res.json()
      showToast(editorActivate ? `✓ AI context updated — all tools now using v${d.version}` : `✓ Draft saved as v${d.version}`)
      setShowEditor(false); await load()
    }
    setSaving(false)
  }

  async function activateVersion(v: any) {
    const token = await getToken()
    const res = await fetch(`/api/ministry-context?id=${v.id}&action=activate`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { showToast(`✓ Activated v${v.version}`); setConfirmActivate(null); await load() }
  }

  async function disableAll() {
    if (dangerInput !== 'DISABLE') return
    const token = await getToken()
    for (const v of versions.filter(v => v.is_active)) {
      await fetch(`/api/ministry-context?id=${v.id}`, {
        method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      })
    }
    showToast('AI context disabled — tools using default Claude behavior'); setShowDanger(false); setDangerInput(''); await load()
  }

  const STATUS_BADGE = (isActive: boolean) => (
    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.12em', padding: '2px 8px', borderRadius: 10,
      background: isActive ? 'rgba(201,168,76,0.15)' : 'rgba(255,255,255,0.04)',
      border: `1px solid ${isActive ? G : 'rgba(255,255,255,0.1)'}`,
      color: isActive ? G : mut }}>
      {isActive ? 'ACTIVE' : 'INACTIVE'}
    </span>
  )

  if (loading) return <div style={{ color: mut, fontFamily: "'Crimson Pro', serif", fontStyle: 'italic', padding: 40, textAlign: 'center' }}>Loading…</div>

  return (
    <div style={{ background: bg, minHeight: '100%' }}>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: 'rgba(201,168,76,0.9)', color: '#060408', fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', padding: '10px 18px', borderRadius: 6, zIndex: 1000 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap' as const, gap: 12 }}>
        <div>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 20, color: G, letterSpacing: '0.08em', fontWeight: 700 }}>🧠 Ministry AI Context</div>
          <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: mut, marginTop: 4 }}>Control the ministry framing injected into all AI tools</div>
        </div>
        <button onClick={() => openEditor(active)}
          style={{ padding: '8px 18px', background: 'rgba(201,168,76,0.12)', border: `1px solid ${G}`, borderRadius: 6, color: G, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer' }}>
          + NEW VERSION
        </button>
      </div>

      {/* Active version card */}
      {active ? (
        <div style={{ background: surf, border: `2px solid ${G}`, borderRadius: 10, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' as const }}>
            {STATUS_BADGE(true)}
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: txt, letterSpacing: '0.04em', flex: 1 }}>{active.label}</div>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: mut, letterSpacing: '0.06em' }}>
              {active.created_at ? new Date(active.created_at).toLocaleDateString() : ''}
            </div>
          </div>
          {active.notes && <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: mut, marginBottom: 14, fontStyle: 'italic' }}>{active.notes}</div>}
          <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: txt, lineHeight: 1.8, whiteSpace: 'pre-wrap' as const, background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.04)', borderRadius: 6, padding: '14px 16px', maxHeight: 320, overflowY: 'auto' as const, border: `1px solid ${bdr}` }}>
            {active.context_text}
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button onClick={() => openEditor(active)}
              style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${G}`, borderRadius: 5, color: G, fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.1em', cursor: 'pointer' }}>
              EDIT & SAVE AS NEW VERSION
            </button>
            <button onClick={() => navigator.clipboard.writeText(active.context_text).then(() => showToast('Copied!'))}
              style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 5, color: mut, fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.1em', cursor: 'pointer' }}>
              COPY TEXT
            </button>
          </div>
        </div>
      ) : (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: '24px', marginBottom: 24, textAlign: 'center' as const }}>
          <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: mut, marginBottom: 12 }}>No active ministry context</div>
          <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: mut, marginBottom: 16 }}>AI tools are using default Claude behavior</div>
          <button onClick={() => openEditor()} style={{ padding: '8px 18px', background: 'rgba(201,168,76,0.12)', border: `1px solid ${G}`, borderRadius: 6, color: G, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer' }}>
            + CREATE FIRST VERSION
          </button>
        </div>
      )}

      {/* Version history */}
      {versions.length > 1 && (
        <div style={{ marginBottom: 24 }}>
          <button onClick={() => setShowHistory(h => !h)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: surf, border: `1px solid ${bdr}`, borderRadius: 8, cursor: 'pointer', color: txt, fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.08em' }}>
            <span>Version History ({versions.length - 1} older)</span>
            <span>{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div style={{ marginTop: 8 }}>
              {versions.filter(v => !v.is_active).map(v => (
                <div key={v.id} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '14px 18px', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' as const }}>
                    {STATUS_BADGE(false)}
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: txt, flex: 1 }}>{v.label}</span>
                    <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: mut }}>{v.created_at ? new Date(v.created_at).toLocaleDateString() : ''}</span>
                  </div>
                  {v.notes && <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: mut, marginBottom: 8, fontStyle: 'italic' }}>{v.notes}</div>}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setConfirmActivate(v)}
                      style={{ padding: '5px 12px', background: 'rgba(201,168,76,0.08)', border: `1px solid ${G}`, borderRadius: 4, color: G, fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.08em', cursor: 'pointer' }}>
                      RESTORE THIS VERSION
                    </button>
                    <button onClick={() => setPreviewVersion(v)}
                      style={{ padding: '5px 12px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 4, color: mut, fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.08em', cursor: 'pointer' }}>
                      PREVIEW
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Danger zone */}
      <div style={{ marginBottom: 40 }}>
        <button onClick={() => setShowDanger(d => !d)}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(248,113,113,0.05)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 6, cursor: 'pointer', color: '#f87171', fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em' }}>
          <span>DANGER ZONE</span>
          <span>{showDanger ? '▲' : '▼'}</span>
        </button>
        {showDanger && (
          <div style={{ background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.15)', borderTop: 'none', borderRadius: '0 0 6px 6px', padding: '16px 18px' }}>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: '#f87171', marginBottom: 12 }}>
              This removes the ministry context from all AI tools. The AI will still work but without WRI ministry framing.
            </div>
            <input value={dangerInput} onChange={e => setDangerInput(e.target.value)} placeholder='Type "DISABLE" to confirm'
              style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 4, padding: '8px 12px', color: '#f87171', fontFamily: "'Crimson Pro', serif", fontSize: 13, outline: 'none', marginBottom: 10 }} />
            <button onClick={disableAll} disabled={dangerInput !== 'DISABLE'}
              style={{ padding: '7px 16px', background: dangerInput === 'DISABLE' ? 'rgba(248,113,113,0.15)' : 'transparent', border: '1px solid rgba(248,113,113,0.4)', borderRadius: 4, color: '#f87171', fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', cursor: dangerInput === 'DISABLE' ? 'pointer' : 'not-allowed', opacity: dangerInput === 'DISABLE' ? 1 : 0.4 }}>
              DISABLE AI CONTEXT
            </button>
          </div>
        )}
      </div>

      {/* Editor modal */}
      {showEditor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setShowEditor(false) }}>
          <div style={{ background: isDark ? '#13111e' : '#fff', border: `1px solid ${bdr}`, borderRadius: 12, padding: '24px', width: '100%', maxWidth: 720, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 48px rgba(0,0,0,0.5)' }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, color: G, letterSpacing: '0.08em', marginBottom: 20 }}>NEW VERSION</div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: mut, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>LABEL</label>
              <input value={editorLabel} onChange={e => setEditorLabel(e.target.value)} placeholder="e.g. v2 — Updated tone June 2026"
                style={{ width: '100%', boxSizing: 'border-box' as const, background: bg, border: `1px solid ${bdr}`, borderRadius: 6, padding: '9px 12px', color: txt, fontFamily: "'Crimson Pro', serif", fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: mut, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>NOTES</label>
              <input value={editorNotes} onChange={e => setEditorNotes(e.target.value)} placeholder="Reason for change"
                style={{ width: '100%', boxSizing: 'border-box' as const, background: bg, border: `1px solid ${bdr}`, borderRadius: 6, padding: '9px 12px', color: txt, fontFamily: "'Crimson Pro', serif", fontSize: 14, outline: 'none' }} />
            </div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: mut, letterSpacing: '0.1em', display: 'block', marginBottom: 6 }}>CONTEXT TEXT</label>
              <textarea value={editorText} onChange={e => setEditorText(e.target.value)} rows={18}
                style={{ width: '100%', boxSizing: 'border-box' as const, background: bg, border: `1px solid ${bdr}`, borderRadius: 6, padding: '10px 12px', color: txt, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, outline: 'none', resize: 'vertical' as const, minHeight: 400 }} />
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontFamily: "'Crimson Pro', serif", fontSize: 13, color: txt }}>
                <input type="checkbox" checked={editorActivate} onChange={e => setEditorActivate(e.target.checked)} />
                Activate immediately
              </label>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveVersion} disabled={saving || !editorLabel.trim() || !editorText.trim()}
                style={{ padding: '9px 20px', background: 'rgba(201,168,76,0.12)', border: `1px solid ${G}`, borderRadius: 6, color: G, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer' }}>
                {saving ? 'SAVING…' : 'SAVE VERSION'}
              </button>
              <button onClick={() => setShowEditor(false)}
                style={{ padding: '9px 20px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 6, color: mut, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer' }}>
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {previewVersion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) setPreviewVersion(null) }}>
          <div style={{ background: isDark ? '#13111e' : '#fff', border: `1px solid ${bdr}`, borderRadius: 12, padding: '24px', width: '100%', maxWidth: 680, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 12, color: G, marginBottom: 16 }}>{previewVersion.label}</div>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 14, color: txt, lineHeight: 1.8, whiteSpace: 'pre-wrap' as const }}>{previewVersion.context_text}</div>
            <button onClick={() => setPreviewVersion(null)} style={{ marginTop: 20, padding: '7px 16px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 4, color: mut, fontFamily: "'Cinzel', serif", fontSize: 8, letterSpacing: '0.1em', cursor: 'pointer' }}>CLOSE</button>
          </div>
        </div>
      )}

      {/* Activate confirm modal */}
      {confirmActivate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: isDark ? '#13111e' : '#fff', border: `1px solid ${bdr}`, borderRadius: 10, padding: '24px', maxWidth: 400 }}>
            <div style={{ fontFamily: "'Cinzel', serif", fontSize: 13, color: G, marginBottom: 12 }}>Activate v{confirmActivate.version}?</div>
            <div style={{ fontFamily: "'Crimson Pro', serif", fontSize: 13, color: mut, marginBottom: 20 }}>This will replace the current active context and update all AI tools immediately.</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => activateVersion(confirmActivate)} style={{ padding: '8px 16px', background: 'rgba(201,168,76,0.12)', border: `1px solid ${G}`, borderRadius: 5, color: G, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer' }}>ACTIVATE NOW</button>
              <button onClick={() => setConfirmActivate(null)} style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 5, color: mut, fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer' }}>CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── AI USAGE ADMIN ──────────────────────────────────────────────────────────
function AIUsageAdmin({ getToken, isDark }: { getToken: (opts?: { template?: string }) => Promise<string | null>; isDark: boolean }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')

  useEffect(() => {
    getToken().then(token => {
      if (!token) return
      fetch('/api/ai-usage', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { setData(d); setLoading(false) })
        .catch(e => { setError(e.message); setLoading(false) })
    })
  }, [])

  const txt  = isDark ? TXT  : '#1C1410'
  const dim  = isDark ? DIM  : '#5C5248'
  const surf = isDark ? SURF : '#FFFFFF'
  const bdr  = isDark ? BDR  : 'rgba(139,105,20,0.25)'

  if (loading) return <div style={{ color: G, fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', padding: 32 }}>LOADING...</div>
  if (error)   return <div style={{ color: '#c84a4a', fontFamily: crimson, fontSize: 14, padding: 20 }}>Error: {error}</div>
  if (!data)   return null

  const { thisMonth, lastMonth, byDay = [], recentCalls = [] } = data

  return (
    <div>
      <h2 style={{ fontFamily: cinzel, fontSize: 16, color: G, letterSpacing: '0.12em', marginBottom: 8 }}>AI Usage Dashboard</h2>
      <p style={{ fontFamily: crimson, fontSize: 14, color: dim, marginBottom: 28 }}>
        Token consumption and call volume across all AI endpoints.
      </p>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
        {[
          { label: 'THIS MONTH — CALLS', value: thisMonth?.calls ?? 0 },
          { label: 'THIS MONTH — INPUT TOKENS', value: (thisMonth?.inputTokens ?? 0).toLocaleString() },
          { label: 'THIS MONTH — OUTPUT TOKENS', value: (thisMonth?.outputTokens ?? 0).toLocaleString() },
          { label: 'THIS MONTH — EST. COST', value: `$${(thisMonth?.estimatedCost ?? 0).toFixed(4)}` },
          { label: 'LAST MONTH — CALLS', value: lastMonth?.calls ?? 0 },
          { label: 'LAST MONTH — EST. COST', value: `$${(lastMonth?.estimatedCost ?? 0).toFixed(4)}` },
        ].map(card => (
          <div key={card.label} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ fontFamily: cinzel, fontSize: 8, color: G, letterSpacing: '0.1em', marginBottom: 6 }}>{card.label}</div>
            <div style={{ fontFamily: cinzel, fontSize: 20, color: txt, fontWeight: 700 }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Calls by day (last 30) */}
      {byDay.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>CALLS PER DAY (LAST 30 DAYS)</div>
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 80 }}>
              {byDay.slice(-30).map((d: any) => {
                const maxCalls = Math.max(...byDay.map((x: any) => x.calls), 1)
                const h = Math.max(4, Math.round((d.calls / maxCalls) * 72))
                return (
                  <div key={d.date} title={`${d.date}: ${d.calls} calls`} style={{ flex: 1, height: h, background: 'rgba(201,168,76,0.4)', borderRadius: '2px 2px 0 0', minWidth: 2 }} />
                )
              })}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <span style={{ fontFamily: cinzel, fontSize: 7, color: dim }}>{byDay[0]?.date || ''}</span>
              <span style={{ fontFamily: cinzel, fontSize: 7, color: dim }}>{byDay[byDay.length - 1]?.date || ''}</span>
            </div>
          </div>
        </div>
      )}

      {/* Recent calls */}
      {recentCalls.length > 0 && (
        <div>
          <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em', marginBottom: 12 }}>RECENT CALLS</div>
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, overflow: 'hidden' }}>
            {recentCalls.map((c: any, i: number) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 80px', gap: 12, padding: '10px 16px', borderBottom: i < recentCalls.length - 1 ? `1px solid ${bdr}` : 'none', alignItems: 'center' }}>
                <div style={{ fontFamily: crimson, fontSize: 13, color: txt }}>{c.spirit_name || '—'}</div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: dim, letterSpacing: '0.06em' }}>{c.call_type}</div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: dim }}>{new Date(c.called_at).toLocaleDateString()}</div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: G }}>${c.estimatedCost.toFixed(4)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── NOTIFICATIONS ADMIN ─────────────────────────────────────────────────────
const PUSH_TIER_COLORS: Record<string, string> = {
  minister: '#ef4444', general: '#C9A84C', founding_general: '#C9A84C',
  commander: '#8B9DCA', charter_commander: '#8B9DCA',
  soldier: '#7a9e7e', charter_soldier: '#7a9e7e',
  watchman: '#9a8c74', free: '#6a6080',
}

function NotificationsAdmin({ getToken, isDark }: { getToken: (opts?: { template?: string }) => Promise<string | null>; isDark: boolean }) {
  const [title, setTitle]         = useState('Test Notification')
  const [body, setBody]           = useState('This is a test push from War Room Intel admin.')
  const [url, setUrl]             = useState('/community')
  const [userId, setUserId]       = useState('')
  const [sending, setSending]     = useState(false)
  const [result, setResult]       = useState<string | null>(null)
  const [subCount, setSubCount]   = useState<number | null>(null)
  const [countLoading, setCountLoading] = useState(true)

  const [userQuery,     setUserQuery]    = useState('')
  const [userResults,   setUserResults]  = useState<any[]>([])
  const [selectedUser,  setSelectedUser] = useState<any | null>(null)
  const [userSearching, setUserSearching] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [testEmailAddr,    setTestEmailAddr]    = useState('exorcist@warroomintel.com')
  const [testEmailType,    setTestEmailType]    = useState('welcome')
  const [testEmailSending, setTestEmailSending] = useState(false)
  const [testEmailResult,  setTestEmailResult]  = useState<string | null>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserResults([])
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function handleUserQuery(q: string) {
    setUserQuery(q)
    if (selectedUser) { setSelectedUser(null); setUserId('') }
    if (!q.trim() || q.trim().length < 2) { setUserResults([]); return }
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(async () => {
      setUserSearching(true)
      try {
        const token = await getToken()
        const res = await fetch(`/api/admin-user-search?q=${encodeURIComponent(q.trim())}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.ok) setUserResults((await res.json()).users || [])
      } catch {}
      finally { setUserSearching(false) }
    }, 300)
  }

  function selectUser(u: any) {
    setSelectedUser(u)
    setUserId(u.id)
    setUserQuery([u.firstName, u.lastName].filter(Boolean).join(' ') || u.email)
    setUserResults([])
  }

  function clearUser() {
    setSelectedUser(null)
    setUserId('')
    setUserQuery('')
    setUserResults([])
  }

  useEffect(() => {
    async function fetchCount() {
      try {
        const token = await getToken()
        const res = await fetch('/api/test-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dryRun: true }),
        })
        if (res.ok) {
          const data = await res.json()
          setSubCount(data.total ?? 0)
        }
      } catch {}
      finally { setCountLoading(false) }
    }
    fetchCount()
  }, [])

  async function sendTestAll() {
    setSending(true)
    setResult(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/test-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (res.ok) {
        setSubCount(data.total ?? subCount)
        const errSummary = (data.errors as any[] | undefined)?.slice(0, 3).map((e: any) => {
          if (typeof e === 'string') return e
          return [e.endpointHost, e.statusCode != null ? `HTTP ${e.statusCode}` : null, e.body || e.message].filter(Boolean).join(' ')
        }).join(' | ') || ''
        setResult(`Sent to ${data.sent} of ${data.total} device(s). Failed: ${data.failed || 0}.${errSummary ? ' ' + errSummary : ''}`)
      } else {
        setResult(`Error: ${data.error}`)
      }
    } catch (err: any) {
      setResult(`Error: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  async function sendTest() {
    if (!title) return
    setSending(true)
    setResult(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/send-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title, body, url, userId: userId.trim() || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        const base = `Sent: ${data.sent} delivered, ${data.failed || 0} failed.`
        const errDetail = (data.errorDetails as any[] | undefined)?.[0]
        const errStr = errDetail
          ? ` [${errDetail.endpointHost} HTTP ${errDetail.statusCode ?? '?'}: ${String(errDetail.body || '').slice(0, 120)}]`
          : data.error ? ` — ${data.error}` : ''
        setResult(base + errStr)
      } else {
        setResult(`Error: ${data.error}`)
      }
    } catch (err: any) {
      setResult(`Error: ${err.message}`)
    } finally {
      setSending(false)
    }
  }

  async function sendTestEmail() {
    if (!testEmailAddr) return
    setTestEmailSending(true)
    setTestEmailResult(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/send-email?action=test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: testEmailAddr, type: testEmailType }),
      })
      const data = await res.json()
      setTestEmailResult(res.ok ? `Sent ${testEmailType} to ${testEmailAddr}` : `Error: ${data.error}`)
    } catch (err: any) {
      setTestEmailResult(`Error: ${err.message}`)
    } finally {
      setTestEmailSending(false)
    }
  }

  const lbl: CSSProperties = { fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: isDark ? '#9a8c74' : '#5C5248', display: 'block', marginBottom: 4 }
  const inp: CSSProperties = { width: '100%', padding: '8px 10px', background: isDark ? '#13111e' : '#fff', border: `1px solid ${isDark ? 'rgba(201,168,76,0.2)' : '#d4c4b0'}`, borderRadius: 4, color: isDark ? '#e8dcc8' : '#1C1410', fontFamily: crimson, fontSize: 14, outline: 'none', boxSizing: 'border-box' }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 8 }}>
        <h2 style={{ fontFamily: cinzel, fontSize: 16, color: G, letterSpacing: '0.12em', margin: 0 }}>Push Notifications</h2>
        <div style={{ fontFamily: cinzel, fontSize: 10, color: isDark ? '#9a8c74' : '#5C5248', letterSpacing: '0.08em' }}>
          {countLoading ? 'Loading...' : `${subCount ?? 0} subscriber${subCount === 1 ? '' : 's'}`}
        </div>
      </div>
      <p style={{ fontFamily: crimson, fontSize: 14, color: isDark ? '#9a8c74' : '#5C5248', marginBottom: 24, lineHeight: 1.6 }}>
        Send a push notification to all subscribed users, or target a specific user by Clerk ID.
        iOS users must have the app added to their home screen to receive pushes.
      </p>

      {/* Quick test — sends to all immediately */}
      <div style={{ marginBottom: 28, padding: '14px 16px', background: isDark ? 'rgba(201,168,76,0.05)' : 'rgba(201,168,76,0.08)', border: `1px solid ${isDark ? 'rgba(201,168,76,0.2)' : 'rgba(201,168,76,0.3)'}`, borderRadius: 6 }}>
        <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em', marginBottom: 8 }}>QUICK TEST — SEND TO ALL SUBSCRIBERS</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' as const }}>
          <button
            onClick={sendTestAll}
            disabled={sending || subCount === 0}
            style={{ padding: '9px 20px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', background: sending ? 'rgba(201,168,76,0.3)' : G, color: '#1a1305', border: 'none', borderRadius: 4, cursor: (sending || subCount === 0) ? 'not-allowed' : 'pointer' }}
          >
            {sending ? 'SENDING...' : `SEND TEST PUSH (${subCount ?? '?'} devices)`}
          </button>
          {subCount === 0 && !countLoading && (
            <span style={{ fontFamily: crimson, fontSize: 13, color: '#c84a4a', fontStyle: 'italic' }}>No subscribers — users need to enable notifications in the app</span>
          )}
        </div>
      </div>

      {/* Custom message sender */}
      <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ fontFamily: cinzel, fontSize: 9, color: isDark ? '#9a8c74' : '#5C5248', letterSpacing: '0.1em' }}>CUSTOM MESSAGE</div>
        <div>
          <label style={lbl}>TITLE</label>
          <input value={title} onChange={e => setTitle(e.target.value)} style={inp} />
        </div>
        <div>
          <label style={lbl}>BODY</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} rows={3}
            style={{ ...inp, resize: 'vertical' as const }} />
        </div>
        <div>
          <label style={lbl}>URL (on click)</label>
          <input value={url} onChange={e => setUrl(e.target.value)} style={inp} />
        </div>
        <div ref={dropdownRef} style={{ position: 'relative' as const }}>
          <label style={lbl}>TARGET USER (leave blank to send to all subscribers)</label>
          <div style={{ position: 'relative' as const }}>
            <input
              value={userQuery}
              onChange={e => handleUserQuery(e.target.value)}
              placeholder="Search by name or email..."
              style={inp}
              autoComplete="off"
            />
            {userSearching && (
              <div style={{ position: 'absolute' as const, right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: isDark ? '#9a8c74' : '#5C5248', fontFamily: cinzel, letterSpacing: '0.05em' }}>
                searching...
              </div>
            )}
          </div>

          {userResults.length > 0 && (
            <div style={{
              position: 'absolute' as const, top: '100%', left: 0, right: 0, zIndex: 30,
              background: isDark ? '#13111e' : '#fff',
              border: `1px solid ${isDark ? 'rgba(201,168,76,0.3)' : '#d4c4b0'}`,
              borderRadius: 4, boxShadow: '0 6px 24px rgba(0,0,0,0.5)',
              marginTop: 2, maxHeight: 260, overflowY: 'auto' as const,
            }}>
              {userResults.map((u, i) => {
                const tc = PUSH_TIER_COLORS[u.role === 'minister' ? 'minister' : u.tier] || '#9a8c74'
                const tierLabel = u.role === 'minister' ? 'MINISTER' : u.tier.toUpperCase()
                return (
                  <div
                    key={u.id}
                    onClick={() => selectUser(u)}
                    style={{
                      padding: '9px 14px', cursor: 'pointer',
                      borderBottom: i < userResults.length - 1 ? `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#f0e8e0'}` : 'none',
                      display: 'flex', alignItems: 'center', gap: 10,
                      background: 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = isDark ? 'rgba(201,168,76,0.07)' : 'rgba(201,168,76,0.06)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 12, color: isDark ? '#e8dcc8' : '#1C1410', marginBottom: 1 }}>
                        {[u.firstName, u.lastName].filter(Boolean).join(' ') || '—'}
                      </div>
                      <div style={{ fontFamily: crimson, fontSize: 12, color: isDark ? '#9a8c74' : '#5C5248', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                        {u.email}
                      </div>
                    </div>
                    <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: tc, border: `1px solid ${tc}55`, padding: '2px 8px', borderRadius: 10, flexShrink: 0 }}>
                      {tierLabel}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {selectedUser && (
          <div style={{ padding: '8px 12px', background: isDark ? 'rgba(201,168,76,0.06)' : 'rgba(201,168,76,0.08)', border: 'none', borderLeft: `3px solid ${PUSH_TIER_COLORS[selectedUser.role === 'minister' ? 'minister' : selectedUser.tier] || '#9a8c74'}`, borderRadius: '0 4px 4px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ fontFamily: crimson, fontSize: 13, color: isDark ? '#e8dcc8' : '#1C1410', minWidth: 0 }}>
              <span style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.08em', marginRight: 6 }}>SENDING TO</span>
              {[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ')}
              <span style={{ color: isDark ? '#9a8c74' : '#5C5248', marginLeft: 6 }}>({selectedUser.email})</span>
            </div>
            <button onClick={clearUser} title="Clear" style={{ background: 'none', border: 'none', color: isDark ? '#9a8c74' : '#5C5248', cursor: 'pointer', fontSize: 18, padding: '0 2px', lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
        )}

        <button
          onClick={sendTest}
          disabled={sending || !title}
          style={{
            padding: '10px 24px', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em',
            background: sending ? 'rgba(201,168,76,0.4)' : G, color: '#1a1305',
            border: 'none', borderRadius: 4, cursor: sending ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
          }}
        >
          {sending ? 'SENDING...' : selectedUser ? `SEND TO ${[selectedUser.firstName, selectedUser.lastName].filter(Boolean).join(' ').toUpperCase() || 'USER'}` : 'SEND TO ALL'}
        </button>

        {result && (
          <div style={{ padding: '8px 12px', background: result.startsWith('Error') ? 'rgba(200,74,74,0.1)' : 'rgba(95,174,111,0.1)', border: `1px solid ${result.startsWith('Error') ? 'rgba(200,74,74,0.3)' : 'rgba(95,174,111,0.3)'}`, borderRadius: 4, fontFamily: crimson, fontSize: 13, color: result.startsWith('Error') ? '#c84a4a' : '#5fae6f' }}>
            {result}
          </div>
        )}
      </div>

      <div style={{ marginTop: 32, padding: '12px 16px', background: isDark ? 'rgba(201,168,76,0.04)' : 'rgba(201,168,76,0.08)', border: `1px solid ${isDark ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.25)'}`, borderRadius: 6 }}>
        <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em', marginBottom: 6 }}>iOS NOTE</div>
        <p style={{ fontFamily: crimson, fontSize: 13, color: isDark ? '#9a8c74' : '#5C5248', lineHeight: 1.6, margin: 0 }}>
          Safari on iOS only supports Web Push when the app is installed as a PWA (Add to Home Screen). Users on iOS who have not installed the app will not receive push notifications. This is an Apple platform restriction.
        </p>
      </div>

      <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 10, padding: '20px 24px', marginTop: 24 }}>
        <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: 16 }}>
          ✉ Email Test Panel
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' as const }}>
          <input
            value={testEmailAddr}
            onChange={e => setTestEmailAddr(e.target.value)}
            placeholder="Send test to..."
            style={{ flex: 1, minWidth: 200, background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 12px', color: TXT, fontSize: 13, outline: 'none' }}
          />
          <select
            value={testEmailType}
            onChange={e => setTestEmailType(e.target.value)}
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff', border: `1px solid ${BDR}`, borderRadius: 6, padding: '8px 12px', color: TXT, fontSize: 13, outline: 'none', fontFamily: cinzel }}
          >
            <option value="welcome">Welcome Email</option>
            <option value="upgrade">Upgrade Confirmation</option>
            <option value="dm_request">DM Request</option>
            <option value="weekly_digest">Weekly Digest</option>
            <option value="admin_summary">Admin Daily Summary</option>
          </select>
          <button
            disabled={testEmailSending}
            onClick={async () => {
              setTestEmailSending(true)
              setTestEmailResult(null)
              try {
                const t = await getToken()
                const res = await fetch('/api/send-email?action=test', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
                  body: JSON.stringify({ email: testEmailAddr, type: testEmailType }),
                })
                const d = await res.json()
                setTestEmailResult(res.ok ? `✓ Sent to ${d.sent_to}` : `✗ ${d.error}`)
              } catch (err: any) {
                setTestEmailResult(`✗ ${err.message}`)
              }
              setTestEmailSending(false)
            }}
            style={{ background: G, color: '#0D0B14', border: 'none', borderRadius: 6, padding: '8px 18px', fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', cursor: 'pointer', opacity: testEmailSending ? 0.6 : 1 }}
          >
            {testEmailSending ? 'Sending...' : 'Send Test'}
          </button>
        </div>
        {testEmailResult && (
          <div style={{ fontSize: 12, color: testEmailResult.startsWith('✓') ? '#4ade80' : '#f87171', marginTop: 4 }}>
            {testEmailResult}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── CONTENT STUDIO ──────────────────────────────────────────────────────────
type CSType = 'daily_brief' | 'field_manual' | 'weekly_intel' | 'fringe_article'

const CS_TYPE_CONFIG: Record<CSType, { icon: string; label: string; desc: string }> = {
  daily_brief:    { icon: '📅', label: 'Daily Brief',   desc: 'Morning prayer, scripture, devotional, evening prayer' },
  field_manual:   { icon: '📖', label: 'Field Manual',  desc: 'Ministry protocol with scriptures, steps & declarations' },
  weekly_intel:   { icon: '📡', label: 'Weekly Intel',  desc: 'Ministry intelligence briefing for commanders' },
  fringe_article: { icon: '🔍', label: 'Fringe Article', desc: 'Occult/spiritual warfare intelligence report' },
}

function ContentStudio({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const bg    = isDark ? '#0D0B14' : '#FAF8F5'
  const panel = isDark ? '#0f0e16' : '#EDE6D3'
  const surf  = isDark ? 'rgba(201,168,76,0.06)' : '#FFFFFF'
  const bdr   = isDark ? 'rgba(201,168,76,0.18)' : 'rgba(139,105,20,0.25)'
  const txt2  = isDark ? '#E8D5B0' : '#2D2924'
  const mut   = isDark ? '#8B7355' : '#5C5248'
  const GG    = isDark ? '#C9A84C' : '#8B6914'
  const inp: React.CSSProperties = { background: bg, border: `1px solid ${bdr}`, borderRadius: 6, padding: '8px 12px', color: txt2, fontFamily: crimson, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' as const }

  const [csType, setCsType]       = useState<CSType>('daily_brief')
  const [title, setTitle]         = useState('')
  const [generating, setGenerating] = useState(false)
  const [generated, setGenerated] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [msg, setMsg]             = useState('')

  // Daily Brief
  const [morningPrayer, setMorningPrayer] = useState('')
  const [scripture, setScripture]         = useState('')
  const [scriptureText, setScriptureText] = useState('')
  const [devotional, setDevotional]       = useState('')
  const [eveningPrayer, setEveningPrayer] = useState('')
  const [videoUrl, setVideoUrl]           = useState('')
  const [briefDate, setBriefDate]         = useState(new Date().toISOString().slice(0, 10))

  // Field Manual
  const [fmSummary, setFmSummary] = useState('')
  const [fmDraft, setFmDraft]     = useState('')
  const [fmCategory, setFmCategory] = useState('General')

  // Weekly Intel
  const [wiSummary, setWiSummary] = useState('')
  const [wiBody, setWiBody]       = useState('')
  const [wiTags, setWiTags]       = useState('')

  // Fringe Article
  const [faCategory, setFaCategory] = useState<'open-intel' | 'classified' | 'the-feed' | 'intel-faq'>('open-intel')
  const [faBody, setFaBody]         = useState('')
  const [faSummary, setFaSummary]   = useState('')

  function clearFields() {
    setMorningPrayer(''); setScripture(''); setScriptureText(''); setDevotional(''); setEveningPrayer(''); setVideoUrl('')
    setFmSummary(''); setFmDraft('')
    setWiSummary(''); setWiBody(''); setWiTags('')
    setFaCategory('open-intel'); setFaBody(''); setFaSummary('')
    setGenerated(false); setMsg('')
  }

  async function generate() {
    if (!title.trim()) { setMsg('Enter a title first'); return }
    setGenerating(true); setMsg('')
    try {
      const token = await getToken()
      const res = await fetch('/api/admin-content-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: title.trim(), type: csType }),
      })
      const data = await res.json()
      if (!res.ok) { setMsg(data.error || 'Generation failed'); setGenerating(false); return }

      if (csType === 'daily_brief') {
        setMorningPrayer(data.morningPrayer || '')
        setScripture(data.scripture || '')
        setScriptureText(data.scriptureText || '')
        setDevotional(data.devotional || '')
        setEveningPrayer(data.eveningPrayer || '')
      } else if (csType === 'field_manual') {
        setFmSummary(data.summary || '')
        setFmDraft(data.draft || data.content || '')
      } else if (csType === 'weekly_intel') {
        setWiSummary(data.summary || '')
        setWiBody(data.body || '')
        setWiTags(Array.isArray(data.tags) ? data.tags.join(', ') : '')
      } else {
        setFaCategory((data.category as any) || 'open-intel')
        setFaBody(data.body || '')
        setFaSummary(data.body ? data.body.slice(0, 200) : '')
      }
      setGenerated(true)
    } catch { setMsg('Network error') }
    setGenerating(false)
  }

  async function save(publish: boolean) {
    if (!title.trim()) { setMsg('Enter a title first'); return }
    setSaving(true); setMsg('')
    try {
      const token = await getToken()
      const auth = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      let res: Response

      if (csType === 'daily_brief') {
        res = await fetch('/api/daily-devotion', {
          method: 'POST', headers: auth,
          body: JSON.stringify({ date: briefDate, title, morningPrayer, devotionalText: devotional, scripture: scriptureText, scriptureReference: scripture, eveningPrayer, youtubeUrl: videoUrl || null, published: publish, minTier: 'watchman' }),
        })
      } else if (csType === 'field_manual') {
        res = await fetch('/api/field-manual', {
          method: 'POST', headers: auth,
          body: JSON.stringify({ category: fmCategory || 'General', title, slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), content: fmDraft, is_published: publish }),
        })
      } else if (csType === 'weekly_intel') {
        res = await fetch('/api/intel-posts', {
          method: 'POST', headers: auth,
          body: JSON.stringify({ title, body: wiBody, post_type: 'briefing' }),
        })
      } else {
        res = await fetch('/api/fringe-articles', {
          method: 'POST', headers: auth,
          body: JSON.stringify({ title, summary: faSummary || faBody.slice(0, 200), wri_take: faBody, tag: faCategory, status: publish ? 'published' : 'pending' }),
        })
      }

      const d = await res.json()
      if (res.ok) { setMsg(`✓ ${publish ? 'Published' : 'Saved as draft'} — ${CS_TYPE_CONFIG[csType].label}`); setTitle(''); clearFields() }
      else setMsg(d.error || 'Save failed')
    } catch { setMsg('Network error') }
    setSaving(false)
  }

  const tierBadge = (label: string, color: string, bg: string, bd: string) => (
    <span style={{ fontFamily: cinzel, fontSize: 7, color, background: bg, border: `1px solid ${bd}`, borderRadius: 10, padding: '2px 7px', marginLeft: 8 }}>{label}</span>
  )

  return (
    <div style={{ display: 'flex', minHeight: 'calc(100vh - 180px)' }}>
      {/* ── Left panel ── */}
      <div style={{ width: 292, flexShrink: 0, background: panel, borderRight: `1px solid ${bdr}`, padding: '24px 18px', display: 'flex', flexDirection: 'column', gap: 0 }}>
        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, color: GG, letterSpacing: '0.15em', marginBottom: 4 }}>✦ CONTENT STUDIO</div>
          <div style={{ fontFamily: crimson, fontSize: 13, color: mut, lineHeight: 1.5 }}>SOL generates complete content from your title.</div>
        </div>

        {/* Type grid */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: cinzel, fontSize: 8, color: mut, letterSpacing: '0.15em', marginBottom: 10 }}>CONTENT TYPE</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(Object.entries(CS_TYPE_CONFIG) as [CSType, typeof CS_TYPE_CONFIG[CSType]][]).map(([key, cfg]) => (
              <button key={key} onClick={() => { setCsType(key); clearFields() }}
                style={{ padding: '12px 6px', background: csType === key ? 'rgba(201,168,76,0.12)' : surf, border: `1px solid ${csType === key ? GG : bdr}`, borderRadius: 8, cursor: 'pointer', textAlign: 'center' as const }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{cfg.icon}</div>
                <div style={{ fontFamily: cinzel, fontSize: 7, color: csType === key ? GG : mut, letterSpacing: '0.06em', lineHeight: 1.3 }}>{cfg.label.toUpperCase()}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: cinzel, fontSize: 8, color: mut, letterSpacing: '0.14em', marginBottom: 7 }}>TITLE</div>
          <input value={title} onChange={e => setTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') generate() }}
            placeholder={`${CS_TYPE_CONFIG[csType].label} title...`}
            style={{ ...inp, fontSize: 13, padding: '10px 12px' }} />
        </div>

        {/* Generate button */}
        <button onClick={generate} disabled={generating || !title.trim()}
          style={{ width: '100%', padding: '11px', background: generating ? `rgba(201,168,76,0.1)` : GG, color: generating ? GG : '#0D0B14', border: `1px solid ${GG}`, borderRadius: 8, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em', cursor: generating || !title.trim() ? 'not-allowed' : 'pointer', opacity: !title.trim() && !generating ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 8 }}>
          <img src="/images/sol/sol-icon.png" width={13} height={13} style={{ objectFit: 'contain' as const, filter: generating ? 'none' : 'brightness(0)' }} />
          {generating ? 'GENERATING...' : '✦ GENERATE WITH SOL'}
        </button>
        <div style={{ fontFamily: crimson, fontSize: 11, color: mut, textAlign: 'center' as const, lineHeight: 1.5 }}>
          SOL fills all fields based on your title
        </div>

        {msg && (
          <div style={{ marginTop: 16, padding: '8px 12px', background: msg.startsWith('✓') ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.06)', border: `1px solid ${msg.startsWith('✓') ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.25)'}`, borderRadius: 6, fontFamily: crimson, fontSize: 13, color: msg.startsWith('✓') ? '#4ade80' : '#f87171' }}>
            {msg}
          </div>
        )}
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' as const, background: bg }}>
        {!generated && !title && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, color: mut, textAlign: 'center' as const, padding: '60px 0' }}>
            <img src="/images/sol/sol-icon.png" width={56} height={56}
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 16px rgba(201,168,76,0.4))' }} />
            <div style={{ fontFamily: cinzel, fontSize: 11, color: GG, letterSpacing: '0.15em' }}>CONTENT STUDIO</div>
            <div style={{ fontFamily: crimson, fontSize: 14, color: mut, maxWidth: 360, lineHeight: 1.7 }}>
              Select a type, enter your title, and click Generate. SOL writes the complete content.
            </div>
          </div>
        )}

        {(generated || title) && (
          <div>
            {generated && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, padding: '7px 12px', background: 'rgba(201,168,76,0.06)', border: `1px solid rgba(201,168,76,0.2)`, borderRadius: 6 }}>
                <img src="/images/sol/sol-icon.png" width={12} height={12} style={{ objectFit: 'contain' }} />
                <span style={{ fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em' }}>✦ GENERATED BY SOL — Review and edit before saving</span>
              </div>
            )}

            {/* Daily Brief form */}
            {csType === 'daily_brief' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>TITLE</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>DATE</label>
                    <input type="date" value={briefDate} onChange={e => setBriefDate(e.target.value)} style={{ ...inp, width: 150 }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em' }}>MORNING PRAYER</label>
                    {tierBadge('WATCHMAN FREE', '#C9A84C', 'rgba(201,168,76,0.08)', 'rgba(201,168,76,0.25)')}
                  </div>
                  <textarea value={morningPrayer} onChange={e => setMorningPrayer(e.target.value)} rows={5} style={{ ...inp, resize: 'vertical' as const }} />
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>SCRIPTURE REFERENCE</label>
                    <input value={scripture} onChange={e => setScripture(e.target.value)} placeholder="e.g. Ephesians 6:12" style={inp} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>SCRIPTURE TEXT</label>
                  <textarea value={scriptureText} onChange={e => setScriptureText(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' as const }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em' }}>DEVOTIONAL</label>
                    {tierBadge('SOLDIER+', '#4ade80', 'rgba(74,222,128,0.06)', 'rgba(74,222,128,0.3)')}
                  </div>
                  <textarea value={devotional} onChange={e => setDevotional(e.target.value)} rows={10} style={{ ...inp, resize: 'vertical' as const, fontFamily: 'monospace', fontSize: 12 }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em' }}>EVENING PRAYER</label>
                    {tierBadge('SOLDIER+', '#4ade80', 'rgba(74,222,128,0.06)', 'rgba(74,222,128,0.3)')}
                  </div>
                  <textarea value={eveningPrayer} onChange={e => setEveningPrayer(e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' as const }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: mut, letterSpacing: '0.1em', marginBottom: 6 }}>VIDEO URL (OPTIONAL)</label>
                  <input value={videoUrl} onChange={e => setVideoUrl(e.target.value)} placeholder="https://youtube.com/..." style={inp} />
                </div>
              </div>
            )}

            {/* Field Manual form */}
            {csType === 'field_manual' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>TITLE</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} style={inp} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>CATEGORY</label>
                    <input value={fmCategory} onChange={e => setFmCategory(e.target.value)} placeholder="e.g. Deliverance" style={inp} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>SUMMARY</label>
                  <textarea value={fmSummary} onChange={e => setFmSummary(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' as const }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>FULL DRAFT (MARKDOWN)</label>
                  <textarea value={fmDraft} onChange={e => setFmDraft(e.target.value)} rows={20} style={{ ...inp, resize: 'vertical' as const, fontFamily: 'monospace', fontSize: 12 }} />
                </div>
              </div>
            )}

            {/* Weekly Intel form */}
            {csType === 'weekly_intel' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>TITLE</label>
                  <input value={title} onChange={e => setTitle(e.target.value)} style={inp} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>SUMMARY HOOK</label>
                  <textarea value={wiSummary} onChange={e => setWiSummary(e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' as const }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>BODY CONTENT (MARKDOWN)</label>
                  <textarea value={wiBody} onChange={e => setWiBody(e.target.value)} rows={15} style={{ ...inp, resize: 'vertical' as const, fontFamily: 'monospace', fontSize: 12 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: mut, letterSpacing: '0.1em', marginBottom: 6 }}>TAGS (COMMA SEPARATED)</label>
                  <input value={wiTags} onChange={e => setWiTags(e.target.value)} placeholder="deliverance, intercession, warfare" style={inp} />
                </div>
              </div>
            )}

            {/* Fringe Article form */}
            {csType === 'fringe_article' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 2 }}>
                    <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>TITLE</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} style={inp} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>CATEGORY</label>
                    <select value={faCategory} onChange={e => setFaCategory(e.target.value as any)} style={{ ...inp, cursor: 'pointer' }}>
                      <option value="open-intel">Open Intel</option>
                      <option value="classified">Classified</option>
                      <option value="the-feed">The Feed</option>
                      <option value="intel-faq">Intel FAQ</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>SUMMARY</label>
                  <textarea value={faSummary} onChange={e => setFaSummary(e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' as const }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontFamily: cinzel, fontSize: 8, color: GG, letterSpacing: '0.1em', marginBottom: 6 }}>BODY (MARKDOWN)</label>
                  <textarea value={faBody} onChange={e => setFaBody(e.target.value)} rows={15} style={{ ...inp, resize: 'vertical' as const, fontFamily: 'monospace', fontSize: 12 }} />
                </div>
              </div>
            )}

            {/* Save buttons */}
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button onClick={() => save(true)} disabled={saving || !title.trim()}
                style={{ padding: '10px 24px', background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.4)', borderRadius: 6, color: '#4ade80', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: saving || !title.trim() ? 'not-allowed' : 'pointer', opacity: !title.trim() ? 0.5 : 1 }}>
                {saving ? '...' : '✓ Save and Publish'}
              </button>
              <button onClick={() => save(false)} disabled={saving || !title.trim()}
                style={{ padding: '10px 24px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 6, color: mut, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', cursor: saving || !title.trim() ? 'not-allowed' : 'pointer', opacity: !title.trim() ? 0.5 : 1 }}>
                {saving ? '...' : 'Save Draft'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── ADMIN TESTING PANEL ────────────────────────────────────────────────────
function AdminTestingPanel({ getToken, isDark }: { getToken: () => Promise<string | null>; isDark: boolean }) {
  const [testingVisible, setTestingVisible] = useState(true)
  const [testingMsg, setTestingMsg]         = useState('')
  const [loadingSettings, setLoadingSettings] = useState(true)
  const [savingSettings, setSavingSettings]   = useState(false)
  const [bugs, setBugs]                       = useState<any[]>([])
  const [features, setFeatures]               = useState<any[]>([])
  const [loadingBugs, setLoadingBugs]         = useState(true)
  const [loadingFeats, setLoadingFeats]       = useState(true)
  const [editBugId, setEditBugId]             = useState<string | null>(null)
  const [editBugStatus, setEditBugStatus]     = useState('')
  const [editBugNote, setEditBugNote]         = useState('')
  const [editFeatId, setEditFeatId]           = useState<string | null>(null)
  const [editFeatStatus, setEditFeatStatus]   = useState('')
  const [editFeatNote, setEditFeatNote]       = useState('')
  const [savingItem, setSavingItem]           = useState(false)

  const bg    = isDark ? '#0D0B14' : '#f5f3ee'
  const surf  = isDark ? '#12101e' : '#fff'
  const bdr   = isDark ? 'rgba(201,168,76,0.22)' : 'rgba(201,168,76,0.3)'
  const txt   = isDark ? '#e8dcc8' : '#1a1208'
  const dim   = isDark ? '#a09080' : '#8b7355'
  const mut   = isDark ? '#6b5e45' : '#a09080'
  const inp: React.CSSProperties = { width: '100%', background: bg, border: `1px solid ${bdr}`, borderRadius: 6, padding: '7px 10px', color: txt, fontFamily: "'Crimson Pro', serif", fontSize: 13, outline: 'none', boxSizing: 'border-box' as const }
  const lbl: React.CSSProperties = { fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.12em', color: mut, display: 'block', marginBottom: 4 }

  async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = await getToken()
    return fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...((opts.headers as any) || {}) } })
  }

  async function loadSettings() {
    setLoadingSettings(true)
    try {
      const r = await fetch('/api/testing-settings')
      const d = await r.json()
      setTestingVisible(d.testing_visible ?? true)
      setTestingMsg(d.testing_message || '')
    } finally { setLoadingSettings(false) }
  }

  async function saveSettings() {
    setSavingSettings(true)
    try {
      await apiFetch('/api/testing-settings', { method: 'PATCH', body: JSON.stringify({ testing_visible: testingVisible, testing_message: testingMsg }) })
    } finally { setSavingSettings(false) }
  }

  async function loadBugs() {
    setLoadingBugs(true)
    try { const r = await apiFetch('/api/beta-reports?type=bug&sort=new'); const d = await r.json(); setBugs(d.reports || []) } finally { setLoadingBugs(false) }
  }

  async function loadFeatures() {
    setLoadingFeats(true)
    try { const r = await apiFetch('/api/beta-reports?type=feature&sort=new'); const d = await r.json(); setFeatures(d.reports || []) } finally { setLoadingFeats(false) }
  }

  useEffect(() => { loadSettings(); loadBugs(); loadFeatures() }, [])

  async function saveBug() {
    if (!editBugId) return
    setSavingItem(true)
    try {
      await apiFetch('/api/beta-reports', { method: 'PATCH', body: JSON.stringify({ id: editBugId, status: editBugStatus, fixSummary: editBugNote }) })
      setEditBugId(null); await loadBugs()
    } finally { setSavingItem(false) }
  }

  async function saveFeat() {
    if (!editFeatId) return
    setSavingItem(true)
    try {
      await apiFetch('/api/beta-reports', { method: 'PATCH', body: JSON.stringify({ id: editFeatId, status: editFeatStatus, fixSummary: editFeatNote }) })
      setEditFeatId(null); await loadFeatures()
    } finally { setSavingItem(false) }
  }

  function exportCSV() {
    const rows: string[][] = [['Type','Title','Priority','Section','Submitted By','Created','Status','Fix Summary']]
    bugs.forEach(b => rows.push(['bug', b.title, b.priority || '', b.page_section || '', b.user_name || '', b.created_at, b.status, b.fix_summary || '']))
    features.forEach(f => rows.push(['feature', f.title, '', '', f.user_name || '', f.created_at, f.status, f.fix_summary || '']))
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'testing-feedback.csv'; a.click()
  }

  const SEV_COLORS: Record<string, string> = { low: '#6b7280', medium: '#b45309', high: '#c2410c', critical: '#dc2626' }
  const STATUS_BG: Record<string, string> = { new: 'rgba(201,168,76,0.12)', confirmed: 'rgba(59,130,246,0.12)', in_progress: 'rgba(59,130,246,0.12)', fixed: 'rgba(34,197,94,0.12)', deployed: 'rgba(34,197,94,0.12)', wont_fix: 'rgba(100,100,100,0.12)', by_design: 'rgba(100,100,100,0.12)', duplicate: 'rgba(100,100,100,0.12)' }
  const STATUS_C: Record<string, string> = { new: G, confirmed: '#60a5fa', in_progress: '#60a5fa', fixed: '#4ade80', deployed: '#4ade80', wont_fix: '#9ca3af', by_design: '#9ca3af', duplicate: '#9ca3af' }

  return (
    <div style={{ padding: '24px 0' }}>
      <div style={{ fontFamily: "'Cinzel', serif", fontSize: 14, letterSpacing: '0.14em', color: G, marginBottom: 20 }}>🧪 TESTING COMMAND CENTER</div>

      {/* Settings card */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: 20, marginBottom: 24 }}>
        <div style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.18em', color: G, marginBottom: 14 }}>VISIBILITY SETTINGS</div>
        {loadingSettings ? <div style={{ color: dim, fontSize: 12 }}>Loading...</div> : (
          <div style={{ display: 'grid', gap: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div
                onClick={() => setTestingVisible(v => !v)}
                style={{ width: 44, height: 24, borderRadius: 12, background: testingVisible ? G : 'rgba(100,100,100,0.3)', position: 'relative' as const, cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0 }}
              >
                <div style={{ position: 'absolute' as const, top: 3, left: testingVisible ? 22 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 10, letterSpacing: '0.1em', color: testingVisible ? G : dim }}>
                Testing Mode {testingVisible ? 'ON' : 'OFF'} — sidebar link {testingVisible ? 'visible' : 'hidden'} for all users
              </span>
            </label>
            <div>
              <label style={lbl}>BANNER MESSAGE</label>
              <input style={inp} value={testingMsg} onChange={e => setTestingMsg(e.target.value)} placeholder="Message shown in the testing banner..." />
            </div>
            <button onClick={saveSettings} disabled={savingSettings} style={{ alignSelf: 'flex-start', fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.12em', background: G, color: BG, border: 'none', borderRadius: 4, padding: '7px 16px', cursor: 'pointer', opacity: savingSettings ? 0.5 : 1 }}>
              {savingSettings ? 'SAVING...' : 'SAVE SETTINGS'}
            </button>
          </div>
        )}
      </div>

      {/* Export */}
      <div style={{ marginBottom: 20 }}>
        <button onClick={exportCSV} style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.12em', background: 'transparent', border: `1px solid ${bdr}`, color: dim, borderRadius: 4, padding: '7px 14px', cursor: 'pointer' }}>
          ↓ Export All Feedback as CSV
        </button>
      </div>

      {/* Bug Reports */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.18em', color: G }}>BUG REPORTS ({bugs.length})</span>
        </div>
        {loadingBugs ? <div style={{ padding: 20, color: dim, fontSize: 12 }}>Loading...</div> : bugs.length === 0 ? <div style={{ padding: 20, color: dim, fontSize: 12, fontStyle: 'italic' }}>No bug reports yet.</div> : bugs.map(bug => (
          <div key={bug.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${bdr}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' as const }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: G }}>{bug.title}</span>
                  {bug.priority && <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, color: SEV_COLORS[bug.priority] || dim, border: `1px solid ${SEV_COLORS[bug.priority] || dim}44`, padding: '1px 5px', borderRadius: 8 }}>{bug.priority}</span>}
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, background: STATUS_BG[bug.status] || 'transparent', color: STATUS_C[bug.status] || dim, padding: '1px 6px', borderRadius: 8 }}>{(bug.status || '').replace(/_/g,' ')}</span>
                </div>
                <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: txt, margin: '0 0 4px', lineHeight: 1.4 }}>{bug.description}</p>
                <div style={{ fontSize: 11, color: dim, fontFamily: "'Crimson Pro', serif" }}>
                  {bug.user_name}{bug.page_section ? ` · ${bug.page_section}` : ''}
                </div>
                {editBugId === bug.id ? (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    <select style={{ ...inp, width: 'auto', fontSize: 11 }} value={editBugStatus} onChange={e => setEditBugStatus(e.target.value)}>
                      {['new','confirmed','in_progress','fixed','deployed','wont_fix','by_design','duplicate'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                    </select>
                    <input style={{ ...inp, flex: 1, fontSize: 11 }} value={editBugNote} onChange={e => setEditBugNote(e.target.value)} placeholder="Fix summary..." />
                    <button onClick={saveBug} disabled={savingItem} style={{ fontFamily: "'Cinzel', serif", fontSize: 9, background: G, color: BG, border: 'none', borderRadius: 4, padding: '5px 12px', cursor: 'pointer' }}>{savingItem ? '...' : 'Save'}</button>
                    <button onClick={() => setEditBugId(null)} style={{ fontFamily: "'Cinzel', serif", fontSize: 9, background: 'none', border: `1px solid ${bdr}`, color: dim, borderRadius: 4, padding: '5px 10px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditBugId(bug.id); setEditBugStatus(bug.status); setEditBugNote(bug.fix_summary || '') }}
                    style={{ marginTop: 6, fontFamily: "'Cinzel', serif", fontSize: 8, background: 'none', border: `1px solid ${bdr}`, color: dim, borderRadius: 4, padding: '3px 10px', cursor: 'pointer', letterSpacing: '0.08em' }}>
                    UPDATE STATUS
                  </button>
                )}
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: dim }}>▲ {bug.upvotes}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Feature Requests */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${bdr}` }}>
          <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, letterSpacing: '0.18em', color: G }}>FEATURE REQUESTS ({features.length})</span>
        </div>
        {loadingFeats ? <div style={{ padding: 20, color: dim, fontSize: 12 }}>Loading...</div> : features.length === 0 ? <div style={{ padding: 20, color: dim, fontSize: 12, fontStyle: 'italic' }}>No feature requests yet.</div> : features.map(feat => (
          <div key={feat.id} style={{ padding: '12px 16px', borderBottom: `1px solid ${bdr}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' as const }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' as const, marginBottom: 4 }}>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 11, color: G }}>{feat.title}</span>
                  <span style={{ fontFamily: "'Cinzel', serif", fontSize: 8, background: STATUS_BG[feat.status] || 'transparent', color: STATUS_C[feat.status] || dim, padding: '1px 6px', borderRadius: 8 }}>{feat.status.replace('_',' ')}</span>
                </div>
                <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: 12, color: txt, margin: '0 0 4px', lineHeight: 1.4 }}>{feat.description}</p>
                <div style={{ fontSize: 11, color: dim, fontFamily: "'Crimson Pro', serif" }}>{feat.user_name}</div>
                {editFeatId === feat.id ? (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    <select style={{ ...inp, width: 'auto', fontSize: 11 }} value={editFeatStatus} onChange={e => setEditFeatStatus(e.target.value)}>
                      {['new','confirmed','in_progress','fixed','deployed','wont_fix','by_design','duplicate'].map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                    </select>
                    <input style={{ ...inp, flex: 1, fontSize: 11 }} value={editFeatNote} onChange={e => setEditFeatNote(e.target.value)} placeholder="Note..." />
                    <button onClick={saveFeat} disabled={savingItem} style={{ fontFamily: "'Cinzel', serif", fontSize: 9, background: G, color: BG, border: 'none', borderRadius: 4, padding: '5px 12px', cursor: 'pointer' }}>{savingItem ? '...' : 'Save'}</button>
                    <button onClick={() => setEditFeatId(null)} style={{ fontFamily: "'Cinzel', serif", fontSize: 9, background: 'none', border: `1px solid ${bdr}`, color: dim, borderRadius: 4, padding: '5px 10px', cursor: 'pointer' }}>Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => { setEditFeatId(feat.id); setEditFeatStatus(feat.status); setEditFeatNote(feat.fix_summary || '') }}
                    style={{ marginTop: 6, fontFamily: "'Cinzel', serif", fontSize: 8, background: 'none', border: `1px solid ${bdr}`, color: dim, borderRadius: 4, padding: '3px 10px', cursor: 'pointer', letterSpacing: '0.08em' }}>
                    UPDATE STATUS
                  </button>
                )}
              </div>
              <span style={{ fontFamily: "'Cinzel', serif", fontSize: 9, color: dim }}>▲ {feat.upvotes}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TestSOLPanel({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const surf = isDark ? SURF : '#FFFFFF'
  const bdr  = isDark ? BDR  : 'rgba(139,105,20,0.25)'
  const txt  = isDark ? TXT  : '#2D2924'
  const dim  = isDark ? DIM  : '#5C5248'
  const inp: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: isDark ? 'rgba(13,11,20,0.8)' : '#FAF8F5',
    border: `1px solid ${bdr}`, borderRadius: 6,
    padding: '10px 14px', color: txt,
    fontFamily: crimson, fontSize: 14, outline: 'none', resize: 'vertical' as const,
  }
  const [prompt, setPrompt]   = useState('')
  const [result, setResult]   = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function run() {
    if (!prompt.trim()) return
    setLoading(true); setError(''); setResult(null)
    const start = Date.now()
    try {
      const token = await getToken()
      const res = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: prompt, conversationHistory: [] }),
      })
      const data = await res.json()
      setResult({
        response: data.response || data.message || JSON.stringify(data),
        elapsed:  Date.now() - start,
        tokens:   data.usage || null,
        model:    data.model || null,
      })
    } catch (e: any) { setError(e.message || 'Request failed') }
    setLoading(false)
  }

  return (
    <div style={{ color: txt, fontFamily: crimson }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: cinzel, fontSize: 20, color: G, marginBottom: 4, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/images/sol/sol-icon.png" width={22} height={22} style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.7))' }} alt="" />
          Test SOL
        </div>
        <div style={{ fontFamily: crimson, fontSize: 13, color: dim }}>Send a test prompt to the AI assistant and inspect the response</div>
      </div>

      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: 24, marginBottom: 20 }}>
        <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em', marginBottom: 10 }}>TEST PROMPT</div>
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Enter a test prompt for SOL..." rows={5} style={{ ...inp, minHeight: 100 }} />
        <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={run} disabled={loading || !prompt.trim()}
            style={{ background: loading || !prompt.trim() ? 'transparent' : 'rgba(201,168,76,0.15)', border: `1px solid ${loading || !prompt.trim() ? bdr : G}`, borderRadius: 6, color: loading || !prompt.trim() ? dim : G, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', padding: '9px 22px', cursor: loading || !prompt.trim() ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
            {loading ? '⏳ Running...' : '▶ Run Test'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 8, padding: '12px 16px', marginBottom: 16, fontFamily: crimson, fontSize: 13, color: '#f87171' }}>{error}</div>
      )}

      {result && (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 10, padding: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 10, color: G, letterSpacing: '0.1em', marginBottom: 16 }}>RESPONSE</div>
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' as const, marginBottom: 16 }}>
            <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${bdr}`, borderRadius: 6, padding: '8px 14px' }}>
              <div style={{ fontFamily: cinzel, fontSize: 8, color: dim, letterSpacing: '0.1em', marginBottom: 2 }}>RESPONSE TIME</div>
              <div style={{ fontFamily: cinzel, fontSize: 16, color: G }}>{result.elapsed.toLocaleString()}ms</div>
            </div>
            {result.tokens && (
              <>
                <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${bdr}`, borderRadius: 6, padding: '8px 14px' }}>
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: dim, letterSpacing: '0.1em', marginBottom: 2 }}>INPUT TOKENS</div>
                  <div style={{ fontFamily: cinzel, fontSize: 16, color: G }}>{(result.tokens.input_tokens || result.tokens.prompt_tokens || 0).toLocaleString()}</div>
                </div>
                <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${bdr}`, borderRadius: 6, padding: '8px 14px' }}>
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: dim, letterSpacing: '0.1em', marginBottom: 2 }}>OUTPUT TOKENS</div>
                  <div style={{ fontFamily: cinzel, fontSize: 16, color: G }}>{(result.tokens.output_tokens || result.tokens.completion_tokens || 0).toLocaleString()}</div>
                </div>
                <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${bdr}`, borderRadius: 6, padding: '8px 14px' }}>
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: dim, letterSpacing: '0.1em', marginBottom: 2 }}>EST. COST</div>
                  <div style={{ fontFamily: cinzel, fontSize: 16, color: G }}>
                    ${(((result.tokens.input_tokens || 0) * 0.000003) + ((result.tokens.output_tokens || 0) * 0.000015)).toFixed(4)}
                  </div>
                </div>
              </>
            )}
            {result.model && (
              <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${bdr}`, borderRadius: 6, padding: '8px 14px' }}>
                <div style={{ fontFamily: cinzel, fontSize: 8, color: dim, letterSpacing: '0.1em', marginBottom: 2 }}>MODEL</div>
                <div style={{ fontFamily: cinzel, fontSize: 11, color: G }}>{result.model}</div>
              </div>
            )}
          </div>
          <div style={{ background: isDark ? 'rgba(0,0,0,0.3)' : '#F5F0E8', borderRadius: 8, padding: 16, fontFamily: crimson, fontSize: 14, color: txt, lineHeight: 1.7, whiteSpace: 'pre-wrap' as const }}>
            {result.response}
          </div>
        </div>
      )}
    </div>
  )
}

function AtmosphereAdmin({ getToken, isDark }: { getToken: () => Promise<string | null>; isDark: boolean }) {
  const G   = isDark ? '#C9A84C' : '#8B6914'
  const bg  = isDark ? '#0D0B14' : '#FAF8F5'
  const surf = isDark ? SURF : '#FFFFFF'
  const bdr  = isDark ? BDR : 'rgba(139,105,20,0.25)'
  const txt  = isDark ? TXT : '#2D2924'
  const mut  = isDark ? DIM : '#5C5248'

  const [summary, setSummary]       = useState<any>(null)
  const [trend, setTrend]           = useState<any[]>([])
  const [checkins, setCheckins]     = useState<any[]>([])
  const [alertMsg, setAlertMsg]     = useState('')
  const [alertSending, setAlertSending] = useState(false)
  const [alertResult, setAlertResult]   = useState<string | null>(null)
  const [testSending, setTestSending]   = useState(false)
  const [testResult, setTestResult]     = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const token = await getToken()
      const h = { Authorization: `Bearer ${token}` }
      const [sumRes, trendRes, todayRes] = await Promise.allSettled([
        fetch('/api/atmosphere?action=community-summary', { headers: h }).then(r => r.json()),
        fetch('/api/atmosphere?action=weekly-trend', { headers: h }).then(r => r.json()),
        fetch('/api/atmosphere?action=today', { headers: h }).then(r => r.json()),
      ])
      if (sumRes.status === 'fulfilled')   setSummary(sumRes.value.summary || null)
      if (trendRes.status === 'fulfilled') setTrend(trendRes.value.trend || [])
      if (todayRes.status === 'fulfilled') {
        const d = todayRes.value
        const counts: Record<string, number> = d.statusCounts || {}
        setCheckins(Object.entries(counts).map(([status, count]) => ({ status, count })).sort((a: any, b: any) => b.count - a.count))
      }
    }
    load()
  }, [])

  async function sendSolAlert() {
    setAlertSending(true); setAlertResult(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/atmosphere?action=sol-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: alertMsg || undefined }),
      })
      const d = await res.json()
      setAlertResult(d.alert || (d.error ? `Error: ${d.error}` : 'Sent'))
      setAlertMsg('')
    } catch (e: any) {
      setAlertResult(`Error: ${e.message}`)
    }
    setAlertSending(false)
  }

  async function sendTestPush() {
    setTestSending(true); setTestResult(null)
    try {
      const token = await getToken()
      const res = await fetch('/api/test-atmosphere-push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: '📡 Test Atmosphere Alert', message: 'Watchman push notification test.' }),
      })
      const d = await res.json()
      setTestResult(d.push ? `Sent: ${d.push.sent}, Failed: ${d.push.failed}` : `Error: ${d.error || 'unknown'}`)
    } catch (e: any) {
      setTestResult(`Error: ${e.message}`)
    }
    setTestSending(false)
  }

  async function triggerSnapshot() {
    const token = await getToken()
    const res = await fetch('/api/atmosphere?action=snapshot', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    })
    const d = await res.json()
    if (d.ok) setSummary(d.snapshot)
  }

  const maxTotal = Math.max(...trend.map(d => d.total), 1)

  return (
    <div style={{ background: bg, minHeight: '100%', padding: '28px 0' }}>
      <div style={{ fontFamily: cinzel, fontSize: 13, color: G, letterSpacing: '0.14em', marginBottom: 6 }}>📡 WATCHMAN ATMOSPHERE</div>
      <div style={{ fontFamily: crimson, fontSize: 14, color: mut, marginBottom: 28 }}>
        Community atmosphere readings, SOL alert broadcasting, and sentinel oversight.
      </div>

      {/* Today summary */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'TOTAL CHECK-INS', value: summary.total_checkins, color: G },
            { label: 'COVERED', value: summary.green_count, color: ATM_COLORS_ADMIN.green.dot },
            { label: 'CARRYING', value: summary.amber_count, color: ATM_COLORS_ADMIN.amber.dot },
            { label: 'ASSIGNED', value: summary.purple_count, color: ATM_COLORS_ADMIN.purple.dot },
          ].map(s => (
            <div key={s.label} style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '14px 16px' }}>
              <div style={{ fontFamily: cinzel, fontSize: 8, color: mut, letterSpacing: '0.14em', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: cinzel, fontSize: 22, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top statuses today */}
      {checkins.length > 0 && (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.14em', marginBottom: 12 }}>TODAY'S STATUS DISTRIBUTION</div>
          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 8 }}>
            {checkins.slice(0, 10).map((c: any) => (
              <div key={c.status} style={{ padding: '4px 10px', borderRadius: 12, background: 'rgba(201,168,76,0.08)', border: `1px solid ${bdr}` }}>
                <span style={{ fontFamily: cinzel, fontSize: 9, color: txt }}>{c.status}</span>
                <span style={{ fontFamily: cinzel, fontSize: 9, color: G, marginLeft: 6 }}>{c.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 7-day trend */}
      {trend.length > 0 && (
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '16px 20px', marginBottom: 24 }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.14em', marginBottom: 14 }}>7-DAY ATMOSPHERE TREND</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 80 }}>
            {trend.map((day: any) => {
              const total = day.total || 0
              const barH = total > 0 ? Math.max(4, Math.round((total / maxTotal) * 68)) : 4
              const dom  = day.green >= day.amber && day.green >= day.purple ? 'green'
                         : day.purple >= day.amber ? 'purple' : 'amber'
              const col  = ATM_COLORS_ADMIN[dom]
              const label = new Date(day.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3)
              return (
                <div key={day.date} style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: 4 }}>
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: mut }}>{total}</div>
                  <div style={{ width: '100%', height: barH, background: col.dot, borderRadius: 3, opacity: total > 0 ? 1 : 0.15 }} />
                  <span style={{ fontFamily: cinzel, fontSize: 8, color: mut }}>{label}</span>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12 }}>
            {(['green','amber','purple'] as const).map(cat => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: ATM_COLORS_ADMIN[cat].dot }} />
                <span style={{ fontFamily: cinzel, fontSize: 8, color: mut }}>{ATM_COLORS_ADMIN[cat].label.toUpperCase()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SOL Alert */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.14em', marginBottom: 10 }}>📡 SOL ATMOSPHERE ALERT</div>
        <div style={{ fontFamily: crimson, fontSize: 13, color: mut, marginBottom: 12 }}>
          SOL will analyze today's community atmosphere and generate a prophetic alert broadcast. You can optionally add a minister instruction.
        </div>
        <textarea
          value={alertMsg}
          onChange={e => setAlertMsg(e.target.value)}
          placeholder="Optional minister instruction for SOL (e.g. 'Focus on the fasting warriors')"
          rows={3}
          style={{ width: '100%', boxSizing: 'border-box' as const, background: isDark ? 'rgba(13,11,20,0.8)' : '#FAF8F5', border: `1px solid ${bdr}`, borderRadius: 6, color: txt, fontFamily: crimson, fontSize: 14, padding: '8px 12px', resize: 'vertical' as const, outline: 'none', marginBottom: 10 }}
        />
        {alertResult && (
          <div style={{ background: 'rgba(201,168,76,0.06)', border: `1px solid ${bdr}`, borderRadius: 6, padding: '10px 14px', fontFamily: crimson, fontSize: 14, color: txt, marginBottom: 10 }}>
            <strong style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.1em' }}>SOL ALERT SENT:</strong><br />
            {alertResult}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={sendSolAlert}
            disabled={alertSending}
            style={{ padding: '8px 20px', background: G, border: 'none', borderRadius: 5, color: '#0D0B14', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: alertSending ? 'wait' : 'pointer' }}
          >
            {alertSending ? 'GENERATING…' : 'SEND SOL ALERT'}
          </button>
          <button
            onClick={triggerSnapshot}
            style={{ padding: '8px 16px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 5, color: mut, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer' }}
          >
            SAVE SNAPSHOT
          </button>
        </div>
      </div>

      {/* Test push */}
      <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '16px 20px' }}>
        <div style={{ fontFamily: cinzel, fontSize: 9, color: G, letterSpacing: '0.14em', marginBottom: 8 }}>🔔 TEST PUSH NOTIFICATION</div>
        <div style={{ fontFamily: crimson, fontSize: 13, color: mut, marginBottom: 10 }}>
          Send a test atmosphere push to all subscribers.
        </div>
        {testResult && (
          <div style={{ fontFamily: cinzel, fontSize: 9, color: testResult.startsWith('Error') ? '#ef4444' : '#4ade80', marginBottom: 8 }}>{testResult}</div>
        )}
        <button
          onClick={sendTestPush}
          disabled={testSending}
          style={{ padding: '7px 18px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 5, color: mut, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', cursor: testSending ? 'wait' : 'pointer' }}
        >
          {testSending ? 'SENDING…' : 'SEND TEST PUSH'}
        </button>
      </div>
    </div>
  )
}

// ─── SPIRIT CANDIDATES MANAGER ───────────────────────────────────────────────
function SpiritCandidatesManager({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const SSURF = isDark ? '#13111a' : '#fff'
  const SBDR  = isDark ? 'rgba(201,168,76,0.2)' : 'rgba(139,105,20,0.25)'
  const STXT  = isDark ? '#e8e0d0' : '#2D2924'
  const SMUT  = isDark ? '#9a8c74' : '#5C5248'
  const SG    = '#C9A84C'

  const [candidates, setCandidates]       = useState<any[]>([])
  const [stats, setStats]                 = useState<any>({ pending: 0, approvedWeek: 0, duplicates: 0, total: 0 })
  const [loading, setLoading]             = useState(true)
  const [filter, setFilter]               = useState<'all'|'pending'|'approved'|'rejected'|'duplicate'>('pending')
  const [search, setSearch]               = useState('')
  const [expandedId, setExpandedId]       = useState<string|null>(null)
  const [enrichingId, setEnrichingId]     = useState<string|null>(null)
  const [enrichErrors, setEnrichErrors]   = useState<Record<string,string>>({})
  const [previewData, setPreviewData]     = useState<{preview: Record<string,string>; candidateId: string}|null>(null)
  const [confirmingId, setConfirmingId]   = useState<string|null>(null)
  const [confirmedIds, setConfirmedIds]   = useState<Set<string>>(new Set())
  const [airtableIds, setAirtableIds]     = useState<Record<string,string>>({})
  const [rejectExpanded, setRejectExpanded] = useState<string|null>(null)
  const [rejectReason, setRejectReason]   = useState('')
  const [demonsTotal, setDemonsTotal]     = useState<number|null>(null)

  useEffect(() => {
    loadCandidates()
    fetch('/api/demons').then(r => r.json()).then(d => setDemonsTotal((d.demons || []).length)).catch(() => {})
  }, [filter, search])

  async function loadCandidates() {
    setLoading(true)
    try {
      const token = await getToken()
      const params = new URLSearchParams({ stats: 'true' })
      if (filter !== 'all') params.set('status', filter)
      if (search) params.set('search', search)
      const res = await fetch(`/api/spirit-candidates?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.ok) {
        const d = await res.json()
        setCandidates(d.candidates || [])
        if (d.stats) setStats(d.stats)
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  async function handleEnrich(id: string) {
    setEnrichingId(id)
    setEnrichErrors(p => { const n = { ...p }; delete n[id]; return n })
    try {
      const token = await getToken()
      const res = await fetch('/api/spirit-candidate-enrich', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidateId: id }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error || 'Enrich failed')
      setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...d.enriched } : c))
    } catch (e: any) {
      setEnrichErrors(p => ({ ...p, [id]: e.message }))
    }
    setEnrichingId(null)
  }

  async function handleGetPreview(id: string) {
    try {
      const token = await getToken()
      const res = await fetch('/api/spirit-candidate-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidateId: id }),
      })
      const d = await res.json()
      if (res.ok) setPreviewData({ preview: d.preview, candidateId: d.candidateId })
    } catch { /* ignore */ }
  }

  async function handleConfirmPush(candidateId: string) {
    setConfirmingId(candidateId)
    try {
      const token = await getToken()
      const res = await fetch('/api/spirit-candidate-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidateId, confirmed: true }),
      })
      const d = await res.json()
      if (res.ok) {
        setConfirmedIds(p => new Set([...p, candidateId]))
        setAirtableIds(p => ({ ...p, [candidateId]: d.airtableId || '' }))
        setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, status: 'approved' } : c))
        setPreviewData(null)
        loadCandidates()
      }
    } catch { /* ignore */ }
    setConfirmingId(null)
  }

  async function handleAction(action: string, id: string, extra?: any) {
    try {
      const token = await getToken()
      const res = await fetch('/api/spirit-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action, candidateId: id, ...extra }),
      })
      if (res.ok) {
        setRejectExpanded(null)
        setRejectReason('')
        loadCandidates()
      }
    } catch { /* ignore */ }
  }

  const CONF_COLORS: Record<string, string> = { high: '#4ade80', medium: SG, low: SMUT }
  const STAT_COLORS: Record<string, { bg: string; border: string; text: string }> = {
    pending:   { bg: 'rgba(201,168,76,0.08)',  border: 'rgba(201,168,76,0.3)',  text: SG },
    approved:  { bg: 'rgba(74,222,128,0.08)',  border: 'rgba(74,222,128,0.25)', text: '#4ade80' },
    rejected:  { bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)',text: '#f87171' },
    duplicate: { bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.25)', text: '#fbbf24' },
  }

  return (
    <div style={{ color: STXT, fontFamily: crimson }}>
      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'AIRTABLE DB', value: demonsTotal !== null ? demonsTotal : '--' },
          { label: 'PENDING',     value: stats.pending       },
          { label: 'THIS WEEK',   value: stats.approvedWeek  },
          { label: 'DUPLICATES',  value: stats.duplicates    },
        ].map(s => (
          <div key={s.label} style={{ background: SSURF, border: `1px solid ${SBDR}`, borderRadius: 7, padding: '12px 16px' }}>
            <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.14em', color: SMUT, marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: cinzel, fontSize: 22, color: SG }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' as const, alignItems: 'center' }}>
        {(['all','pending','approved','rejected','duplicate'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', padding: '5px 12px', borderRadius: 4, border: `1px solid ${filter === f ? SG : SBDR}`, background: filter === f ? 'rgba(201,168,76,0.1)' : 'transparent', color: filter === f ? SG : SMUT, cursor: 'pointer', textTransform: 'capitalize' as const }}
          >{f}</button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name..."
          style={{ background: SSURF, border: `1px solid ${SBDR}`, borderRadius: 5, padding: '5px 10px', color: STXT, fontFamily: crimson, fontSize: 13, outline: 'none', width: 180 }}
        />
      </div>

      {/* Table */}
      <div style={{ background: SSURF, border: `1px solid ${SBDR}`, borderRadius: 8, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 80px 1fr 100px 90px 90px', gap: 8, padding: '10px 14px', background: isDark ? '#1a1726' : '#f5f3ef', borderBottom: `1px solid ${SBDR}` }}>
          {['NAME','CONF','SOURCE','KINGDOM','RANK','STATUS'].map(h => (
            <div key={h} style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.12em', color: SMUT }}>{h}</div>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' as const, fontFamily: cinzel, fontSize: 10, color: SMUT, letterSpacing: '0.1em' }}>Loading...</div>
        ) : candidates.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' as const, fontFamily: crimson, fontSize: 14, color: SMUT, fontStyle: 'italic' }}>No candidates match the current filter.</div>
        ) : candidates.map(c => {
          const isExpanded    = expandedId === c.id
          const sc            = STAT_COLORS[c.status] || STAT_COLORS['pending']
          const isConfirmed   = confirmedIds.has(c.id)
          const isRejectOpen  = rejectExpanded === c.id
          return (
            <div key={c.id} style={{ borderBottom: `1px solid ${SBDR}`, background: isConfirmed ? 'rgba(201,168,76,0.05)' : 'transparent' }}>
              {/* Row */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : c.id)}
                style={{ display: 'grid', gridTemplateColumns: '200px 80px 1fr 100px 90px 90px', gap: 8, padding: '10px 14px', cursor: 'pointer', transition: 'background 0.1s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.03)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{ fontFamily: cinzel, fontSize: 10, color: isConfirmed ? SG : STXT, letterSpacing: '0.04em' }}>
                  {c.name}
                  {isConfirmed && <span style={{ marginLeft: 6, fontSize: 9, color: SG }}>✓</span>}
                </div>
                <div style={{ fontFamily: cinzel, fontSize: 9, color: CONF_COLORS[c.confidence] || SMUT }}>{(c.confidence || '').toUpperCase()}</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: SMUT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.source_name || '--'}</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: SMUT }}>{c.kingdom || '--'}</div>
                <div style={{ fontFamily: crimson, fontSize: 12, color: SMUT }}>{c.biblical_rank || '--'}</div>
                <div>
                  <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: sc.text, background: sc.bg, border: `1px solid ${sc.border}`, borderRadius: 3, padding: '2px 7px' }}>{c.status}</span>
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.02)', borderTop: `1px solid ${SBDR}` }}>
                  {/* Enrichment fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                    {[
                      { label: 'Function',     value: c.function         },
                      { label: 'Manifestations', value: c.manifestations  },
                      { label: 'Scripture',    value: c.scripture_context },
                      { label: 'Sub-Kingdom',  value: c.sub_kingdom       },
                      { label: 'Also Known As',value: c.also_known_as     },
                      { label: 'Notes',        value: c.ai_notes          },
                    ].map(f => f.value ? (
                      <div key={f.label}>
                        <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', color: SMUT, marginBottom: 3 }}>{f.label.toUpperCase()}</div>
                        <div style={{ fontFamily: crimson, fontSize: 13, color: STXT, lineHeight: 1.5 }}>{f.value}</div>
                      </div>
                    ) : null)}
                  </div>

                  {/* Duplicate warning */}
                  {c.duplicate_of && (
                    <div style={{ marginBottom: 12, padding: '8px 12px', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.25)', borderRadius: 5 }}>
                      <div style={{ fontFamily: cinzel, fontSize: 9, color: '#fbbf24', letterSpacing: '0.08em', marginBottom: 6 }}>May already exist as: {c.duplicate_of}</div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => handleAction('unmark-duplicate', c.id)} style={{ fontFamily: cinzel, fontSize: 8, color: SG, background: 'rgba(201,168,76,0.08)', border: `1px solid ${SBDR}`, borderRadius: 3, padding: '4px 10px', cursor: 'pointer' }}>It's Different — Keep</button>
                        <button onClick={() => handleAction('mark-duplicate', c.id)}   style={{ fontFamily: cinzel, fontSize: 8, color: '#fbbf24', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 3, padding: '4px 10px', cursor: 'pointer' }}>Mark as Duplicate</button>
                      </div>
                    </div>
                  )}

                  {/* Enrichment status */}
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: SMUT, letterSpacing: '0.08em', marginBottom: 10 }}>
                    ENRICHMENT: {(c.enrichment_status || 'pending').toUpperCase()}
                    {c.enrichment_error && <span style={{ color: '#f87171', marginLeft: 6 }}>{c.enrichment_error}</span>}
                    {enrichErrors[c.id] && <span style={{ color: '#f87171', marginLeft: 6 }}>{enrichErrors[c.id]}</span>}
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    {(c.enrichment_status === 'pending' || c.enrichment_status === 'failed') && (
                      <button
                        onClick={() => handleEnrich(c.id)}
                        disabled={enrichingId === c.id}
                        style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: '#7ab4e0', background: 'rgba(122,180,224,0.08)', border: '1px solid rgba(122,180,224,0.25)', borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}
                      >{enrichingId === c.id ? 'Enriching...' : '✦ Enrich with AI'}</button>
                    )}
                    {c.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleGetPreview(c.id)}
                          style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: SG, background: 'rgba(201,168,76,0.08)', border: `1px solid ${SBDR}`, borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}
                        >Preview for Approval</button>
                        <button
                          onClick={() => { setRejectExpanded(isRejectOpen ? null : c.id); setRejectReason('') }}
                          style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.25)', borderRadius: 4, padding: '6px 12px', cursor: 'pointer' }}
                        >{isRejectOpen ? 'Cancel' : '✗ Reject'}</button>
                      </>
                    )}
                    {isConfirmed && airtableIds[c.id] && (
                      <span style={{ fontFamily: cinzel, fontSize: 9, color: SG, letterSpacing: '0.06em' }}>Pushed: {airtableIds[c.id]}</span>
                    )}
                  </div>

                  {/* Reject inline form */}
                  {isRejectOpen && (
                    <div style={{ marginTop: 10, padding: '10px 12px', background: 'rgba(248,113,113,0.04)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 5 }}>
                      <textarea
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        placeholder="Reason (optional)"
                        rows={2}
                        style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(255,255,255,0.04)', border: `1px solid ${SBDR}`, borderRadius: 4, padding: '6px 10px', color: STXT, fontFamily: crimson, fontSize: 13, outline: 'none', resize: 'vertical' as const, marginBottom: 8 }}
                      />
                      <button
                        onClick={() => handleAction('reject', c.id, { rejectionReason: rejectReason })}
                        style={{ fontFamily: cinzel, fontSize: 9, color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', borderRadius: 4, padding: '6px 14px', cursor: 'pointer' }}
                      >Confirm Reject</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Preview modal */}
      {previewData && (
        <div style={{ position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: isDark ? '#13111e' : '#fff', border: `1px solid ${SG}44`, borderRadius: 10, padding: 28, width: '100%', maxWidth: 520, maxHeight: '80vh', overflowY: 'auto' as const }}>
            <div style={{ fontFamily: cinzel, fontSize: 12, color: SG, letterSpacing: '0.1em', marginBottom: 18 }}>AIRTABLE RECORD PREVIEW</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10, marginBottom: 20 }}>
              {Object.entries(previewData.preview).map(([k, v]) => v ? (
                <div key={k}>
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: SMUT, letterSpacing: '0.1em', marginBottom: 2 }}>{k.toUpperCase()}</div>
                  <div style={{ fontFamily: crimson, fontSize: 13, color: STXT, lineHeight: 1.5 }}>{v as string}</div>
                </div>
              ) : null)}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => handleConfirmPush(previewData.candidateId)}
                disabled={confirmingId === previewData.candidateId}
                style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: '#0D0B14', background: SG, border: 'none', borderRadius: 5, padding: '10px 22px', cursor: 'pointer' }}
              >{confirmingId === previewData.candidateId ? 'Pushing...' : '✓ CONFIRM — PUSH TO DATABASE'}</button>
              <button
                onClick={() => setPreviewData(null)}
                style={{ fontFamily: cinzel, fontSize: 10, color: SMUT, background: 'none', border: `1px solid ${SBDR}`, borderRadius: 5, padding: '10px 18px', cursor: 'pointer' }}
              >Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AdminPage() {
  const { user, isLoaded } = useUser()
  const { getToken }       = useAuth()
  const [tab, setTab]      = useState<'dashboard' | 'arsenal' | 'intel' | 'moderation' | 'training' | 'daily-brief' | 'field-ministry' | 'documents' | 'library' | 'spiritual-mapping' | 'lib-intel' | 'ai-command' | 'taxonomy' | 'tracker' | 'internal-books' | 'admin-chat' | 'enrichment' | 'suggested-edits' | 'ai-context' | 'notifications' | 'ai-usage-admin' | 'content-suggestions' | 'testing' | 'members' | 'test-sol' | 'sol-research' | 'atmosphere' | 'spirit-candidates'>('dashboard')
  const [modTab, setModTab] = useState<'feedback' | 'testimony' | 'forum' | 'fieldreports' | 'flags'>('feedback')
  const [modBadge, setModBadge] = useState(0)
  useEffect(() => {
    getToken().then((token: string | null) => {
      if (!token) return
      fetch('/api/admin-moderation?count=true', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setModBadge(d.total || (d.pendingTestimonies || 0) + (d.openFeedback || 0) + (d.flaggedPosts || 0)) })
        .catch(() => {})
    })
  }, [])
  const [dashDemons, setDashDemons] = useState<any[]>([])
  useEffect(() => {
    fetch('/api/demons').then(r => r.json()).then(d => setDashDemons(d.demons || [])).catch(() => {})
  }, [])
  const [isMobile, setIsMobile]     = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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

  const headerBg  = isDark ? '#13111e' : '#FFFFFF'
  const contentBg = isDark ? '#0D0B14' : '#FAF8F5'
  const adBdr     = isDark ? 'rgba(201,168,76,0.18)' : 'rgba(139,105,20,0.25)'
  const adGold    = isDark ? '#C9A84C' : '#8B6914'
  const adDim     = isDark ? '#9a8c74' : '#5C5248'

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

  const SIDEBAR_GROUPS = [
    { label: 'DASHBOARD', items: [
      { key: 'dashboard', label: '⚡ Dashboard' },
    ]},
    { label: 'SOL', items: [
      { key: 'content-suggestions', label: 'Content Studio'       },
      { key: 'ai-command',          label: 'AI Command'           },
      { key: 'ai-usage-admin',      label: 'AI Usage'             },
      { key: 'ai-context',          label: 'AI Context'           },
      { key: 'lib-intel',           label: 'Content Intelligence' },
      { key: 'test-sol',            label: 'Test SOL'             },
      { key: 'sol-research',        label: '✦ Research Drop'      },
    ]},
    { label: 'INTEL ARCHIVE', items: [
      { key: 'intel',              label: 'Intel Archive'     },
      { key: 'spirit-candidates',  label: 'Spirit Candidates' },
      { key: 'taxonomy',           label: 'Taxonomy Review'   },
      { key: 'spiritual-mapping',  label: 'Spiritual Mapping' },
    ]},
    { label: 'MODERATION', items: [
      { key: 'moderation', label: '📋 Moderation' },
    ]},
    { label: 'CONTENT', items: [
      { key: 'library',        label: 'Ministry Library' },
      { key: 'arsenal',        label: 'Arsenal'          },
      { key: 'documents',      label: 'Documents'        },
      { key: 'training',       label: 'Training'         },
      { key: 'daily-brief',    label: 'Daily Brief'      },
      { key: 'field-ministry', label: 'Field Ministry'   },
    ]},
    { label: 'OPERATIONS', items: [
      { key: 'members',       label: 'Members'          },
      { key: 'notifications', label: '🔔 Notifications' },
      { key: 'admin-chat',    label: 'Admin Chat'       },
      { key: 'tracker',       label: 'Tracker'          },
      { key: 'atmosphere',    label: '📡 Atmosphere'    },
    ]},
  ] as const

  const sidebarBg  = isDark ? '#0f0e16' : '#FAFAF7'
  const WIDE_TABS  = new Set(['documents', 'field-ministry', 'taxonomy', 'internal-books'])
  const maxWidth   = WIDE_TABS.has(tab) ? 1400 : tab === 'admin-chat' ? 1000 : 900
  const contentPad = tab === 'admin-chat' ? '0' : '28px 28px'

  return (
    <div style={{ minHeight: '100vh', background: contentBg, color: TXT, fontFamily: crimson, display: 'flex', flexDirection: 'column' as const }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, background: headerBg, borderBottom: `1px solid ${adBdr}`, padding: '13px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky' as const, top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {isMobile && (
            <button onClick={() => setSidebarOpen(o => !o)}
              style={{ background: 'none', border: `1px solid ${adBdr}`, borderRadius: 4, width: 30, height: 30, color: adGold, cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ☰
            </button>
          )}
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: adDim, textDecoration: 'none' }}>← Community</a>
          <span style={{ color: adBdr }}>|</span>
          <span style={{ fontFamily: cinzel, fontSize: 13, letterSpacing: '0.14em', color: adGold }}>⚔ Admin Panel</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: adDim }}>{user?.firstName} {user?.lastName}</span>
          <button onClick={() => { const next = !isDark; setIsDark(next); localStorage.setItem('wri-theme', next ? 'dark' : 'light') }}
            style={{ background: 'none', border: `1px solid ${adBdr}`, borderRadius: '50%', width: 28, height: 28, color: adGold, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isDark ? '☀' : '🌙'}
          </button>
        </div>
      </div>

      {/* ── Body: sidebar + content ────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' as const }}>

        {/* Mobile overlay backdrop */}
        {isMobile && sidebarOpen && (
          <div onClick={() => setSidebarOpen(false)}
            style={{ position: 'absolute' as const, inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 49 }} />
        )}

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        {(!isMobile || sidebarOpen) && (
          <div style={{
            width: 210, flexShrink: 0,
            background: sidebarBg,
            borderRight: `1px solid ${adBdr}`,
            overflowY: 'auto' as const,
            paddingTop: 16, paddingBottom: 32,
            ...(isMobile ? { position: 'absolute' as const, top: 0, left: 0, bottom: 0, zIndex: 50, boxShadow: '4px 0 24px rgba(0,0,0,0.45)' } : {}),
          }}>
            {SIDEBAR_GROUPS.map(group => (
              <div key={group.label} style={{ marginBottom: 8 }}>
                {group.label === 'SOL' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '10px 20px 4px' }}>
                    <img src="/images/sol/sol-icon.png" width={12} height={12} style={{ objectFit: 'contain' as const, marginRight: 0, filter: 'drop-shadow(0 0 4px rgba(201,168,76,0.8))' }} alt="" />
                    <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.2em', color: '#C9A84C', textTransform: 'uppercase' as const }}>SOL</span>
                  </div>
                ) : (
                  <div style={{ fontFamily: cinzel, fontSize: 8, color: isDark ? 'rgba(201,168,76,0.45)' : '#8B6914', letterSpacing: '0.18em', padding: '10px 20px 4px', textTransform: 'uppercase' as const }}>
                    {group.label}
                  </div>
                )}
                {group.items.map(item => {
                  const active = tab === item.key
                  return (
                    <button
                      key={item.key}
                      onClick={() => { setTab(item.key as any); if (isMobile) setSidebarOpen(false) }}
                      style={{
                        width: '100%', textAlign: 'left' as const,
                        padding: '8px 20px 8px 18px',
                        background: active ? (isDark ? 'rgba(201,168,76,0.1)' : 'rgba(201,168,76,0.12)') : 'transparent',
                        border: 'none',
                        borderLeft: `2px solid ${active ? adGold : 'transparent'}`,
                        color: active ? adGold : adDim,
                        fontFamily: cinzel, fontSize: 10,
                        letterSpacing: '0.06em',
                        cursor: 'pointer',
                        transition: 'color 0.12s, background 0.12s',
                        display: 'block',
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.color = isDark ? 'rgba(201,168,76,0.8)' : '#8B6914' }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.color = adDim }}
                    >
                      {item.label}{(item.key as string) === 'moderation' && modBadge > 0 && <span style={{ background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: 9, padding: '1px 5px', marginLeft: 4, lineHeight: 1.4 }}>{modBadge}</span>}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}

        {/* ── Content ──────────────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto' as const, minWidth: 0 }}>
          <div style={{ maxWidth, margin: '0 auto', padding: contentPad }}>
            {tab === 'dashboard'         && <DashboardView getToken={getToken} isDark={isDark} setTab={(t: string) => setTab(t as any)} />}
            {tab === 'arsenal'           && <ArsenalManager getToken={getToken} />}
            {tab === 'intel'             && <IntelArchive getToken={getToken} isDark={isDark} />}
            {tab === 'moderation'        && (
              <div>
                <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderBottom: `1px solid ${adBdr}` }}>
                  {([
                    { key: 'feedback',     label: 'Feedback'      },
                    { key: 'testimony',    label: 'Testimonies'   },
                    { key: 'forum',        label: 'Forum'         },
                    { key: 'fieldreports', label: 'Field Reports' },
                    { key: 'flags',        label: '🚩 Flags'      },
                  ] as const).map(t => (
                    <button key={t.key} onClick={() => setModTab(t.key)}
                      style={{ padding: '8px 16px', background: 'transparent', border: 'none', borderBottom: modTab === t.key ? `2px solid ${adGold}` : '2px solid transparent', color: modTab === t.key ? adGold : adDim, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', cursor: 'pointer', marginBottom: -1, whiteSpace: 'nowrap' as const }}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <ModerationPanel getToken={getToken} section={modTab} />
              </div>
            )}
            {tab === 'training'          && <TrainingManager getToken={getToken} isDark={isDark} />}
            {tab === 'daily-brief'       && <DailyBriefManager getToken={getToken} isDark={isDark} />}
            {tab === 'field-ministry'    && <FieldMinistryManager getToken={getToken} isDark={isDark} />}
            {tab === 'documents'         && <DocumentsView getToken={getToken} isDark={isDark} demons={dashDemons} />}
            {tab === 'library'           && <LibraryManager getToken={getToken} isDark={isDark} />}
            {tab === 'spirit-candidates' && <SpiritCandidatesManager getToken={getToken} isDark={isDark} />}
            {tab === 'spiritual-mapping' && <SpiritualMappingAdmin isDark={isDark} />}
            {tab === 'lib-intel'         && <LibraryIntelligence getToken={getToken} isDark={isDark} />}
            {tab === 'ai-command'        && (
              <div>
                <LibraryIntelligence getToken={getToken} isDark={isDark} />
                <div style={{ marginTop: 32, borderTop: `1px solid ${adBdr}`, paddingTop: 28 }}>
                  <AICommandManager getToken={getToken} isDark={isDark} />
                </div>
              </div>
            )}
            {tab === 'ai-context'        && <MinistryContextManager getToken={getToken} isDark={isDark} />}
            {tab === 'taxonomy'          && <TaxonomyReview getToken={getToken} isDark={isDark} />}
            {tab === 'content-suggestions' && <ContentStudio getToken={getToken} isDark={isDark} />}
            {tab === 'notifications'     && <NotificationsAdmin getToken={getToken} isDark={isDark} />}
            {tab === 'ai-usage-admin'    && <AIUsageAdmin getToken={getToken} isDark={isDark} />}
            {tab === 'tracker'           && <TrackerView getToken={getToken} isDark={isDark} />}
            {tab === 'internal-books'    && <InternalBooks getToken={getToken} isDark={isDark} />}
            {tab === 'admin-chat'        && <AdminChat getToken={getToken} isDark={isDark} />}
            {tab === 'enrichment'        && <EnrichmentSuggestions getToken={getToken} isDark={isDark} />}
            {tab === 'suggested-edits'   && <SuggestedEditsAdmin getToken={getToken} isDark={isDark} />}
            {tab === 'testing'           && <AdminTestingPanel getToken={getToken} isDark={isDark} />}
            {tab === 'test-sol'          && <TestSOLPanel getToken={getToken} isDark={isDark} />}
            {tab === 'sol-research'     && <SolResearchView getToken={getToken} isDark={isDark} />}
            {tab === 'members'           && (
              <div style={{ padding: '32px 0', textAlign: 'center' as const, color: adDim, fontFamily: cinzel, fontSize: 10, letterSpacing: '0.12em' }}>
                MEMBERS — COMING SOON
              </div>
            )}
            {tab === 'atmosphere'        && <AtmosphereAdmin getToken={getToken} isDark={isDark} />}
          </div>
        </div>

      </div>
    </div>
  )
}

// ─── SolResearchView ─────────────────────────────────────────────────────────

function SolResearchView({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const G2   = isDark ? G : '#A07C2C'
  const surf = isDark ? SURF2 : '#FFFFFF'
  const bdr  = isDark ? BDR  : 'rgba(139,105,20,0.25)'
  const txt  = isDark ? TXT  : '#2D2924'
  const dim  = isDark ? DIM  : '#6B5520'
  const bg   = isDark ? '#0D0B14' : '#FAF8F5'
  const inp  = isDark ? 'rgba(201,168,76,0.05)' : '#F5F2EE'

  type InputMode = 'file' | 'url' | 'text'
  const [inputMode, setInputMode]       = useState<InputMode>('file')
  const [question, setQuestion]         = useState('')
  const [file, setFile]                 = useState<File | null>(null)
  const [filePreview, setFilePreview]   = useState<string | null>(null)
  const [url, setUrl]                   = useState('')
  const [pastedText, setPastedText]     = useState('')
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState<string | null>(null)
  const [contentType, setContentType]   = useState<string | null>(null)
  const [error, setError]               = useState<string | null>(null)
  const [recentLog, setRecentLog]       = useState<any[]>([])
  const [expandedLog, setExpandedLog]   = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getToken().then((token: string | null) => {
      if (!token) return
      fetch('/api/sol-research', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setRecentLog(d.log || []) })
        .catch(() => {})
    })
  }, [result])

  function handleFileSelect(f: File) {
    setFile(f)
    if (f.type.startsWith('image/')) {
      setFilePreview(URL.createObjectURL(f))
    } else {
      setFilePreview(null)
    }
  }

  async function handleSubmit() {
    setLoading(true); setError(null); setResult(null); setContentType(null)
    try {
      const token = await getToken()
      let res: Response
      if (inputMode === 'file' && file) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('question', question)
        res = await fetch('/api/sol-research', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
      } else if (inputMode === 'url') {
        res = await fetch('/api/sol-research', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ url, question }),
        })
      } else {
        res = await fetch('/api/sol-research', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: pastedText, question }),
        })
      }
      const d = await res.json()
      if (!res.ok) { setError(d.error || 'Analysis failed'); return }
      setResult(d.answer || '')
      setContentType(d.contentType || null)
    } catch (e: any) {
      setError(e.message || 'Network error')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setResult(null); setError(null); setFile(null); setFilePreview(null)
    setUrl(''); setPastedText(''); setQuestion(''); setContentType(null)
  }

  const canSubmit = !loading && (
    (inputMode === 'file' && !!file) ||
    (inputMode === 'url'  && !!url.trim()) ||
    (inputMode === 'text' && !!pastedText.trim())
  )

  const QUICK_QUESTIONS = [
    '🔍 Extract all spirits',
    '🚪 Identify doorways',
    '📋 Arsenal summary',
    '⚔ Deliverance insights',
    '📖 Scripture connections',
  ]

  const inputStyle: CSSProperties = {
    width: '100%', padding: '9px 12px', background: inp, border: `1px solid ${bdr}`,
    borderRadius: 6, fontFamily: crimson, fontSize: 15, color: txt, outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '28px 0' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: cinzel, fontSize: 20, letterSpacing: '0.14em', color: G2, marginBottom: 6 }}>✦ SOL RESEARCH DROP</div>
        <div style={{ fontFamily: crimson, fontSize: 15, fontStyle: 'italic', color: dim }}>Drop any content — SOL will analyze it for ministry intelligence</div>
      </div>

      {result ? (
        /* ── Result ──────────────────────────────────────────────────── */
        <div>
          <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontFamily: cinzel, fontSize: 12, letterSpacing: '0.12em', color: G2 }}>✦ SOL INTELLIGENCE REPORT</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {contentType && <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', color: dim, padding: '2px 6px', border: `1px solid ${bdr}`, borderRadius: 4 }}>{contentType.toUpperCase()}</span>}
                <button
                  onClick={() => navigator.clipboard.writeText(result)}
                  style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', color: G2, background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 4, padding: '3px 8px', cursor: 'pointer', touchAction: 'manipulation' }}>
                  Copy
                </button>
              </div>
            </div>
            <div style={{ fontFamily: crimson, fontSize: 15, lineHeight: 1.75, color: isDark ? '#F0E6C8' : txt, whiteSpace: 'pre-wrap', userSelect: 'text' }}>{result}</div>
          </div>
          <button onClick={reset}
            style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: G2, background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 6, padding: '8px 20px', cursor: 'pointer', touchAction: 'manipulation' }}>
            New Research
          </button>
        </div>
      ) : (
        /* ── Input form ──────────────────────────────────────────────── */
        <div style={{ background: surf, border: `1px solid ${bdr}`, borderRadius: 8, padding: '24px' }}>
          {/* Mode tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            {(['file','url','text'] as InputMode[]).map((m, i) => (
              <button key={m} onClick={() => setInputMode(m)}
                style={{ padding: '6px 16px', borderRadius: 20, border: `1px solid ${inputMode === m ? G2 : bdr}`, background: inputMode === m ? `${G2}22` : 'transparent', fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: inputMode === m ? G2 : dim, cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                {['📎 File','🔗 URL','📝 Text'][i]}
              </button>
            ))}
          </div>

          {/* File mode */}
          {inputMode === 'file' && (
            <div style={{ marginBottom: 20 }}>
              <input ref={fileRef} type="file" accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.webp,image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }} />
              {!file ? (
                <div onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${bdr}`, borderRadius: 8, height: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: inp, gap: 8 }}>
                  <div style={{ fontSize: 24 }}>📎</div>
                  <div style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.08em', color: dim }}>Drop a PDF, article, image, or text file</div>
                  <div style={{ fontFamily: crimson, fontSize: 12, color: dim, fontStyle: 'italic' }}>Click to browse</div>
                </div>
              ) : (
                <div style={{ border: `1px solid ${bdr}`, borderRadius: 8, padding: '14px 16px', background: inp }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: filePreview ? 10 : 0 }}>
                    <div>
                      <div style={{ fontFamily: cinzel, fontSize: 11, color: G2 }}>{file.name}</div>
                      <div style={{ fontFamily: crimson, fontSize: 12, color: dim }}>{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                    <button onClick={() => { setFile(null); setFilePreview(null) }}
                      style={{ background: 'transparent', border: 'none', color: dim, cursor: 'pointer', fontSize: 18, lineHeight: 1, touchAction: 'manipulation' }}>✕</button>
                  </div>
                  {filePreview && <img src={filePreview} alt="preview" style={{ maxHeight: 200, maxWidth: '100%', objectFit: 'contain', borderRadius: 6, display: 'block' }} />}
                </div>
              )}
            </div>
          )}

          {/* URL mode */}
          {inputMode === 'url' && (
            <div style={{ marginBottom: 20 }}>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="Paste an article URL..."
                style={inputStyle} />
              <div style={{ fontFamily: crimson, fontSize: 12, fontStyle: 'italic', color: dim, marginTop: 6 }}>SOL will fetch and read the page content</div>
            </div>
          )}

          {/* Text mode */}
          {inputMode === 'text' && (
            <div style={{ marginBottom: 20 }}>
              <textarea value={pastedText} onChange={e => setPastedText(e.target.value.slice(0, 50_000))}
                placeholder="Paste any text, scripture, article content..."
                rows={8} style={{ ...inputStyle, resize: 'vertical' }} />
              <div style={{ fontFamily: crimson, fontSize: 11, color: dim, textAlign: 'right', marginTop: 4 }}>
                {pastedText.length.toLocaleString()} / 50,000
              </div>
            </div>
          )}

          {/* Question */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.08em', color: G2, marginBottom: 8 }}>Your Research Question</div>
            <textarea value={question} onChange={e => setQuestion(e.target.value)} rows={3}
              placeholder={`e.g. Pull all spirits from this content\ne.g. What legal grounds does this describe?\ne.g. Summarize this for the Arsenal\ne.g. What deliverance insights are here?\ne.g. What manifestations are mentioned?`}
              style={{ ...inputStyle, resize: 'vertical' }} />
          </div>

          {/* Quick question pills */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
            {QUICK_QUESTIONS.map(q => (
              <button key={q} onClick={() => setQuestion(q)}
                style={{ padding: '4px 12px', borderRadius: 14, border: `1px solid ${question === q ? G2 : bdr}`, background: question === q ? `${G2}22` : 'transparent', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.04em', color: question === q ? G2 : dim, cursor: 'pointer', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
                {q}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontFamily: crimson, fontSize: 14, color: '#ef4444' }}>{error}</div>
          )}

          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ width: '100%', padding: '12px', background: canSubmit ? `${G2}22` : 'transparent', border: `1px solid ${canSubmit ? G2 : bdr}`, borderRadius: 6, fontFamily: cinzel, fontSize: 12, letterSpacing: '0.14em', color: canSubmit ? G2 : dim, cursor: canSubmit ? 'pointer' : 'not-allowed', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent', transition: 'all 0.15s' }}>
            {loading ? 'SOL is analyzing…' : '✦ TRANSMIT TO SOL'}
          </button>
        </div>
      )}

      {/* ── Recent research log ──────────────────────────────────────── */}
      {recentLog.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', color: dim, marginBottom: 12 }}>RECENT RESEARCH</div>
          {recentLog.map((entry: any) => (
            <div key={entry.id} style={{ border: `1px solid ${bdr}`, borderRadius: 6, marginBottom: 8, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: surf, cursor: 'pointer' }}
                onClick={() => setExpandedLog(expandedLog === entry.id ? null : entry.id)}>
                <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: G2, padding: '2px 6px', border: `1px solid ${bdr}`, borderRadius: 4 }}>{(entry.content_type || 'text').toUpperCase()}</span>
                <div style={{ flex: 1, fontFamily: crimson, fontSize: 13, color: txt, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.question || 'Default analysis'}</div>
                <div style={{ fontFamily: crimson, fontSize: 11, color: dim, flexShrink: 0 }}>{new Date(entry.created_at).toLocaleDateString()}</div>
                <span style={{ color: dim, fontSize: 10 }}>{expandedLog === entry.id ? '▲' : '▼'}</span>
              </div>
              {expandedLog === entry.id && (
                <div style={{ padding: '12px 14px', borderTop: `1px solid ${bdr}`, background: bg }}>
                  {entry.content_preview && <div style={{ fontFamily: crimson, fontSize: 12, color: dim, fontStyle: 'italic', marginBottom: 10, borderLeft: `2px solid ${bdr}`, paddingLeft: 8 }}>Content: {entry.content_preview}…</div>}
                  <div style={{ fontFamily: crimson, fontSize: 14, lineHeight: 1.7, color: txt, whiteSpace: 'pre-wrap' }}>{entry.answer}</div>
                  {entry.tokens_used && <div style={{ fontFamily: cinzel, fontSize: 8, color: dim, marginTop: 8 }}>{entry.tokens_used} tokens</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── InternalBooks ───────────────────────────────────────────────────────────

function InternalBooks({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const G2    = isDark ? G : '#A07C2C'
  const surf2 = isDark ? SURF2 : '#EDE6D3'
  const bdr2  = isDark ? BDR : 'rgba(139,105,20,0.25)'
  const txt2  = isDark ? TXT : '#2D2924'
  const dim2  = isDark ? DIM : '#6B5520'

  const [books, setBooks]               = useState<any[]>([])
  const [booksLoading, setBooksLoading] = useState(true)
  const [selectedBook, setSelectedBook] = useState<any>(null)
  const [bookContent, setBookContent]   = useState('')
  const [contentLoading, setContentLoading] = useState(false)
  const [bookSearch, setBookSearch]     = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching]       = useState(false)
  const searchTimer = useRef<any>(null)

  useEffect(() => {
    getToken().then((token: string | null) => {
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      fetch('/api/admin-library', { headers })
        .then(r => r.json())
        .then(d => setBooks(d.books || []))
        .catch(() => {})
        .finally(() => setBooksLoading(false))
    })
  }, [])

  async function loadBook(book: any) {
    setSelectedBook(book)
    setSearchResults([])
    setBookSearch('')
    setContentLoading(true)
    setBookContent('')
    try {
      const token = await getToken()
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers['Authorization'] = `Bearer ${token}`
      const res  = await fetch(`/api/admin-library?id=${book.id}`, { headers })
      const data = await res.json()
      setBookContent(data.book?.extracted_text || '(No text content indexed for this book)')
    } catch { setBookContent('(Failed to load book content)') }
    setContentLoading(false)
  }

  function onSearchChange(val: string) {
    setBookSearch(val)
    clearTimeout(searchTimer.current)
    if (!val.trim()) { setSearchResults([]); return }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res  = await fetch('/api/library-search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: val.trim(), limit: 10, threshold: 0.55 }),
        })
        const data = await res.json()
        setSearchResults(data.chunks || [])
      } catch { setSearchResults([]) }
      setSearching(false)
    }, 500)
  }

  const inp2: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', background: surf2,
    border: `1px solid ${bdr2}`, borderRadius: 6, padding: '9px 12px',
    color: txt2, fontFamily: crimson, fontSize: 14, outline: 'none',
  }

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 120px)', fontFamily: crimson }}>
      {/* ── Left sidebar ── */}
      <div style={{ width: 300, flexShrink: 0, borderRight: `1px solid ${bdr2}`, display: 'flex', flexDirection: 'column', padding: '24px 16px', gap: 12, overflowY: 'auto', background: isDark ? '#0f0d1a' : '#ede6d4' }}>
        <div style={{ fontFamily: cinzel, fontSize: 13, color: G2, letterSpacing: '0.08em', marginBottom: 4 }}>📚 Ministry Library</div>
        <input
          value={bookSearch}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search across all books..."
          style={inp2}
        />
        {searching && <div style={{ fontFamily: cinzel, fontSize: 9, color: G2, letterSpacing: '0.08em' }}>SEARCHING...</div>}
        <div style={{ height: 1, background: bdr2, margin: '4px 0' }} />
        {booksLoading ? (
          <div style={{ fontFamily: cinzel, fontSize: 9, color: dim2, letterSpacing: '0.08em' }}>LOADING...</div>
        ) : books.length === 0 ? (
          <div style={{ fontFamily: crimson, fontSize: 13, color: dim2, fontStyle: 'italic' }}>No books in library</div>
        ) : books.map(b => (
          <button key={b.id} onClick={() => loadBook(b)} style={{
            textAlign: 'left', background: selectedBook?.id === b.id ? `rgba(201,168,76,0.12)` : 'transparent',
            border: `1px solid ${selectedBook?.id === b.id ? G2 : bdr2}`, borderRadius: 6,
            padding: '10px 12px', cursor: 'pointer', color: txt2,
          }}>
            <div style={{ fontFamily: cinzel, fontSize: 10, color: selectedBook?.id === b.id ? G2 : txt2, letterSpacing: '0.06em', marginBottom: 3 }}>
              {b.title || 'Untitled'}
            </div>
            {b.author && <div style={{ fontFamily: crimson, fontSize: 12, color: dim2, marginBottom: 3 }}>{b.author}</div>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: b.is_indexed ? '#4ade80' : '#e09090', flexShrink: 0 }} />
              <span style={{ fontFamily: cinzel, fontSize: 8, color: dim2, letterSpacing: '0.06em' }}>
                {b.is_indexed ? 'INDEXED' : 'NOT INDEXED'}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ── Right panel ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 40px' }}>
        {/* Search results */}
        {bookSearch.trim() && searchResults.length > 0 && (
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 11, color: G2, letterSpacing: '0.1em', marginBottom: 16 }}>
              {searchResults.length} PASSAGES FOUND
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {searchResults.map((chunk, i) => (
                <div key={i} style={{ background: surf2, border: `1px solid ${bdr2}`, borderLeft: `3px solid ${G2}`, borderRadius: 6, padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontFamily: cinzel, fontSize: 10, color: G2, letterSpacing: '0.08em' }}>{chunk.book_title}</div>
                    <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: '#4ade80', background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', borderRadius: 10, padding: '2px 8px' }}>
                      {Math.round((chunk.similarity || 0) * 100)}% match
                    </span>
                  </div>
                  <div style={{ fontFamily: crimson, fontSize: 14, color: dim2, lineHeight: 1.7, fontStyle: 'italic' }}>
                    "{chunk.chunk_text?.slice(0, 400)}..."
                  </div>
                  <button onClick={() => { const b = books.find(bk => bk.title === chunk.book_title); if (b) loadBook(b) }}
                    style={{ marginTop: 10, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em', color: G2, background: 'transparent', border: `1px solid ${G2}55`, borderRadius: 4, padding: '4px 10px', cursor: 'pointer' }}>
                    Open Book →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        {bookSearch.trim() && searchResults.length === 0 && !searching && (
          <div style={{ fontFamily: crimson, fontSize: 14, color: dim2, fontStyle: 'italic' }}>No passages found. Try different terms or run Reindex Library to build embeddings.</div>
        )}

        {/* Book reader */}
        {!bookSearch.trim() && selectedBook && (
          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ fontFamily: cinzel, fontSize: 18, color: G2, letterSpacing: '0.06em', marginBottom: 6 }}>{selectedBook.title}</div>
            {selectedBook.author && <div style={{ fontFamily: crimson, fontSize: 15, color: dim2, fontStyle: 'italic', marginBottom: 24 }}>by {selectedBook.author}</div>}
            <div style={{ height: 1, background: bdr2, marginBottom: 32 }} />
            {contentLoading ? (
              <div style={{ fontFamily: cinzel, fontSize: 10, color: G2, letterSpacing: '0.1em' }}>LOADING CONTENT...</div>
            ) : (
              <div style={{ fontFamily: crimson, fontSize: 16, color: txt2, lineHeight: 1.85, whiteSpace: 'pre-wrap' as const }}>
                {bookContent}
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {!bookSearch.trim() && !selectedBook && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 400, color: dim2 }}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>📚</div>
            <div style={{ fontFamily: cinzel, fontSize: 11, letterSpacing: '0.1em', marginBottom: 8 }}>SELECT A BOOK TO READ</div>
            <div style={{ fontFamily: crimson, fontSize: 14, fontStyle: 'italic' }}>or search across your library</div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── AdminChat ────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  sources?: string[]
}

function AdminChat({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const G2   = isDark ? G : '#A07C2C'
  const surf = isDark ? SURF2 : '#EDE6D3'
  const bdr  = isDark ? BDR : 'rgba(139,105,20,0.25)'
  const txt  = isDark ? TXT : '#2D2924'
  const dim  = isDark ? DIM : '#6B5520'
  const bg   = isDark ? '#0D0B14' : '#FAF8F5'
  const hdr  = isDark ? '#13111e' : '#FFFFFF'

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [contextMode, setContextMode] = useState<'library' | 'database' | 'both'>('both')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: text }])
    setLoading(true)
    try {
      const token = await getToken()
      const history = messages.slice(-12).map(m => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/admin-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ message: text, history, contextMode }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response || data.error || 'No response', sources: data.sources }])
    } catch (e: any) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${e.message}` }])
    }
    setLoading(false)
  }

  function renderMd(text: string) {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <div key={i} style={{ fontFamily: cinzel, fontSize: 11, color: G2, marginTop: 14, marginBottom: 4, letterSpacing: '0.06em' }}>{line.slice(4)}</div>
      if (line.startsWith('## '))  return <div key={i} style={{ fontFamily: cinzel, fontSize: 13, color: G2, marginTop: 16, marginBottom: 6, letterSpacing: '0.06em' }}>{line.slice(3)}</div>
      if (line.startsWith('# '))   return <div key={i} style={{ fontFamily: cinzel, fontSize: 15, color: G2, marginTop: 18, marginBottom: 8, letterSpacing: '0.06em' }}>{line.slice(2)}</div>
      if (line.startsWith('- ') || line.startsWith('* ')) return (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ color: G2, flexShrink: 0 }}>•</span>
          <span style={{ fontFamily: crimson, fontSize: 15, color: txt, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, `<strong style="color:${G2}">$1</strong>`) }} />
        </div>
      )
      if (line.match(/^\d+\./)) return (
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ color: G2, flexShrink: 0, fontFamily: cinzel, fontSize: 11 }}>{line.match(/^\d+/)![0]}.</span>
          <span style={{ fontFamily: crimson, fontSize: 15, color: txt, lineHeight: 1.7 }} dangerouslySetInnerHTML={{ __html: line.replace(/^\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, `<strong style="color:${G2}">$1</strong>`) }} />
        </div>
      )
      if (!line.trim()) return <div key={i} style={{ height: 8 }} />
      return <div key={i} style={{ fontFamily: crimson, fontSize: 15, color: txt, lineHeight: 1.7, marginBottom: 4 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, `<strong style="color:${G2}">$1</strong>`) }} />
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)', background: bg }}>
      {/* Header */}
      <div style={{ padding: '12px 24px', borderBottom: `1px solid ${bdr}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: hdr }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src="/images/sol/sol-icon.png" width={32} height={32}
            style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(201,168,76,0.8))' }} />
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G2, letterSpacing: '0.1em', fontWeight: 700 }}>WAR ROOM COMMAND</div>
            <div style={{ fontFamily: cinzel, fontSize: 8, color: dim, letterSpacing: '0.18em', marginTop: 1 }}>POWERED BY SOL</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {(['library', 'database', 'both'] as const).map(mode => (
            <button key={mode} onClick={() => setContextMode(mode)} style={{
              padding: '4px 12px', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
              background: contextMode === mode ? 'rgba(201,168,76,0.15)' : 'transparent',
              border: `1px solid ${contextMode === mode ? G2 : bdr}`,
              borderRadius: 20, color: contextMode === mode ? G2 : dim, cursor: 'pointer',
            }}>
              {mode.toUpperCase()}
            </button>
          ))}
          <button onClick={() => setMessages([])}
            style={{ padding: '4px 12px', fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 4, color: dim, cursor: 'pointer', marginLeft: 6 }}>
            CLEAR
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' as const, padding: '80px 20px' }}>
            <img src="/images/sol/sol-icon.png" width={64} height={64}
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 20px rgba(201,168,76,0.7))' }} />
            <div style={{ fontFamily: cinzel, fontSize: 13, color: G2, letterSpacing: '0.12em' }}>WAR ROOM INTEL COMMAND AI ONLINE</div>
            <div style={{ fontFamily: crimson, fontSize: 15, color: dim, maxWidth: 400, lineHeight: 1.7 }}>
              I have access to your full ministry library, demon database, and WRI platform intelligence. Ask me anything.
            </div>
          </div>
        ) : messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            {msg.role === 'assistant' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <img src="/images/sol/sol-icon.png" width={20} height={20}
                  style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.7))' }} />
                <span style={{ fontFamily: cinzel, fontSize: 7, color: G2, letterSpacing: '0.15em' }}>SOL</span>
              </div>
            )}
            <div style={{
              padding: '14px 18px',
              borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '0 12px 12px 12px',
              background: msg.role === 'user' ? 'rgba(201,168,76,0.12)' : surf,
              border: `1px solid ${msg.role === 'user' ? 'rgba(201,168,76,0.3)' : bdr}`,
              borderLeft: msg.role === 'assistant' ? `3px solid ${G2}` : `1px solid rgba(201,168,76,0.3)`,
            }}>
              {msg.role === 'user'
                ? <div style={{ fontFamily: crimson, fontSize: 15, color: txt, lineHeight: 1.6 }}>{msg.content}</div>
                : renderMd(msg.content)
              }
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div style={{ marginTop: 6, padding: '6px 12px', background: 'rgba(201,168,76,0.06)', border: `1px solid ${bdr}`, borderRadius: 6, maxWidth: '100%' }}>
                <span style={{ fontFamily: cinzel, fontSize: 8, color: G2, letterSpacing: '0.08em' }}>📚 SOURCES: </span>
                <span style={{ fontFamily: crimson, fontSize: 12, color: dim }}>{[...new Set(msg.sources)].join(' · ')}</span>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start' as const, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: surf, border: `1px solid ${bdr}`, borderLeft: `3px solid ${G2}`, borderRadius: '0 12px 12px 12px' }}>
            <img src="/images/sol/sol-icon.png" width={16} height={16}
              style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 6px rgba(201,168,76,0.7))' }} />
            <span style={{ fontFamily: cinzel, fontSize: 9, color: G2, letterSpacing: '0.1em' }}>PROCESSING...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '16px 24px', borderTop: `1px solid ${bdr}`, flexShrink: 0, background: hdr, display: 'flex', gap: 12, alignItems: 'flex-end' }}>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
          placeholder="Ask about demons, your library, ministry protocols... (Enter to send, Shift+Enter for newline)"
          rows={3}
          style={{ flex: 1, background: bg, border: `1px solid ${bdr}`, borderRadius: 8, padding: '10px 14px', color: txt, fontFamily: crimson, fontSize: 14, outline: 'none', resize: 'none' as const, lineHeight: 1.5 }}
          onFocus={e => { e.currentTarget.style.borderColor = G2 }}
          onBlur={e => { e.currentTarget.style.borderColor = bdr }}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
          padding: '10px 18px',
          background: input.trim() && !loading ? 'rgba(201,168,76,0.12)' : 'transparent',
          border: `1px solid ${input.trim() && !loading ? G2 : bdr}`,
          borderRadius: 8, color: input.trim() && !loading ? G2 : dim,
          fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em',
          cursor: loading || !input.trim() ? 'default' : 'pointer',
          opacity: loading || !input.trim() ? 0.5 : 1, flexShrink: 0,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <img src="/images/sol/sol-icon.png" width={14} height={14} style={{ objectFit: 'contain', filter: 'drop-shadow(0 0 4px rgba(201,168,76,0.6))' }} />
          SEND
        </button>
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

  const G2   = isDark ? '#C9A84C' : '#8B6914'
  const surf = isDark ? '#1a1714' : '#ffffff'
  const bdr  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.2)'
  const txt2 = isDark ? '#f0e8d8' : '#2D2924'
  const dim2 = isDark ? '#9a8c74' : '#5C5248'

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
  const G2   = isDark ? '#C9A84C' : '#8B6914'
  const surf = isDark ? '#1a1714' : '#ffffff'
  const bdr  = isDark ? 'rgba(201,168,76,0.15)' : 'rgba(160,120,48,0.2)'
  const txt  = isDark ? '#f0e8d8' : '#2D2924'
  const dim  = isDark ? '#9a8c74' : '#5C5248'

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

// ─── EnrichmentSuggestions ───────────────────────────────────────────────────

function EnrichmentSuggestions({ getToken, isDark }: { getToken: any; isDark: boolean }) {
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [filter, setFilter]           = useState<'all' | 'enrich' | 'add' | 'high'>('all')
  const [applying, setApplying]       = useState<Record<string, boolean>>({})
  const [cardErrors, setCardErrors]   = useState<Record<string, string>>({})
  const [editedFields, setEditedFields] = useState<Record<string, Record<string, string>>>({})
  const [aiFillingField, setAiFillingField] = useState<Record<string, boolean>>({})
  const [enrichEquivalents, setEnrichEquivalents] = useState<Record<string, any>>({})
  const [enrichEquivLoading, setEnrichEquivLoading] = useState<Record<string, boolean>>({})

  const cinzel  = "'Cinzel', serif"
  const crimson = "'Crimson Pro', serif"

  useEffect(() => {
    loadSuggestions()
  }, [])

  async function loadSuggestions() {
    setLoading(true)
    const token = await getToken()
    const res   = await fetch('/api/library-enrich-apply', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ action: 'list' }),
    })
    if (res.ok) {
      const data = await res.json()
      setSuggestions(data.suggestions || [])
    }
    setLoading(false)
  }

  async function handleAIFillField(sugId: string, fieldName: string, spiritName: string, bookTitle: string) {
    const key = `${sugId}:${fieldName}`
    setAiFillingField(prev => ({ ...prev, [key]: true }))
    try {
      const token = await getToken()
      const sug = suggestions.find(s => s.id === sugId)
      const currentValue = editedFields[sugId]?.[fieldName] ?? sug?.proposed_fields?.[fieldName] ?? ''
      const res = await fetch('/api/library-enrich-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ suggestionId: sugId, action: 'ai_fill_field', fieldName, currentValue, spiritName, bookTitle }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.value) {
          setEditedFields(prev => ({ ...prev, [sugId]: { ...(prev[sugId] || {}), [fieldName]: data.value } }))
        }
      }
    } catch {}
    setAiFillingField(prev => { const n = { ...prev }; delete n[key]; return n })
  }

  async function fetchEnrichEquivalents(spiritName: string, kingdom: string, description: string) {
    setEnrichEquivLoading(prev => ({ ...prev, [spiritName]: true }))
    try {
      const token = await getToken()
      const res = await fetch('/api/spirit-equivalents', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ spiritName, kingdom, description }),
      })
      const data = await res.json()
      setEnrichEquivalents(prev => ({ ...prev, [spiritName]: data }))
    } catch (err) {
      console.error('[enrichEquivalents]', err)
    } finally {
      setEnrichEquivLoading(prev => ({ ...prev, [spiritName]: false }))
    }
  }

  async function handleApply(id: string, action: 'approve' | 'reject') {
    setCardErrors(prev => { const n = { ...prev }; delete n[id]; return n })
    // Optimistic remove for reject
    if (action === 'reject') setSuggestions(prev => prev.filter(s => s.id !== id))
    setApplying(prev => ({ ...prev, [id]: true }))
    try {
      const token = await getToken()
      const sug = suggestions.find(s => s.id === id)
      const localEdits = editedFields[id] || {}
      const body: any = { suggestionId: id, action }
      if (action === 'approve' && Object.keys(localEdits).length > 0 && sug) {
        body.proposedFields = { ...(sug.proposed_fields || {}), ...localEdits }
      }
      const res = await fetch('/api/library-enrich-apply', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      })
      if (res.ok) {
        setSuggestions(prev => prev.filter(s => s.id !== id))
      } else {
        const data = await res.json().catch(() => ({}))
        const errMsg = data.error || 'Action failed'
        if (action === 'reject') {
          // Undo optimistic remove — reload
          await loadSuggestions()
        }
        setCardErrors(prev => ({ ...prev, [id]: errMsg }))
      }
    } catch (e: any) {
      if (action === 'reject') await loadSuggestions()
      setCardErrors(prev => ({ ...prev, [id]: e.message || 'Network error' }))
    } finally {
      setApplying(prev => { const n = { ...prev }; delete n[id]; return n })
    }
  }

  async function handleBulkApproveHigh() {
    const high = suggestions.filter(s => s.confidence >= 7)
    for (const s of high) {
      await handleApply(s.id, 'approve')
    }
  }

  async function handleBulkRejectAll() {
    for (const s of [...suggestions]) {
      await handleApply(s.id, 'reject')
    }
  }

  const filtered = suggestions.filter(s => {
    if (filter === 'enrich') return s.action === 'enrich'
    if (filter === 'add')    return s.action === 'add'
    if (filter === 'high')   return s.confidence >= 7
    return true
  })

  const bdr  = isDark ? '#1e1a2e' : '#d4c9b8'
  const gold = isDark ? '#C9A84C' : '#8B6914'
  const dim  = isDark ? '#6b5e45' : '#7a6a50'

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 60, fontFamily: cinzel, fontSize: 11, color: dim, letterSpacing: '0.12em' }}>
        LOADING SUGGESTIONS...
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: cinzel, fontSize: 16, letterSpacing: '0.14em', color: gold, marginBottom: 6 }}>
          🔗 ENRICHMENT SUGGESTIONS
        </div>
        <div style={{ fontFamily: crimson, fontSize: 14, color: dim }}>
          Review AI-extracted data from your library before applying to database
        </div>
      </div>

      {/* Bulk actions */}
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={handleBulkApproveHigh}
            style={{ padding: '7px 16px', background: 'rgba(58,106,58,0.15)', border: '1px solid #3a6a3a', borderRadius: 4, color: '#5a8a5a', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
            ✓ APPROVE ALL HIGH CONFIDENCE (≥7)
          </button>
          <button onClick={handleBulkRejectAll}
            style={{ padding: '7px 16px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 4, color: '#6b4040', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer' }}>
            ✗ REJECT ALL
          </button>
          <button onClick={loadSuggestions}
            style={{ padding: '7px 14px', background: 'transparent', border: `1px solid ${bdr}`, borderRadius: 4, color: dim, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: 'pointer', marginLeft: 'auto' }}>
            ↻ REFRESH
          </button>
        </div>
      )}

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'enrich', 'add', 'high'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: '5px 14px', background: filter === f ? 'rgba(201,168,76,0.12)' : 'transparent', border: `1px solid ${filter === f ? gold : bdr}`, borderRadius: 20, color: filter === f ? gold : dim, fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', cursor: 'pointer' }}>
            {f === 'all' ? `ALL (${suggestions.length})` : f === 'enrich' ? `ENRICH EXISTING (${suggestions.filter(s => s.action === 'enrich').length})` : f === 'add' ? `ADD NEW (${suggestions.filter(s => s.action === 'add').length})` : `HIGH CONFIDENCE (${suggestions.filter(s => s.confidence >= 7).length})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, fontFamily: cinzel, fontSize: 11, color: dim, letterSpacing: '0.1em' }}>
          {suggestions.length === 0 ? 'No pending suggestions. Run "🔗 GENERATE SUGGESTIONS" from a book in Min. Library.' : 'No suggestions match this filter.'}
        </div>
      )}

      {/* Cards */}
      {filtered.map(s => (
        <div key={s.id} style={{ padding: '16px 20px', marginBottom: 10, background: isDark ? '#0a0807' : '#faf6f0', border: `1px solid ${s.action === 'add' ? '#3a2020' : '#1e2a1e'}`, borderLeft: `3px solid ${s.action === 'add' ? '#8B3232' : '#3a6a3a'}`, borderRadius: 6 }}>
          {/* Card header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div>
              <span style={{ fontFamily: cinzel, fontSize: 13, color: gold, letterSpacing: '0.06em' }}>
                {s.spirit_name}
              </span>
              <span style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.1em', marginLeft: 10, padding: '2px 8px', borderRadius: 10, background: s.action === 'add' ? 'rgba(139,50,50,0.15)' : 'rgba(58,106,58,0.15)', color: s.action === 'add' ? '#8B5050' : '#5a8a5a' }}>
                {s.action === 'add' ? 'NEW SPIRIT' : 'ENRICH EXISTING'}
              </span>
              <span style={{ fontFamily: cinzel, fontSize: 8, color: '#4a3f2f', marginLeft: 8 }}>
                CONFIDENCE: {s.confidence}/10
              </span>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const, justifyContent: 'flex-end' }}>
              <button
                onClick={() => fetchEnrichEquivalents(s.spirit_name, s.kingdom || '', s.description || '')}
                disabled={enrichEquivLoading[s.spirit_name]}
                style={{ padding: '4px 10px', background: 'transparent', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 4, color: gold, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', opacity: enrichEquivLoading[s.spirit_name] ? 0.5 : 1 }}>
                {enrichEquivLoading[s.spirit_name] ? 'Looking up...' : '✦ Find Equivalents'}
              </button>
              <button onClick={() => handleApply(s.id, 'approve')} disabled={applying[s.id]}
                style={{ padding: '6px 14px', background: 'rgba(58,106,58,0.15)', border: '1px solid #3a6a3a', borderRadius: 4, color: '#5a8a5a', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: applying[s.id] ? 'not-allowed' : 'pointer' }}>
                {applying[s.id] ? '⏳' : '✓ APPROVE'}
              </button>
              <button onClick={() => handleApply(s.id, 'reject')} disabled={applying[s.id]}
                style={{ padding: '6px 14px', background: 'transparent', border: '1px solid #3a2020', borderRadius: 4, color: '#6b4040', fontFamily: cinzel, fontSize: 9, letterSpacing: '0.08em', cursor: applying[s.id] ? 'not-allowed' : 'pointer' }}>
                ✗ REJECT
              </button>
            </div>
          </div>

          {/* Source book */}
          <div style={{ fontFamily: cinzel, fontSize: 8, color: '#3a3020', letterSpacing: '0.08em', marginBottom: 8 }}>
            📖 {s.book_title}
          </div>

          {/* Excerpt */}
          {s.source_excerpt && (
            <div style={{ fontFamily: crimson, fontSize: 13, color: '#4a3f2f', fontStyle: 'italic', borderLeft: '2px solid #2a2218', paddingLeft: 10, marginBottom: 10 }}>
              "{s.source_excerpt.slice(0, 200)}{s.source_excerpt.length > 200 ? '...' : ''}"
            </div>
          )}

          {/* Inline error */}
          {cardErrors[s.id] && (
            <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 4, fontFamily: crimson, fontSize: 12, color: '#f87171' }}>
              ⚠ {cardErrors[s.id]}
            </div>
          )}

          {/* Proposed fields — editable with AI fill */}
          {Object.entries(s.proposed_fields || {}).map(([field, value]: [string, any]) => {
            const aiKey = `${s.id}:${field}`
            const currentVal = editedFields[s.id]?.[field] ?? String(value)
            const isDirty = editedFields[s.id]?.[field] !== undefined
            return (
              <div key={field} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: cinzel, fontSize: 8, color: isDirty ? gold : '#6b5e45', letterSpacing: '0.08em' }}>
                    {field}{isDirty ? ' ✎' : ''}
                  </span>
                  <button
                    onClick={() => handleAIFillField(s.id, field, s.spirit_name, s.book_title)}
                    disabled={aiFillingField[aiKey]}
                    style={{ background: 'transparent', border: `1px solid ${aiFillingField[aiKey] ? 'rgba(201,168,76,0.15)' : 'rgba(201,168,76,0.3)'}`, borderRadius: 3, padding: '2px 8px', fontSize: 8, color: aiFillingField[aiKey] ? dim : gold, fontFamily: cinzel, cursor: 'pointer', letterSpacing: '0.06em' }}>
                    {aiFillingField[aiKey] ? '…' : '✦ AI'}
                  </button>
                </div>
                <textarea
                  value={currentVal}
                  onChange={e => setEditedFields(prev => ({ ...prev, [s.id]: { ...(prev[s.id] || {}), [field]: e.target.value } }))}
                  rows={2}
                  style={{ width: '100%', boxSizing: 'border-box' as const, background: isDirty ? 'rgba(201,168,76,0.04)' : 'transparent', border: `1px solid ${isDirty ? 'rgba(201,168,76,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 3, padding: '5px 8px', color: '#8a7a60', fontFamily: crimson, fontSize: 12, resize: 'vertical' as const, outline: 'none' }}
                />
              </div>
            )
          })}

          {/* Equivalent spirits panel */}
          {enrichEquivalents[s.spirit_name] && (() => {
            const eqData = enrichEquivalents[s.spirit_name]
            const eqList: any[] = eqData.equivalents || []
            const eqSummary: string = eqData.summary || ''
            const eqKey = 'Equivalent Spirits'
            const currentEq = editedFields[s.id]?.[eqKey] ?? ''
            return (
              <div style={{ marginTop: 10, background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.18)', borderRadius: 5, padding: 10 }}>
                <div style={{ fontFamily: cinzel, fontSize: 8, color: gold, letterSpacing: '0.1em', marginBottom: 6 }}>🌐 CROSS-CULTURAL EQUIVALENTS</div>
                {eqSummary && <div style={{ fontFamily: crimson, fontSize: 12, color: '#6b5e45', fontStyle: 'italic', marginBottom: 8 }}>{eqSummary}</div>}
                {eqList.length === 0 ? (
                  <div style={{ fontFamily: crimson, fontSize: 12, color: dim }}>No equivalents found with sufficient confidence.</div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6, marginBottom: 8 }}>
                      {eqList.map((eq: any, idx: number) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 4, padding: '4px 8px' }}>
                          <span style={{ fontFamily: cinzel, fontSize: 10, color: gold }}>{eq.name}</span>
                          <span style={{ fontFamily: cinzel, fontSize: 8, color: 'rgba(201,168,76,0.45)' }}>({eq.tradition})</span>
                          <span style={{ fontFamily: cinzel, fontSize: 8, color: 'rgba(201,168,76,0.35)' }}>{eq.confidence}/10</span>
                          <button
                            onClick={() => {
                              const line = eq.tradition ? `${eq.name} (${eq.tradition})` : eq.name
                              const updated = currentEq.trim() ? `${currentEq.trim()}\n${line}` : line
                              setEditedFields(prev => ({ ...prev, [s.id]: { ...(prev[s.id] || {}), [eqKey]: updated } }))
                            }}
                            style={{ background: 'transparent', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 3, padding: '1px 6px', fontSize: 8, color: gold, fontFamily: cinzel, cursor: 'pointer' }}>
                            + ADD
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => {
                        const allLines = eqList.map((eq: any) => eq.tradition ? `${eq.name} (${eq.tradition})` : eq.name).join('\n')
                        const updated = currentEq.trim() ? `${currentEq.trim()}\n${allLines}` : allLines
                        setEditedFields(prev => ({ ...prev, [s.id]: { ...(prev[s.id] || {}), [eqKey]: updated } }))
                        setEnrichEquivalents(prev => { const n = { ...prev }; delete n[s.spirit_name]; return n })
                      }}
                      style={{ background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 4, padding: '4px 10px', fontSize: 8, color: gold, fontFamily: cinzel, cursor: 'pointer', letterSpacing: '0.08em', width: '100%' }}>
                      + ADD ALL TO EQUIVALENT SPIRITS FIELD
                    </button>
                    {currentEq && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontFamily: cinzel, fontSize: 8, color: '#6b5e45', letterSpacing: '0.08em', marginBottom: 3 }}>{eqKey} ✎</div>
                        <textarea
                          value={currentEq}
                          onChange={e => setEditedFields(prev => ({ ...prev, [s.id]: { ...(prev[s.id] || {}), [eqKey]: e.target.value } }))}
                          rows={3}
                          style={{ width: '100%', boxSizing: 'border-box' as const, background: 'rgba(201,168,76,0.04)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: 3, padding: '5px 8px', color: '#8a7a60', fontFamily: crimson, fontSize: 12, resize: 'vertical' as const, outline: 'none' }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )
          })()}
        </div>
      ))}
    </div>
  )
}

// ─── SuggestedEditsAdmin ──────────────────────────────────────────────────────

function SuggestedEditsAdmin({ getToken, isDark }: { getToken: () => Promise<string | null>; isDark: boolean }) {
  const adGold   = isDark ? '#C9A84C' : '#8a6d1e'
  const adDim    = isDark ? 'rgba(200,190,170,0.55)' : '#6b5e45'
  const adBdr    = isDark ? 'rgba(201,168,76,0.18)' : 'rgba(139,109,30,0.25)'
  const surf     = isDark ? '#13111a' : '#ffffff'
  const txt      = isDark ? 'rgba(232,224,208,0.9)' : '#2c2416'
  const cinzel   = "'Cinzel', serif"
  const crimson  = "'Crimson Text', serif"
  const mono     = "'JetBrains Mono', monospace"

  const [edits, setEdits]           = useState<any[]>([])
  const [loading, setLoading]       = useState(true)
  const [statusFilter, setStatusFilter] = useState('pending')
  const [expanded, setExpanded]     = useState<string | null>(null)
  const [adminNotes, setAdminNotes] = useState<Record<string, string>>({})
  const [saving, setSaving]         = useState<string | null>(null)

  async function load(status = statusFilter) {
    setLoading(true)
    try {
      const token = await getToken()
      const res = await fetch(`/api/suggested-edits?status=${status}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) { const d = await res.json(); setEdits(d.edits ?? []) }
    } catch { /* ignore */ }
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  async function updateStatus(id: string, status: string) {
    setSaving(id)
    try {
      const token = await getToken()
      await fetch('/api/suggested-edits', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ id, status, admin_notes: adminNotes[id] ?? undefined }),
      })
      setEdits(prev => prev.map(e => e.id === id ? { ...e, status, admin_notes: adminNotes[id] ?? e.admin_notes } : e))
    } catch { /* ignore */ }
    setSaving(null)
  }

  const STATUS_COLORS: Record<string, string> = {
    pending:  'rgba(201,168,76,0.8)',
    approved: '#5ca85c',
    rejected: '#a85c5c',
    resolved: '#5c8ca8',
  }

  return (
    <div style={{ color: txt, fontFamily: crimson }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap' as const, gap: 12 }}>
        <div style={{ fontFamily: cinzel, fontSize: 14, color: adGold, letterSpacing: '0.1em' }}>🚩 Suggested Edits / Flags</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['pending', 'approved', 'rejected', 'resolved', 'all'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              style={{ padding: '5px 12px', background: statusFilter === s ? 'rgba(201,168,76,0.15)' : 'transparent', border: `1px solid ${statusFilter === s ? adGold : adBdr}`, borderRadius: 3, color: statusFilter === s ? adGold : adDim, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer', textTransform: 'uppercase' as const }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: adDim, fontFamily: mono, fontSize: 12 }}>Loading...</div>
      ) : edits.length === 0 ? (
        <div style={{ background: surf, border: `1px solid ${adBdr}`, borderRadius: 8, padding: '40px 24px', textAlign: 'center' as const, color: adDim, fontFamily: crimson, fontSize: 14 }}>
          No {statusFilter === 'all' ? '' : statusFilter} submissions.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 10 }}>
          {edits.map(edit => (
            <div key={edit.id} style={{ background: surf, border: `1px solid ${adBdr}`, borderRadius: 6, overflow: 'hidden' }}>
              <div
                onClick={() => setExpanded(expanded === edit.id ? null : edit.id)}
                style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 12, alignItems: 'center', padding: '12px 16px', cursor: 'pointer' }}
              >
                <div>
                  <div style={{ fontFamily: cinzel, fontSize: 11, color: adGold, letterSpacing: '0.06em', marginBottom: 2 }}>{edit.content_title || edit.content_id}</div>
                  <div style={{ fontSize: 12, color: txt, lineHeight: 1.4 }}>{edit.description.slice(0, 100)}{edit.description.length > 100 ? '…' : ''}</div>
                  <div style={{ fontSize: 10, color: adDim, fontFamily: mono, marginTop: 4 }}>{edit.user_name} · {edit.content_type} · {new Date(edit.created_at).toLocaleDateString()}</div>
                </div>
                <span style={{ fontFamily: mono, fontSize: 9, padding: '2px 8px', borderRadius: 3, background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.2)', color: adGold, whiteSpace: 'nowrap' as const }}>{edit.issue_type}</span>
                <span style={{ fontFamily: mono, fontSize: 9, padding: '2px 8px', borderRadius: 3, border: `1px solid ${STATUS_COLORS[edit.status] || adBdr}55`, color: STATUS_COLORS[edit.status] || adDim, whiteSpace: 'nowrap' as const }}>{edit.status}</span>
                <span style={{ color: adDim, fontSize: 14 }}>{expanded === edit.id ? '▲' : '▼'}</span>
              </div>

              {expanded === edit.id && (
                <div style={{ borderTop: `1px solid ${adBdr}`, padding: '16px 20px', background: isDark ? '#0a0a0d' : '#f0ede8' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: edit.suggestion ? '1fr 1fr' : '1fr', gap: 16, marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: mono, fontSize: 9, color: adDim, letterSpacing: '0.08em', marginBottom: 4 }}>DESCRIPTION</div>
                      <div style={{ fontSize: 13, color: txt, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>{edit.description}</div>
                    </div>
                    {edit.suggestion && (
                      <div>
                        <div style={{ fontFamily: mono, fontSize: 9, color: adDim, letterSpacing: '0.08em', marginBottom: 4 }}>SUGGESTION</div>
                        <div style={{ fontSize: 13, color: txt, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const }}>{edit.suggestion}</div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontFamily: mono, fontSize: 9, color: adDim, letterSpacing: '0.08em', marginBottom: 4 }}>ADMIN NOTES</div>
                    <textarea
                      value={adminNotes[edit.id] ?? (edit.admin_notes || '')}
                      onChange={e => setAdminNotes(prev => ({ ...prev, [edit.id]: e.target.value }))}
                      placeholder="Add internal notes…"
                      rows={2}
                      style={{ width: '100%', padding: '8px 10px', background: isDark ? '#111114' : '#fff', border: `1px solid ${adBdr}`, borderRadius: 3, color: txt, fontFamily: mono, fontSize: 11, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
                    {(['approved', 'rejected', 'resolved', 'pending'] as const).map(s => (
                      <button key={s} onClick={() => updateStatus(edit.id, s)}
                        disabled={saving === edit.id || edit.status === s}
                        style={{ padding: '6px 14px', background: 'transparent', border: `1px solid ${STATUS_COLORS[s] || adBdr}`, borderRadius: 3, color: STATUS_COLORS[s] || adDim, fontFamily: cinzel, fontSize: 9, letterSpacing: '0.06em', cursor: edit.status === s ? 'default' : 'pointer', opacity: edit.status === s ? 0.4 : saving === edit.id ? 0.6 : 1, textTransform: 'uppercase' as const }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
