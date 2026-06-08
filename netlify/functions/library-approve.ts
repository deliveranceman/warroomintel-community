import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'

const { url: sbUrl, serviceRoleKey: sbKey } = JSON.parse(process.env.SUPABASE || '{}')

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST')  return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: CORS })

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth
  const { userId } = auth

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: CORS })
  }

  const { resourceId, action, rejectionReason, publicDomainConfirmed } = body || {}
  if (!resourceId) return new Response(JSON.stringify({ error: 'resourceId required' }), { status: 400, headers: CORS })
  if (action !== 'approve' && action !== 'reject') {
    return new Response(JSON.stringify({ error: 'action must be approve or reject' }), { status: 400, headers: CORS })
  }

  const client = createClient(sbUrl, sbKey)

  const { data: resource } = await client
    .from('resources')
    .select('id,status')
    .eq('id', resourceId)
    .single()

  if (!resource) return new Response(JSON.stringify({ error: 'Resource not found' }), { status: 404, headers: CORS })

  if (action === 'approve') {
    await client.from('resources').update({
      status:                           'approved',
      active:                           true,
      approved_at:                      new Date().toISOString(),
      approved_by:                      userId,
      source_public_domain_confirmed:   publicDomainConfirmed === true,
    }).eq('id', resourceId)
  } else {
    await client.from('resources').update({
      status:           'rejected',
      active:           false,
      rejection_reason: rejectionReason || 'No reason given',
      approved_by:      userId,
      approved_at:      new Date().toISOString(),
    }).eq('id', resourceId)
  }

  return new Response(JSON.stringify({ success: true }), { status: 200, headers: CORS })
}

export const config = { path: '/api/library-approve' }
