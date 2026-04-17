<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '../utils/api.js'
import { connectSocket, getSocket } from '../utils/socket.js'
import TeamSelectModal from '../components/TeamSelectModal.vue'

const router = useRouter()

const searchQuery = ref('')
const searchType = ref('code') // 'code' or 'email'
const searchResult = ref(null)
const searchError = ref('')
const searchLoading = ref(false)

const pending = ref([])
const accepted = ref([])
const loading = ref(true)
const actionMsg = ref('')

// Battle state
const battles = ref([])
const showTeamSelect = ref(false)
const selectedBattleId = ref(null)

async function fetchFriends() {
  loading.value = true
  try {
    const { data } = await api.get('/api/friends')
    pending.value = data.pending
    accepted.value = data.accepted
  } catch (err) {
    console.error('Error cargando amigos:', err)
  } finally {
    loading.value = false
  }
}

async function searchUser() {
  searchError.value = ''
  searchResult.value = null
  if (!searchQuery.value.trim()) return

  searchLoading.value = true
  try {
    const params = searchType.value === 'code'
      ? { code: searchQuery.value.trim() }
      : { email: searchQuery.value.trim() }
    const { data } = await api.get('/api/users/lookup', { params })
    searchResult.value = data.user
  } catch (err) {
    searchError.value = err.response?.data?.error || 'Usuario no encontrado.'
  } finally {
    searchLoading.value = false
  }
}

async function sendRequest() {
  if (!searchResult.value) return
  actionMsg.value = ''
  try {
    const body = searchType.value === 'code'
      ? { friendCode: searchResult.value.friendCode }
      : { email: searchResult.value.email }
    await api.post('/api/friends/request', body)
    actionMsg.value = '¡Solicitud enviada! 🎉'
    searchResult.value = null
    searchQuery.value = ''
    await fetchFriends()
  } catch (err) {
    actionMsg.value = err.response?.data?.error || 'Error al enviar solicitud.'
  }
}

async function acceptRequest(id) {
  try {
    await api.post(`/api/friends/${id}/accept`)
    actionMsg.value = '✅ ¡Solicitud aceptada!'
    setTimeout(() => (actionMsg.value = ''), 3000)
    await Promise.all([fetchFriends(), fetchBattles()])
  } catch (err) {
    actionMsg.value = err.response?.data?.error || 'Error al aceptar.'
  }
}

async function declineRequest(id) {
  try {
    await api.post(`/api/friends/${id}/decline`)
    actionMsg.value = '❌ Solicitud rechazada.'
    setTimeout(() => (actionMsg.value = ''), 3000)
    await fetchFriends()
  } catch (err) {
    actionMsg.value = err.response?.data?.error || 'Error al rechazar.'
  }
}

async function challengeBattle(friendId) {
  try {
    await api.post('/api/battles/challenge', { friendId })
    actionMsg.value = '⚔️ ¡Reto enviado!'
    setTimeout(() => (actionMsg.value = ''), 3000)
    await fetchBattles()
  } catch (err) {
    actionMsg.value = err.response?.data?.error || 'Error al retar.'
  }
}

async function fetchBattles() {
  try {
    const { data } = await api.get('/api/battles')
    battles.value = data.battles || []
  } catch (err) {
    console.error('Error cargando batallas:', err)
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

function onBattleStarted(data) {
  showTeamSelect.value = false
  if (data.ready) {
    router.push(`/battle/${selectedBattleId.value}`)
  } else {
    actionMsg.value = 'Equipo listo. Esperando al oponente...'
    setTimeout(() => (actionMsg.value = ''), 5000)
  }
}

function goToBattle(battleId) {
  selectedBattleId.value = battleId
  showTeamSelect.value = true
}

function navigateToBattle(battleId) {
  router.push(`/battle/${battleId}`)
}

onMounted(() => {
  fetchFriends()
  fetchBattles()

  // Connect socket and listen for real-time battle updates
  connectSocket()
  const socket = getSocket()
  if (socket) {
    socket.on('battle-accepted', () => fetchBattles())
    socket.on('battle-started', () => fetchBattles())
    socket.on('battle-update', () => fetchBattles())
  }
})

onUnmounted(() => {
  const socket = getSocket()
  if (socket) {
    socket.off('battle-accepted')
    socket.off('battle-started')
    socket.off('battle-update')
  }
})
</script>

<template>
  <section class="friends-page">
    <div class="container">
      <h1 class="page-title">Amigos</h1>

      <!-- Action message -->
      <div v-if="actionMsg" class="action-msg">{{ actionMsg }}</div>

      <!-- Search & Add Friend -->
      <div class="add-friend-card">
        <h2>Agregar amigo</h2>
        <div class="search-type-toggle">
          <button :class="{ active: searchType === 'code' }" @click="searchType = 'code'">
            Por código
          </button>
          <button :class="{ active: searchType === 'email' }" @click="searchType = 'email'">
            Por correo
          </button>
        </div>
        <form @submit.prevent="searchUser" class="add-friend-form">
          <input
            v-model="searchQuery"
            :placeholder="searchType === 'code' ? 'Código de amigo (ej: AB3C4D5E)' : 'Correo electrónico'"
            required
          />
          <button type="submit" class="btn btn-primary" :disabled="searchLoading">
            {{ searchLoading ? 'Buscando...' : 'Buscar' }}
          </button>
        </form>

        <p v-if="searchError" class="search-error">{{ searchError }}</p>

        <!-- Search Result -->
        <div v-if="searchResult" class="search-result">
          <div class="user-card">
            <div class="user-avatar">{{ searchResult.username?.charAt(0).toUpperCase() }}</div>
            <div class="user-info">
              <span class="user-name">{{ searchResult.username }}</span>
              <span class="user-code">{{ searchResult.friendCode }}</span>
            </div>
            <button class="btn btn-success" @click="sendRequest">
              ➕ Enviar solicitud
            </button>
          </div>
        </div>
      </div>

      <!-- Pending Requests -->
      <div class="friends-section">
        <h2>Solicitudes pendientes <span class="badge" v-if="pending.length">{{ pending.length }}</span></h2>

        <div v-if="loading" class="loading-state">Cargando...</div>

        <div v-else-if="!pending.length" class="empty-state">
          <p>No tienes solicitudes de amistad pendientes.</p>
        </div>

        <div v-else class="friends-list">
          <div v-for="f in pending" :key="f.id" class="friend-item pending">
            <div class="user-avatar small">{{ f.otherUser?.username?.charAt(0).toUpperCase() }}</div>
            <div class="user-info">
              <span class="user-name">{{ f.otherUser?.username }}</span>
              <span class="user-code" v-if="f.direction === 'received'">Te envió una solicitud</span>
              <span class="user-code" v-else>Solicitud enviada</span>
            </div>
            <div class="friend-actions" v-if="f.direction === 'received'">
              <button class="btn btn-success btn-sm" @click="acceptRequest(f.id)">Aceptar</button>
              <button class="btn btn-outline btn-sm" @click="declineRequest(f.id)">Rechazar</button>
            </div>
            <span v-else class="pending-label">Pendiente...</span>
          </div>
        </div>
      </div>

      <!-- Accepted Friends -->
      <div class="friends-section">
        <h2>Mis amigos <span class="badge" v-if="accepted.length">{{ accepted.length }}</span></h2>

        <div v-if="loading" class="loading-state">Cargando...</div>

        <div v-else-if="!accepted.length" class="empty-state">
          <p>Aún no tienes amigos. ¡Busca por código o correo para agregar!</p>
        </div>

        <div v-else class="friends-list">
          <div v-for="f in accepted" :key="f.id" class="friend-item">
            <div class="user-avatar small">{{ f.otherUser?.username?.charAt(0).toUpperCase() }}</div>
            <div class="user-info">
              <span class="user-name">{{ f.otherUser?.username }}</span>
              <span class="user-code">{{ f.otherUser?.friendCode }}</span>
            </div>
            <button class="btn btn-primary btn-sm" @click="challengeBattle(f.otherUser.id)">
              ⚔️ Retar
            </button>
          </div>
        </div>
      </div>

      <!-- Battle Challenges -->
      <div class="friends-section">
        <h2>⚔️ Batallas <span class="badge" v-if="battles.length">{{ battles.length }}</span></h2>

        <div v-if="loading" class="loading-state">Cargando...</div>

        <div v-else-if="!battles.length" class="empty-state">
          <p>No tienes batallas activas. ¡Reta a un amigo desde tu lista de amigos!</p>
        </div>

        <div v-else class="friends-list">
          <div v-for="b in battles" :key="b.id" class="friend-item battle-item"
            :class="'battle-' + b.status">
            <div class="user-avatar small battle-avatar">⚔</div>
            <div class="user-info">
              <span class="user-name">
                {{ b.direction === 'sent' ? b.challenged?.username : b.challenger?.username }}
              </span>
              <span class="user-code">
                <template v-if="b.status === 'pending' && b.direction === 'received'">Te retó a una batalla</template>
                <template v-else-if="b.status === 'pending'">Reto enviado</template>
                <template v-else-if="b.status === 'accepted' || b.status === 'team_select'">Selecciona equipo</template>
                <template v-else-if="b.status === 'active'">¡Batalla en curso!</template>
                <template v-else-if="b.status === 'finished'">Batalla terminada</template>
                <template v-else>{{ b.status }}</template>
              </span>
            </div>
            <!-- Actions based on status -->
            <div class="friend-actions" v-if="b.status === 'pending' && b.direction === 'received'">
              <button class="btn btn-success btn-sm" @click="acceptBattle(b.id)">Aceptar</button>
              <button class="btn btn-outline btn-sm" @click="declineBattle(b.id)">Rechazar</button>
            </div>
            <button v-else-if="b.status === 'accepted' || b.status === 'team_select'"
              class="btn btn-primary btn-sm" @click="goToBattle(b.id)">
              🎮 Seleccionar equipo
            </button>
            <button v-else-if="b.status === 'active'"
              class="btn btn-primary btn-sm" @click="navigateToBattle(b.id)">
              ⚡ Ir a batalla
            </button>
            <span v-else-if="b.status === 'finished'" class="battle-done">✓</span>
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
.friends-page { padding-bottom: var(--space-16); }
.page-title { font-size: var(--font-2xl); font-weight: 800; margin-bottom: var(--space-6); }

.action-msg {
  padding: var(--space-3) var(--space-5); background: var(--lavender-soft);
  border-radius: var(--radius-md); color: var(--purple-main); font-weight: 600;
  margin-bottom: var(--space-6); text-align: center; animation: fadeInUp 0.3s ease;
}

/* Add friend card */
.add-friend-card {
  background: var(--white); border-radius: var(--radius-xl); padding: var(--space-8);
  box-shadow: var(--shadow-md); margin-bottom: var(--space-8);
}
.add-friend-card h2 { font-size: var(--font-lg); font-weight: 700; margin-bottom: var(--space-4); }

.search-type-toggle {
  display: flex; gap: var(--space-2); margin-bottom: var(--space-4);
}
.search-type-toggle button {
  padding: var(--space-2) var(--space-5); border-radius: var(--radius-full);
  font-size: var(--font-sm); font-weight: 600; background: var(--gray-100);
  color: var(--gray-500); transition: all var(--transition-fast);
}
.search-type-toggle button.active {
  background: var(--purple-main); color: var(--white);
}

.add-friend-form { display: flex; gap: var(--space-3); }
.add-friend-form input {
  flex: 1; padding: var(--space-3) var(--space-4); border: 2px solid var(--gray-200);
  border-radius: var(--radius-md); font-size: var(--font-base); font-family: var(--font-family);
}
.add-friend-form input:focus { border-color: var(--purple-main); outline: none; box-shadow: 0 0 0 3px rgba(93,63,211,0.12); }

.search-error { color: var(--danger); font-size: var(--font-sm); margin-top: var(--space-3); }

.search-result { margin-top: var(--space-4); }

/* User card */
.user-card {
  display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-5);
  background: var(--bg-base); border-radius: var(--radius-lg);
}

.user-avatar {
  width: 48px; height: 48px; border-radius: var(--radius-full);
  background: var(--purple-main); color: var(--white);
  font-weight: 800; display: flex; align-items: center; justify-content: center;
  font-size: var(--font-lg); flex-shrink: 0;
}
.user-avatar.small { width: 40px; height: 40px; font-size: var(--font-base); }

.user-info { flex: 1; display: flex; flex-direction: column; }
.user-name { font-weight: 700; color: var(--gray-900); }
.user-code { font-size: var(--font-xs); color: var(--gray-500); }

/* Friends sections */
.friends-section { margin-bottom: var(--space-8); }
.friends-section h2 { font-size: var(--font-lg); font-weight: 700; margin-bottom: var(--space-4); display: flex; align-items: center; gap: var(--space-2); }

.badge {
  font-size: var(--font-xs); background: var(--purple-main); color: var(--white);
  padding: 2px 10px; border-radius: var(--radius-full); font-weight: 700;
}

.friends-list { display: flex; flex-direction: column; gap: var(--space-3); }

.friend-item {
  display: flex; align-items: center; gap: var(--space-4); padding: var(--space-4) var(--space-5);
  background: var(--white); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm);
  transition: transform var(--transition-fast);
}
.friend-item:hover { transform: translateX(4px); }
.friend-item.pending { border-left: 4px solid var(--warning); }

.friend-actions { display: flex; gap: var(--space-2); }
.btn-sm { padding: var(--space-2) var(--space-4); font-size: var(--font-xs); }

.pending-label { font-size: var(--font-xs); color: var(--warning); font-weight: 600; }

.loading-state, .empty-state {
  text-align: center; padding: var(--space-10); color: var(--gray-500);
  background: var(--white); border-radius: var(--radius-lg);
}

.battle-item.battle-active { border-left: 4px solid var(--green-leaf); }
.battle-item.battle-accepted, .battle-item.battle-team_select { border-left: 4px solid var(--purple-main); }
.battle-item.battle-finished { opacity: 0.6; }
.battle-avatar { background: #f44336 !important; }
.battle-done { color: var(--gray-400); font-weight: 700; font-size: var(--font-lg); }

@media (max-width: 640px) {
  .add-friend-form { flex-direction: column; }
  .friend-item { flex-wrap: wrap; }
}
</style>
