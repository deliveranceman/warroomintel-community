import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/products/$productId')({
  loader: async () => {
    throw redirect({ to: '/' })
  },
  component: () => null,
})
