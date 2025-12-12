<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useToast } from '../composables/useToast'
import Button from '../components/ui/Button.vue'
import Input from '../components/ui/Input.vue'
import { Rocket, Lock, Eye, EyeOff } from 'lucide-vue-next'

const router = useRouter()
const authStore = useAuthStore()
const toast = useToast()

const password = ref('')
const remember = ref(false)
const showPassword = ref(false)
const loading = ref(false)
const error = ref('')

const handleLogin = async () => {
  if (!password.value) {
    error.value = '请输入密码'
    return
  }

  loading.value = true
  error.value = ''

  const result = await authStore.login(password.value, remember.value)

  if (result.success) {
    toast.success('登录成功')
    router.push('/')
  } else {
    error.value = result.message || '密码错误'
  }

  loading.value = false
}

const togglePassword = () => {
  showPassword.value = !showPassword.value
}
</script>

<template>
  <div class="login-page">
    <!-- Animated background -->
    <div class="bg-grid"></div>
    <div class="bg-gradient"></div>

    <!-- Login card -->
    <div class="login-container">
      <div class="login-card">
        <!-- Logo -->
        <div class="login-header">
          <div class="logo">
            <Rocket :size="32" class="logo-icon" />
          </div>
          <h1 class="title">Antigravity Proxy</h1>
          <p class="subtitle">管理控制台</p>
        </div>

        <!-- Form -->
        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-group">
            <Input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              placeholder="请输入 Administrator 密码"
              :error="error"
              @keyup.enter="handleLogin"
            >
              <template #icon>
                <Lock :size="18" />
              </template>
              <template #suffix>
                <button
                  type="button"
                  class="password-toggle"
                  @click="togglePassword"
                >
                  <EyeOff v-if="showPassword" :size="18" />
                  <Eye v-else :size="18" />
                </button>
              </template>
            </Input>
          </div>

          <label class="checkbox-wrapper">
            <input
              v-model="remember"
              type="checkbox"
              class="checkbox"
            />
            <span class="checkbox-label">7天内保持登录</span>
          </label>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            :loading="loading"
            class="login-btn"
          >
            <Lock v-if="!loading" :size="18" />
            登 录
          </Button>
        </form>

        <!-- Footer -->
        <div class="login-footer">
          <p>Powered by Antigravity API</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  position: relative;
  overflow: hidden;
  background: var(--bg-primary);
}

/* Animated grid background */
.bg-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  animation: gridMove 20s linear infinite;
}

@keyframes gridMove {
  0% { transform: translate(0, 0); }
  100% { transform: translate(60px, 60px); }
}

/* Gradient overlay */
.bg-gradient {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 50%);
  animation: gradientPulse 8s ease-in-out infinite alternate;
}

@keyframes gradientPulse {
  0% { opacity: 0.5; }
  100% { opacity: 1; }
}

.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
}

.login-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--space-8);
  box-shadow: var(--shadow-lg);
}

.login-header {
  text-align: center;
  margin-bottom: var(--space-8);
}

.logo {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto var(--space-4);
}

.logo-icon {
  color: white;
}

.title {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 var(--space-1) 0;
}

.subtitle {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin: 0;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.form-group {
  position: relative;
}

.password-toggle {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: var(--space-1);
  display: flex;
  transition: color var(--transition-fast);
}

.password-toggle:hover {
  color: var(--text-primary);
}

.checkbox-wrapper {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox {
  width: 18px;
  height: 18px;
  border: 1px solid var(--border-color-strong);
  border-radius: var(--radius-sm);
  background: var(--bg-tertiary);
  cursor: pointer;
  appearance: none;
  transition: all var(--transition);
  position: relative;
}

.checkbox:checked {
  background: var(--accent);
  border-color: var(--accent);
}

.checkbox:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 5px;
  height: 9px;
  border: 2px solid white;
  border-top: none;
  border-left: none;
  transform: rotate(45deg);
}

.checkbox-label {
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

.login-btn {
  width: 100%;
  margin-top: var(--space-2);
}

.login-footer {
  text-align: center;
  margin-top: var(--space-6);
  padding-top: var(--space-6);
  border-top: 1px solid var(--border-color);
}

.login-footer p {
  font-size: var(--text-xs);
  color: var(--text-muted);
  margin: 0;
}

/* Mobile adjustments */
@media (max-width: 639px) {
  .login-card {
    padding: var(--space-6);
  }

  .logo {
    width: 56px;
    height: 56px;
  }

  .title {
    font-size: var(--text-xl);
  }
}
</style>
