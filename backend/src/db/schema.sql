-- 账号表
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    refresh_token TEXT NOT NULL,
    access_token TEXT,
    token_expires_at INTEGER,
    project_id TEXT,
    tier TEXT DEFAULT 'free-tier',
    status TEXT DEFAULT 'active',
    quota_remaining REAL DEFAULT 1.0,
    quota_reset_time INTEGER,
    last_used_at INTEGER,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- 请求日志表
CREATE TABLE IF NOT EXISTS request_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,
    api_key_id INTEGER,
    model TEXT,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    thinking_tokens INTEGER,
    status TEXT,
    latency_ms INTEGER,
    error_message TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (account_id) REFERENCES accounts(id),
    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT,
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- API Key 表
CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT UNIQUE NOT NULL,
    name TEXT,
    status TEXT DEFAULT 'active',
    request_count INTEGER DEFAULT 0,
    token_count INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    last_used_at INTEGER
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_accounts_quota ON accounts(quota_remaining);
CREATE INDEX IF NOT EXISTS idx_request_logs_created ON request_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_request_logs_account ON request_logs(account_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(key);
CREATE INDEX IF NOT EXISTS idx_api_keys_status ON api_keys(status);
