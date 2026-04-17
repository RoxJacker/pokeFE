// ============================================================
// PokePWA — Service Worker
// Fases: 1 (App Shell + Cache), 3 (Background Sync), 4 (Push)
// ============================================================

const APP_SHELL_CACHE = 'app-shell-v2'
const DYNAMIC_CACHE = 'dynamic-v2'
const KNOWN_CACHES = [APP_SHELL_CACHE, DYNAMIC_CACHE]

// Recursos del App Shell que se pre-cachean en la instalación
const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// ============================================================
// FASE 1 — INSTALL: Pre-cache del App Shell
// ============================================================
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando — cacheando App Shell...')
  event.waitUntil(
    caches
      .open(APP_SHELL_CACHE)
      .then((cache) => cache.addAll(APP_SHELL_ASSETS))
      .then(() => {
        console.log('[SW] App Shell cacheado correctamente.')
        // Toma el control inmediatamente sin esperar que se cierren las pestañas
        return self.skipWaiting()
      })
      .catch((err) => console.error('[SW] Error cacheando App Shell:', err)),
  )
})

// ============================================================
// FASE 1 — ACTIVATE: Limpieza de caches antiguos
// ============================================================
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando — limpiando caches obsoletos...')
  event.waitUntil(
    caches
      .keys()
      .then((cacheKeys) => {
        return Promise.all(
          cacheKeys
            .filter((key) => !KNOWN_CACHES.includes(key))
            .map((obsoleteKey) => {
              console.log('[SW] Eliminando cache obsoleto:', obsoleteKey)
              return caches.delete(obsoleteKey)
            }),
        )
      })
      .then(() => {
        console.log('[SW] Activado. Tomando control de todos los clientes.')
        // Toma el control de todas las pestañas abiertas inmediatamente
        return self.clients.claim()
      }),
  )
})

// ============================================================
// FASE 1 & FASE 3 — FETCH: Cache-First estático + Background Sync
// ============================================================
self.addEventListener('fetch', (event) => {
  const { request } = event

  // 1. Peticiones a la API interna
  const isInternalApi = request.url.includes('/api/') && !request.url.includes('pokeapi.co')
  if (isInternalApi) {
    // Si altera el estado (POST/PUT/DELETE), manejamos Background Sync
    if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
      event.respondWith(
        fetch(request.clone()).catch(async (err) => {
          console.warn('[SW] Red caída. Guardando petición en IndexedDB para Background Sync...', err)

          // DON'T queue favorites toggle — it's idempotent and would double-toggle.
          // The frontend handles this optimistically and reconciles via fetchProfile on reconnect.
          const isFavoritesToggle = request.url.includes('/api/users/me/favorites/')
          if (isFavoritesToggle) {
            console.log('[SW] Favoritos toggle detectado — se omite queue para evitar duplicados.')
            return new Response(
              JSON.stringify({
                offline: true,
                message: 'Favorito guardado localmente. Se sincronizará al reconectar.',
              }),
              { status: 202, headers: { 'Content-Type': 'application/json' } }
            )
          }

          try {
            const bodyText = await request.clone().text()
            let bodyData = null
            if (bodyText) {
              try { bodyData = JSON.parse(bodyText) } catch { bodyData = bodyText }
            }

            const db = await openSyncDB()
            await saveSyncRequest(db, {
              url: request.url,
              method: request.method,
              headers: Object.fromEntries(request.headers.entries()),
              body: bodyData,
            })
            await self.registration.sync.register('sync-pokemon')

            return new Response(
              JSON.stringify({
                offline: true,
                message: 'Modo offline: tu acción se guardó y se sincronizará automáticamente cuando vuelva la conexión.',
              }),
              { status: 202, headers: { 'Content-Type': 'application/json' } }
            )
          } catch (syncErr) {
            console.error('[SW] Error configurando Background Sync:', syncErr)
            throw err
          }
        })
      )
      return
    }

    // Para GET de la API (ej. /api/users/me), SIEMPRE red directa.
    // Esto evita que usuarios distintos reciban la misma sesión cacheada al recargar.
    event.respondWith(fetch(request))
    return
  }

  // 2. Peticiones de recursos estáticos / navegación
  if (request.method !== 'GET' || !request.url.startsWith('http')) {
    return
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // Cache-first para assets y App Shell
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type === 'opaque') {
            return networkResponse
          }

          // Cache dinámico para recursos sin cachear
          const responseToCache = networkResponse.clone()
          caches.open(DYNAMIC_CACHE).then((cache) => cache.put(request, responseToCache))
          return networkResponse
        })
        .catch(() => {
          // Fallback offline puro para vistas HTML
          if (request.headers.get('accept')?.includes('text/html')) {
            return caches.match('/index.html')
          }
          return new Response('Recurso no disponible sin conexión.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        })
    })
  )
})

// ============================================================
// FASE 3 — SYNC: Background Sync para peticiones fallidas
// ============================================================
self.addEventListener('message', (event) => {
  if (event.data === 'FORCE_SYNC') {
    event.waitUntil(syncFailedRequests())
  }
})

self.addEventListener('sync', (event) => {
  console.log('[SW] Evento sync recibido:', event.tag)

  if (event.tag === 'sync-pokemon') {
    event.waitUntil(syncFailedRequests())
  }
})

async function syncFailedRequests() {
  try {
    const db = await openSyncDB()
    const requests = await getAllPendingRequests(db)

    console.log(`[SW] Sincronizando ${requests.length} petición(es) pendiente(s)...`)

    for (const record of requests) {
      try {
        const response = await fetch(record.url, {
          method: record.method,
          headers: record.headers || { 'Content-Type': 'application/json' },
          body: record.body ? JSON.stringify(record.body) : undefined,
        })

        if (response.ok) {
          await deleteRequest(db, record.id)
          console.log('[SW] Petición sincronizada y eliminada de IDB, id:', record.id)
        } else {
          console.warn('[SW] La petición falló en la re-ejecución, status:', response.status)
        }
      } catch (err) {
        console.error('[SW] Error re-ejecutando petición:', err)
        // Dejar en IDB para el próximo intento de sync
      }
    }
  } catch (err) {
    console.error('[SW] Error en syncFailedRequests:', err)
    throw err // Propagar para que Background Sync reintente
  }
}

// ---- Helpers IndexedDB (dentro del SW) ----
function openSyncDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('poke-sync-db', 2)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains('failed-requests')) {
        db.createObjectStore('failed-requests', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('pokemon-cache')) {
        db.createObjectStore('pokemon-cache', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('favorites-cache')) {
        db.createObjectStore('favorites-cache', { keyPath: 'pokemonId' })
      }
      if (!db.objectStoreNames.contains('team-cache')) {
        db.createObjectStore('team-cache', { keyPath: 'id' })
      }
    }
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

function getAllPendingRequests(db) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('failed-requests', 'readonly')
    const store = tx.objectStore('failed-requests')
    const request = store.getAll()
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

function saveSyncRequest(db, requestData) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('failed-requests', 'readwrite')
    const store = tx.objectStore('failed-requests')
    const request = store.add(requestData)
    request.onsuccess = () => resolve()
    request.onerror = (e) => reject(e.target.error)
  })
}

function deleteRequest(db, id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction('failed-requests', 'readwrite')
    const store = tx.objectStore('failed-requests')
    const request = store.delete(id)
    request.onsuccess = () => resolve()
    request.onerror = (e) => reject(e.target.error)
  })
}

// ============================================================
// FASE 4 — PUSH: Listener de notificaciones push
// ============================================================
self.addEventListener('push', (event) => {
  console.log('[SW] Notificación push recibida.')

  let data = {}
  if (event.data) {
    try {
      data = event.data.json()
    } catch {
      data = { type: 'generic', message: event.data.text() }
    }
  }

  let title = 'PokePWA'
  let body = 'Tienes una nueva notificación.'
  let icon = '/icons/icon-192x192.png'
  let badge = '/icons/icon-72x72.png'
  let tag = 'pokepwa-notification'

  // Lógica de contenido según el tipo de notificación
  if (data.type === 'invitacion-amistad') {
    title = '¡Solicitud de amistad! 🤝'
    body = data.message || '¡Alguien quiere ser tu amigo entrenador!'
    tag = 'amistad'
  } else if (data.type === 'reto-batalla') {
    title = '⚔️ ¡Reto a Batalla!'
    body = data.message || '¡Un entrenador te ha desafiado a una batalla Pokémon!'
    tag = 'batalla'
  }

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    vibrate: [200, 100, 200],
    data: {
      url: data.url || '/',
      type: data.type,
    },
    actions:
      data.type === 'reto-batalla'
        ? [
            { action: 'accept', title: '¡Aceptar reto!' },
            { action: 'decline', title: 'Rechazar' },
          ]
        : [{ action: 'view', title: 'Ver perfil' }],
  }

  event.waitUntil(
    self.registration.showNotification(title, notificationOptions).then(() => {
      // Broadcast to all clients so the in-app notification bell updates in real-time
      return self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PUSH_NOTIFICATION',
            payload: { title, body, tag, notificationType: data.type, message: data.message, url: data.url },
          })
        })
      })
    })
  )
})

// ============================================================
// FASE 4 — NOTIFICATIONCLICK: Interacción al tocar la notificación
// ============================================================
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notificación clickeada, acción:', event.action)

  event.notification.close()

  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Enfocar pestaña existente de la app si ya está abierta
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus()
        }
      }
      // Si no hay pestaña abierta, abrir una nueva
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    }),
  )
})
