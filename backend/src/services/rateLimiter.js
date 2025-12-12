// 简单的模型并发限流器：限制每个模型的上游并发请求数
// 目的是避免在本地直接把某个模型打爆，尽量减少 500，靠更平滑的并发来“爽用”额度。

const MAX_CONCURRENT_PER_MODEL = Number(process.env.MAX_CONCURRENT_PER_MODEL || 3);

// key: model id, value: 当前并发数
const inFlightPerModel = new Map();

export function acquireModelSlot(model) {
    const key = model || 'default';
    const current = inFlightPerModel.get(key) || 0;

    if (current >= MAX_CONCURRENT_PER_MODEL) {
        return false;
    }

    inFlightPerModel.set(key, current + 1);
    return true;
}

export function releaseModelSlot(model) {
    const key = model || 'default';
    const current = inFlightPerModel.get(key) || 0;
    if (current <= 1) {
        inFlightPerModel.delete(key);
    } else {
        inFlightPerModel.set(key, current - 1);
    }
}

