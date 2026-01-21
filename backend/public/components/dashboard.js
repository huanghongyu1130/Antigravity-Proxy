/**
 * Neo-Tokyo Dashboard Component
 * Cyberpunk-styled dashboard with holographic stat cards
 */

import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import { formatNumber } from '../utils/format.js';

export class Dashboard extends Component {
  render() {
    const dashboard = store.get('dashboard') || {};
    const { data, loading } = dashboard;

    if (loading && !data) {
      return `
        <div class="loading-placeholder">
          <div class="spinner spinner-lg"></div>
          <span class="loading-text">INITIALIZING SYSTEMS...</span>
        </div>
      `;
    }

    const d = data || {};
    const today = d.today || {};
    const accounts = d.accounts || {};
    const pool = d.pool || {};
    const modelUsage = Array.isArray(d.modelUsage) ? d.modelUsage : [];

    return `
      <div class="dashboard-page">
        <div class="stats-grid">
          ${this._renderStatCard(
      'ACTIVE ACCOUNTS',
      `${accounts.active || 0}<span class="card-value-sub">/ ${accounts.total || 0}</span>`,
      `Pool Active: ${pool.active ?? 0} | Avg Quota: ${(pool.avgQuota ?? 0).toFixed(2)}`,
      'stat-accounts',
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>`
    )}
          ${this._renderStatCard(
      'TODAY REQUESTS',
      formatNumber(today.requests || 0),
      `Success Rate: ${today.successRate ?? '100'}%`,
      'stat-requests',
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
            </svg>`
    )}
          ${this._renderStatCard(
      'TODAY TOKENS',
      formatNumber(today.tokens || 0),
      `Avg Latency: ${Math.round(today.avgLatency ?? 0)}ms`,
      'stat-tokens',
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>`
    )}
          ${this._renderStatCard(
      'ERROR ACCOUNTS',
      accounts.error || 0,
      'Requires attention',
      'stat-errors',
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>`,
      accounts.error > 0
    )}
        </div>

        <div class="content-grid">
          <div class="card card-table">
            <div class="card-header">
              <span class="card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="20" x2="18" y2="10"/>
                  <line x1="12" y1="20" x2="12" y2="4"/>
                  <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                MODEL USAGE (TODAY)
              </span>
            </div>
            ${this._renderModelUsage(modelUsage)}
          </div>

          <div class="card card-endpoints">
            <div class="card-header">
              <span class="card-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                API ENDPOINTS
              </span>
            </div>
            <div class="endpoint-list">
              ${this._renderEndpoint('OPENAI COMPATIBLE', `${location.origin}/v1/chat/completions`, 'openai')}
              ${this._renderEndpoint('GEMINI NATIVE', `${location.origin}/v1beta/models/{model}:generateContent`, 'gemini')}
              ${this._renderEndpoint('ANTHROPIC COMPATIBLE', `${location.origin}/v1/messages`, 'anthropic')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  _renderStatCard(title, value, subtitle, className = '', icon = '', isError = false) {
    const errorClass = isError ? 'card-error' : '';
    return `
      <div class="card stat-card ${className} ${errorClass}">
        <div class="stat-icon">${icon}</div>
        <div class="stat-content">
          <div class="card-title">${this._escape(title)}</div>
          <div class="card-value">${value}</div>
          <div class="card-subtitle">${this._escape(subtitle)}</div>
        </div>
      </div>
    `;
  }

  _renderModelUsage(modelUsage) {
    if (modelUsage.length === 0) {
      return `
        <div class="empty-state">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <span>NO DATA AVAILABLE</span>
        </div>
      `;
    }

    return `
      <div class="table-wrapper">
        <table class="table">
          <thead>
            <tr>
              <th>MODEL</th>
              <th>CALLS</th>
              <th>TOKENS</th>
            </tr>
          </thead>
          <tbody>
            ${modelUsage.map((m, i) => `
              <tr style="animation-delay: ${i * 50}ms">
                <td class="mono" data-label="Model">${this._escape(m.model)}</td>
                <td data-label="Calls">${formatNumber(m.count)}</td>
                <td data-label="Tokens">${formatNumber(m.tokens)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  _renderEndpoint(label, url, type) {
    return `
      <div class="endpoint-item endpoint-${type}">
        <div class="endpoint-header">
          <span class="endpoint-label">${this._escape(label)}</span>
          <span class="endpoint-badge">${type.toUpperCase()}</span>
        </div>
        <code class="endpoint-url">${this._escape(url)}</code>
      </div>
    `;
  }

  onMount() {
    this.watch('dashboard');
  }
}

export default Dashboard;
