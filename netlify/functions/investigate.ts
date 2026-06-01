import Anthropic from '@anthropic-ai/sdk'
import { checkAndIncrementUsage, getUpgradeMessage } from '../lib/ai-rate-limit'
import { cleanAIOutput } from '../lib/clean-ai-output'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// Simple in-memory rate limiter: max 10 requests per IP per minute
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

const systemPrompt = `You are a spiritual warfare intelligence analyst for War Room Intel, a platform serving trained deliverance ministers. Your role is to analyze observed symptoms, manifestations, and patterns and return structured intelligence that helps ministers identify probable demonic entities and build a deliverance strategy.

You have deep knowledge of:
- Spirit hierarchy and families (Fear, Rejection, Marine Kingdom, Occult/Witchcraft, Freemasonry, Perversion, Death/Destruction, Religious/Legalism, General Oppression)
- Common entry points: trauma, sexual sin, occult involvement, generational iniquity, unforgiveness, vows and oaths, Freemasonry bloodlines
- Deliverance sequencing: always address legal rights first, then work from outer to inner, strongmen last
- Scripture warfare

Return ONLY valid JSON. No preamble, no markdown, no explanation outside the JSON.

Return this exact structure:
{
  "summary": "2-3 sentence intelligence summary of the pattern you are observing",
  "probableSpirits": [
    {
      "name": "Spirit name",
      "confidence": "High" | "Medium" | "Low",
      "reason": "One sentence explaining why this spirit is indicated",
      "category": "One of: Fear / Rejection | Marine Kingdom | Occult / Witchcraft | Freemasonry | Perversion | Death / Destruction | Religious | General Oppression"
    }
  ],
  "entryPoints": ["entry point 1", "entry point 2"],
  "deliveranceSequence": [
    "Step 1 description",
    "Step 2 description"
  ],
  "counterScriptures": [
    "Reference — brief quote or description"
  ],
  "warningFlags": [
    "Any red flags or cautions for the minister"
  ]
}

Rules:
- List 3-8 probable spirits ordered by confidence (High first)
- List 4-8 deliverance sequence steps, always starting with legal rights
- List 3-6 counter scriptures
- Warning flags are optional — only include if there are genuine concerns (DID indicators, suicidal ideation patterns, need for trauma counseling first, etc)
- Stay grounded in biblical deliverance theology
- Do not speculate beyond what the symptoms indicate`

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const jsonHeaders = { 'Content-Type': 'application/json' }

  try {
    // Resolve JWT and tier for rate limiting
    const authHeader = req.headers.get('Authorization')
    const sessionToken = authHeader?.replace('Bearer ', '').trim()

    let userId = 'anonymous'
    let tier = 'watchman'
    if (sessionToken && sessionToken.split('.').length === 3) {
      try {
        const payload = JSON.parse(Buffer.from(sessionToken.split('.')[1], 'base64url').toString())
        userId = payload.sub || 'anonymous'
        if (userId !== 'anonymous') {
          const clerkRes = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
            headers: { Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}` },
          })
          if (clerkRes.ok) {
            const clerkData = await clerkRes.json()
            tier = (clerkData?.public_metadata?.tier as string) || 'watchman'
          }
        }
      } catch (e) { console.warn('JWT/Clerk resolve failed:', e) }
    }

    // IP-based fallback rate limit
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
    if (!checkRateLimit(ip)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again in a minute.' }), { status: 429, headers: jsonHeaders })
    }

    // Tier-based daily limit
    if (userId !== 'anonymous') {
      const usage = await checkAndIncrementUsage(userId, tier, 'symptom_investigator')
      if (!usage.allowed) {
        return new Response(JSON.stringify({ error: getUpgradeMessage(tier, 'symptom_investigator'), rateLimited: true, limit: usage.limit, remaining: 0 }), { status: 429, headers: jsonHeaders })
      }
    }

    const { symptoms } = await req.json()
    if (!symptoms || typeof symptoms !== 'string' || symptoms.trim().length < 5) {
      return new Response(JSON.stringify({ error: 'Symptoms required (minimum 5 characters)' }), { status: 400, headers: jsonHeaders })
    }

    const userMessage = `Observed symptoms and manifestations:\n\n${symptoms.trim()}`

    // FIX 2 — Timeout protection around the Anthropic API call
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Analysis timeout')), 25000)
    )

    const message = await Promise.race([
      client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      timeoutPromise,
    ]) as Awaited<ReturnType<typeof client.messages.create>>

    const text = cleanAIOutput(message.content[0].type === 'text' ? message.content[0].text : '')
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return new Response(JSON.stringify(parsed), { status: 200, headers: jsonHeaders })

  } catch (e: any) {
    // FIX 3 — Return useful error messages instead of 502
    console.error('Investigate error:', e.message)
    return new Response(JSON.stringify({
      error: e.message === 'Analysis timeout'
        ? 'Analysis timed out — try a shorter description'
        : 'Investigation failed',
      detail: e.message,
    }), { status: 500, headers: jsonHeaders })
  }
}

export const config = { path: '/api/investigate' }
