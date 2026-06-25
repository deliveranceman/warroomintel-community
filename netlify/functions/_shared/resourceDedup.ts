import type { SupabaseClient } from '@supabase/supabase-js'

export interface DuplicateFound {
  duplicate: true
  existingId: string
  existingTitle: string
  matchedOn: 'hash' | 'filename' | 'name+size'
}

export type DedupResult = DuplicateFound | { duplicate: false }

// Strip a leading `<13-digit-timestamp>-` prefix that admin-library-url adds.
function stripTimestampPrefix(name: string): string {
  return name.replace(/^\d{13}-/, '')
}

function normFilename(name: string): string {
  return stripTimestampPrefix(name).toLowerCase().trim()
}

function stemOf(name: string): string {
  return normFilename(name).replace(/\.[^.]+$/, '')
}

/**
 * Check whether a resource matching the given characteristics already exists
 * within the given scope (ministry-library rows, or arsenal rows, etc.).
 *
 * Match order — first hit wins:
 *   a) file_hash equality  (strongest — catches renamed re-uploads)
 *   b) normalized filename equality
 *   c) same filename stem + identical file_size
 *
 * One DB round-trip: fetches up to 2000 candidate rows and compares in code.
 * Intended to run BEFORE heavy work (file download, extraction, insert).
 */
export async function findDuplicateResource(
  client: SupabaseClient,
  opts: {
    filename: string
    fileHash?: string | null
    fileSize?: number | null
    scopeColumn: string   // e.g. 'topic' or 'source_type'
    scopeValue: string    // e.g. 'ministry-library' or 'arsenal'
  }
): Promise<DedupResult> {
  const { filename, fileHash, fileSize, scopeColumn, scopeValue } = opts

  const { data: rows, error } = await client
    .from('resources')
    .select('id, title, filename, file_path, file_hash, file_size')
    .eq(scopeColumn, scopeValue)
    .limit(2000)

  if (error || !rows || rows.length === 0) return { duplicate: false }

  const normIncoming = normFilename(filename)
  const stemIncoming = stemOf(filename)

  // Pass a) — hash
  if (fileHash) {
    for (const row of rows) {
      if (row.file_hash && row.file_hash === fileHash) {
        return { duplicate: true, existingId: row.id as string, existingTitle: row.title as string, matchedOn: 'hash' }
      }
    }
  }

  // Pass b) — normalized filename
  for (const row of rows) {
    const rowFile = (row.filename as string | null) || ((row.file_path as string | null) || '').split('/').pop() || ''
    if (normFilename(rowFile) === normIncoming) {
      return { duplicate: true, existingId: row.id as string, existingTitle: row.title as string, matchedOn: 'filename' }
    }
  }

  // Pass c) — stem + file_size
  if (fileSize != null) {
    for (const row of rows) {
      const rowFile = (row.filename as string | null) || ((row.file_path as string | null) || '').split('/').pop() || ''
      if (stemOf(rowFile) === stemIncoming && row.file_size === fileSize) {
        return { duplicate: true, existingId: row.id as string, existingTitle: row.title as string, matchedOn: 'name+size' }
      }
    }
  }

  return { duplicate: false }
}
