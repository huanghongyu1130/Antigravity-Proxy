<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useToast } from '../composables/useToast'
import { getLogs, getStats } from '../api'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'
import { RefreshCw, ScrollText, ChevronLeft, ChevronRight } from 'lucide-vue-next'

const toast = useToast()
const logs = ref([])
const stats = ref({})
const loading = ref(false)

const models = [
  'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-3-pro-high', 'gemini-3-pro-low',
  'claude-opus-4-5', 'claude-opus-4-5-thinking', 'claude-sonnet-4-5', 'claude-sonnet-4-5-thinking'
]

const filters = reactive({ model: '', status: '' })
const pagination = reactive({ page: 1, size: 50, total: 0 })

const fetchLogs = async () => {
  loading.value = true
  try {
    const params = {
      limit: pagination.size,
      offset: (pagination.page - 1) * pagination.size,
      model: filters.model || undefined,
      status: filters.status || undefined
    }
    const res = await getLogs(params)
    logs.value = res.data?.logs || res.logs || []
    pagination.total = logs.value.length < pagination.size
      ? (pagination.page - 1) * pagination.size + logs.value.length
      : pagination.page * pagination.size + 1
  } catch (error) {
    toast.error('加载日志失败')
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const now = Date.now()
    const res = await getStats({ start_time: now - 24 * 60 * 60 * 1000, end_time: now })
    stats.value = res.data?.stats || res.stats || {}
  } catch (error) {
    console.error('Failed to load stats', error)
  }
}

const formatTime = (timestamp) => new Date(timestamp).toLocaleString()
const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return String(num)
}

watch(filters, () => { pagination.page = 1; fetchLogs() })
onMounted(() => { fetchLogs(); fetchStats() })
</script>

<template>
  <div class="logs-page">
    <div class="page-header">
      <h1 class="page-title">请求日志</h1>
      <div class="page-actions">
        <select v-model="filters.model" class="filter-select">
          <option value="">全部模型</option>
          <option v-for="m in models" :key="m" :value="m">{{ m }}</option>
        </select>
        <select v-model="filters.status" class="filter-select">
          <option value="">全部状态</option>
          <option value="success">成功</option>
          <option value="error">失败</option>
        </select>
        <Button variant="ghost" @click="fetchLogs" :loading="loading">
          <RefreshCw :size="16" />
        </Button>
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-row">
      <div class="mini-stat">
        <span class="mini-stat-value">{{ stats.total_requests || 0 }}</span>
        <span class="mini-stat-label">请求数 (24h)</span>
      </div>
      <div class="mini-stat">
        <span class="mini-stat-value">{{ formatNumber(stats.total_tokens || 0) }}</span>
        <span class="mini-stat-label">Token数</span>
      </div>
      <div class="mini-stat">
        <span class="mini-stat-value success">
          {{ stats.total_requests > 0 ? ((stats.success_count / stats.total_requests) * 100).toFixed(1) : 100 }}%
        </span>
        <span class="mini-stat-label">成功率</span>
      </div>
      <div class="mini-stat">
        <span class="mini-stat-value">{{ Math.round(stats.avg_latency || 0) }}ms</span>
        <span class="mini-stat-label">平均延迟</span>
      </div>
    </div>

    <!-- Table -->
    <Card class="table-card" :padding="false">
      <table class="table">
        <thead>
          <tr>
            <th>时间</th>
            <th>模型</th>
            <th>账号</th>
            <th>状态</th>
            <th>Token数</th>
            <th>延迟</th>
            <th>错误</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id">
            <td>{{ formatTime(log.created_at) }}</td>
            <td><span class="model-name">{{ log.model }}</span></td>
            <td>{{ log.account_email || '-' }}</td>
            <td><Badge :variant="log.status === 'success' ? 'success' : 'error'">{{ log.status }}</Badge></td>
            <td>
              <span class="token-info">{{ log.prompt_tokens }} → {{ log.completion_tokens }}</span>
              <span class="token-total">({{ log.total_tokens }})</span>
            </td>
            <td>{{ log.latency_ms }}ms</td>
            <td><span v-if="log.error_message" class="error-text" :title="log.error_message">{{ log.error_message }}</span><span v-else>-</span></td>
          </tr>
          <tr v-if="logs.length === 0 && !loading">
            <td colspan="7" class="empty-cell">
              <div class="empty-state">
                <ScrollText :size="40" />
                <p>暂无日志</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Card>

    <!-- Pagination -->
    <div class="pagination">
      <Button variant="ghost" size="sm" :disabled="pagination.page <= 1" @click="pagination.page--; fetchLogs()">
        <ChevronLeft :size="16" /> 上一页
      </Button>
      <span class="page-info">第 {{ pagination.page }} 页</span>
      <Button variant="ghost" size="sm" :disabled="logs.length < pagination.size" @click="pagination.page++; fetchLogs()">
        下一页 <ChevronRight :size="16" />
      </Button>
    </div>
  </div>
</template>

<style scoped>
.logs-page { max-width: 1400px; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-6); flex-wrap: wrap; gap: var(--space-3); }
.page-title { font-size: var(--text-2xl); font-weight: 700; margin: 0; }
.page-actions { display: flex; gap: var(--space-2); flex-wrap: wrap; }

.filter-select {
  padding: var(--space-2) var(--space-3);
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: var(--text-sm);
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}
.mini-stat {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  text-align: center;
}
.mini-stat-value { font-size: var(--text-xl); font-weight: 700; display: block; }
.mini-stat-value.success { color: var(--success); }
.mini-stat-label { font-size: var(--text-xs); color: var(--text-muted); }

.table-card { overflow-x: auto; }
.table { width: 100%; border-collapse: collapse; min-width: 900px; }
.table th, .table td { padding: var(--space-3) var(--space-4); text-align: left; border-bottom: 1px solid var(--border-color); }
.table th { background: var(--bg-tertiary); font-weight: 600; font-size: var(--text-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
.table tr:hover td { background: var(--bg-hover); }

.model-name { font-weight: 500; font-size: var(--text-xs); }
.token-info { font-size: var(--text-sm); }
.token-total { font-size: var(--text-xs); color: var(--text-muted); margin-left: var(--space-1); }
.error-text { color: var(--error); font-size: var(--text-xs); max-width: 150px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; }

.empty-cell { padding: var(--space-12) !important; }
.empty-state { text-align: center; color: var(--text-muted); }
.empty-state svg { opacity: 0.3; margin-bottom: var(--space-3); }

.pagination { display: flex; justify-content: center; align-items: center; gap: var(--space-4); margin-top: var(--space-6); }
.page-info { font-size: var(--text-sm); color: var(--text-muted); }

@media (max-width: 639px) {
  .page-header { flex-direction: column; align-items: flex-start; }
  .page-actions { width: 100%; }
  .stats-row { grid-template-columns: 1fr 1fr; }
}
</style>
