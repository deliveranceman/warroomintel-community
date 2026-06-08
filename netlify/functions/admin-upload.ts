import { createClient } from '@supabase/supabase-js'
import { requireAdmin2 } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey, bucket: supabaseBucket } = JSON.parse(process.env.SUPABASE || '{}')

const SUPABASE_URL  = supabaseUrl!
const SUPABASE_KEY  = supabaseServiceKey!
const BUCKET        = supabaseBucket || 'resources'

const ALLOWED_TYPES: Record<string, { maxBytes: number }> = {
  'application/pdf':                                                             { maxBytes: 25 * 1024 * 1024 },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':    { maxBytes: 25 * 1024 * 1024 },
  'audio/mpeg':                                                                  { maxBytes: 50 * 1024 * 1024 },
  'image/png':                                                                   { maxBytes:  5 * 1024 * 1024 },
  'image/jpeg':                                                                  { maxBytes:  5 * 1024 * 1024 },
}

// Supabase resources table DDL — run once in Supabase SQL editor:
// CREATE TABLE IF NOT EXISTS resources (
//   id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
//   title text NOT NULL,
//   description text,
//   tier text NOT NULL,
//   category text NOT NULL,
//   file_path text NOT NULL,
//   file_type text NOT NULL,
//   file_size integer NOT NULL,
//   created_at timestamptz DEFAULT now()
// );

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const headers = { 'Content-Type': 'application/json' }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid form data' }), { status: 400 })
  }

  const file        = formData.get('file') as File | null
  const title       = (formData.get('title') as string || '').trim()
  const description = (formData.get('description') as string || '').trim()
  const tier        = (formData.get('tier') as string) || 'Free'
  const topic       = (formData.get('topic') as string) || (formData.get('category') as string) || 'General Ministry'
  const tagsRaw         = formData.get('tags') as string
  const tags            = tagsRaw ? JSON.parse(tagsRaw) : []
  const spiritTagsRaw   = formData.get('spirit_tags') as string
  const spirit_tags     = spiritTagsRaw ? JSON.parse(spiritTagsRaw) : []
  const contentTierRaw  = formData.get('content_tier') as string
  const content_tier    = contentTierRaw ? Number(contentTierRaw) : null
  const access_tier     = (formData.get('access_tier') as string) || 'watchman'
  const draft           = formData.get('draft') === 'true'
  const aiAnalyze       = formData.get('aiAnalyze') === 'true'

  if (aiAnalyze) {
    if (!file) {
      return new Response(JSON.stringify({ error: 'file is required for analysis' }), { status: 400, headers })
    }

    const fileName = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ')
    const fileBuffer = await file.arrayBuffer()
    const fileText = new TextDecoder('utf-8', { fatal: false })
      .decode(fileBuffer.slice(0, 8000))

    const prompt = `You are analyzing a deliverance ministry document for the War Room Intel platform.

Filename: ${file.name}
Content preview (first portion):
${fileText.slice(0, 3000)}

Based on the filename and content, provide metadata in JSON format only. No other text.

Return exactly this structure:
{
  "title": "Clean readable title (remove underscores, file extensions, WRI_R01 prefixes etc)",
  "description": "2-3 sentence description of what this document is and how ministers would use it",
  "topic": "one of: Soul Ties, Generational Curses, Forgiveness, Ungodly Vows, Freemasonry & Secret Societies, Sexual Bondage, Fear & Rejection, Identity & Sonship, Inner Healing, Witchcraft & Occult, Marine Kingdom, Mind Control, Leviathan & Pride, Jezebel & Control, Python & Constriction, Deliverance Foundations, Aftercare, Prayer & Intercession, Scripture Reference, General Ministry",
  "tier": "one of: free, soldier, commander, general",
  "tags": ["pick 1-4 from: Renunciation Prayer, Worksheet, Teaching, Protocol, Session Tool, Scripture Reference, Aftercare, Assessment Tool, Quick Reference, Leader Guide, Self-Deliverance, Group Exercise"]
}

For tier: free = basic/intro content, soldier = intermediate ministry tools, commander = advanced protocols, general = leadership/comprehensive guides.
Respond with valid JSON only.`

    try {
      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 500,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (aiRes.ok) {
        const aiData = await aiRes.json()
        const text = aiData.content?.[0]?.text || ''
        const clean = text.replace(/```json|```/g, '').trim()
        const parsed = JSON.parse(clean)
        return new Response(JSON.stringify(parsed), {
          status: 200,
          headers: { ...headers, 'Content-Type': 'application/json' },
        })
      }
    } catch(e) {
      // Fall through to filename-based metadata
    }

    const cleanTitle = fileName
      .replace(/^WRI[_\s]R?\d+[_\s]/i, '')
      .replace(/\b\w/g, c => c.toUpperCase())
      .trim()

    return new Response(JSON.stringify({
      title: cleanTitle,
      description: '',
      topic: 'General Ministry',
      tier: 'free',
      tags: [],
    }), { status: 200, headers })
  }

  if (!file || !title) {
    return new Response(JSON.stringify({ error: 'file and title are required' }), { status: 400 })
  }

  // Validate type
  const allowed = ALLOWED_TYPES[file.type]
  if (!allowed) {
    return new Response(JSON.stringify({ error: `File type ${file.type} not allowed` }), { status: 400 })
  }

  // Validate size
  if (file.size > allowed.maxBytes) {
    return new Response(JSON.stringify({ error: `File too large (max ${allowed.maxBytes / 1024 / 1024}MB for this type)` }), { status: 400 })
  }

  const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY)

  // Duplicate filename check
  const { data: existingFiles } = await supabase
    .from('resources')
    .select('id, title, filename')
    .ilike('file_path', `%${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}%`)
    .neq('topic', 'ministry-library')
    .limit(1)
  if (existingFiles && existingFiles.length > 0) {
    return new Response(JSON.stringify({
      error: 'duplicate',
      message: 'A file with this filename already exists',
      existingId: existingFiles[0].id,
      existingTitle: existingFiles[0].title,
    }), { status: 409, headers: { 'Content-Type': 'application/json' } })
  }

  const safeName  = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
  const filePath  = `${tier.toLowerCase()}/${safeName}`

  // Upload to Supabase Storage
  const buffer = await file.arrayBuffer()
  const { error: uploadErr } = await supabase.storage
    .from(BUCKET)
    .upload(filePath, buffer, { contentType: file.type, upsert: false })

  if (uploadErr) {
    return new Response(JSON.stringify({ error: `Storage upload failed: ${uploadErr.message}` }), { status: 500 })
  }

  // Insert metadata row
  const { data: row, error: insertErr } = await supabase
    .from('resources')
    .insert({
      title,
      description: description || null,
      tier,
      topic,
      tags:         tags.length > 0 ? tags : [],
      spirit_tags:  spirit_tags.length > 0 ? spirit_tags : [],
      content_tier: content_tier || null,
      access_tier:  access_tier,
      draft:        draft,
      file_path:    filePath,
      file_type:    file.type,
      file_size:    file.size,
      // ⚠️ ARSENAL marker — arsenal-resources.ts filters on source_type to separate Arsenal from Ministry Library
      source_type: 'arsenal',
    })
    .select()
    .single()

  if (insertErr) {
    // Attempt to clean up the uploaded file
    await supabase.storage.from(BUCKET).remove([filePath])
    return new Response(JSON.stringify({ error: `DB insert failed: ${insertErr.message}` }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true, resource: row }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config = { path: '/api/admin-upload' }
