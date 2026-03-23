import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'
import { Header } from '@/components/Header'
import { AIAssistant } from '@/components/AIAssistant'
import '../styles.css'

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
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <AIAssistant />
        <Scripts />
      </body>
    </html>
  )
}
