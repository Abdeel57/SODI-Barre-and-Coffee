import { useState } from 'react'
import { pushApi } from '../api'
import { useStore } from '../store/useStore'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const buffer = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    buffer[i] = rawData.charCodeAt(i)
  }
  return buffer.buffer
}

export function usePush() {
  const showToast = useStore((s) => s.showToast)
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default',
  )

  const isSupported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  async function requestPermission(): Promise<void> {
    if (!isSupported) return

    const result = await Notification.requestPermission()
    setPermission(result)

    if (result !== 'granted') return

    try {
      const registration = await navigator.serviceWorker.ready

      const vapidKey = import.meta.env.VITE_VAPID_KEY
      if (!vapidKey) {
        console.warn('VITE_VAPID_KEY no configurada — push desactivado')
        return
      }

      // Desuscribir suscripción anterior si existe (por si cambió la clave VAPID)
      const existing = await registration.pushManager.getSubscription()
      if (existing) await existing.unsubscribe()

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      await pushApi.subscribe(subscription.toJSON() as PushSubscriptionJSON)
      showToast('Notificaciones activadas', 'success')
    } catch (err) {
      console.error('Error al suscribir push:', err)
      showToast('No se pudo activar notificaciones', 'error')
    }
  }

  return { permission, requestPermission, isSupported }
}
