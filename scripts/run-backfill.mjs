// scripts/run-backfill.mjs — extract text from all ministry-library books with null extracted_text
// Usage: node scripts/run-backfill.mjs
// Requires: SUPABASE_URL, SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env or environment

import dotenv from 'dotenv'
dotenv.config()

import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const { createClient } = await import('@supabase/supabase-js')
const pdfParse = require('pdf-parse')

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
const BUCKET = 'ministry-library'
const MAX_CHARS = 120_000

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY / SUPABASE_SERVICE_KEY')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

async function extractText(buffer, fileType) {
  if (fileType === 'txt') {
    return buffer.toString('utf-8').replace(/\0/g, ' ').slice(0, MAX_CHARS) || null
  }
  if (fileType === 'pdf') {
    try {
      const result = await pdfParse(buffer)
      const raw = result.text || ''
      return raw.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, MAX_CHARS) || null
    } catch (e) {
      console.error(`  pdf-parse error: ${e.message}`)
      return null
    }
  }
  return null
}

console.log('🔍 Querying resources with null extracted_text...')
const { data: rows, error: fetchErr } = await sb
  .from('resources')
  .select('id, title, file_path, file_type, filename')
  .eq('topic', 'ministry-library')
  .is('extracted_text', null)

if (fetchErr) { console.error('❌ Query failed:', fetchErr.message); process.exit(1) }
console.log(`Found ${rows.length} books to process\n`)

let succeeded = 0, failed = 0

for (const row of rows) {
  const filePath = row.file_path
  const resolvedType = row.file_type || (filePath?.toLowerCase().endsWith('.pdf') ? 'pdf' : 'txt')
  console.log(`📖 ${row.title} (${resolvedType}) — ${filePath}`)

  try {
    const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(filePath)
    if (dlErr || !blob) {
      console.error(`  ❌ Download failed: ${dlErr?.message || 'no data'}`)
      failed++; continue
    }

    const buffer = Buffer.from(await blob.arrayBuffer())
    const text = await extractText(buffer, resolvedType)

    if (!text) {
      console.log(`  ⚠️  No text extracted`)
      failed++; continue
    }

    const { error: updateErr } = await sb
      .from('resources')
      .update({ extracted_text: text, ai_generated: true })
      .eq('id', row.id)

    if (updateErr) {
      console.error(`  ❌ Update failed: ${updateErr.message}`)
      failed++
    } else {
      console.log(`  ✅ ${text.length.toLocaleString()} chars stored`)
      succeeded++
    }
  } catch (e) {
    console.error(`  ❌ Exception: ${e.message}`)
    failed++
  }
}

console.log(`\n✅ Done: ${succeeded} succeeded, ${failed} failed out of ${rows.length} total`)

// Verify final state
const { data: verify } = await sb
  .from('resources')
  .select('title, extracted_text')
  .eq('topic', 'ministry-library')

console.log('\nFinal state:')
for (const r of verify || []) {
  const chars = r.extracted_text ? r.extracted_text.length : 0
  console.log(`  ${chars > 0 ? '✅' : '❌'} ${r.title} — ${chars.toLocaleString()} chars`)
}
