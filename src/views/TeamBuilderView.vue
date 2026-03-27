<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import api from '../utils/api.js'
import TypeBadge from '../components/TypeBadge.vue'

const team = ref([])
const searchQuery = ref('')
const searchResults = ref([])
const searching = ref(false)
const loading = ref(true)
const saving = ref(false)
const saveMsg = ref('')

let debounceTimer = null

const MAX_TEAM = 6
const isFull = computed(() => team.value.length >= MAX_TEAM)

// Fetch current team from backend
async function loadTeam() {
  try {
    const { data } = await api.get('/api/teams/me')
    team.value = data.team || []
  } catch (err) {
    console.error('Error cargando equipo:', err)
  } finally {
    loading.value = false
  }
}

// Search PokeAPI
function handleSearch(e) {
  const query = e.target.value.trim().toLowerCase()
  searchQuery.value = query

  clearTimeout(debounceTimer)
  if (!query) {
    searchResults.value = []
    return
  }

  debounceTimer = setTimeout(async () => {
    searching.value = true
    try {
      // Try exact match first
      const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${query}`)
      searchResults.value = [formatPokemon(data)]
    } catch {
      // If not found by exact, search by prefix in list
      try {
        const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon?limit=50&offset=0`)
        const matches = data.results.filter((p) => p.name.includes(query)).slice(0, 8)
        const details = await Promise.all(
          matches.map((p) => axios.get(p.url).then((r) => formatPokemon(r.data))),
        )
        searchResults.value = details
      } catch {
        searchResults.value = []
      }
    } finally {
      searching.value = false
    }
  }, 400)
}

function formatPokemon(p) {
  return {
    id: p.id,
    name: p.name,
    sprite:
      p.sprites?.other?.['official-artwork']?.front_default ||
      p.sprites?.front_default,
    types: p.types.map((t) => t.type.name),
  }
}

function addToTeam(pokemon) {
  if (isFull.value) return
  if (team.value.find((p) => p.id === pokemon.id)) return

  team.value.push(pokemon)
  searchQuery.value = ''
  searchResults.value = []
}

function removeFromTeam(pokemonId) {
  team.value = team.value.filter((p) => p.id !== pokemonId)
}

async function saveTeam() {
  saving.value = true
  saveMsg.value = ''
  try {
    await api.put('/api/teams/me', { team: team.value })
    saveMsg.value = '¡Equipo guardado! ✅'
    setTimeout(() => (saveMsg.value = ''), 3000)
  } catch (err) {
    saveMsg.value = err.response?.data?.error || 'Error al guardar.'
  } finally {
    saving.value = false
  }
}

onMounted(loadTeam)
</script>

<template>
  <section class="team-page">
    <div class="container">
      <h1 class="page-title">Constructor de equipo</h1>
      <p class="page-subtitle">Elige hasta 6 Pokémon para tu equipo.</p>

      <!-- Current Team -->
      <div class="team-card">
        <div class="team-header">
          <h2>Mi equipo <span class="team-count">{{ team.length }}/{{ MAX_TEAM }}</span></h2>
          <button
            class="btn btn-primary"
            :disabled="saving || !team.length"
            @click="saveTeam"
          >
            {{ saving ? 'Guardando...' : '💾 Guardar equipo' }}
          </button>
        </div>

        <div v-if="saveMsg" class="save-msg">{{ saveMsg }}</div>

        <div v-if="loading" class="loading-state">Cargando equipo...</div>

        <div v-else-if="!team.length" class="empty-team">
          <p>Tu equipo está vacío. ¡Busca Pokémon abajo para agregarlo!</p>
        </div>

        <div v-else class="team-grid">
          <div v-for="p in team" :key="p.id" class="team-slot">
            <button class="remove-btn" @click="removeFromTeam(p.id)" title="Quitar del equipo">✕</button>
            <img :src="p.sprite" :alt="p.name" class="slot-sprite" />
            <span class="slot-name">{{ p.name }}</span>
            <div class="slot-types">
              <TypeBadge v-for="t in p.types" :key="t" :type="t" />
            </div>
          </div>

          <!-- Empty slots -->
          <div v-for="n in (MAX_TEAM - team.length)" :key="'empty-' + n" class="team-slot empty">
            <div class="empty-icon">+</div>
            <span class="slot-name">Vacío</span>
          </div>
        </div>
      </div>

      <!-- Search -->
      <div class="search-card" v-if="!isFull">
        <h2>Buscar Pokémon</h2>
        <div class="search-input-wrapper">
          <input
            :value="searchQuery"
            @input="handleSearch"
            placeholder="Buscar por nombre o número..."
            class="search-input"
          />
        </div>

        <div v-if="searching" class="search-loading">Buscando...</div>

        <div v-if="searchResults.length" class="search-results-grid">
          <div
            v-for="p in searchResults"
            :key="p.id"
            class="result-item"
            :class="{ disabled: team.find(t => t.id === p.id) }"
            @click="addToTeam(p)"
          >
            <img :src="p.sprite" :alt="p.name" class="result-sprite" />
            <div class="result-info">
              <span class="result-name">{{ p.name }}</span>
              <div class="result-types">
                <TypeBadge v-for="t in p.types" :key="t" :type="t" />
              </div>
            </div>
            <span class="add-label" v-if="!team.find(t => t.id === p.id)">+ Agregar</span>
            <span class="added-label" v-else>✓ En equipo</span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.team-page { padding-bottom: var(--space-16); }
.page-title { font-size: var(--font-2xl); font-weight: 800; }
.page-subtitle { color: var(--gray-500); margin-bottom: var(--space-6); }

.team-card {
  background: var(--white); border-radius: var(--radius-xl); padding: var(--space-8);
  box-shadow: var(--shadow-md); margin-bottom: var(--space-8);
}

.team-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-6); }
.team-header h2 { font-size: var(--font-lg); font-weight: 700; display: flex; align-items: center; gap: var(--space-3); }
.team-count { font-size: var(--font-sm); color: var(--purple-main); background: var(--lavender-soft); padding: 2px 12px; border-radius: var(--radius-full); font-weight: 700; }

.save-msg {
  padding: var(--space-3) var(--space-5); background: var(--lavender-soft); border-radius: var(--radius-md);
  color: var(--purple-main); font-weight: 600; text-align: center; margin-bottom: var(--space-4);
}

.team-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--space-4);
}

.team-slot {
  background: var(--lavender-soft); border-radius: var(--radius-lg); padding: var(--space-5) var(--space-4);
  text-align: center; position: relative; display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
  transition: transform var(--transition-base); animation: scaleIn 0.3s ease;
}

.team-slot.empty {
  background: var(--gray-100); border: 2px dashed var(--gray-300);
}

.empty-icon { font-size: var(--font-2xl); color: var(--gray-300); font-weight: 300; margin-bottom: var(--space-2); }

.remove-btn {
  position: absolute; top: 8px; right: 8px; width: 24px; height: 24px;
  border-radius: var(--radius-full); background: var(--danger); color: var(--white);
  font-size: var(--font-xs); display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity var(--transition-fast); cursor: pointer;
}
.team-slot:hover .remove-btn { opacity: 1; }

.slot-sprite { width: 72px; height: 72px; object-fit: contain; }
.slot-name { font-weight: 700; text-transform: capitalize; font-size: var(--font-sm); }
.slot-types { display: flex; gap: var(--space-1); flex-wrap: wrap; justify-content: center; }

.empty-team { text-align: center; padding: var(--space-8); color: var(--gray-500); }
.loading-state { text-align: center; padding: var(--space-8); color: var(--gray-500); }

/* Search */
.search-card {
  background: var(--white); border-radius: var(--radius-xl); padding: var(--space-8); box-shadow: var(--shadow-md);
}
.search-card h2 { font-size: var(--font-lg); font-weight: 700; margin-bottom: var(--space-4); }

.search-input-wrapper { margin-bottom: var(--space-4); }
.search-input {
  width: 100%; padding: var(--space-3) var(--space-5); border: 2px solid var(--gray-200);
  border-radius: var(--radius-full); font-size: var(--font-base); font-family: var(--font-family);
}
.search-input:focus { border-color: var(--purple-main); outline: none; box-shadow: 0 0 0 3px rgba(93,63,211,0.12); }

.search-loading { text-align: center; padding: var(--space-4); color: var(--gray-500); }

.search-results-grid { display: flex; flex-direction: column; gap: var(--space-3); }

.result-item {
  display: flex; align-items: center; gap: var(--space-4); padding: var(--space-3) var(--space-5);
  background: var(--bg-base); border-radius: var(--radius-lg); cursor: pointer;
  transition: all var(--transition-fast);
}
.result-item:hover:not(.disabled) { background: var(--lavender-soft); transform: translateX(4px); }
.result-item.disabled { opacity: 0.5; cursor: not-allowed; }

.result-sprite { width: 56px; height: 56px; object-fit: contain; }
.result-info { flex: 1; }
.result-name { font-weight: 700; text-transform: capitalize; display: block; }
.result-types { display: flex; gap: var(--space-1); margin-top: var(--space-1); }

.add-label { font-size: var(--font-sm); color: var(--green-leaf); font-weight: 700; }
.added-label { font-size: var(--font-sm); color: var(--gray-500); font-weight: 600; }
</style>
