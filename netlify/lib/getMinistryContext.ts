import { createClient } from '@supabase/supabase-js'

let _cached: string | null = null
let _cacheExpiry = 0

export async function getMinistryContext(): Promise<string> {
  if (_cached !== null && Date.now() < _cacheExpiry) return _cached
  try {
    const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)
    const { data } = await supabase
      .from('ministry_context')
      .select('context_text')
      .eq('is_active', true)
      .single()
    _cached = data?.context_text || ''
    _cacheExpiry = Date.now() + 60_000
    return _cached
  } catch {
    return ''
  }
}
