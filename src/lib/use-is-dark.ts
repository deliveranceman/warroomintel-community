import { useEffect, useState } from 'react'

// Mirrors the persisted theme written by CommunityPage to
// document.documentElement.dataset.theme. Defaults to dark for SSR/first
// paint so hydration matches, then syncs to the actual theme on mount and
// stays in sync if the attribute changes.
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    const read = () => setIsDark(document.documentElement.dataset.theme !== 'light')
    read()
    const obs = new MutationObserver(read)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => obs.disconnect()
  }, [])
  return isDark
}
