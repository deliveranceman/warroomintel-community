import { createClient } from '@supabase/supabase-js'

const { url: supabaseUrl, serviceRoleKey: supabaseServiceKey } = JSON.parse(process.env.SUPABASE || '{}')

let _cached: string | null = null
let _cacheExpiry = 0

export async function getMinistryContext(): Promise<string> {
  if (_cached !== null && Date.now() < _cacheExpiry) return _cached
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { data } = await supabase
      .from('ministry_context')
      .select('context_text')
      .eq('is_active', true)
      .single()
    const text = data?.context_text || ''
    _cached = text
    _cacheExpiry = Date.now() + 60_000
    return text
  } catch {
    return ''
  }
}
