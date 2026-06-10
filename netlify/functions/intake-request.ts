import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

function sb() {
  return createClient(supabaseUrl!, supabaseServiceKey!)
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: HEADERS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  let body: any
  try { body = await req.json() } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  const { name, email, phone, issues, duration, received_before, description, contact_method } = body || {}

  if (!name?.trim()) {
    return new Response(JSON.stringify({ error: 'name is required' }), { status: 400, headers: HEADERS })
  }
  if (!email?.trim()) {
    return new Response(JSON.stringify({ error: 'email is required' }), { status: 400, headers: HEADERS })
  }

  const client = sb()
  const { data, error } = await client
    .from('intake_requests')
    .insert({
      name:             name.trim().slice(0, 200),
      email:            email.trim().toLowerCase().slice(0, 200),
      phone:            phone?.trim().slice(0, 50) || null,
      issues:           Array.isArray(issues) ? issues : [],
      duration:         duration?.trim().slice(0, 100) || null,
      received_before:  Boolean(received_before),
      description:      description?.trim().slice(0, 5000) || null,
      contact_method:   contact_method?.trim().slice(0, 50) || 'email',
    })
    .select('id')
    .single()

  if (error) {
    console.error('[intake-request] insert error:', error.message)
    return new Response(JSON.stringify({ error: 'Failed to submit request' }), { status: 500, headers: HEADERS })
  }

  // Fire confirmation + admin emails — non-blocking
  const emailBase = `${new URL(req.url).origin}/api/send-email`
  const emailBody = { name, phone, issues, duration, received_before, description, contact_method }
  Promise.all([
    fetch(emailBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
      body: JSON.stringify({ type: 'intake-confirmation', to: email.trim().toLowerCase(), name: name.trim(), submissionId: data.id }),
    }),
    fetch(emailBase, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY ?? '' },
      body: JSON.stringify({ type: 'intake-admin', to: email.trim().toLowerCase(), name: name.trim(), submissionId: data.id, details: emailBody }),
    }),
  ]).catch(err => console.error('[intake-request] email error:', err))

  return new Response(JSON.stringify({ success: true, id: data.id }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/intake-request' }
