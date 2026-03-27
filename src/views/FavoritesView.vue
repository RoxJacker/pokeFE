<script setup>
import { ref, onMounted } from 'vue'
import { currentUser, updateFavoriteCharacteristics } from '../utils/auth.js'
import axios from 'axios'
import LoadingSkeleton from '../components/LoadingSkeleton.vue'

const favoriteDetails = ref([])
const loading = ref(true)

const editingFav = ref(null)
const tempNickname = ref('')
const tempNotes = ref('')
const loadingSave = ref(false)

async function loadFavorites() {
  if (!currentUser.value || !currentUser.value.favorites) {
    loading.value = false
    return
  }
  
  try {
    const promises = currentUser.value.favorites.map(fav =>
      axios.get(`https://pokeapi.co/api/v2/pokemon/${fav.pokemonId}`).then(res => {
        return { ...res.data, favData: fav }
      })
    )
    favoriteDetails.value = await Promise.all(promises)
  } catch (err) {
    console.error('Error loading favorites:', err)
  }
  loading.value = false
}

onMounted(() => {
  loadFavorites()
})

const padId = (id) => String(id).padStart(3, '0')

const spriteUrl = (pokemon) => {
  return (
    pokemon.sprites?.other?.['official-artwork']?.front_default ||
    pokemon.sprites?.front_default ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`
  )
}

function openEditModal(favData) {
  editingFav.value = favData
  tempNickname.value = favData.nickname || ''
  tempNotes.value = favData.notes || ''
}

function closeEditModal() {
  editingFav.value = null
}

async function saveEdit() {
  if (!editingFav.value) return
  loadingSave.value = true
  await updateFavoriteCharacteristics(editingFav.value.pokemonId, {
    nickname: tempNickname.value,
    notes: tempNotes.value
  })
  
  // Update local details array
  const idx = favoriteDetails.value.findIndex(p => p.id === editingFav.value.pokemonId)
  if (idx !== -1) {
    favoriteDetails.value[idx].favData.nickname = tempNickname.value
    favoriteDetails.value[idx].favData.notes = tempNotes.value
  }
  
  loadingSave.value = false
  closeEditModal()
}
</script>

<template>
  <section class="favorites-view">
    <div class="container">
      <h1 class="section-title">Mis Favoritos</h1>
      
      <LoadingSkeleton v-if="loading" :count="4" />
      
      <div v-else-if="favoriteDetails.length === 0" class="empty-state">
        <p class="empty-emoji">🤍</p>
        <h2>Aún no tienes favoritos</h2>
        <p>Busca Pokémon y dales un corazón para guardarlos aquí.</p>
        <RouterLink to="/" class="btn btn-primary" style="margin-top: var(--space-4)">Ver Pokédex</RouterLink>
      </div>
      
      <div v-else class="favorites-grid">
        <div v-for="pokemon in favoriteDetails" :key="pokemon.id" class="fav-card">
          <RouterLink :to="`/pokemon/${pokemon.id}`" class="fav-img-wrapper">
             <span class="card-id">#{{ padId(pokemon.id) }}</span>
             <img :src="spriteUrl(pokemon)" :alt="pokemon.name" class="fav-img" />
          </RouterLink>
          <div class="fav-info">
            <div class="fav-header">
              <h3 class="fav-name">{{ pokemon.name }}</h3>
              <button class="btn-edit" @click="openEditModal(pokemon.favData)" aria-label="Editar">✏️</button>
            </div>
            
            <div class="fav-characteristics" v-if="pokemon.favData.nickname || pokemon.favData.notes">
              <p class="nickname" v-if="pokemon.favData.nickname">
                <strong>Apodo:</strong> {{ pokemon.favData.nickname }}
              </p>
              <p class="notes" v-if="pokemon.favData.notes">
                <strong>Notas:</strong> {{ pokemon.favData.notes }}
              </p>
            </div>
            <div class="fav-characteristics empty" v-else>
               <p>Haz clic en editar para agregar un apodo o notas a este Pokémon.</p>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Edit Modal -->
      <Teleport to="body">
        <div class="modal-overlay" v-if="editingFav" @click.self="closeEditModal">
          <div class="modal-content">
            <div class="modal-header">
              <h2>Editar Características</h2>
              <button class="btn-close" @click="closeEditModal">×</button>
            </div>
            <div class="modal-body">
              <div class="form-group">
                <label>Apodo</label>
                <input v-model="tempNickname" type="text" placeholder="Ej: Sparky" class="input" />
              </div>
              <div class="form-group">
                <label>Notas</label>
                <textarea v-model="tempNotes" placeholder="Ej: Compañero desde el primer día..." class="input textarea"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-outline" @click="closeEditModal">Cancelar</button>
              <button class="btn btn-primary" @click="saveEdit" :disabled="loadingSave">
                {{ loadingSave ? 'Guardando...' : 'Guardar Cambios' }}
              </button>
            </div>
          </div>
        </div>
      </Teleport>
      
    </div>
  </section>
</template>

<style scoped>
.favorites-view {
  padding-bottom: var(--space-16);
}

.section-title {
  font-size: var(--font-2xl);
  font-weight: 800;
  color: var(--gray-900);
  margin-bottom: var(--space-8);
}

.empty-state {
  text-align: center;
  padding: var(--space-12) 0;
  color: var(--gray-500);
}
.empty-emoji { font-size: 4rem; margin-bottom: var(--space-4); }

.favorites-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-6);
}

.fav-card {
  display: flex;
  background: var(--white);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: transform var(--transition-base), box-shadow var(--transition-base);
}

.fav-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
}

.fav-img-wrapper {
  position: relative;
  background: var(--lavender-soft);
  width: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  flex-shrink: 0;
}

.card-id {
  position: absolute;
  top: 8px;
  left: 8px;
  font-size: 10px;
  font-weight: 800;
  color: var(--purple-main);
  opacity: 0.6;
}

.fav-img {
  width: 80px;
  height: 80px;
  object-fit: contain;
  transition: transform var(--transition-base);
}

.fav-card:hover .fav-img {
  transform: scale(1.1);
}

.fav-info {
  flex: 1;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
}

.fav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-2);
}

.fav-name {
  font-weight: 700;
  font-size: var(--font-lg);
  text-transform: capitalize;
  color: var(--gray-900);
}

.btn-edit {
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  padding: 4px;
  border-radius: var(--radius-full);
  transition: background var(--transition-fast);
}
.btn-edit:hover { background: var(--gray-100); }

.fav-characteristics {
  background: var(--gray-50);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  font-size: var(--font-sm);
  color: var(--gray-700);
  flex: 1;
}

.fav-characteristics .nickname { margin-bottom: 4px; color: var(--purple-dark); }
.fav-characteristics.empty { color: var(--gray-400); font-style: italic; }

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-4);
  backdrop-filter: blur(2px);
}

.modal-content {
  background: var(--white);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 400px;
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  animation: scaleUp 0.3s ease;
}

@keyframes scaleUp {
  from { transform: scale(0.95); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--gray-200);
}

.modal-header h2 { font-size: var(--font-lg); font-weight: 700; }
.btn-close { background: none; border: none; font-size: 1.5rem; color: var(--gray-500); cursor: pointer; }

.modal-body { padding: var(--space-6); display: flex; flex-direction: column; gap: var(--space-4); }
.modal-footer {
  padding: var(--space-4) var(--space-6);
  background: var(--gray-50);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
  border-top: 1px solid var(--gray-200);
}

.form-group { display: flex; flex-direction: column; gap: var(--space-2); }
.form-group label { font-size: var(--font-sm); font-weight: 600; color: var(--gray-700); }
.input {
  padding: var(--space-3);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: var(--font-base);
}
.input:focus { outline: none; border-color: var(--purple-main); box-shadow: 0 0 0 3px rgba(93, 63, 211, 0.1); }
.textarea { resize: vertical; min-height: 80px; }
</style>
