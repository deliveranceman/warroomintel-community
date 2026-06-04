import type { Config } from '@netlify/functions'

const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')

const SB = (p: string) => `${supabaseUrl}/rest/v1${p}`
const sbH: Record<string, string> = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function sbFetch(path: string, method = 'GET', body?: unknown) {
  const res = await fetch(SB(path), {
    method,
    headers: sbH,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  let data: unknown
  try { data = await res.json() } catch { data = [] }
  return { status: res.status, data }
}

export default async function handler() {
  const today = new Date().toISOString().slice(0, 10)
  console.log('[scheduled-atmosphere] Running snapshot for', today)

  const { data: rows } = await sbFetch(
    `/atmosphere_checkins?date=eq.${today}&is_public=eq.true&select=category,status`,
  )
  const arr: any[] = Array.isArray(rows) ? rows : []

  const tally: Record<string, number> = { green: 0, amber: 0, purple: 0 }
  const statusCounts: Record<string, number> = {}
  for (const r of arr) {
    tally[r.category] = (tally[r.category] || 0) + 1
    statusCounts[r.status] = (statusCounts[r.status] || 0) + 1
  }

  const topStatuses = Object.entries(statusCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([s, c]) => ({ status: s, count: c }))

  const dominantCat = Object.entries(tally).sort(([, a], [, b]) => b - a)[0]?.[0] || null
  const dominantStatus = topStatuses[0]?.status || null

  const row = {
    date: today,
    total_checkins: arr.length,
    green_count: tally.green,
    amber_count: tally.amber,
    purple_count: tally.purple,
    dominant_status: dominantStatus,
    dominant_category: dominantCat,
    top_statuses: topStatuses,
    snapshot_at: new Date().toISOString(),
  }

  const { status: s } = await sbFetch('/atmosphere_snapshots', 'POST', row)
  if (s >= 400) {
    await sbFetch(`/atmosphere_snapshots?date=eq.${today}`, 'PATCH', row)
  }

  console.log('[scheduled-atmosphere] Snapshot saved:', JSON.stringify(row))
}

export const config: Config = {
  schedule: '0 5 * * *',
}
