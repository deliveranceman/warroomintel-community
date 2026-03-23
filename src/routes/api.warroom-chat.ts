import { createFileRoute } from '@tanstack/react-router'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = `You are a knowledgeable assistant for The War Room Community, a members-only platform for deliverance ministers run by Staffordtown Deliverance Ministry.

The War Room Community offers:
- A searchable demon database with hundreds of entries (names, types, functions, Scripture references, deliverance protocols)
- A prayer arsenal library with targeted prayers, declarations, and decrees
- Monthly live Zoom training calls and Q&A sessions (Commander and General tiers)
- Articles, guides, and case studies for active ministers
- A community forum for connecting with other deliverance workers

Membership tiers (all include a 30-day free trial):
- Soldier: $19/month — full database, prayer arsenal, articles, FAQ, community forum
- Commander: $39/month — everything in Soldier plus monthly Zoom calls, live Q&A, downloadable PDFs, priority support (most popular)
- General: $97/month — everything in Commander plus weekly calls, ministry consultation, team/church sub-accounts, certification track

The community was founded by a practicing deliverance minister, not a theorist. All resources are Scripture-anchored and theologically grounded in charismatic/Pentecostal orthodoxy.

Answer questions about the community, membership, the demon database, deliverance ministry concepts, and how the resources can help ministers. Be warm, knowledgeable, and ministry-focused. Keep responses concise and practical.`

export const Route = createFileRoute('/api/warroom-chat')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { messages } = await request.json()

          const anthropic = new Anthropic()

          const stream = await anthropic.messages.create({
            model: 'claude-haiku-4-5',
            max_tokens: 1024,
            system: SYSTEM_PROMPT,
            messages: messages.map((m: { role: string; content: string }) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            stream: true,
          })

          const readable = new ReadableStream({
            async start(controller) {
              for await (const event of stream) {
                if (
                  event.type === 'content_block_delta' &&
                  event.delta.type === 'text_delta'
                ) {
                  controller.enqueue(
                    new TextEncoder().encode(event.delta.text),
                  )
                }
              }
              controller.close()
            },
          })

          return new Response(readable, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          })
        } catch (error) {
          console.error('Chat error:', error)
          return Response.json(
            { error: 'Failed to process request' },
            { status: 500 },
          )
        }
      },
    },
  },
})
