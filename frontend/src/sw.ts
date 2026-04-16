/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

declare const self: ServiceWorkerGlobalScope

// Workbox precaching (inyectado por vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; data?: Record<string, unknown> }
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'SODI Barre', body: event.data.text() }
  }

  const title = payload.title ?? 'SODI Barre & Coffee'
  const options: NotificationOptions = {
    body:    payload.body ?? '',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/icon-96.png',
    data:    payload.data ?? {},
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// ── Tap en la notificación → abrir la app ─────────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus()
        }
        return self.clients.openWindow('/')
      }),
  )
})
