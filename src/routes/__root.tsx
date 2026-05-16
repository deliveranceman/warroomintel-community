import { HeadContent, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/tanstack-start'
import { Header } from '@/components/Header'
import { AIAssistant } from '@/components/AIAssistant'
import '../styles.css'

const BARE_ROUTES = ['/mn-gateway']

// Hardcoded fallback so ClerkProvider never receives undefined during SSR
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_live_Y2xlcmsud2Fycm9vbWludGVsLmNvbSQ'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'The War Room Community — Deliverance Ministry' },
      { name: 'description', content: 'A members-only arsenal for deliverance ministers — searchable demon database, prayer strategies, Scripture-anchored resources, and live training calls.' },
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
