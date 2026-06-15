import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS as HEADERS } from './_shared/access'
import { mimeFromFilename } from '../../src/lib/mimeFromFilename'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
const BUCKET = 'ministry-library'

function sb() { return createClient(sbUrl!, sbKey!) }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...HEADERS, 'Content-Type': 'application/json' } })
}

interface UploadBody {
  title?:          string
  author?:         string | null
  sourceType?:     string | null
  filename?:       string
  fileSize?:       number
  fileHash?:       string
  extractedText?:  string
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS })
  if (req.method !== 'POST')    return json({ error: 'POST only' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let body: UploadBody
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const title         = (body.title || '').trim()
  const author        = (body.author || '').toString().trim() || null
  const sourceType    = (body.sourceType || '').toString().trim() || null
  const filename      = (body.filename || '').trim() || 'upload.txt'
  const fileSize      = typeof body.fileSize === 'number' ? body.fileSize : null
  const fileHash      = (body.fileHash || '').toString().trim()
  const extractedText = (body.extractedText || '').toString()

  if (!title)                return json({ error: 'title is required' }, 400)
  if (!fileHash)             return json({ error: 'fileHash is required' }, 400)
  if (!extractedText.trim()) return json({ error: 'extractedText is required — extract text client-side before uploading' }, 400)

  if (extractedText.length > 5_000_000) {
    return json({
      error: 'extractedText too large (>5 MB). Split the source into sections, or wait for the direct-Storage upload path.',
    }, 413)
  }

  const client = sb()

  // ── Hash dedup check ────────────────────────────────────────────────────
  const { data: existing } = await client
    .from('resources')
    .select('id, title, created_at, summary_status')
    .eq('file_hash', fileHash)
    .maybeSingle()

  if (existing) {
    return json({
      duplicate:     true,
      resourceId:    existing.id,
      existingTitle: existing.title,
      createdAt:     existing.created_at,
      summaryStatus: existing.summary_status,
    }, 409)
  }

  // ── Storage upload: write extractedText as a .txt ───────────────────────
  const stem     = filename.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_')
  const safeName = `research-drop/${Date.now()}-${stem}.txt`
  const fileType = 'text/plain; charset=utf-8'
  const textBuf  = Buffer.from(extractedText, 'utf-8')
  const charCount = extractedText.length

  // mimeFromFilename kept for the original filename metadata; not used for the
  // Storage upload (we always write .txt extraction).
  void mimeFromFilename(filename)

  console.log(`[research-drop-upload] Uploading: ${filename} (${charCount} chars) → ${safeName}`)

  const { error: uploadErr } = await client.storage.from(BUCKET).upload(safeName, textBuf, {
    contentType: fileType,
    upsert:      false,
  })
  if (uploadErr) {
    console.error('[research-drop-upload] Storage upload error:', uploadErr.message)
    return json({ error: `Storage upload failed: ${uploadErr.message}` }, 500)
  }

  // ── Resources insert ────────────────────────────────────────────────────
  const { data: resource, error: insertErr } = await client
    .from('resources')
    .insert({
      title,
      author,
      file_path:         safeName,
      filename:          filename,
      file_size:         fileSize ?? textBuf.length,
      file_type:         fileType,
      extracted_text:    extractedText,
      extraction_method: 'client',
      file_hash:         fileHash,
      topic:             'research-drop',
      source_type:       sourceType || 'research-drop',
      category:          'Reference',
      tier:              'Free',
      active:            false,
      ai_generated:      false,
      spirit_tags:       [],
      summary_status:    'pending',
      user_id:           auth.userId,
    })
    .select('id')
    .single()

  if (insertErr || !resource) {
    await client.storage.from(BUCKET).remove([safeName])
    console.error('[research-drop-upload] DB insert error:', insertErr?.message)
    return json({ error: `DB insert failed: ${insertErr?.message}` }, 500)
  }

  const resourceId = resource.id as string

  // ── AI job insert ───────────────────────────────────────────────────────
  const { data: job, error: jobErr } = await client
    .from('ai_jobs')
    .insert({
      job_type:     'research_drop_spirits',
      status:       'queued',
      progress:     0,
      stage:        'queued',
      user_id:      auth.userId,
      tier:         auth.tier,
      resource_id:  resourceId,
      input_params: { resourceId, sourceType: sourceType || null },
    })
    .select('id')
    .single()

  if (jobErr || !job) {
    console.error('[research-drop-upload] Job insert error:', jobErr?.message)
    return json({ error: 'Failed to create analysis job' }, 500)
  }

  const jobId = job.id as string

  await client.from('resources').update({ research_job_id: jobId }).eq('id', resourceId)

  console.log(`[research-drop-upload] Created resource ${resourceId} + job ${jobId} for "${title}"`)
  return json({ resourceId, jobId, status: 'queued' }, 202)
}

export const config = { path: '/api/research-drop-upload' }
