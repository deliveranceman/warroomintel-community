import type { Context } from '@netlify/functions'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
)

function getUserId(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null
  const token = authHeader.slice(7)
  try {
    const parts = token.split('.')
    if (parts.length < 2) return null
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
    return payload.sub || null
  } catch {
    return null
  }
}

export default async (req: Request, _ctx: Context) => {
  const userId = getUserId(req.headers.get('authorization'))
  if (!userId) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('field_manual_progress')
      .select('module_id, completed, completed_at')
      .eq('user_id', userId)
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
          user_id: userId,
          module_id,
          completed: completed ?? true,
          completed_at: completed !== false ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
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
