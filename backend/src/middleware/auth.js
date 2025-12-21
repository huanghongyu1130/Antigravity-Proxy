import { getApiKeyByKey, updateApiKeyUsage } from '../db/index.js';
import { SERVER_CONFIG } from '../config.js';
import { verifyToken } from '../routes/auth.js';

/**
 * API Key 认证中间件
 * 支持两种认证方式：
 * 1. Authorization: Bearer <api_key> (OpenAI 格式)
 * 2. x-api-key: <api_key> (Anthropic 格式)
 */
export async function verifyApiKey(request, reply) {
    const authHeader = request.headers.authorization;
    const xApiKey = request.headers['x-api-key'];
    const anthropicApiKey = request.headers['anthropic-api-key'];
    const xGoogApiKey = request.headers['x-goog-api-key'];
    const queryKey = request?.query && typeof request.query === 'object' ? request.query.key : null;

    let apiKey = null;

    // 优先使用 x-api-key header (Anthropic 格式)
    if (xApiKey) {
        apiKey = xApiKey;
    }
    // 兼容更多客户端：anthropic-api-key / x-goog-api-key
    else if (anthropicApiKey) {
        apiKey = anthropicApiKey;
    } else if (xGoogApiKey) {
        apiKey = xGoogApiKey;
    }
    // 其次使用 Authorization: Bearer header (OpenAI 格式)
    else if (authHeader) {
        if (!authHeader.startsWith('Bearer ')) {
            return reply.code(401).send({
                error: {
                    message: 'Invalid Authorization header format. Expected: Bearer <api_key>',
                    type: 'invalid_request_error',
                    code: 'invalid_api_key'
                }
            });
        }
        apiKey = authHeader.slice(7);
    }
    // 兼容 Gemini 官方：?key=<api_key>
    else if (queryKey) {
        apiKey = Array.isArray(queryKey) ? queryKey[0] : queryKey;
    }
    // 没有任何认证信息
    else {
        return reply.code(401).send({
            error: {
                message: 'Missing Authorization header or API key header',
                type: 'invalid_request_error',
                code: 'missing_api_key'
            }
        });
    }

    if (!apiKey) {
        return reply.code(401).send({
            error: {
                message: 'API key is empty',
                type: 'invalid_request_error',
                code: 'invalid_api_key'
            }
        });
    }

    const keyRecord = getApiKeyByKey(apiKey);

    if (!keyRecord) {
        return reply.code(401).send({
            error: {
                message: 'Invalid API key',
                type: 'invalid_request_error',
                code: 'invalid_api_key'
            }
        });
    }

    // 将 API Key 信息附加到请求对象
    request.apiKey = keyRecord;
}

/**
 * 管理员认证中间件
 * 支持 JWT token、密码直接验证、Basic auth
 */
export async function verifyAdmin(request, reply) {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
        return reply.code(401).send({
            error: { message: 'Missing Authorization header' }
        });
    }

    if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);

        // 1. 首先尝试验证 JWT
        const decoded = verifyToken(token);
        if (decoded && decoded.role === 'admin') {
            request.user = decoded;
            return; // JWT 验证成功
        }

        // 2. 兼容旧方式：直接使用密码作为 token（可通过环境变量关闭）
        if (SERVER_CONFIG.admin_password_bearer_compat && token === SERVER_CONFIG.admin_password) {
            request.user = { sub: 'admin', role: 'admin' };
            return;
        }

        return reply.code(401).send({
            error: { message: 'Invalid token' }
        });
    } else if (authHeader.startsWith('Basic ')) {
        const base64 = authHeader.slice(6);
        const decoded = Buffer.from(base64, 'base64').toString('utf-8');
        const [username, password] = decoded.split(':');

        if (username !== 'admin' || password !== SERVER_CONFIG.admin_password) {
            return reply.code(401).send({
                error: { message: 'Invalid admin credentials' }
            });
        }
        request.user = { sub: 'admin', role: 'admin' };
    } else {
        return reply.code(401).send({
            error: { message: 'Invalid Authorization header format' }
        });
    }
}

/**
 * 记录 API Key 使用量
 */
export function recordApiKeyUsage(apiKeyId, tokens) {
    if (apiKeyId && tokens > 0) {
        updateApiKeyUsage(apiKeyId, tokens);
    }
}
