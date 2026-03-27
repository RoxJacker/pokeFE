<script setup>
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import TypeBadge from './TypeBadge.vue'
import { currentUser, toggleFavorite } from '../utils/auth.js'

const props = defineProps({
  pokemon: {
    type: Object,
    required: true,
  },
})

const router = useRouter()
const padId = (id) => String(id).padStart(3, '0')

const spriteUrl = (pokemon) => {
  return (
    pokemon.sprites?.other?.['official-artwork']?.front_default ||
    pokemon.sprites?.front_default ||
    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`
  )
}

const isFavorite = computed(() => {
  if (!currentUser.value || !currentUser.value.favorites) return false
  return currentUser.value.favorites.some(f => f.pokemonId === props.pokemon.id)
})

async function onToggleFavorite(e) {
  e.preventDefault()
  if (!currentUser.value) {
    alert('Debes iniciar sesión para agregar a favoritos.')
    router.push('/login')
    return
  }
  await toggleFavorite(props.pokemon.id)
}
</script>

<template>
  <RouterLink :to="`/pokemon/${pokemon.id}`" class="pokemon-card" :style="{'--type-bg': `var(--type-${pokemon.types[0].type.name})`}">
    <div class="card-bg-circle"></div>
    <button class="favorite-btn" @click.stop="onToggleFavorite" :aria-label="isFavorite ? 'Quitar de favoritos' : 'Añadir a favoritos'">
      {{ isFavorite ? '❤️' : '🤍' }}
    </button>
    <div class="card-image-wrapper">
      <img :src="spriteUrl(pokemon)" :alt="pokemon.name" class="card-image" loading="lazy" />
    </div>
    <span class="card-id">#{{ padId(pokemon.id) }}</span>
    <h3 class="card-name">{{ pokemon.name }}</h3>
    <div class="card-types">
      <TypeBadge v-for="t in pokemon.types" :key="t.type.name" :type="t.type.name" />
    </div>
    <div class="card-action">
      <button class="btn-ver-grafica">Ver Gráfica</button>
    </div>
  </RouterLink>
</template>

<style scoped>
.pokemon-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--type-bg, #ccc);
  border-radius: 20px;
  padding: 90px 16px 20px;
  text-decoration: none;
  color: inherit;
  position: relative;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  cursor: pointer;
  margin-top: 60px;
  box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

.pokemon-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.15);
}

.pokemon-card:hover .card-image {
  transform: scale(1.1) rotate(2deg);
}

.card-bg-circle {
  position: absolute;
  top: 15px;
  width: 140px;
  height: 140px;
  background: rgba(255,255,255,0.45);
  border-radius: 50%;
  z-index: 1;
}

.card-image-wrapper {
  position: absolute;
  top: -65px;
  width: 160px;
  height: 160px;
  display: flex;
  justify-content: center;
  z-index: 2;
  pointer-events: none;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 6px 12px rgba(0,0,0,0.25));
  transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.card-id {
  background: rgba(255,255,255,0.4);
  padding: 4px 14px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 800;
  color: rgba(0,0,0,0.5);
  z-index: 3;
  margin-bottom: 8px;
}

.card-name {
  font-size: 20px;
  font-weight: 800;
  text-transform: capitalize;
  color: #333333;
  z-index: 3;
  margin-bottom: 12px;
  line-height: 1.1;
}

.card-types {
  display: flex;
  gap: 10px;
  z-index: 3;
  margin-bottom: 20px;
}

.card-action {
  z-index: 3;
  width: 100%;
  padding: 0 10px;
}

.btn-ver-grafica {
  background: rgba(0,0,0,0.15);
  border: none;
  width: 100%;
  padding: 10px;
  border-radius: 20px;
  color: #ffffff;
  font-family: inherit;
  font-weight: 600;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.pokemon-card:hover .btn-ver-grafica {
  background: rgba(0,0,0,0.3);
}

.favorite-btn {
  position: absolute;
  top: 12px;
  left: 12px;
  background: rgba(255,255,255,0.6);
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  cursor: pointer;
  z-index: 10;
  font-size: 16px;
  transition: transform 0.2s, background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.favorite-btn:hover {
  transform: scale(1.15);
  background: rgba(255,255,255,0.9);
}
</style>
