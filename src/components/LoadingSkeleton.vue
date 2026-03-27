<template>
  <div class="skeleton-grid">
    <div v-for="n in count" :key="n" class="skeleton-card">
      <div class="skeleton-image"></div>
      <div class="skeleton-text short"></div>
      <div class="skeleton-badges">
        <div class="skeleton-badge"></div>
        <div class="skeleton-badge"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  count: { type: Number, default: 20 },
})
</script>

<style scoped>
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: var(--space-6);
}

.skeleton-card {
  background: var(--white);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
}

.skeleton-image {
  width: 96px;
  height: 96px;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
  background-size: 400% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text {
  height: 16px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
  background-size: 400% 100%;
  animation: shimmer 1.5s infinite;
}

.skeleton-text.short {
  width: 60%;
}

.skeleton-badges {
  display: flex;
  gap: var(--space-2);
}

.skeleton-badge {
  width: 60px;
  height: 22px;
  border-radius: var(--radius-full);
  background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
  background-size: 400% 100%;
  animation: shimmer 1.5s infinite;
}
</style>
