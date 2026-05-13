import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState, useEffect, useRef } from 'react'

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
})

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Resource {
  id: string
  title: string
  tier: string
  category: string
  filePath: string
  fileSize: string
  pageCount: number | null
  description: string
  tags: string
  active: boolean
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"
const gold    = '#C9A84C'
const deep    = '#0D0B14'
const surface = '#110f1c'
const surface2= '#1a1625'
const border  = '#2a2440'
const textDim = '#9d94b8'
const muted   = '#6a6080'
const text    = '#e8e0d0'

const TIERS      = ['Free', 'Soldier', 'Commander', 'General']
const CATEGORIES = ['Foundational', 'Session', 'Worksheet', 'Protocol', 'Prayer', 'Ministry', 'Occult']

const TIER_COLORS: Record<string, string> = {
  Free: '#6a6080', Soldier: '#5C7CBF', Commander: '#7C5CBF', General: '#C9A84C',
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%', background: deep, border: `1px solid ${border}`,
  borderRadius: '6px', padding: '8px 12px', color: text,
  fontFamily: crimson, fontSize: '13px', outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.12em',
  color: muted, display: 'block', marginBottom: '6px',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle, cursor: 'pointer',
}

// ─── UPLOAD FORM ─────────────────────────────────────────────────────────────
function UploadForm({ onSuccess }: { onSuccess: () => void }) {
  const [file, setFile]             = useState<File | null>(null)
  const [title, setTitle]           = useState('')
  const [description, setDesc]      = useState('')
  const [tier, setTier]             = useState('Free')
  const [category, setCat]          = useState('Foundational')
  const [tags, setTags]             = useState('')
  const [pageCount, setPageCount]   = useState('')
  const [active, setActive]         = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [result, setResult]         = useState<{ ok?: boolean; error?: string; filePath?: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload() {
    if (!file || !title || !tier) return
    setUploading(true)
    setResult(null)

    const fd = new FormData()
    fd.append('file',        file)
    fd.append('title',       title)
    fd.append('description', description)
    fd.append('tier',        tier)
    fd.append('category',    category)
    fd.append('tags',        tags)
    fd.append('pageCount',   pageCount)
    fd.append('active',      String(active))

    try {
      const res = await fetch('/api/admin-upload', {
        method: 'POST',
        body: fd,
        credentials: 'same-origin',
      })
      const data = await res.json()
      setResult(data)
      if (data.ok) {
        // Reset form
        setFile(null)
        setTitle('')
        setDesc('')
        setTags('')
        setPageCount('')
        setActive(true)
        if (fileRef.current) fileRef.current.value = ''
        onSuccess()
      }
    } catch (err: any) {
      setResult({ error: err.message })
    } finally {
      setUploading(false)
    }
  }

  return (
    <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '10px', padding: '24px' }}>
      <div style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.18em', color: gold, marginBottom: '20px' }}>
        ⚔ UPLOAD NEW RESOURCE
      </div>

      {/* File drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${file ? gold : border}`,
          borderRadius: '8px', padding: '24px',
          textAlign: 'center', cursor: 'pointer', marginBottom: '20px',
          background: file ? `${gold}08` : deep,
          transition: 'all 0.2s',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={e => setFile(e.target.files?.[0] || null)}
        />
        {file ? (
          <>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>📄</div>
            <div style={{ fontFamily: cinzel, fontSize: '11px', color: gold }}>{file.name}</div>
            <div style={{ fontSize: '12px', color: muted, marginTop: '4px' }}>{Math.round(file.size / 1024)} KB</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>📁</div>
            <div style={{ fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.1em', color: muted }}>
              CLICK TO SELECT PDF
            </div>
          </>
        )}
      </div>

      {/* Form fields — 2 col grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '14px' }}>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>TITLE *</label>
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Freemasonry Protocol" />
        </div>

        <div>
          <label style={labelStyle}>TIER *</label>
          <select style={selectStyle} value={tier} onChange={e => setTier(e.target.value)}>
            {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>CATEGORY</label>
          <select style={selectStyle} value={category} onChange={e => setCat(e.target.value)}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label style={labelStyle}>PAGE COUNT</label>
          <input style={inputStyle} type="number" value={pageCount} onChange={e => setPageCount(e.target.value)} placeholder="e.g. 11" />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingTop: '20px' }}>
          <input
            type="checkbox"
            id="active-check"
            checked={active}
            onChange={e => setActive(e.target.checked)}
            style={{ width: '16px', height: '16px', accentColor: gold, cursor: 'pointer' }}
          />
          <label htmlFor="active-check" style={{ ...labelStyle, margin: 0, cursor: 'pointer', color: textDim }}>
            PUBLISH IMMEDIATELY
          </label>
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>DESCRIPTION</label>
          <textarea
            style={{ ...inputStyle, height: '72px', resize: 'vertical' as const }}
            value={description}
            onChange={e => setDesc(e.target.value)}
            placeholder="Brief description of what this document covers..."
          />
        </div>

        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>TAGS <span style={{ color: muted, fontFamily: crimson, fontSize: '10px', letterSpacing: 0 }}>(comma separated — used for search)</span></label>
          <input
            style={inputStyle}
            value={tags}
            onChange={e => setTags(e.target.value)}
            placeholder="e.g. freemasonry, masonic, lodge, occult, renunciation"
          />
        </div>
      </div>

      {/* Result message */}
      {result && (
        <div style={{
          background: result.ok ? '#0a2010' : '#2a1010',
          border: `1px solid ${result.ok ? '#2a5020' : '#5a2020'}`,
          borderRadius: '6px', padding: '10px 14px', marginBottom: '14px',
          fontSize: '13px', color: result.ok ? '#80e090' : '#e09090',
        }}>
          {result.ok
            ? `✓ Uploaded successfully → ${result.filePath}`
            : `✗ ${result.error}`
          }
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={uploading || !file || !title}
        style={{
          background: gold, color: deep,
          fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.14em',
          padding: '12px 28px', borderRadius: '6px', border: 'none',
          cursor: uploading || !file || !title ? 'not-allowed' : 'pointer',
          opacity: uploading || !file || !title ? 0.5 : 1,
          transition: 'opacity 0.2s',
        }}
      >
        {uploading ? 'UPLOADING...' : '⚔ UPLOAD & PUBLISH'}
      </button>
    </div>
  )
}

// ─── RESOURCE ROW ─────────────────────────────────────────────────────────────
function ResourceRow({ resource, onUpdate, onDelete }: {
  resource: Resource
  onUpdate: (id: string, fields: any) => void
  onDelete: (id: string, filePath: string) => void
}) {
  const [toggling, setToggling] = useState(false)

  async function toggleActive() {
    setToggling(true)
    await onUpdate(resource.id, { Active: !resource.active })
    setToggling(false)
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 90px 110px 80px 80px 90px',
      gap: '12px',
      alignItems: 'center',
      padding: '12px 16px',
      borderBottom: `1px solid ${border}`,
      background: resource.active ? 'transparent' : `${deep}88`,
    }}>
      <div>
        <div style={{ fontFamily: crimson, fontSize: '13px', color: resource.active ? text : muted }}>
          {resource.title}
        </div>
        <div style={{ fontSize: '11px', color: muted, marginTop: '2px', fontStyle: 'italic' }}>
          {resource.filePath}
        </div>
      </div>

      <div>
        <span style={{
          fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.1em',
          color: TIER_COLORS[resource.tier] || muted,
          border: `1px solid ${TIER_COLORS[resource.tier]}44`,
          padding: '2px 8px', borderRadius: '20px',
        }}>
          {resource.tier}
        </span>
      </div>

      <div style={{ fontFamily: cinzel, fontSize: '9px', color: muted, letterSpacing: '0.08em' }}>
        {resource.category}
      </div>

      <div style={{ fontSize: '11px', color: muted }}>{resource.fileSize}</div>

      <div style={{ fontSize: '11px', color: muted }}>
        {resource.pageCount ? `${resource.pageCount} pp` : '—'}
      </div>

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        {/* Active toggle */}
        <button
          onClick={toggleActive}
          disabled={toggling}
          title={resource.active ? 'Unpublish' : 'Publish'}
          style={{
            background: resource.active ? `${gold}22` : surface2,
            border: `1px solid ${resource.active ? gold : border}`,
            borderRadius: '4px', padding: '4px 8px',
            fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.08em',
            color: resource.active ? gold : muted,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
        >
          {toggling ? '...' : resource.active ? 'LIVE' : 'DRAFT'}
        </button>

        {/* Delete */}
        <button
          onClick={() => {
            if (confirm(`Delete "${resource.title}"?\n\nThis will remove the Airtable record. Check "delete file" to also remove from Supabase.`)) {
              onDelete(resource.id, resource.filePath)
            }
          }}
          title="Delete"
          style={{
            background: 'transparent', border: `1px solid ${border}`,
            borderRadius: '4px', padding: '4px 8px',
            fontSize: '11px', color: muted, cursor: 'pointer',
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#8C4B4B'; (e.currentTarget as HTMLElement).style.color = '#e09090' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = border; (e.currentTarget as HTMLElement).style.color = muted }}
        >
          ✕
        </button>
      </div>
    </div>
  )
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────
function AdminDashboard() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'list' | 'upload'>('list')
  const navigate = useNavigate()

  async function loadResources() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin-upload', { credentials: 'same-origin' })
      if (res.status === 401) { navigate({ to: '/admin/login' }); return }
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResources(data.resources || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadResources() }, [])

  async function handleUpdate(id: string, fields: any) {
    await fetch('/api/admin-upload', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, fields }),
      credentials: 'same-origin',
    })
    await loadResources()
  }

  async function handleDelete(id: string, filePath: string) {
    const deleteFile = confirm('Also delete the PDF from Supabase Storage?\n\nOK = delete file too\nCancel = remove record only')
    await fetch('/api/admin-upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, filePath, deleteFile }),
      credentials: 'same-origin',
    })
    await loadResources()
  }

  async function handleLogout() {
    await fetch('/api/admin-auth?action=logout', { method: 'POST', credentials: 'same-origin' })
    navigate({ to: '/admin/login' })
  }

  const liveCounts = resources.filter(r => r.active).length
  const tierCounts = TIERS.reduce((acc, t) => {
    acc[t] = resources.filter(r => r.tier === t).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div style={{ background: deep, minHeight: '100vh', color: text, fontFamily: crimson }}>

      {/* ── Topbar ── */}
      <div style={{
        background: surface, borderBottom: `1px solid ${border}`,
        padding: '12px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontFamily: cinzel, fontSize: '12px', letterSpacing: '0.18em', color: gold }}>
            WAR ROOM INTEL
          </div>
          <div style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.14em', color: muted }}>
            ADMIN
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a href="/" target="_blank" rel="noopener noreferrer"
            style={{ fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.1em', color: muted, textDecoration: 'none' }}>
            VIEW SITE ↗
          </a>
          <button onClick={handleLogout} style={{
            fontFamily: cinzel, fontSize: '9px', letterSpacing: '0.1em',
            background: 'transparent', border: `1px solid ${border}`,
            color: muted, padding: '6px 14px', borderRadius: '4px', cursor: 'pointer',
          }}>
            LOGOUT
          </button>
        </div>
      </div>

      <div style={{ padding: '28px 32px', maxWidth: '1100px' }}>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'Total Files', value: resources.length },
            { label: 'Live', value: liveCounts },
            ...TIERS.map(t => ({ label: t, value: tierCounts[t] || 0 })),
          ].map(({ label, value }) => (
            <div key={label} style={{
              background: surface, border: `1px solid ${border}`,
              borderRadius: '8px', padding: '14px 16px',
            }}>
              <div style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.14em', color: muted, marginBottom: '6px' }}>
                {label.toUpperCase()}
              </div>
              <div style={{ fontFamily: cinzel, fontSize: '22px', color: gold }}>{value}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: '0', borderBottom: `1px solid ${border}`, marginBottom: '24px' }}>
          {(['list', 'upload'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.14em',
              textTransform: 'uppercase' as const,
              padding: '12px 20px', background: 'none', border: 'none',
              borderBottom: `2px solid ${activeTab === tab ? gold : 'transparent'}`,
              color: activeTab === tab ? gold : muted,
              cursor: 'pointer', marginBottom: '-1px',
            }}>
              {tab === 'list' ? `Files (${resources.length})` : '⚔ Upload New'}
            </button>
          ))}
        </div>

        {/* ── Upload tab ── */}
        {activeTab === 'upload' && (
          <UploadForm onSuccess={() => { loadResources(); setActiveTab('list') }} />
        )}

        {/* ── List tab ── */}
        {activeTab === 'list' && (
          <div style={{ background: surface, border: `1px solid ${border}`, borderRadius: '10px', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 90px 110px 80px 80px 90px',
              gap: '12px', padding: '10px 16px',
              background: surface2, borderBottom: `1px solid ${border}`,
            }}>
              {['Title / Path', 'Tier', 'Category', 'Size', 'Pages', 'Actions'].map(h => (
                <div key={h} style={{ fontFamily: cinzel, fontSize: '8px', letterSpacing: '0.12em', color: muted }}>
                  {h}
                </div>
              ))}
            </div>

            {loading && (
              <div style={{ padding: '40px', textAlign: 'center', color: muted, fontFamily: cinzel, fontSize: '10px', letterSpacing: '0.2em' }}>
                LOADING...
              </div>
            )}

            {error && (
              <div style={{ padding: '24px', color: '#e09090', fontSize: '13px' }}>Error: {error}</div>
            )}

            {!loading && !error && resources.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: muted, fontFamily: crimson, fontStyle: 'italic' }}>
                No resources yet. Upload your first file.
              </div>
            )}

            {!loading && resources.map(r => (
              <ResourceRow
                key={r.id}
                resource={r}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
