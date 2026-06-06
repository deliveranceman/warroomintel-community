const AIRTABLE_BASE_ID  = 'appVXEj2DLPBTJTtD'
const AIRTABLE_TABLE_ID = 'tblcP4lgVykzOhLi4'
const NAME_FIELD        = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

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

async function fetchSpiritEntry(lookupName: string, token: string): Promise<string> {
  if (!token || !lookupName.trim()) return ''
  try {
    const name = lookupName.trim().slice(0, 60).replace(/"/g, '')
    const url  = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}`)
    url.searchParams.set('maxRecords', '2')
    url.searchParams.set(
      'filterByFormula',
      `SEARCH(LOWER("${name.toLowerCase()}"),LOWER({${NAME_FIELD}}))`,
    )
    for (const f of [
      NAME_FIELD, 'Function', 'Manifestiation', 'Scripture Context',
      'Kingdom', 'Biblical Rank', 'Sub-Kingdom', 'Cultural Presence',
      'Session Trigger Questions', 'Prayer Points',
    ]) url.searchParams.append('fields[]', f)

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(2500),
    })
    if (!res.ok) return ''
    const data = await res.json()
    if (!data.records?.length) return ''

    const blocks: string[] = []
    for (const rec of data.records) {
      const f    = rec.fields || {}
      const rname = f[NAME_FIELD]
      if (!rname) continue
      const lines = [`Name: ${rname}`]
      if (f['Function'])                    lines.push(`Function: ${String(f['Function']).slice(0, 300)}`)
      if (f['Manifestiation'])              lines.push(`Manifestations: ${String(f['Manifestiation']).slice(0, 300)}`)
      if (f['Scripture Context'])           lines.push(`Scripture: ${String(f['Scripture Context']).slice(0, 200)}`)
      if (f['Kingdom'])                     lines.push(`Kingdom: ${f['Kingdom']}`)
      if (f['Biblical Rank'])               lines.push(`Biblical Rank: ${f['Biblical Rank']}`)
      if (f['Sub-Kingdom'])                 lines.push(`Sub-Kingdom: ${f['Sub-Kingdom']}`)
      if (Array.isArray(f['Cultural Presence']) && f['Cultural Presence'].length)
        lines.push(`Cultural Presence: ${f['Cultural Presence'].join(', ')}`)
      if (f['Session Trigger Questions'])   lines.push(`Trigger Questions: ${String(f['Session Trigger Questions']).slice(0, 400)}`)
      if (f['Prayer Points'])               lines.push(`Prayer Points: ${String(f['Prayer Points']).slice(0, 300)}`)
      blocks.push(lines.join('\n'))
    }
    if (!blocks.length) return ''
    return ('SPIRIT DATABASE:\n' + blocks.join('\n\n---\n\n')).slice(0, 2000)
  } catch { return '' }
}

async function fetchLibraryExcerpts(query: string, sbUrl: string, sbKey: string): Promise<string> {
  if (!sbUrl || !sbKey) return ''
  try {
    const keyword     = extractKeyword(query)
    const ilikeFilter = keyword
      ? `&extracted_text=ilike.*${encodeURIComponent(keyword)}*`
      : '&extracted_text=not.is.null'
    const url = `${sbUrl}/rest/v1/resources?select=title,author,extracted_text` +
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
      const entry = `SOURCE: ${row.title || 'Unknown'} by ${row.author || 'Unknown'}\nSOURCE_START\n${excerpt}\nSOURCE_END`
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
  const { query, spiritName, maxChars = 6000 } = opts

  let airtableToken = ''
  let sbUrl = ''
  let sbKey = ''
  try { ({ token: airtableToken } = JSON.parse(process.env.AIRTABLE || '{}')) } catch {}
  try { ({ url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')) } catch {}

  const to3s = () => new Promise<string>(r => setTimeout(() => r(''), 3000))
  const lookupName = spiritName?.trim() || query.trim().split(/\s+/).slice(0, 4).join(' ')

  const [spiritCtx, libraryCtx, ministryCtx] = await Promise.all([
    Promise.race([fetchSpiritEntry(lookupName, airtableToken), to3s()]),
    Promise.race([fetchLibraryExcerpts(query, sbUrl, sbKey), to3s()]),
    Promise.race([fetchMinistryContextRows(sbUrl, sbKey), to3s()]),
  ])

  const parts: string[] = []
  if (spiritCtx)   parts.push(spiritCtx)
  if (libraryCtx)  parts.push(libraryCtx)
  if (ministryCtx) parts.push(ministryCtx)

  return parts.join('\n\n').slice(0, maxChars)
}
