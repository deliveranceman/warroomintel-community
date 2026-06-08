import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/api/resources-debug')({
  server: {
    handlers: {
      GET: async () => Response.json({ error: 'Not found' }, { status: 404 }),
    },
  },
})
