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

self.addEventListener('push', function(event) {
  const data = event.data ? event.data.json() : {}

  const options = {
    body: data.body || 'New message in War Room',
    icon: '/logo.png',
    badge: '/logo.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/community' },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Dismiss' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || '⚔️ War Room Intel',
      options
    )
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/community')
    )
  }
})
