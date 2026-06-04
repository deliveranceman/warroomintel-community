import crypto from 'crypto'

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY
const STREAM_JSON = process.env.STREAM
if (!CLERK_SECRET_KEY || !STREAM_JSON) {
  console.error('Missing env vars. Run as:')
  console.error('  CLERK_SECRET_KEY=sk_live_... STREAM=\'{"apiKey":"...","apiSecret":"..."}\' node scripts/backfill-stream-users.mjs')
  process.exit(1)
}
const { apiKey, apiSecret } = JSON.parse(STREAM_JSON)
const feedsSecret = process.env.STREAM_FEEDS_SECRET || apiSecret

function serverJWT(secret = apiSecret) {
  const header  = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ resource: '*', action: '*', feed_id: '*' })).toString('base64url')
  const sig     = crypto.createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url')
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

// 4. Upsert all into Stream Activity Feeds — batch POST /users/ with array body
console.log('Upserting users into Stream Activity Feeds...')
const feedsUserArray = Object.values(users).map(u => ({ id: u.id, name: u.name }))
const feedsRes = await fetch(`https://us-east-api.stream-io-api.com/api/v1.0/users/?api_key=${apiKey}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': serverJWT(feedsSecret),
    'Stream-Auth-Type': 'jwt',
  },
  body: JSON.stringify({ users: feedsUserArray }),
})
const feedsData = await feedsRes.json()
console.log('Stream Feeds upsert:', feedsRes.status, JSON.stringify(feedsData).slice(0, 300))
console.log(`Stream Chat upsert complete: ${Object.keys(users).length} users registered for DMs`)
console.log(`Stream Feeds upsert complete: ${feedsRes.ok ? feedsUserArray.length : 0} ok, ${feedsRes.ok ? 0 : feedsUserArray.length} failed`)
