import { Component } from '../core/component.js';
import { store } from '../core/store.js';
import { commands } from '../commands/index.js';

export class Shell extends Component {
  constructor(container) {
    super(container);
    this._tabSliderInited = false;
  }

  render() {
    const theme = store.get('theme');
    const activeTab = store.get('activeTab');
    const user = store.get('user');

    return `
      <div class="app-shell">
        <div class="container">
          <header class="app-header">
            <div class="brand">
              <span class="brand-name">Antigravity</span>
              <span class="brand-tag">Proxy</span>
            </div>
            <div class="header-right">
              <span class="user-info">
                <span class="user-label">OPERATOR:</span>
                <span class="user-name">${this._escape(user?.username || 'Admin')}</span>
              </span>
              <button class="btn btn-sm btn-danger" data-cmd="auth:logout">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16 17 21 12 16 7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                EXIT
              </button>
            </div>
          </header>

          <div class="tabs-container">
            <nav class="tabs">
              <div class="tab-slider"></div>
              <button class="tab ${activeTab === 'dashboard' ? 'active' : ''}"
                      data-cmd="nav:change" data-tab="dashboard">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="3" width="7" height="7"/>
                  <rect x="14" y="3" width="7" height="7"/>
                  <rect x="14" y="14" width="7" height="7"/>
                  <rect x="3" y="14" width="7" height="7"/>
                </svg>
                DASHBOARD
              </button>
              <button class="tab ${activeTab === 'accounts' ? 'active' : ''}"
                      data-cmd="nav:change" data-tab="accounts">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                ACCOUNTS
              </button>
              <button class="tab ${activeTab === 'logs' ? 'active' : ''}"
                      data-cmd="nav:change" data-tab="logs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                </svg>
                LOGS
              </button>
            </nav>
            <div class="tab-actions">
              <button class="btn btn-sm btn-icon" data-cmd="theme:toggle" 
                      title="${theme === 'dark' ? 'Light Mode' : 'Dark Mode'}">
                ${theme === 'dark' ?
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' :
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      }
              </button>
              <button class="btn btn-sm btn-icon btn-primary" data-cmd="data:refresh" title="Refresh">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="23 4 23 10 17 10"/>
                  <polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
                </svg>
              </button>
            </div>
          </div>

          <main id="pageContent" data-preserve-children="true"></main>
        </div>
      </div>
    `;
  }

  onMount() {
    this.watch(['activeTab', 'theme', 'user']);
    requestAnimationFrame(() => this._updateTabSlider(false));
  }

  onUpdate() {
    requestAnimationFrame(() => this._updateTabSlider(true));
  }

  _bindEvents() {
    this.delegate('click', '[data-cmd]', (e, target) => {
      const cmd = target.dataset.cmd;
      const tab = target.dataset.tab;
      commands.dispatch(cmd, { tab });
    });

    window.addEventListener('resize', () => {
      this._updateTabSlider(false);
    });
  }

  _updateTabSlider(animate = true) {
    const slider = this.container.querySelector('.tab-slider');
    const activeTab = this.container.querySelector('.tab.active');
    const tabs = this.container.querySelector('.tabs');

    if (!slider || !activeTab || !tabs) return;

    const tabLeft = activeTab.offsetLeft;
    const tabWidth = activeTab.offsetWidth;
    const tabsWidth = tabs.scrollWidth;
    const rightValue = tabsWidth - tabLeft - tabWidth;

    if (animate && this._tabSliderInited) {
      slider.style.transition = 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1), right 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    } else {
      slider.style.transition = 'none';
    }

    slider.style.left = `${tabLeft}px`;
    slider.style.right = `${rightValue}px`;

    if (!this._tabSliderInited) {
      slider.offsetHeight;
      this._tabSliderInited = true;
    }
  }
}

export default Shell;
