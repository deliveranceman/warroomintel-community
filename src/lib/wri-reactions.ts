// ── WRI custom reactions — source of truth ──────────────────────────────────
// The 12 spiritual-warfare insignia reactions. Type strings are wri_-prefixed
// snake_case so they never collide with any default Stream reaction type.
//
// This module is the SINGLE source of truth for the reaction set. The picker,
// the render list, and any other surface MUST import WRI_REACTIONS from here —
// do not duplicate the array. (The server allowlist in
// netlify/functions/stream-messages.mts mirrors only the type STRINGS as a
// security boundary; this file owns the labels/descriptions.)

export type WRIReactionType =
  | 'wri_strike'
  | 'wri_cover'
  | 'wri_burn'
  | 'wri_amen'
  | 'wri_blood'
  | 'wri_watch'
  | 'wri_sound'
  | 'wri_anchor'
  | 'wri_crown'
  | 'wri_break'
  | 'wri_intercede'
  | 'wri_seal'

export interface WRIReactionDef {
  type: WRIReactionType
  label: string
  description: string
}

export const WRI_REACTIONS: WRIReactionDef[] = [
  { type: 'wri_strike', label: 'STRIKE', description: 'Agreement in offensive prayer' },
  { type: 'wri_cover', label: 'COVER', description: 'Covering / intercession' },
  { type: 'wri_burn', label: 'BURN', description: 'Holy fire / anointing' },
  { type: 'wri_amen', label: 'AMEN', description: 'Stand in agreement' },
  { type: 'wri_blood', label: 'BLOOD', description: 'Plead the blood of Jesus' },
  { type: 'wri_watch', label: 'WATCH', description: 'Discernment / watchman' },
  { type: 'wri_sound', label: 'SOUND', description: 'Sound the alarm' },
  { type: 'wri_anchor', label: 'ANCHOR', description: 'Stand firm in Christ' },
  { type: 'wri_crown', label: 'CROWN', description: 'Christ is King / victory' },
  { type: 'wri_break', label: 'BREAK', description: 'Deliverance / chains broken' },
  { type: 'wri_intercede', label: 'INTERCEDE', description: 'Standing in the gap' },
  { type: 'wri_seal', label: 'SEAL', description: 'Sealed in Christ' },
]

export const WRI_REACTION_TYPES: WRIReactionType[] = WRI_REACTIONS.map(r => r.type)

const WRI_REACTION_SET = new Set<string>(WRI_REACTION_TYPES)

export function isWRIReaction(type: string): type is WRIReactionType {
  return WRI_REACTION_SET.has(type)
}

// WRI gold — default render/picker color.
export const WRI_GOLD = '#C9A84C'

// ── Stream wire (browser-direct) ────────────────────────────────────────────
// War Room Chat talks to Stream browser-direct with the caller's user JWT (the
// same transport as the local streamFetch() in routes/community.tsx). Stream
// derives the reacting user from that JWT, so no user_id is sent in the body.
// DM reactions go through the /api/stream-messages server action instead, where
// the user is derived from the verified Clerk token — never trust a client uid.

const STREAM_BASE = 'https://chat.stream-io-api.com'

export async function sendWRIReactionDirect(
  token: string,
  apiKey: string,
  messageId: string,
  type: WRIReactionType,
): Promise<boolean> {
  const res = await fetch(`${STREAM_BASE}/messages/${messageId}/reaction?api_key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token, 'Stream-Auth-Type': 'jwt' },
    body: JSON.stringify({ reaction: { type, score: 1 } }),
  })
  return res.ok
}

export async function removeWRIReactionDirect(
  token: string,
  apiKey: string,
  messageId: string,
  type: WRIReactionType,
): Promise<boolean> {
  const res = await fetch(`${STREAM_BASE}/messages/${messageId}/reaction/${type}?api_key=${apiKey}`, {
    method: 'DELETE',
    headers: { Authorization: token, 'Stream-Auth-Type': 'jwt' },
  })
  return res.ok
}

// ── Optimistic state helpers (pure — never mutate input) ────────────────────

interface StreamReactionEntry {
  type: string
  user_id?: string
  user?: { id?: string }
}

export interface ReactionMessage {
  reaction_counts?: Record<string, number>
  own_reactions?: StreamReactionEntry[]
  latest_reactions?: StreamReactionEntry[]
}

const reactionUserId = (r: StreamReactionEntry): string | undefined => r.user_id ?? r.user?.id

export function userHasReacted(msg: ReactionMessage, type: string, userId: string): boolean {
  const inOwn = (msg.own_reactions ?? []).some(r => r.type === type)
  const inLatest = (msg.latest_reactions ?? []).some(r => r.type === type && reactionUserId(r) === userId)
  return inOwn || inLatest
}

export function applyOptimisticAdd<T extends ReactionMessage>(msg: T, type: string, userId: string): T {
  if (userHasReacted(msg, type, userId)) return msg
  const counts = { ...(msg.reaction_counts ?? {}) }
  counts[type] = (counts[type] ?? 0) + 1
  const entry: StreamReactionEntry = { type, user_id: userId, user: { id: userId } }
  return {
    ...msg,
    reaction_counts: counts,
    own_reactions: [...(msg.own_reactions ?? []), entry],
    latest_reactions: [entry, ...(msg.latest_reactions ?? [])],
  }
}

export function applyOptimisticRemove<T extends ReactionMessage>(msg: T, type: string, userId: string): T {
  if (!userHasReacted(msg, type, userId)) return msg
  const counts = { ...(msg.reaction_counts ?? {}) }
  const next = (counts[type] ?? 1) - 1
  if (next <= 0) delete counts[type]
  else counts[type] = next
  return {
    ...msg,
    reaction_counts: counts,
    own_reactions: (msg.own_reactions ?? []).filter(r => r.type !== type),
    latest_reactions: (msg.latest_reactions ?? []).filter(r => !(r.type === type && reactionUserId(r) === userId)),
  }
}
