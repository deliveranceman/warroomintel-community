import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from './_shared/access'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

export default async (req: Request, _ctx: Context) => {
  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('field_manual_progress')
      .select('module_id, completed, completed_at')
      .eq('user_id', auth.userId)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ progress: data || [] })
  }

  if (req.method === 'POST') {
    const body = await req.json()
    const { module_id, completed } = body
    if (!module_id) return Response.json({ error: 'module_id required' }, { status: 400 })

    const { data, error } = await supabase
      .from('field_manual_progress')
      .upsert(
        {
          user_id:      auth.userId,
          module_id,
          completed:    completed ?? true,
          completed_at: completed !== false ? new Date().toISOString() : null,
          updated_at:   new Date().toISOString(),
        },
        { onConflict: 'user_id,module_id' },
      )
      .select()
      .single()

    if (error) return Response.json({ error: error.message }, { status: 500 })
    return Response.json({ progress: data })
  }

  return Response.json({ error: 'Method not allowed' }, { status: 405 })
}

export const config = { path: '/api/field-manual-progress' }
