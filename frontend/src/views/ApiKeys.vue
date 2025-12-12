<script setup>
import { ref, onMounted } from 'vue'
import { useToast } from '../composables/useToast'
import { getApiKeys, createApiKey, updateApiKeyStatus, deleteApiKey } from '../api'
import { copyToClipboard } from '../utils/clipboard'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'
import Input from '../components/ui/Input.vue'
import Modal from '../components/ui/Modal.vue'
import { Plus, RefreshCw, Eye, EyeOff, Copy, Trash2, Power, Key, AlertTriangle } from 'lucide-vue-next'

const toast = useToast()

const keys = ref([])
const loading = ref(false)
const creating = ref(false)

const addModalVisible = ref(false)
const showKeyModalVisible = ref(false)
const deleteConfirmVisible = ref(false)
const keyToDelete = ref(null)
const keyName = ref('')
const newKey = ref('')

const fetchKeys = async () => {
  loading.value = true
  try {
    const res = await getApiKeys()
    keys.value = (res.data?.keys || res.keys || []).map(k => ({ ...k, showKey: false }))
  } catch (error) {
    toast.error('加载API密钥失败')
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  creating.value = true
  try {
    const res = await createApiKey(keyName.value || '新密钥')
    newKey.value = res.data?.key || res.key
    addModalVisible.value = false
    showKeyModalVisible.value = true
    keyName.value = ''
    fetchKeys()
  } catch (error) {
    toast.error('创建API密钥失败')
  } finally {
    creating.value = false
  }
}

const handleToggleStatus = async (key) => {
  const newStatus = key.status === 'active' ? 'disabled' : 'active'
  try {
    await updateApiKeyStatus(key.id, newStatus)
    key.status = newStatus
    toast.success('状态更新成功')
  } catch (error) {
    toast.error('状态更新失败')
  }
}

const confirmDelete = (key) => {
  keyToDelete.value = key
  deleteConfirmVisible.value = true
}

const handleDelete = async () => {
  if (!keyToDelete.value) return
  try {
    await deleteApiKey(keyToDelete.value.id)
    toast.success('API密钥已删除')
    deleteConfirmVisible.value = false
    keyToDelete.value = null
    fetchKeys()
  } catch (error) {
    toast.error('删除API密钥失败')
  }
}

const copyKey = async (keyText) => {
  const success = await copyToClipboard(keyText)
  if (success) {
    toast.success('API密钥已复制')
  } else {
    toast.error('复制失败，请手动复制')
  }
}

const maskKey = (key) => {
  if (!key) return ''
  return key.slice(0, 7) + '...' + key.slice(-4)
}

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return String(num)
}

const formatTime = (timestamp) => {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString()
}

onMounted(fetchKeys)
</script>

<template>
  <div class="api-keys-page">
    <div class="page-header">
      <h1 class="page-title">API 密钥</h1>
      <div class="page-actions">
        <Button variant="primary" @click="addModalVisible = true">
          <Plus :size="16" />
          <span class="hide-mobile">创建密钥</span>
        </Button>
        <Button variant="ghost" @click="fetchKeys" :loading="loading">
          <RefreshCw :size="16" />
        </Button>
      </div>
    </div>

    <!-- Desktop Table -->
    <Card class="table-card table-responsive" :padding="false">
      <table class="table">
        <thead>
          <tr>
            <th>名称</th>
            <th>API 密钥</th>
            <th>状态</th>
            <th>请求数</th>
            <th>Token数</th>
            <th>最后使用</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="key in keys" :key="key.id">
            <td><span class="key-name">{{ key.name }}</span></td>
            <td>
              <div class="key-cell">
                <code>{{ key.showKey ? key.key : maskKey(key.key) }}</code>
                <Button variant="ghost" size="sm" icon @click="key.showKey = !key.showKey">
                  <EyeOff v-if="key.showKey" :size="14" />
                  <Eye v-else :size="14" />
                </Button>
                <Button variant="ghost" size="sm" icon @click="copyKey(key.key)">
                  <Copy :size="14" />
                </Button>
              </div>
            </td>
            <td>
              <Badge :variant="key.status === 'active' ? 'success' : 'default'" dot>
                {{ key.status }}
              </Badge>
            </td>
            <td>{{ key.request_count || 0 }}</td>
            <td>{{ formatNumber(key.token_count || 0) }}</td>
            <td>{{ formatTime(key.last_used_at) }}</td>
            <td>
              <div class="action-buttons">
                <Button variant="ghost" size="sm" icon @click="handleToggleStatus(key)">
                  <Power :size="14" />
                </Button>
                <Button variant="ghost" size="sm" icon @click="confirmDelete(key)">
                  <Trash2 :size="14" />
                </Button>
              </div>
            </td>
          </tr>
          <tr v-if="keys.length === 0 && !loading">
            <td colspan="7" class="empty-cell">
              <div class="empty-state">
                <Key :size="40" />
                <p>暂无API密钥</p>
                <Button variant="primary" size="sm" @click="addModalVisible = true">
                  <Plus :size="14" />
                  创建密钥
                </Button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Card>

    <!-- Mobile Card List -->
    <div class="card-list-view">
      <div v-for="key in keys" :key="key.id" class="key-card">
        <div class="key-header">
          <span class="key-card-name">{{ key.name }}</span>
          <Badge :variant="key.status === 'active' ? 'success' : 'default'" dot>
            {{ key.status }}
          </Badge>
        </div>
        <div class="key-value">
          <code>{{ key.showKey ? key.key : maskKey(key.key) }}</code>
          <div class="key-actions-inline">
            <Button variant="ghost" size="sm" icon @click="key.showKey = !key.showKey">
              <EyeOff v-if="key.showKey" :size="14" />
              <Eye v-else :size="14" />
            </Button>
            <Button variant="ghost" size="sm" icon @click="copyKey(key.key)">
              <Copy :size="14" />
            </Button>
          </div>
        </div>
        <div class="key-stats">
          <div class="stat-item">
            <span class="stat-label">请求数</span>
            <span class="stat-value">{{ key.request_count || 0 }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Token数</span>
            <span class="stat-value">{{ formatNumber(key.token_count || 0) }}</span>
          </div>
        </div>
        <div class="key-actions">
          <Button variant="ghost" size="sm" @click="handleToggleStatus(key)">
            <Power :size="14" />
            {{ key.status === 'active' ? '禁用' : '启用' }}
          </Button>
          <Button variant="ghost" size="sm" @click="confirmDelete(key)">
            <Trash2 :size="14" />
          </Button>
        </div>
      </div>

      <div v-if="keys.length === 0 && !loading" class="empty-state mobile-empty">
        <Key :size="48" />
        <p>暂无API密钥</p>
        <Button variant="primary" @click="addModalVisible = true">
          <Plus :size="16" />
          创建密钥
        </Button>
      </div>
    </div>

    <!-- Create Key Modal -->
    <Modal v-model="addModalVisible" title="创建 API 密钥" width="400px">
      <Input v-model="keyName" label="名称" placeholder="我的API密钥">
        <template #icon><Key :size="16" /></template>
      </Input>
      <template #footer>
        <Button variant="ghost" @click="addModalVisible = false">取消</Button>
        <Button variant="primary" :loading="creating" @click="handleCreate">创建</Button>
      </template>
    </Modal>

    <!-- Show New Key Modal -->
    <Modal v-model="showKeyModalVisible" title="API 密钥已创建" width="500px">
      <div class="warning-box">
        <AlertTriangle :size="20" />
        <span>请立即复制您的API密钥，之后将无法再次查看！</span>
      </div>
      <div class="new-key-display">
        <code>{{ newKey }}</code>
        <Button variant="primary" @click="copyKey(newKey)">
          <Copy :size="16" />
          复制
        </Button>
      </div>
      <template #footer>
        <Button variant="primary" @click="showKeyModalVisible = false">完成</Button>
      </template>
    </Modal>

    <!-- Delete Confirm Modal -->
    <Modal v-model="deleteConfirmVisible" title="删除 API 密钥" width="400px">
      <p class="confirm-text">
        确定要删除 <strong>{{ keyToDelete?.name }}</strong> 吗？
      </p>
      <p class="confirm-warning">此操作无法撤销。</p>
      <template #footer>
        <Button variant="ghost" @click="deleteConfirmVisible = false">取消</Button>
        <Button variant="danger" @click="handleDelete">删除</Button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.api-keys-page {
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
.table-card { overflow: hidden; }
.table { width: 100%; border-collapse: collapse; }
.table th, .table td {
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
.table tr:hover td { background: var(--bg-hover); }

.key-name { font-weight: 500; }
.key-cell { display: flex; align-items: center; gap: var(--space-2); }
.key-cell code {
  background: var(--bg-tertiary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}
.action-buttons { display: flex; gap: var(--space-1); }
.empty-cell { padding: var(--space-12) !important; }
.empty-state { text-align: center; color: var(--text-muted); }
.empty-state svg { opacity: 0.3; margin-bottom: var(--space-3); }
.empty-state p { margin-bottom: var(--space-4); }

/* Mobile Card List */
.card-list-view { display: none; flex-direction: column; gap: var(--space-3); }
.key-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}
.key-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-3);
}
.key-card-name { font-weight: 600; color: var(--text-primary); }
.key-value {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  background: var(--bg-tertiary);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}
.key-value code { flex: 1; font-size: var(--text-xs); word-break: break-all; }
.key-actions-inline { display: flex; gap: var(--space-1); }
.key-stats { display: flex; gap: var(--space-6); margin-bottom: var(--space-3); }
.stat-item { display: flex; flex-direction: column; gap: 2px; }
.stat-label { font-size: var(--text-xs); color: var(--text-muted); }
.stat-value { font-size: var(--text-sm); color: var(--text-primary); font-weight: 500; }
.key-actions {
  display: flex;
  gap: var(--space-2);
  border-top: 1px solid var(--border-color);
  padding-top: var(--space-3);
}
.mobile-empty { padding: var(--space-12) var(--space-4); }

/* Warning Box */
.warning-box {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--warning-light);
  color: var(--warning);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
  margin-bottom: var(--space-4);
}
.new-key-display {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  background: var(--bg-tertiary);
  padding: var(--space-4);
  border-radius: var(--radius-md);
}
.new-key-display code { flex: 1; word-break: break-all; font-size: var(--text-sm); }
.confirm-text { color: var(--text-primary); margin-bottom: var(--space-2); }
.confirm-warning { font-size: var(--text-sm); color: var(--text-muted); }

/* Responsive */
@media (max-width: 1023px) {
  .table-responsive { display: none !important; }
  .card-list-view { display: flex !important; }
}
@media (max-width: 639px) {
  .page-header { flex-direction: column; align-items: flex-start; gap: var(--space-3); }
  .page-actions { width: 100%; }
  .page-actions .btn { flex: 1; }
  .hide-mobile { display: none; }
}
</style>
