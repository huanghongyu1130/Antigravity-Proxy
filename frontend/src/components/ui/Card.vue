<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  description: {
    type: String,
    default: ''
  },
  padding: {
    type: Boolean,
    default: true
  },
  hoverable: {
    type: Boolean,
    default: false
  }
})
</script>

<template>
  <div :class="['card', { 'card-hoverable': hoverable, 'card-no-padding': !padding }]">
    <div v-if="title || $slots.header" class="card-header">
      <div v-if="title" class="card-header-content">
        <h3 class="card-title">{{ title }}</h3>
        <p v-if="description" class="card-description">{{ description }}</p>
      </div>
      <slot name="header" />
      <div v-if="$slots.actions" class="card-actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<style scoped>
.card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  transition: border-color var(--transition), box-shadow var(--transition);
}

.card-hoverable:hover {
  border-color: var(--border-color-strong);
  box-shadow: var(--shadow-md);
}

.card-no-padding .card-body {
  padding: 0;
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--border-color);
}

.card-header-content {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.card-description {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin: var(--space-1) 0 0 0;
}

.card-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.card-body {
  padding: var(--space-6);
}

.card-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}

@media (max-width: 639px) {
  .card {
    border-radius: var(--radius-md);
  }

  .card-header,
  .card-body {
    padding: var(--space-4);
  }

  .card-footer {
    padding: var(--space-3) var(--space-4);
  }
}
</style>
