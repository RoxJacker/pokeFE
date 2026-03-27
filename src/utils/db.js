/**
 * db.js — IndexedDB wrapper para PokePWA
 * Almacena peticiones HTTP fallidas para Background Sync (Fase 3)
 */

const DB_NAME = 'poke-sync-db'
const DB_VERSION = 1
const STORE_NAME = 'failed-requests'

/**
 * Abre (o crea) la base de datos IndexedDB.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true })
        console.log('[IDB] Object store "failed-requests" creado.')
      }
    }

    request.onsuccess = (event) => {
      console.log('[IDB] Base de datos abierta correctamente.')
      resolve(event.target.result)
    }

    request.onerror = (event) => {
      console.error('[IDB] Error al abrir la base de datos:', event.target.error)
      reject(event.target.error)
    }
  })
}

/**
 * Guarda una petición fallida en IndexedDB.
 * @param {{ url: string, method: string, headers?: object, body?: any }} payload
 * @returns {Promise<number>} ID del registro insertado
 */
export async function saveRequest(payload) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const record = {
      url: payload.url,
      method: payload.method || 'POST',
      headers: payload.headers || { 'Content-Type': 'application/json' },
      body: payload.body || null,
      timestamp: new Date().toISOString(),
    }
    const request = store.add(record)
    request.onsuccess = (e) => {
      console.log('[IDB] Petición guardada con id:', e.target.result)
      resolve(e.target.result)
    }
    request.onerror = (e) => {
      console.error('[IDB] Error al guardar la petición:', e.target.error)
      reject(e.target.error)
    }
  })
}

/**
 * Obtiene todas las peticiones pendientes de IndexedDB.
 * @returns {Promise<Array>}
 */
export async function getAllRequests() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    request.onsuccess = (e) => resolve(e.target.result)
    request.onerror = (e) => reject(e.target.error)
  })
}

/**
 * Elimina un registro por su ID tras sincronización exitosa.
 * @param {number} id
 * @returns {Promise<void>}
 */
export async function deleteRequest(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(id)
    request.onsuccess = () => {
      console.log('[IDB] Registro eliminado, id:', id)
      resolve()
    }
    request.onerror = (e) => {
      console.error('[IDB] Error al eliminar el registro:', e.target.error)
      reject(e.target.error)
    }
  })
}
