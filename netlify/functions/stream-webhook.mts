import crypto from 'crypto'

const { apiSecret } = JSON.parse(process.env.STREAM || '{}')

const HEADERS = {
  'Content-Type': 'application/json',
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: HEADERS })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-signature') ?? ''

  const expected = crypto.createHmac('sha256', apiSecret ?? '').update(rawBody).digest('hex')
  if (expected !== signature) {
    console.warn('[stream-webhook] signature mismatch')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: HEADERS })
  }

  let body: { type?: string; [key: string]: unknown }
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers: HEADERS })
  }

  const { type } = body

  if (type === 'message.new') {
    console.log('[stream-webhook] message.new', JSON.stringify(body))
  } else if (type === 'user.created') {
    console.log('[stream-webhook] user.created', JSON.stringify(body))
  } else {
    console.log(`[stream-webhook] unhandled type: ${type}`)
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: HEADERS })
}

export const config = { path: '/api/stream-webhook' }
