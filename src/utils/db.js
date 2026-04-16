/**
 * db.js — IndexedDB wrapper para PokePWA
 * Stores: failed-requests (background sync), pokemon-cache, favorites-cache, team-cache
 */

const DB_NAME = 'poke-sync-db'
const DB_VERSION = 2
const STORE_REQUESTS = 'failed-requests'
const STORE_POKEMON = 'pokemon-cache'
const STORE_FAVORITES = 'favorites-cache'
const STORE_TEAM = 'team-cache'

/**
 * Abre (o crea) la base de datos IndexedDB.
 * @returns {Promise<IDBDatabase>}
 */
export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_REQUESTS)) {
        db.createObjectStore(STORE_REQUESTS, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(STORE_POKEMON)) {
        db.createObjectStore(STORE_POKEMON, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_FAVORITES)) {
        db.createObjectStore(STORE_FAVORITES, { keyPath: 'pokemonId' })
      }
      if (!db.objectStoreNames.contains(STORE_TEAM)) {
        db.createObjectStore(STORE_TEAM, { keyPath: 'id' })
      }
    }

    request.onsuccess = (event) => resolve(event.target.result)
    request.onerror = (event) => reject(event.target.error)
  })
}

// ── Failed Requests (Background Sync) ───────────────────

export async function saveRequest(payload) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REQUESTS, 'readwrite')
    const store = tx.objectStore(STORE_REQUESTS)
    const record = {
      url: payload.url,
      method: payload.method || 'POST',
      headers: payload.headers || { 'Content-Type': 'application/json' },
      body: payload.body || null,
      timestamp: new Date().toISOString(),
    }
    const req = store.add(record)
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function getAllRequests() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REQUESTS, 'readonly')
    const store = tx.objectStore(STORE_REQUESTS)
    const req = store.getAll()
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

export async function deleteRequest(id) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_REQUESTS, 'readwrite')
    const store = tx.objectStore(STORE_REQUESTS)
    const req = store.delete(id)
    req.onsuccess = () => resolve()
    req.onerror = (e) => reject(e.target.error)
  })
}

// ── Pokemon Cache ───────────────────────────────────────

export async function cachePokemonList(pokemonArray) {
  const db = await openDB()
  const tx = db.transaction(STORE_POKEMON, 'readwrite')
  const store = tx.objectStore(STORE_POKEMON)
  for (const p of pokemonArray) {
    store.put(p)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

export async function getCachedPokemonList() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_POKEMON, 'readonly')
    const store = tx.objectStore(STORE_POKEMON)
    const req = store.getAll()
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

// ── Favorites Cache ─────────────────────────────────────

export async function cacheFavorites(favoritesArray) {
  const db = await openDB()
  const tx = db.transaction(STORE_FAVORITES, 'readwrite')
  const store = tx.objectStore(STORE_FAVORITES)
  store.clear()
  for (const f of favoritesArray) {
    store.put(f)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

export async function getCachedFavorites() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FAVORITES, 'readonly')
    const store = tx.objectStore(STORE_FAVORITES)
    const req = store.getAll()
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

// ── Team Cache ──────────────────────────────────────────

export async function cacheTeam(teamArray) {
  const db = await openDB()
  const tx = db.transaction(STORE_TEAM, 'readwrite')
  const store = tx.objectStore(STORE_TEAM)
  store.clear()
  for (const p of teamArray) {
    store.put(p)
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = (e) => reject(e.target.error)
  })
}

export async function getCachedTeam() {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_TEAM, 'readonly')
    const store = tx.objectStore(STORE_TEAM)
    const req = store.getAll()
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = (e) => reject(e.target.error)
  })
}

