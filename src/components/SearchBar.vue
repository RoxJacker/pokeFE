<script setup>
const emit = defineEmits(['search', 'clear'])
const model = defineModel({ type: String, default: '' })

function onSubmit() {
  if (model.value) {
    emit('search', model.value.trim().toLowerCase())
  }
}

function clear() {
  model.value = ''
  emit('clear')
  emit('search', '')
}
</script>

<template>
  <form @submit.prevent="onSubmit" class="search-bar">
    <div class="search-icon">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    </div>
    <input
      type="text"
      v-model="model"
      placeholder="Busca tu pokemon"
      class="search-input"
    />
    <button v-if="model" type="button" class="clear-btn" @click="clear" aria-label="Limpiar búsqueda">✖</button>
    <button type="submit" class="btn-buscar">Buscar</button>
  </form>
</template>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  background: transparent;
  padding: 2px 8px 2px 16px;
  gap: 8px;
  width: 100%;
}

.search-icon {
  color: var(--gray-700);
  flex-shrink: 0;
  display: flex;
  opacity: 0.6;
}

.search-input {
  flex: 1;
  border: none;
  outline: none;
  font-family: var(--font-family);
  font-size: 15px;
  color: var(--gray-900);
  background: transparent;
  min-width: 0;
}

.search-input::placeholder {
  color: rgba(0,0,0,0.4);
}

.clear-btn {
  background: transparent;
  color: var(--gray-500);
  border: none;
  font-size: 12px;
  cursor: pointer;
  padding: 4px;
}

.btn-buscar {
  background: #007aff;
  color: white;
  border-radius: 20px;
  padding: 8px 20px;
  font-weight: 700;
  font-size: 14px;
  font-family: inherit;
  border: none;
  cursor: pointer;
  transition: background 0.2s, transform 0.2s;
  box-shadow: 0 4px 6px rgba(0, 122, 255, 0.3);
}

.btn-buscar:hover {
  background: #005ce6;
  transform: translateY(-1px);
}
</style>
