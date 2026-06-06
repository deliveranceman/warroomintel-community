/**
 * Import church-fathers-manifest.json into Supabase resources table
 * as pending ministry-library entries ready for admin approval.
 *
 * Usage:
 *   SUPABASE_URL=... SUPABASE_SERVICE_KEY=... \
 *   SITE_URL=https://warroomintel.com ADMIN_TOKEN=<clerk-jwt> \
 *   node scripts/import-church-fathers.mjs
 *
 * Required env vars:
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 * Optional:
 *   SITE_URL + ADMIN_TOKEN — triggers background AI summary for each book
 *   DRY_RUN=true           — prints what would be inserted, no writes
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync }  from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const SITE_URL    = (process.env.SITE_URL || '').replace(/\/$/, '')
const ADMIN_TOKEN  = process.env.ADMIN_TOKEN || ''
const DRY_RUN      = process.env.DRY_RUN === 'true'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

const manifest = JSON.parse(
  readFileSync(path.join(__dirname, 'church-fathers-manifest.json'), 'utf-8')
)

console.log(`\nChurch Fathers Import — ${manifest.length} entries\n`)
if (DRY_RUN) console.log('[DRY RUN — no writes]\n')

let inserted = 0
let skipped  = 0
let failed   = 0

for (const entry of manifest) {
  const sourceUrl = entry.ccel_url || entry.archive_url || entry.gutenberg_url || ''
  const notesParts = [
    `Year: c. ${entry.year_approx}`,
    `Priority: ${entry.priority}`,
    `Topics: ${entry.topic_tags.join(', ')}`,
    sourceUrl ? `Source: ${sourceUrl}` : null,
    entry.archive_url  ? `Archive.org: ${entry.archive_url}` : null,
    entry.gutenberg_url ? `Gutenberg: ${entry.gutenberg_url}` : null,
  ].filter(Boolean)

  // Check for existing entry by title + author
  const { data: existing } = await sb
    .from('resources')
    .select('id,title')
    .eq('topic', 'ministry-library')
    .ilike('title', entry.title)
    .maybeSingle()

  if (existing) {
    console.log(`  SKIP  ${entry.title} (already exists as "${existing.title}")`)
    skipped++
    continue
  }

  const record = {
    title:                          entry.title,
    author:                         entry.author,
    topic:                          'ministry-library',
    status:                         'pending',
    active:                         false,
    source_type:                    'christian',
    description:                    entry.description,
    extracted_text:                 entry.description,
    notes:                          notesParts.join('\n'),
    spirit_tags:                    [],
    ai_generated:                   false,
    source_public_domain_confirmed: entry.public_domain === true,
    summary_status:                 'pending',
    filename:                       `${entry.id}.txt`,
    file_path:                      `church-fathers/${entry.id}.txt`,
    file_size:                      entry.description.length,
    file_type:                      'text/plain',
  }

  if (DRY_RUN) {
    console.log(`  DRY   ${entry.author} — ${entry.title}`)
    inserted++
    continue
  }

  const { data: insertedRow, error: insertErr } = await sb
    .from('resources')
    .insert(record)
    .select('id,title')
    .single()

  if (insertErr) {
    console.error(`  FAIL  ${entry.title}: ${insertErr.message}`)
    failed++
    continue
  }

  console.log(`  OK    ${entry.author} — ${entry.title} [${insertedRow.id}]`)
  inserted++

  // Trigger AI summary in background if SITE_URL + ADMIN_TOKEN provided
  if (SITE_URL && ADMIN_TOKEN && insertedRow?.id) {
    try {
      const summaryRes = await fetch(`${SITE_URL}/api/library-summarize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ADMIN_TOKEN}`,
        },
        body: JSON.stringify({ resourceId: insertedRow.id }),
        signal: AbortSignal.timeout(30000),
      })
      if (!summaryRes.ok) {
        const txt = await summaryRes.text().catch(() => String(summaryRes.status))
        console.log(`        SUMMARY QUEUED (will retry in admin): ${entry.id} — ${txt}`)
        // summary_status stays 'pending' — visible in admin panel with retry button
      } else {
        const d = await summaryRes.json().catch(() => ({}))
        console.log(`        SUMMARY OK: ${d.spiritsFound || 0} new spirits, ${d.duplicatesSkipped || 0} dupes`)
      }
    } catch (e) {
      console.log(`        SUMMARY FAILED: ${entry.id} — ${e.message}`)
      // summary_status='failed' was written by the function on error
      // visible in admin panel with retry button
    }
    // Brief delay between calls to avoid rate limits
    await new Promise(r => setTimeout(r, 1500))
  }
}

console.log(`\nDone: ${inserted} inserted, ${skipped} skipped, ${failed} failed\n`)
if (!ADMIN_TOKEN) {
  console.log('Tip: set SITE_URL + ADMIN_TOKEN to auto-trigger AI summaries.')
  console.log('     Otherwise, use the Admin Panel > Ministry Library > Awaiting Review to generate them.\n')
}
