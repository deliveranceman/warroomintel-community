import { createFileRoute } from '@tanstack/react-router'

// Retired: admin authentication is now handled by Clerk (requireAdmin2 in api.admin-upload).
// Kept as a stub so routeTree.gen.ts continues to compile; returns 410 Gone for any call.
export const Route = createFileRoute('/api/admin-auth')({
  server: {
    handlers: {
      POST: async () => Response.json({ error: 'Endpoint retired' }, { status: 410 }),
    },
  },
})
