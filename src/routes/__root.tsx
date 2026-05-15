import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { Header } from '@/components/Header'
import { AIAssistant } from '@/components/AIAssistant'
import '../styles.css'

const BARE_ROUTES = ['/mn-gateway']

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'The War Room Community — Deliverance Ministry' },
      { name: 'description', content: 'A members-only arsenal for deliverance ministers — searchable demon database, prayer strategies, Scripture-anchored resources, and live training calls.' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const bare = BARE_ROUTES.includes(pathname)
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {!bare && <Header />}
        {children}
        {!bare && <AIAssistant />}
        <Scripts />
      </body>
    </html>
  )
}
