/**
 * auth.js — Authentication helpers
 */

import api from './api.js'
import { ref } from 'vue'

export const currentUser = ref(null)

// Initialize from localStorage on load
const saved = localStorage.getItem('pokepwa_user')
if (saved) {
  try {
    currentUser.value = JSON.parse(saved)
  } catch {
    localStorage.removeItem('pokepwa_user')
  }
}

export function isLoggedIn() {
  return !!localStorage.getItem('pokepwa_token')
}

export function getToken() {
  return localStorage.getItem('pokepwa_token')
}

export async function register(username, email, password) {
  const { data } = await api.post('/api/auth/register', { username, email, password })
  localStorage.setItem('pokepwa_token', data.token)
  localStorage.setItem('pokepwa_user', JSON.stringify(data.user))
  currentUser.value = data.user
  return data
}

export async function login(email, password) {
  const { data } = await api.post('/api/auth/login', { email, password })
  localStorage.setItem('pokepwa_token', data.token)
  localStorage.setItem('pokepwa_user', JSON.stringify(data.user))
  currentUser.value = data.user
  return data
}

export function logout() {
  localStorage.removeItem('pokepwa_token')
  localStorage.removeItem('pokepwa_user')
  currentUser.value = null
}

export async function fetchProfile() {
  try {
    const { data } = await api.get('/api/users/me')
    currentUser.value = data.user
    localStorage.setItem('pokepwa_user', JSON.stringify(data.user))
    return data.user
  } catch {
    return null
  }
}

export async function updateProfile(updates) {
  const { data } = await api.put('/api/users/me', updates)
  currentUser.value = data.user
  localStorage.setItem('pokepwa_user', JSON.stringify(data.user))
  return data.user
}

export async function toggleFavorite(pokemonId) {
  const { data } = await api.post(`/api/users/me/favorites/${pokemonId}`)
  currentUser.value.favorites = data.favorites
  localStorage.setItem('pokepwa_user', JSON.stringify(currentUser.value))
  return data.favorites
}

export async function updateFavoriteCharacteristics(pokemonId, updates) {
  const { data } = await api.put(`/api/users/me/favorites/${pokemonId}`, updates)
  const idx = currentUser.value.favorites.findIndex(f => f.pokemonId === pokemonId)
  if (idx !== -1) {
    currentUser.value.favorites[idx] = data.favorite
    localStorage.setItem('pokepwa_user', JSON.stringify(currentUser.value))
  }
  return data.favorite
}
