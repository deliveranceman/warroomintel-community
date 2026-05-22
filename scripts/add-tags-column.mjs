import dotenv from 'dotenv'
dotenv.config()
const { createClient } = await import('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
const { error } = await supabase.rpc('exec_sql', { query: 'ALTER TABLE resources ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];' })
console.log(error ? '❌ ' + error.message : '✅ tags column added')
