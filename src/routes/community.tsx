import { createFileRoute, redirect } from '@tanstack/react-router'
import { useUser, useAuth } from '@clerk/tanstack-start'
import { useEffect } from 'react'

export const Route = createFileRoute('/community')({
  beforeLoad: async ({ context }) => {
    if (!context.userId) {
      throw redirect({
        to: 'https://accounts.warroomintel.com/sign-in',
        search: { redirect_url: 'https://warroomintel.com/community' },
      })
    }
  },
  component: CommunityPage,
})

function CommunityPage() {
  const { user } = useUser()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0e0c09',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#C9A84C',
      fontFamily: 'Cinzel, serif',
      fontSize: 24,
    }}>
      Welcome {user?.firstName} — Community loading...
    </div>
  )
}
