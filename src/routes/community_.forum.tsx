import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/community_/forum')({
  ssr: false,
  component: ForumRedirect,
})

function ForumRedirect() {
  const navigate = useNavigate()
  useEffect(() => { navigate({ to: '/community' }) }, [])
  return null
}
