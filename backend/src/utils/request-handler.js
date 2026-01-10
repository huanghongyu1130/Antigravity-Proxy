import { isCapacityError, isNonRetryableError, isAuthenticationError, isRefreshTokenInvalidError, parseResetAfterMs, sleep } from './route-helpers.js';
import { withCapacityRetry, withFullRetry } from './retry-handler.js';
import { RETRY_CONFIG } from '../config.js';
import { forceRefreshToken } from '../services/tokenManager.js';
import { updateAccountStatus } from '../db/index.js';

export function createAbortController(request) {
    const abortController = new AbortController();
    request.raw.on('close', () => abortController.abort());
    return abortController;
}

function attachAccountToError(error, account) {
    if (!error || typeof error !== 'object') return;
    if (!account) return;
    if (!Object.prototype.hasOwnProperty.call(error, 'account')) {
        Object.defineProperty(error, 'account', { value: account, enumerable: false });
    }
}

async function handleAuthErrorWithRefresh(account, error, execute, antigravityRequest) {
    if (!isAuthenticationError(error)) {
        return null;
    }

    if (isRefreshTokenInvalidError(error)) {
        updateAccountStatus(account.id, 'error', `Auth permanently invalid: ${error.message}`);
        return null;
    }

    const refreshResult = await forceRefreshToken(account);
    if (!refreshResult) {
        updateAccountStatus(account.id, 'error', `Token refresh failed after auth error: ${error.message}`);
        return null;
    }

    try {
        const result = await execute(account, antigravityRequest);
        return { success: true, result };
    } catch (retryError) {
        updateAccountStatus(account.id, 'error', `Auth error persists after refresh: ${retryError.message}`);
        return { success: false, error: retryError };
    }
}

export async function runChatWithCapacityRetry({
    model,
    maxRetries,
    baseRetryDelayMs,
    accountPool,
    buildRequest,
    execute
}) {
    const configuredRetries = Math.max(0, Number(maxRetries || 0));
    const availableCount = typeof accountPool?.getAvailableAccountCount === 'function'
        ? accountPool.getAvailableAccountCount(model)
        : 0;
    // 至少轮询完一遍账号池（遇到 capacity 时再放弃）
    const effectiveMaxRetries = Math.max(configuredRetries, Math.max(0, availableCount - 1));

    const out = await withCapacityRetry({
        maxRetries: effectiveMaxRetries,
        baseRetryDelayMs,
        getAccount: async () => accountPool.getNextAccount(model),
        executeRequest: async ({ account }) => {
            const antigravityRequest = buildRequest(account);
            try {
                return await execute(account, antigravityRequest);
            } catch (error) {
                if (!isCapacityError(error)) attachAccountToError(error, account);
                throw error;
            }
        },
        onCapacityError: async ({ account, error }) => {
            const cooldownMs = accountPool.markCapacityLimited(account.id, model, error.message || '');
            if (cooldownMs !== undefined && error && typeof error === 'object' && !Number.isFinite(error.retryAfterMs)) {
                error.retryAfterMs = cooldownMs;
            }
            accountPool.unlockAccount(account.id);
        }
    });

    if (out.account) accountPool.markCapacityRecovered(out.account.id, model);
    return { account: out.account, result: out.result };
}

/**
 * 带完整重试策略的非流式请求：同号重试 + 换号重试 + 认证错误刷新重试
 */
export async function runChatWithFullRetry({
    model,
    accountPool,
    buildRequest,
    execute
}) {
    const availableCount = typeof accountPool?.getAvailableAccountCount === 'function'
        ? accountPool.getAvailableAccountCount(model)
        : 0;
    const maxAccountSwitches = Math.max(RETRY_CONFIG.maxRetries, Math.max(0, availableCount - 1));

    const out = await withFullRetry({
        sameAccountRetries: RETRY_CONFIG.sameAccountRetries,
        sameAccountRetryDelayMs: RETRY_CONFIG.sameAccountRetryDelayMs,
        maxAccountSwitches,
        accountSwitchDelayMs: RETRY_CONFIG.baseRetryDelayMs,
        totalTimeoutMs: RETRY_CONFIG.totalTimeoutMs,
        getAccount: async () => accountPool.getNextAccount(model),
        executeRequest: async ({ account }) => {
            const antigravityRequest = buildRequest(account);
            try {
                return await execute(account, antigravityRequest);
            } catch (error) {
                if (isAuthenticationError(error)) {
                    const authRetryResult = await handleAuthErrorWithRefresh(account, error, execute, antigravityRequest);
                    if (authRetryResult?.success) {
                        return authRetryResult.result;
                    }
                    error.authHandled = true;
                }
                throw error;
            }
        },
        shouldRetryOnSameAccount: ({ error, capacity }) => {
            if (error?.authHandled) return false;
            if (capacity) return false;
            return true;
        },
        shouldSwitchAccount: ({ error, capacity }) => {
            if (error?.authHandled) return false;
            if (capacity && availableCount <= 1) return false;
            return true;
        },
        onError: async ({ account, error, capacity }) => {
            if (capacity) {
                const cooldownMs = accountPool.markCapacityLimited(account.id, model, error.message || '');
                if (cooldownMs !== undefined && error && typeof error === 'object' && !Number.isFinite(error.retryAfterMs)) {
                    error.retryAfterMs = cooldownMs;
                }
            }
            accountPool.unlockAccount(account.id);
        },
        onSuccess: async ({ account }) => {
            accountPool.markCapacityRecovered(account.id, model);
            accountPool.markAccountSuccess(account.id);
        }
    });

    return { account: out.account, result: out.result };
}

export async function runStreamChatWithCapacityRetry({
    model,
    maxRetries,
    baseRetryDelayMs,
    accountPool,
    buildRequest,
    streamChat,
    onData,
    abortSignal,
    canRetry
}) {
    let attempt = 0;
    const configuredRetries = Math.max(0, Number(maxRetries || 0));
    const availableCount = typeof accountPool?.getAvailableAccountCount === 'function'
        ? accountPool.getAvailableAccountCount(model)
        : 0;
    const effectiveMaxRetries = Math.max(configuredRetries, Math.max(0, availableCount - 1));

    while (true) {
        attempt++;
        const account = await accountPool.getNextAccount(model);
        const antigravityRequest = buildRequest(account);

        try {
            await streamChat(account, antigravityRequest, onData, null, abortSignal);
            accountPool.markCapacityRecovered(account.id, model);
            return { account, aborted: false };
        } catch (error) {
            if (abortSignal?.aborted) {
                return { account, aborted: true };
            }

            const capacity = isCapacityError(error);
            if (capacity) {
                const cooldownMs = accountPool.markCapacityLimited(account.id, model, error.message || '');
                if (cooldownMs !== undefined && error && typeof error === 'object' && !Number.isFinite(error.retryAfterMs)) {
                    error.retryAfterMs = cooldownMs;
                }
                accountPool.unlockAccount(account.id);

                const allowByOutput = typeof canRetry === 'function' ? !!canRetry({ attempt, error }) : true;
                if (allowByOutput && attempt <= Math.max(0, Number(effectiveMaxRetries || 0)) + 1) {
                    const resetMs = parseResetAfterMs(error?.message);
                    const delay = resetMs ?? (Math.max(0, Number(baseRetryDelayMs || 0)) * attempt);
                    await sleep(delay);
                    continue;
                }

                throw error;
            }

            attachAccountToError(error, account);
            throw error;
        }
    }
}

/**
 * 带完整重试策略的流式请求：同号重试 + 换号重试 + 认证错误刷新重试
 */
export async function runStreamChatWithFullRetry({
    model,
    accountPool,
    buildRequest,
    streamChat,
    onData,
    abortSignal,
    canRetry
}) {
    const availableCount = typeof accountPool?.getAvailableAccountCount === 'function'
        ? accountPool.getAvailableAccountCount(model)
        : 0;
    const maxAccountSwitches = Math.max(RETRY_CONFIG.maxRetries, Math.max(0, availableCount - 1));

    let lastAccount = null;
    let aborted = false;

    try {
        const out = await withFullRetry({
            sameAccountRetries: RETRY_CONFIG.sameAccountRetries,
            sameAccountRetryDelayMs: RETRY_CONFIG.sameAccountRetryDelayMs,
            maxAccountSwitches,
            accountSwitchDelayMs: RETRY_CONFIG.baseRetryDelayMs,
            totalTimeoutMs: RETRY_CONFIG.totalTimeoutMs,
            getAccount: async () => accountPool.getNextAccount(model),
            executeRequest: async ({ account }) => {
                lastAccount = account;
                const antigravityRequest = buildRequest(account);
                try {
                    await streamChat(account, antigravityRequest, onData, null, abortSignal);
                    return true;
                } catch (error) {
                    if (isAuthenticationError(error)) {
                        const authRetryResult = await handleAuthErrorWithRefresh(
                            account,
                            error,
                            async (acc, req) => {
                                await streamChat(acc, req, onData, null, abortSignal);
                                return true;
                            },
                            antigravityRequest
                        );
                        if (authRetryResult?.success) {
                            return authRetryResult.result;
                        }
                        error.authHandled = true;
                    }
                    throw error;
                }
            },
            onError: async ({ account, error, capacity }) => {
                if (abortSignal?.aborted) {
                    aborted = true;
                    return;
                }
                if (capacity) {
                    const cooldownMs = accountPool.markCapacityLimited(account.id, model, error.message || '');
                    if (cooldownMs !== undefined && error && typeof error === 'object' && !Number.isFinite(error.retryAfterMs)) {
                        error.retryAfterMs = cooldownMs;
                    }
                }
                accountPool.unlockAccount(account.id);
            },
            onSuccess: async ({ account }) => {
                accountPool.markCapacityRecovered(account.id, model);
                accountPool.markAccountSuccess(account.id);
            },
            shouldRetryOnSameAccount: ({ error, capacity }) => {
                if (abortSignal?.aborted) return false;
                if (error?.authHandled) return false;
                if (isNonRetryableError(error)) return false;
                if (capacity) return false;
                return true;
            },
            shouldSwitchAccount: ({ error, capacity }) => {
                if (abortSignal?.aborted) return false;
                if (error?.authHandled) return false;
                if (isNonRetryableError(error)) return false;
                if (capacity && availableCount <= 1) return false;
                if (typeof canRetry === 'function' && !canRetry({ error })) return false;
                return true;
            }
        });

        return { account: out.account, aborted: false };
    } catch (error) {
        if (abortSignal?.aborted || aborted) {
            return { account: lastAccount, aborted: true };
        }
        attachAccountToError(error, lastAccount);
        throw error;
    }
}
