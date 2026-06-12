import { requireAuth } from './_shared/access'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
const JSON_HEADERS = { ...CORS, 'Content-Type': 'application/json' }

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS })
}

function sbBase(): string {
  const { url } = JSON.parse(process.env.SUPABASE || '{}')
  return `${url}/rest/v1`
}

function sbHeaders() {
  const { serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
  return {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=minimal',
  }
}

async function clerkPatchTerms(userId: string): Promise<void> {
  const clerkSecret = process.env.CLERK_SECRET_KEY
  if (!clerkSecret) return

  const userRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    headers: { Authorization: `Bearer ${clerkSecret}` },
  })
  if (!userRes.ok) return
  const userData = await userRes.json()
  const currentMeta = userData.public_metadata || {}

  await fetch(`https://api.clerk.com/v1/users/${userId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${clerkSecret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      public_metadata: {
        ...currentMeta,
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
      },
    }),
  })
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('', { status: 204, headers: CORS })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const auth = await requireAuth(req)
  if (auth instanceof Response) return auth

  let body: any
  try { body = await req.json() } catch {
    return json({ error: 'Invalid JSON' }, 400)
  }

  const { modalId, action } = body || {}
  if (!modalId) return json({ error: 'modalId required' }, 400)
  // valid actions: seen | dismissed | accepted
  if (!['seen', 'dismissed', 'accepted'].includes(action)) {
    return json({ error: 'action must be "seen", "dismissed", or "accepted"' }, 400)
  }

  // Insert the event row
  await fetch(`${sbBase()}/modal_events`, {
    method: 'POST',
    headers: sbHeaders(),
    body: JSON.stringify({
      modal_id: modalId,
      user_id: auth.userId,
      action,
    }),
  }).catch(() => {})

  // For 'accepted' on a terms-type modal, also write to Clerk public_metadata
  if (action === 'accepted') {
    // Verify this modal is type='terms' before patching Clerk
    const modalRes = await fetch(
      `${sbBase()}/modals?id=eq.${encodeURIComponent(modalId)}&select=type`,
      { headers: { ...sbHeaders(), Prefer: 'return=representation' } },
    )
    const rows: any[] = modalRes.ok ? await modalRes.json().catch(() => []) : []
    if (Array.isArray(rows) && rows[0]?.type === 'terms') {
      await clerkPatchTerms(auth.userId).catch(() => {})
    }
  }

  return json({ ok: true })
}

export const config = { path: '/api/modal-event' }
