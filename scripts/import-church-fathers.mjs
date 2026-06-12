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
// --only=<manifest id> processes a single entry and fetches its FULL text from
// the source URL (CCEL etc.) into extracted_text. Without it, behavior is the
// original all-entries blurb import, byte-for-byte unchanged.
const ONLY_ID      = (process.argv.find(a => a.startsWith('--only=')) || '').split('=')[1] || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required')
  process.exit(1)
}

const sb = createClient(SUPABASE_URL, SUPABASE_KEY)

// Lightweight HTML -> clean text. No heavy deps: drop script/style/comments,
// strip tags, decode the handful of entities CCEL emits, collapse whitespace.
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|h[1-6]|li|br|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&mdash;/gi, '—')
    .replace(/&ndash;/gi, '–')
    .replace(/&hellip;/gi, '…')
    .replace(/&rsquo;/gi, '’')
    .replace(/&lsquo;/gi, '‘')
    .replace(/&ldquo;/gi, '“')
    .replace(/&rdquo;/gi, '”')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .trim()
}

async function fetchFullText(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (warroomintel church-fathers importer)' },
    signal: AbortSignal.timeout(30000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`)
  const html = await res.text()
  return { rawChars: html.length, text: stripHtml(html) }
}

const manifest = JSON.parse(
  readFileSync(path.join(__dirname, 'church-fathers-manifest.json'), 'utf-8')
)

const entries = ONLY_ID ? manifest.filter(e => e.id === ONLY_ID) : manifest
if (ONLY_ID && entries.length === 0) {
  console.error(`No manifest entry with id="${ONLY_ID}"`)
  process.exit(1)
}

console.log(`\nChurch Fathers Import — ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}${ONLY_ID ? ` (--only=${ONLY_ID}, FULL TEXT)` : ''}\n`)
if (DRY_RUN) console.log('[DRY RUN — no writes]\n')

let inserted = 0
let skipped  = 0
let failed   = 0

for (const entry of entries) {
  const sourceUrl = entry.ccel_url || entry.archive_url || entry.gutenberg_url || ''
  const notesParts = [
    `Year: c. ${entry.year_approx}`,
    `Priority: ${entry.priority}`,
    `Topics: ${entry.topic_tags.join(', ')}`,
    sourceUrl ? `Source: ${sourceUrl}` : null,
    entry.archive_url  ? `Archive.org: ${entry.archive_url}` : null,
    entry.gutenberg_url ? `Gutenberg: ${entry.gutenberg_url}` : null,
  ].filter(Boolean)

  // Check ministry_sources safety classification for this author
  const authorName = entry.author || ''
  if (authorName) {
    const { data: source } = await sb
      .from('ministry_sources')
      .select('status,warnings')
      .ilike('name', authorName)
      .maybeSingle()

    if (source?.status === 'dangerous') {
      console.log(`  SKIP  ${entry.author} — ${entry.title} (author flagged as DANGEROUS)`)
      skipped++
      continue
    }
    if (source?.status === 'monitor') {
      console.log(`  NOTE  ${entry.author} — ${entry.title} (author flagged MONITOR: ${source.warnings || 'see admin panel'})`)
      // still import but log the warning
    }
  }

  // --only mode: fetch the FULL text from the source URL. Without it, the body
  // stays the manifest blurb (original behavior).
  let bodyText = entry.description
  let fetchedChars = 0
  if (ONLY_ID) {
    const src = entry.ccel_url || entry.archive_url || entry.gutenberg_url || ''
    if (!src) {
      console.error(`  FAIL  ${entry.title}: no source URL in manifest — cannot fetch full text`)
      process.exit(1)
    }
    console.log(`  FETCH ${src}`)
    let fetched
    try {
      fetched = await fetchFullText(src)
    } catch (e) {
      console.error(`  FAIL  ${entry.title}: ${e.message} — not storing`)
      process.exit(1)
    }
    fetchedChars = fetched.rawChars
    if (fetched.text.length < 1000) {
      console.error(`  FAIL  ${entry.title}: stripped body only ${fetched.text.length} chars from ${src} — looks like an error/landing page, NOT storing.`)
      process.exit(1)
    }
    bodyText = fetched.text
    console.log(`  TEXT  ${fetched.rawChars} chars HTML -> ${fetched.text.length} chars clean`)
  }

  // Check for existing entry by title + author
  const { data: existing } = await sb
    .from('resources')
    .select('id,title')
    .eq('topic', 'ministry-library')
    .ilike('title', entry.title)
    .maybeSingle()

  if (existing) {
    if (!ONLY_ID) {
      console.log(`  SKIP  ${entry.title} (already exists as "${existing.title}")`)
      skipped++
      continue
    }
    // --only is idempotent: overwrite the existing row's body with full text.
    if (DRY_RUN) {
      console.log(`  DRY   would UPDATE ${entry.title} [${existing.id}] -> extracted_text ${bodyText.length} chars`)
      inserted++
      continue
    }
    const { error: upErr } = await sb
      .from('resources')
      .update({ extracted_text: bodyText, file_size: bodyText.length, summary_status: 'pending' })
      .eq('id', existing.id)
    if (upErr) {
      console.error(`  FAIL  update ${entry.title}: ${upErr.message}`)
      failed++
      continue
    }
    console.log(`  OK    (updated) ${entry.title} [${existing.id}] — extracted_text now ${bodyText.length} chars (fetched ${fetchedChars} HTML)`)
    inserted++
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
    extracted_text:                 bodyText,
    notes:                          notesParts.join('\n'),
    spirit_tags:                    [],
    ai_generated:                   false,
    source_public_domain_confirmed: entry.public_domain === true,
    summary_status:                 'pending',
    filename:                       `${entry.id}.txt`,
    file_path:                      `church-fathers/${entry.id}.txt`,
    file_size:                      bodyText.length,
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
