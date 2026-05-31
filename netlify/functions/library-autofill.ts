import { createClient } from '@supabase/supabase-js'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

const AIRTABLE_BASE  = 'appVXEj2DLPBTJTtD'
const AIRTABLE_TABLE = 'tblcP4lgVykzOhLi4'
const PRIMARY_FIELD  = '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE'

function getUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub || null
  } catch { return null }
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

// ─── REGEX EXTRACTION ─────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'god', 'jesus', 'christ', 'lord', 'holy spirit', 'father',
  'blood', 'bible', 'scripture', 'name', 'amen', 'deliverance',
  'prayer', 'people', 'family', 'church', 'children', 'things',
  'power', 'truth', 'grace', 'faith', 'love', 'peace', 'joy',
  'heaven', 'earth', 'man', 'men', 'woman', 'women', 'person',
  'him', 'her', 'them', 'they', 'you', 'we', 'us', 'me', 'i',
  'this', 'that', 'these', 'those', 'what', 'which', 'who',
  'all', 'any', 'every', 'some', 'none', 'the', 'a', 'an',
  'holy', 'spirit', 'spirits', 'demon', 'demons', 'evil',
  'sin', 'sins', 'curse', 'curses', 'bond', 'bondage',
  'satan', 'devil', 'enemy', 'darkness', 'light',
  'pastor', 'minister', 'leader', 'group', 'meeting',
  'body', 'soul', 'mind', 'heart', 'flesh', 'blood',
])

const CONTEXT_WORDS = ['come out', 'rebuke', 'renounce', 'bind', 'loose', 'cast out', 'command', 'leave', 'go now', 'depart']

function regexExtractCandidates(text: string, minScore = 4): Map<string, { score: number; canonical: string }> {
  const scores    = new Map<string, number>()
  const canonical = new Map<string, string>()
  const textLower = text.toLowerCase()

  // Detect "Proper Names of Demons" section — entries here get a confidence boost
  const properNamesIdx  = text.indexOf('Proper Names of Demons')
  const inProperSection = (pos: number) => properNamesIdx >= 0 && pos > properNamesIdx

  function addCandidate(rawName: string, baseScore: number, matchPos: number) {
    let name = rawName.trim()
      .replace(/^the\s+/i, '')
      .replace(/[.!?:]+$/, '')
      .replace(/\s+/g, ' ')
      .trim()
    if (name.length < 3 || name.length > 50) return
    if (!/^[A-Z]/.test(name)) return
    name = name.replace(/\b\w/g, c => c.toUpperCase())
    const nl = name.toLowerCase()
    if (STOPWORDS.has(nl) || nl.split(' ').every(w => STOPWORDS.has(w))) return
    if (!canonical.has(nl)) canonical.set(nl, name)
    let score = (scores.get(nl) || 0) + baseScore
    const win = textLower.slice(Math.max(0, matchPos - 100), Math.min(textLower.length, matchPos + 150))
    if (CONTEXT_WORDS.some(w => win.includes(w))) score += 2
    if (inProperSection(matchPos)) score += 4
    scores.set(nl, score)
  }

  // ── Proper name dictionary: DEMONNAME: description  or  NAME1, NAME2--description
  const dictPatterns: RegExp[] = [
    /^([A-Z]{3,}(?:,\s*[A-Z]{3,})*)\s*(?:--|:)\s*[a-z]/gm,
    /^([A-Z][A-Z\s,]{3,40})--[a-z]/gm,
  ]
  for (const p of dictPatterns) {
    let m
    while ((m = p.exec(text)) !== null) {
      for (const part of m[1].split(/,\s*/)) {
        const clean = part.trim()
        if (clean.length >= 3 && !/^\d+$/.test(clean)) addCandidate(clean, 6, m.index)
      }
    }
  }

  // ── Command context: "cast out / bind / rebuke" + Name
  const cmdPat = /(?:cast out|bind|rebuke|command)\s+(?:the\s+)?([A-Z][a-zA-Z]{2,30})/g
  let cm
  while ((cm = cmdPat.exec(text)) !== null) addCandidate(cm[1], 3, cm.index)

  // ── Spirit-of / demon-of patterns
  const spiritPatterns = [
    { re: /\ball\s+spirits\s+of\s+([A-Za-z][A-Za-z' \-,\/&]{2,120})/gi, base: 4 },
    { re: /\bspirits?\s+of\s+([A-Za-z][A-Za-z' \-]{2,60})/gi,           base: 5 },
    { re: /\bdemons?\s+of\s+([A-Za-z][A-Za-z' \-]{2,60})/gi,            base: 3 },
    { re: /\bspirit\s+([A-Z][a-zA-Z]{2,30})\b/g,                         base: 3 },
  ]
  for (const { re, base } of spiritPatterns) {
    let m
    while ((m = re.exec(text)) !== null) {
      for (const part of m[1].split(/[,;\/]|\s+and\s+|\s+or\s+|&/)) addCandidate(part, base, m.index)
    }
  }

  // ── Frequency bonus
  for (const [nl, score] of scores.entries()) {
    const occ = (textLower.match(new RegExp(nl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length
    if (occ >= 3)      scores.set(nl, score + 3)
    else if (occ >= 2) scores.set(nl, score + 1)
  }

  const result = new Map<string, { score: number; canonical: string }>()
  for (const [nl, score] of scores.entries()) {
    if (score >= minScore) result.set(nl, { score, canonical: canonical.get(nl) || nl })
  }
  return result
}

async function validateWithClaude(candidates: string[], apiKey: string): Promise<string[]> {
  const BATCH_SIZE = 40
  const confirmed: string[] = []
  for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
    const batch = candidates.slice(i, i + BATCH_SIZE)
    const prompt = `You are validating a list of candidate spirit/demon names extracted from a deliverance ministry document.

CANDIDATES TO VALIDATE:
${batch.map((n, idx) => `${idx + 1}. ${n}`).join('\n')}

For each candidate, determine if it is a legitimate demonic spirit, demon name, or spiritual entity used in deliverance ministry context.

Return ONLY this JSON (no markdown, start with {):
{
  "confirmed": ["Spirit1", "Spirit2"],
  "rejected": ["NotASpirit1"]
}`
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      const raw  = data.content[0].text
      const cleaned = raw.replace(/^```json\s*/im, '').replace(/^```\s*/im, '').replace(/```\s*$/im, '').trim()
      const m = cleaned.match(/\{[\s\S]*\}/)
      const result = JSON.parse(m ? m[0] : cleaned)
      confirmed.push(...(result.confirmed || []))
    } catch (e) {
      console.error('[AUTOFILL] Batch validation failed:', e)
      confirmed.push(...batch)
    }
  }
  return confirmed
}

async function extractSpiritsFromText(
  fullText: string,
  existingDemonNames: string[],
  apiKey: string,
): Promise<{ spiritTags: string[]; candidateCount: number; confirmedCount: number; extractionMethod: string; sourceCharCount: number }> {
  // Try direct AI extraction first — works even for short title/notes snippets
  const directTags = await directExtractSpirits(fullText, apiKey)
  if (directTags.length > 0) {
    return { spiritTags: directTags, candidateCount: directTags.length, confirmedCount: directTags.length, extractionMethod: 'direct-ai', sourceCharCount: fullText.length }
  }

  const scoredMap  = regexExtractCandidates(fullText)
  const candidates = Array.from(scoredMap.entries())
    .sort((a, b) => b[1].score - a[1].score)
    .map(([_, v]) => v.canonical)

  console.log(`[AUTOFILL] ${candidates.length} candidates from ${fullText.length} chars`)
  if (candidates.length) console.log('[AUTOFILL] Top 20:', candidates.slice(0, 20))

  const existingLower   = new Set(existingDemonNames.map(n => n.toLowerCase()))
  const unknownCandidates = candidates.filter(name => {
    const nl = name.toLowerCase()
    if (existingLower.has(nl)) return false
    for (const ex of existingLower) {
      if (ex.includes(nl) || nl.includes(ex)) return false
    }
    return true
  })
  const knownFound = candidates.filter(name => existingLower.has(name.toLowerCase()))
  console.log(`[AUTOFILL] ${unknownCandidates.length} unknown after DB filter`)

  if (unknownCandidates.length === 0) {
    return { spiritTags: candidates.slice(0, 30), candidateCount: candidates.length, confirmedCount: 0, extractionMethod: 'regex+db-filter', sourceCharCount: fullText.length }
  }

  const confirmedUnknown = await validateWithClaude(unknownCandidates, apiKey)
  const finalSpirits     = [...new Set([...knownFound, ...confirmedUnknown])].slice(0, 60)
  return { spiritTags: finalSpirits, candidateCount: candidates.length, confirmedCount: confirmedUnknown.length, extractionMethod: 'regex+ai-validation', sourceCharCount: fullText.length }
}

// ─── DIRECT AI SPIRIT EXTRACTION ─────────────────────────────────────────────

async function directExtractSpirits(text: string, apiKey: string): Promise<string[]> {
  const prompt = `Extract ONLY specific named demonic spirits from this text.
Return a JSON array of spirit names as strings.
Rules:
- Only named spirits (Jezebel, Leviathan, Python, Baal, etc.)
- Never return categories like 'Demons', 'Evil spirits', 'Territorial spirits'
- Never return concepts like 'Spiritual warfare', 'Deliverance'
- If no specific named spirits are mentioned, return []
- Maximum 8 spirits
Return ONLY the JSON array, nothing else. Example: ["Jezebel","Leviathan"]

Text:
${text.slice(0, 6000)}`

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await res.json()
    const rawText = data.content?.[0]?.text?.trim() || ''
    console.log('[autofill] raw AI text:', rawText)
    let spirit_tags: string[] = []
    try {
      const cleaned = rawText.replace(/```json|```/g, '').trim()
      const parsed = JSON.parse(cleaned)
      if (Array.isArray(parsed)) {
        spirit_tags = parsed
          .filter((s: any) => typeof s === 'string' && s.length > 0)
          .slice(0, 8)
      }
    } catch {
      spirit_tags = []
    }
    console.log('[autofill] parsed spirit_tags:', spirit_tags)
    return spirit_tags
  } catch (e) {
    console.error('[autofill] directExtractSpirits failed:', e)
    return []
  }
}

// ─── SPIRIT SECTION EXTRACTOR (context for Claude title call) ─────────────────

function extractSpiritSections(text: string): string {
  const lines    = text.split('\n')
  const keywords = ['spirit of', 'spirits of', 'demon', 'deliverance', 'come out', 'rebuke', 'renounce', 'bind', 'loose']
  const included = new Set<number>()
  lines.forEach((line, i) => {
    if (keywords.some(k => line.toLowerCase().includes(k))) {
      for (let j = Math.max(0, i - 1); j <= Math.min(lines.length - 1, i + 2); j++) included.add(j)
    }
  })
  return Array.from(included).sort((a, b) => a - b).map(i => lines[i]).join('\n')
}

// ─── AIRTABLE FETCH ───────────────────────────────────────────────────────────

async function fetchExistingDemonNames(): Promise<string[]> {
  const airtableToken = process.env.AIRTABLE_TOKEN
  if (!airtableToken) {
    console.warn('[AUTOFILL] AIRTABLE_TOKEN not set — skipping demon DB filter')
    return []
  }
  const names: string[] = []
  let offset: string | undefined
  try {
    do {
      const url = new URL(`https://api.airtable.com/v0/${AIRTABLE_BASE}/${AIRTABLE_TABLE}`)
      url.searchParams.set('pageSize', '200')
      url.searchParams.set('fields[]', PRIMARY_FIELD)
      if (offset) url.searchParams.set('offset', offset)
      const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${airtableToken}` } })
      if (!res.ok) { console.error('[AUTOFILL] Airtable error:', res.status); break }
      const data = await res.json()
      for (const r of data.records || []) {
        const name = r.fields?.[PRIMARY_FIELD] || r.fields?.Name
        if (name && name !== 'Primary Name') names.push(name)
      }
      offset = data.offset
    } while (offset)
  } catch (e) {
    console.error('[AUTOFILL] Airtable fetch failed:', e)
  }
  console.log(`[AUTOFILL] Loaded ${names.length} existing demon names from Airtable`)
  return names
}

// ─── HANDLER ──────────────────────────────────────────────────────────────────

export default async function handler(req: Request) {
  console.log('[library-autofill] called:', req.method)
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })

  const authHeader = req.headers.get('authorization')
  const userId     = getUserId(authHeader)
  console.log('[library-autofill] userId:', userId, 'hasAuth:', !!authHeader)
  if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized — valid Clerk JWT required' }), { status: 401, headers: CORS })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    console.error('[library-autofill] ANTHROPIC_API_KEY is not set')
    return new Response(JSON.stringify({ error: 'Server configuration error: ANTHROPIC_API_KEY is missing' }), { status: 500, headers: CORS })
  }

  const body = await req.json().catch(() => ({}))
  const { filename, contentSnippet, resourceId } = body as {
    filename?: string
    contentSnippet?: string
    resourceId?: string
  }
  if (!filename) return new Response(JSON.stringify({ error: 'filename required' }), { status: 400, headers: CORS })

  const fullText = contentSnippet?.trim() || ''

  // ── Step 1: Run extraction pipeline for spirit tags ──────────────────────────
  const t0 = Date.now()
  const existingNames = await fetchExistingDemonNames()
  console.log(`[AUTOFILL] Airtable fetch took ${Date.now() - t0}ms`)

  const extractionResult = fullText.length > 50
    ? await extractSpiritsFromText(fullText, existingNames, apiKey)
    : { spiritTags: [] as string[], candidateCount: 0, confirmedCount: 0, extractionMethod: 'skipped-no-text', sourceCharCount: 0 }

  console.log(`[AUTOFILL] Extraction: ${extractionResult.spiritTags.length} tags via ${extractionResult.extractionMethod}`)

  // ── Step 2: Claude call for title / author / notes ───────────────────────────
  const spiritContext  = fullText ? extractSpiritSections(fullText).slice(0, 1500) : ''
  const contextBlock   = spiritContext
    ? `\n\nSpirit-related excerpts:\n"""\n${spiritContext}\n"""`
    : (fullText ? `\n\nFile content (first ~1000 chars):\n"""\n${fullText.slice(0, 1000)}\n"""` : '')

  const metaPrompt = `Based on this filename${contextBlock ? ' and content excerpt' : ''}, identify the book and return metadata. Return ONLY valid JSON — no markdown, no explanation, no code fences.

Filename: "${filename}"${contextBlock}

Return this exact JSON shape:
{
  "title": "full book title in proper title case, no file extension",
  "author": "author full name, or null if uncertain",
  "notes": "1-2 sentences describing the book's relevance to deliverance ministry or spiritual warfare, or null if unrecognised",
  "topic": "ministry-library"
}

Rules:
- Clean underscores/hyphens in filename to produce a readable title
- Use proper title case; remove file extension from title
- topic is always "ministry-library"`

  let title: string | null  = null
  let author: string | null = null
  let notes: string | null  = null
  let topic = 'ministry-library'

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 400, messages: [{ role: 'user', content: metaPrompt }] }),
    })
    if (anthropicRes.ok) {
      const data = await anthropicRes.json()
      const raw  = data.content?.[0]?.text?.trim() || ''
      console.log('[library-autofill] meta response:', raw)
      const cleaned = raw.replace(/^```[\w]*\s*/i, '').replace(/\s*```\s*$/i, '').trim()
      const parsed  = JSON.parse(cleaned)
      title  = parsed.title  || null
      author = parsed.author || null
      notes  = parsed.notes  || null
      topic  = parsed.topic  || 'ministry-library'
    }
  } catch (e) {
    console.error('[library-autofill] meta Claude call failed:', e)
  }

  // Fallback title from filename
  if (!title) {
    title = filename
      .replace(/\.(pdf|txt|docx?)$/i, '')
      .replace(/[_-]/g, ' ')
      .replace(/\b\w/g, (c: string) => c.toUpperCase())
  }

  // ── Step 3: Save extraction metadata to Supabase if resourceId provided ──────
  if (resourceId && extractionResult.extractionMethod !== 'skipped-no-text') {
    try {
      await sb()
        .from('resources')
        .update({
          spirit_tags:       extractionResult.spiritTags,
          extraction_method: extractionResult.extractionMethod,
          candidate_count:   extractionResult.candidateCount,
          source_char_count: extractionResult.sourceCharCount,
          indexed_at:        new Date().toISOString(),
        })
        .eq('id', resourceId)
    } catch (e) {
      console.error('[AUTOFILL] Supabase metadata save failed:', e)
    }
  }

  const spirit_tags = extractionResult.spiritTags.length > 0
    ? extractionResult.spiritTags
    : []  // extraction returned nothing; caller can use their own fallback

  console.log('[library-autofill] final — title:', title, 'spirit_tags:', spirit_tags)
  return new Response(JSON.stringify({
    title, author, notes, topic, spirit_tags,
    _meta: {
      candidateCount: extractionResult.candidateCount,
      confirmedCount: extractionResult.confirmedCount,
      extractionMethod: extractionResult.extractionMethod,
      sourceCharCount: extractionResult.sourceCharCount,
    },
  }), { status: 200, headers: CORS })
}

export const config = { path: '/api/library-autofill' }
