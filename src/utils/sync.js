/**
 * sync.js — Wrapper fetch con soporte de Background Sync
 * Usa IndexedDB para guardar peticiones fallidas y registra
 * una tarea 'sync-pokemon' cuando no hay conexión.
 */

import { saveRequest } from './db.js'

/**
 * Realiza un fetch y, si falla por red, guarda la petición en
 * IndexedDB y registra un Background Sync tag.
 *
 * Úsalo en lugar de fetch/axios para peticiones POST/PUT críticas.
 *
 * @param {string} url
 * @param {RequestInit} options
 * @returns {Promise<Response>}
 *
 * @example
 *   import { fetchWithSync } from '@/utils/sync.js'
 *   await fetchWithSync('/api/pokemon', { method: 'POST', body: JSON.stringify(data) })
 */
export async function fetchWithSync(url, options = {}) {
  try {
    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response
  } catch (error) {
    console.warn('[Sync] Petición fallida, guardando en IDB...', error.message)

    // Serializar el body si viene como string/objeto
    let body = null
    if (options.body) {
      try {
        body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body
      } catch {
        body = options.body
      }
    }

    // Guardar en IndexedDB para el posterior Background Sync
    await saveRequest({
      url,
      method: options.method || 'POST',
      headers: options.headers || { 'Content-Type': 'application/json' },
      body,
    })

    // Registrar la tarea de sync si el SW está disponible
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      try {
        const registration = window.swRegistration || (await navigator.serviceWorker.ready)
        await registration.sync.register('sync-pokemon')
        console.log('[Sync] Background Sync registrado: "sync-pokemon"')
      } catch (syncError) {
        console.warn('[Sync] No se pudo registrar Background Sync:', syncError)
      }
    } else {
      console.warn('[Sync] Background Sync no soportado en este navegador.')
    }

    // Re-lanzar el error para que el componente pueda mostrarlo si quiere
    throw error
  }
}
