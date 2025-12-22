export function parseResetAfterMs(message) {
    if (!message) return null;
    const m = String(message).match(/reset after (\d+)s/i);
    if (!m) return null;
    const seconds = Number.parseInt(m[1], 10);
    if (!Number.isFinite(seconds) || seconds < 0) return null;
    return (seconds + 1) * 1000;
}

export function sleep(ms) {
    if (!ms || ms <= 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isCapacityError(err) {
    const msg = err?.message || '';
    return (
        msg.includes('exhausted your capacity on this model') ||
        msg.includes('Resource has been exhausted') ||
        msg.includes('No capacity available') ||
        err?.upstreamStatus === 429
    );
}

export const SSE_HEADERS = Object.freeze({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
});

export const SSE_HEADERS_ANTHROPIC = Object.freeze({
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
});

