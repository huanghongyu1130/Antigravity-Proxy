<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from './stores/auth'
import Sidebar from './components/layout/Sidebar.vue'
import MobileNav from './components/layout/MobileNav.vue'
import Toast from './components/ui/Toast.vue'

const route = useRoute()
const authStore = useAuthStore()

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isLoginPage = computed(() => route.path === '/login')
const showLayout = computed(() => isAuthenticated.value && !isLoginPage.value)
</script>

<template>
  <div class="app">
    <!-- Toast notifications -->
    <Toast />

    <!-- Authenticated layout -->
    <template v-if="showLayout">
      <Sidebar />
      <MobileNav />

      <main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </template>

    <!-- Login page (no layout) -->
    <template v-else>
      <router-view />
    </template>
  </div>
</template>

<style scoped>
.app {
  min-height: 100vh;
}

.main-content {
  min-height: 100vh;
  padding: var(--space-8);
  background: var(--bg-primary);
}

/* Desktop: offset for sidebar */
@media (min-width: 1024px) {
  .main-content {
    margin-left: var(--sidebar-width);
  }
}

/* Tablet and Mobile: offset for header and bottom nav */
@media (max-width: 1023px) {
  .main-content {
    padding-top: calc(var(--header-height) + var(--space-6));
    padding-bottom: calc(var(--mobile-nav-height) + var(--space-6));
    padding-left: var(--space-4);
    padding-right: var(--space-4);
  }
}

/* Page transitions */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
