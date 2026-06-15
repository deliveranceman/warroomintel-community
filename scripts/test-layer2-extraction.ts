#!/usr/bin/env node
/**
 * Local CLI for iterating the Layer 2 extraction prompt.
 * Usage:
 *   tsx scripts/test-layer2-extraction.ts <library_chunk_id> <spirit_name>
 *   tsx scripts/test-layer2-extraction.ts --source-file ./sources/my-doc.txt --spirit "Marduk"
 *
 * Reads ANTHROPIC_API_KEY and SUPABASE from .env (JSON blob format).
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { extractSpiritFromSource } from '../netlify/functions/_shared/extractSpiritFromSource'
import * as fs from 'fs'
import * as path from 'path'

const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

async function main() {
  const args = process.argv.slice(2)
  const sourceFileIdx = args.indexOf('--source-file')
  const spiritIdx     = args.indexOf('--spirit')

  let sourceText: string
  let sourceMetadata: {
    title: string
    author: string
    year: string | number
    sourceType: 'academic' | 'occult' | 'ministry' | 'historical' | 'canonical'
    isAdversarial: boolean
  }
  let targetSpiritName: string

  if (sourceFileIdx >= 0 && spiritIdx >= 0) {
    const sourceFile = args[sourceFileIdx + 1]
    targetSpiritName = args[spiritIdx + 1]
    sourceText = fs.readFileSync(sourceFile, 'utf-8')
    sourceMetadata = {
      title:       path.basename(sourceFile),
      author:      'unknown',
      year:        'unknown',
      sourceType:  'academic',
      isAdversarial: false,
    }
  } else if (args.length >= 2) {
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('SUPABASE env var not set — cannot pull library chunk')
      process.exit(1)
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const { data, error } = await supabase
      .from('library_chunks')
      .select('chunk_text, book_id, book_title')
      .eq('id', args[0])
      .maybeSingle()
    if (error || !data) {
      console.error(`Chunk ${args[0]} not found:`, error?.message || 'no data')
      process.exit(1)
    }
    sourceText        = data.chunk_text
    targetSpiritName  = args[1]
    sourceMetadata = {
      title:         data.book_title || 'unknown',
      author:        'unknown',
      year:          'unknown',
      sourceType:    'academic',
      isAdversarial: false,
    }
  } else {
    console.error('Usage:')
    console.error('  tsx scripts/test-layer2-extraction.ts <chunk-id> <spirit-name>')
    console.error('  tsx scripts/test-layer2-extraction.ts --source-file <path> --spirit <name>')
    process.exit(1)
  }

  console.log('\n⚔  Layer 2 Extraction Test')
  console.log(`Target: ${targetSpiritName}`)
  console.log(`Source: ${sourceMetadata.title}`)
  console.log(`Source text length: ${sourceText.length} chars\n`)
  console.log('Calling Sonnet 4.5...')

  const result = await extractSpiritFromSource({
    targetSpiritName,
    sourceMetadata,
    sourceText,
  })

  console.log('\n=== EXTRACTION OUTPUT ===\n')
  console.log(JSON.stringify(result.output, null, 2))
  console.log('\n=== META ===\n')
  console.log(`Model:         ${result.meta.model}`)
  console.log(`Input tokens:  ${result.meta.inputTokens}`)
  console.log(`Output tokens: ${result.meta.outputTokens}`)
  console.log(`Cost:          $${result.meta.costUsd.toFixed(4)}`)
  console.log(`Duration:      ${(result.meta.durationMs / 1000).toFixed(1)}s`)
  console.log(`Completeness:  ${result.output._meta.extraction_completeness}`)
  console.log(`Blanks:        ${result.output._meta.fields_left_blank_count}`)
  if (result.output._meta.notes_for_reviewer) {
    console.log(`Reviewer note: ${result.output._meta.notes_for_reviewer}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
