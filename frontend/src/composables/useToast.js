import { ref, readonly } from 'vue'

const toasts = ref([])
let toastId = 0

export function useToast() {
  const addToast = (options) => {
    const id = ++toastId
    const toast = {
      id,
      message: options.message || '',
      type: options.type || 'info', // success, error, warning, info
      duration: options.duration ?? 4000,
      closable: options.closable ?? true
    }

    toasts.value.push(toast)

    if (toast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, toast.duration)
    }

    return id
  }

  const removeToast = (id) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const clearAll = () => {
    toasts.value = []
  }

  // Convenience methods
  const success = (message, options = {}) => {
    return addToast({ ...options, message, type: 'success' })
  }

  const error = (message, options = {}) => {
    return addToast({ ...options, message, type: 'error', duration: options.duration ?? 6000 })
  }

  const warning = (message, options = {}) => {
    return addToast({ ...options, message, type: 'warning' })
  }

  const info = (message, options = {}) => {
    return addToast({ ...options, message, type: 'info' })
  }

  return {
    toasts: readonly(toasts),
    addToast,
    removeToast,
    clearAll,
    success,
    error,
    warning,
    info
  }
}
