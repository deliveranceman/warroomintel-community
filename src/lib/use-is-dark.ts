import { useState, useEffect } from 'react'

/**
 * Reads `data-theme` from <html> and stays synced.
 * Defaults to dark on SSR (matches SSR'd <html data-theme="dark">).
 * On client first-render, reads the actual attribute (boot script may have flipped to light).
 * MutationObserver re-syncs on later toggle changes.
 */
export function useIsDark(): boolean {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === 'undefined') return true
    return document.documentElement.dataset.theme !== 'light'
  })

  useEffect(() => {
    const html = document.documentElement
    const update = () => {
      const next = html.dataset.theme !== 'light'
      setIsDark(prev => prev === next ? prev : next)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(html, { attributes: true, attributeFilter: ['data-theme'] })
    return () => observer.disconnect()
  }, [])

  return isDark
}
