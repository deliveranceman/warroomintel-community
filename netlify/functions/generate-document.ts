import { createClient } from '@supabase/supabase-js'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
}

async function resolveUser(token: string): Promise<{ ok: boolean; isMinister: boolean }> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return { ok: false, isMinister: false }
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    const userId = payload.sub
    if (!userId) return { ok: false, isMinister: false }
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
    })
    if (!res.ok) return { ok: false, isMinister: false }
    const data = await res.json()
    const isMinister = data?.public_metadata?.role === 'minister'
    return { ok: true, isMinister }
  } catch { return { ok: false, isMinister: false } }
}

function parseDocumentJson(raw: string): any {
  let text = raw.trim()
  text = text.replace(/^```json\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  text = text.replace(/^```\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  try { return JSON.parse(text) } catch {}
  const firstBrace = text.indexOf('{')
  const lastBrace  = text.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    try { return JSON.parse(text.slice(firstBrace, lastBrace + 1)) } catch {}
  }
  return null
}

function logUsage(token: string, baseUrl: string, callType: string, inputTokens: number, outputTokens: number) {
  fetch(`${baseUrl}/api/ai-usage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ call_type: callType, input_tokens: inputTokens, output_tokens: outputTokens, model: 'claude-sonnet-4-20250514' }),
  }).catch(() => {})
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })
  const { ok } = await resolveUser(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers })

  let body: any
  try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers }) }

  const { templateId, templateName, sections, subject, spiritData, specialInstructions } = body
  if (!templateId || !subject?.trim()) {
    return new Response(JSON.stringify({ error: 'templateId and subject required' }), { status: 400, headers })
  }

  try {
    // Fetch active global + session contexts
    const client = sb()
    const { data: contexts } = await client
      .from('ministry_context')
      .select('label, context_text, scope')
      .eq('is_active', true)
      .in('scope', ['global', 'session'])
      .order('scope')

    const contextText = (contexts || [])
      .map(c => `[${c.label || c.scope}]:\n${c.context_text}`)
      .join('\n\n---\n\n')

    const systemPrompt = [
      contextText ? `MINISTRY CONTEXT:\n${contextText}\n\nApply this ministry voice to the document.` : '',
      `You are generating a professional ministry document for Pastor Justin Payne of Staffordtown Church (Church on Fire), Copperhill, Tennessee.`,
      `CRITICAL: Return ONLY valid JSON. No markdown. No explanation. Start with { end with }.`,
    ].filter(Boolean).join('\n\n')

    const sectionList = (sections || [])
      .map((s: any) => `  "${s.id}" (${s.label}): ${s.instruction}`)
      .join('\n')

    const spiritBlock = spiritData
      ? `\nSpirit database data:\n${JSON.stringify(spiritData, null, 2)}`
      : ''

    const userPrompt = `Generate a "${templateName}" document for: ${subject.trim()}
${spiritBlock}
${specialInstructions ? `\nSpecial instructions: ${specialInstructions}` : ''}

Template sections to generate:
${sectionList}

Return JSON in this exact structure:
{
  "title": "document title",
  "subtitle": "document subtitle or date",
  "sections": [
    { "id": "section-id", "label": "Section Label", "content": "Full section content, well-written and ministry-appropriate." }
  ]
}

Write each section with pastoral authority, biblical grounding, and practical ministry application. Format for print.`

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 25000)

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
      signal: controller.signal,
    })
    clearTimeout(timeoutId)

    if (!anthropicRes.ok) {
      const err = await anthropicRes.text()
      throw new Error(`Anthropic error ${anthropicRes.status}: ${err}`)
    }

    const data = await anthropicRes.json()
    const rawText = data.content?.[0]?.text || ''
    const inputTokens  = data.usage?.input_tokens || 0
    const outputTokens = data.usage?.output_tokens || 0

    // Log usage — fire and forget
    const url = new URL(req.url)
    const baseUrl = `${url.protocol}//${url.host}`
    logUsage(token, baseUrl, 'document', inputTokens, outputTokens)

    const document = parseDocumentJson(rawText)
    if (!document) throw new Error('Failed to parse document JSON from AI response')

    return new Response(JSON.stringify({ success: true, document }), { status: 200, headers })
  } catch (e: any) {
    if (e.name === 'AbortError') {
      return new Response(JSON.stringify({ error: 'Document generation timed out — try again' }), { status: 504, headers })
    }
    return new Response(JSON.stringify({ error: e.message || 'Generation failed' }), { status: 500, headers })
  }
}

export const config = { path: '/api/generate-document' }
