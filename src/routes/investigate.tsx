import { useEffect } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'

export const Route = createFileRoute('/investigate')({
  component: () => {
    const navigate = useNavigate()
    useEffect(() => {
      navigate({ to: '/community' })
    }, [])
    return null
  },
})
