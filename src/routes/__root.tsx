import { HeadContent, Scripts, createRootRoute, useLocation } from '@tanstack/react-router'
import { ClerkProvider } from '@clerk/tanstack-start'
import { Header } from '@/components/Header'
import { AIAssistant } from '@/components/AIAssistant'
import { CommandPalette, type CommandResult } from '@/components/primitives'
import { useState, useEffect } from 'react'
import '../styles.css'

const BARE_ROUTES = ['/join']

// Pages that have their own sidebar/shell — suppress the public marketing header and AI assistant
const COMMUNITY_SHELL_ROUTES = [
  '/admin',
  '/arsenal',
  '/community',
  '/community/field-manual',
  '/community/scripture',
  '/community/dream-interpreter',
  '/community/field-ops',
  '/community/spiritual-mapping',
  '/community/testing',
]

// Hardcoded fallback so ClerkProvider never receives undefined during SSR
const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || 'pk_live_Y2xlcmsud2Fycm9vbWludGVsLmNvbSQ'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { name: 'theme-color', content: '#0d0b14' },
      { name: 'mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-capable', content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title', content: 'War Room Intel' },
      { title: 'War Room Intel — Intelligence for the Fight | Deliverance Ministry Platform' },
      { name: 'description', content: '322 spirits catalogued. Searchable demon database, AI-powered session tools, deliverance protocols, dream interpretation, and case file management. Built by ministers for deliverance ministry.' },
      { name: 'keywords', content: 'deliverance ministry, spiritual warfare, demon database, deliverance protocols, spiritual warfare intelligence, session tools, dream interpretation, deliverance minister, exorcism, strongman spirits, spiritual warfare training' },
      { property: 'og:image', content: 'https://warroomintel.com/og-image.png' },
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { property: 'twitter:card', content: 'summary_large_image' },
      { property: 'twitter:image', content: 'https://warroomintel.com/og-image.png' },
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap' },
      { rel: 'manifest', href: '/manifest.json' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'icon', type: 'image/svg+xml', href: '/icon.svg' },
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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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

const defaultResults: CommandResult[] = [
  { id: 'nav-home',     group: 'Navigate',   label: 'Home',              sublabel: 'Operator dashboard',           onSelect: () => { window.location.href = '/' } },
  { id: 'nav-community',group: 'Navigate',   label: 'Community',         sublabel: 'War Room community hub',       onSelect: () => { window.location.href = '/community' } },
  { id: 'nav-arsenal',  group: 'Navigate',   label: 'Arsenal',           sublabel: 'PDF resource library',         onSelect: () => { window.location.href = '/arsenal' } },
  { id: 'nav-intel',    group: 'Navigate',   label: 'Intel Archive',     sublabel: '263 spirits database',         onSelect: () => { window.location.href = '/community' } },
  { id: 'nav-forum',    group: 'Community',  label: 'The Board',         sublabel: 'Community discussion',         onSelect: () => { window.location.href = '/community/forum' } },
  { id: 'nav-manual',   group: 'Knowledge',  label: 'Field Manual',      sublabel: 'Training and doctrine',        onSelect: () => { window.location.href = '/community/field-manual' } },
  { id: 'nav-mapping',  group: 'Knowledge',  label: 'Spiritual Mapping', sublabel: 'Copper Basin principality map',onSelect: () => { window.location.href = '/community/spiritual-mapping' } },
  { id: 'nav-scripture', group: 'Knowledge', label: 'Scripture', sublabel: "SOL's Spiritual Warfare & Reference Bible + AI", onSelect: () => { window.location.href = '/community/scripture' } },
  { id: 'nav-field-ops', group: 'Field Ops',  label: 'Case Files',        sublabel: 'Private minister case files',  onSelect: () => { window.location.href = '/community/field-ops' } },
  { id: 'nav-dreams',   group: 'Intelligence', label: 'Dream Interpreter', sublabel: 'Prophetic and spiritual dream analysis', onSelect: () => { window.location.href = '/community/dream-interpreter' } },
  { id: 'nav-admin',    group: 'Admin',      label: 'Admin Panel',       sublabel: 'Management tools',             onSelect: () => { window.location.href = '/admin' } },
]

function RootDocument({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const bare = BARE_ROUTES.includes(pathname)
  const communityShell = COMMUNITY_SHELL_ROUTES.includes(pathname) || pathname.startsWith('/community/')
  const [cmdOpen, setCmdOpen] = useState(false)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCmdOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <HeadContent />
        {/* Set theme pre-paint to avoid FOUC; default dark, opt into light from localStorage */}
        <script dangerouslySetInnerHTML={{ __html: `try{if(localStorage.getItem('wri-theme')==='light'){document.documentElement.setAttribute('data-theme','light')}}catch(e){}` }} />
      </head>
      <body>
        <ClerkProvider
          publishableKey={CLERK_KEY}
          allowedRedirectOrigins={[
            'https://warroomintel.com',
            'https://www.warroomintel.com',
          ]}
        >
          {!bare && !communityShell && <Header />}
          {children}
          {!bare && !communityShell && <AIAssistant />}
          <CommandPalette
            open={cmdOpen}
            onClose={() => setCmdOpen(false)}
            results={defaultResults}
          />
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
