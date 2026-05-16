import { createFileRoute } from '@tanstack/react-router'
import { useEffect } from 'react'

export const Route = createFileRoute('/sign-up')({
  ssr: false,
  component: SignUpRedirect,
})

function SignUpRedirect() {
  useEffect(() => {
    window.location.href =
      'https://accounts.warroomintel.com/sign-up?redirect_url=' +
      encodeURIComponent('https://warroomintel.com/community/')
  }, [])
  return null
}
