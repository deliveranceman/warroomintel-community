import webpush from 'web-push'

export interface PushResult {
  sent: number
  failed: number
  total: number
  errors: Array<{ id: string; statusCode: number | null; message: string }>
}

function getVapid() {
  const json = JSON.parse(process.env.VAPID || '{}')
  const publicKey  = process.env.VAPID_PUBLIC_KEY  || json.publicKey  || ''
  const privateKey = process.env.VAPID_PRIVATE_KEY || json.privateKey || ''
  const email      = json.email || 'exorcist@warroomintel.com'
  const contact    = email.startsWith('mailto:') ? email : `mailto:${email}`
  return { publicKey, privateKey, contact }
}

export async function sendWebPushToUser(
  userId: string,
  title: string,
  body: string,
  extraData?: Record<string, string>,
): Promise<PushResult> {
  const { url: supabaseUrl, serviceRoleKey } = JSON.parse(process.env.SUPABASE || '{}')
  const sbH = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` }
  const { publicKey, privateKey, contact } = getVapid()

  webpush.setVapidDetails(contact, publicKey, privateKey)

  const subRes = await fetch(
    `${supabaseUrl}/rest/v1/push_subscriptions?user_id=eq.${encodeURIComponent(userId)}&select=id,user_id,endpoint,subscription`,
    { headers: sbH },
  )
  const rows: any[] = await subRes.json().catch(() => [])
  console.log(`[push] user=${userId} subscriptions=${Array.isArray(rows) ? rows.length : 0}`)

  if (!Array.isArray(rows) || rows.length === 0) {
    return { sent: 0, failed: 0, total: 0, errors: [] }
  }

  const payload = JSON.stringify({
    title,
    body,
    url: '/community',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    ...(extraData ? { data: extraData } : {}),
  })

  let sent = 0, failed = 0
  const errors: PushResult['errors'] = []

  for (const row of rows) {
    let pushSub: webpush.PushSubscription
    try {
      pushSub = typeof row.subscription === 'string'
        ? JSON.parse(row.subscription)
        : (row.subscription as webpush.PushSubscription)
    } catch {
      failed++
      errors.push({ id: row.id, statusCode: null, message: 'Invalid subscription JSON' })
      continue
    }

    try {
      await webpush.sendNotification(pushSub, payload, { TTL: 86400 })
      sent++
      console.log(`[push] sent user=${userId} sub=${row.id}`)
    } catch (err: any) {
      failed++
      const sc = err.statusCode ?? 0
      errors.push({ id: row.id, statusCode: sc, message: err.body || err.message || String(err) })
      console.error(`[push] failed user=${userId} sub=${row.id} status=${sc} body=${err.body || err.message}`)

      if (sc === 410 || sc === 404 || sc === 400) {
        await fetch(
          `${supabaseUrl}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(row.id)}`,
          { method: 'DELETE', headers: sbH },
        ).catch(() => {})
        console.log(`[push] deleted stale sub ${row.id} (status=${sc})`)
      }
    }
  }

  return { sent, failed, total: rows.length, errors }
}
