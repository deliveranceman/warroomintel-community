const OFFLINE_URL = '/offline.html'
const CACHE_NAME  = 'wri-offline-v1'

// Cache offline.html on install so it's always available
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll([OFFLINE_URL]))
  )
  self.skipWaiting()
})

self.addEventListener('activate', function(event) {
  event.waitUntil(self.clients.claim())
})

// Serve offline.html for navigation requests when the network fails
self.addEventListener('fetch', function(event) {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match(OFFLINE_URL).then(r =>
          r || new Response('<html><body style="background:#08060e;color:#C9A84C;font-family:serif;text-align:center;padding:4rem">War Room Intel — Offline</body></html>', { headers: { 'Content-Type': 'text/html' } })
        )
      )
    )
  }
})

self.addEventListener('push', event => {
  const data = event.data?.json() || {}
  event.waitUntil(
    self.registration.showNotification(data.title || 'War Room Intel', {
      body: data.body || 'New activity in the War Room',
      icon: '/apple-touch-icon.png',
      badge: '/favicon-32.png',
      data: { url: data.url || '/community' },
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/community')
  )
})
