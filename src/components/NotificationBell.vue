<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/utils/api'

const route = useRoute()
const notifications = ref([])
const showPanel = ref(false)
const loading = ref(false)

const unreadCount = computed(() => notifications.value.length)

async function fetchPendingItems() {
  loading.value = true
  try {
    const [friendsRes, battlesRes] = await Promise.all([
      api.get('/api/friends').catch(() => ({ data: { pending: [] } })),
      api.get('/api/battles').catch(() => ({ data: { battles: [] } }))
    ])
    
    const newAlerts = []
    
    // Solicitudes de amistad recibidas pendientes
    const pendingFriends = friendsRes.data.pending || []
    pendingFriends.forEach(f => {
      if (f.direction === 'received') {
        newAlerts.push({
          id: f.id,
          type: 'invitacion-amistad',
          title: 'Solicitud de Amistad',
          body: `${f.otherUser?.username || 'Alguien'} quiere ser tu amigo.`,
          time: f.createdAt,
          itemData: f
        })
      }
    })
    
    // Retos de batalla recibidos pendientes
    const battles = battlesRes.data.battles || []
    battles.forEach(b => {
      if (b.status === 'pending' && b.direction === 'received') {
        newAlerts.push({
          id: b.id,
          type: 'reto-batalla',
          title: '¡Reto de Batalla!',
          body: `${b.challenger?.username || 'Un entrenador'} te ha desafiado.`,
          time: b.createdAt,
          itemData: b
        })
      }
    })
    
    // Sort by newest first
    newAlerts.sort((a,b) => new Date(b.time) - new Date(a.time))
    notifications.value = newAlerts
    
  } catch(e) {
    console.error('Error fetching notifications', e)
  }
  loading.value = false
}

// Interactive Actions
async function acceptFriend(id) {
  try {
    await api.post(`/api/friends/${id}/accept`)
    await fetchPendingItems()
  } catch(e) { console.error(e) }
}

async function declineFriend(id) {
  try {
    await api.post(`/api/friends/${id}/decline`)
    await fetchPendingItems()
  } catch(e) { console.error(e) }
}

async function acceptBattle(id) {
  try {
    await api.post(`/api/battles/${id}/accept`)
    await fetchPendingItems()
  } catch(e) { console.error(e) }
}

async function declineBattle(id) {
  try {
    await api.post(`/api/battles/${id}/decline`)
    await fetchPendingItems()
  } catch(e) { console.error(e) }
}

function handleSWMessage(event) {
  if (event.data?.type === 'PUSH_NOTIFICATION') {
    // Re-fetch from backend to keep it perfectly synced
    fetchPendingItems()
  }
}

function togglePanel() {
  showPanel.value = !showPanel.value
  if (showPanel.value) fetchPendingItems()
}

function formatTime(date) {
  if (!date) return ''
  const d = new Date(date)
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
}

function getIcon(type) {
  if (type === 'invitacion-amistad') return '🤝'
  if (type === 'reto-batalla') return '⚔️'
  return '🔔'
}

let pollInterval;

// Re-fetch when navigating between pages
watch(() => route.path, () => {
  fetchPendingItems()
})

onMounted(() => {
  fetchPendingItems()
  // Listen for SW push messages
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener('message', handleSWMessage)
  }
  // Also listen for when a SW takes control (first load)
  navigator.serviceWorker?.ready.then(() => {
    navigator.serviceWorker.addEventListener('message', handleSWMessage)
  })
  // Poll every 30 seconds to catch misses
  pollInterval = setInterval(fetchPendingItems, 30000)
})

onUnmounted(() => {
  navigator.serviceWorker?.removeEventListener('message', handleSWMessage)
  clearInterval(pollInterval)
})
</script>

<template>
  <div class="notif-wrapper">
    <button class="notif-bell" @click="togglePanel" :aria-label="`${unreadCount} notificaciones`">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
      </svg>
      <span v-if="unreadCount > 0" class="notif-badge">{{ unreadCount > 9 ? '9+' : unreadCount }}</span>
    </button>

    <!-- Panel -->
    <Transition name="panel">
      <div v-if="showPanel" class="notif-panel">
        <div class="notif-panel-header">
          <h3>Notificaciones</h3>
          <button class="refresh-btn" @click="fetchPendingItems" :class="{ spinning: loading }">↻</button>
        </div>

        <div v-if="!notifications.length" class="notif-empty">
          <span class="empty-icon">🎉</span>
          <p>¡Estás al día!</p>
        </div>

        <div v-else class="notif-list">
          <div
            v-for="n in notifications"
            :key="n.id"
            class="notif-item unread"
          >
            <span class="notif-icon">{{ getIcon(n.type) }}</span>
            <div class="notif-content">
              <div class="notif-header-row">
                <span class="notif-title">{{ n.title }}</span>
                <span class="notif-time">{{ formatTime(n.time) }}</span>
              </div>
              <span class="notif-body">{{ n.body }}</span>
              
              <div class="notif-actions">
                <template v-if="n.type === 'invitacion-amistad'">
                  <button class="btn-sm btn-accept" @click="acceptFriend(n.id)">Aceptar</button>
                  <button class="btn-sm btn-decline" @click="declineFriend(n.id)">Rechazar</button>
                </template>
                <template v-if="n.type === 'reto-batalla'">
                  <button class="btn-sm btn-accept" @click="acceptBattle(n.id)">Aceptar Reto</button>
                  <button class="btn-sm btn-decline" @click="declineBattle(n.id)">Rechazar</button>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <div v-if="showPanel" class="notif-overlay" @click="showPanel = false"></div>
  </div>
</template>

<style scoped>
.notif-wrapper { position: relative; }

.notif-bell {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 40px; height: 40px; border-radius: var(--radius-full);
  background: transparent; color: var(--gray-500);
  transition: all var(--transition-fast);
}
.notif-bell:hover { background: var(--lavender-soft); color: var(--purple-main); }

.notif-badge {
  position: absolute; top: 2px; right: 2px;
  min-width: 18px; height: 18px; border-radius: var(--radius-full);
  background: var(--danger); color: var(--white);
  font-size: 11px; font-weight: 700; display: flex; align-items: center; justify-content: center;
  padding: 0 4px; line-height: 1;
  animation: scaleIn 0.3s ease;
}

.notif-panel {
  position: absolute; top: calc(100% + 8px); right: 0;
  width: 360px; max-height: 80vh;
  background: var(--surface); border-radius: var(--radius-lg);
  border: 1px solid var(--surface-border);
  backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
  box-shadow: var(--shadow-lg); overflow: hidden;
  z-index: 200; display: flex; flex-direction: column;
}

@media (max-width: 480px) {
  .notif-panel {
    position: fixed;
    top: 60px; left: 16px; right: 16px;
    width: auto; max-height: calc(100vh - 120px);
  }
}

.notif-panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-4) var(--space-5); border-bottom: 1px solid var(--surface-border);
}
.notif-panel-header h3 { font-size: var(--font-lg); font-weight: 800; color: var(--purple-main); }

.refresh-btn {
  background: none; border: none; color: var(--purple-main); font-size: 1.2rem; cursor: pointer;
}
.spinning { animation: spin 1s linear infinite; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.notif-empty { text-align: center; padding: var(--space-10); color: var(--gray-500); }
.empty-icon { font-size: 2.5rem; display: block; margin-bottom: var(--space-2); }

.notif-list { overflow-y: auto; max-height: 400px; }

.notif-item {
  display: flex; align-items: flex-start; gap: var(--space-3);
  padding: var(--space-4); border-bottom: 1px solid var(--surface-border);
  transition: background var(--transition-fast);
}
.notif-item:hover { background: rgba(255,255,255,0.03); }

.notif-icon { font-size: 1.5rem; flex-shrink: 0; margin-top: 2px; }
.notif-content { flex: 1; min-width: 0; }
.notif-header-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
.notif-title { display: block; font-size: var(--font-sm); font-weight: 700; color: var(--white); }
.notif-time { font-size: 10px; color: var(--gray-500); white-space: nowrap; flex-shrink: 0; }
.notif-body { display: block; font-size: var(--font-xs); color: var(--gray-300); line-height: 1.4; margin-bottom: var(--space-3); }

.notif-actions {
  display: flex; gap: var(--space-2);
}

.btn-sm {
  padding: var(--space-1) var(--space-3);
  font-size: 0.75rem; font-weight: 600; border-radius: var(--radius-sm);
  background: transparent; cursor: pointer; transition: all var(--transition-fast);
}
.btn-accept { border: 1px solid var(--green-leaf); color: var(--green-leaf); }
.btn-accept:hover { background: var(--green-leaf); color: #000; }
.btn-decline { border: 1px solid var(--danger); color: var(--danger); }
.btn-decline:hover { background: var(--danger); color: #fff; }

.notif-overlay { position: fixed; inset: 0; z-index: 150; }

.panel-enter-active { animation: panelIn 0.2s ease; }
.panel-leave-active { animation: panelIn 0.15s ease reverse; }
@keyframes panelIn {
  from { opacity: 0; transform: translateY(-8px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@media (max-width: 640px) {
  .notif-panel { width: calc(100vw - 32px); right: -16px; }
}
</style>
