import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api/index.js'

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref(localStorage.getItem('access_token') || null)
  const refreshToken = ref(localStorage.getItem('refresh_token') || null)
  const user = ref(null)
  const loading = ref(false)

  const isAuthenticated = computed(() => !!accessToken.value)

  // Set tokens
  function setTokens(access, refresh = null) {
    accessToken.value = access
    refreshToken.value = refresh

    if (access) {
      localStorage.setItem('access_token', access)
    } else {
      localStorage.removeItem('access_token')
    }

    if (refresh) {
      localStorage.setItem('refresh_token', refresh)
    } else {
      localStorage.removeItem('refresh_token')
    }
  }

  // Login
  async function login(password, remember = false) {
    loading.value = true
    try {
      const response = await api.post('/admin/auth/login', {
        password,
        remember
      })

      const { access_token, refresh_token } = response.data
      setTokens(access_token, refresh_token)

      // Fetch user info
      await fetchUser()

      return { success: true }
    } catch (error) {
      const message = error.response?.data?.error?.message || 'Login failed'
      return { success: false, message }
    } finally {
      loading.value = false
    }
  }

  // Logout
  function logout() {
    setTokens(null, null)
    user.value = null
  }

  // Fetch user info
  async function fetchUser() {
    if (!accessToken.value) return

    try {
      const response = await api.get('/admin/auth/me')
      user.value = response.data
    } catch (error) {
      // Token might be invalid
      if (error.response?.status === 401) {
        // Try to refresh
        const refreshed = await refreshAccessToken()
        if (refreshed) {
          return fetchUser()
        }
        logout()
      }
    }
  }

  // Refresh access token
  async function refreshAccessToken() {
    if (!refreshToken.value) return false

    try {
      const response = await api.post('/admin/auth/refresh', {
        refresh_token: refreshToken.value
      })

      const { access_token } = response.data
      setTokens(access_token, refreshToken.value)
      return true
    } catch (error) {
      // Refresh token is also invalid
      logout()
      return false
    }
  }

  // Initialize - check stored tokens
  async function initialize() {
    if (accessToken.value) {
      await fetchUser()
    }
  }

  // Get auth header
  function getAuthHeader() {
    return accessToken.value ? `Bearer ${accessToken.value}` : null
  }

  return {
    accessToken,
    refreshToken,
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    fetchUser,
    refreshAccessToken,
    initialize,
    getAuthHeader
  }
})
