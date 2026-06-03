#!/usr/bin/env node
// Creates or updates the sol-bot user in Stream Chat.
// Run: node scripts/create-sol-bot.mjs
//
// Needs STREAM credentials. Add to .env:
//   STREAM={"apiKey":"...","apiSecret":"...","appId":"..."}
// or individual vars:
//   STREAM_API_KEY=...  STREAM_API_SECRET=...

import crypto from 'crypto'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ── Load .env ─────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    const key = trimmed.slice(0, eq).trim()
    const val = trimmed.slice(eq + 1).trim()
    if (!process.env[key]) process.env[key] = val
  }
}

// ── Credentials ───────────────────────────────────────────────────────────────
let apiKey, apiSecret

if (process.env.STREAM) {
  try {
    ;({ apiKey, apiSecret } = JSON.parse(process.env.STREAM))
  } catch {
    console.error('ERROR: Could not parse STREAM env var as JSON.')
    process.exit(1)
  }
} else if (process.env.STREAM_API_KEY && process.env.STREAM_API_SECRET) {
  apiKey    = process.env.STREAM_API_KEY
  apiSecret = process.env.STREAM_API_SECRET
} else {
  console.error(`
ERROR: No Stream credentials found.

Add one of the following to .env:

  STREAM={"apiKey":"YOUR_API_KEY","apiSecret":"YOUR_API_SECRET","appId":"1609751"}

or individually:

  STREAM_API_KEY=YOUR_API_KEY
  STREAM_API_SECRET=YOUR_API_SECRET
`)
  process.exit(1)
}

// ── JWT ───────────────────────────────────────────────────────────────────────
function makeJWT(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const body   = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig    = crypto.createHmac('sha256', apiSecret).update(`${header}.${body}`).digest('base64url')
  return `${header}.${body}.${sig}`
}

// ── Create sol-bot ────────────────────────────────────────────────────────────
const token = makeJWT({ server: true })
const url   = `https://chat.stream-io-api.com/users?api_key=${apiKey}`

console.log(`\nCreating sol-bot in Stream (api_key=${apiKey})...\n`)

const res = await fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: token,
    'stream-auth-type': 'jwt',
  },
  body: JSON.stringify({
    users: {
      'sol-bot': {
        id:    'sol-bot',
        name:  'SOL',
        role:  'user',
        image: 'https://warroomintel.com/images/sol/sol-icon.png',
      },
    },
  }),
})

const text = await res.text()
let json
try { json = JSON.parse(text) } catch { json = text }

console.log('HTTP status:', res.status)
console.log('Response:')
console.log(JSON.stringify(json, null, 2))

if (res.ok) {
  console.log('\n✓ sol-bot user created/updated successfully.')
} else {
  console.error('\n✗ Request failed. See response above.')
  process.exit(1)
}
