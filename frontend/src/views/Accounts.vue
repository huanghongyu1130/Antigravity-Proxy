<script setup>
import { ref, computed, onMounted } from 'vue'
import { useToast } from '../composables/useToast'
import { useIsMobile } from '../composables/useMediaQuery'
import {
  getAccounts,
  createAccount,
  createAccountsBatch,
  updateAccountStatus,
  refreshAccount,
  getAccountQuota,
  deleteAccount,
  getOAuthConfig,
  exchangeOAuthCode,
  refreshAllAccounts
} from '../api'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'
import Input from '../components/ui/Input.vue'
import Modal from '../components/ui/Modal.vue'
import {
  Plus,
  Link,
  Upload,
  RefreshCw,
  Trash2,
  Power,
  MoreVertical,
  Mail,
  Key,
  BarChart3,
  ChevronDown,
  ChevronUp
} from 'lucide-vue-next'

const toast = useToast()
const isMobile = useIsMobile()

const accounts = ref([])
const loading = ref(false)
const adding = ref(false)
const importing = ref(false)
const refreshingAll = ref(false)

const addModalVisible = ref(false)
const oauthModalVisible = ref(false)
const batchModalVisible = ref(false)
const deleteConfirmVisible = ref(false)
const quotaModalVisible = ref(false)
const accountToDelete = ref(null)
const quotaAccount = ref(null)
const quotaData = ref(null)
const quotaLoading = ref(false)
const expandedAccountId = ref(null)

const addForm = ref({ email: '', refresh_token: '' })
const batchFormat = ref('json')
const batchData = ref('')
const oauthCallbackUrl = ref('')
const oauthPort = ref(null)
const oauthProcessing = ref(false)

const batchPlaceholder = computed(() => {
  if (batchFormat.value === 'json') {
    return `[
  {"email": "user1@example.com", "refresh_token": "1//xxx"},
  {"email": "user2@example.com", "refresh_token": "1//xxx"}
]`
  }
  return `email,refresh_token
user1@example.com,1//xxx
user2@example.com,1//xxx`
})

const fetchAccounts = async () => {
  loading.value = true
  try {
    const res = await getAccounts()
    accounts.value = (res.data?.accounts || res.accounts || []).map(a => ({ ...a, refreshing: false }))
  } catch (error) {
    toast.error('加载账号失败')
  } finally {
    loading.value = false
  }
}

const handleAdd = async () => {
  if (!addForm.value.email || !addForm.value.refresh_token) {
    toast.warning('请填写所有字段')
    return
  }

  adding.value = true
  try {
    await createAccount(addForm.value)
    toast.success('账号添加成功')
    addModalVisible.value = false
    addForm.value = { email: '', refresh_token: '' }
    fetchAccounts()
  } catch (error) {
    toast.error(error.response?.data?.error?.message || '添加账号失败')
  } finally {
    adding.value = false
  }
}

const openOAuthWindow = async () => {
  try {
    const res = await getOAuthConfig()
    const config = res.data || res

    // 生成随机端口
    oauthPort.value = Math.floor(Math.random() * 10000) + 50000
    const redirectUri = `http://localhost:${oauthPort.value}/oauth-callback`

    const authUrl = `${config.auth_endpoint}?` +
      `access_type=offline&` +
      `client_id=${config.client_id}&` +
      `prompt=consent&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent(config.scope)}&` +
      `state=${Date.now()}`

    window.open(authUrl, '_blank')
    toast.info('请在新窗口完成授权，然后复制地址栏URL')
  } catch (error) {
    toast.error('获取OAuth配置失败')
  }
}

const processOAuthCallback = async () => {
  let inputUrl = oauthCallbackUrl.value.trim()

  if (!inputUrl) {
    toast.warning('请输入回调URL')
    return
  }

  oauthProcessing.value = true

  try {
    // 清理URL：只保留第一个 http:// 或 https:// 开头的部分
    // 处理可能重复粘贴的情况
    const httpMatch = inputUrl.match(/^(https?:\/\/[^\s]+?)(?:\s|$|https?:\/\/)/)
    if (httpMatch) {
      inputUrl = httpMatch[1]
    }

    // 尝试从URL中提取code参数
    let code = null
    let port = null

    // 方法1: 尝试用URL对象解析
    try {
      const url = new URL(inputUrl)
      code = url.searchParams.get('code')
      port = url.port || (url.protocol === 'https:' ? '443' : '80')
    } catch {
      // 方法2: 用正则提取
      const codeMatch = inputUrl.match(/[?&]code=([^&]+)/)
      const portMatch = inputUrl.match(/localhost:(\d+)/)
      if (codeMatch) code = decodeURIComponent(codeMatch[1])
      if (portMatch) port = portMatch[1]
    }

    if (!code) {
      toast.error('URL中未找到授权码，请检查URL是否完整')
      oauthProcessing.value = false
      return
    }

    if (!port) {
      port = '80'
    }

    console.log('OAuth code:', code.substring(0, 20) + '...')
    console.log('OAuth port:', port)

    const response = await exchangeOAuthCode(code, port)
    const result = response.data || response

    if (result.success) {
      toast.success(`账号 ${result.data.email || '未知'} 添加成功`)
      oauthModalVisible.value = false
      oauthCallbackUrl.value = ''
      fetchAccounts()
    } else {
      toast.error(result.message || 'Token交换失败')
    }
  } catch (error) {
    console.error('OAuth error:', error)
    toast.error(error.response?.data?.message || '处理失败: ' + error.message)
  } finally {
    oauthProcessing.value = false
  }
}

const handleBatchImport = async () => {
  let accountsList = []

  try {
    if (batchFormat.value === 'json') {
      accountsList = JSON.parse(batchData.value)
    } else {
      const lines = batchData.value.trim().split('\n').slice(1)
      accountsList = lines.map(line => {
        const [email, refresh_token] = line.split(',')
        return { email: email.trim(), refresh_token: refresh_token.trim() }
      })
    }
  } catch (error) {
    toast.error('数据格式无效')
    return
  }

  if (accountsList.length === 0) {
    toast.warning('没有可导入的账号')
    return
  }

  importing.value = true
  try {
    const res = await createAccountsBatch(accountsList)
    const results = res.data?.results || res.results || []
    const successCount = results.filter(r => r.success).length
    toast.success(`成功导入 ${successCount}/${accountsList.length} 个账号`)
    batchModalVisible.value = false
    batchData.value = ''
    fetchAccounts()
  } catch (error) {
    toast.error('导入账号失败')
  } finally {
    importing.value = false
  }
}

const handleRefresh = async (account) => {
  account.refreshing = true
  try {
    await refreshAccount(account.id)
    toast.success('Token刷新成功')
    fetchAccounts()
  } catch (error) {
    toast.error(error.response?.data?.error?.message || '刷新失败')
  } finally {
    account.refreshing = false
  }
}

const handleToggleStatus = async (account) => {
  const newStatus = account.status === 'active' ? 'disabled' : 'active'
  try {
    await updateAccountStatus(account.id, newStatus)
    account.status = newStatus
    toast.success('状态更新成功')
  } catch (error) {
    toast.error('状态更新失败')
  }
}

const confirmDelete = (account) => {
  accountToDelete.value = account
  deleteConfirmVisible.value = true
}

const handleDelete = async () => {
  if (!accountToDelete.value) return

  try {
    await deleteAccount(accountToDelete.value.id)
    toast.success('账号删除成功')
    deleteConfirmVisible.value = false
    accountToDelete.value = null
    fetchAccounts()
  } catch (error) {
    toast.error('删除账号失败')
  }
}

const getStatusVariant = (status) => {
  const variants = { active: 'success', disabled: 'default', error: 'error' }
  return variants[status] || 'default'
}

const getQuotaColor = (quota) => {
  if (quota >= 0.5) return 'success'
  if (quota >= 0.2) return 'warning'
  return 'error'
}

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString()
}

const formatResetTime = (timestamp) => {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  const now = new Date()
  const diff = date - now

  if (diff <= 0) return '已重置'

  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

  if (hours > 0) {
    return `${hours}小时${minutes}分钟后`
  }
  return `${minutes}分钟后`
}

const refreshAllTokensAndQuotas = async () => {
  refreshingAll.value = true
  try {
    await refreshAllAccounts()
    await fetchAccounts()
    toast.success('已刷新所有账号 Token 及配额')
  } catch (error) {
    toast.error('刷新所有 Token 及配额失败')
  } finally {
    refreshingAll.value = false
  }
}

const toggleQuotaDetails = async (account) => {
  if (expandedAccountId.value === account.id) {
    expandedAccountId.value = null
    return
  }

  expandedAccountId.value = account.id
  account.quotaLoading = true

  try {
    const res = await getAccountQuota(account.id)
    const data = res.data?.data || res.data || {}
    account.detailedQuota = data.quotas || {}
    account.quotaResetTime = data.resetTime
  } catch (error) {
    toast.error('获取配额详情失败')
    expandedAccountId.value = null
  } finally {
    account.quotaLoading = false
  }
}

const showQuotaModal = async (account) => {
  quotaAccount.value = account
  quotaData.value = null
  quotaModalVisible.value = true
  quotaLoading.value = true

  try {
    const res = await getAccountQuota(account.id)
    quotaData.value = res.data?.data || res.data || {}
  } catch (error) {
    toast.error('获取配额详情失败')
  } finally {
    quotaLoading.value = false
  }
}

// 按配额排序模型（配额低的在前）
const sortedQuotas = computed(() => {
  if (!quotaData.value?.quotas) return []
  return Object.entries(quotaData.value.quotas)
    .map(([id, info]) => ({ id, ...info }))
    .sort((a, b) => a.remainingFraction - b.remainingFraction)
})

onMounted(fetchAccounts)
</script>

<template>
  <div class="accounts-page">
    <div class="page-header">
      <h1 class="page-title">账号管理</h1>
      <div class="page-actions">
        <Button variant="primary" @click="addModalVisible = true">
          <Plus :size="16" />
          <span class="hide-mobile">添加</span>
        </Button>
        <Button variant="secondary" @click="oauthModalVisible = true">
          <Link :size="16" />
          <span class="hide-mobile">OAuth</span>
        </Button>
        <Button variant="secondary" @click="refreshAllTokensAndQuotas" :loading="refreshingAll">
          <RefreshCw :size="16" />
          <span class="hide-mobile">刷新所有Token及配额</span>
        </Button>
      </div>
    </div>

    <!-- Desktop Table -->
    <Card class="table-card table-responsive" :padding="false">
      <table class="table">
        <thead>
          <tr>
            <th>邮箱</th>
            <th>状态</th>
            <th>等级</th>
            <th>配额</th>
            <th>Token</th>
            <th>最后使用</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="account in accounts" :key="account.id">
            <td>
              <span class="email-cell">{{ account.email }}</span>
            </td>
            <td>
              <Badge :variant="getStatusVariant(account.status)" dot>
                {{ account.status }}
              </Badge>
            </td>
            <td>{{ account.tier || '免费版' }}</td>
            <td>
              <div class="quota-cell clickable" @click="showQuotaModal(account)">
                <div class="progress">
                  <div
                    class="progress-bar"
                    :class="getQuotaColor(account.quota_remaining)"
                    :style="{ width: (account.quota_remaining || 0) * 100 + '%' }"
                  ></div>
                </div>
                <span class="quota-text">{{ Math.round((account.quota_remaining || 0) * 100) }}%</span>
                <div class="quota-detail-link">
                  <BarChart3 :size="14" class="quota-icon" />
                  <span>查看配额</span>
                </div>
              </div>
            </td>
            <td>
              <Badge :variant="account.token_valid ? 'success' : 'error'">
                {{ account.token_valid ? '有效' : '过期' }}
              </Badge>
            </td>
            <td>{{ formatTime(account.last_used_at) }}</td>
            <td>
              <div class="action-buttons">
                <Button variant="ghost" size="sm" icon :loading="account.refreshing" @click="handleRefresh(account)">
                  <RefreshCw :size="14" />
                </Button>
                <Button variant="ghost" size="sm" icon @click="handleToggleStatus(account)">
                  <Power :size="14" />
                </Button>
                <Button variant="ghost" size="sm" icon @click="confirmDelete(account)">
                  <Trash2 :size="14" />
                </Button>
              </div>
            </td>
          </tr>
          <tr v-if="accounts.length === 0 && !loading">
            <td colspan="7" class="empty-cell">
              <div class="empty-state">
                <Mail :size="40" />
                <p>暂无账号</p>
                <Button variant="primary" size="sm" @click="addModalVisible = true">
                  <Plus :size="14" />
                  添加账号
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Card>

    <!-- Mobile Card List -->
    <div class="card-list-view">
      <div v-for="account in accounts" :key="account.id" class="account-card">
        <div class="account-header">
          <span class="account-email">{{ account.email }}</span>
          <Badge :variant="getStatusVariant(account.status)" dot>
            {{ account.status }}
          </Badge>
        </div>
        <div class="account-info">
          <div class="info-item">
            <span class="info-label">等级</span>
            <span class="info-value">{{ account.tier || '免费版' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">Token</span>
            <Badge :variant="account.token_valid ? 'success' : 'error'" size="sm">
              {{ account.token_valid ? '有效' : '过期' }}
            </Badge>
          </div>
        </div>
        <div class="account-quota clickable" @click="showQuotaModal(account)">
          <span class="quota-label">配额</span>
          <div class="progress">
            <div
              class="progress-bar"
              :class="getQuotaColor(account.quota_remaining)"
              :style="{ width: (account.quota_remaining || 0) * 100 + '%' }"
            ></div>
          </div>
          <span class="quota-value">{{ Math.round((account.quota_remaining || 0) * 100) }}%</span>
          <div class="quota-detail-link">
            <BarChart3 :size="14" class="quota-icon" />
            <span>查看配额</span>
          </div>
        </div>
        <div class="account-actions">
          <Button variant="secondary" size="sm" :loading="account.refreshing" @click="handleRefresh(account)">
            <RefreshCw :size="14" />
            刷新
          </Button>
          <Button variant="ghost" size="sm" @click="handleToggleStatus(account)">
            <Power :size="14" />
            {{ account.status === 'active' ? '禁用' : '启用' }}
          </Button>
          <Button variant="ghost" size="sm" @click="confirmDelete(account)">
            <Trash2 :size="14" />
          </Button>
        </div>
      </div>

      <div v-if="accounts.length === 0 && !loading" class="empty-state mobile-empty">
        <Mail :size="48" />
        <p>暂无账号</p>
        <Button variant="primary" @click="addModalVisible = true">
          <Plus :size="16" />
          添加账号
        </Button>
      </div>
    </div>

    <!-- Add Account Modal -->
    <Modal v-model="addModalVisible" title="添加账号">
      <div class="form-group">
        <Input
          v-model="addForm.email"
          label="邮箱"
          placeholder="user@example.com"
        >
          <template #icon><Mail :size="16" /></template>
        </Input>
      </div>
      <div class="form-group">
        <label class="input-label">Refresh Token</label>
        <textarea
          v-model="addForm.refresh_token"
          class="textarea"
          rows="4"
          placeholder="1//0exxx..."
        ></textarea>
      </div>
      <template #footer>
        <Button variant="ghost" @click="addModalVisible = false">取消</Button>
        <Button variant="primary" :loading="adding" @click="handleAdd">添加账号</Button>
      </template>
    </Modal>

    <!-- OAuth Modal -->
    <Modal v-model="oauthModalVisible" title="OAuth 授权登录" width="500px">
      <div class="oauth-content">
        <div class="oauth-steps">
          <p class="step-title">📝 授权流程：</p>
          <p class="step-item">1️⃣ 点击下方按钮打开 Google 授权页面</p>
          <p class="step-item">2️⃣ 完成授权后，复制浏览器地址栏的完整 URL</p>
          <p class="step-item">3️⃣ 粘贴 URL 到下方输入框并提交</p>
        </div>
        <Button variant="primary" size="lg" class="oauth-btn" @click="openOAuthWindow">
          <Link :size="18" />
          打开授权页面
        </Button>
        <div class="form-group oauth-url-input">
          <label class="input-label">回调 URL</label>
          <textarea
            v-model="oauthCallbackUrl"
            class="textarea"
            rows="3"
            placeholder="粘贴完整的回调URL (http://localhost:xxxxx/oauth-callback?code=...)"
          ></textarea>
        </div>
      </div>
      <template #footer>
        <Button variant="ghost" @click="oauthModalVisible = false">取消</Button>
        <Button variant="primary" :loading="oauthProcessing" @click="processOAuthCallback">
          提交
        </Button>
      </template>
    </Modal>

    <!-- Batch Import Modal -->
    <Modal v-model="batchModalVisible" title="批量导入" width="600px">
      <div class="form-group">
        <label class="input-label">格式</label>
        <div class="radio-group">
          <label class="radio-option">
            <input type="radio" v-model="batchFormat" value="json" />
            <span>JSON</span>
          </label>
          <label class="radio-option">
            <input type="radio" v-model="batchFormat" value="csv" />
            <span>CSV</span>
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="input-label">数据</label>
        <textarea
          v-model="batchData"
          class="textarea"
          rows="10"
          :placeholder="batchPlaceholder"
        ></textarea>
      </div>
      <template #footer>
        <Button variant="ghost" @click="batchModalVisible = false">取消</Button>
        <Button variant="primary" :loading="importing" @click="handleBatchImport">导入</Button>
      </template>
    </Modal>

    <!-- Delete Confirm Modal -->
    <Modal v-model="deleteConfirmVisible" title="删除账号" width="400px">
      <p class="confirm-text">
        确定要删除 <strong>{{ accountToDelete?.email }}</strong> 吗？
      </p>
      <p class="confirm-warning">此操作无法撤销。</p>
      <template #footer>
        <Button variant="ghost" @click="deleteConfirmVisible = false">取消</Button>
        <Button variant="danger" @click="handleDelete">删除</Button>
      </template>
    </Modal>

    <!-- Quota Details Modal -->
    <Modal v-model="quotaModalVisible" title="配额详情" width="600px">
      <div class="quota-modal-content">
        <div v-if="quotaLoading" class="quota-loading">
          <RefreshCw :size="24" class="spin" />
          <span>加载中...</span>
        </div>

        <template v-else-if="quotaData">
          <div class="quota-header">
            <div class="quota-account">
              <Mail :size="16" />
              <span>{{ quotaAccount?.email }}</span>
            </div>
            <div class="quota-overall">
              <span class="overall-label">总体配额</span>
              <div class="overall-bar">
                <div class="progress large">
                  <div
                    class="progress-bar"
                    :class="getQuotaColor(quotaData.overallQuota)"
                    :style="{ width: (quotaData.overallQuota || 0) * 100 + '%' }"
                  ></div>
                </div>
                <span class="overall-value">{{ Math.round((quotaData.overallQuota || 0) * 100) }}%</span>
              </div>
              <span v-if="quotaData.resetTime" class="reset-time">
                重置时间: {{ formatResetTime(quotaData.resetTime) }}
              </span>
            </div>
          </div>

          <div class="quota-list">
            <div class="quota-list-header">
              <span>模型</span>
              <span>剩余配额</span>
            </div>
            <div
              v-for="quota in sortedQuotas"
              :key="quota.id"
              class="quota-item"
            >
              <div class="quota-model">
                <span class="model-name">{{ quota.displayName || quota.id }}</span>
                <span class="model-id">{{ quota.id }}</span>
              </div>
              <div class="quota-bar">
                <div class="progress">
                  <div
                    class="progress-bar"
                    :class="getQuotaColor(quota.remainingFraction)"
                    :style="{ width: (quota.remainingFraction || 0) * 100 + '%' }"
                  ></div>
                </div>
                <span class="quota-percent" :class="getQuotaColor(quota.remainingFraction)">
                  {{ Math.round((quota.remainingFraction || 0) * 100) }}%
                </span>
              </div>
            </div>

            <div v-if="sortedQuotas.length === 0" class="quota-empty">
              暂无配额信息
            </div>
          </div>
        </template>

        <div v-else class="quota-error">
          获取配额信息失败
        </div>
      </div>
      <template #footer>
        <Button variant="primary" @click="quotaModalVisible = false">关闭</Button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.accounts-page {
  max-width: 1200px;
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: var(--text-2xl);
  font-weight: 700;
  margin: 0;
}

.page-actions {
  display: flex;
  gap: var(--space-2);
}

/* Table */
.table-card {
  overflow: hidden;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.table th {
  background: var(--bg-tertiary);
  font-weight: 600;
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
}

.table tr:hover td {
  background: var(--bg-hover);
}

.email-cell {
  font-weight: 500;
}

.quota-cell {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 120px;
}

.quota-cell .progress {
  flex: 1;
  height: 6px;
}

.quota-text {
  font-size: var(--text-xs);
  color: var(--text-muted);
  min-width: 36px;
}

.quota-detail-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: var(--text-xs);
  color: var(--accent);
  margin-left: var(--space-1);
}

.progress {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: var(--radius-full);
  transition: width var(--transition);
}

.progress-bar.success { background: var(--success); }
.progress-bar.warning { background: var(--warning); }
.progress-bar.error { background: var(--error); }

.action-buttons {
  display: flex;
  gap: var(--space-1);
}

.empty-cell {
  padding: var(--space-12) !important;
}

.empty-state {
  text-align: center;
  color: var(--text-muted);
}

.empty-state svg {
  opacity: 0.3;
  margin-bottom: var(--space-3);
}

.empty-state p {
  margin-bottom: var(--space-4);
}

/* Mobile Card List */
.card-list-view {
  display: none;
  flex-direction: column;
  gap: var(--space-3);
}

.account-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.account-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}

.account-email {
  font-weight: 600;
  color: var(--text-primary);
}

.account-info {
  display: flex;
  gap: var(--space-6);
  margin-bottom: var(--space-3);
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.info-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.info-value {
  font-size: var(--text-sm);
  color: var(--text-primary);
}

.account-quota {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.quota-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  min-width: 40px;
}

.quota-value {
  font-size: var(--text-xs);
  color: var(--text-muted);
  min-width: 36px;
}

.account-actions {
  display: flex;
  gap: var(--space-2);
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-3);
}

.mobile-empty {
  padding: var(--space-12) var(--space-4);
}

/* Form Elements */
.form-group {
  margin-bottom: var(--space-4);
}

.input-label {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--space-2);
}

.textarea {
  width: 100%;
  padding: var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  resize: vertical;
}

.textarea:focus {
  outline: none;
  border-color: var(--accent);
}

.radio-group {
  display: flex;
  gap: var(--space-4);
}

.radio-option {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
  font-size: var(--text-sm);
  color: var(--text-secondary);
}

/* OAuth Modal */
.oauth-content {
  padding: var(--space-2);
}

.oauth-steps {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-4);
}

.step-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.step-item {
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-1);
  line-height: 1.6;
}

.oauth-btn {
  width: 100%;
  margin-bottom: var(--space-4);
}

.oauth-url-input {
  margin-bottom: 0;
}

/* Confirm Modal */
.confirm-text {
  color: var(--text-primary);
  margin-bottom: var(--space-2);
}

.confirm-warning {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

/* Clickable quota */
.quota-cell.clickable,
.account-quota.clickable {
  cursor: pointer;
  transition: opacity var(--transition);
}

.quota-cell.clickable:hover,
.account-quota.clickable:hover {
  opacity: 0.8;
}

.quota-icon {
  color: var(--text-muted);
  opacity: 0.5;
  margin-left: 0;
}

.quota-cell.clickable:hover .quota-icon,
.account-quota.clickable:hover .quota-icon {
  opacity: 1;
  color: var(--accent);
}

/* Quota Modal */
.quota-modal-content {
  min-height: 200px;
}

.quota-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-8);
  color: var(--text-muted);
}

.quota-loading .spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.quota-header {
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-color);
}

.quota-account {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  margin-bottom: var(--space-3);
}

.quota-overall {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.overall-label {
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.overall-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.overall-bar .progress {
  flex: 1;
}

.progress.large {
  height: 12px;
}

.overall-value {
  font-size: var(--text-xl);
  font-weight: 700;
  color: var(--text-primary);
  min-width: 60px;
  text-align: right;
}

.reset-time {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.quota-list {
  display: flex;
  flex-direction: column;
}

.quota-list-header {
  display: flex;
  justify-content: space-between;
  padding: var(--space-2) 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--border-color);
}

.quota-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.quota-item:last-child {
  border-bottom: none;
}

.quota-model {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  min-width: 0;
}

.model-name {
  font-weight: 500;
  color: var(--text-primary);
  font-size: var(--text-sm);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.model-id {
  font-size: var(--text-xs);
  color: var(--text-muted);
  font-family: var(--font-mono);
}

.quota-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 180px;
  flex-shrink: 0;
}

.quota-bar .progress {
  flex: 1;
}

.quota-percent {
  font-size: var(--text-sm);
  font-weight: 600;
  min-width: 40px;
  text-align: right;
}

.quota-percent.success { color: var(--success); }
.quota-percent.warning { color: var(--warning); }
.quota-percent.error { color: var(--error); }

.quota-empty,
.quota-error {
  text-align: center;
  padding: var(--space-8);
  color: var(--text-muted);
}

/* Responsive */
@media (max-width: 1023px) {
  .table-responsive {
    display: none !important;
  }

  .card-list-view {
    display: flex !important;
  }
}

@media (max-width: 639px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .page-actions {
    width: 100%;
  }

  .page-actions .btn {
    flex: 1;
  }

  .hide-mobile {
    display: none;
  }

  .quota-bar {
    width: 140px;
  }

  .quota-item {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-2);
  }

  .quota-bar {
    width: 100%;
  }
}
</style>
