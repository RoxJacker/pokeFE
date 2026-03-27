<script setup>
defineProps({
  type: {
    type: String,
    required: true,
  },
})

const typeIcons = {
  normal: '⚪', fire: '🔥', water: '💧', electric: '⚡', grass: '🍃',
  ice: '❄️', fighting: '🥊', poison: '☠️', ground: '⛰️', flying: '🦅',
  psychic: '👁️', bug: '🐛', rock: '🪨', ghost: '👻', dragon: '🐉',
  dark: '🌙', steel: '⚙️', fairy: '✨'
}
</script>

<template>
  <span class="type-badge" :title="type">
    <span class="type-icon">{{ typeIcons[type] || '⚪' }}</span>
  </span>
</template>

<style scoped>
.type-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: rgba(255, 255, 255, 0.65);
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  backdrop-filter: blur(4px);
  transition: transform var(--transition-fast);
}

.type-badge:hover {
  transform: scale(1.1);
}

.type-icon {
  font-size: 13px;
  line-height: 1;
}
</style>
