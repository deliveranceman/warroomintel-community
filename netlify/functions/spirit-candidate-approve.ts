import { createClient } from '@supabase/supabase-js'
import { requireAdmin, CORS } from './_shared/requireAdmin'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')  return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: CORS })

  const auth = await requireAdmin(req)
  if (auth instanceof Response) return auth

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
  }

  const { candidateId } = body || {}
  if (!candidateId) return new Response(JSON.stringify({ error: 'candidateId required' }), { status: 400, headers: CORS })

  const { data: candidate, error } = await createClient(sbUrl, sbKey)
    .from('spirit_candidates')
    .select('*')
    .eq('id', candidateId)
    .eq('status', 'pending')
    .single()

  if (error || !candidate) {
    return new Response(JSON.stringify({ error: 'Candidate not found or not pending' }), { status: 404, headers: CORS })
  }

  const preview: Record<string, string> = {
    '⚔ WAR ROOM COMMUNITY — MASTER DEMON DATABASE': candidate.name || '',
    'AKA':                candidate.also_known_as    || '',
    'Description':        candidate.function         || '',
    'Manifestiation':     candidate.manifestations   || '',
    'Scripture Context':  candidate.scripture_context || '',
    'Kingdom':            candidate.kingdom           || '',
    'Biblical Rank':      candidate.biblical_rank     || '',
    'Sub-Kingdom':        candidate.sub_kingdom       || '',
    'Source / Orgin':     candidate.source_name       || '',
  }

  return new Response(JSON.stringify({ preview, candidateId: candidate.id }), { status: 200, headers: CORS })
}

export const config = { path: '/api/spirit-candidate-approve' }
