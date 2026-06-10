import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json',
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 })

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  const url   = new URL(req.url)
  const jobId = url.searchParams.get('jobId')
  if (!jobId) return new Response(JSON.stringify({ error: 'jobId required' }), { status: 400, headers })

  const sb = createClient(supabaseUrl!, supabaseServiceKey!)
  const { data, error } = await sb.from('ai_enhance_jobs').select('status,fields,error').eq('id', jobId).single()

  if (error || !data) {
    return new Response(JSON.stringify({ status: 'pending' }), { status: 200, headers })
  }

  return new Response(JSON.stringify({
    status: data.status,
    fields: data.fields || undefined,
    error:  data.error  || undefined,
  }), { status: 200, headers })
}

export const config = { path: '/api/ai-enhance-poll' }
