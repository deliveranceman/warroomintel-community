import { createClient } from '@supabase/supabase-js'
import Busboy from 'busboy'
import { requireAdmin2, CORS as HEADERS } from './_shared/access'
import { mimeFromFilename } from '../../src/lib/mimeFromFilename'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')
const BUCKET = 'ministry-library'

function sb() { return createClient(sbUrl!, sbKey!) }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...HEADERS, 'Content-Type': 'application/json' } })
}

function parseMultipart(bodyBuf: Buffer, contentType: string): Promise<{
  fields: Record<string, string>
  file?: { buffer: Buffer; filename: string }
}> {
  return new Promise((resolve, reject) => {
    const fields: Record<string, string> = {}
    let file: { buffer: Buffer; filename: string } | undefined
    const busboy = Busboy({ headers: { 'content-type': contentType } })
    busboy.on('field', (name, val) => { fields[name] = val })
    busboy.on('file', (_fieldname, stream, info) => {
      const chunks: Buffer[] = []
      stream.on('data', (c: Buffer) => chunks.push(c))
      stream.on('end', () => {
        file = { buffer: Buffer.concat(chunks), filename: info.filename || 'upload' }
      })
    })
    busboy.on('finish', () => resolve({ fields, file }))
    busboy.on('error', reject)
    busboy.write(bodyBuf)
    busboy.end()
  })
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: HEADERS })
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  const contentType = req.headers.get('content-type') || ''
  if (!contentType.includes('multipart/form-data')) {
    return json({ error: 'multipart/form-data required' }, 400)
  }

  const bodyBuf = Buffer.from(await req.arrayBuffer())
  let parsed: Awaited<ReturnType<typeof parseMultipart>>
  try {
    parsed = await parseMultipart(bodyBuf, contentType)
  } catch (e: any) {
    return json({ error: `Multipart parse failed: ${e?.message}` }, 400)
  }

  const { fields, file } = parsed
  const title        = (fields.title || '').trim()
  const author       = (fields.author || '').trim() || null
  const sourceType   = (fields.sourceType || '').trim() || null
  const extractedText = fields.extractedText || ''
  const fileHash     = (fields.fileHash || '').trim()

  if (!title)         return json({ error: 'title is required' }, 400)
  if (!file)          return json({ error: 'file is required' }, 400)
  if (!extractedText.trim()) return json({ error: 'extractedText is required — extract text client-side before uploading' }, 400)
  if (!fileHash)      return json({ error: 'fileHash is required' }, 400)

  const client = sb()

  // ── Hash dedup check ──────────────────────────────────────────────────────────
  const { data: existing } = await client
    .from('resources')
    .select('id, title, created_at, summary_status')
    .eq('file_hash', fileHash)
    .maybeSingle()

  if (existing) {
    return json({
      duplicate: true,
      resourceId: existing.id,
      existingTitle: existing.title,
      createdAt: existing.created_at,
      summaryStatus: existing.summary_status,
    }, 409)
  }

  const fileName   = file.filename
  const fileBuffer = file.buffer
  const fileSize   = fileBuffer.length
  const fileType   = mimeFromFilename(fileName)
  const safeName   = `research-drop/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`

  console.log(`[research-drop-upload] Uploading: ${fileName} (${fileSize} bytes)`)

  // ── Storage upload ────────────────────────────────────────────────────────────
  const { error: uploadErr } = await client.storage.from(BUCKET).upload(safeName, fileBuffer, {
    contentType: fileType,
    upsert: false,
  })
  if (uploadErr) {
    console.error('[research-drop-upload] Storage upload error:', uploadErr.message)
    return json({ error: `Storage upload failed: ${uploadErr.message}` }, 500)
  }

  // ── Resources insert ──────────────────────────────────────────────────────────
  const { data: resource, error: insertErr } = await client
    .from('resources')
    .insert({
      title,
      author,
      file_path:         safeName,
      filename:          fileName,
      file_size:         fileSize,
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

  // ── AI job insert ─────────────────────────────────────────────────────────────
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

  // Backfill research_job_id on the resource
  await client
    .from('resources')
    .update({ research_job_id: jobId })
    .eq('id', resourceId)

  // Do NOT await worker dispatch here — this function does ~20s of work before this
  // point (auth + multipart parse + storage upload + DB inserts), so adding even a
  // 5s await pushes the total past Netlify's function timeout, killing the response.
  // job-dispatch-cron runs every minute and picks up any queued job older than 20s.
  console.log(`[research-drop-upload] Created resource ${resourceId} + job ${jobId} for "${title}"`)
  return json({ resourceId, jobId, status: 'queued' }, 202)
}

export const config = { path: '/api/research-drop-upload' }
