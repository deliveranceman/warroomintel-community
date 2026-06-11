// Browser-only Stream Chat client accessor.
//
// HARD RULE: never statically import 'stream-chat' anywhere — it poisons the SSR
// bundle (dist/server/server.mjs) and crashes the site. The SDK is ONLY ever
// pulled in via the runtime `await import('stream-chat')` below, and this file
// itself must only be reached through a dynamic `import()` from inside a
// browser-only effect. No top-level reference to the SDK (not even a type import).

let clientSingleton: any = null

// Returns the StreamChat singleton for this apiKey, or null on the server.
export async function getStreamClient(apiKey: string): Promise<any> {
  if (typeof window === 'undefined') return null
  if (!apiKey) return null
  const { StreamChat } = await import('stream-chat')
  // getInstance is itself a per-apiKey singleton; cache the handle too.
  if (!clientSingleton) clientSingleton = StreamChat.getInstance(apiKey)
  return clientSingleton
}

// Connect a user with an ASYNC tokenProvider (token expires hourly — a static
// token would drop the socket after 1h). Guards against double-connect under
// React StrictMode double-invoke and singleton reuse.
export async function connectStreamUser(
  client: any,
  user: { id: string; name?: string; image?: string },
  tokenProvider: () => Promise<string>,
): Promise<void> {
  if (!client) return
  if (client.userID === user.id) return
  if (client.userID && client.userID !== user.id) {
    await client.disconnectUser().catch(() => {})
  }
  await client.connectUser(user, tokenProvider)
}

export async function disconnectStreamUser(client: any): Promise<void> {
  if (!client) return
  try { await client.disconnectUser() } catch { /* already disconnected */ }
}
