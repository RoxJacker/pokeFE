/**
 * Auth Store — Pinia
 * Centralizes user authentication state and actions
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/api.js'

export const useAuthStore = defineStore('auth', () => {
  // ── State ─────────────────────────────────────────────
  const user = ref(null)
  const _token = ref(localStorage.getItem('pokepwa_token') || null)

  // Initialize from localStorage on load
  const saved = localStorage.getItem('pokepwa_user')
  if (saved) {
    try { user.value = JSON.parse(saved) } catch { localStorage.removeItem('pokepwa_user') }
  }

  // ── Getters ───────────────────────────────────────────
  const isLoggedIn = computed(() => !!_token.value)
  const token = computed(() => _token.value)

  // ── Actions ───────────────────────────────────────────
  function _setToken(t) {
    _token.value = t
    if (t) localStorage.setItem('pokepwa_token', t)
    else localStorage.removeItem('pokepwa_token')
  }

  function _persist(userData) {
    user.value = userData
    localStorage.setItem('pokepwa_user', JSON.stringify(userData))
  }

  async function login(email, password) {
    const { data } = await api.post('/api/auth/login', { email, password })
    _setToken(data.token)
    _persist(data.user)
    return data
  }

  async function register(username, email, password) {
    const { data } = await api.post('/api/auth/register', { username, email, password })
    _setToken(data.token)
    _persist(data.user)
    return data
  }

  function logout() {
    _setToken(null)
    localStorage.removeItem('pokepwa_user')
    user.value = null
  }

  async function fetchProfile() {
    try {
      const { data } = await api.get('/api/users/me')
      _persist(data.user)
      return data.user
    } catch { return null }
  }

  async function updateProfile(updates) {
    const { data } = await api.put('/api/users/me', updates)
    _persist(data.user)
    return data.user
  }

  async function toggleFavorite(pokemonId) {
    // Optimistic local update FIRST
    if (!user.value.favorites) user.value.favorites = []
    const idx = user.value.favorites.findIndex(f => f.pokemonId === pokemonId)
    const wasAdding = idx === -1
    if (idx !== -1) {
      user.value.favorites.splice(idx, 1)
    } else {
      user.value.favorites.push({ pokemonId, nickname: '', notes: '' })
    }
    _persist(user.value)

    try {
      const { data } = await api.post(`/api/users/me/favorites/${pokemonId}`)
      if (data.offline) {
        // SW queued it — keep optimistic state, mark for later sync
        return user.value.favorites
      }
      if (data.favorites) {
        // Server responded — use as source of truth
        user.value.favorites = data.favorites
        _persist(user.value)
      }
      return user.value.favorites
    } catch {
      // Network error not caught by SW — keep the optimistic state
      return user.value.favorites
    }
  }

  async function updateFavoriteCharacteristics(pokemonId, updates) {
    try {
      const { data } = await api.put(`/api/users/me/favorites/${pokemonId}`, updates)
      if (data.favorite) {
        const idx = user.value.favorites.findIndex(f => f.pokemonId === pokemonId)
        if (idx !== -1) {
          user.value.favorites[idx] = data.favorite
          localStorage.setItem('pokepwa_user', JSON.stringify(user.value))
        }
        return data.favorite
      }
    } catch {
      // Optimistic: update locally even if offline
      const idx = user.value.favorites.findIndex(f => f.pokemonId === pokemonId)
      if (idx !== -1) {
        Object.assign(user.value.favorites[idx], updates)
        localStorage.setItem('pokepwa_user', JSON.stringify(user.value))
      }
    }
    return updates
  }

  return {
    user,
    isLoggedIn,
    token,
    login,
    register,
    logout,
    fetchProfile,
    updateProfile,
    toggleFavorite,
    updateFavoriteCharacteristics,
  }
})
