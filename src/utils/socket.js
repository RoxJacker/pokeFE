/**
 * socket.js — Socket.io client singleton for PokePWA
 * Connects to the backend using the same auth token as REST API
 */

import { io } from 'socket.io-client'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

let socket = null

/**
 * Connect to the Socket.io server.
 * Uses the same base64 token stored in localStorage.
 */
export function connectSocket() {
  if (socket?.connected) return socket

  const token = localStorage.getItem('pokepwa_token')
  if (!token) {
    console.warn('[Socket] No hay token — no se puede conectar.')
    return null
  }

  socket = io(API_URL, {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })

  socket.on('connect', () => {
    console.log('[Socket] ✔ Conectado:', socket.id)
  })

  socket.on('connect_error', (err) => {
    console.error('[Socket] Error de conexión:', err.message)
  })

  socket.on('disconnect', (reason) => {
    console.log('[Socket] ✖ Desconectado:', reason)
  })

  socket.on('error', (data) => {
    console.error('[Socket] Error del servidor:', data.message)
  })

  return socket
}

/**
 * Get the current socket instance (connect if needed).
 */
export function getSocket() {
  if (!socket || !socket.connected) {
    return connectSocket()
  }
  return socket
}

/**
 * Disconnect the socket completely.
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
    console.log('[Socket] Socket desconectado manualmente.')
  }
}
