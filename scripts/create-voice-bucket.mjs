import { readFileSync } from 'fs'
import { resolve } from 'path'

// Load .env manually
const envPath = resolve(process.cwd(), '.env')
const envLines = readFileSync(envPath, 'utf8').split('\n')
for (const line of envLines) {
  const [key, ...vals] = line.split('=')
  if (key && vals.length) process.env[key.trim()] = vals.join('=').trim()
}

const { url: supabaseUrlJson, serviceRoleKey: serviceRoleKeyJson } = JSON.parse(process.env.SUPABASE || '{}')
const supabaseUrl = supabaseUrlJson || process.env.SUPABASE_URL || ''
const serviceRoleKey = serviceRoleKeyJson || process.env.SUPABASE_SERVICE_KEY || ''

console.log('Creating voice-messages bucket in Supabase...')
const res = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${serviceRoleKey}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    id: 'voice-messages',
    name: 'voice-messages',
    public: true,
    file_size_limit: 10485760,
    allowed_mime_types: ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'],
  }),
})
const data = await res.json()
console.log('Status:', res.status)
console.log(JSON.stringify(data, null, 2))
