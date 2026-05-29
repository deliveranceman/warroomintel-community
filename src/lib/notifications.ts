/**
 * Safe Notification API guards — iOS Safari throws ReferenceError
 * on bare `Notification` when the API is unavailable.
 * Always use these helpers instead of accessing Notification directly.
 */

export const supportsNotifications =
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window

export function getNotificationPermission(): NotificationPermission | null {
  if (!supportsNotifications) return null
  return window.Notification.permission
}

export function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!supportsNotifications) return Promise.resolve('denied' as NotificationPermission)
  return window.Notification.requestPermission()
}
