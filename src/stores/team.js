/**
 * Team Store — Pinia
 * Manages the user's battle team
 */

import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../utils/api.js'
import { cacheTeam, getCachedTeam } from '../utils/db.js'

export const useTeamStore = defineStore('team', () => {
  const team = ref([])
  const loading = ref(false)
  const MAX_TEAM = 6

  const isFull = computed(() => team.value.length >= MAX_TEAM)

  async function loadTeam() {
    loading.value = true
    try {
      const { data } = await api.get('/api/teams/me')
      team.value = data.team || []
      try { await cacheTeam(team.value) } catch {}
    } catch (err) {
      console.error('Error cargando equipo:', err)
      // Offline fallback
      try {
        const cached = await getCachedTeam()
        if (cached.length) team.value = cached
      } catch {}
    } finally {
      loading.value = false
    }
  }

  async function saveTeam() {
    await api.put('/api/teams/me', { team: team.value })
    try { await cacheTeam(team.value) } catch {}
  }

  function addToTeam(pokemon) {
    if (isFull.value) return false
    if (team.value.find(p => p.id === pokemon.id)) return false
    team.value.push(pokemon)
    return true
  }

  function removeFromTeam(pokemonId) {
    team.value = team.value.filter(p => p.id !== pokemonId)
  }

  return { team, loading, MAX_TEAM, isFull, loadTeam, saveTeam, addToTeam, removeFromTeam }
})
