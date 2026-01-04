/**
 * 命令注册
 * 定义所有应用命令及其处理逻辑
 */

import { commands } from '../core/command.js';
import { store } from '../core/store.js';
import { api } from '../services/api.js';
import { toast } from '../ui/toast.js';
import { confirm } from '../ui/confirm.js';

// ============ 认证命令 ============

commands.register('auth:login', async ({ password, remember = true }) => {
  const loading = toast.loading('正在登录...');
  
  try {
    await api.login(password, remember);
    const user = await api.getMe();
    store.set('user', user);
    loading.update('登录成功', 'success');
    setTimeout(() => loading.close(), 1500);
    return true;
  } catch (error) {
    loading.close();
    throw error;
  }
});

commands.register('auth:logout', async () => {
  api.clearTokens();
  store.set('user', null);
  toast.info('已退出登录');
});

commands.register('auth:check', async () => {
  const { accessToken } = api.getTokens();
  if (!accessToken) {
    store.set('user', null);
    return false;
  }
  
  try {
    const user = await api.getMe();
    store.set('user', user);
    return true;
  } catch {
    store.set('user', null);
    api.clearTokens();
    return false;
  }
});

// ============ 导航命令 ============

commands.register('nav:change', async ({ tab }) => {
  store.set('activeTab', tab);
  
  // 加载对应数据
  switch (tab) {
    case 'dashboard':
      await commands.dispatch('dashboard:load');
      break;
    case 'accounts':
      await commands.dispatch('accounts:load');
      break;
    case 'logs':
      await commands.dispatch('logs:load');
      break;
  }
});

// ============ 仪表盘命令 ============

commands.register('dashboard:load', async () => {
  store.set('dashboard.loading', true);
  store.set('dashboard.error', null);
  
  try {
    const data = await api.getDashboard();
    store.set('dashboard.data', data);
  } catch (error) {
    store.set('dashboard.error', error.message);
    throw error;
  } finally {
    store.set('dashboard.loading', false);
  }
});

// ============ 账号命令 ============

commands.register('accounts:load', async () => {
  store.set('accounts.loading', true);
  store.set('accounts.error', null);
  
  try {
    const result = await api.getAccounts();
    store.set('accounts.list', result?.accounts || []);
  } catch (error) {
    store.set('accounts.error', error.message);
    throw error;
  } finally {
    store.set('accounts.loading', false);
  }
});

commands.register('accounts:create', async ({ email, refreshToken }) => {
  const loading = toast.loading('正在添加账号...');
  
  try {
    await api.createAccount(email, refreshToken);
    loading.update('账号添加成功', 'success');
    setTimeout(() => loading.close(), 2000);
    
    await commands.dispatch('accounts:load');
    return true;
  } catch (error) {
    loading.close();
    throw error;
  }
});

commands.register('accounts:refresh', async ({ id }) => {
  const loading = toast.loading('正在刷新Token...');
  
  try {
    await api.refreshAccount(id);
    loading.update('Token已刷新', 'success');
    setTimeout(() => loading.close(), 2000);
    
    await commands.dispatch('accounts:load');
  } catch (error) {
    loading.close();
    throw error;
  }
});

commands.register('accounts:refresh-all', async () => {
  const loading = toast.loading('正在刷新全部账号...');
  
  try {
    const result = await api.refreshAllAccounts();
    const results = result?.results || [];
    const count = results.filter(r => r && r.success).length;
    const total = results.length;
    const message = total ? `已刷新 ${count}/${total} 个账号` : '没有可刷新的账号';
    loading.update(message, 'success');
    setTimeout(() => loading.close(), 2000);
    
    await commands.dispatch('accounts:load');
  } catch (error) {
    loading.close();
    throw error;
  }
});

commands.register('accounts:toggle-status', async ({ id, currentStatus }) => {
  const newStatus = currentStatus === 'active' ? 'disabled' : 'active';
  const actionText = newStatus === 'active' ? '启用' : '禁用';
  
  await api.updateAccountStatus(id, newStatus);
  toast.success(`账号已${actionText}`);
  
  await commands.dispatch('accounts:load');
});

commands.register('accounts:delete', async ({ id, email }) => {
  const confirmed = await confirm.show({
    title: '删除账号',
    message: `确定要删除账号 "${email}" 吗？此操作不可恢复。`,
    confirmText: '删除',
    danger: true
  });

  if (!confirmed) return false;

  await api.deleteAccount(id);
  toast.success('账号已删除');
  
  await commands.dispatch('accounts:load');
  return true;
});

commands.register('accounts:view-quota', async ({ id }) => {
  const accounts = store.get('accounts.list') || [];
  const account = accounts.find(a => String(a.id) === String(id));
  
  store.batch(() => {
    store.set('dialogs.quota.open', true);
    store.set('dialogs.quota.accountId', id);
    store.set('dialogs.quota.account', account);
    store.set('dialogs.quota.loading', true);
    store.set('dialogs.quota.data', null);
  });

  try {
    const data = await api.getAccountQuota(id);
    
    // 检查弹窗是否仍打开且是同一账号
    if (store.get('dialogs.quota.open') && 
        store.get('dialogs.quota.accountId') === id) {
      store.set('dialogs.quota.data', data);
    }
  } catch (error) {
    if (store.get('dialogs.quota.accountId') === id) {
      toast.error(error.message || '获取配额失败');
    }
  } finally {
    if (store.get('dialogs.quota.accountId') === id) {
      store.set('dialogs.quota.loading', false);
    }
  }
});

commands.register('accounts:close-quota', () => {
  store.set('dialogs.quota.open', false);
});

// ============ 日志命令 ============

commands.register('logs:load', async () => {
  store.set('logs.loading', true);
  store.set('logs.error', null);
  
  try {
    const now = Date.now();
    const start = now - 24 * 60 * 60 * 1000;
    
    // 加载统计数据
    const statsResponse = await api.getStats({ start_time: start, end_time: now });
    const rawStats = statsResponse?.stats || null;

    // 适配后端字段命名（snake_case）到 UI 需要的字段（camelCase）
    const statsForUi = rawStats ? {
      total: rawStats.total_requests || 0,
      avgLatency: rawStats.avg_latency || 0,
      successRate: rawStats.total_requests > 0
        ? ((rawStats.success_count / rawStats.total_requests) * 100).toFixed(1)
        : 100,
      tokens: rawStats.total_tokens || 0,
      promptTokens: rawStats.total_prompt_tokens || 0,
      completionTokens: rawStats.total_completion_tokens || 0,
      successCount: rawStats.success_count || 0,
      errorCount: rawStats.error_count || 0
    } : null;

    store.set('stats.data', statsForUi);
    store.set('stats.modelUsage', statsResponse?.modelUsage || []);
    
    // 加载日志列表
    const { page, pageSize } = store.get('logs.pagination');
    const filters = store.get('logs.filters');
    
    const result = await api.getLogs({
      limit: pageSize,
      offset: (page - 1) * pageSize,
      model: filters.model || undefined,
      status: filters.status || undefined
    });
    
    store.set('logs.list', result?.logs || []);
    
    // 更新总数（如果API返回）
    if (result?.total !== undefined) {
      store.set('logs.pagination.total', result.total);
    }
  } catch (error) {
    store.set('logs.error', error.message);
    throw error;
  } finally {
    store.set('logs.loading', false);
  }
});

commands.register('logs:set-filter', async ({ model, status }) => {
  store.batch(() => {
    if (model !== undefined) store.set('logs.filters.model', model);
    if (status !== undefined) store.set('logs.filters.status', status);
    store.set('logs.pagination.page', 1);
  });
  
  await commands.dispatch('logs:load');
});

commands.register('logs:set-page', async ({ page }) => {
  store.set('logs.pagination.page', page);
  await commands.dispatch('logs:load');
});

commands.register('logs:set-page-size', async ({ pageSize }) => {
  store.batch(() => {
    store.set('logs.pagination.pageSize', pageSize);
    store.set('logs.pagination.page', 1);
  });
  await commands.dispatch('logs:load');
});

// ============ OAuth 命令 ============

commands.register('oauth:open', () => {
  store.batch(() => {
    store.set('dialogs.oauth.open', true);
    store.set('dialogs.oauth.step', 1);
    store.set('dialogs.oauth.port', null);
    store.set('dialogs.oauth.authUrl', '');
    store.set('dialogs.oauth.callbackUrl', '');
  });
});

commands.register('oauth:close', () => {
  store.set('dialogs.oauth.open', false);
});

commands.register('oauth:start', async () => {
  try {
    const config = await api.getOAuthConfig();
    const cfg = config?.client_id ? config : config?.data || config;
    
    const port = Math.floor(Math.random() * 10000) + 50000;
    const redirectUri = `http://localhost:${port}/oauth-callback`;
    
    const authUrl = `${cfg.auth_endpoint}?` + new URLSearchParams({
      access_type: 'offline',
      client_id: cfg.client_id,
      prompt: 'consent',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: cfg.scope,
      state: String(Date.now())
    }).toString();

    store.batch(() => {
      store.set('dialogs.oauth.port', String(port));
      store.set('dialogs.oauth.authUrl', authUrl);
      store.set('dialogs.oauth.step', 2);
    });

    window.open(authUrl, '_blank');
  } catch (error) {
    toast.error(error.message || '获取OAuth配置失败');
    throw error;
  }
});

commands.register('oauth:exchange', async ({ callbackUrl }) => {
  const port = store.get('dialogs.oauth.port');
  
  // 从URL中提取code
  const codeMatch = callbackUrl.match(/[?&]code=([^&]+)/);
  if (!codeMatch) {
    throw new Error('未找到授权码，请检查URL');
  }
  
  const code = decodeURIComponent(codeMatch[1]);
  const urlPort = (callbackUrl.match(/localhost:(\d+)/) || [])[1];
  const finalPort = port || urlPort;
  
  if (!finalPort) {
    throw new Error('未找到端口，请先点击"打开授权页面"');
  }

  const loading = toast.loading('正在交换Token...');
  
  try {
    await api.exchangeOAuthCode(code, finalPort);
    loading.update('账号添加成功', 'success');
    setTimeout(() => loading.close(), 2000);
    
    store.set('dialogs.oauth.open', false);
    await commands.dispatch('accounts:load');
    return true;
  } catch (error) {
    loading.close();
    throw error;
  }
});

// ============ 主题命令 ============

commands.register('theme:toggle', () => {
  const current = store.get('theme');
  const next = current === 'dark' ? 'light' : 'dark';
  
  store.set('theme', next);
  localStorage.setItem('theme', next);
  document.documentElement.classList.toggle('light-mode', next === 'light');
});

commands.register('theme:init', () => {
  const theme = store.get('theme');
  document.documentElement.classList.toggle('light-mode', theme === 'light');
});

// ============ 数据刷新命令 ============

commands.register('data:refresh', async () => {
  const tab = store.get('activeTab');
  
  switch (tab) {
    case 'dashboard':
      await commands.dispatch('dashboard:load');
      break;
    case 'accounts':
      await commands.dispatch('accounts:load');
      break;
    case 'logs':
      await commands.dispatch('logs:load');
      break;
  }
  
  toast.success('刷新成功');
});

export { commands };
