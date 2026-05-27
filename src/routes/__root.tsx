import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/tanstack-start'
import { Header } from '@/components/Header'
import { AIAssistant } from '@/components/AIAssistant'
import '../styles.css'

const BARE_ROUTES = ['/join']

// Hardcoded fallback so ClerkProvider never receives undefined during SSR
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_live_Y2xlcmsud2Fycm9vbWludGVsLmNvbSQ'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#0D0B14' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { title: 'The War Room Community: Deliverance Ministry' },
      { name: 'description', content: 'A members-only arsenal for deliverance ministers. Searchable demon database, prayer strategies, Scripture-anchored resources, and live training calls.' },
      { property: 'og:image', content: 'https://warroomintel.com/og-image.png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'twitter:card', content: 'summary_large_image' },
      { property: 'twitter:image', content: 'https://warroomintel.com/og-image.png' },
    ],
  }),
  errorComponent: RootError,
  shellComponent: RootDocument,
})

function RootError({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>War Room Intel</title>
        <style>{`body{background:#0e0c09;color:#e8e0d0;font-family:'Georgia',serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:2rem;text-align:center}`}</style>
      </head>
      <body>
        <div>
          <p style={{color:'#C9A84C',fontFamily:'serif',fontSize:'18px',marginBottom:'12px'}}>War Room Intel</p>
          <p style={{opacity:0.6,fontSize:'14px'}}>{msg || 'An error occurred. Please try again.'}</p>
          <a href="/" style={{color:'#C9A84C',marginTop:'20px',display:'block'}}>Return home</a>
        </div>
      </body>
    </html>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  const pathname = useRouterState({ select: s => s.location.pathname })
  const bare = BARE_ROUTES.includes(pathname)
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {/* Anti-flash: set data-theme before first paint from localStorage */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t=localStorage.getItem('wri-theme');if(t==='dark'||t==='light')document.documentElement.dataset.theme=t;})()` }} />
      </head>
      <body>
        <ClerkProvider
          publishableKey={CLERK_KEY}
          allowedRedirectOrigins={[
            'https://warroomintel.com',
            'https://www.warroomintel.com',
          ]}
        >
          {!bare && <Header />}
          {children}
          {!bare && <AIAssistant />}
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
