import { createClient } from '@supabase/supabase-js'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const BUCKET = 'ministry-library'
const MAX_CHARS = 120_000

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
}

async function isMinister(token: string): Promise<boolean> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return false
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return false
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return false
    const data = await res.json()
    const role = data?.public_metadata?.role
    const tier = data?.public_metadata?.tier?.toLowerCase()
    return role === 'minister' || role === 'admin' || ['general', 'commander'].includes(tier)
  } catch { return false }
}

async function extractText(buffer: Buffer, fileType: string): Promise<string | null> {
  if (fileType === 'txt') {
    return buffer.toString('utf-8').replace(/\0/g, ' ').slice(0, MAX_CHARS) || null
  }
  if (fileType === 'pdf') {
    try {
      const result = await pdfParse(buffer)
      return (result.text || '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_CHARS) || null
    } catch (e: any) {
      console.error('[library-reanalyze] pdf-parse error:', e?.message)
      return null
    }
  }
  return null
}

const AI_PROMPT = (excerpt: string) => `You are analyzing a deliverance ministry document.

DOCUMENT TEXT (first 8000 chars):
${excerpt}

Your task:
1. Read the full text carefully
2. Identify EVERY demonic spirit, demon name, spiritual entity, or occult force mentioned or strongly implied
3. Include both explicit names (Leviathan, Baal, Jezebel) AND functional spirits (Pride, Rejection, Fear, Witchcraft, Divination)
4. Cross-reference against known demon taxonomy:
   Principalities: Satan, Leviathan, Baal, Jezebel, Python, Belial, Beelzebub, Apollyon, Abaddon, Mammon, Molech, Chemosh, Dagon, Ashtoreth, Baphomet
   Powers: Witchcraft, Divination, Freemasonry spirits, Marine spirits, Religious spirit, Spirit of Death, Infirmity
   Common spirits: Pride, Rejection, Fear, Shame, Lust, Perversion, Addiction, Confusion, Torment, Suicide, Rage, Control, Manipulation, Deception, Rebellion, Bitterness, Unforgiveness, Grief, Trauma
   Occult: Familiar spirits, Ancestral spirits, Incubus, Succubus, Voodoo spirits, Santeria, New Age spirits
5. Identify the document's PRIMARY ministry function
6. Identify the PRIMARY topic category

Return ONLY this JSON (no markdown, no code fences):
{
  "title": "clean professional document title",
  "description": "2-3 sentence summary written for a deliverance minister explaining what this document is and how to use it in ministry",
  "spirit_tags": ["Spirit1", "Spirit2"],
  "function_tags": ["Teaching"],
  "topic": "Deliverance Foundations"
}

function_tags must be from: Teaching, Protocol, Worksheet, Session Tool, Scripture Reference, Aftercare, Assessment Tool, Quick Reference, Leader Guide, Self-Deliverance, Group Exercise, Renunciation Prayer
topic must be from: Soul Ties, Generational Curses, Forgiveness, Ungodly Vows, Freemasonry & Secret Societies, Sexual Bondage, Fear, Deliverance Foundations, Witchcraft & Occult, Marine Kingdom, False Religion / Paganism, Death & Destruction, Deception / Lies, Inner Healing, Trauma & Abuse`

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: CORS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  const ok = await isMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Minister role required' }), { status: 403, headers: CORS })

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS }) }

  const { resourceId } = body || {}
  if (!resourceId) return new Response(JSON.stringify({ error: 'resourceId required' }), { status: 400, headers: CORS })

  const client = sb()

  const { data: resource, error: fetchErr } = await client
    .from('resources')
    .select('id, title, file_path, file_type, filename')
    .eq('id', resourceId)
    .single()

  if (fetchErr || !resource) {
    return new Response(JSON.stringify({ error: fetchErr?.message || 'Resource not found' }), { status: 404, headers: CORS })
  }

  const filePath = resource.file_path
  const fileType = resource.file_type || (filePath?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt')

  console.log(`[library-reanalyze] Processing: ${resource.title} (${fileType})`)

  const { data: blob, error: dlErr } = await client.storage.from(BUCKET).download(filePath)
  if (dlErr || !blob) {
    return new Response(JSON.stringify({ error: `Download failed: ${dlErr?.message}` }), { status: 500, headers: CORS })
  }

  const buffer = Buffer.from(await blob.arrayBuffer())
  const extractedText = await extractText(buffer, fileType)

  if (!extractedText) {
    return new Response(JSON.stringify({ error: 'Could not extract text from file' }), { status: 422, headers: CORS })
  }

  // Store extracted text first
  await client.from('resources').update({ extracted_text: extractedText, ai_generated: true }).eq('id', resourceId)

  // Run Claude analysis
  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1000,
      system: 'You are a deliverance ministry document analyst. Return ONLY valid JSON. No markdown, no code fences.',
      messages: [{ role: 'user', content: AI_PROMPT(extractedText.slice(0, 8000)) }],
    }),
    signal: AbortSignal.timeout(20000),
  })

  if (!aiRes.ok) {
    return new Response(JSON.stringify({ error: `Claude error ${aiRes.status}` }), { status: 502, headers: CORS })
  }

  const aiData = await aiRes.json()
  const raw = (aiData.content?.[0]?.text || '').trim()
    .replace(/^```[\w]*\n?/i, '').replace(/\n?```$/i, '').trim()

  let parsed: any
  try { parsed = JSON.parse(raw) } catch {
    const m = raw.match(/\{[\s\S]*\}/)
    if (m) { try { parsed = JSON.parse(m[0]) } catch {} }
  }
  if (!parsed) {
    return new Response(JSON.stringify({ error: 'Failed to parse AI response' }), { status: 502, headers: CORS })
  }

  const update: Record<string, any> = {}
  if (parsed.title) update.title = parsed.title
  if (parsed.description) update.description = parsed.description
  if (Array.isArray(parsed.spirit_tags)) update.spirit_tags = parsed.spirit_tags
  if (Array.isArray(parsed.function_tags)) update.function_tags = parsed.function_tags
  if (parsed.topic) update.topic = parsed.topic

  const { data: updated, error: updateErr } = await client
    .from('resources')
    .update(update)
    .eq('id', resourceId)
    .select()
    .single()

  if (updateErr) {
    return new Response(JSON.stringify({ error: updateErr.message }), { status: 500, headers: CORS })
  }

  console.log(`[library-reanalyze] Done: ${update.title || resource.title} — ${update.spirit_tags?.length ?? 0} spirits tagged`)
  return new Response(JSON.stringify({ success: true, resource: updated }), { status: 200, headers: CORS })
}

export const config = { path: '/api/library-reanalyze' }
