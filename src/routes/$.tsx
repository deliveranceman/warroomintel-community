import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$')({
  component: NotFound,
})

function NotFound() {
  return (
    <div style={{
      minHeight: '100vh',
      background: '#0D0B14',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      textAlign: 'center',
      fontFamily: "'Cinzel', serif",
    }}>
      <img src="/logo.png" alt="War Room Intel" style={{ width: 64, height: 64, objectFit: 'contain', marginBottom: 32, opacity: 0.7 }} />

      <div style={{ fontFamily: "'Cinzel', serif", fontSize: '11px', letterSpacing: '0.3em', color: '#C9A84C', marginBottom: 16 }}>
        ✦ WAR ROOM INTEL
      </div>

      <h1 style={{ fontFamily: "'Cinzel', serif", fontSize: 'clamp(28px, 5vw, 52px)', fontWeight: 700, color: '#e8e0d0', marginBottom: 16, letterSpacing: '0.04em' }}>
        404: This Intel Does Not Exist
      </h1>

      <p style={{ fontFamily: "'Crimson Pro', serif", fontSize: '18px', color: '#9a8c74', fontStyle: 'italic', maxWidth: 440, lineHeight: 1.7, marginBottom: 40 }}>
        The page you're looking for has been classified or doesn't exist.
      </p>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
        <a
          href="/community"
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '11px',
            letterSpacing: '0.12em',
            color: '#0D0B14',
            background: '#C9A84C',
            padding: '14px 28px',
            borderRadius: 4,
            textDecoration: 'none',
            fontWeight: 700,
          }}
        >
          Return to Community
        </a>
        <a
          href="/"
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: '11px',
            letterSpacing: '0.12em',
            color: '#C9A84C',
            background: 'transparent',
            border: '1px solid rgba(201,168,76,0.45)',
            padding: '14px 28px',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          Search the Database
        </a>
      </div>
    </div>
  )
}
