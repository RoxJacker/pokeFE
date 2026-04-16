<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '../utils/api.js'
import { getSocket } from '../utils/socket.js'
import TypeBadge from '../components/TypeBadge.vue'

const route = useRoute()
const router = useRouter()
const battleId = route.params.id

const loading = ref(true)
const battleStatus = ref('')
const winnerId = ref(null)
const state = ref(null)
const error = ref('')
const selectedMove = ref(null)
const waitingForOpponent = ref(false)
const turnEvents = ref([])
const showEvents = ref(false)
const animatingDamage = ref(null) // 'my' or 'opponent'
const showSwitchPanel = ref(false)
const switchRequired = ref(false)
let socket = null

// Current user
const currentUser = JSON.parse(localStorage.getItem('pokepwa_user') || '{}')

// Computed
const myActive = computed(() => {
  if (!state.value) return null
  return state.value.myTeam[state.value.myActivePokemonIndex]
})

const opponentActive = computed(() => {
  if (!state.value) return null
  return state.value.opponentTeam[state.value.opponentActivePokemonIndex]
})

const myHpPercent = computed(() => {
  if (!myActive.value) return 100
  return Math.max(0, (myActive.value.currentHp / myActive.value.maxHp) * 100)
})

const opponentHpPercent = computed(() => {
  if (!opponentActive.value) return 100
  return Math.max(0, (opponentActive.value.currentHp / opponentActive.value.maxHp) * 100)
})

function hpBarClass(percent) {
  if (percent > 50) return 'hp-green'
  if (percent > 20) return 'hp-yellow'
  return 'hp-red'
}

const isFinished = computed(() => battleStatus.value === 'finished')
const isMyVictory = computed(() => winnerId.value === currentUser.id)

const myAliveCount = computed(() => {
  if (!state.value) return 0
  return state.value.myTeam.filter(p => p.currentHp > 0).length
})

const opponentAliveCount = computed(() => {
  if (!state.value) return 0
  return state.value.opponentTeam.filter(p => p.currentHp > 0).length
})

// Actions
async function fetchState() {
  try {
    const { data } = await api.get(`/api/battles/${battleId}/state`)
    battleStatus.value = data.status
    winnerId.value = data.winnerId
    if (data.state) {
      state.value = data.state
      waitingForOpponent.value = data.state.hasPendingMove
    }
  } catch (err) {
    error.value = 'Error al cargar la batalla.'
  } finally {
    loading.value = false
  }
}

async function submitMove(moveIndex) {
  if (waitingForOpponent.value) return
  selectedMove.value = moveIndex
  waitingForOpponent.value = true

  if (socket?.connected) {
    socket.emit('submit-move', { battleId, moveIndex })
  } else {
    // Fallback REST if socket disconnected
    try {
      const { data } = await api.post(`/api/battles/${battleId}/turn`, { moveIndex })
      if (data.events) {
        await playEvents(data.events)
      }
      if (data.state) {
        state.value = data.state
      }
      battleStatus.value = data.battleStatus || battleStatus.value
      waitingForOpponent.value = data.waiting || false

      if (data.events?.some(e => e.type === 'switch_required' && e.userId === currentUser.id)) {
        switchRequired.value = true
        showSwitchPanel.value = true
      }
    } catch (err) {
      error.value = err.response?.data?.error || 'Error al enviar movimiento.'
      waitingForOpponent.value = false
    }
  }
  selectedMove.value = null
}

async function switchPokemon(index) {
  if (socket?.connected) {
    socket.emit('switch-pokemon', { battleId, pokemonIndex: index })
    showSwitchPanel.value = false
    switchRequired.value = false
  } else {
    // Fallback REST
    try {
      const { data } = await api.post(`/api/battles/${battleId}/switch`, { pokemonIndex: index })
      if (data.state) {
        state.value = data.state
      }
      showSwitchPanel.value = false
      switchRequired.value = false
    } catch (err) {
      error.value = err.response?.data?.error || 'Error al cambiar Pokémon.'
    }
  }
}

async function playEvents(events) {
  showEvents.value = true
  turnEvents.value = []

  for (const event of events) {
    turnEvents.value.push(event)

    if (event.type === 'damage') {
      animatingDamage.value = event.targetUserId === currentUser.id ? 'my' : 'opponent'
      await sleep(800)
      animatingDamage.value = null
    } else if (event.type === 'faint' || event.type === 'victory') {
      await sleep(1200)
    } else {
      await sleep(600)
    }
  }

  await sleep(500)
  showEvents.value = false
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Socket.io integration ────────────────────────────────
function setupSocket() {
  socket = getSocket()
  if (!socket) {
    console.warn('[Battle] No socket available — using REST fallback.')
    return
  }

  // Join the battle room
  socket.emit('join-battle', { battleId })

  // ── Listeners ──────────────────────────────────────────

  // Initial state when joining
  socket.on('battle-state', (data) => {
    battleStatus.value = data.status
    winnerId.value = data.winnerId
    if (data.state) {
      state.value = data.state
      waitingForOpponent.value = data.state.hasPendingMove
    }
    loading.value = false
  })

  // Battle started (both teams ready)
  socket.on('battle-started', (data) => {
    const myState = data.state?.[currentUser.id]
    if (myState) {
      state.value = myState
      battleStatus.value = 'active'
    }
  })

  // Our move was registered, waiting for opponent
  socket.on('move-registered', () => {
    waitingForOpponent.value = true
  })

  // Opponent submitted their move (UI indicator)
  socket.on('opponent-move-pending', () => {
    // Optional: could show an indicator
  })

  // Turn resolved — both moves executed
  socket.on('turn-resolved', async (data) => {
    const myState = data.state?.[currentUser.id]
    if (data.events) {
      await playEvents(data.events)
    }
    if (myState) {
      state.value = myState
    }
    battleStatus.value = data.battleStatus || battleStatus.value
    winnerId.value = data.winnerId || null
    waitingForOpponent.value = false

    // Check if we need to switch
    if (data.events?.some(e => e.type === 'switch_required' && e.userId === currentUser.id)) {
      switchRequired.value = true
      showSwitchPanel.value = true
    }
  })

  // Pokémon switched
  socket.on('pokemon-switched', (data) => {
    const myState = data.state?.[currentUser.id]
    if (myState) {
      state.value = myState
    }
  })
}

function cleanupSocket() {
  if (socket) {
    socket.emit('leave-battle', { battleId })
    socket.off('battle-state')
    socket.off('battle-started')
    socket.off('move-registered')
    socket.off('opponent-move-pending')
    socket.off('turn-resolved')
    socket.off('pokemon-switched')
  }
}

function getMoveTypeColor(type) {
  const colors = {
    normal: '#A8A878', fire: '#F08030', water: '#6890F0', electric: '#F8D030',
    grass: '#78C850', ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0',
    ground: '#E0C068', flying: '#A890F0', psychic: '#F85888', bug: '#A8B820',
    rock: '#B8A038', ghost: '#705898', dragon: '#7038F8', dark: '#705848',
    steel: '#B8B8D0', fairy: '#EE99AC',
  }
  return colors[type] || '#888'
}

function goBack() {
  router.push('/friends')
}

onMounted(() => {
  fetchState()
  setupSocket()
})

onUnmounted(() => {
  cleanupSocket()
})
</script>

<template>
  <section class="battle-page">
    <!-- Loading -->
    <div v-if="loading" class="battle-loading">
      <div class="pokeball-spinner"></div>
      <p>Cargando batalla...</p>
    </div>

    <!-- Error -->
    <div v-else-if="error && !state" class="battle-error">
      <p>{{ error }}</p>
      <button class="btn btn-primary" @click="goBack">Volver</button>
    </div>

    <!-- Not ready yet -->
    <div v-else-if="!state || battleStatus === 'accepted' || battleStatus === 'team_select'" class="battle-waiting">
      <div class="pokeball-spinner"></div>
      <h2>Esperando al oponente...</h2>
      <p>Tu oponente aún no ha seleccionado su equipo.</p>
      <button class="btn btn-secondary" @click="fetchState">🔄 Actualizar</button>
    </div>

    <!-- BATTLE ARENA -->
    <div v-else class="battle-arena">
      <!-- Opponent Side (top) -->
      <div class="opponent-side">
        <div class="pokemon-info opponent-info">
          <div class="pokemon-name-row">
            <span class="poke-name">{{ opponentActive?.name }}</span>
            <div class="type-badges">
              <TypeBadge v-for="t in opponentActive?.types" :key="t" :type="t" />
            </div>
          </div>
          <div class="hp-bar-container">
            <div class="hp-bar" :class="hpBarClass(opponentHpPercent)" :style="{ width: opponentHpPercent + '%' }"></div>
          </div>
          <div class="hp-text">{{ opponentActive?.currentHp }} / {{ opponentActive?.maxHp }}</div>
        </div>
        <div class="pokemon-sprite opponent-sprite" :class="{ 'shake-animation': animatingDamage === 'opponent' }">
          <img :src="opponentActive?.sprite" :alt="opponentActive?.name" />
        </div>
      </div>

      <!-- VS Divider -->
      <div class="vs-divider">
        <span class="vs-badge">VS</span>
        <div class="turn-counter">Turno {{ state?.turn }}</div>
      </div>

      <!-- Player Side (bottom) -->
      <div class="player-side">
        <div class="pokemon-sprite player-sprite" :class="{ 'shake-animation': animatingDamage === 'my' }">
          <img :src="myActive?.sprite" :alt="myActive?.name" />
        </div>
        <div class="pokemon-info player-info">
          <div class="pokemon-name-row">
            <span class="poke-name">{{ myActive?.name }}</span>
            <div class="type-badges">
              <TypeBadge v-for="t in myActive?.types" :key="t" :type="t" />
            </div>
          </div>
          <div class="hp-bar-container">
            <div class="hp-bar" :class="hpBarClass(myHpPercent)" :style="{ width: myHpPercent + '%' }"></div>
          </div>
          <div class="hp-text">{{ myActive?.currentHp }} / {{ myActive?.maxHp }}</div>
        </div>
      </div>

      <!-- Battle Log / Events -->
      <div class="battle-log" v-if="showEvents || turnEvents.length">
        <div v-for="(evt, i) in turnEvents" :key="i" class="log-entry" :class="'log-' + evt.type">
          {{ evt.message }}
        </div>
      </div>

      <!-- Team indicator -->
      <div class="team-indicators">
        <div class="indicator-row">
          <span class="indicator-label">{{ state?.myUsername }}</span>
          <div class="pokeball-dots">
            <span v-for="(p, i) in state?.myTeam" :key="i"
              class="pokeball-dot" :class="{ fainted: p.currentHp <= 0, active: i === state?.myActivePokemonIndex }">
            </span>
          </div>
        </div>
        <div class="indicator-row">
          <span class="indicator-label">{{ state?.opponentUsername }}</span>
          <div class="pokeball-dots">
            <span v-for="(p, i) in state?.opponentTeam" :key="i"
              class="pokeball-dot" :class="{ fainted: p.currentHp <= 0, active: i === state?.opponentActivePokemonIndex }">
            </span>
          </div>
        </div>
      </div>

      <!-- Action Panel -->
      <div class="action-panel" v-if="!isFinished && !switchRequired">
        <!-- Waiting overlay -->
        <div v-if="waitingForOpponent" class="waiting-overlay">
          <div class="pokeball-spinner small"></div>
          <p>Esperando al oponente...</p>
        </div>

        <!-- Move buttons -->
        <div class="moves-grid" v-if="!showSwitchPanel">
          <button v-for="(move, i) in myActive?.moves" :key="i"
            class="move-btn"
            :style="{ '--move-color': getMoveTypeColor(move.type) }"
            :disabled="waitingForOpponent"
            @click="submitMove(i)">
            <span class="move-name">{{ move.name }}</span>
            <span class="move-meta">
              <span class="move-type-badge" :style="{ background: getMoveTypeColor(move.type) }">{{ move.type }}</span>
              <span class="move-power" v-if="move.power">⚡{{ move.power }}</span>
            </span>
          </button>
        </div>

        <!-- Switch button -->
        <div class="action-buttons">
          <button class="btn btn-secondary switch-btn" @click="showSwitchPanel = !showSwitchPanel"
            :disabled="waitingForOpponent">
            🔄 Cambiar Pokémon
          </button>
        </div>
      </div>

      <!-- Switch Panel -->
      <div class="switch-panel" v-if="showSwitchPanel || switchRequired">
        <h3>{{ switchRequired ? '¡Elige tu siguiente Pokémon!' : 'Cambiar Pokémon' }}</h3>
        <div class="switch-grid">
          <button v-for="(p, i) in state?.myTeam" :key="i"
            class="switch-slot"
            :class="{ active: i === state?.myActivePokemonIndex, fainted: p.currentHp <= 0 }"
            :disabled="p.currentHp <= 0 || i === state?.myActivePokemonIndex"
            @click="switchPokemon(i)">
            <img :src="p.sprite" :alt="p.name" class="switch-sprite" />
            <div class="switch-info">
              <span class="switch-name">{{ p.name }}</span>
              <div class="switch-hp-bar">
                <div class="hp-bar" :class="hpBarClass((p.currentHp / p.maxHp) * 100)"
                  :style="{ width: (p.currentHp / p.maxHp) * 100 + '%' }"></div>
              </div>
              <span class="switch-hp-text">{{ p.currentHp }}/{{ p.maxHp }}</span>
            </div>
          </button>
        </div>
        <button v-if="!switchRequired" class="btn btn-secondary" @click="showSwitchPanel = false">Cancelar</button>
      </div>

      <!-- Victory / Defeat Screen -->
      <div v-if="isFinished" class="result-overlay" :class="isMyVictory ? 'victory' : 'defeat'">
        <div class="result-card">
          <div class="result-icon">{{ isMyVictory ? '🏆' : '💀' }}</div>
          <h2>{{ isMyVictory ? '¡Victoria!' : 'Derrota...' }}</h2>
          <p v-if="isMyVictory">¡Has ganado la batalla contra {{ state?.opponentUsername }}!</p>
          <p v-else>{{ state?.opponentUsername }} ha ganado esta vez. ¡La próxima será!</p>
          <div class="result-stats">
            <div class="stat-item">
              <span class="stat-label">Pokémon restantes</span>
              <span class="stat-value">{{ myAliveCount }} / {{ state?.myTeam?.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Turnos totales</span>
              <span class="stat-value">{{ state?.turn - 1 }}</span>
            </div>
          </div>
          <button class="btn btn-primary" @click="goBack">Volver a Amigos</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.battle-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 0;
  position: relative;
  overflow: hidden;
}

/* Loading / Error / Waiting */
.battle-loading, .battle-error, .battle-waiting {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 80vh; color: white; text-align: center; gap: var(--space-4);
}

.pokeball-spinner {
  width: 48px; height: 48px;
  border: 4px solid rgba(255,255,255,0.2);
  border-top-color: #f44336;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.pokeball-spinner.small { width: 28px; height: 28px; border-width: 3px; }

@keyframes spin { to { transform: rotate(360deg); } }

/* Battle Arena */
.battle-arena {
  display: flex; flex-direction: column;
  max-width: 600px; margin: 0 auto; padding: var(--space-4);
  min-height: 100vh;
}

/* Opponent Side */
.opponent-side {
  display: flex; align-items: flex-start; justify-content: space-between;
  padding: var(--space-4); gap: var(--space-4);
}

.pokemon-info {
  flex: 1; max-width: 55%;
}

.pokemon-name-row {
  display: flex; align-items: center; gap: var(--space-2); margin-bottom: var(--space-2); flex-wrap: wrap;
}

.poke-name {
  font-weight: 800; font-size: var(--font-lg); text-transform: capitalize;
  color: white; text-shadow: 0 2px 4px rgba(0,0,0,0.5);
}

.type-badges { display: flex; gap: 4px; }

.hp-bar-container {
  width: 100%; height: 12px; background: rgba(0,0,0,0.4);
  border-radius: var(--radius-full); overflow: hidden;
  border: 2px solid rgba(255,255,255,0.2);
}

.hp-bar {
  height: 100%; border-radius: var(--radius-full);
  transition: width 0.6s ease-in-out;
}

.hp-green { background: linear-gradient(90deg, #4caf50, #66bb6a); }
.hp-yellow { background: linear-gradient(90deg, #ff9800, #ffc107); }
.hp-red { background: linear-gradient(90deg, #f44336, #e57373); }

.hp-text {
  font-size: var(--font-xs); color: rgba(255,255,255,0.7); margin-top: 4px;
  font-weight: 600;
}

/* Sprites */
.pokemon-sprite img {
  width: 140px; height: 140px; object-fit: contain;
  filter: drop-shadow(0 4px 12px rgba(0,0,0,0.5));
  image-rendering: auto;
}

.opponent-sprite {
  transform: scaleX(-1); /* Flip to face player */
}

.shake-animation {
  animation: shake 0.4s ease-in-out;
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-6px); }
  80% { transform: translateX(6px); }
}

.opponent-sprite.shake-animation {
  animation: shakeFlip 0.4s ease-in-out;
}

@keyframes shakeFlip {
  0%, 100% { transform: scaleX(-1) translateX(0); }
  20% { transform: scaleX(-1) translateX(-8px); }
  40% { transform: scaleX(-1) translateX(8px); }
  60% { transform: scaleX(-1) translateX(-6px); }
  80% { transform: scaleX(-1) translateX(6px); }
}

/* VS Divider */
.vs-divider {
  display: flex; align-items: center; justify-content: center; gap: var(--space-4);
  padding: var(--space-2) 0;
}

.vs-badge {
  background: linear-gradient(135deg, #f44336, #ff5722);
  color: white; font-weight: 900; font-size: var(--font-lg);
  padding: 4px 16px; border-radius: var(--radius-full);
  box-shadow: 0 4px 12px rgba(244,67,54,0.4);
}

.turn-counter {
  color: rgba(255,255,255,0.6); font-size: var(--font-sm); font-weight: 600;
}

/* Player Side */
.player-side {
  display: flex; align-items: flex-end; justify-content: space-between;
  padding: var(--space-4); gap: var(--space-4);
  flex-direction: row-reverse;
}

/* Battle Log */
.battle-log {
  background: rgba(0,0,0,0.6); border-radius: var(--radius-lg);
  padding: var(--space-4); margin: var(--space-3) 0;
  max-height: 160px; overflow-y: auto;
  backdrop-filter: blur(8px);
  border: 1px solid rgba(255,255,255,0.1);
}

.log-entry {
  color: white; font-size: var(--font-sm); padding: 4px 0;
  animation: fadeInLog 0.3s ease;
}

.log-effectiveness { color: #ffc107; font-weight: 700; }
.log-faint { color: #f44336; font-weight: 700; }
.log-victory { color: #4caf50; font-weight: 800; font-size: var(--font-base); }
.log-miss { color: #9e9e9e; font-style: italic; }
.log-immune { color: #9e9e9e; }
.log-info { color: rgba(255,255,255,0.5); font-size: var(--font-xs); }

@keyframes fadeInLog {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Team indicators */
.team-indicators {
  display: flex; justify-content: space-between; padding: var(--space-2) var(--space-4);
}

.indicator-row {
  display: flex; align-items: center; gap: var(--space-2);
}

.indicator-label {
  color: rgba(255,255,255,0.6); font-size: var(--font-xs); font-weight: 600;
  text-transform: capitalize;
}

.pokeball-dots { display: flex; gap: 4px; }

.pokeball-dot {
  width: 14px; height: 14px; border-radius: 50%;
  background: linear-gradient(180deg, #f44336 50%, white 50%);
  border: 1.5px solid rgba(255,255,255,0.4);
  transition: all 0.3s;
}

.pokeball-dot.fainted {
  background: #555; opacity: 0.4;
}

.pokeball-dot.active {
  box-shadow: 0 0 6px 2px rgba(255,255,0,0.6);
  border-color: gold;
}

/* Action Panel */
.action-panel {
  margin-top: auto; padding-top: var(--space-4); position: relative;
}

.waiting-overlay {
  position: absolute; inset: 0; display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: rgba(0,0,0,0.6); border-radius: var(--radius-xl);
  z-index: 5; color: white; gap: var(--space-3);
  backdrop-filter: blur(4px);
}

.moves-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.move-btn {
  background: rgba(255,255,255,0.08); border: 2px solid rgba(255,255,255,0.15);
  border-radius: var(--radius-lg); padding: var(--space-4) var(--space-3);
  color: white; cursor: pointer; text-align: left;
  transition: all 0.2s; display: flex; flex-direction: column; gap: 6px;
  border-left: 4px solid var(--move-color, #888);
}

.move-btn:hover:not(:disabled) {
  background: rgba(255,255,255,0.15);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
}

.move-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.move-name {
  font-weight: 700; text-transform: capitalize; font-size: var(--font-sm);
}

.move-meta { display: flex; align-items: center; gap: 8px; }

.move-type-badge {
  font-size: 10px; padding: 2px 8px; border-radius: var(--radius-full);
  text-transform: capitalize; font-weight: 700; color: white;
}

.move-power {
  font-size: var(--font-xs); color: rgba(255,255,255,0.6); font-weight: 600;
}

.action-buttons {
  display: flex; justify-content: center;
}

.switch-btn {
  background: rgba(255,255,255,0.1); color: white;
  border: 1px solid rgba(255,255,255,0.2);
}

/* Switch Panel */
.switch-panel {
  background: rgba(0,0,0,0.7); border-radius: var(--radius-xl);
  padding: var(--space-6); backdrop-filter: blur(12px);
  border: 1px solid rgba(255,255,255,0.1);
  margin-top: var(--space-4);
}

.switch-panel h3 {
  color: white; margin-bottom: var(--space-4); text-align: center;
}

.switch-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.switch-slot {
  display: flex; align-items: center; gap: var(--space-3);
  background: rgba(255,255,255,0.06); border: 2px solid rgba(255,255,255,0.1);
  border-radius: var(--radius-lg); padding: var(--space-3);
  color: white; cursor: pointer; transition: all 0.2s;
}

.switch-slot:hover:not(:disabled) {
  background: rgba(255,255,255,0.12);
  border-color: var(--purple-main);
}

.switch-slot.active { border-color: gold; background: rgba(255,215,0,0.1); }
.switch-slot.fainted { opacity: 0.3; cursor: not-allowed; }
.switch-slot:disabled { cursor: not-allowed; }

.switch-sprite { width: 48px; height: 48px; object-fit: contain; }

.switch-info { flex: 1; }
.switch-name { font-weight: 700; text-transform: capitalize; font-size: var(--font-sm); display: block; }

.switch-hp-bar {
  height: 6px; background: rgba(0,0,0,0.4); border-radius: var(--radius-full);
  overflow: hidden; margin: 4px 0;
}

.switch-hp-text { font-size: 10px; color: rgba(255,255,255,0.5); }

/* Result Overlay */
.result-overlay {
  position: fixed; inset: 0; display: flex; align-items: center; justify-content: center;
  z-index: 100; animation: fadeIn 0.5s ease;
}

.result-overlay.victory { background: rgba(76,175,80,0.85); }
.result-overlay.defeat { background: rgba(244,67,54,0.85); }

.result-card {
  background: white; border-radius: var(--radius-xl); padding: var(--space-10) var(--space-8);
  text-align: center; max-width: 380px; width: 90%;
  box-shadow: 0 24px 48px rgba(0,0,0,0.3);
  animation: scaleIn 0.4s ease;
}

.result-icon { font-size: 64px; margin-bottom: var(--space-4); }

.result-card h2 {
  font-size: var(--font-2xl); font-weight: 900; color: var(--gray-900);
  margin-bottom: var(--space-3);
}

.result-card p { color: var(--gray-600); margin-bottom: var(--space-6); }

.result-stats {
  display: flex; gap: var(--space-4); justify-content: center;
  margin-bottom: var(--space-6);
}

.stat-item { text-align: center; }
.stat-label { display: block; font-size: var(--font-xs); color: var(--gray-500); }
.stat-value { display: block; font-size: var(--font-lg); font-weight: 800; color: var(--gray-900); }

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}

/* Responsive */
@media (max-width: 480px) {
  .pokemon-sprite img { width: 100px; height: 100px; }
  .poke-name { font-size: var(--font-base); }
  .moves-grid { grid-template-columns: 1fr; }
  .switch-grid { grid-template-columns: 1fr; }
}
</style>
