export type UpgradeApiResponse =
  | { type: 'redirect'; url: string }
  | { type: 'modified'; direction: 'upgrade' | 'downgrade' | 'noop'; effective: 'now' | 'period_end' }
  | { type: 'error'; errorCode: string }

export async function callCheckoutApi(
  tier: string,
  getToken: () => Promise<string | null>,
): Promise<UpgradeApiResponse> {
  const token = await getToken()
  if (!token) {
    window.location.href = '/sign-in'
    return { type: 'error', errorCode: 'unauthenticated' }
  }
  const res = await fetch('/api/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ tier }),
  })
  const data = await res.json().catch(() => ({}))
  if (data.error) return { type: 'error', errorCode: data.error as string }
  if (!res.ok)    return { type: 'error', errorCode: 'server_error' }
  if (data.url)   return { type: 'redirect', url: data.url as string }
  if (data.modified) return {
    type: 'modified',
    direction: data.direction as 'upgrade' | 'downgrade' | 'noop',
    effective: data.effective as 'now' | 'period_end',
  }
  return { type: 'error', errorCode: 'unexpected_response' }
}
