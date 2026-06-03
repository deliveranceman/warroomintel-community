import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/pricing')({
  beforeLoad: () => {
    throw redirect({ to: '/membership' })
  },
  component: () => null,
})
