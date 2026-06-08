import { requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

const SB_HEADERS = {
  apikey:        serviceRoleKey as string,
  Authorization: `Bearer ${serviceRoleKey as string}`,
  'Content-Type': 'application/json',
}
const sb = (path: string) => `${supabaseUrl}/rest/v1${path}`

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

// ── Content extraction ────────────────────────────────────────────────────────

const MAX_TEXT = 50_000

async function extractFromBuffer(buffer: Buffer, mimeType: string, fileName: string): Promise<{
  text: string | null; base64: string | null; isImage: boolean; contentType: string
}> {
  const ext = fileName.split('.').pop()?.toLowerCase() || ''

  // Images → base64 for vision
  if (mimeType.startsWith('image/') || ['jpg','jpeg','png','webp','gif'].includes(ext)) {
    return { text: null, base64: buffer.toString('base64'), isImage: true, contentType: mimeType || 'image/jpeg' }
  }

  // PDF
  if (mimeType === 'application/pdf' || ext === 'pdf') {
    try {
      const pdfParse = (await import('pdf-parse')).default
      const data = await pdfParse(buffer)
      return { text: (data.text || '').slice(0, MAX_TEXT), base64: null, isImage: false, contentType: 'pdf' }
    } catch (e: any) {
      console.error('[sol-research] PDF extraction failed:', e.message)
      return { text: null, base64: null, isImage: false, contentType: 'pdf' }
    }
  }

  // TXT / MD / plain text
  const text = new TextDecoder('utf-8').decode(buffer).replace(/\0/g, ' ').slice(0, MAX_TEXT)
  return { text: text || null, base64: null, isImage: false, contentType: 'text' }
}

async function extractFromUrl(url: string): Promise<{ text: string; contentType: string }> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'WRI-Research/1.0' },
    signal: AbortSignal.timeout(10_000),
  })
  const html = await res.text()
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_TEXT)
  return { text, contentType: 'url' }
}

// ── Anthropic call ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are SOL, War Room Intel's AI intelligence officer for spiritual warfare ministry. You have deep knowledge of deliverance ministry, demonic spirits, their manifestations, legal grounds, and biblical responses. You are analyzing content submitted by Pastor Justin Payne for ministry research purposes. Be thorough, specific, and ministerially useful. Structure your response clearly with headers and bullet points where appropriate.`

const DEFAULT_QUESTION = `Extract all demonic spirits mentioned or implied in this content. For each spirit found, provide: name, how it manifests, what legal ground it uses, and any scripture references. Format as a structured list.`

async function callClaude(params: {
  text?: string | null
  base64?: string | null
  mimeType?: string
  question: string
}): Promise<{ answer: string; tokensUsed: number }> {
  const question = params.question?.trim() || DEFAULT_QUESTION

  let userContent: any
  if (params.base64 && params.mimeType) {
    userContent = [
      {
        type: 'image',
        source: { type: 'base64', media_type: params.mimeType as any, data: params.base64 },
      },
      {
        type: 'text',
        text: `RESEARCH QUESTION:\n${question}\n\nPlease provide a thorough, structured response.`,
      },
    ]
  } else {
    userContent = `CONTENT TO ANALYZE:\n---\n${params.text || ''}\n---\n\nRESEARCH QUESTION:\n${question}\n\nPlease provide a thorough, structured response.`
  }

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    }),
    signal: AbortSignal.timeout(25_000),
  })

  if (!res.ok) throw new Error(`Anthropic API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  const answer = data.content?.[0]?.text || ''
  const tokensUsed = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)
  return { answer, tokensUsed }
}

// ── Log ───────────────────────────────────────────────────────────────────────

async function logResearch(params: {
  userId: string; question: string; contentType: string; contentPreview: string; answer: string; tokensUsed: number
}) {
  try {
    await fetch(`${sb('/sol_research_log')}`, {
      method: 'POST',
      headers: { ...SB_HEADERS, Prefer: 'return=minimal' },
      body: JSON.stringify({
        user_id:         params.userId,
        question:        params.question,
        content_type:    params.contentType,
        content_preview: params.contentPreview.slice(0, 200),
        answer:          params.answer,
        tokens_used:     params.tokensUsed,
      }),
    })
  } catch (e) {
    console.error('[sol-research] Log insert failed:', e)
  }
}

// ── Handler ───────────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  // ── GET: recent log ───────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const res = await fetch(
      `${sb('/sol_research_log')}?user_id=eq.${encodeURIComponent(auth.userId)}&order=created_at.desc&limit=10&select=id,question,content_type,content_preview,answer,tokens_used,created_at`,
      { headers: SB_HEADERS },
    )
    if (!res.ok) return json({ error: 'Database error' }, 500)
    return json({ log: await res.json() })
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const contentTypeHeader = req.headers.get('content-type') || ''

  let extracted: { text: string | null; base64: string | null; isImage: boolean; contentType: string } | null = null
  let question = ''
  let contentPreview = ''

  try {
    // ── Multipart (file upload) ─────────────────────────────────────────────
    if (contentTypeHeader.includes('multipart/form-data')) {
      const formData = await req.formData()
      const file = formData.get('file')
      question = String(formData.get('question') || '').trim()

      if (!file || typeof file === 'string') return json({ error: 'file field required' }, 400)
      const f = file as File
      if (f.size > 20 * 1024 * 1024) return json({ error: 'Max file size is 20MB' }, 400)

      const arrayBuffer = await f.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      extracted = await extractFromBuffer(buffer, f.type, f.name)
      contentPreview = extracted.isImage ? `[image: ${f.name}]` : (extracted.text?.slice(0, 200) || '[no text extracted]')

    // ── JSON (url or text) ──────────────────────────────────────────────────
    } else {
      const body = await req.json().catch(() => ({}))
      question = String(body.question || '').trim()

      if (body.url) {
        const { text, contentType } = await extractFromUrl(String(body.url))
        extracted = { text, base64: null, isImage: false, contentType }
        contentPreview = text.slice(0, 200)
      } else if (body.text) {
        const t = String(body.text).slice(0, MAX_TEXT)
        extracted = { text: t, base64: null, isImage: false, contentType: 'text' }
        contentPreview = t.slice(0, 200)
      } else {
        return json({ error: 'Provide a file, url, or text field' }, 400)
      }
    }
  } catch (e: any) {
    return json({ error: `Content processing failed: ${e.message}` }, 400)
  }

  if (!extracted) return json({ error: 'No content extracted' }, 400)
  if (!extracted.isImage && !extracted.text?.trim()) {
    return json({ error: 'Could not extract readable text from this content' }, 422)
  }

  try {
    const { answer, tokensUsed } = await callClaude({
      text:     extracted.text,
      base64:   extracted.base64,
      mimeType: extracted.isImage ? extracted.contentType : undefined,
      question,
    })

    // Log fire-and-forget
    logResearch({
      userId:         auth.userId,
      question:       question || DEFAULT_QUESTION,
      contentType:    extracted.contentType,
      contentPreview,
      answer,
      tokensUsed,
    }).catch(() => {})

    return json({ answer, tokensUsed, contentType: extracted.contentType })
  } catch (e: any) {
    console.error('[sol-research] Claude call failed:', e.message)
    return json({ error: e.message || 'Analysis failed' }, 500)
  }
}

export const config = { path: '/api/sol-research' }
