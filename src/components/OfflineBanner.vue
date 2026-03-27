<script setup>
import { ref, onMounted, onUnmounted } from 'vue'

const isOffline = ref(!navigator.onLine)

function updateStatus() {
  isOffline.value = !navigator.onLine
}

onMounted(() => {
  window.addEventListener('offline', updateStatus)
  window.addEventListener('online', updateStatus)
})

onUnmounted(() => {
  window.removeEventListener('offline', updateStatus)
  window.removeEventListener('online', updateStatus)
})
</script>

<template>
  <Transition name="slide-down">
    <div v-if="isOffline" class="offline-banner">
      <div class="offline-content">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="offline-icon">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 00-12.728 0M12 18v.01M15.536 8.464a5 5 0 00-7.072 0M12 13a2 2 0 00-2-2"></path>
        </svg>
        <span><strong>Modo sin conexión.</strong> Tu progreso se guardará localmente.</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  background: var(--warning);
  color: #000;
  z-index: 9999;
  padding: var(--space-2) var(--space-4);
  display: flex;
  justify-content: center;
  box-shadow: var(--shadow-md);
}

.offline-content {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-sm);
}

.offline-icon {
  width: 20px;
  height: 20px;
}

.slide-down-enter-active,
.slide-down-leave-active {
  transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.slide-down-enter-from,
.slide-down-leave-to {
  transform: translateY(-100%);
}
</style>
