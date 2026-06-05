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

  // Broadcast to open tabs so MessengerSection can update without a reload
  if (data.type === 'new-dm') {
    const bc = new BroadcastChannel('wri-messages')
    bc.postMessage({ type: 'new-dm', channelId: data.channelId })
    bc.close()
  }

  const notifData = Object.assign({ url: data.url || '/community' }, data.data || {})

  event.waitUntil(
    self.registration.showNotification(data.title || 'War Room Intel', {
      body: data.body || 'New activity in the War Room',
      icon: '/apple-touch-icon.png',
      badge: '/favicon-32.png',
      data: notifData,
      vibrate: [200, 100, 200],
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  var data = event.notification.data || {}
  var targetUrl = '/community'
  if (data.call_id) {
    targetUrl = '/community?call_id=' + data.call_id
      + '&caller=' + encodeURIComponent(data.caller_name || '')
      + '&caller_id=' + encodeURIComponent(data.caller_id || '')
      + '&channel=' + encodeURIComponent(data.channel_id || '')
  } else if (data.url) {
    targetUrl = data.url
  }
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i]
        if ('focus' in client) {
          client.focus()
          client.postMessage({ type: 'WRI_NOTIFICATION_TAP', data: data })
          return
        }
      }
      return clients.openWindow(targetUrl)
    })
  )
})
