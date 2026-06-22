import { createClient } from '@supabase/supabase-js'
import { requireAdmin2, CORS } from './_shared/access'
import { findSpiritsInText } from './_shared/spiritEntityRecognition'
import {
  hydrateDossiers,
  formatDossiersForContext,
} from './_shared/spiritDossierHydration'

export const config = { path: '/api/admin-sol-hybrid-test' }

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  const auth = await requireAdmin2(req)
  if (auth instanceof Response) return auth

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405,
      headers: CORS,
    })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), {
      status: 400,
      headers: CORS,
    })
  }

  const question = (body?.question ?? '').toString()
  if (!question.trim()) {
    return new Response(JSON.stringify({ error: 'question_required' }), {
      status: 400,
      headers: CORS,
    })
  }

  const env = JSON.parse(process.env.SUPABASE || '{}')
  const supabase = createClient(env.url, env.serviceRoleKey)

  try {
    const matches = await findSpiritsInText(supabase, question, {
      openaiKey: process.env.OPENAI_API_KEY,
      semanticThreshold: 0.5,
      semanticLimit: 10,
    })
    const spiritIds = matches.map((m) => m.id)
    const dossiers = await hydrateDossiers(supabase, spiritIds)
    const contextBlock = formatDossiersForContext(dossiers)

    return new Response(
      JSON.stringify({
        generatedAt: new Date().toISOString(),
        question,
        matches,
        dossiers,
        contextBlock,
        contextBlockLength: contextBlock.length,
      }, null, 2),
      { status: 200, headers: CORS }
    )
  } catch (err: any) {
    console.error('admin-sol-hybrid-test failed', err)
    return new Response(
      JSON.stringify({
        error: 'hybrid_test_failed',
        detail: String(err?.message ?? err),
      }),
      { status: 500, headers: CORS }
    )
  }
}
