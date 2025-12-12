import { verifyApiKey, recordApiKeyUsage } from '../middleware/auth.js';
import { accountPool } from '../services/accountPool.js';
import { acquireModelSlot, releaseModelSlot } from '../services/rateLimiter.js';
import { streamChat, chat } from '../services/antigravity.js';
import {
    convertAnthropicToAntigravity,
    convertAntigravityToAnthropic,
    convertAntigravityToAnthropicSSE,
    preprocessAnthropicRequest
} from '../services/converter.js';
import { createRequestLog } from '../db/index.js';
import { isThinkingModel, AVAILABLE_MODELS } from '../config.js';

export default async function anthropicRoutes(fastify) {
    // POST /v1/messages - Anthropic 格式的聊天端点
    fastify.post('/v1/messages', {
        preHandler: verifyApiKey
    }, async (request, reply) => {
        const startTime = Date.now();
        let anthropicRequest = request.body;
        const { stream = false, model } = anthropicRequest;

        // 检测 thinking 模式 - 显式启用或根据模型名自动启用
        const thinkingEnabledForLog = anthropicRequest.thinking?.type === 'enabled' ||
            (anthropicRequest.thinking?.type !== 'disabled' && isThinkingModel(model));

        // 详细日志
        console.log('[Anthropic Route] Incoming request:', JSON.stringify({
            userAgent: request.headers['user-agent'],
            host: request.headers['host'],
            ip: request.ip,
            stream,
            model,
            messageCount: anthropicRequest.messages?.length,
            hasTools: !!anthropicRequest.tools,
            thinkingEnabled: thinkingEnabledForLog,
            thinkingType: anthropicRequest.thinking?.type,
            isThinkingModel: isThinkingModel(model)
        }));

        // 调试：打印工具格式
        if (anthropicRequest.tools) {
            console.log('[Anthropic Route] Tools:', JSON.stringify(anthropicRequest.tools.slice(0, 2), null, 2));
        }

        let account = null;
        let usage = null;
        let status = 'success';
        let errorMessage = null;
        let modelSlotAcquired = false;

        try {
            // 1. 预处理请求 - 为没有 thinking 块的 assistant 消息添加 redacted_thinking
            anthropicRequest = preprocessAnthropicRequest(anthropicRequest);

            // 2. 获取模型并发槽位（避免本地直接打爆上游）
            modelSlotAcquired = acquireModelSlot(model);
            if (!modelSlotAcquired) {
                status = 'error';
                errorMessage = 'Model concurrency limit reached';
                return reply.code(429).send({
                    type: 'error',
                    error: {
                        type: 'rate_limit_error',
                        message: 'Model concurrency limit reached, please retry later',
                        code: 'model_concurrency_limit'
                    }
                });
            }

            // 3. 获取最优账号
            account = await accountPool.getBestAccount(model);

            // 4. 转换请求格式
            const antigravityRequest = convertAnthropicToAntigravity(anthropicRequest, account.project_id);
            const requestId = antigravityRequest.requestId.replace('agent-', '');

            // 5. 流式或非流式处理
            if (stream) {
                // 设置 SSE 响应头 (Anthropic 格式)
                reply.raw.writeHead(200, {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'X-Accel-Buffering': 'no'
                });

                // 发送 message_start 事件
                const messageStart = {
                    type: 'message_start',
                    message: {
                        id: `msg_${requestId}`,
                        type: 'message',
                        role: 'assistant',
                        model,
                        content: [],
                        stop_reason: null,
                        stop_sequence: null,
                        usage: {
                            input_tokens: 0,
                            output_tokens: 0
                        }
                    }
                };
                reply.raw.write(`event: message_start\ndata: ${JSON.stringify(messageStart)}\n\n`);

                // 处理客户端断开
                const abortController = new AbortController();
                request.raw.on('close', () => {
                    abortController.abort();
                });

                let sseState = {};
                let lastUsage = null;

                await streamChat(
                    account,
                    antigravityRequest,
                    (data) => {
                        // 转换 SSE 数据
                        const { events, state } = convertAntigravityToAnthropicSSE(
                            data, requestId, model, sseState
                        );
                        sseState = state;

                        // 发送所有事件
                        for (const event of events) {
                            const eventType = event.type;
                            reply.raw.write(`event: ${eventType}\ndata: ${JSON.stringify(event)}\n\n`);

                            // 提取 usage
                            if (event.usage) {
                                lastUsage = event.usage;
                            }
                        }
                    },
                    (error) => {
                        status = 'error';
                        errorMessage = error.message;
                        const errorEvent = {
                            type: 'error',
                            error: {
                                type: 'api_error',
                                message: error.message
                            }
                        };
                        reply.raw.write(`event: error\ndata: ${JSON.stringify(errorEvent)}\n\n`);
                    },
                    abortController.signal
                );

                reply.raw.end();

                if (lastUsage) {
                    usage = {
                        promptTokens: lastUsage.input_tokens || 0,
                        completionTokens: lastUsage.output_tokens || 0,
                        totalTokens: (lastUsage.input_tokens || 0) + (lastUsage.output_tokens || 0)
                    };
                }
            } else {
                // 非流式请求
                const antigravityResponse = await chat(account, antigravityRequest);
                // 检测 thinking 模式 - 显式启用或根据模型名自动启用
                const thinkingEnabled = anthropicRequest.thinking?.type === 'enabled' ||
                    (anthropicRequest.thinking?.type !== 'disabled' && isThinkingModel(model));
                const anthropicResponse = convertAntigravityToAnthropic(
                    antigravityResponse, requestId, model, thinkingEnabled
                );

                usage = {
                    promptTokens: anthropicResponse.usage.input_tokens,
                    completionTokens: anthropicResponse.usage.output_tokens,
                    totalTokens: anthropicResponse.usage.input_tokens + anthropicResponse.usage.output_tokens
                };

                return anthropicResponse;
            }
        } catch (error) {
            status = 'error';
            errorMessage = error.message;

            const msg = error.message || '';
            const isCapacityError =
                msg.includes('exhausted your capacity on this model') ||
                msg.includes('Resource has been exhausted') ||
                msg.includes('Invalid response structure');

            // 容量耗尽：不把账号标成 error，只做短暂冷却，并返回 429
            if (account && isCapacityError) {
                accountPool.markCapacityLimited(account.id, model, msg);
            } else if (account) {
                accountPool.markAccountError(account.id, error);
            }

            const httpStatus = isCapacityError ? 429 : 500;
            const errorType = isCapacityError ? 'rate_limit_error' : 'api_error';

            // 返回 Anthropic 格式的错误
            return reply.code(httpStatus).send({
                type: 'error',
                error: {
                    type: errorType,
                    message: error.message
                }
            });
        } finally {
            // 释放模型并发槽位
            if (modelSlotAcquired) {
                releaseModelSlot(model);
            }
            // 解锁账号并发
            if (account) {
                accountPool.unlockAccount(account.id);
            }

            // 记录请求日志
            const latencyMs = Date.now() - startTime;
            createRequestLog({
                accountId: account?.id,
                apiKeyId: request.apiKey?.id,
                model,
                promptTokens: usage?.promptTokens || 0,
                completionTokens: usage?.completionTokens || 0,
                totalTokens: usage?.totalTokens || 0,
                thinkingTokens: usage?.thinkingTokens || 0,
                status,
                latencyMs,
                errorMessage
            });

            // 记录 API Key 使用量
            if (request.apiKey && usage?.totalTokens) {
                recordApiKeyUsage(request.apiKey.id, usage.totalTokens);
            }
        }
    });

    // POST /messages - 兼容无 /v1 前缀的请求
    fastify.post('/messages', {
        preHandler: verifyApiKey
    }, async (request, reply) => {
        // 重定向到 /v1/messages
        return fastify.inject({
            method: 'POST',
            url: '/v1/messages',
            payload: request.body,
            headers: request.headers
        }).then(response => {
            reply.code(response.statusCode).headers(response.headers).send(response.payload);
        });
    });
}
