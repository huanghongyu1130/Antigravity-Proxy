import axios from 'axios'

const api = axios.create({
  baseURL: '',
  timeout: 30000
})

// Request interceptor - add JWT token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor - handle auth errors
api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const refreshToken = localStorage.getItem('refresh_token')
      if (refreshToken) {
        try {
          const response = await axios.post('/admin/auth/refresh', {
            refresh_token: refreshToken
          })

          const { access_token } = response.data
          localStorage.setItem('access_token', access_token)

          originalRequest.headers.Authorization = `Bearer ${access_token}`
          return api(originalRequest)
        } catch (refreshError) {
          // Refresh failed, clear tokens and redirect
          localStorage.removeItem('access_token')
          localStorage.removeItem('refresh_token')
          window.location.href = '/login'
          return Promise.reject(refreshError)
        }
      } else {
        // No refresh token, redirect to login
        localStorage.removeItem('access_token')
        window.location.href = '/login'
      }
    }

    return Promise.reject(error)
  }
)

// Auth
export const login = (password, remember) => api.post('/admin/auth/login', { password, remember })
export const refreshToken = (token) => api.post('/admin/auth/refresh', { refresh_token: token })
export const getMe = () => api.get('/admin/auth/me')

// Dashboard
export const getDashboard = () => api.get('/admin/dashboard')

// Accounts
export const getAccounts = () => api.get('/admin/accounts')
export const createAccount = (data) => api.post('/admin/accounts', data)
export const createAccountsBatch = (accounts) => api.post('/admin/accounts/batch', { accounts })
export const updateAccountStatus = (id, status) => api.put(`/admin/accounts/${id}/status`, { status })
export const refreshAccount = (id) => api.post(`/admin/accounts/${id}/refresh`)
export const getAccountQuota = (id) => api.get(`/admin/accounts/${id}/quota`)
export const deleteAccount = (id) => api.delete(`/admin/accounts/${id}`)
export const refreshAllAccounts = () => api.post('/admin/accounts/refresh-all')

// API Keys
export const getApiKeys = () => api.get('/admin/api-keys')
export const createApiKey = (name) => api.post('/admin/api-keys', { name })
export const updateApiKeyStatus = (id, status) => api.put(`/admin/api-keys/${id}/status`, { status })
export const deleteApiKey = (id) => api.delete(`/admin/api-keys/${id}`)

// Logs
export const getLogs = (params) => api.get('/admin/logs', { params })
export const getStats = (params) => api.get('/admin/stats', { params })

// Settings
export const getSettings = () => api.get('/admin/settings')
export const updateSetting = (key, value) => api.put('/admin/settings', { key, value })

// OAuth
export const getOAuthConfig = () => api.get('/oauth/config')
export const exchangeOAuthCode = (code, port) => api.post('/oauth/exchange', { code, port })

// Health
export const getHealth = () => api.get('/health')

export default api
