<script setup>
import { ref, computed } from 'vue'
import api from '../utils/api.js'

const props = defineProps({
  battleId: { type: String, required: true },
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'started'])

const team = ref([])
const loading = ref(true)
const submitting = ref(false)
const error = ref('')

async function loadTeam() {
  loading.value = true
  try {
    const { data } = await api.get('/api/teams/me')
    team.value = data.team || []
  } catch {
    error.value = 'Error al cargar tu equipo.'
  } finally {
    loading.value = false
  }
}

async function startBattle() {
  if (!team.value.length) {
    error.value = 'Necesitas al menos 1 Pokémon en tu equipo.'
    return
  }
  submitting.value = true
  error.value = ''
  try {
    const pokemonIds = team.value.map(p => p.id)
    const { data } = await api.post(`/api/battles/${props.battleId}/start`, { team: pokemonIds })
    emit('started', data)
  } catch (err) {
    error.value = err.response?.data?.error || 'Error al iniciar batalla.'
  } finally {
    submitting.value = false
  }
}

// Load team when visible
import { watch } from 'vue'
watch(() => props.visible, (val) => {
  if (val) loadTeam()
})
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="modal-backdrop" @click.self="emit('close')">
      <div class="team-modal">
        <div class="modal-header">
          <h2>⚔️ Selecciona tu equipo</h2>
          <button class="close-btn" @click="emit('close')">✕</button>
        </div>

        <p class="modal-desc">Tu equipo guardado será usado en la batalla.</p>

        <div v-if="loading" class="modal-loading">Cargando equipo...</div>

        <div v-else-if="!team.length" class="modal-empty">
          <p>No tienes un equipo. Ve al <strong>Constructor de equipo</strong> para crear uno.</p>
        </div>

        <div v-else class="team-preview">
          <div v-for="p in team" :key="p.id" class="team-preview-item">
            <img :src="p.sprite" :alt="p.name" class="preview-sprite" />
            <span class="preview-name">{{ p.name }}</span>
          </div>
        </div>

        <div v-if="error" class="modal-error">{{ error }}</div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="emit('close')">Cancelar</button>
          <button class="btn btn-primary" :disabled="submitting || !team.length" @click="startBattle">
            {{ submitting ? 'Preparando...' : '🎮 ¡A luchar!' }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-backdrop {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 200; backdrop-filter: blur(4px);
  animation: fadeIn 0.2s ease;
}

.team-modal {
  background: white; border-radius: var(--radius-xl); padding: var(--space-8);
  max-width: 440px; width: 92%; box-shadow: 0 24px 48px rgba(0,0,0,0.2);
  animation: scaleIn 0.3s ease;
}

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--space-4);
}

.modal-header h2 { font-size: var(--font-xl); font-weight: 800; }

.close-btn {
  width: 32px; height: 32px; border-radius: var(--radius-full);
  background: var(--gray-100); display: flex; align-items: center;
  justify-content: center; cursor: pointer; font-size: var(--font-lg);
}

.modal-desc { color: var(--gray-500); margin-bottom: var(--space-6); }

.modal-loading, .modal-empty {
  text-align: center; padding: var(--space-8); color: var(--gray-500);
}

.team-preview {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.team-preview-item {
  display: flex; flex-direction: column; align-items: center; gap: var(--space-2);
  background: var(--lavender-soft); border-radius: var(--radius-lg); padding: var(--space-3);
}

.preview-sprite { width: 64px; height: 64px; object-fit: contain; }
.preview-name { font-weight: 700; text-transform: capitalize; font-size: var(--font-sm); }

.modal-error {
  background: #fce4ec; color: #c62828; padding: var(--space-3); border-radius: var(--radius-md);
  text-align: center; margin-bottom: var(--space-4); font-weight: 600;
}

.modal-actions {
  display: flex; gap: var(--space-3); justify-content: flex-end;
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.9); }
  to { opacity: 1; transform: scale(1); }
}
</style>
