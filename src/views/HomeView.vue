<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'
import PokemonCard from '../components/PokemonCard.vue'
import SearchBar from '../components/SearchBar.vue'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'
import { cachePokemonList, getCachedPokemonList } from '../utils/db.js'

const allPokemon = ref([])
const searchQuery = ref('')
const loading = ref(true)
const loadingMore = ref(false)
const offset = ref(0)
const limit = 20
const totalCount = ref(0)
const searchResult = ref(null)
const searchError = ref(false)

const allTypes = ref([])
const allRegions = ref([])

const typeFilter1 = ref('')
const typeFilter2 = ref('')
const regionFilter = ref('')
const validIds = ref(null)

const extractId = (url) => parseInt(url.split('/').filter(Boolean).pop(), 10)

async function fetchMetadata() {
  try {
    const [typesRes, genRes] = await Promise.all([
      axios.get('https://pokeapi.co/api/v2/type'),
      axios.get('https://pokeapi.co/api/v2/generation')
    ])
    // Filter out unknown/shadow types
    allTypes.value = typesRes.data.results.filter(t => t.name !== 'unknown' && t.name !== 'shadow')
    allRegions.value = genRes.data.results
  } catch(e) { console.error('Error fetching metadata', e) }
}

async function applyFilters() {
  loading.value = true
  offset.value = 0
  allPokemon.value = []
  
  if (!typeFilter1.value && !typeFilter2.value && !regionFilter.value) {
    validIds.value = null
    await fetchPokemonPage()
    return
  }
  
  try {
    let arraysToIntersect = []
    
    if (typeFilter1.value) {
      const { data } = await axios.get(`https://pokeapi.co/api/v2/type/${typeFilter1.value}`)
      arraysToIntersect.push(data.pokemon.map(p => extractId(p.pokemon.url)))
    }
    if (typeFilter2.value) {
      const { data } = await axios.get(`https://pokeapi.co/api/v2/type/${typeFilter2.value}`)
      arraysToIntersect.push(data.pokemon.map(p => extractId(p.pokemon.url)))
    }
    if (regionFilter.value) {
      const { data } = await axios.get(`https://pokeapi.co/api/v2/generation/${regionFilter.value}`)
      arraysToIntersect.push(data.pokemon_species.map(s => extractId(s.url)))
    }
    
    // Intersect IDs
    let finalIds = arraysToIntersect[0]
    for (let i = 1; i < arraysToIntersect.length; i++) {
      const set = new Set(arraysToIntersect[i])
      finalIds = finalIds.filter(id => set.has(id))
    }
    
    finalIds.sort((a,b) => a - b)
    validIds.value = finalIds
    totalCount.value = finalIds.length
    
    await fetchPokemonPage()
  } catch (err) {
    console.error('Error applying filters', err)
    loading.value = false
  }
}

// Fetch list of pokemon with full details
async function fetchPokemonPage() {
  try {
    let urlsToFetch = []
    
    if (validIds.value === null) {
      const { data } = await axios.get(
        `https://pokeapi.co/api/v2/pokemon?limit=${limit}&offset=${offset.value}`,
      )
      totalCount.value = data.count
      urlsToFetch = data.results.map(p => p.url)
    } else {
      const slice = validIds.value.slice(offset.value, offset.value + limit)
      urlsToFetch = slice.map(id => `https://pokeapi.co/api/v2/pokemon/${id}`)
    }

    // Fetch details for each pokemon in parallel
    const details = await Promise.all(
      urlsToFetch.map((url) => axios.get(url).then((r) => r.data).catch(() => null)),
    )

    const fetched = details.filter(Boolean)
    allPokemon.value.push(...fetched)

    // Cache fetched pokemon in IndexedDB
    try { await cachePokemonList(fetched) } catch {}
  } catch (err) {
    console.error('[Home] Error cargando Pokémon:', err)
    // Offline fallback: load from IndexedDB cache
    if (allPokemon.value.length === 0) {
      try {
        const cached = await getCachedPokemonList()
        if (cached.length) {
          allPokemon.value = cached
          totalCount.value = cached.length
        }
      } catch {}
    }
  }
}

async function loadMore() {
  loadingMore.value = true
  offset.value += limit
  await fetchPokemonPage()
  loadingMore.value = false
}

async function handleSearch(query) {
  const cleanQuery = query.toLowerCase().trim()
  searchQuery.value = cleanQuery
  searchError.value = false
  searchResult.value = null

  if (!cleanQuery) return

  try {
    const { data } = await axios.get(
      `https://pokeapi.co/api/v2/pokemon/${cleanQuery}`,
    )
    searchResult.value = data
  } catch {
    searchError.value = true
  }
}

function clearSearch() {
  searchQuery.value = ''
  searchResult.value = null
  searchError.value = false
}

const hasMore = computed(() => {
  if (validIds.value === null) return allPokemon.value.length < totalCount.value
  return offset.value + limit < validIds.value.length
})

onMounted(async () => {
  await fetchMetadata()
  await fetchPokemonPage()
  loading.value = false
})
</script>

<template>
  <section class="home">
    <div class="container">
      <!-- Hero Header Image -->
      <div class="hero">
        <img src="https://upload.wikimedia.org/wikipedia/commons/9/98/International_Pok%C3%A9mon_logo.svg" alt="Pokémon" class="hero-logo" />
        <div class="search-filters-container">
          <!-- Integrando buscador en el mismo estilo de píldora -->
          <div class="pill-search">
            <SearchBar v-model="searchQuery" @search="handleSearch" @clear="clearSearch" style="width:100%" />
          </div>
          
          <div class="advanced-filters">
            <div class="pill-select-wrapper">
              <select class="filter-select" v-model="typeFilter1" @change="applyFilters" :disabled="searchQuery">
                <option value="">Tipo de pokemon ▾</option>
              <option v-for="t in allTypes" :key="t.name" :value="t.name">{{ t.name }}</option>
            </select>
            <select class="filter-select" v-model="typeFilter2" @change="applyFilters" :disabled="searchQuery">
              <option value="">Cualquier Tipo 2</option>
              <option v-for="t in allTypes" :key="t.name" :value="t.name">{{ t.name }}</option>
              </select>
            <select class="filter-select" v-model="regionFilter" @change="applyFilters" :disabled="searchQuery">
              <option value="">Cualquier Región</option>
              <option v-for="r in allRegions" :key="r.name" :value="r.name">{{ r.name }}</option>
            </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Search Result -->
      <div v-if="searchQuery && searchResult" class="search-results">
        <h2 class="section-title">Resultado de búsqueda</h2>
        <div class="pokemon-grid single">
          <PokemonCard :pokemon="searchResult" />
        </div>
        <button class="btn btn-outline" @click="clearSearch" style="margin-top: var(--space-4)">
          ← Volver a la lista
        </button>
      </div>

      <!-- Search Error -->
      <div v-else-if="searchQuery && searchError" class="search-error">
        <p class="error-emoji">😕</p>
        <h2>Pokémon no encontrado</h2>
        <p>No se encontró un Pokémon con el nombre o número "<strong>{{ searchQuery }}</strong>"</p>
        <button class="btn btn-outline" @click="clearSearch">
          ← Volver a la lista
        </button>
      </div>

      <!-- Pokemon Grid -->
      <div v-else>
        <h2 class="section-title">
          Pokédex
          <span class="section-count" v-if="!loading">{{ allPokemon.length }} / {{ totalCount }}</span>
        </h2>

        <LoadingSkeleton v-if="loading" :count="20" />

        <div v-else class="pokemon-grid">
          <PokemonCard
            v-for="pokemon in allPokemon"
            :key="pokemon.id"
            :pokemon="pokemon"
            :style="{ animationDelay: `${(pokemon.id % 20) * 30}ms` }"
          />
        </div>

        <!-- Load More -->
        <div v-if="!loading && hasMore" class="load-more">
          <button
            class="btn btn-primary"
            :disabled="loadingMore"
            @click="loadMore"
          >
            <template v-if="loadingMore">
              <span class="spinner"></span> Cargando...
            </template>
            <template v-else>
              Cargar más Pokémon
            </template>
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.home {
  padding-bottom: var(--space-16);
}

/* ── Hero ─────────────────────────────────────────────── */
.hero {
  text-align: center;
  padding: var(--space-8) 0 var(--space-12);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
}

.hero-logo {
  height: 120px;
  object-fit: contain;
  margin-bottom: var(--space-4);
  filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));
}

.search-filters-container {
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: var(--space-6);
  width: 100%;
  max-width: 900px;
  align-items: center;
}

.pill-search, .pill-select-wrapper {
  flex: 1;
  background: var(--lavender-soft);
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  padding: 4px;
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);
}

.advanced-filters {
  display: flex;
  flex: 1;
}

.filter-select {
  background: transparent;
  color: var(--gray-700);
  font-family: inherit;
  font-size: var(--font-base);
  font-weight: 600;
  outline: none;
  cursor: pointer;
  text-transform: capitalize;
  width: 100%;
}
.filter-select:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Section ──────────────────────────────────────────── */
.section-title {
  font-size: var(--font-xl);
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: var(--space-6);
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.section-count {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--gray-500);
  background: var(--lavender-soft);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
}

/* ── Grid ─────────────────────────────────────────────── */
.pokemon-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-6);
}

.pokemon-grid.single {
  max-width: 260px;
}

/* ── Load More ────────────────────────────────────────── */
.load-more {
  display: flex;
  justify-content: center;
  padding: var(--space-10) 0;
}

.spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: var(--radius-full);
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Search Error ─────────────────────────────────────── */
.search-error {
  text-align: center;
  padding: var(--space-12) 0;
  color: var(--gray-700);
}

.error-emoji {
  font-size: 4rem;
  margin-bottom: var(--space-4);
}

.search-error h2 {
  font-size: var(--font-xl);
  margin-bottom: var(--space-2);
}

.search-error p {
  color: var(--gray-500);
  margin-bottom: var(--space-4);
}

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 640px) {
  .hero-title {
    font-size: var(--font-2xl);
  }

  .pokemon-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: var(--space-4);
  }
}
</style>
