// STYLE RULE: No em dashes in any UI text.
import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useUser } from '@clerk/tanstack-start'
import rawManifest from '../../scripts/church-fathers-manifest.json'

export const Route = createFileRoute('/admin/church-fathers-library')({
  component: ChurchFathersLibrary,
})

// ─── Types ───────────────────────────────────────────────────────────────────

interface PatristicEntry {
  id: string
  author: string
  title: string
  year_approx: number
  topic_tags: string[]
  ccel_url: string | null
  archive_url: string | null
  gutenberg_url: string | null
  public_domain: boolean
  priority: 'high' | 'medium'
  description: string
}

const manifest = rawManifest as PatristicEntry[]

// ─── Constants ────────────────────────────────────────────────────────────────

const G       = '#C9A84C'
const BG      = '#0D0B14'
const SURF    = '#13111e'
const SURF2   = '#1a1726'
const BDR     = 'rgba(201,168,76,0.18)'
const TXT     = '#e8dcc8'
const DIM     = '#9a8c74'
const cinzel  = "'Cinzel', serif"
const crimson = "'Crimson Pro', serif"

// Collect all unique tags from the manifest for the filter dropdown
const ALL_TAGS = Array.from(
  new Set(manifest.flatMap(e => e.topic_tags))
).sort()

// ─── Row component ────────────────────────────────────────────────────────────

function EntryRow({ entry }: { entry: PatristicEntry }) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(false)

  function handleCopy() {
    const primaryUrl = entry.ccel_url || entry.archive_url || entry.gutenberg_url || ''
    const text = `${entry.author} — ${entry.title} (c. ${entry.year_approx})\n\n${entry.description}${primaryUrl ? `\n\nSource: ${primaryUrl}` : ''}`
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const linkCount = [entry.ccel_url, entry.archive_url, entry.gutenberg_url].filter(Boolean).length

  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '180px 1fr 64px 1fr 120px 90px',
          gap: 12,
          alignItems: 'start',
          padding: '12px 16px',
          borderBottom: `1px solid ${BDR}`,
          cursor: 'pointer',
          transition: 'background 0.12s',
        }}
        onClick={() => setExpanded(e => !e)}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(201,168,76,0.04)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
      >
        {/* Author */}
        <div style={{ fontFamily: cinzel, fontSize: 11, color: G, letterSpacing: '0.04em', paddingTop: 1 }}>
          {entry.author}
        </div>

        {/* Title */}
        <div>
          <div style={{ fontFamily: crimson, fontSize: 13, color: TXT, lineHeight: 1.4 }}>{entry.title}</div>
          <div style={{ fontFamily: cinzel, fontSize: 8, color: DIM, letterSpacing: '0.1em', marginTop: 2 }}>
            {expanded ? '▲ COLLAPSE' : '▼ DETAILS'}
          </div>
        </div>

        {/* Year */}
        <div style={{ fontFamily: crimson, fontSize: 12, color: DIM, paddingTop: 1 }}>
          c. {entry.year_approx}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, paddingTop: 2 }}>
          {entry.topic_tags.map(tag => (
            <span
              key={tag}
              style={{
                fontFamily: cinzel, fontSize: 8, letterSpacing: '0.06em',
                color: DIM, background: 'rgba(201,168,76,0.08)',
                border: `1px solid rgba(201,168,76,0.18)`,
                borderRadius: 3, padding: '2px 6px',
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Links */}
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 4, paddingTop: 2 }}>
          {entry.ccel_url && (
            <a
              href={entry.ccel_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontFamily: cinzel, fontSize: 9, color: '#7ab4e0', letterSpacing: '0.06em', textDecoration: 'none' }}
            >
              CCEL ↗
            </a>
          )}
          {entry.archive_url && (
            <a
              href={entry.archive_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontFamily: cinzel, fontSize: 9, color: '#7ab4e0', letterSpacing: '0.06em', textDecoration: 'none' }}
            >
              Archive ↗
            </a>
          )}
          {entry.gutenberg_url && (
            <a
              href={entry.gutenberg_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              style={{ fontFamily: cinzel, fontSize: 9, color: '#7ab4e0', letterSpacing: '0.06em', textDecoration: 'none' }}
            >
              Gutenberg ↗
            </a>
          )}
          {linkCount === 0 && (
            <span style={{ fontFamily: cinzel, fontSize: 9, color: 'rgba(154,140,116,0.5)', letterSpacing: '0.06em' }}>
              No URLs
            </span>
          )}
        </div>

        {/* Copy button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }} onClick={e => e.stopPropagation()}>
          <button
            onClick={handleCopy}
            style={{
              fontFamily: cinzel, fontSize: 8, letterSpacing: '0.08em',
              padding: '5px 10px', borderRadius: 4,
              background: copied ? 'rgba(74,222,128,0.12)' : 'rgba(201,168,76,0.08)',
              border: `1px solid ${copied ? 'rgba(74,222,128,0.4)' : BDR}`,
              color: copied ? '#4ade80' : G,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {copied ? '✓ COPIED' : 'COPY'}
          </button>
        </div>
      </div>

      {/* Expanded description row */}
      {expanded && (
        <div style={{
          padding: '12px 16px 16px',
          borderBottom: `1px solid ${BDR}`,
          background: 'rgba(201,168,76,0.03)',
        }}>
          <p style={{ fontFamily: crimson, fontSize: 14, color: TXT, lineHeight: 1.8, margin: 0, fontStyle: 'italic' }}>
            {entry.description}
          </p>
        </div>
      )}
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

function ChurchFathersLibrary() {
  const { user, isLoaded } = useUser()
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium'>('all')
  const [filterTag, setFilterTag] = useState('')
  const [filterSearch, setFilterSearch] = useState('')

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
            This panel is restricted to ordained ministers.
          </p>
          <a href="/community" style={{ fontFamily: cinzel, fontSize: 10, letterSpacing: '0.1em', color: BG, background: G, padding: '10px 24px', borderRadius: 5, textDecoration: 'none' }}>
            Return to Community
          </a>
        </div>
      </div>
    )
  }

  const filtered = useMemo(() => {
    return manifest.filter(entry => {
      if (filterPriority !== 'all' && entry.priority !== filterPriority) return false
      if (filterTag && !entry.topic_tags.includes(filterTag)) return false
      if (filterSearch) {
        const q = filterSearch.toLowerCase()
        return (
          entry.author.toLowerCase().includes(q) ||
          entry.title.toLowerCase().includes(q) ||
          entry.description.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [filterPriority, filterTag, filterSearch])

  const highCount   = manifest.filter(e => e.priority === 'high').length
  const mediumCount = manifest.filter(e => e.priority === 'medium').length
  const withLinks   = manifest.filter(e => e.ccel_url || e.archive_url || e.gutenberg_url).length

  const selectStyle: React.CSSProperties = {
    background: SURF, border: `1px solid ${BDR}`, borderRadius: 6,
    padding: '7px 12px', color: TXT, fontFamily: cinzel,
    fontSize: 10, letterSpacing: '0.08em', cursor: 'pointer', outline: 'none',
  }

  const inputStyle: React.CSSProperties = {
    background: SURF, border: `1px solid ${BDR}`, borderRadius: 6,
    padding: '7px 12px', color: TXT, fontFamily: crimson,
    fontSize: 13, outline: 'none', width: 240,
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, color: TXT, fontFamily: crimson }}>

      {/* Header bar */}
      <div style={{
        background: SURF, borderBottom: `1px solid ${BDR}`,
        padding: '13px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky' as const, top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <a
            href="/admin"
            style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM, textDecoration: 'none' }}
          >
            ← ADMIN
          </a>
          <div>
            <div style={{ fontFamily: cinzel, fontSize: 14, color: G, letterSpacing: '0.1em', fontWeight: 700 }}>
              PATRISTIC SOURCE LIBRARY
            </div>
            <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.12em', marginTop: 2 }}>
              Pre-1800 spiritual warfare primary sources
            </div>
          </div>
        </div>
        <div style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.1em' }}>
          {manifest.length} SOURCES
        </div>
      </div>

      <div style={{ padding: '24px 28px', maxWidth: 1200 }}>

        {/* Stats row */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24,
        }}>
          {[
            { label: 'Total Sources', value: manifest.length },
            { label: 'High Priority', value: highCount },
            { label: 'Medium Priority', value: mediumCount },
            { label: 'With Source URLs', value: withLinks },
          ].map(stat => (
            <div key={stat.label} style={{
              background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, padding: '14px 18px',
            }}>
              <div style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.14em', color: DIM, marginBottom: 6 }}>
                {stat.label.toUpperCase()}
              </div>
              <div style={{ fontFamily: cinzel, fontSize: 26, color: G }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{
          background: SURF, border: `1px solid ${BDR}`, borderRadius: 8,
          padding: '14px 18px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' as const,
        }}>
          <div style={{ fontFamily: cinzel, fontSize: 9, letterSpacing: '0.1em', color: DIM }}>FILTER</div>

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value as 'all' | 'high' | 'medium')}
            style={selectStyle}
          >
            <option value="all">All Priorities</option>
            <option value="high">High Priority</option>
            <option value="medium">Medium Priority</option>
          </select>

          <select
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Tags</option>
            {ALL_TAGS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>

          <input
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            placeholder="Search author, title, or text..."
            style={inputStyle}
          />

          {(filterPriority !== 'all' || filterTag || filterSearch) && (
            <button
              onClick={() => { setFilterPriority('all'); setFilterTag(''); setFilterSearch('') }}
              style={{
                background: 'none', border: `1px solid ${BDR}`, borderRadius: 4,
                padding: '6px 12px', color: DIM, fontFamily: cinzel,
                fontSize: 8, letterSpacing: '0.08em', cursor: 'pointer',
              }}
            >
              CLEAR
            </button>
          )}

          <span style={{ marginLeft: 'auto', fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.08em' }}>
            {filtered.length} of {manifest.length} shown
          </span>
        </div>

        {/* Table */}
        <div style={{ background: SURF, border: `1px solid ${BDR}`, borderRadius: 8, overflow: 'hidden' }}>

          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '180px 1fr 64px 1fr 120px 90px',
            gap: 12, padding: '10px 16px',
            background: SURF2, borderBottom: `1px solid ${BDR}`,
          }}>
            {['Author', 'Title', 'Year', 'Tags', 'Links', 'Copy'].map(h => (
              <div key={h} style={{ fontFamily: cinzel, fontSize: 8, letterSpacing: '0.12em', color: DIM }}>
                {h.toUpperCase()}
              </div>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center' as const, color: DIM, fontFamily: crimson, fontStyle: 'italic' }}>
              No sources match the current filters.
            </div>
          ) : (
            filtered.map(entry => <EntryRow key={entry.id} entry={entry} />)
          )}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 20, padding: '12px 16px', background: 'rgba(201,168,76,0.04)', border: `1px solid ${BDR}`, borderRadius: 6 }}>
          <p style={{ fontFamily: cinzel, fontSize: 9, color: DIM, letterSpacing: '0.08em', margin: 0 }}>
            All sources are pre-1923 public domain texts. CCEL, Archive.org, and Gutenberg URLs link to the primary source for verification and import. Use the COPY button to export a formatted description with source URL for AI knowledge base ingestion.
          </p>
        </div>
      </div>
    </div>
  )
}
