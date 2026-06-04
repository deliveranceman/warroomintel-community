import crypto from 'crypto'

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
const STREAM_JSON = process.env.STREAM
if (!CLERK_SECRET_KEY || !STREAM_JSON) {
  console.error('Missing env vars. Run as:')
  console.error('  CLERK_SECRET_KEY=sk_live_... STREAM=\'{"apiKey":"...","apiSecret":"..."}\' node scripts/backfill-stream-users.mjs')
  process.exit(1)
}
const { apiKey, apiSecret } = JSON.parse(STREAM_JSON)

function serverJWT() {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ server: true })).toString('base64url')
  const sig     = crypto.createHmac('sha256', apiSecret).update(`${header}.${payload}`).digest('base64url')
  return `${header}.${payload}.${sig}`
}

// 1. Fetch all Clerk users
const clerkRes = await fetch('https://api.clerk.com/v1/users?limit=100', {
  headers: { Authorization: `Bearer ${CLERK_SECRET_KEY}` },
})
if (!clerkRes.ok) {
  console.error('Clerk API error:', await clerkRes.text())
  process.exit(1)
}
const clerkUsers = await clerkRes.json()
console.log(`Found ${clerkUsers.length} Clerk users`)

// 2. Build Stream users object
const users = {}
for (const u of clerkUsers) {
  const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.id
  users[u.id] = { id: u.id, name, role: 'user' }
}

// 3. Upsert all into Stream Chat (batch)
const chatRes = await fetch(`https://chat.stream-io-api.com/users?api_key=${apiKey}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': serverJWT(),
    'Stream-Auth-Type': 'jwt',
  },
  body: JSON.stringify({ users }),
})
const chatData = await chatRes.json()
console.log('Stream Chat upsert:', chatRes.status, JSON.stringify(chatData).slice(0, 200))

// NOTE: Stream Activity Feeds (feeds.stream-io-api.com) is NOT enabled for this app.
// feeds.stream-io-api.com returns 404 for all endpoints regardless of auth method.
// To enable SITREP, go to https://dashboard.getstream.io and enable Activity Feeds
// on your app, or migrate SITREP to use Supabase instead.
//
// Stream Chat (chat.stream-io-api.com) IS enabled and the upsert above covers DMs.

console.log(`Stream Chat upsert complete: ${Object.keys(users).length} users registered for DMs`)
console.log('SITREP feeds require Activity Feeds to be enabled at dashboard.getstream.io')
