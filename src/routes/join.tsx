import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/join')({
  component: JoinPage,
})

function JoinPage() {
  useEffect(() => {
    window.location.href = '/membership'
  }, [])
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: '#0D0B14',
      color: '#C9A84C',
      fontFamily: "'Cinzel', serif",
      fontSize: 14,
      letterSpacing: '0.1em',
    }}>
      Redirecting...
    </div>
  )
}
