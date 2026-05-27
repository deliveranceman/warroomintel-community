/**
 * library-backfill — extract and store text for all ministry-library resources
 * that currently have extracted_text = null. Call once after deploying the fix.
 *
 * POST /api/library-backfill   (minister auth required)
 */

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
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
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
    return data?.public_metadata?.role === 'minister'
  } catch { return false }
}

async function extractText(buffer: Buffer, fileType: string): Promise<string | null> {
  if (fileType === 'txt') {
    const text = buffer.toString('utf-8').replace(/\0/g, ' ').slice(0, MAX_CHARS)
    return text || null
  }
  if (fileType === 'pdf') {
    try {
      const result = await pdfParse(buffer)
      const raw = result.text || ''
      return raw
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, MAX_CHARS) || null
    } catch (e: any) {
      console.error('[library-backfill] pdf-parse error:', e?.message)
      return null
    }
  }
  return null
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: CORS })

  const token = req.headers.get('Authorization')?.replace('Bearer ', '').trim()
  if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: CORS })
  const ok = await isMinister(token)
  if (!ok) return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: CORS })

  const client = sb()

  const { data: resources, error: fetchErr } = await client
    .from('resources')
    .select('id, title, file_path, file_type, filename')
    .eq('topic', 'ministry-library')
    .is('extracted_text', null)

  if (fetchErr) {
    return new Response(JSON.stringify({ error: fetchErr.message }), { status: 500, headers: CORS })
  }

  const rows = resources || []
  console.log(`[library-backfill] Found ${rows.length} resources with null extracted_text`)

  const results: Array<{ id: string; title: string; status: string; chars?: number }> = []

  for (const row of rows) {
    const filePath = row.file_path
    const resolvedType = row.file_type || (filePath?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt')

    console.log(`[library-backfill] Processing: ${row.title} (${resolvedType}) — ${filePath}`)

    try {
      const { data: blob, error: dlErr } = await client.storage.from(BUCKET).download(filePath)
      if (dlErr || !blob) {
        console.error(`[library-backfill] Download failed for ${row.id}:`, dlErr?.message)
        results.push({ id: row.id, title: row.title, status: `download_failed: ${dlErr?.message}` })
        continue
      }

      const buffer = Buffer.from(await blob.arrayBuffer())
      const extractedText = await extractText(buffer, resolvedType)

      if (!extractedText) {
        console.log(`[library-backfill] No text extracted for ${row.id}`)
        results.push({ id: row.id, title: row.title, status: 'no_text_extracted' })
        continue
      }

      const { error: updateErr } = await client
        .from('resources')
        .update({ extracted_text: extractedText, ai_generated: true })
        .eq('id', row.id)

      if (updateErr) {
        console.error(`[library-backfill] Update failed for ${row.id}:`, updateErr.message)
        results.push({ id: row.id, title: row.title, status: `update_failed: ${updateErr.message}` })
      } else {
        console.log(`[library-backfill] Stored ${extractedText.length} chars for ${row.id}`)
        results.push({ id: row.id, title: row.title, status: 'ok', chars: extractedText.length })
      }
    } catch (e: any) {
      console.error(`[library-backfill] Exception for ${row.id}:`, e?.message)
      results.push({ id: row.id, title: row.title, status: `error: ${e?.message}` })
    }
  }

  const succeeded = results.filter(r => r.status === 'ok').length
  console.log(`[library-backfill] Complete: ${succeeded}/${rows.length} extracted`)

  return new Response(
    JSON.stringify({ processed: rows.length, succeeded, results }),
    { status: 200, headers: CORS },
  )
}

export const config = { path: '/api/library-backfill' }
