<script setup>
import { X, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-vue-next'
import { useToast } from '../../composables/useToast'

const { toasts, removeToast } = useToast()

const icons = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          :class="['toast', `toast-${toast.type}`]"
        >
          <component :is="icons[toast.type]" :size="20" class="toast-icon" />
          <span class="toast-message">{{ toast.message }}</span>
          <button
            v-if="toast.closable"
            class="toast-close"
            @click="removeToast(toast.id)"
          >
            <X :size="16" />
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  top: var(--space-4);
  right: var(--space-4);
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 300px;
  max-width: 400px;
  pointer-events: auto;
}

.toast-success {
  border-left: 3px solid var(--success);
}

.toast-success .toast-icon {
  color: var(--success);
}

.toast-error {
  border-left: 3px solid var(--error);
}

.toast-error .toast-icon {
  color: var(--error);
}

.toast-warning {
  border-left: 3px solid var(--warning);
}

.toast-warning .toast-icon {
  color: var(--warning);
}

.toast-info {
  border-left: 3px solid var(--info);
}

.toast-info .toast-icon {
  color: var(--info);
}

.toast-message {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.toast-close {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  display: flex;
}

.toast-close:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all var(--transition);
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform var(--transition);
}

/* Mobile adjustments */
@media (max-width: 639px) {
  .toast-container {
    left: var(--space-4);
    right: var(--space-4);
    top: auto;
    bottom: calc(var(--mobile-nav-height) + var(--space-4));
  }

  .toast {
    min-width: auto;
    max-width: none;
  }

  .toast-enter-from,
  .toast-leave-to {
    transform: translateY(100%);
  }
}
</style>
