import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    name: 'Dashboard',
    component: () => import('../views/Dashboard.vue')
  },
  {
    path: '/accounts',
    name: 'Accounts',
    component: () => import('../views/Accounts.vue')
  },
  {
    path: '/api-keys',
    name: 'ApiKeys',
    component: () => import('../views/ApiKeys.vue')
  },
  {
    path: '/logs',
    name: 'Logs',
    component: () => import('../views/Logs.vue')
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../views/Settings.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('access_token')
  const isPublicRoute = to.meta.public === true

  if (!isAuthenticated && !isPublicRoute) {
    // Redirect to login if not authenticated
    next('/login')
  } else if (isAuthenticated && to.path === '/login') {
    // Redirect to dashboard if already authenticated
    next('/')
  } else {
    next()
  }
})

export default router
