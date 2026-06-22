export interface AssembleOptions {
  query: string
  spiritName?: string
  maxChars?: number
}

const STOP_WORDS = new Set([
  'what', 'how', 'does', 'the', 'are', 'who', 'when', 'why', 'tell',
  'about', 'this', 'that', 'with', 'from', 'spirit', 'demon', 'give',
  'info', 'is', 'in', 'of', 'and', 'or', 'a', 'an', 'to', 'for',
  'on', 'at', 'by', 'it', 'be', 'do', 'as', 'not', 'can', 'me', 'my',
])

function extractKeyword(query: string): string {
  return (
    query.toLowerCase().split(/\s+/).find(w => w.length >= 4 && !STOP_WORDS.has(w)) ||
    query.split(/\s+/)[0] ||
    ''
  )
}

async function fetchLibraryExcerpts(query: string, sbUrl: string, sbKey: string): Promise<string> {
  if (!sbUrl || !sbKey) return ''
  try {
    const keyword     = extractKeyword(query)
    const ilikeFilter = keyword
      ? `&extracted_text=ilike.*${encodeURIComponent(keyword)}*`
      : '&extracted_text=not.is.null'
    const url = `${sbUrl}/rest/v1/resources?select=title,author,source_type,extracted_text` +
      `&topic=eq.ministry-library&active=eq.true${ilikeFilter}` +
      `&order=created_at.desc&limit=8`

    const res = await fetch(url, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return ''
    const rows: any[] = await res.json()
    if (!Array.isArray(rows) || !rows.length) return ''

    const excerpts: string[] = []
    let total = 0
    for (const row of rows) {
      if (total >= 3000) break
      const text: string = row.extracted_text || ''
      if (!text) continue
      const idx   = keyword ? text.toLowerCase().indexOf(keyword.toLowerCase()) : 0
      const start = Math.max(0, (idx >= 0 ? idx : 0) - 80)
      const excerpt = text.slice(start, start + 400).replace(/\n+/g, ' ').trim()
      if (!excerpt) continue
      // §13 anonymization: classify by source_type, never emit title/author.
      // adversarial intel = 'intelligence' source_type; everything else =
      // ministry. Claude uses the class marker to frame the claim
      // (doctrine vs intelligence observation) but never names the source.
      const sourceClass = row.source_type === 'intelligence'
        ? '🕯️ intelligence source'
        : '📖 ministry source'
      const entry = `SOURCE: [${sourceClass}]\nSOURCE_START\n${excerpt}\nSOURCE_END`
      excerpts.push(entry)
      total += entry.length + 2
    }
    if (!excerpts.length) return ''
    return 'MINISTRY LIBRARY:\n' + excerpts.join('\n\n')
  } catch { return '' }
}

async function fetchMinistryContextRows(sbUrl: string, sbKey: string): Promise<string> {
  if (!sbUrl || !sbKey) return ''
  try {
    const url = `${sbUrl}/rest/v1/ministry_context` +
      `?select=context_text,label,scope&is_active=eq.true&order=scope.asc.nullslast`
    const res = await fetch(url, {
      headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` },
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return ''
    const rows: any[] = await res.json()
    if (!Array.isArray(rows) || !rows.length) return ''
    let result = ''
    for (const row of rows) {
      const label = row.label ? `: ${row.label}` : ''
      const piece = `MINISTRY CONTEXT${label}\n${row.context_text || ''}\n`
      if (result.length + piece.length > 1000) break
      result += piece
    }
    return result.trim()
  } catch { return '' }
}

export async function assembleWRIContext(opts: AssembleOptions): Promise<string> {
  const { query, maxChars = 6000 } = opts

  let sbUrl = ''
  let sbKey = ''
  try { ({ url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')) } catch {}

  const to3s = () => new Promise<string>(r => setTimeout(() => r(''), 3000))

  const [libraryCtx, ministryCtx] = await Promise.all([
    Promise.race([fetchLibraryExcerpts(query, sbUrl, sbKey), to3s()]),
    Promise.race([fetchMinistryContextRows(sbUrl, sbKey), to3s()]),
  ])

  const parts: string[] = []
  if (libraryCtx)  parts.push(libraryCtx)
  if (ministryCtx) parts.push(ministryCtx)

  return parts.join('\n\n').slice(0, maxChars)
}
