import 'dotenv/config'
import { createClerkClient } from '@clerk/backend'
import { createClient } from '@supabase/supabase-js'

async function main() {
  // ── Supabase client ───────────────────────────────────────────────────────────
  // Prefer the single SUPABASE JSON blob the rest of the app uses; fall back to
  // split SUPABASE_URL / SUPABASE_SERVICE_KEY vars.
  const creds = (() => {
    try {
      const j = JSON.parse(process.env.SUPABASE || '{}')
      if (j.url && j.serviceRoleKey) return { url: j.url as string, key: j.serviceRoleKey as string }
    } catch {}
    if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
      return { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_KEY }
    }
    return null
  })()
  if (!creds) {
    console.error('Supabase creds missing — set SUPABASE (JSON blob) or SUPABASE_URL / SUPABASE_SERVICE_KEY')
    process.exit(1)
  }
  const sb = createClient(creds.url, creds.key)

  // ── Clerk backend client ─────────────────────────────────────────────────────
  if (!process.env.CLERK_SECRET_KEY) {
    console.error('CLERK_SECRET_KEY env missing')
    process.exit(1)
  }
  const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY })

  // ── Page through all Clerk users ─────────────────────────────────────────────
  const allUsers: any[] = []
  const pageSize = 100
  let offset = 0

  console.log('Fetching Clerk users...')
  while (true) {
    const page = await clerk.users.getUserList({ limit: pageSize, offset })
    const users = page.data ?? page  // SDK v1 returns { data, totalCount } or just the array
    if (!Array.isArray(users) || users.length === 0) break
    allUsers.push(...users)
    console.log(`  Fetched ${allUsers.length} users so far...`)
    if (users.length < pageSize) break
    offset += pageSize
  }

  console.log(`\nTotal users to sync: ${allUsers.length}`)

  // ── Build rows — camelCase SDK fields → snake_case columns ───────────────────
  const now = new Date().toISOString()
  const rows = allUsers.map((u: any) => ({
    clerk_id:     u.id,
    display_name: `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
                  || u.username
                  || u.primaryEmailAddress?.emailAddress
                  || 'Warrior',
    username:     u.username ?? null,
    email:        u.primaryEmailAddress?.emailAddress ?? null,
    image_url:    u.imageUrl || '',
    tier:         (u.publicMetadata?.tier as string) || 'watchman',
    role:         (u.publicMetadata?.role as string) || 'user',
    created_at:   new Date(u.createdAt).toISOString(),
    updated_at:   now,
  }))

  // ── Upsert in batches of 50 ───────────────────────────────────────────────────
  const BATCH = 50
  let synced = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const batchIds = batch.map((r: any) => r.clerk_id)

    const { error } = await sb
      .from('members')
      .upsert(batch, { onConflict: 'clerk_id' })

    if (error) {
      console.error(`  [batch ${i / BATCH + 1}] ERROR: ${error.message}`)
      console.error(`    clerk_ids: ${batchIds.join(', ')}`)
      errors += batch.length
    } else {
      console.log(`  [batch ${i / BATCH + 1}] Upserted ${batch.length} rows OK`)
      synced += batch.length
    }
  }

  console.log(`\nBackfill complete: ${synced} synced, ${errors} errors.`)
}

main().then(() => process.exit(0)).catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
