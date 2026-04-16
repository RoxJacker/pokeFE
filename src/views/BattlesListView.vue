<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api.js'
import { connectSocket, getSocket } from '../utils/socket.js'
import TeamSelectModal from '../components/TeamSelectModal.vue'

const router = useRouter()
const battles = ref([])
const loading = ref(true)
const actionMsg = ref('')

// Modal state
const showTeamSelect = ref(false)
const selectedBattleId = ref(null)

// Tabs
const activeTab = ref('active') // 'active' | 'pending' | 'finished'

const filteredBattles = computed(() => {
  if (activeTab.value === 'active') {
    return battles.value.filter(b => b.status === 'active' || b.status === 'accepted' || b.status === 'team_select')
  }
  if (activeTab.value === 'pending') {
    return battles.value.filter(b => b.status === 'pending')
  }
  return battles.value.filter(b => b.status === 'finished' || b.status === 'declined')
})

const activeBattlesCount = computed(() => battles.value.filter(b => ['active', 'accepted', 'team_select'].includes(b.status)).length)
const pendingCount = computed(() => battles.value.filter(b => b.status === 'pending').length)
const finishedCount = computed(() => battles.value.filter(b => b.status === 'finished' || b.status === 'declined').length)

async function fetchBattles() {
  loading.value = true
  try {
    const { data } = await api.get('/api/battles')
    battles.value = data.battles || []
  } catch (err) {
    console.error('Error cargando batallas:', err)
  } finally {
    loading.value = false
  }
}

async function acceptBattle(battleId) {
  try {
    await api.post(`/api/battles/${battleId}/accept`)
    selectedBattleId.value = battleId
    showTeamSelect.value = true
    await fetchBattles()
  } catch (err) {
    actionMsg.value = err.response?.data?.error || 'Error al aceptar.'
  }
}

async function declineBattle(battleId) {
  try {
    await api.post(`/api/battles/${battleId}/decline`)
    await fetchBattles()
  } catch (err) {
    actionMsg.value = err.response?.data?.error || 'Error al rechazar.'
  }
}

function goToBattle(battleId) {
  selectedBattleId.value = battleId
  showTeamSelect.value = true
}

function navigateToBattle(battleId) {
  router.push(`/battle/${battleId}`)
}

function onBattleStarted(data) {
  showTeamSelect.value = false
  if (data.ready) {
    router.push(`/battle/${selectedBattleId.value}`)
  } else {
    actionMsg.value = 'Equipo listo. Esperando al oponente...'
    setTimeout(() => (actionMsg.value = ''), 5000)
    fetchBattles()
  }
}

function getOpponentName(b) {
  return b.direction === 'sent' ? b.challenged?.username : b.challenger?.username
}

function getStatusLabel(b) {
  if (b.status === 'pending' && b.direction === 'received') return 'Te retó a batalla'
  if (b.status === 'pending') return 'Reto enviado'
  if (b.status === 'accepted' || b.status === 'team_select') return 'Selecciona equipo'
  if (b.status === 'active') return '¡En curso!'
  if (b.status === 'finished') return 'Terminada'
  if (b.status === 'declined') return 'Rechazada'
  return b.status
}

function getStatusIcon(b) {
  if (b.status === 'active') return '⚡'
  if (b.status === 'pending') return '⏳'
  if (b.status === 'accepted' || b.status === 'team_select') return '🎮'
  if (b.status === 'finished') return '🏁'
  if (b.status === 'declined') return '❌'
  return '⚔️'
}

function formatDate(date) {
  if (!date) return ''
  return new Date(date).toLocaleDateString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

let socket = null
onMounted(() => {
  fetchBattles()
  connectSocket()
  socket = getSocket()
  if (socket) {
    socket.on('battle-accepted', () => fetchBattles())
    socket.on('battle-started', () => fetchBattles())
    socket.on('battle-update', () => fetchBattles())
  }
})

onUnmounted(() => {
  if (socket) {
    socket.off('battle-accepted')
    socket.off('battle-started')
    socket.off('battle-update')
  }
})
</script>

<template>
  <section class="battles-page">
    <div class="container">
      <div class="page-header">
        <h1 class="page-title">⚔️ Batallas</h1>
        <p class="page-subtitle">Gestiona tus retos y combates Pokémon</p>
      </div>

      <!-- Action message -->
      <div v-if="actionMsg" class="action-msg">{{ actionMsg }}</div>

      <!-- Tabs -->
      <div class="tabs">
        <button class="tab" :class="{ active: activeTab === 'active' }" @click="activeTab = 'active'">
          En curso
          <span v-if="activeBattlesCount" class="tab-badge">{{ activeBattlesCount }}</span>
        </button>
        <button class="tab" :class="{ active: activeTab === 'pending' }" @click="activeTab = 'pending'">
          Pendientes
          <span v-if="pendingCount" class="tab-badge pending-badge">{{ pendingCount }}</span>
        </button>
        <button class="tab" :class="{ active: activeTab === 'finished' }" @click="activeTab = 'finished'">
          Historial
          <span v-if="finishedCount" class="tab-badge finished-badge">{{ finishedCount }}</span>
        </button>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Cargando batallas...</p>
      </div>

      <!-- Empty state -->
      <div v-else-if="!filteredBattles.length" class="empty-state">
        <div class="empty-icon">{{ activeTab === 'active' ? '🕹️' : activeTab === 'pending' ? '📬' : '📋' }}</div>
        <p v-if="activeTab === 'active'">No tienes batallas en curso.</p>
        <p v-else-if="activeTab === 'pending'">No hay retos pendientes.</p>
        <p v-else>Aún no has terminado ninguna batalla.</p>
        <p class="empty-hint">Ve a <RouterLink to="/friends">Amigos</RouterLink> para retar a alguien.</p>
      </div>

      <!-- Battle list -->
      <div v-else class="battles-list">
        <div v-for="b in filteredBattles" :key="b.id"
          class="battle-card" :class="'status-' + b.status">
          
          <div class="battle-icon">{{ getStatusIcon(b) }}</div>
          
          <div class="battle-info">
            <div class="battle-opponent">
              <span class="opponent-name">{{ getOpponentName(b) }}</span>
              <span class="battle-date">{{ formatDate(b.createdAt) }}</span>
            </div>
            <span class="battle-status-label">{{ getStatusLabel(b) }}</span>
          </div>

          <div class="battle-actions">
            <!-- Pending received: Accept / Decline -->
            <template v-if="b.status === 'pending' && b.direction === 'received'">
              <button class="btn-action accept" @click="acceptBattle(b.id)">✓ Aceptar</button>
              <button class="btn-action decline" @click="declineBattle(b.id)">✕ Rechazar</button>
            </template>

            <!-- Pending sent -->
            <span v-else-if="b.status === 'pending'" class="waiting-label">Esperando...</span>

            <!-- Team select -->
            <button v-else-if="b.status === 'accepted' || b.status === 'team_select'"
              class="btn-action primary" @click="goToBattle(b.id)">
              🎮 Elegir equipo
            </button>

            <!-- Active battle -->
            <button v-else-if="b.status === 'active'"
              class="btn-action primary glow" @click="navigateToBattle(b.id)">
              ⚡ Ir a la batalla
            </button>

            <!-- Finished -->
            <span v-else-if="b.status === 'finished'" class="done-label">✓</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Team Select Modal -->
    <TeamSelectModal
      :battleId="selectedBattleId || ''"
      :visible="showTeamSelect"
      @close="showTeamSelect = false"
      @started="onBattleStarted"
    />
  </section>
</template>

<style scoped>
.battles-page { padding-bottom: var(--space-16); }

.page-header { margin-bottom: var(--space-6); }
.page-title { font-size: var(--font-2xl); font-weight: 800; }
.page-subtitle { color: var(--gray-500); margin-top: var(--space-1); }

.action-msg {
  padding: var(--space-3) var(--space-5); background: var(--lavender-soft);
  border-radius: var(--radius-md); color: var(--purple-main); font-weight: 600;
  margin-bottom: var(--space-6); text-align: center; animation: fadeInUp 0.3s ease;
}

/* Tabs */
.tabs {
  display: flex; gap: var(--space-2); margin-bottom: var(--space-6);
  background: var(--gray-100); border-radius: var(--radius-lg); padding: 4px;
}

.tab {
  flex: 1; padding: var(--space-3) var(--space-4); border-radius: var(--radius-md);
  font-weight: 600; font-size: var(--font-sm); color: var(--gray-500);
  background: transparent; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: center; justify-content: center; gap: var(--space-2);
}

.tab.active { background: var(--white); color: var(--gray-900); box-shadow: var(--shadow-sm); }

.tab-badge {
  font-size: 11px; background: var(--purple-main); color: var(--white);
  padding: 1px 8px; border-radius: var(--radius-full); font-weight: 700;
}

.pending-badge { background: var(--warning); }
.finished-badge { background: var(--gray-400); }

/* Loading / Empty */
.loading-state {
  text-align: center; padding: var(--space-16); color: var(--gray-500);
  display: flex; flex-direction: column; align-items: center; gap: var(--space-4);
}

.spinner {
  width: 40px; height: 40px; border: 3px solid var(--gray-200);
  border-top-color: var(--purple-main); border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.empty-state {
  text-align: center; padding: var(--space-16) var(--space-8);
  background: var(--white); border-radius: var(--radius-xl); box-shadow: var(--shadow-sm);
}

.empty-icon { font-size: 3rem; margin-bottom: var(--space-4); }

.empty-state p { color: var(--gray-500); margin-bottom: var(--space-2); }

.empty-hint a { color: var(--purple-main); font-weight: 600; }

/* Battle list */
.battles-list { display: flex; flex-direction: column; gap: var(--space-3); }

.battle-card {
  display: flex; align-items: center; gap: var(--space-4);
  background: var(--white); border-radius: var(--radius-lg); padding: var(--space-5);
  box-shadow: var(--shadow-sm); transition: all 0.2s; border-left: 4px solid var(--gray-200);
}

.battle-card:hover { transform: translateX(4px); box-shadow: var(--shadow-md); }

.battle-card.status-active { border-left-color: var(--green-leaf); }
.battle-card.status-accepted, .battle-card.status-team_select { border-left-color: var(--purple-main); }
.battle-card.status-pending { border-left-color: var(--warning); }
.battle-card.status-finished { border-left-color: var(--gray-300); opacity: 0.8; }
.battle-card.status-declined { border-left-color: var(--danger); opacity: 0.6; }

.battle-icon {
  width: 44px; height: 44px; border-radius: var(--radius-full);
  background: var(--lavender-soft); display: flex; align-items: center;
  justify-content: center; font-size: 1.3rem; flex-shrink: 0;
}

.battle-info { flex: 1; min-width: 0; }

.battle-opponent { display: flex; align-items: baseline; gap: var(--space-2); flex-wrap: wrap; }

.opponent-name {
  font-weight: 700; font-size: var(--font-base); color: var(--gray-900);
  text-transform: capitalize;
}

.battle-date { font-size: var(--font-xs); color: var(--gray-400); }

.battle-status-label {
  display: block; font-size: var(--font-xs); color: var(--gray-500);
  font-weight: 500; margin-top: 2px;
}

.battle-actions { display: flex; gap: var(--space-2); flex-shrink: 0; }

.btn-action {
  padding: var(--space-2) var(--space-4); border-radius: var(--radius-md);
  font-size: var(--font-xs); font-weight: 700; cursor: pointer; transition: all 0.2s;
  white-space: nowrap;
}

.btn-action.accept {
  background: rgba(76,175,80,0.1); color: var(--green-leaf); border: 1px solid var(--green-leaf);
}
.btn-action.accept:hover { background: var(--green-leaf); color: white; }

.btn-action.decline {
  background: rgba(230,57,70,0.08); color: var(--danger); border: 1px solid var(--danger);
}
.btn-action.decline:hover { background: var(--danger); color: white; }

.btn-action.primary {
  background: var(--purple-main); color: white; border: none;
}
.btn-action.primary:hover { background: var(--purple-dark); transform: translateY(-1px); }

.btn-action.glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(93,63,211,0.4); }
  50% { box-shadow: 0 0 12px 4px rgba(93,63,211,0.3); }
}

.waiting-label { font-size: var(--font-xs); color: var(--warning); font-weight: 600; }
.done-label { font-size: var(--font-lg); color: var(--gray-400); font-weight: 700; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 640px) {
  .battle-card { flex-wrap: wrap; padding: var(--space-4); }
  .battle-actions { width: 100%; justify-content: flex-end; margin-top: var(--space-2); }
}
</style>
