<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  placeholder: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: ''
  },
  error: {
    type: String,
    default: ''
  },
  help: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue'])

const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const hasIcon = computed(() => {
  return !!props.icon
})
</script>

<template>
  <div class="input-wrapper">
    <label v-if="label" class="input-label">{{ label }}</label>
    <div class="input-container">
      <span v-if="$slots.icon" class="input-icon">
        <slot name="icon" />
      </span>
      <input
        v-model="inputValue"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        :class="[
          'input',
          $slots.icon && 'input-with-icon',
          error && 'input-error'
        ]"
      />
      <span v-if="$slots.suffix" class="input-suffix">
        <slot name="suffix" />
      </span>
    </div>
    <p v-if="error" class="input-error-text">{{ error }}</p>
    <p v-else-if="help" class="input-help">{{ help }}</p>
  </div>
</template>

<style scoped>
.input-wrapper {
  width: 100%;
}

.input-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.input-container {
  position: relative;
  display: flex;
  align-items: center;
}

.input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-family: inherit;
  transition: all var(--transition);
}

.input:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.input::placeholder {
  color: var(--text-muted);
}

.input:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-with-icon {
  padding-left: 42px;
}

.input-icon {
  position: absolute;
  left: var(--space-3);
  color: var(--text-muted);
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.input-suffix {
  position: absolute;
  right: var(--space-3);
  color: var(--text-muted);
  display: flex;
  align-items: center;
}

.input-error {
  border-color: var(--error);
}

.input-error:focus {
  box-shadow: 0 0 0 3px var(--error-light);
}

.input-help {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin-top: var(--space-1);
}

.input-error-text {
  font-size: var(--text-xs);
  color: var(--error);
  margin-top: var(--space-1);
}
</style>
