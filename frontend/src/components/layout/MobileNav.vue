<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import {
  LayoutDashboard,
  Users,
  Key,
  ScrollText,
  Settings,
  Menu,
  X,
  LogOut,
  Rocket
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const menuOpen = ref(false)

const mainNavItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/accounts', icon: Users, label: '账号' },
  { path: '/api-keys', icon: Key, label: '密钥' },
  { path: '/logs', icon: ScrollText, label: '日志' }
]

const menuItems = [
  { path: '/settings', icon: Settings, label: '设置' }
]

const isActive = (path) => {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}

const toggleMenu = () => {
  menuOpen.value = !menuOpen.value
}

const closeMenu = () => {
  menuOpen.value = false
}

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
  closeMenu()
}

const navigateTo = (path) => {
  router.push(path)
  closeMenu()
}
</script>

<template>
  <!-- Mobile Header -->
  <header class="mobile-header mobile-only">
    <div class="mobile-header-left">
      <Rocket :size="22" class="logo-icon" />
      <span class="logo-text">Antigravity Proxy</span>
    </div>
    <button class="menu-toggle" @click="toggleMenu">
      <Menu v-if="!menuOpen" :size="24" />
      <X v-else :size="24" />
    </button>
  </header>

  <!-- Mobile Menu Overlay -->
  <Transition name="fade">
    <div v-if="menuOpen" class="menu-overlay mobile-only" @click="closeMenu"></div>
  </Transition>

  <!-- Mobile Slide Menu -->
  <Transition name="slide">
    <div v-if="menuOpen" class="mobile-menu mobile-only">
      <div class="menu-header">
        <div class="user-info">
          <div class="user-avatar">A</div>
          <div class="user-details">
            <span class="user-name">Administrator</span>
          </div>
        </div>
      </div>

      <nav class="menu-nav">
        <button
          v-for="item in menuItems"
          :key="item.path"
          :class="['menu-item', { active: isActive(item.path) }]"
          @click="navigateTo(item.path)"
        >
          <component :is="item.icon" :size="20" />
          <span>{{ item.label }}</span>
        </button>

        <div class="menu-divider"></div>

        <button class="menu-item danger" @click="handleLogout">
          <LogOut :size="20" />
          <span>退出登录</span>
        </button>
      </nav>
    </div>
  </Transition>

  <!-- Mobile Bottom Navigation -->
  <nav class="mobile-nav mobile-only">
    <router-link
      v-for="item in mainNavItems"
      :key="item.path"
      :to="item.path"
      :class="['nav-item', { active: isActive(item.path) }]"
    >
      <component :is="item.icon" :size="22" />
      <span>{{ item.label }}</span>
    </router-link>
  </nav>
</template>

<style scoped>
/* Mobile Header */
.mobile-header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: var(--header-height);
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-4);
  z-index: var(--z-sticky);
}

.mobile-header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.logo-icon {
  color: var(--accent);
}

.logo-text {
  font-size: var(--text-base);
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.menu-toggle {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-primary);
  cursor: pointer;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.menu-toggle:hover {
  background: var(--bg-hover);
}

/* Menu Overlay */
.menu-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: calc(var(--z-sticky) + 1);
}

/* Mobile Slide Menu */
.mobile-menu {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: 280px;
  max-width: 80vw;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
  z-index: calc(var(--z-sticky) + 2);
  display: flex;
  flex-direction: column;
}

.menu-header {
  padding: var(--space-6) var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.user-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: white;
}

.user-details {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: var(--text-primary);
}

.user-role {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.menu-nav {
  flex: 1;
  padding: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.menu-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  color: var(--text-secondary);
  font-size: var(--text-base);
  font-weight: 500;
  background: transparent;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all var(--transition-fast);
}

.menu-item:hover {
  background: var(--bg-hover);
  color: var(--text-primary);
}

.menu-item.active {
  background: var(--accent-light);
  color: var(--accent);
}

.menu-item.danger {
  color: var(--error);
}

.menu-item.danger:hover {
  background: var(--error-light);
}

.menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--space-2) 0;
}

/* Mobile Bottom Navigation */
.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--mobile-nav-height);
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 var(--space-2);
  z-index: var(--z-sticky);
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-2);
  color: var(--text-muted);
  text-decoration: none;
  font-size: var(--text-xs);
  font-weight: 500;
  transition: color var(--transition-fast);
  flex: 1;
  max-width: 80px;
}

.nav-item:hover,
.nav-item.active {
  color: var(--accent);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity var(--transition);
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-enter-active,
.slide-leave-active {
  transition: transform var(--transition);
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
}

/* Hide on desktop */
.mobile-only {
  display: none;
}

@media (max-width: 1023px) {
  .mobile-only {
    display: flex;
  }
}
</style>
