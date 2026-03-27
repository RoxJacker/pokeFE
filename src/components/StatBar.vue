<script setup>
defineProps({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  max: { type: Number, default: 255 },
})

const percentage = (v, m) => Math.min((v / m) * 100, 100)

const barColor = (val) => {
  if (val >= 100) return 'var(--green-leaf)'
  if (val >= 60) return 'var(--purple-light)'
  if (val >= 40) return 'var(--warning)'
  return 'var(--danger)'
}
</script>

<template>
  <div class="stat-bar">
    <div class="stat-label">{{ label }}</div>
    <div class="stat-value">{{ value }}</div>
    <div class="stat-track">
      <div
        class="stat-fill"
        :style="{
          '--fill': percentage(value, max) + '%',
          backgroundColor: barColor(value),
        }"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.stat-bar {
  display: grid;
  grid-template-columns: 100px 45px 1fr;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}

.stat-label {
  font-size: var(--font-sm);
  font-weight: 600;
  color: var(--gray-700);
  text-transform: capitalize;
}

.stat-value {
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--gray-900);
  text-align: right;
}

.stat-track {
  height: 10px;
  background: var(--gray-200);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.stat-fill {
  height: 100%;
  width: var(--fill);
  border-radius: var(--radius-full);
  animation: fillBar 0.8s ease forwards;
}
</style>
