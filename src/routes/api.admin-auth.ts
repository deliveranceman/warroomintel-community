import { createFileRoute } from '@tanstack/react-router'

const ADMIN_PASSWORD    = process.env.ADMIN_PASSWORD
const COOKIE_SECRET     = process.env.ADMIN_COOKIE_SECRET || 'fallback-secret-change-me'
const COOKIE_NAME       = 'wri_admin'
const COOKIE_MAX_AGE    = 60 * 60 * 8 // 8 hours

// ─── CRYPTO HELPERS ──────────────────────────────────────────────────────────
async function sign(value: string, secret: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(value))
  const b64 = btoa(String.fromCharCode(...new Uint8Array(sig)))
  return `${value}.${b64}`
}

async function verify(signed: string, secret: string): Promise<string | null> {
  const idx = signed.lastIndexOf('.')
  if (idx === -1) return null
  const value = signed.slice(0, idx)
  const expected = await sign(value, secret)
  return expected === signed ? value : null
}

export async function verifyAdminCookie(request: Request): Promise<boolean> {
  const cookieHeader = request.headers.get('cookie') || ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k, v.join('=')]
    })
  )
  const token = cookies[COOKIE_NAME]
  if (!token) return false
  const value = await verify(decodeURIComponent(token), COOKIE_SECRET)
  return value === 'authenticated'
}

// ─── ROUTE ───────────────────────────────────────────────────────────────────
export const Route = createFileRoute('/api/admin-auth')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url)
        const action = url.searchParams.get('action')

        // ── LOGOUT ──────────────────────────────────────────────────────────
        if (action === 'logout') {
          return new Response(JSON.stringify({ ok: true }), {
            headers: {
              'Content-Type': 'application/json',
              'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`,
            },
          })
        }

        // ── LOGIN ────────────────────────────────────────────────────────────
        if (!ADMIN_PASSWORD) {
          return Response.json({ error: 'ADMIN_PASSWORD not configured' }, { status: 500 })
        }

        let body: { password: string }
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: 'Invalid request' }, { status: 400 })
        }

        if (body.password !== ADMIN_PASSWORD) {
          // Small delay to slow brute force
          await new Promise(r => setTimeout(r, 500))
          return Response.json({ error: 'Invalid password' }, { status: 401 })
        }

        const token = await sign('authenticated', COOKIE_SECRET)
        const cookieValue = encodeURIComponent(token)

        return new Response(JSON.stringify({ ok: true }), {
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': `${COOKIE_NAME}=${cookieValue}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`,
          },
        })
      },
    },
  },
})
