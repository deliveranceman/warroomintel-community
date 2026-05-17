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
