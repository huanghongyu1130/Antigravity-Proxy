<script setup>
defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (v) => ['default', 'success', 'warning', 'error', 'info', 'purple'].includes(v)
  },
  dot: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <span :class="['badge', `badge-${variant}`]">
    <span v-if="dot" class="badge-dot"></span>
    <slot />
  </span>
</template>

<style scoped>
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 500;
  white-space: nowrap;
}

.badge-default {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.badge-success {
  background: var(--success-light);
  color: var(--success);
}

.badge-warning {
  background: var(--warning-light);
  color: var(--warning);
}

.badge-error {
  background: var(--error-light);
  color: var(--error);
}

.badge-info {
  background: var(--info-light);
  color: var(--info);
}

.badge-purple {
  background: var(--purple-light);
  color: var(--purple);
}

.badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
</style>
