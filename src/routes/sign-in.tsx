import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/sign-in')({
  ssr: false,
  component: SignInRedirect,
})

function SignInRedirect() {
  useEffect(() => {
    window.location.href =
      'https://accounts.warroomintel.com/sign-in?redirect_url=' +
      encodeURIComponent('https://warroomintel.com/community/')
  }, [])
  return null
}
