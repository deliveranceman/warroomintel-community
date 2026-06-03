import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/assessment-board')({
  beforeLoad: () => { throw redirect({ to: '/membership' }) },
  component: () => null,
})
