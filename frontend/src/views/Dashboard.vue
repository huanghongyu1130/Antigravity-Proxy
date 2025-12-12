<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useToast } from '../composables/useToast'
import { getDashboard } from '../api'
import { copyToClipboard } from '../utils/clipboard'
import Card from '../components/ui/Card.vue'
import Button from '../components/ui/Button.vue'
import Badge from '../components/ui/Badge.vue'
import {
  Users,
  MessageSquare,
  Coins,
  Clock,
  Plus,
  RefreshCw,
  Copy,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle
} from 'lucide-vue-next'

const router = useRouter()
const toast = useToast()

const data = ref({})
const loading = ref(true)
const refreshing = ref(false)

const apiEndpoint = computed(() => window.location.origin)

const stats = computed(() => [
  {
    label: '活跃账号',
    value: `${data.value.accounts?.active || 0}/${data.value.accounts?.total || 0}`,
    icon: Users,
    color: 'blue',
    change: null
  },
  {
    label: '今日请求',
    value: formatNumber(data.value.today?.requests || 0),
    icon: MessageSquare,
    color: 'green',
    change: data.value.today?.requestsChange || null
  },
  {
    label: '今日Token',
    value: formatNumber(data.value.today?.tokens || 0),
    icon: Coins,
    color: 'yellow',
    change: data.value.today?.tokensChange || null
  },
  {
    label: '平均延迟',
    value: `${data.value.today?.avgLatency || 0}ms`,
    icon: Clock,
    color: 'purple',
    change: null
  }
])

const fetchData = async () => {
  loading.value = true
  try {
    const response = await getDashboard()
    data.value = response.data || response
  } catch (error) {
    toast.error('加载仪表盘失败')
  } finally {
    loading.value = false
  }
}

const refreshQuotas = async () => {
  refreshing.value = true
  try {
    await fetchData()
    toast.success('仪表盘已刷新')
  } catch (error) {
    toast.error('刷新失败')
  } finally {
    refreshing.value = false
  }
}

const copyApiEndpoint = async () => {
  const success = await copyToClipboard(`${apiEndpoint.value}/v1/chat/completions`)
  if (success) {
    toast.success('API端点已复制')
  } else {
    toast.error('复制失败，请手动复制')
  }
}

const formatNumber = (num) => {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K'
  return String(num)
}

const getPercentage = (count) => {
  const total = data.value.modelUsage?.reduce((sum, item) => sum + item.count, 0) || 1
  return Math.round((count / total) * 100)
}

const getColorClass = (color) => {
  const colors = {
    blue: 'stat-blue',
    green: 'stat-green',
    yellow: 'stat-yellow',
    purple: 'stat-purple'
  }
  return colors[color] || 'stat-blue'
}

onMounted(fetchData)
</script>

<template>
  <div class="dashboard">
    <div class="page-header">
      <h1 class="page-title">仪表盘</h1>
      <div class="page-actions">
        <Button variant="secondary" :loading="refreshing" @click="refreshQuotas">
          <RefreshCw :size="16" />
          <span class="hide-mobile">刷新</span>
        </Button>
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="stats-grid">
      <div
        v-for="stat in stats"
        :key="stat.label"
        class="stat-card"
      >
        <div :class="['stat-icon', getColorClass(stat.color)]">
          <component :is="stat.icon" :size="20" />
        </div>
        <div class="stat-content">
          <span class="stat-value">{{ stat.value }}</span>
          <span class="stat-label">{{ stat.label }}</span>
        </div>
        <div v-if="stat.change !== null" class="stat-change" :class="stat.change >= 0 ? 'positive' : 'negative'">
          <TrendingUp v-if="stat.change >= 0" :size="14" />
          <TrendingDown v-else :size="14" />
          <span>{{ Math.abs(stat.change) }}%</span>
        </div>
      </div>
    </div>

    <!-- Two columns -->
    <div class="dashboard-grid">
      <!-- Model Usage -->
      <Card title="模型使用" class="model-card">
        <div v-if="data.modelUsage?.length" class="model-usage">
          <div v-for="item in data.modelUsage" :key="item.model" class="usage-item">
            <div class="usage-header">
              <span class="usage-model">{{ item.model }}</span>
              <span class="usage-count">{{ item.count }}</span>
            </div>
            <div class="usage-bar">
              <div
                class="usage-progress"
                :style="{ width: getPercentage(item.count) + '%' }"
              ></div>
            </div>
          </div>
        </div>
        <div v-else class="empty-state">
          <MessageSquare :size="40" class="empty-icon" />
          <p>暂无使用数据</p>
        </div>
      </Card>

      <!-- Quick Actions -->
      <Card title="快捷操作" class="actions-card">
        <div class="quick-actions">
          <Button variant="primary" @click="router.push('/accounts')">
            <Plus :size="16" />
            添加账号
          </Button>
          <Button variant="secondary" @click="copyApiEndpoint">
            <Copy :size="16" />
            复制端点
          </Button>
        </div>

        <div class="api-info">
          <div class="info-row">
            <span class="info-label">API 端点</span>
            <code class="info-code">{{ apiEndpoint }}/v1/...</code>
          </div>
          <div class="info-divider"></div>
          <div class="info-row">
            <span class="info-label">成功率</span>
            <Badge variant="success" dot>
              {{ data.today?.successRate || 100 }}%
            </Badge>
          </div>
          <div class="info-divider"></div>
          <div class="info-row">
            <span class="info-label">运行状态</span>
            <Badge variant="success" dot>
              正常运行
            </Badge>
          </div>
        </div>

        <template #footer>
          <router-link to="/logs" class="view-logs-link">
            查看全部日志
            <ArrowRight :size="14" />
          </router-link>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
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

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  padding: var(--space-5);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  position: relative;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-blue {
  background: var(--info-light);
  color: var(--info);
}

.stat-green {
  background: var(--success-light);
  color: var(--success);
}

.stat-yellow {
  background: var(--warning-light);
  color: var(--warning);
}

.stat-purple {
  background: var(--purple-light);
  color: var(--purple);
}

.stat-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.stat-value {
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.stat-change {
  position: absolute;
  top: var(--space-4);
  right: var(--space-4);
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: var(--text-xs);
  font-weight: 500;
}

.stat-change.positive {
  color: var(--success);
}

.stat-change.negative {
  color: var(--error);
}

/* Dashboard Grid */
.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-6);
}

/* Model Usage */
.model-usage {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.usage-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.usage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.usage-model {
  font-size: var(--text-sm);
  color: var(--text-primary);
  font-weight: 500;
}

.usage-count {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.usage-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: var(--radius-full);
  overflow: hidden;
}

.usage-progress {
  height: 100%;
  background: var(--gradient-primary);
  border-radius: var(--radius-full);
  transition: width var(--transition-slow);
}

/* Quick Actions */
.quick-actions {
  display: flex;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.api-info {
  background: var(--bg-tertiary);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.info-label {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.info-code {
  font-size: var(--text-xs);
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
}

.info-divider {
  height: 1px;
  background: var(--border-color);
  margin: var(--space-3) 0;
}

.view-logs-link {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--text-muted);
  transition: color var(--transition-fast);
}

.view-logs-link:hover {
  color: var(--accent);
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: var(--space-8) 0;
  color: var(--text-muted);
}

.empty-icon {
  opacity: 0.3;
  margin-bottom: var(--space-3);
}

/* Responsive */
@media (max-width: 1023px) {
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
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

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: var(--space-3);
  }

  .stat-card {
    padding: var(--space-4);
  }

  .stat-value {
    font-size: var(--text-xl);
  }

  .quick-actions {
    flex-direction: column;
  }

  .quick-actions .btn {
    width: 100%;
  }

  .hide-mobile {
    display: none;
  }
}
</style>
