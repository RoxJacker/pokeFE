<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import axios from 'axios'
import TypeBadge from '../components/TypeBadge.vue'
import StatBar from '../components/StatBar.vue'

const route = useRoute()
const router = useRouter()

const pokemon = ref(null)
const speciesInfo = ref(null)
const evolutionChain = ref([])
const loading = ref(true)
const error = ref(false)

const statLabels = {
  hp: 'HP',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'At. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidad',
}

async function fetchPokemon(id) {
  loading.value = true
  error.value = false
  pokemon.value = null
  speciesInfo.value = null
  evolutionChain.value = []
  
  try {
    const { data } = await axios.get(`https://pokeapi.co/api/v2/pokemon/${id}`)
    pokemon.value = data
    
    // Fetch species
    if (data.species?.url) {
      const speciesRes = await axios.get(data.species.url)
      speciesInfo.value = speciesRes.data
      
      // Fetch evolution chain
      if (speciesRes.data.evolution_chain?.url) {
        const evoRes = await axios.get(speciesRes.data.evolution_chain.url)
        evolutionChain.value = parseEvolutionChain(evoRes.data.chain)
      }
    }
  } catch (err) {
    console.error(err)
    error.value = true
  } finally {
    loading.value = false
  }
}

function parseEvolutionChain(chain) {
  const evos = []
  const traverse = (node) => {
    if (!node || !node.species) return
    const parts = node.species.url.split('/').filter(Boolean)
    const id = parseInt(parts[parts.length - 1], 10)
    evos.push({ id, name: node.species.name })
    node.evolves_to.forEach(traverse)
  }
  traverse(chain)
  // Ensure unique elements in case of branching edge cases
  const uniqueEvos = Array.from(new Map(evos.map(e => [e.id, e])).values())
  return uniqueEvos
}

const getFlavorText = () => {
  if (!speciesInfo.value) return ''
  const entries = speciesInfo.value.flavor_text_entries || []
  const esEntry = entries.find(e => e.language.name === 'es') || entries.find(e => e.language.name === 'en')
  return esEntry ? esEntry.flavor_text.replace(/\f/g, ' ') : ''
}

const artworkUrl = (p) =>
  p.sprites?.other?.['official-artwork']?.front_default ||
  p.sprites?.front_default

const padId = (id) => String(id).padStart(3, '0')
const formatHeight = (h) => (h / 10).toFixed(1) + ' m'
const formatWeight = (w) => (w / 10).toFixed(1) + ' kg'

function goBack() {
  router.push('/')
}

function navigate(direction) {
  const currentId = pokemon.value?.id
  if (!currentId) return
  const newId = currentId + direction
  if (newId > 0) {
    router.push(`/pokemon/${newId}`)
  }
}

onMounted(() => fetchPokemon(route.params.id))

watch(() => route.params.id, (newId) => {
  if (newId) fetchPokemon(newId)
})
</script>

<template>
  <section class="detail-page">
    <div class="container">
      <!-- Back Button -->
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"/>
          <polyline points="12 19 5 12 12 5"/>
        </svg>
        Volver al Pokédex
      </button>

      <!-- Loading -->
      <div v-if="loading" class="detail-loading">
        <div class="spinner-large"></div>
        <p>Cargando Pokémon...</p>
      </div>

      <!-- Error -->
      <div v-else-if="error" class="detail-error">
        <p class="error-emoji">😵</p>
        <h2>No se pudo cargar el Pokémon</h2>
        <button class="btn btn-primary" @click="goBack">Volver al Pokédex</button>
      </div>

      <!-- Pokemon Detail -->
      <div v-else-if="pokemon" class="detail-content">
        <!-- Header Card -->
        <div class="detail-card">
          <div class="detail-header">
            <div class="detail-image-section">
              <div class="detail-image-bg">
                <img :src="artworkUrl(pokemon)" :alt="pokemon.name" class="detail-image" />
              </div>
            </div>
            <div class="detail-info">
              <span class="detail-id">#{{ padId(pokemon.id) }}</span>
              <h1 class="detail-name">{{ pokemon.name }}</h1>
              <div class="detail-types">
                <TypeBadge v-for="t in pokemon.types" :key="t.type.name" :type="t.type.name" />
              </div>
              <p class="flavor-text" v-if="speciesInfo">{{ getFlavorText() }}</p>
              <div class="detail-measures">
                <div class="measure">
                  <span class="measure-label">Altura</span>
                  <span class="measure-value">{{ formatHeight(pokemon.height) }}</span>
                </div>
                <div class="measure">
                  <span class="measure-label">Peso</span>
                  <span class="measure-value">{{ formatWeight(pokemon.weight) }}</span>
                </div>
                <div class="measure">
                  <span class="measure-label">Experiencia</span>
                  <span class="measure-value">{{ pokemon.base_experience }} XP</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Stats Card -->
        <div class="stats-card">
          <h2 class="card-title">Estadísticas Base</h2>
          <div class="stats-list">
            <StatBar
              v-for="stat in pokemon.stats"
              :key="stat.stat.name"
              :label="statLabels[stat.stat.name] || stat.stat.name"
              :value="stat.base_stat"
            />
          </div>
        </div>

        <!-- Abilities Card -->
        <div class="abilities-card">
          <h2 class="card-title">Habilidades</h2>
          <div class="abilities-list">
            <span
              v-for="ability in pokemon.abilities"
              :key="ability.ability.name"
              class="ability-pill"
              :class="{ hidden: ability.is_hidden }"
            >
              {{ ability.ability.name.replace('-', ' ') }}
              <span v-if="ability.is_hidden" class="hidden-label">(oculta)</span>
            </span>
          </div>
        </div>

        <!-- Evolution Card -->
        <div class="evolution-card" v-if="evolutionChain.length > 1">
          <h2 class="card-title">Línea Evolutiva</h2>
          <div class="evolution-list">
             <RouterLink v-for="evo in evolutionChain" :key="evo.id" :to="`/pokemon/${evo.id}`" class="evo-item">
               <img :src="`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png`" :alt="evo.name" class="evo-img" loading="lazy" />
               <span class="evo-name">{{ evo.name }}</span>
             </RouterLink>
          </div>
        </div>

        <!-- Navigation -->
        <div class="detail-nav">
          <button
            class="btn btn-outline"
            :disabled="pokemon.id <= 1"
            @click="navigate(-1)"
          >
            ← Anterior
          </button>
          <button class="btn btn-outline" @click="navigate(1)">
            Siguiente →
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.detail-page {
  padding-bottom: var(--space-16);
}

/* ── Back ─────────────────────────────────────────────── */
.back-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  color: var(--purple-main);
  font-size: var(--font-sm);
  font-weight: 600;
  padding: var(--space-2) 0;
  margin-bottom: var(--space-6);
  transition: color var(--transition-fast);
}

.back-btn:hover {
  color: var(--purple-dark);
}

/* ── Loading / Error ──────────────────────────────────── */
.detail-loading,
.detail-error {
  text-align: center;
  padding: var(--space-16) 0;
  color: var(--gray-500);
}

.spinner-large {
  width: 40px;
  height: 40px;
  border: 4px solid var(--lavender-soft);
  border-top-color: var(--purple-main);
  border-radius: var(--radius-full);
  animation: spin 0.7s linear infinite;
  margin: 0 auto var(--space-4);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-emoji {
  font-size: 4rem;
  margin-bottom: var(--space-4);
}

/* ── Detail Content ───────────────────────────────────── */
.detail-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  animation: fadeInUp 0.4s ease;
}

.detail-card,
.stats-card,
.abilities-card,
.evolution-card {
  background: var(--surface);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--surface-border);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-lg);
}

.detail-header {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: var(--space-8);
  align-items: center;
}

.detail-image-section {
  display: flex;
  justify-content: center;
}

.detail-image-bg {
  width: 260px;
  height: 260px;
  background: var(--lavender-soft);
  border-radius: var(--radius-xl);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.detail-image {
  width: 220px;
  height: 220px;
  object-fit: contain;
  filter: drop-shadow(0 8px 16px rgba(93, 63, 211, 0.2));
  animation: float 3s ease-in-out infinite;
}

.detail-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.detail-id {
  font-size: var(--font-lg);
  font-weight: 800;
  color: var(--purple-light);
  opacity: 0.6;
}

.detail-name {
  font-size: var(--font-3xl);
  font-weight: 800;
  text-transform: capitalize;
  color: var(--gray-900);
  line-height: 1.1;
}

.detail-types {
  display: flex;
  gap: var(--space-2);
}

.flavor-text {
  font-size: var(--font-base);
  color: var(--gray-700);
  line-height: 1.5;
  margin-top: var(--space-2);
  font-style: italic;
  max-width: 600px;
}

.detail-measures {
  display: flex;
  gap: var(--space-6);
  flex-wrap: wrap;
  margin-top: var(--space-2);
}

.measure {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.measure-label {
  font-size: var(--font-xs);
  font-weight: 600;
  color: var(--gray-500);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.measure-value {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--gray-900);
}

/* ── Stats / Abilities ────────────────────────────────── */
.card-title {
  font-size: var(--font-lg);
  font-weight: 700;
  color: var(--gray-900);
  margin-bottom: var(--space-4);
}

.abilities-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.ability-pill {
  padding: var(--space-2) var(--space-5);
  background: var(--lavender-soft);
  color: var(--purple-main);
  font-size: var(--font-sm);
  font-weight: 600;
  border-radius: var(--radius-full);
  text-transform: capitalize;
}

.ability-pill.hidden {
  background: var(--gray-100);
  color: var(--gray-500);
}

.hidden-label {
  font-size: var(--font-xs);
  font-weight: 400;
}

/* ── Evolution ────────────────────────────────────────── */
.evolution-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-6);
  justify-content: center;
  align-items: flex-end;
}

.evo-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-decoration: none;
  color: var(--gray-900);
  transition: transform var(--transition-fast);
}
.evo-item:hover { transform: scale(1.05); }

.evo-img {
  width: 90px;
  height: 90px;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5));
}

.evo-name {
  margin-top: var(--space-2);
  font-weight: 600;
  text-transform: capitalize;
  font-size: var(--font-sm);
}

/* ── Navigation ───────────────────────────────────────── */
.detail-nav {
  display: flex;
  justify-content: space-between;
  gap: var(--space-4);
  padding-top: var(--space-4);
}

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 768px) {
  .detail-header {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .detail-info {
    align-items: center;
  }

  .detail-measures {
    justify-content: center;
  }

  .detail-image-bg {
    width: 200px;
    height: 200px;
  }

  .detail-image {
    width: 170px;
    height: 170px;
  }

  .detail-name {
    font-size: var(--font-2xl);
  }

  .detail-card,
  .stats-card,
  .abilities-card,
  .evolution-card {
    padding: var(--space-6);
  }
}
</style>
