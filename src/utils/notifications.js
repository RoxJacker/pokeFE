/**
 * notifications.js — Push notification utilities
 * PokePWA — Fase 4
 */

import api from './api.js'

/**
 * Request notification permission from the user.
 */
export async function requestPermission() {
  if (!('Notification' in window)) {
    console.warn('[Notif] Tu navegador no soporta notificaciones.')
    return false
  }

  if (Notification.permission === 'granted') {
    return true
  }

  const permission = await Notification.requestPermission()
  console.log('[Notif] Permiso de notificaciones:', permission)
  return permission === 'granted'
}

/**
 * Get VAPID public key from the server.
 */
async function getVapidPublicKey() {
  const { data } = await api.get('/vapid-public-key')
  return data.publicKey
}

/**
 * Convert base64url VAPID key to Uint8Array.
 */
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)))
}

/**
 * Subscribe the user to push notifications and save to their profile.
 */
export async function subscribeUser(registration) {
  if (!('PushManager' in window)) {
    console.warn('[Notif] Tu navegador no soporta Push Notifications.')
    return null
  }

  try {
    const vapidPublicKey = await getVapidPublicKey()
    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })

    console.log('[Notif] Usuario suscrito a push notifications.')

    // Save subscription to the authenticated user's profile via the API
    const token = localStorage.getItem('pokepwa_token')
    if (token) {
      await api.put('/api/users/me', { pushSubscription: subscription.toJSON() })
      console.log('[Notif] Subscripción guardada en el perfil del usuario.')
    } else {
      // Fallback: save via legacy /subscribe endpoint
      await api.post('/subscribe', { subscription })
    }

    return subscription
  } catch (err) {
    console.error('[Notif] Error al suscribir al usuario:', err)
    return null
  }
}

/**
 * Initialize push: request permission + subscribe if needed.
 */
export async function initPushNotifications() {
  const granted = await requestPermission()
  if (!granted) return null

  const registration = await navigator.serviceWorker.ready
  const existingSubscription = await registration.pushManager.getSubscription()

  if (existingSubscription) {
    // Make sure it's also saved on the server
    const token = localStorage.getItem('pokepwa_token')
    if (token) {
      try {
        await api.put('/api/users/me', { pushSubscription: existingSubscription.toJSON() })
      } catch {}
    }
    console.log('[Notif] Ya existe una subscripción activa.')
    return existingSubscription
  }

  return subscribeUser(registration)
}
