import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

// Load .env if present
const envPath = resolve(process.cwd(), '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i === -1) continue
    const k = t.slice(0, i).trim()
    const v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (!process.env[k]) process.env[k] = v
  }
}

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uurfiasxtcvdpkfosofn.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_KEY) { console.error('ERROR: SUPABASE_SERVICE_KEY not set'); process.exit(1) }
if (!ANTHROPIC_KEY) { console.error('ERROR: ANTHROPIC_API_KEY not set'); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })

const DELAY_MS = 500

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

function basicClean(title) {
  return title
    .replace(/_arsenal(\.pdf|\.docx)?$/gi, '')
    .replace(/\.(pdf|docx|doc|txt)$/gi, '')
    .replace(/^Sermon\s*[-–—]\s*SERMON\s*[-–—]\s*/gi, '')
    .replace(/^Sermon\s*[-–—]\s*/gi, '')
    .replace(/^SERMON\s*[-–—]\s*/gi, '')
    .replace(/^sermon\s*[-–—]\s*/gi, '')
    .replace(/_cleaned$/gi, '')
    .replace(/_/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function needsAiClean(title) {
  const lower = title.toLowerCase()
  return (
    lower.includes('sermon') ||
    lower.includes('_arsenal') ||
    lower.includes('_cleaned') ||
    lower.includes('clejp') ||
    lower.includes('jpaynesp') ||
    lower.includes('rev ') ||
    /\b(copy|draft|final|v\d)\b/i.test(title) ||
    title !== title.trim() ||
    /[_]{2,}/.test(title) ||
    /[A-Z]{4,}/.test(title) ||
    title.length > 80
  )
}

async function aiCleanTitle(rawTitle, description) {
  const prompt = `You are cleaning up sermon and ministry resource titles for a Christian deliverance ministry platform called War Room Intel.

Raw title: "${rawTitle}"
Description: "${description || 'Not available'}"

Clean up this title by:
1. Removing prefixes like "Sermon -", "SERMON -", "sermon-", "Sermon - SERMON -"
2. Removing suffixes like "_arsenal", "_cleaned", ".pdf", ".docx", "copy", "rev", "final"
3. Removing internal codes like "CLEJP", "JPAYNESP", "CLE", "M2", "SP4", "Rev" (revision marker)
4. Fixing capitalization — Title Case for proper titles
5. Removing duplicate words
6. Making it sound like a proper sermon or teaching title
7. If the title is already clean and professional, return it as-is

Return ONLY the cleaned title — no quotes, no explanation, no punctuation at the end unless it's a question mark that belongs there.`

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 100,
    messages: [{ role: 'user', content: prompt }],
  })

  return response.content[0].type === 'text'
    ? response.content[0].text.trim().replace(/^["']|["']$/g, '')
    : rawTitle
}

async function main() {
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║   ARSENAL TITLE CLEANUP — WAR ROOM INTEL  ║')
  console.log('╚══════════════════════════════════════════╝\n')

  const { data: items, error } = await supabase
    .from('resources')
    .select('id, title, description, topic, tier')
    .eq('source_type', 'arsenal')
    .order('created_at', { ascending: true })

  if (error) { console.error('Failed to fetch arsenal items:', error); process.exit(1) }

  console.log(`Found ${items.length} arsenal records\n`)

  let updated = 0, skipped = 0, errors = 0

  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const prefix = `[${String(i + 1).padStart(3, '0')}/${items.length}]`

    try {
      const basicCleaned = basicClean(item.title)

      let finalTitle = basicCleaned
      if (needsAiClean(item.title) || needsAiClean(basicCleaned)) {
        finalTitle = await aiCleanTitle(basicCleaned, item.description)
        await sleep(DELAY_MS)
      }

      if (finalTitle === item.title) {
        console.log(`${prefix} SKIP  ${item.title}`)
        skipped++
        continue
      }

      const { error: updateError } = await supabase
        .from('resources')
        .update({ title: finalTitle })
        .eq('id', item.id)

      if (updateError) {
        console.error(`${prefix} ERR   ${item.title}\n         ${updateError.message}`)
        errors++
        continue
      }

      console.log(`${prefix} OK    "${item.title}"`)
      console.log(`         → "${finalTitle}"`)
      updated++

    } catch (err) {
      console.error(`${prefix} ERR   ${item.title} — ${err.message}`)
      errors++
    }
  }

  console.log('\n══════════════════════════════════════════')
  console.log(`  Updated: ${updated}`)
  console.log(`  Skipped: ${skipped} (already clean)`)
  console.log(`  Errors:  ${errors}`)
  console.log(`  Total:   ${items.length}`)
  console.log('══════════════════════════════════════════\n')
}

main().catch(err => { console.error('Fatal:', err); process.exit(1) })
